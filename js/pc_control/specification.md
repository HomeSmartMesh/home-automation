# pc_control – functional specification

This file defines the **wanted behavior** of the `pc_control` service. Code changes should start here: update the requirement, then make the code conform.

Each requirement has an ID and a status:
- **met**: the current code behaves as specified
- **gap**: specified but not yet implemented; the current behavior is described alongside

## 1. Scope

The service reacts to Zigbee buttons, sensors and smart sockets (via zigbee2mqtt), and to a Shelly relay and an ESP dimmer (via MQTT), to control:

| Load | Controlled through |
|---|---|
| Office PC | `pc socket` (Zigbee smart plug with power metering) |
| Sonos front and rear speakers | `sonos front socket`, `sonos rear socket` |
| Retro light | Shelly relay (on/off) and ESP dimmer (brightness) |

Topic names are configured in `config.json`.

## 2. Environment facts

These were measured on 2026-09-19 from InfluxDB history (bucket `mqtt`, measurement `socket`, tag `name="pc socket"`) and the service log. The requirements depend on them. If the hardware changes, re-check these facts before relying on the requirements.

| ID | Fact | Evidence |
|---|---|---|
| ENV-1 | The PC socket reports power as either **0 W or at least 40 W**, never in between. The PC draws 40 W or more whenever it is running. | 551,901 samples in 2026 |
| ENV-2 | A sleeping PC and a switched-off PC can't be told apart by power alone. Both are expected to read 0 W (see ENV-1). | follows from ENV-1 |
| ENV-3 | The socket publishes its full state (state, power, voltage, …) on every report. A message can carry an **old power value** that was already published. | payload inspection |
| ENV-4 | When idle, the socket reports every ~40–60 s. | median gap 38 s |
| ENV-5 | After a switch command the socket can send **bursts of 5 to 140 messages per second**, all with the old `power: 0` and possibly an old `state`. Each command immediately returns about 3 echo messages. | 2026-09-19 12:36, 2026-08-30 17:40 |
| ENV-6 | A switch command can take **4–20 s** to reach the device. The first real power reading can come **up to ~50 s** after a turn-on. | 2026-09-19 12:36–12:40 |

## 3. PC power

### 3.1 Manual control

| ID | Requirement | Status |
|---|---|---|
| PC-1 | A single click on `pc button` toggles the PC socket: ON if it is off, OFF if it is on. | met |
| PC-2 | If the socket state is unknown (no report received yet), a click does not switch anything and an error is logged. | met |
| PC-3 | Any manual action restarts the automatic-off logic from zero. | met |

### 3.2 Automatic on

| ID | Requirement | Status |
|---|---|---|
| PC-10 | A tilt or vibration event from `office chair vibration` turns the PC socket ON when automation is enabled. | met (no chair events have been observed in the logs since 2024) |
| PC-11 | Automation can be enabled and disabled at runtime. | **gap**: always enabled; there is no way to disable it |

### 3.3 Automatic off (ghost current)

Goal: cut mains power to the PC once it has really stopped using power (shut down from the OS), without ever cutting a PC that is in use or starting up.

| ID | Requirement | Status |
|---|---|---|
| PC-20 | While the socket is ON, the PC counts as **idle** when its power is below the ghost threshold (**10 W**). Per ENV-1, any threshold between 1 and 40 W behaves the same. | met |
| PC-21 | The socket is switched OFF once the PC has been idle **continuously for the ghost timeout (7 min)**, measured in **wall-clock time**. | **gap**: the code counts 11 consecutive low messages instead. Because of ENV-4 and ENV-5, that takes anywhere from under a second to many minutes (typically ~7 min). |
| PC-22 | A reading of at least 10 W restarts the idle time. | met |
| PC-23 | Repeated messages, echoes and bursts (ENV-3, ENV-5) must not shorten the ghost timeout. | **gap**: every message counts as a sample |
| PC-24 | **Startup grace:** after the socket turns ON, it is not switched off automatically for **120 s**, however the socket turned on (button, chair, Home Assistant, power-outage recovery). This covers ENV-6. | **gap**: no grace period. This caused 9 recorded cut-offs 11–70 s after a turn-on, including 2026-09-19 12:36:33 and 12:37:34. |
| PC-25 | **Cooldown:** after an automatic cut-off, no further automatic cut-off is issued for **60 s**. | met (added 2026-09-19 after the double cut on 2026-08-30 17:40:02/03) |
| PC-26 | If the socket still reports ON and idle after the cooldown (the OFF command was lost), the cut-off is retried. | met |
| PC-27 | The time spent OFF is not tracked. Turning the socket back ON starts a new session (see PC-24). | **gap**: the internal counter stays at its limit while off, and only a button click resets it. A turn-on from another source (chair, HA) is cut at the first low report. |
| PC-28 | Every automatic cut-off is logged at info level with the reason: how long the PC was idle and the last power reading. | **gap**: only "shutting down" is logged; the countdown is logged at debug level only |

### 3.4 State tracking

| ID | Requirement | Status |
|---|---|---|
| PC-30 | The socket state (ON/OFF) comes from the socket's own reports. A report that has no state field leaves the known state unchanged. | **gap**: a report without a state field sets it to unknown |
| PC-31 | A report without a power value leaves the idle time unchanged. It neither restarts it nor counts as idle. | **gap**: a missing power value restarts the idle time |

### 3.5 Open question

- **OQ-1: sleep.** Per ENV-2, a sleeping PC reads 0 W and is cut off after the ghost timeout. It is not yet decided whether sleep should survive. Keeping sleep would need a signal from the PC itself, such as a heartbeat over MQTT, because the socket's power reading can't tell sleep from off.

## 4. Sonos

| ID | Requirement | Status |
|---|---|---|
| SN-1 | A single click on `sonos button` toggles both sonos sockets together. | met |
| SN-2 | The toggle direction follows the sockets' reported state: if either socket is on, both are switched off; otherwise both are switched on. | **gap**: the service remembers its own last command, so it drifts when the sockets are switched from anywhere else |

## 5. Retro light

| ID | Requirement | Status |
|---|---|---|
| RL-1 | A single click on `retro button` toggles the Shelly relay, based on the relay's reported state. | met |
| RL-2 | When the dimmer reports alive with its first channel at the power-on default (800), all channels are set to the preferred level (3000). | met |
| RL-3 | A dimmer report without a channel list is ignored. It must not cause an error. | **gap**: such a report raises an error that is caught and logged |

## 6. Operational

| ID | Requirement | Status |
|---|---|---|
| OP-1 | Logs roll over to a new dated file every day. | **gap**: the file name is fixed when the service starts |
| OP-2 | Topic names, the ghost threshold, the ghost timeout, the startup grace and the cooldown are set in `config.json`. | **gap**: topics are in config.json, but some topics and all the timing values are hard-coded |
| OP-3 | Losing or regaining the MQTT connection is logged. | **gap**: the connection-lost handler is disabled |
| OP-4 | Receiving a retained message again after a reconnect does not count as a new idle sample (follows from PC-21 and PC-23). | **gap** |
