from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from . import ops


def _die(msg: str) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="z2m", description="Zigbee2MQTT maintenance CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("check", help="Check prerequisites and paths")

    db = sub.add_parser("db", help="Zigbee2MQTT database.db actions")
    db_sub = db.add_subparsers(dest="db_cmd", required=True)
    db_b = db_sub.add_parser("backup", help="Back up database.db")
    db_b.add_argument("--no-stop", action="store_true", help="Do not stop Zigbee2MQTT before copying")
    db_b.add_argument("--out", type=Path, default=None, help="Output path (default: ./backups/database.db.<ts>)")
    db_r = db_sub.add_parser("restore", help="Restore database.db from a backup file")
    db_r.add_argument("src", type=Path)

    coord = sub.add_parser("coordinator", help="Coordinator/network backup actions")
    coord_sub = coord.add_subparsers(dest="coord_cmd", required=True)
    coord_b = coord_sub.add_parser("backup", help="Create coordinator backup (MQTT request + file copy)")
    coord_b.add_argument("--timeout-s", type=float, default=45.0)
    coord_r = coord_sub.add_parser("restore", help="Restore coordinator_backup.json from zip/json")
    coord_r.add_argument("src", type=Path, help="Path to coordinator_backup.json or Zigbee2MQTT backup zip")

    fw = sub.add_parser("firmware", help="Firmware helpers (requires cc2538-bsl)")
    fw_sub = fw.add_subparsers(dest="fw_cmd", required=True)
    fw_b = fw_sub.add_parser("backup", help="Read flash to .bin (bootloader mode required)")
    fw_b.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_b.add_argument("--out", type=Path, default=None, help="Output path (default: ./backups/firmware.<ts>.bin)")
    fw_b.add_argument("--len", dest="length", default="360448", help="Read length in bytes (default: 360448)")
    fw_b.add_argument("--baud", default=None, help="Optional baud override")

    fw_f = fw_sub.add_parser("flash", help="Flash .hex (bootloader mode required)")
    fw_f.add_argument("hex", type=Path, help="Firmware .hex file to flash")
    fw_f.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_f.add_argument("--baud", default=None, help="Optional baud override")

    # Alias: "firmware restore" == flash
    fw_restore = fw_sub.add_parser("restore", help="Alias for firmware flash")
    fw_restore.add_argument("hex", type=Path, help="Firmware .hex file to flash")
    fw_restore.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_restore.add_argument("--baud", default=None, help="Optional baud override")

    args = parser.parse_args(argv)

    try:
        if args.cmd == "check":
            raise SystemExit(ops.check())
        if args.cmd == "db":
            if args.db_cmd == "backup":
                raise SystemExit(ops.db_backup(no_stop=args.no_stop, out=args.out))
            if args.db_cmd == "restore":
                raise SystemExit(ops.db_restore(src=args.src))
        if args.cmd == "coordinator":
            if args.coord_cmd == "backup":
                raise SystemExit(ops.coordinator_backup(timeout_s=args.timeout_s))
            if args.coord_cmd == "restore":
                raise SystemExit(ops.coordinator_restore(src=args.src))
        if args.cmd == "firmware":
            if args.fw_cmd == "backup":
                raise SystemExit(
                    ops.firmware_backup(port=args.port, out=args.out, length=args.length, baud=args.baud)
                )
            if args.fw_cmd in ("flash", "restore"):
                raise SystemExit(ops.firmware_flash(hex_path=args.hex, port=args.port, baud=args.baud))
    except FileNotFoundError as e:
        _die(f"not found: {e}")
    except subprocess.CalledProcessError as e:
        _die(f"command failed: {e}")
    except Exception as e:
        _die(str(e))

    _die("unhandled command")


if __name__ == "__main__":
    main()
