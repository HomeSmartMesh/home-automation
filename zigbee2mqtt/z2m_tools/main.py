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
    default_fw_hex = Path(__file__).resolve().parents[1] / "firmware" / "coordinator.hex"

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
    fw_b.add_argument("--no-stop", action="store_true", help="Do not stop Zigbee2MQTT before accessing the port")
    fw_b.add_argument(
        "--bootloader-sonoff-usb",
        action="store_true",
        help="Toggle RTS/DTR to enter bootloader (Sonoff USB dongle pattern)",
    )
    fw_b.add_argument(
        "--bootloader-active-high",
        action="store_true",
        help="Use active-high signals to enter bootloader",
    )
    fw_b.add_argument(
        "--bootloader-invert-lines",
        action="store_true",
        help="Invert RTS/DTR usage to enter bootloader",
    )

    fw_i = fw_sub.add_parser("probe", help="Probe bootloader and print chip info (non-destructive)")
    fw_i.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_i.add_argument("--baud", default=None, help="Optional baud override")
    fw_i.add_argument("--no-stop", action="store_true", help="Do not stop Zigbee2MQTT before accessing the port")
    fw_i.add_argument(
        "--bootloader-sonoff-usb",
        action="store_true",
        help="Toggle RTS/DTR to enter bootloader (Sonoff USB dongle pattern)",
    )
    fw_i.add_argument(
        "--bootloader-active-high",
        action="store_true",
        help="Use active-high signals to enter bootloader",
    )
    fw_i.add_argument(
        "--bootloader-invert-lines",
        action="store_true",
        help="Invert RTS/DTR usage to enter bootloader",
    )

    fw_f = fw_sub.add_parser("flash", help="Flash .hex (bootloader mode required)")
    fw_f.add_argument(
        "hex",
        type=Path,
        nargs="?",
        default=default_fw_hex,
        help="Firmware .hex file to flash (default: ./firmware/coordinator.hex)",
    )
    fw_f.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_f.add_argument("--baud", default=None, help="Optional baud override")
    fw_f.add_argument("--no-stop", action="store_true", help="Do not stop Zigbee2MQTT before accessing the port")
    fw_f.add_argument(
        "--mass-erase",
        action="store_true",
        help="Mass erase the chip before flashing (wipes coordinator state; only use if needed)",
    )
    fw_f.add_argument(
        "--bootloader-sonoff-usb",
        action="store_true",
        help="Toggle RTS/DTR to enter bootloader (Sonoff USB dongle pattern)",
    )
    fw_f.add_argument(
        "--bootloader-active-high",
        action="store_true",
        help="Use active-high signals to enter bootloader",
    )
    fw_f.add_argument(
        "--bootloader-invert-lines",
        action="store_true",
        help="Invert RTS/DTR usage to enter bootloader",
    )

    # Alias: "firmware restore" == flash
    fw_restore = fw_sub.add_parser("restore", help="Alias for firmware flash")
    fw_restore.add_argument(
        "hex",
        type=Path,
        nargs="?",
        default=default_fw_hex,
        help="Firmware .hex file to flash (default: ./firmware/coordinator.hex)",
    )
    fw_restore.add_argument("--port", default=None, help="Serial port (default: from configuration.yaml)")
    fw_restore.add_argument("--baud", default=None, help="Optional baud override")
    fw_restore.add_argument("--no-stop", action="store_true", help="Do not stop Zigbee2MQTT before accessing the port")
    fw_restore.add_argument(
        "--mass-erase",
        action="store_true",
        help="Mass erase the chip before flashing (wipes coordinator state; only use if needed)",
    )
    fw_restore.add_argument(
        "--bootloader-sonoff-usb",
        action="store_true",
        help="Toggle RTS/DTR to enter bootloader (Sonoff USB dongle pattern)",
    )
    fw_restore.add_argument(
        "--bootloader-active-high",
        action="store_true",
        help="Use active-high signals to enter bootloader",
    )
    fw_restore.add_argument(
        "--bootloader-invert-lines",
        action="store_true",
        help="Invert RTS/DTR usage to enter bootloader",
    )

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
                    ops.firmware_backup(
                        port=args.port,
                        out=args.out,
                        length=args.length,
                        baud=args.baud,
                        no_stop=args.no_stop,
                        bootloader_sonoff_usb=args.bootloader_sonoff_usb,
                        bootloader_active_high=args.bootloader_active_high,
                        bootloader_invert_lines=args.bootloader_invert_lines,
                    )
                )
            if args.fw_cmd == "probe":
                raise SystemExit(
                    ops.firmware_probe(
                        port=args.port,
                        baud=args.baud,
                        no_stop=args.no_stop,
                        bootloader_sonoff_usb=args.bootloader_sonoff_usb,
                        bootloader_active_high=args.bootloader_active_high,
                        bootloader_invert_lines=args.bootloader_invert_lines,
                    )
                )
            if args.fw_cmd in ("flash", "restore"):
                raise SystemExit(
                    ops.firmware_flash(
                        hex_path=args.hex,
                        port=args.port,
                        baud=args.baud,
                        no_stop=args.no_stop,
                        mass_erase=args.mass_erase,
                        bootloader_sonoff_usb=args.bootloader_sonoff_usb,
                        bootloader_active_high=args.bootloader_active_high,
                        bootloader_invert_lines=args.bootloader_invert_lines,
                    )
                )
    except FileNotFoundError as e:
        _die(f"not found: {e}")
    except subprocess.CalledProcessError as e:
        _die(f"command failed: {e}")
    except Exception as e:
        _die(str(e))

    _die("unhandled command")


if __name__ == "__main__":
    main()
