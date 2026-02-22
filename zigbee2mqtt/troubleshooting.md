# Zigbee2MQTT troubleshooting (focus: Eurotronic Spirit TRVs)

This folder is used by the `zigbee2mqtt.service` systemd unit which runs Zigbee2MQTT from `/opt/zigbee2mqtt` with data in `/opt/zigbee2mqtt/data`.

## Quick context: what happened with `living heat`

Symptoms observed:

- The TRV **accepted commands** (e.g. you tried setting the setpoint) but the UI/app showed **no updates / stale state**.
- Zigbee2MQTT had a **stale `last_seen`** for the device while other TRVs continued to update normally.
- Zigbee2MQTT bridge logs showed **timeouts** for the device (no Zigbee response within ~10 seconds).
- The device sometimes sent a **`device_announce`** (rejoin/announce) “as if new”.

What fixed it:

- Treating it as an intermittent **sleepy/offline end-device** problem:
  - **Wake the TRV** (keep it awake while troubleshooting) until it sends a `device_announce`/rejoin and responds to Zigbee requests.
  - If needed, ensure it has a stable parent router (in your case it attached to a mains plug).
  - Optionally **re-run Zigbee2MQTT “configure”** for the device *while it is awake* to restore bindings/reporting.
  - Only if it still won’t stay online: try battery replacement and/or re-pairing.

It started working again once Zigbee2MQTT could successfully talk to it (fresh MQTT publishes on `lzig/living heat` with a recent `last_seen`).

### Why “configure healed it” is a plausible root cause

In this incident, the most consistent explanation is a **state mismatch**:

- Zigbee2MQTT can remember “this device is configured” (in its DB / `bridge/devices`), while
- the TRV itself can be in a state where its **binding table / reporting configuration is missing or not effective**.

When that happens the device can look “half-joined”:

- It is on the network and may even `announce`/rejoin.
- It may accept some commands at the application layer.
- But it won’t proactively report attributes, so your UI stays stale.

Running Zigbee2MQTT’s manual **device configure** (while the TRV is awake) forces Zigbee2MQTT to re-apply:

- binds (clusters bound to the coordinator), and
- attribute reporting (what gets reported, how often, and what change triggers a report).

This can restore normal reporting **without changing the parent router**.

### Where the inconsistency comes from (protocol vs Zigbee2MQTT)

This “I think you’re configured but you aren’t” situation is a combination of Zigbee realities and Zigbee2MQTT tradeoffs:

- **Bindings/reporting live on the device.** Zigbee attribute reporting configuration and the binding table are stored on the TRV (not on the coordinator). If the TRV loses that state (battery pull, firmware bug, internal reset), the coordinator doesn’t automatically know.
- **There is no always-on handshake.** Zigbee does not provide a cheap, push-based “reporting still configured” health signal. You *can* query things (binding table, reporting config), but:
  - it requires the device to be awake and reachable,
  - it’s extra traffic,
  - and not all devices implement everything reliably.
- **Zigbee2MQTT avoids reconfiguring all the time.** Z2M keeps a `meta.configured` flag in its database to prevent spamming the network with bind/reporting commands on every restart/announce (especially painful with sleepy devices). That means Z2M can temporarily be “wrong” if the device’s internal state changed.

Net effect:

- A device can be *joined + interviewed* but effectively *not configured for reporting*.
- Manual `bridge/request/device/configure` is the practical way to reconcile the two states when this happens.

## Mental model: why “set works but get does not” can happen

Eurotronic Spirit TRVs are **battery end devices**:

- They sleep aggressively and only wake periodically or on user interaction.
- Zigbee2MQTT can publish a `/set` command immediately, but if the TRV is asleep or the link is poor:
  - the Zigbee write may time out (no APS/ZCL response),
  - the device won’t report the new state,
  - and your app keeps showing the **old retained** state (`last_seen` doesn’t move).

So “commands are being sent” is not the same as “device actually received it and reported back”.

Important detail:

- Zigbee2MQTT **cannot force-wake** a sleeping battery device.
- “Configure” does not wake the TRV; it only runs a set of Zigbee operations **if the TRV is already reachable/awake**.

## The tools we used

### 1) Zigbee2MQTT system logs

Follow Zigbee2MQTT:

```bash
journalctl -u zigbee2mqtt -f
```

Look for messages like:

- `Publish 'set' ... failed` (write timeout)
- `... bindRsp after 10000ms` (bind/configure timeout)
- `device_announce` / `device_announced`

### 2) Device “configure” request via MQTT bridge (reachability test)

We used Zigbee2MQTT’s MQTT bridge endpoint `bridge/request/device/configure` to quickly check whether Zigbee2MQTT can still talk to the device.

This repo now includes a helper:

- `zigbee2mqtt/test_euro.py`

Run:

