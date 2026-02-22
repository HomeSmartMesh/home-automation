#!/usr/bin/env python3
"""
Small Zigbee2MQTT Eurotronic/TRV debug helper.

Primary use:
  - Send a Zigbee2MQTT "configure" request over MQTT and print the response.
  - Useful to confirm whether a sleepy/battery device is currently reachable.

This deployment uses:
  - MQTT base_topic: lzig
  - broker: localhost:1883
Adjust via CLI flags if needed.
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


def request_device_configure(*, host: str, port: int, base_topic: str, device_id: str, timeout_s: float) -> Any:
    request_topic = f"{base_topic}/bridge/request/device/configure"
    response_topic = f"{base_topic}/bridge/response/device/configure"

    responses: list[str] = []

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            responses.append(msg.payload.decode("utf-8", "replace"))
        except Exception:
            responses.append(repr(msg.payload))

    client = mqtt.Client(client_id=f"test-euro-configure-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(response_topic, qos=0)
    client.loop_start()
    try:
        client.publish(request_topic, payload=device_id, qos=0, retain=False)
        deadline = _now_s() + timeout_s
        while _now_s() < deadline and not responses:
            time.sleep(0.05)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    if not responses:
        return None

    payload = responses[0]
    decoded = _try_json(payload)
    return decoded if decoded is not None else payload


def monitor_bridge(*, host: str, port: int, base_topic: str, duration_s: float) -> int:
    topic = f"{base_topic}/bridge/#"

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            payload = msg.payload.decode("utf-8", "replace")
        except Exception:
            payload = repr(msg.payload)
        print(f"{time.strftime('%H:%M:%S')} {msg.topic} {payload[:400]}")

    client = mqtt.Client(client_id=f"test-euro-bridge-{int(_now_s())}")
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


def request_networkmap(
    *,
    host: str,
    port: int,
    base_topic: str,
    map_type: str,
    routes: bool,
    timeout_s: float,
) -> Any:
    # Zigbee2MQTT has both:
    # - request/response API: {base}/bridge/request/networkmap -> {base}/bridge/response/networkmap
    # - legacy API: {base}/bridge/networkmap[/routes] -> {base}/bridge/networkmap/{type}
    # Some deployments (incl. legacy_api=true) may only respond to the legacy API.

    def wait_one(*, subscribe_topic: str, publish_topic: str, publish_payload: str) -> str | None:
        responses: list[str] = []

        def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
            try:
                responses.append(msg.payload.decode("utf-8", "replace"))
            except Exception:
                responses.append(repr(msg.payload))

        client = mqtt.Client(client_id=f"test-euro-networkmap-{int(_now_s())}")
        client.on_message = on_message
        client.connect(host, port, keepalive=30)
        client.subscribe(subscribe_topic, qos=0)
        client.loop_start()
        try:
            client.publish(publish_topic, payload=publish_payload, qos=0, retain=False)
            deadline = _now_s() + timeout_s
            while _now_s() < deadline and not responses:
                time.sleep(0.05)
        finally:
            client.loop_stop()
            try:
                client.disconnect()
            except Exception:
                pass

        return responses[0] if responses else None

    # 1) Try legacy API first (most compatible when legacy_api=true)
    # Note: legacy ".../networkmap/routes" doesn't reliably respond on some installs.
    # We therefore always use the base legacy topic and accept whatever it returns.
    legacy_request = f"{base_topic}/bridge/networkmap"
    legacy_response = f"{base_topic}/bridge/networkmap/{map_type}"
    legacy = wait_one(
        subscribe_topic=legacy_response,
        publish_topic=legacy_request,
        publish_payload=str(map_type),
    )
    if legacy:
        decoded = _try_json(legacy)
        return decoded if decoded is not None else legacy

    # 2) Fallback to request/response API
    rr_payload = json.dumps({"type": map_type, "routes": routes})
    rr = wait_one(
        subscribe_topic=f"{base_topic}/bridge/response/networkmap",
        publish_topic=f"{base_topic}/bridge/request/networkmap",
        publish_payload=rr_payload,
    )
    if rr:
        decoded = _try_json(rr)
        return decoded if decoded is not None else rr

    return None


def set_permit_join(
    *,
    host: str,
    port: int,
    base_topic: str,
    enable: bool,
    time_s: int,
    timeout_s: float,
) -> Any:
    request_topic = f"{base_topic}/bridge/request/permit_join"
    response_topic = f"{base_topic}/bridge/response/permit_join"

    responses: list[str] = []

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            responses.append(msg.payload.decode("utf-8", "replace"))
        except Exception:
            responses.append(repr(msg.payload))

    client = mqtt.Client(client_id=f"test-euro-permit-join-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(response_topic, qos=0)
    client.loop_start()
    try:
        payload = json.dumps({"value": bool(enable), "time": int(time_s)})
        client.publish(request_topic, payload=payload, qos=0, retain=False)
        deadline = _now_s() + timeout_s
        while _now_s() < deadline and not responses:
            time.sleep(0.05)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    if not responses:
        return None

    decoded = _try_json(responses[0])
    return decoded if decoded is not None else responses[0]


def get_retained(*, host: str, port: int, topic: str, timeout_s: float) -> str | None:
    responses: list[str] = []

    def on_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            responses.append(msg.payload.decode("utf-8", "replace"))
        except Exception:
            responses.append(repr(msg.payload))

    client = mqtt.Client(client_id=f"test-euro-retained-{int(_now_s())}")
    client.on_message = on_message
    client.connect(host, port, keepalive=30)
    client.subscribe(topic, qos=0)
    client.loop_start()
    try:
        deadline = _now_s() + timeout_s
        while _now_s() < deadline and not responses:
            time.sleep(0.05)
    finally:
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass

    return responses[0] if responses else None


def show_device_bindings(*, host: str, port: int, base_topic: str, device: str, timeout_s: float) -> int:
    payload = get_retained(host=host, port=port, topic=f"{base_topic}/bridge/devices", timeout_s=timeout_s)
    if not payload:
        print(f"NO MESSAGE (timeout) on {base_topic}/bridge/devices")
        return 2

    devices = _try_json(payload)
    if not isinstance(devices, list):
        print("Unexpected payload for bridge/devices (expected JSON list)")
        print(payload[:400])
        return 2

    def matches(d: dict[str, Any]) -> bool:
        if device in (
            d.get("friendly_name"),
            d.get("friendlyName"),
            d.get("ieee_address"),
            d.get("ieeeAddr"),
        ):
            return True
        # allow passing just the last part of ieeeAddr
        if isinstance(d.get("ieee_address"), str) and d["ieee_address"].endswith(device.lower()):
            return True
        if isinstance(d.get("ieeeAddr"), str) and d["ieeeAddr"].endswith(device.lower()):
            return True
        return False

    found = None
    for d in devices:
        if isinstance(d, dict) and matches(d):
            found = d
            break

    if not found:
        print(f"Device not found in {base_topic}/bridge/devices: {device!r}")
        return 3

    friendly = found.get("friendly_name") or found.get("friendlyName")
    ieee = found.get("ieee_address") or found.get("ieeeAddr")
    nwk = found.get("network_address") or found.get("networkAddress")
    print(f"device: {friendly}")
    print(f"  ieee: {ieee}")
    print(f"  nwk:  {hex(nwk) if isinstance(nwk, int) else nwk}")
    print(f"  type: {found.get('type')}  power: {found.get('power_source')}")
    print(f"  interview_completed: {found.get('interview_completed')}  disabled: {found.get('disabled')}")

    eps = found.get("endpoints") or {}
    if not isinstance(eps, dict):
        print("  endpoints: <unexpected>")
        return 0

    # Most TRVs use endpoint 1.
    ep1 = eps.get("1")
    if not isinstance(ep1, dict):
        print("  endpoint 1: <missing>")
        return 0

    binds = ep1.get("bindings") or []
    reports = ep1.get("configured_reportings") or ep1.get("configuredReportings") or []

    print(f"  endpoint 1 bindings: {len(binds)}")
    for b in binds:
        if not isinstance(b, dict):
            continue
        cluster = b.get("cluster")
        target = b.get("target") or {}
        if isinstance(target, dict):
            target_ieee = target.get("ieee_address") or target.get("ieeeAddr")
            target_ep = target.get("endpoint")
        else:
            target_ieee = None
            target_ep = None
        print(f"    - {cluster} -> {target_ieee}/{target_ep}")

    print(f"  endpoint 1 configured_reportings: {len(reports)}")
    for r in reports:
        if not isinstance(r, dict):
            continue
        cluster = r.get("cluster")
        attr = r.get("attribute")
        min_i = r.get("minimum_report_interval")
        max_i = r.get("maximum_report_interval")
        chg = r.get("reportable_change")
        print(f"    - {cluster}.{attr} min={min_i} max={max_i} change={chg}")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Zigbee2MQTT Eurotronic debug helper")
    parser.add_argument("--host", default="localhost", help="MQTT host (default: localhost)")
    parser.add_argument("--port", default=1883, type=int, help="MQTT port (default: 1883)")
    parser.add_argument("--base-topic", default="lzig", help="Zigbee2MQTT base_topic (default: lzig)")

    sub = parser.add_subparsers(dest="cmd", required=True)

    p_cfg = sub.add_parser("configure", help="Request Zigbee2MQTT to (re)configure a device")
    p_cfg.add_argument(
        "--device",
        action="append",
        dest="devices",
        default=[],
        help="Device id/friendly_name/ieeeAddr (repeatable). Default: bedroom heat + living heat.",
    )
    p_cfg.add_argument("--timeout-s", type=float, default=25.0, help="Timeout waiting for response (default: 25s)")

    p_mon = sub.add_parser("monitor-bridge", help="Print lzig/bridge/# traffic for pairing/interview debugging")
    p_mon.add_argument("--duration-s", type=float, default=60.0, help="How long to monitor (default: 60s)")

    p_map = sub.add_parser("networkmap", help="Request Zigbee2MQTT network map via MQTT bridge")
    p_map.add_argument("--type", dest="map_type", default="raw", help="raw|graphviz|plantuml (default: raw)")
    p_map.add_argument("--routes", action="store_true", help="Include routes (default: false)")
    p_map.add_argument("--timeout-s", type=float, default=30.0, help="Timeout waiting for response (default: 30s)")

    p_pj = sub.add_parser("permit-join", help="Enable/disable Zigbee permit_join via MQTT bridge")
    p_pj.add_argument("--enable", action="store_true", help="Enable permit join")
    p_pj.add_argument("--disable", action="store_true", help="Disable permit join")
    p_pj.add_argument("--time-s", type=int, default=60, help="Duration when enabling (default: 60)")
    p_pj.add_argument("--timeout-s", type=float, default=10.0, help="Timeout waiting for response (default: 10s)")

    p_di = sub.add_parser("device-info", help="Show bindings/reporting for a device from bridge/devices")
    p_di.add_argument("--device", required=True, help="Device friendly_name or ieeeAddr (e.g. 'living heat')")
    p_di.add_argument("--timeout-s", type=float, default=10.0, help="Timeout waiting for retained devices list")

    args = parser.parse_args()

    if args.cmd == "monitor-bridge":
        return monitor_bridge(host=args.host, port=args.port, base_topic=args.base_topic, duration_s=args.duration_s)

    if args.cmd == "networkmap":
        res = request_networkmap(
            host=args.host,
            port=args.port,
            base_topic=args.base_topic,
            map_type=args.map_type,
            routes=bool(args.routes),
            timeout_s=args.timeout_s,
        )
        if res is None:
            print("NO RESPONSE (timeout)")
            return 2
        print(json.dumps(res, indent=2, sort_keys=True) if isinstance(res, dict) else res)
        return 0

    if args.cmd == "permit-join":
        if bool(args.enable) == bool(args.disable):
            raise SystemExit("pass exactly one of: --enable or --disable")
        res = set_permit_join(
            host=args.host,
            port=args.port,
            base_topic=args.base_topic,
            enable=bool(args.enable),
            time_s=int(args.time_s),
            timeout_s=args.timeout_s,
        )
        if res is None:
            print("NO RESPONSE (timeout)")
            return 2
        print(json.dumps(res, indent=2, sort_keys=True) if isinstance(res, dict) else res)
        return 0

    if args.cmd == "device-info":
        return show_device_bindings(
            host=args.host,
            port=args.port,
            base_topic=args.base_topic,
            device=args.device,
            timeout_s=float(args.timeout_s),
        )

    if args.cmd == "configure":
        devices: list[str] = args.devices or ["bedroom heat", "living heat"]
        for dev in devices:
            print(f"=== {dev}")
            res = request_device_configure(
                host=args.host,
                port=args.port,
                base_topic=args.base_topic,
                device_id=dev,
                timeout_s=args.timeout_s,
            )
            if res is None:
                print("NO RESPONSE (timeout)")
            else:
                print(json.dumps(res, indent=2, sort_keys=True) if isinstance(res, dict) else res)
        return 0

    raise SystemExit("unhandled command")


if __name__ == "__main__":
    raise SystemExit(main())
