from __future__ import annotations

import subprocess
import sys
import zipfile
from pathlib import Path

from .common import (
    _ts,
    backup_dir,
    data_dir,
    find_serial_port_from_config,
    mqtt_request_backup_zip,
    service_is_active,
    service_name,
    sha256,
    start_service,
    stop_service,
)

_CC2538_BSL_EXTRA_HELP = "optional extra 'firmware' (install with: uv sync --extra firmware)"


def _require_cc2538_bsl() -> None:
    try:
        import cc2538_bsl  # type: ignore  # noqa: F401
    except ModuleNotFoundError as e:
        raise RuntimeError(f"cc2538-bsl is not installed ({_CC2538_BSL_EXTRA_HELP})") from e


def _bootloader_baud_candidates(baud: str | None) -> list[str]:
    if baud:
        return [str(baud)]
    # Common CC26xx/CC13xx UART BSL speeds.
    return ["500000", "115200", "1000000"]


def check() -> int:
    print(f"data_dir={data_dir()}")
    print(f"backup_dir={backup_dir()}")
    print(f"service={service_name()}")

    try:
        import cc2538_bsl  # type: ignore  # noqa: F401

        print("cc2538-bsl: python import OK")
        try:
            import intelhex  # type: ignore  # noqa: F401

            print("intelhex: python import OK")
        except ModuleNotFoundError:
            print(f"intelhex: not installed ({_CC2538_BSL_EXTRA_HELP})")
        except Exception as e:
            print(f"intelhex: python import error ({e})")

        proc = subprocess.run(
            [sys.executable, "-m", "cc2538_bsl.cc2538_bsl", "--help"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        print(f"cc2538-bsl: module CLI {'OK' if proc.returncode == 0 else 'FAILED'}")
        return 0
    except ModuleNotFoundError:
        print(f"cc2538-bsl: not installed ({_CC2538_BSL_EXTRA_HELP})")
    except Exception as e:
        print(f"cc2538-bsl: python import error ({e})")

    print("cc2538-bsl: module CLI SKIP (not installed)")
    return 0


def db_backup(*, no_stop: bool, out: Path | None) -> int:
    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)

    db = ddir / "database.db"
    if not db.exists():
        raise FileNotFoundError(db)

    out_path = out or (bdir / f"database.db.{_ts()}")

    was_active = service_is_active()
    if was_active and not no_stop:
        print(f"stopping {service_name()} for a consistent snapshot...")
        stop_service()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(db.read_bytes())
    print(f"wrote {out_path}")
    print(f"sha256 {sha256(out_path)}")

    if was_active and not no_stop:
        print(f"starting {service_name()}...")
        start_service()

    return 0


def db_restore(*, src: Path) -> int:
    if not src.exists():
        raise FileNotFoundError(src)

    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)
    dest = ddir / "database.db"

    was_active = service_is_active()
    if was_active:
        print(f"stopping {service_name()}...")
        stop_service()

    if dest.exists():
        safety = bdir / f"database.db.pre-restore.{_ts()}"
        safety.write_bytes(dest.read_bytes())
        print(f"saved current DB to {safety}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(src.read_bytes())
    print(f"restored {dest} from {src}")

    if was_active:
        print(f"starting {service_name()}...")
        start_service()

    return 0


def coordinator_backup(*, timeout_s: float) -> int:
    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)

    stamp = _ts()
    out_dir = bdir / f"coordinator-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_out = out_dir / "z2m-backup.zip"

    config = ddir / "configuration.yaml"
    if config.exists():
        print("requesting backup via MQTT (requires Zigbee2MQTT + broker running)...")
        try:
            mqtt_request_backup_zip(configuration_yaml=config, out_zip=zip_out, timeout_s=timeout_s)
            print(f"wrote {zip_out}")
        except Exception as e:
            print(f"warning: MQTT backup request failed; continuing with file-copy backup: {e}", file=sys.stderr)
            if zip_out.exists():
                zip_out.unlink()
    else:
        print(f"warning: missing {config}; skipping MQTT backup request", file=sys.stderr)

    for name in ("coordinator_backup.json", "database.db", "configuration.yaml"):
        p = ddir / name
        if p.exists():
            (out_dir / name).write_bytes(p.read_bytes())
            print(f"copied {p} -> {out_dir / name}")
        else:
            print(f"warning: no {p} present to copy", file=sys.stderr)

    print(f"backup folder: {out_dir}")
    return 0


