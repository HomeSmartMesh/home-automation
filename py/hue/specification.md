# hue service – specification

Systemd service (`hue.service`) that turns Zigbee wall switch and button events, received over MQTT, into Philips Hue light commands sent to the Hue bridge through `phue`.

## Components

| File | Role |
|---|---|
| `hue.py` | Main program: connects to the bridge, subscribes to MQTT, maps switch events to light commands |
| `mqtt.py` | Creates the paho MQTT client, reconnects if the connection fails, subscribes to `mqtt.subscriptions` |
| `cfg.py` | Loads `config.json` (or `config_<hostname>.json` if present), sets up logging, `ping()` helper |
| `config.json` | Bridge IP, MQTT settings, room → lights/switches/sensors map (`lightmap`), log file |
| `hue.service`, `setup.sh` | Systemd unit and install script |
| `unused.py` | Old code kept for reference. Nothing imports it |

## Startup
1. Load the config and set up logging (file `/home/wass/share/hue-YYYY.MM.DD.log` and stdout).
2. Ping the bridge every 10 s until it responds, then connect using the stored username (`~/.python_hue`). Then load all light objects by name.
3. Start the MQTT client on a background thread. The main thread just sleeps forever.

## Inputs (MQTT)
Subscribes to `lzig/<device name>` (zigbee2mqtt). Payloads are JSON, using either `click` (`single`, `double`) or `action` (`hold`, `left`, `right_double`, `both_long`, …).
Topics that don't have exactly two parts are logged as errors. An exception in a handler is logged and doesn't stop the service.

## Outputs
- Hue bridge: on/off/brightness per light.
- `lights/<room>` ← `ON|OFF|DIM|MID|BRIGHT`: room state for other services (not sent for `TOGGLE`).
- `lzig/<socket>/set` ← `{"state":"ON|OFF|TOGGLE"}`: controls smart sockets listed in a room's `switches`.

## Room light commands (`room_lights_control`)
| Command | Effect |
|---|---|
| `ON` | Lights on at their previous level |
| `MID` | Brightness 128 |
| `BRIGHT` | Brightness 254 |
| `DIM` | Brightness 1. If the room is already low (every light that is on is at level 1) → normal level instead |
| `OFF` | Dim to 1 right away, then switch off after `OFF_DELAY_SEC` (5 s). This is the "fade-out window" |
| `TOGGLE` | If the room is in its fade-out window → go to the normal level. Else if any light is on → `OFF`. Else → normal level |

The normal level of a room is its `normal` value in `lightmap` (default `MID`; the bathroom uses `BRIGHT`).

### Long press when low
A long press toggles between low and normal: off or normal → low, low → normal. This is how you get out of the low level, since a short press when low starts the switch-off.

### Fade-out window behaviour
While a room is dimmed and waiting to switch off:
- **Short press** (single click / `TOGGLE`): cancels the switch-off and goes back to the normal level.
- **Long press** (`hold` / `long` → `DIM`): cancels the switch-off. The lights blink off for `BLINK_SEC` (0.5 s) to confirm, then stay dimmed at level 1. Another long press after that brings them back to normal.
- **Double press** (`BRIGHT`): cancels the switch-off and goes to full brightness.
- **Explicit `OFF`** (e.g. bedroom right button): starts the window again.

Any new command for a room cancels that room's pending switch-off. Pending timers are kept per room and guarded by a lock. A timer that fires after it was cancelled or replaced does nothing.

## Device mapping
| Device (`lzig/…`) | Single | Double | Long |
|---|---|---|---|
| `living double switch`, right | livingtop TOGGLE | livingtop BRIGHT | livingtop DIM |
| `living double switch`, left | malms TOGGLE | malms BRIGHT | malms DIM |
| `bedroom double switch`, left | bedroomtop TOGGLE | BRIGHT | DIM |
| `bedroom double switch`, right (any action) | bedroomtop OFF + `poster socket` TOGGLE | | |
| `bedroom switch`, `bed light button` (any action) | bedroomtop OFF + `poster socket` TOGGLE | | |
| `bathroom double switch`, right | bathroom TOGGLE | BRIGHT | DIM |
| `office switch`, `office light button` | curtain on → main+curtain off, `lifx socket` OFF. Otherwise main 255, curtain 100, socket ON | | curtain 1, main off |
| `hallway entrance/living/corridor switch` (`light_list_clicks`) | fade-out → MID. First light on → OFF. Otherwise MID | BRIGHT | DIM |
| `toilet switch` (`light_list_clicks`) | same as hallway | | |
| Switch listed in a room's `switches` (e.g. `poster socket`) | its `state` is recorded in `states` | | |

`both_*` actions on double switches control both sides.

Generic rooms: a room with `sensors` and an `action` in `lightmap` sends events from those sensors to the named handler (`light_list_clicks` or `light_hold_switch`).

## Not reached / legacy
- `office_dimm` (desk rotary dimmer): nothing routes events to it.
- `entrance_light`, `livroom_light_button`, `room_control("livingroom")`: not routed, and the `livingroom` room is missing from the config.
- `light_hold_switch`: no room in the config uses it.
- `room_light_brightness`: not called.
- `mqtt.actions` in the config is not used.
