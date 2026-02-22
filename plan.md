# Plan: Make Eurotronic TRVs “detectable + healable” (watchbots + manual reconfigure)

Goal: if a Eurotronic TRV stops publishing (`last_seen` stale / no state updates), you get a Telegram alert quickly and you have a single, repeatable “heal” command that restores reporting (when the TRV is awake).

This repo now supports that with:
- `watchbots/` (Telegram alerts for MQTT liveliness + low battery)
- `env.sh` command: `eurotronic reconfigure` (runs Zigbee2MQTT `bridge/request/device/configure` for the TRVs)

---

## 1) Bring back watchbots (alerts)

### What it watches
`watchbots` subscribes to the MQTT topics listed in `watchbots/config.json` under `mqtt.lists.*` and sends Telegram alerts when a topic has not produced a *fresh* update in `alive_minutes_sensor.<list>` minutes.

For Zigbee2MQTT devices it uses the `last_seen` field when it is “fresh” (i.e., not a cached/retained old state), so a stale device topic reliably triggers an alert.

### Setup checklist
1) Create secrets file:
   - copy `watchbots/secret_template.json` → `watchbots/secrets.json`
   - fill `bots.sensors_watch_bot.token` + `chatId`
   - add your Telegram user id(s) to `users`

2) Configure MQTT + thresholds:
   - edit `watchbots/config.json`
   - verify `mqtt.host`/`mqtt.port` is reachable from the host running systemd
   - set `alive_minutes_sensor.eurotronics` to your desired detection window

3) Install/start as systemd service:
   ```bash
   export RASPI_HOME=/home/wass/raspi
   source ./env.sh
   install watchbots
   journalctl -u watchbots -f
   ```

---

## 2) The “broken TRV” signal (what you trust)

You already observed a very reliable symptom:
- `/set` changes the TRV physically, but **no new state** is published on `lzig/<friendly name>` (and `last_seen` doesn’t advance).

Operationally, treat the following as “broken reporting”:
- watchbots alerts: `⏳ lzig/<room> heat> not seen for X minutes`
- or you notice `/set` has no follow-up state notifications

---

## 3) The heal workflow (manual + repeatable)

Key idea: Zigbee2MQTT “configure” fixes **bindings/reporting** but only works when the TRV is awake/reachable.

When you get the alert:
1) Wake the TRV (button/menu so it stays awake for a short window)
2) Run the reconfigure command:
   ```bash
   export RASPI_HOME=/home/wass/raspi
   source ./env.sh
   eurotronic reconfigure
   ```
   - By default it reads the TRV list from `watchbots/config.json` (`mqtt.lists.eurotronics`).
   - To target one device:
     ```bash
     eurotronic reconfigure --device "living heat"
     ```
3) Verify you see fresh updates again (watchbots “back online”, `last_seen` updates, app shows state)

If reconfigure fails:
- it usually means the TRV wasn’t awake long enough or the link is weak right now → wake again and retry immediately.

---

## 4) Optional next hardening steps (later)

If you want to reduce manual work further (without spamming Zigbee):
- Add a *single* “retry once” action: on a watchbots “stale TRV” alert, wake the TRV and then run `eurotronic reconfigure --device "<name>"`.
- Add a systemd timer that runs `eurotronic reconfigure` once per day (only if you’ve confirmed it doesn’t create noise on your mesh).

The safest default remains: alert quickly, then reconfigure only when needed (and while awake).

