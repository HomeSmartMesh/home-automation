from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Tuple


def _ts() -> str:
    return datetime.now(timezone.utc).astimezone().strftime("%Y%m%d-%H%M%S")


def _which(cmd: str) -> Optional[str]:
    return shutil.which(cmd)


def _run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=check, text=True)


def maybe_sudo(cmd: list[str]) -> list[str]:
    if os.geteuid() == 0:
        return cmd
    if _which("sudo"):
        return ["sudo", *cmd]
    return cmd


def service_name() -> str:
    return os.environ.get("Z2M_SYSTEMD_SERVICE", "zigbee2mqtt.service")


def data_dir() -> Path:
    override = os.environ.get("Z2M_DATA_DIR")
    if override:
        return Path(override)
    if Path("/opt/zigbee2mqtt/data").is_dir():
        return Path("/opt/zigbee2mqtt/data")
    return Path(__file__).resolve().parents[1] / "data"


def backup_dir() -> Path:
    override = os.environ.get("Z2M_BACKUP_DIR")
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[1] / "backups"


def service_is_active() -> bool:
    proc = subprocess.run(
        ["systemctl", "is-active", "--quiet", service_name()],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc.returncode == 0


def stop_service() -> None:
    _run(maybe_sudo(["systemctl", "stop", service_name()]))


def start_service() -> None:
    _run(maybe_sudo(["systemctl", "start", service_name()]))


def sha256(path: Path) -> str:
    import hashlib

    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "Missing PyYAML. Install deps with `uv sync` (preferred) or `python3 -m pip install PyYAML`."
        ) from e
    with path.open("r", encoding="utf-8") as f:
        obj = yaml.safe_load(f) or {}
    if not isinstance(obj, dict):
        raise RuntimeError(f"Unexpected YAML root in {path}")
    return obj


@dataclass(frozen=True)
class MqttConfig:
    server: str
    base_topic: str
    username: Optional[str] = None
    password: Optional[str] = None


def parse_mqtt_config(configuration_yaml: Path) -> MqttConfig:
    cfg = load_yaml(configuration_yaml)
    mqtt_cfg = cfg.get("mqtt") or {}
    if not isinstance(mqtt_cfg, dict):
        raise RuntimeError("Invalid mqtt config in configuration.yaml")
    server = str(mqtt_cfg.get("server") or "mqtt://localhost")
    base_topic = str(mqtt_cfg.get("base_topic") or "zigbee2mqtt")
    username = mqtt_cfg.get("user")
    password = mqtt_cfg.get("password")
    return MqttConfig(
        server=server,
        base_topic=base_topic,
        username=str(username) if username is not None else None,
        password=str(password) if password is not None else None,
    )


def mqtt_request_backup_zip(
    *,
    configuration_yaml: Path,
    out_zip: Path,
    timeout_s: float,
) -> None:
    try:
        import paho.mqtt.client as mqtt  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "Missing paho-mqtt. Install deps with `uv sync` (preferred) or `python3 -m pip install paho-mqtt`."
        ) from e

    cfg = parse_mqtt_config(configuration_yaml)

    # paho-mqtt uses host/port; accept mqtt:// URLs.
    host = cfg.server
    port = 1883
    if "://" in cfg.server:
        from urllib.parse import urlparse

        u = urlparse(cfg.server)
        if u.scheme and u.scheme not in ("mqtt", "tcp"):
            raise RuntimeError(f"Unsupported MQTT URL scheme: {u.scheme}")
        host = u.hostname or "localhost"
        if u.port:
            port = u.port

    request_topic = f"{cfg.base_topic}/bridge/request/backup"
    response_topic = f"{cfg.base_topic}/bridge/response/backup"

    out_zip.parent.mkdir(parents=True, exist_ok=True)

    result: dict[str, Any] = {}
    done = False
    err: list[str] = []

    def on_connect(client, _userdata, _flags, rc, *_args):  # type: ignore[no-untyped-def]
        if rc != 0:
            err.append(f"MQTT connect failed rc={rc}")
            client.disconnect()
            return
        client.subscribe(response_topic, qos=0)
        client.publish(request_topic, payload="", qos=0, retain=False)

    def on_message(_client, _userdata, msg):  # type: ignore[no-untyped-def]
        nonlocal done
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception as e:
            err.append(f"Invalid JSON on {response_topic}: {e}")
            done = True
            return
        result.update(payload if isinstance(payload, dict) else {"_payload": payload})
        done = True

    client = mqtt.Client(client_id=f"z2m-backup-{int(time.time())}")
    if cfg.username is not None:
        client.username_pw_set(cfg.username, cfg.password)
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(host, port, keepalive=30)
    client.loop_start()
    try:
        deadline = time.time() + timeout_s
        while time.time() < deadline and not done and not err:
            time.sleep(0.05)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    if err:
        raise RuntimeError(err[0])
    if not done:
        raise RuntimeError(f"Timeout waiting for {response_topic} after {timeout_s}s")
    if result.get("status") != "ok":
        raise RuntimeError(f"Backup failed: {result.get('error') or 'unexpected response'}")
    data = result.get("data") or {}
    if not isinstance(data, dict) or "zip" not in data:
        raise RuntimeError("Backup response missing data.zip")
    zip_b64 = data["zip"]
    if not isinstance(zip_b64, str):
        raise RuntimeError("Backup response data.zip is not a string")

    out_zip.write_bytes(base64.b64decode(zip_b64))


def find_serial_port_from_config(configuration_yaml: Path) -> Optional[str]:
    cfg = load_yaml(configuration_yaml)
    serial_cfg = cfg.get("serial") or {}
    if isinstance(serial_cfg, dict) and "port" in serial_cfg:
        return str(serial_cfg["port"])
    return None

