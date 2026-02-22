# Plan: TRV “Check → Heal” procedure (Zigbee2MQTT / Eurotronic)

Goal: make TRVs *self-healing* when they accept `/set` but do not publish state updates (stale `last_seen` / no follow-up message), with clear logging + a “needs wake” escalation path.

Constraints/assumptions:
- Zigbee2MQTT base topic is `lzig`.
- TRV state topics: `lzig/<friendly_name>` (retained payload includes `last_seen`, `current_heating_setpoint`, etc.).
- TRV set topics: `lzig/<friendly_name>/set`.
- Manual healing operation is Zigbee2MQTT “configure” via MQTT bridge: `lzig/bridge/request/device/configure` → `lzig/bridge/response/device/configure`.
- Battery TRVs are sleepy; any heal that requires Zigbee traffic only succeeds if the TRV is awake/reachable.

## Success criteria
- If a TRV is healthy, a `/set` produces a state update within a short window (you observed “two notifications” shortly after).
- If a TRV is unhealthy, the system:
  1) detects it deterministically,
  2) attempts a safe heal (repeat set / optional get),
  3) triggers `configure` only when needed,
  4) logs a clear outcome (`healed` vs `needs_wake` vs `failed`),
  5) avoids spamming the Zigbee mesh (rate limits/backoff).

## What “broken” looks like (detection signals)
Primary trigger (your repeatable symptom):
- You publish `lzig/<room>/set` (setpoint change) and **the TRV changes physically** but **no new state message** arrives on `lzig/<room>` (or `last_seen` doesn’t advance) within *T* seconds.

Secondary triggers (background health):
- `last_seen` for a TRV is older than threshold (e.g. > 6h / > 24h) while others are active.
- Zigbee2MQTT logs show timeouts for that TRV (ZCL write timeout, bindRsp timeout).

## Heal actions (ordered, conservative)
Each step is attempted only if the previous one fails, and each step is time-bounded.

1) **Wait for normal ack window**
   - After `/set`, wait `ack_window_s` (e.g. 10–15s) for an updated state message on `lzig/<room>`.

2) **Re-send the last known setpoint**
   - Publish again to `lzig/<room>/set` the same setpoint you just sent (idempotent).
   - Wait `ack_window_s` again.
   - Rationale: catches missed delivery without heavier operations.

3) **Optional: request a read (`/get`)**
   - Publish `lzig/<room>/get` (if supported by the device/converter) and wait briefly.
   - Note: some devices won’t respond unless awake; treat timeout as informative, not fatal.

4) **Trigger Zigbee2MQTT “configure”**
   - Publish to `lzig/bridge/request/device/configure` with payload `"<friendly_name>"` (or IEEE).
   - Subscribe to `lzig/bridge/response/device/configure` and capture:
     - `status: ok` → consider it “reconfigured”; then wait for the next state update.
     - `status: error` + timeout → mark `needs_wake`.

5) **Escalation: “needs wake”**
   - If configure fails due to timeouts, record a sticky alert that the TRV must be woken physically.
   - When the user wakes it (button/menu), re-run configure once, then clear the alert.

## Rate limiting / safety rules (to avoid mesh spam)
- Per-device cooldowns:
  - Don’t run `configure` for the same TRV more than once per e.g. 15 minutes unless a manual “wake now” is active.
- Global limits:
  - Max 1 configure attempt at a time (avoid flooding).
  - Backoff if multiple TRVs fail at once (could indicate network/coordinator issues).
- Don’t fight other automations:
  - Only re-send the same setpoint you were already trying to apply.
  - Never “guess” a new setpoint.

## Where to implement it (options)

### Option A (recommended): Dedicated always-on “trv-healer” systemd service
What it does:
- Subscribes to:
  - `lzig/<trv>/set` (detect user/app commands)
  - `lzig/<trv>` (observe state/last_seen updates)
  - `lzig/bridge/response/device/configure` (observe configure results)
- Runs the detection + heal state machine per device.
- Logs to journald (and optionally to MQTT topic like `lzig/trv-healer/<room>`).

Pros:
- Works regardless of which client sends the `/set` (astro, scripts, etc.).
- Immediate, deterministic, and decoupled from UI availability.

Cons:
- Another service to maintain (but small).

### Option B: Hook into astro (UI/API-level healing)
What it does:
- After `PUT /api/heat`, the server waits for a matching state update event.
- If not seen, triggers `configure` and returns an explicit “needs wake” status to the UI.

Pros:
- Great UX (“livingroom needs wake” shown instantly).
- No extra daemon if all setpoints come from astro.

Cons:
- Doesn’t heal when setpoints come from other automations/clients.

### Option C: Scheduled health check (systemd timer/cron)
What it does:
- Every N minutes, checks `last_seen` for each TRV.
- If stale, tries configure with backoff and emits alerts.

Pros:
- Simple.

Cons:
- Doesn’t directly target your strongest signal (“/set without report”).
- Can be slower to react.

### Option D: Zigbee2MQTT extension
What it does:
- Runs inside Zigbee2MQTT and reacts to announces/state.

Pros:
- Closest to Z2M internals.

Cons:
- Most invasive; upgrades/maintenance harder; not preferred for a home-critical workflow.

## Recommended architecture (A + small UI feedback)
1) Implement Option A as the “truth” layer (always-on healer).
2) Optionally enhance astro to *display* the healer status (read-only), so you get clear “needs wake” prompts.

## Implementation steps (deliverables)

### Phase 1 — Define exact rules (1 hour)
- List TRVs to manage (friendly names).
- Choose time windows:
  - `ack_window_s` (start with 15s)
  - `configure_timeout_s` (start with 30s)
  - cooldowns/backoff.
- Define what counts as “ack”:
  - any message on `lzig/<trv>` with `last_seen` newer than the set time, OR
  - `current_heating_setpoint` matching the requested value (plus `last_seen` moved).

### Phase 2 — Build minimal healer service (MVP)
- MQTT client + per-device state machine.
- Journald logging (INFO for healed, WARN for needs_wake, ERROR for repeated failures).
- Dry-run mode optional (log what it *would* do).

### Phase 3 — Add observability + operator workflow
- Emit a simple status topic:
  - `lzig/trv-healer/<trv>` payload `{status, last_ok, last_error, last_seen, needs_wake}`.
- Add a runbook snippet for “how to wake TRV and confirm”:
  - wake → healer retries configure once → status clears.

### Phase 4 — Hardening
- Ensure single-flight configure (global mutex).
- Persist minimal state (last attempts per device) to survive restarts.
- Add “network-wide incident mode” if many devices fail simultaneously.

## Operator runbook (what you do when it breaks)
1) Look at healer logs: “which TRV needs wake”.
2) Wake that TRV physically.
3) Confirm it’s back (fresh `last_seen`, healer clears alert, optional `device-info` shows bindings/reporting).