```bash
python3 zigbee2mqtt/test_euro.py configure --device "living heat" --timeout-s 30
```

Interpretation:

- `status: ok` ⇒ Zigbee2MQTT could reach the device and (re)configure it.
- `status: error` with timeouts (bindRsp/write) ⇒ device is likely asleep/offline/poor link.

What “configure” actually does (high-level):

- Calls the device’s Zigbee2MQTT converter `configure()` routine.
- Typically performs **binds** (e.g. `hvacThermostat`, `genPowerCfg`) to the coordinator and sets up **attribute reporting** intervals/thresholds.
- After a successful configure, the TRV should start reporting changes (and `last_seen` will advance when it talks).

### 3) Monitor MQTT bridge events during wake/join/troubleshooting

```bash
python3 zigbee2mqtt/test_euro.py monitor-bridge --duration-s 300
```

This prints `lzig/bridge/#` traffic (announce/log/devices/etc) so you can correlate:

- When you wake the TRV / press buttons
- When Zigbee2MQTT announces/reconfigures it
- When errors happen

### 4) Network map (routing / parent selection)

Battery devices can be “invisible” in a network map if they’re asleep during the scan, but it is still useful to check router health.

```bash
python3 zigbee2mqtt/test_euro.py networkmap --timeout-s 90 > /tmp/networkmap.json
rg -n "living heat|00158d000192dd3e|sonos front socket" /tmp/networkmap.json
```

Notes:

- The map is a snapshot; end-devices may not show meaningful links if they are asleep.
- Use it to validate that you have enough mains-powered routers and to spot weak/isolated areas.

## Step-by-step: when a TRV stops reporting

### Step 1: confirm it’s stale

Check that `last_seen` is not moving for the device (via your UI or by subscribing to its topic).

In Zigbee2MQTT payloads we use ISO8601 local:

- Fresh updates will bump `last_seen`
- Stale device will keep an old `last_seen`

### Step 2: watch Zigbee2MQTT while you interact with the device

Open:

```bash
journalctl -u zigbee2mqtt -f
```

Then physically wake the TRV (button/menu) and watch for:

- `device_announce` / interview/configure logs
- timeouts

### Step 3: run “configure” while it is awake

This is the key trick for sleepy devices: send the operation while it is awake.

```bash
python3 zigbee2mqtt/test_euro.py configure --device "living heat" --timeout-s 30
```

If it fails, wake the TRV again and retry immediately.

### Step 4: improve the link if needed

If you keep seeing write/bind timeouts:

- Move the TRV temporarily closer to the coordinator (or a strong router) to stabilize the interview/configure.
- Relocate an existing mains-powered Zigbee router closer to the radiator (TRVs sit next to metal and often have worse RF than “normal” sensors).
- Avoid relying on a single weak/flaky parent router; a bad parent can make the TRV appear “randomly offline”.

#### Parent selection (“why I have many routers but it still fails”)

Having “many routers” is not enough if the TRV chooses a poor parent.

Common pattern:

- At pairing/rejoin time, the TRV selects a parent with the best signal *at that moment*.
- Later, if that parent is unstable or the link degrades, you see:
  - timeouts (`Publish 'set' ... failed`, bind/write timeouts),
  - `device_announce` events (rejoin),
  - long stale `last_seen`.

To intentionally steer a TRV to a better parent:

1) Place/plug a good router **very close** to the TRV (same room, a few meters).
2) Temporarily power off (or unplug) other nearby routers so the TRV has fewer “bad” choices.
3) Wake the TRV and trigger a rejoin (or re-pair if needed).
4) Once it is stable and reporting, restore power to the other routers.

This avoids adding “one router per TRV”; often **one well-placed router** can serve multiple nearby TRVs.

### Step 5: only enable `permit_join` when truly pairing as new

Our config has:

- `/opt/zigbee2mqtt/data/configuration.yaml`: `permit_join: false`

This is good default hygiene.

Enable join only if the TRV has been factory-reset and must join again:

```bash
python3 zigbee2mqtt/test_euro.py permit-join --enable --time-s 120
# pair device now
python3 zigbee2mqtt/test_euro.py permit-join --disable
```

Already-known devices can still announce/rejoin without `permit_join`.

## What to capture next time (to debug faster)

When it breaks again, capture these:

1) `journalctl -u zigbee2mqtt -f` output during:
   - a `/set` attempt
   - a `configure` attempt
2) `python3 zigbee2mqtt/test_euro.py monitor-bridge --duration-s 120` output during wake/announce
3) `python3 zigbee2mqtt/test_euro.py configure --device "living heat" --timeout-s 30` output
4) Optional: `/tmp/networkmap.json` from `networkmap`

With those logs, you can usually tell immediately whether it’s:

- sleepy timing (needs wake at the moment of configure/write),
- routing/coverage (bad parent router / weak mesh),
- or a more permanent device fault.
