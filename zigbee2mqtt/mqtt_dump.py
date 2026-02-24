#!/usr/bin/env python3
"""
Small MQTT debug helper for Zigbee2MQTT topics.

Typical usage:
  python3 zigbee2mqtt/mqtt_dump.py dump --topic "lzig/kitchen heat"
  python3 zigbee2mqtt/mqtt_dump.py dump --topic "lzig/kitchen heat" --keys last_seen pi_heating_demand running_state
"""

from __future__ import annotations

import argparse
import json
import time
from typing import Any

import paho.mqtt.client as mqtt


def _now_s() -> float:
    return time.time()


def _try_json(s: str) -> Any:
    try:
        return json.loads(s)
    except Exception:
        return None


def dump_topic(*, host: str, port: int, topic: str, timeout_s: float, keys: list[str]) -> int:
    msg_payload: str | None = None
    msg_retain: bool | None = None

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        nonlocal msg_payload, msg_retain
        try:
            msg_payload = msg.payload.decode("utf-8", "replace")
        except Exception:
            msg_payload = repr(msg.payload)
        msg_retain = bool(getattr(msg, "retain", False))

    client = mqtt.Client(client_id=f"mqtt-dump-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(topic, qos=0)
    client.loop_start()
    try:
        deadline = _now_s() + timeout_s
        while _now_s() < deadline and msg_payload is None:
            time.sleep(0.05)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    print(topic)
    if msg_payload is None:
        print("<no message received>")
        return 1

    print(f"retain={msg_retain}")
    print(msg_payload)

    decoded = _try_json(msg_payload)
    if decoded is None or not isinstance(decoded, dict) or not keys:
        return 0

    for k in keys:
        if k in decoded:
            print(f"{k} = {decoded[k]}")
    return 0


def monitor_topic(*, host: str, port: int, topic: str, duration_s: float) -> int:
    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            payload = msg.payload.decode("utf-8", "replace")
        except Exception:
            payload = repr(msg.payload)
        retain = bool(getattr(msg, "retain", False))
        print(f"{time.strftime('%H:%M:%S')} retain={retain} {msg.topic} {payload}")

    client = mqtt.Client(client_id=f"mqtt-monitor-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(topic, qos=0)
    client.loop_start()
    try:
        end = _now_s() + duration_s
        while _now_s() < end:
            time.sleep(0.1)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="mqtt_dump.py", description="Dump MQTT topic payload (useful for Z2M).")
    sub = parser.add_subparsers(dest="cmd", required=True)

    dump = sub.add_parser("dump", help="Subscribe once and print the first payload received.")
    dump.add_argument("--mqtt-host", default="mqtt_broquer")
    dump.add_argument("--mqtt-port", type=int, default=1883)
    dump.add_argument("--topic", required=True)
    dump.add_argument("--timeout-s", type=float, default=3.0)
    dump.add_argument(
        "--keys",
        nargs="*",
        default=[],
        help="If payload is JSON object, also print these keys if present.",
    )

    mon = sub.add_parser("monitor", help="Print all messages on a topic for a duration.")
    mon.add_argument("--mqtt-host", default="mqtt_broquer")
    mon.add_argument("--mqtt-port", type=int, default=1883)
    mon.add_argument("--topic", required=True)
    mon.add_argument("--duration-s", type=float, default=60.0)

    args = parser.parse_args(argv)
    if args.cmd == "dump":
        return dump_topic(
            host=args.mqtt_host,
            port=args.mqtt_port,
            topic=args.topic,
            timeout_s=args.timeout_s,
            keys=list(args.keys),
        )
    if args.cmd == "monitor":
        return monitor_topic(
            host=args.mqtt_host,
            port=args.mqtt_port,
            topic=args.topic,
            duration_s=args.duration_s,
        )
    raise SystemExit("unreachable")


if __name__ == "__main__":
    raise SystemExit(main(__import__("sys").argv[1:]))
