"""
Factory Manager — Universal MQTT Subscriber v1.0
Luistert op factory/# en schrijft data naar PocketBase.

Gebruik:
  pip install paho-mqtt requests
  python factory_subscriber.py
"""
import json
import time
import sys
import requests
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

# ─── CONFIG ──────────────────────────────────────
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883

PB_URL = "http://127.0.0.1:8090"
ADMIN_EMAIL = "admin@admin.com"
ADMIN_PASS = "1234567890"

LOG_INTERVAL_SEC = 900  # Historisch loggen elke 15 min

# ─── STATE ───────────────────────────────────────
token = None
machine_cache = {}   # machineNumber → machine record
last_log = {}        # machineId → timestamp


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level:<7}] {msg}", flush=True)


def pb_login():
    global token
    try:
        r = requests.post(f"{PB_URL}/api/collections/_superusers/auth-with-password",
            json={"identity": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=5)
        if r.ok:
            token = r.json().get("token")
            log("PocketBase login OK")
            return True
    except Exception as e:
        log(f"PB login fout: {e}", "ERROR")
    return False


def pb_h():
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def load_machines():
    global machine_cache
    try:
        r = requests.get(f"{PB_URL}/api/collections/machines/records?perPage=200",
            headers=pb_h(), timeout=5)
        if r.ok:
            machine_cache = {}
            for m in r.json().get("items", []):
                nr = m.get("machineNumber", "").upper().strip()
                if nr:
                    machine_cache[nr] = m
            log(f"Machines geladen: {len(machine_cache)}")
    except Exception as e:
        log(f"Machines laden fout: {e}", "ERROR")


def update_livestats(machine_id, updates):
    """Merge updates into machine.liveStats JSON field."""
    try:
        url = f"{PB_URL}/api/collections/machines/records/{machine_id}"
        r = requests.get(url, headers=pb_h(), timeout=3)
        if not r.ok:
            return
        stats = {}
        try:
            stats = json.loads(r.json().get("liveStats") or "{}")
        except:
            stats = {}
        stats.update(updates)
        requests.patch(url, json={"liveStats": json.dumps(stats)},
            headers=pb_h(), timeout=3)
    except Exception as e:
        log(f"liveStats fout: {e}", "WARN")


def log_energy(machine_id, em):
    """Schrijf historisch record (max elke 15 min per machine)."""
    now = time.time()
    if now - last_log.get(machine_id, 0) < LOG_INTERVAL_SEC:
        return
    try:
        requests.post(f"{PB_URL}/api/collections/energy_asset_logs/records",
            json={
                "machineId":    machine_id,
                "total_power_w": em.get("total_act_power", 0),
                "l1_power_w":   em.get("a_act_power", 0),
                "l2_power_w":   em.get("b_act_power", 0),
                "l3_power_w":   em.get("c_act_power", 0),
                "l1_current_a": em.get("a_current", 0),
                "l2_current_a": em.get("b_current", 0),
                "l3_current_a": em.get("c_current", 0),
                "l1_voltage_v": em.get("a_voltage", 0),
                "total_kwh":    round(em.get("total_act", 0) / 1000, 3)
                    if "total_act" in em else 0,
            }, headers=pb_h(), timeout=3)
        last_log[machine_id] = now
        log(f"Energy log: {machine_id}")
    except Exception as e:
        log(f"Energy log fout: {e}", "WARN")


def report_health(status="ONLINE"):
    try:
        r = requests.get(
            f"{PB_URL}/api/collections/system_status/records"
            f"?filter=bridge_name='MQTT_SUBSCRIBER'",
            headers=pb_h(), timeout=3)
        payload = {
            "bridge_name": "MQTT_SUBSCRIBER",
            "status": status,
            "last_seen": datetime.now(timezone.utc).isoformat()
                .replace("+00:00", "Z")
        }
        if r.ok and r.json().get("totalItems", 0) > 0:
            rid = r.json()["items"][0]["id"]
            requests.patch(
                f"{PB_URL}/api/collections/system_status/records/{rid}",
                json=payload, headers=pb_h(), timeout=3)
        else:
            requests.post(
                f"{PB_URL}/api/collections/system_status/records",
                json=payload, headers=pb_h(), timeout=3)
    except:
        pass


# ─── MQTT HANDLERS ───────────────────────────────

def on_connect(client, userdata, flags, rc, props=None):
    if rc == 0:
        log("MQTT verbonden")
        client.subscribe("factory/#")
        log("Geabonneerd op: factory/#")
        report_health("ONLINE")
    else:
        log(f"MQTT fout rc={rc}", "ERROR")


def find_machine(machine_nr):
    """Zoek machine op nummer (case-insensitive)."""
    return machine_cache.get(machine_nr.upper().strip())


def on_message(client, userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
    except:
        return

    parts = topic.split("/")

    # factory / energy / CNC-005 / status / em:0
    if len(parts) >= 5 and parts[1] == "energy" and "em:0" in parts[-1]:
        m = find_machine(parts[2])
        if m:
            power = payload.get("total_act_power", 0)
            update_livestats(m["id"], {
                "activePower": round(power, 1),
                "lastEnergyUpdate": datetime.now(timezone.utc)
                    .isoformat().replace("+00:00", "Z")
            })
            log_energy(m["id"], payload)

    # factory / focas / CNC-005 / status
    elif len(parts) >= 4 and parts[1] == "focas" and parts[-1] == "status":
        m = find_machine(parts[2])
        if m:
            update_livestats(m["id"], {
                "connected": payload.get("connected", True),
                "executionState": payload.get("execution_state"),
                "programNumber": payload.get("program_number"),
                "spindleLoad": payload.get("spindle_load"),
                "cycleTimeSec": payload.get("cycle_time_sec"),
                "lastUpdated": datetime.now(timezone.utc)
                    .isoformat().replace("+00:00", "Z")
            })


def on_disconnect(client, userdata, rc, props=None):
    log("MQTT verbinding verbroken", "WARN")
    report_health("OFFLINE")


# ─── MAIN ────────────────────────────────────────

def main():
    log("Factory Manager — MQTT Subscriber v1.0")

    if not pb_login():
        log("Kan niet starten", "FATAL")
        return

    load_machines()

    client = mqtt.Client(client_id="fm-subscriber",
                         protocol=mqtt.MQTTv5)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)

    # Periodiek: refresh machines + health
    import threading
    def periodic():
        while True:
            time.sleep(300)
            load_machines()
            report_health("ONLINE")
    threading.Thread(target=periodic, daemon=True).start()

    log("Luisteren op MQTT...")
    client.loop_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
