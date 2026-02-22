#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _now_s() -> float:
    return time.time()


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _devices_from_watchbots_config(*, path: Path, list_name: str, base_topic: str) -> list[str]:
    cfg = _load_json(path)
    topics = cfg["mqtt"]["lists"][list_name]
    devices: list[str] = []
    for topic in topics:
        if not isinstance(topic, str) or not topic.strip():
            continue
        t = topic.strip()
        prefix = f"{base_topic}/"
        if t.startswith(prefix):
            devices.append(t[len(prefix) :])
        elif "/" in t:
            devices.append(t.split("/", 1)[1])
        else:
            devices.append(t)
    # keep order, drop dupes
    out: list[str] = []
    seen: set[str] = set()
    for dev in devices:
        if dev not in seen:
            out.append(dev)
            seen.add(dev)
    return out


@dataclass
class ConfigureResult:
    device: str
    ok: bool
    payload: Any


def _configure_devices(
    *,
    host: str,
    port: int,
    base_topic: str,
    devices: list[str],
    timeout_s: float,
) -> list[ConfigureResult]:
    try:
        import paho.mqtt.client as mqtt  # type: ignore
    except Exception as e:  # pragma: no cover
        raise SystemExit(
            "Missing dependency: paho-mqtt. Install it (e.g. `pip3 install paho-mqtt`) and retry.\n"
            f"Import error: {e}"
        )

    request_topic = f"{base_topic}/bridge/request/device/configure"
    response_topic = f"{base_topic}/bridge/response/device/configure"

    messages: list[str] = []

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            messages.append(msg.payload.decode("utf-8", "replace"))
        except Exception:
            messages.append(repr(msg.payload))

    client = mqtt.Client(client_id=f"eurotronic-reconfigure-{os.getpid()}-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(response_topic, qos=0)
    client.loop_start()

    results: list[ConfigureResult] = []
    try:
        for device in devices:
            start_idx = len(messages)
            client.publish(request_topic, payload=device, qos=0, retain=False)
            deadline = _now_s() + timeout_s
            while _now_s() < deadline and len(messages) == start_idx:
                time.sleep(0.05)

            if len(messages) == start_idx:
                results.append(ConfigureResult(device=device, ok=False, payload=None))
                continue

            raw = messages[start_idx]
            try:
                payload = json.loads(raw)
            except Exception:
                payload = raw

            ok = isinstance(payload, dict) and payload.get("status") == "ok"
            results.append(ConfigureResult(device=device, ok=ok, payload=payload))
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    return results


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="eurotronic_reconfigure.py",
        description="Reconfigure Eurotronic TRVs in Zigbee2MQTT via MQTT bridge (device/configure).",
    )
    parser.add_argument("--mqtt-host", default="localhost")
    parser.add_argument("--mqtt-port", type=int, default=1883)
    parser.add_argument("--base-topic", default="lzig")
    parser.add_argument("--timeout-s", type=float, default=30.0)

    parser.add_argument(
        "--watchbots-config",
        default=str(Path(__file__).resolve().parents[1] / "watchbots" / "config.json"),
        help="Used only when no --device is provided.",
    )
    parser.add_argument("--watchbots-list", default="eurotronics", help="List name under watchbots config mqtt.lists.")

    parser.add_argument("--device", action="append", default=[], help="Friendly name or IEEE address; repeatable.")

    args = parser.parse_args(argv)

    devices: list[str] = [d.strip() for d in args.device if d and d.strip()]
    if not devices:
        cfg_path = Path(args.watchbots_config)
        if not cfg_path.exists():
            print(f"error: no --device provided and watchbots config not found: {cfg_path}", file=sys.stderr)
            return 2
        devices = _devices_from_watchbots_config(path=cfg_path, list_name=args.watchbots_list, base_topic=args.base_topic)
        if not devices:
            print(
                f"error: watchbots list '{args.watchbots_list}' is empty (file: {cfg_path})",
                file=sys.stderr,
            )
            return 2

    results = _configure_devices(
        host=args.mqtt_host,
        port=args.mqtt_port,
        base_topic=args.base_topic,
        devices=devices,
        timeout_s=args.timeout_s,
    )

    failures = 0
    for r in results:
        if r.ok:
            print(f"ok    {r.device}")
        else:
            failures += 1
            detail = ""
            if isinstance(r.payload, dict) and r.payload:
                msg = r.payload.get("error") or r.payload.get("message")
                if msg:
                    detail = f": {msg}"
            print(f"error {r.device}{detail}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