def coordinator_restore(*, src: Path) -> int:
    if not src.exists():
        raise FileNotFoundError(src)

    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)
    dest = ddir / "coordinator_backup.json"

    if src.suffix.lower() == ".zip":
        with zipfile.ZipFile(src, "r") as z:
            try:
                data = z.read("coordinator_backup.json")
            except KeyError as e:
                raise FileNotFoundError(f"zip does not contain coordinator_backup.json: {src}") from e
    else:
        data = src.read_bytes()

    was_active = service_is_active()
    if was_active:
        print(f"stopping {service_name()}...")
        stop_service()

    if dest.exists():
        safety = bdir / f"coordinator_backup.json.pre-restore.{_ts()}"
        safety.write_bytes(dest.read_bytes())
        print(f"saved current coordinator backup to {safety}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    print(f"restored {dest} from {src}")

    if was_active:
        print(f"starting {service_name()}...")
        start_service()

    return 0


def firmware_backup(
    *,
    port: str | None,
    out: Path | None,
    length: str,
    baud: str | None,
    no_stop: bool,
    bootloader_sonoff_usb: bool,
    bootloader_active_high: bool,
    bootloader_invert_lines: bool,
) -> int:
    _require_cc2538_bsl()
    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)

    serial_port = port
    config = ddir / "configuration.yaml"
    if not serial_port and config.exists():
        serial_port = find_serial_port_from_config(config)
    if not serial_port:
        raise RuntimeError("could not determine serial port; pass --port /dev/ttyUSB0")

    out_path = out or (bdir / f"firmware.{_ts()}.bin")

    was_active = service_is_active()
    if was_active and no_stop:
        print(f"warning: {service_name()} is running; serial access may fail or be unreliable", file=sys.stderr)
    if was_active and not no_stop:
        print(f"stopping {service_name()}...")
        stop_service()

    try:
        cmd = [sys.executable, "-m", "cc2538_bsl.cc2538_bsl", "-q", "-p", serial_port, "-r", "--len", str(length)]
        if baud:
            cmd += ["-b", str(baud)]
        if bootloader_sonoff_usb:
            cmd += ["--bootloader-sonoff-usb"]
        if bootloader_active_high:
            cmd += ["--bootloader-active-high"]
        if bootloader_invert_lines:
            cmd += ["--bootloader-invert-lines"]
        cmd.append(str(out_path))
        print(f"reading {length} bytes from {serial_port} -> {out_path}")
        subprocess.run(cmd, check=True)
        print(f"wrote {out_path}")
        print(f"sha256 {sha256(out_path)}")
    finally:
        if was_active and not no_stop:
            print(f"starting {service_name()}...")
            start_service()

    return 0


def firmware_probe(
    *,
    port: str | None,
    baud: str | None,
    no_stop: bool,
    bootloader_sonoff_usb: bool,
    bootloader_active_high: bool,
    bootloader_invert_lines: bool,
) -> int:
    _require_cc2538_bsl()
    ddir = data_dir()
    bdir = backup_dir()
    bdir.mkdir(parents=True, exist_ok=True)

    serial_port = port
    config = ddir / "configuration.yaml"
    if not serial_port and config.exists():
        serial_port = find_serial_port_from_config(config)
    if not serial_port:
        raise RuntimeError("could not determine serial port; pass --port /dev/ttyUSB0")

    was_active = service_is_active()
    if was_active and no_stop:
        print(f"warning: {service_name()} is running; serial access may fail or be unreliable", file=sys.stderr)
    if was_active and not no_stop:
        print(f"stopping {service_name()}...")
        stop_service()

    try:
        out_path = bdir / f"probe.{_ts()}.bin"
        base_cmd = [
            sys.executable,
            "-m",
            "cc2538_bsl.cc2538_bsl",
            "-V",
            "-p",
            serial_port,
            "-r",
            "-l",
            "4",
        ]
        if bootloader_sonoff_usb:
            base_cmd += ["--bootloader-sonoff-usb"]
        if bootloader_active_high:
            base_cmd += ["--bootloader-active-high"]
        if bootloader_invert_lines:
            base_cmd += ["--bootloader-invert-lines"]

        last = None
        for b in _bootloader_baud_candidates(baud):
            cmd = [*base_cmd, "-b", b, str(out_path)]
            print(f"trying bootloader baud {b}...")
            proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            if proc.returncode == 0:
                if proc.stdout:
                    print(proc.stdout, end="")
                if proc.stderr:
                    print(proc.stderr, end="", file=sys.stderr)
                print(f"wrote {out_path}")
                return 0
            last = proc

        if last is not None:
            raise RuntimeError(
                f"bootloader probe failed at bauds {', '.join(_bootloader_baud_candidates(baud))} "
                f"(last rc={last.returncode})"
            )
    finally:
        if was_active and not no_stop:
            print(f"starting {service_name()}...")
            start_service()

    return 1


def firmware_flash(
    *,
    hex_path: Path,
    port: str | None,
    baud: str | None,
    no_stop: bool,
    mass_erase: bool,
    bootloader_sonoff_usb: bool,
    bootloader_active_high: bool,
    bootloader_invert_lines: bool,
) -> int:
    _require_cc2538_bsl()
    if not hex_path.exists():
        hint = ""
        if hex_path.name == "coordinator.hex":
            hint = " (missing default firmware; run: firmware select p|r)"
        raise FileNotFoundError(f"{hex_path}{hint}")

    ddir = data_dir()
    serial_port = port
    config = ddir / "configuration.yaml"
    if not serial_port and config.exists():
        serial_port = find_serial_port_from_config(config)
    if not serial_port:
        raise RuntimeError("could not determine serial port; pass --port /dev/ttyUSB0")

    was_active = service_is_active()
    if was_active and no_stop:
        print(f"warning: {service_name()} is running; flashing may fail or corrupt data", file=sys.stderr)
    if was_active and not no_stop:
        print(f"stopping {service_name()}...")
        stop_service()

    try:
        cmd = [sys.executable, "-m", "cc2538_bsl.cc2538_bsl", "-q", "-p", serial_port]
        if mass_erase:
            cmd += ["-e", "-w"]
        else:
            cmd += ["-W"]
        cmd += ["-v"]
        if baud:
            cmd += ["-b", str(baud)]
        if bootloader_sonoff_usb:
            cmd += ["--bootloader-sonoff-usb"]
        if bootloader_active_high:
            cmd += ["--bootloader-active-high"]
        if bootloader_invert_lines:
            cmd += ["--bootloader-invert-lines"]
        cmd.append(str(hex_path))
        print(f"flashing {hex_path} to {serial_port}")
        subprocess.run(cmd, check=True)
        print("flash complete")
    finally:
        if was_active and not no_stop:
            print(f"starting {service_name()}...")
            start_service()

    return 0
