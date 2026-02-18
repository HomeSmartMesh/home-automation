# Zigbee2MQTT helpers

This folder contains small helper scripts to back up/restore Zigbee2MQTT state
and to assist with coordinator firmware maintenance.

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

- `./backup.sh`: backs up `database.db` (Zigbee2MQTT device DB) only.
- `./coordinator_backup.sh`: creates a coordinator/network backup (best effort).

Backups are written under `./backups/` by default.

These scripts operate on `/opt/zigbee2mqtt/data` if it exists; override via
`Z2M_DATA_DIR=...`.

## Restores

- `./restore.sh`: restores `database.db` only.
- `./coordinator_restore.sh`: restores `coordinator_backup.json` only.

## Firmware

- `./firmware_backup.sh`: reads flash to a `.bin` file (requires `cc2538-bsl`).
- `./firmware_restore.sh`: flashes a `.hex` (requires `cc2538-bsl`).

For firmware upgrades, do:

1. `./coordinator_backup.sh`
2. `./firmware_restore.sh <new_firmware.hex>`
3. `./coordinator_restore.sh <coordinator_backup.json>`
