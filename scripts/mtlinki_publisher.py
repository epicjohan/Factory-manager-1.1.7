"""
Factory Manager — MT-LINKi → MQTT Publisher v1.0
Leest CNC data uit MT-LINKi Web API en publiceert naar MQTT.
Geen fwlib32.dll nodig — MT-LINKi doet de FOCAS polling.

Gebruik:
  pip install paho-mqtt requests
  python mtlinki_publisher.py

BELANGRIJK: Pas MTLINKI_URL en de veldmapping aan na het bekijken
van de MT-LINKi Swagger docs op jouw server.
"""
import json
import time
import sys
import requests
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

# ─── CONFIG ──────────────────────────────────────
MTLINKI_URL = "http://localhost:8080"  # ← pas aan na installatie
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
POLL_INTERVAL = 5  # seconden

mqtt_client = mqtt.Client("mtlinki-publisher")


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level:<7}] {msg}", flush=True)


def get_machines():
    """Haal machinelijst op uit MT-LINKi."""
    try:
        r = requests.get(f"{MTLINKI_URL}/equipment/1/machines", timeout=5)
        if r.ok:
            return r.json()
    except Exception as e:
        log(f"MT-LINKi machines fout: {e}", "ERROR")
    return []


def get_signals(machine_id):
    """Haal actuele signalen op voor een machine."""
    try:
        r = requests.get(
            f"{MTLINKI_URL}/machines/{machine_id}/signals",
            timeout=3)
        if r.ok:
            return r.json()
    except:
        pass
    return {}


def publish_status(machine_name, signals):
    """Publiceer naar factory/focas/{machineNr}/status."""
    # ⚠️ Pas onderstaande mapping aan op basis van jouw Swagger docs
    payload = {
        "connected": True,
        "program_number":  signals.get("program_no"),
        "program_name":    signals.get("program_name"),
        "spindle_load":    signals.get("spindle_load"),
        "execution_state": signals.get("run_status"),
        "cycle_time_sec":  signals.get("cycle_time"),
        "feed_override":   signals.get("feed_override"),
        "parts_count":     signals.get("parts_count"),
        "timestamp": datetime.now(timezone.utc).isoformat()
            .replace("+00:00", "Z")
    }
    topic = f"factory/focas/{machine_name}/status"
    mqtt_client.publish(topic, json.dumps(payload), retain=True)


def report_health(status="ONLINE"):
    """Rapporteer status via MQTT."""
    mqtt_client.publish("factory/bridge/mtlinki/status",
        json.dumps({"status": status,
                     "timestamp": datetime.now(timezone.utc).isoformat()
                         .replace("+00:00", "Z")}),
        retain=True)


def main():
    log("MT-LINKi → MQTT Publisher v1.0")

    mqtt_client.connect(MQTT_BROKER, MQTT_PORT)
    mqtt_client.loop_start()

    machines = get_machines()
    log(f"MT-LINKi machines: {len(machines)}")

    if not machines:
        log("Geen machines gevonden. Controleer MTLINKI_URL.", "ERROR")
        log(f"Huidige URL: {MTLINKI_URL}", "ERROR")
        return

    report_health("ONLINE")

    cycle = 0
    while True:
        for m in machines:
            mid = m.get("id") or m.get("machine_id")
            name = m.get("name") or m.get("machine_name", "UNKNOWN")
            signals = get_signals(mid)
            if signals:
                publish_status(name, signals)

        cycle += 1
        if cycle % 60 == 0:  # Elke ~5 min machines refreshen
            machines = get_machines()
            report_health("ONLINE")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        report_health("OFFLINE")
        sys.exit(0)
