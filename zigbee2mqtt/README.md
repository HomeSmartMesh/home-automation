# Zigbee2MQTT helpers

This folder contains small helper scripts to back up/restore Zigbee2MQTT state
and to assist with coordinator firmware maintenance.

Primary entrypoint:

- `./z2m` (a Python CLI with subcommands)

## Python deps (uv)

There is a `pyproject.toml` in this folder for `uv`/pip-based installs.

```bash
cd /home/wass/raspi/zigbee2mqtt

uv sync
```

### Optional extras

- Firmware helpers (installs `cc2538-bsl`): `uv sync --extra firmware` (or `uv sync --all-extras`)

Note: `uv sync` is exact by default. If you install an extra and later run plain `uv sync`, `uv` will uninstall the extra’s packages to match the base dependency set. If you want “sticky” extras, use `uv sync --inexact` or always include the extra.

Quick prereq check:

```bash
cd /home/wass/raspi/zigbee2mqtt
./z2m check
```

## Quick checks (what firmware is running?)

From the server:

```bash
journalctl -u zigbee2mqtt --no-pager | rg "Coordinator firmware version" | tail -n 5
```

Example log line looks like:

- `Coordinator firmware version: ... "type":"zStack3x0" ... "revision":20201026 ...`

## Chip/variant check (CC2652R vs CC2652P)

Zigbee2MQTT logs typically won’t distinguish CC2652R vs CC2652P. If you install
`cc2538-bsl`, you can query info (stick must be in bootloader mode and Z2M must
be stopped):

```bash
sudo systemctl stop zigbee2mqtt
python3 -m cc2538_bsl.cc2538_bsl -p /dev/ttyUSB0 -i
sudo systemctl start zigbee2mqtt
```

## Backups

Examples:

- `./z2m db backup`
- `./z2m coordinator backup`

Backups are written under `./backups/` by default.

These scripts operate on `/opt/zigbee2mqtt/data` if it exists; override via
`Z2M_DATA_DIR=...`.

## Restores

Examples:

- `./z2m db restore ./backups/database.db.YYYYMMDD-HHMMSS`
- `./z2m coordinator restore ./backups/coordinator-*/coordinator_backup.json`

## Firmware

Examples:

- `./z2m firmware backup`
- `./z2m firmware probe` (non-destructive bootloader probe + chip info)
- `./z2m firmware flash` (defaults to `./firmware/coordinator.hex`)
- `./z2m firmware flash ./path/to/firmware.hex`
- `./z2m firmware restore` (alias; same defaults as `flash`)

If you get a sync timeout, the stick is usually not in bootloader mode. Some USB dongles can be switched into bootloader automatically via RTS/DTR:

- `./z2m firmware backup --bootloader-sonoff-usb`
- `./z2m firmware flash firmware.hex --bootloader-sonoff-usb`

By default, `./z2m firmware flash` uses a partial erase (`cc2538-bsl -W`) to avoid wiping the coordinator’s network state. If you want a totally clean slate (and you have a backup), add `--mass-erase`.

If you're iterating/debugging, you may prefer to stop the service once and prevent the helper from repeatedly stopping/starting it:

```bash
sudo systemctl stop zigbee2mqtt
./z2m firmware backup --no-stop --bootloader-sonoff-usb
sudo systemctl start zigbee2mqtt
```

For firmware upgrades, do:

1. `./z2m coordinator backup`
2. `./z2m firmware flash <new_firmware.hex>`
3. `./z2m coordinator restore <coordinator_backup.json>`
