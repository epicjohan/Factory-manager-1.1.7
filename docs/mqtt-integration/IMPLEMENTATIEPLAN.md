# Factory Manager — UNS/MQTT Implementatieplan

## Overzicht

```
Fase 1: Mosquitto MQTT Broker installeren        (30 min)
Fase 2: Shelly Pro 3EM MQTT configureren         (15 min per Shelly)
Fase 3: PocketBase + Subscriber script           (1 uur)
Fase 4: MT-LINKi → MQTT publisher                (zodra MT-LINKi draait)
```

**Server**: `10.1.111.26` (Windows, draait PocketBase + MT-LINKi)

---

## Fase 1: Mosquitto MQTT Broker

### 1.1 Download & Installeer

1. Ga naar **https://mosquitto.org/download/**
2. Download **mosquitto-2.x.x-install-windows-x64.exe**
3. Run de installer **als Administrator**
4. Vink aan: **☑ Service** (auto-start bij boot)
5. Installeer naar standaard pad: `C:\Program Files\mosquitto\`

### 1.2 Configuratie

Open `C:\Program Files\mosquitto\mosquitto.conf` in Notepad (als Administrator) en vervang de inhoud met:

```conf
# ═══════════════════════════════════════════════════
# Factory Manager — Mosquitto MQTT Broker
# ═══════════════════════════════════════════════════

# Luister op alle interfaces, poort 1883
listener 1883 0.0.0.0

# Geen authenticatie (intern fabriek-netwerk)
allow_anonymous true

# Logging
log_dest file C:\ProgramData\mosquitto\mosquitto.log
log_type error
log_type warning
log_type notice
log_timestamp true
log_timestamp_format %Y-%m-%dT%H:%M:%S

# Persistentie — bewaar retained messages bij herstart
persistence true
persistence_location C:\ProgramData\mosquitto\data\

# Limieten
max_connections 200
message_size_limit 10240
```

### 1.3 Map aanmaken & Service starten

Open **Command Prompt als Administrator**:

```cmd
mkdir C:\ProgramData\mosquitto\data

:: Herstart de service met nieuwe config
net stop mosquitto
net start mosquitto
```

### 1.4 Firewall openen

```cmd
netsh advfirewall firewall add rule name="MQTT Broker (Mosquitto)" dir=in action=allow protocol=tcp localport=1883
```

### 1.5 Testen

Open **twee** Command Prompt vensters:

**Venster 1 — Subscriber (luisteren):**
```cmd
cd "C:\Program Files\mosquitto"
mosquitto_sub -h 127.0.0.1 -t "test/#" -v
```

**Venster 2 — Publisher (versturen):**
```cmd
cd "C:\Program Files\mosquitto"
mosquitto_pub -h 127.0.0.1 -t "test/hello" -m "Mosquitto werkt!"
```

✅ **Succes** als Venster 1 toont: `test/hello Mosquitto werkt!`

---

## Fase 2: Shelly Pro 3EM MQTT Configuratie

### Per Shelly — herhaal voor elke machine:

#### 2.1 Shelly IP toekennen

Geef de Shelly een vast IP via je router/DHCP-server of via de Shelly webinterface.

#### 2.2 MQTT inschakelen

1. Open browser → `http://{shelly-ip}`
2. Ga naar **Settings → MQTT**
3. Stel in:

| Instelling | Waarde |
|---|---|
| **Enable MQTT** | ☑ Aan |
| **Server** | `10.1.111.26:1883` |
| **MQTT Prefix** | `factory/energy/{MACHINE_NR}` |
| **Username** | *(leeg laten)* |
| **Password** | *(leeg laten)* |
| **Generic status update** | ☑ Aan |
| **RPC status notifications** | ☑ Aan |

> Vervang `{MACHINE_NR}` met het machinenummer, bijv: `factory/energy/CNC-005`

4. Klik **Save** → Shelly herstart

#### 2.3 Verifiëren

Op de server:
```cmd
cd "C:\Program Files\mosquitto"
mosquitto_sub -h 127.0.0.1 -t "factory/energy/#" -v
```

Je zou binnen ~30 seconden berichten moeten zien zoals:
```
factory/energy/CNC-005/status/em:0 {"id":0,"a_act_power":120.5,"b_act_power":115.2,...}
```

#### 2.4 Voorbeeld topic-mapping per machine

| Machine | Shelly IP | MQTT Prefix |
|---|---|---|
| CNC-005 | 10.1.111.50 | `factory/energy/CNC-005` |
| CNC-012 | 10.1.111.51 | `factory/energy/CNC-012` |
| CNC-018 | 10.1.111.52 | `factory/energy/CNC-018` |

---

## Fase 3: PocketBase + Universal Subscriber

### 3.1 PocketBase Collecties Aanmaken

#### Collectie: `energy_asset_logs` (NIEUW)

Maak aan in PocketBase Admin (`http://10.1.111.26:8090/_/`):

| Veld | Type | Required |
|---|---|---|
| `machineId` | Text | ✅ |
| `total_power_w` | Number | |
| `l1_power_w` | Number | |
| `l2_power_w` | Number | |
| `l3_power_w` | Number | |
| `l1_current_a` | Number | |
| `l2_current_a` | Number | |
| `l3_current_a` | Number | |
| `l1_voltage_v` | Number | |
| `total_kwh` | Number | |

API Rules: alle op leeg (open access).

#### Collectie: `asset_energy_configs` (check of deze bestaat)

| Veld | Type | Required |
|---|---|---|
| `machineId` | Text | ✅ |
| `sensorType` | Text | ✅ |
| `ipAddress` | Text | |
| `pollInterval` | Number | |

### 3.2 Python Dependencies Installeren

Op de server:
```cmd
pip install paho-mqtt requests
```

### 3.3 Universal Subscriber Script

Maak bestand: `C:\FactoryManager\scripts\factory_subscriber.py`

```python
"""
Factory Manager — Universal MQTT Subscriber v1.0
Luistert op factory/# en schrijft data naar PocketBase.
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
```

### 3.4 Als Windows Service draaien (optioneel)

Maak `C:\FactoryManager\scripts\start_subscriber.bat`:
```bat
@echo off
cd /d C:\FactoryManager\scripts
python factory_subscriber.py
```

Of gebruik **NSSM** om het als service te registreren:
```cmd
nssm install FactorySubscriber "C:\Python3x\python.exe" "C:\FactoryManager\scripts\factory_subscriber.py"
nssm start FactorySubscriber
```

### 3.5 Testen

```cmd
python C:\FactoryManager\scripts\factory_subscriber.py
```

Verwachte output:
```
[19:25:00] [INFO   ] Factory Manager — MQTT Subscriber v1.0
[19:25:00] [INFO   ] PocketBase login OK
[19:25:00] [INFO   ] Machines geladen: 22
[19:25:00] [INFO   ] MQTT verbonden
[19:25:00] [INFO   ] Geabonneerd op: factory/#
[19:25:05] [INFO   ] Energy log: abc123def456
```

---

## Fase 4: MT-LINKi → MQTT Publisher

> ⏳ Pas uitvoeren zodra MT-LINKi geïnstalleerd en geconfigureerd is.

### 4.1 MT-LINKi Web API verkennen

Na installatie, zoek de Swagger docs:
```
{MT-LINKi installatiemap}\manual\EN\webapi-spec\
```

Start de Swagger UI en noteer:
- De base URL (bijv. `http://localhost:8080`)
- Het endpoint voor machine signals
- Het response-formaat

### 4.2 MT-LINKi Publisher Script

Maak: `C:\FactoryManager\scripts\mtlinki_publisher.py`

```python
"""
Factory Manager — MT-LINKi → MQTT Publisher v1.0
Leest CNC data uit MT-LINKi Web API en publiceert naar MQTT.
Geen fwlib32.dll nodig — MT-LINKi doet de FOCAS polling.
"""
import json
import time
import sys
import requests
import paho.mqtt.client as mqtt
from datetime import datetime

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
    # Map MT-LINKi velden naar UNS formaat
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
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    topic = f"factory/focas/{machine_name}/status"
    mqtt_client.publish(topic, json.dumps(payload), retain=True)


def main():
    log("MT-LINKi → MQTT Publisher v1.0")

    mqtt_client.connect(MQTT_BROKER, MQTT_PORT)
    mqtt_client.loop_start()

    machines = get_machines()
    log(f"MT-LINKi machines: {len(machines)}")

    while True:
        for m in machines:
            mid = m.get("id") or m.get("machine_id")
            name = m.get("name") or m.get("machine_name", "UNKNOWN")
            signals = get_signals(mid)
            if signals:
                publish_status(name, signals)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
```

> [!IMPORTANT]
> De veldnamen in `get_signals()` en `publish_status()` moeten worden aangepast zodra je de MT-LINKi Swagger docs hebt bekeken. Deel de API response en ik pas het script exact aan.

---

## Checklist per fase

### ☐ Fase 1 — Mosquitto
```
□ mosquitto-2.x.x-install-windows-x64.exe gedownload
□ Geïnstalleerd met Service optie
□ mosquitto.conf aangepast
□ Data map aangemaakt (C:\ProgramData\mosquitto\data\)
□ Service herstart (net stop/start mosquitto)
□ Firewall regel toegevoegd (poort 1883)
□ Test geslaagd (mosquitto_pub/sub)
```

### ☐ Fase 2 — Shelly
```
□ Shelly Pro 3EM IP toegekend
□ MQTT ingeschakeld in Shelly webinterface
□ Topic prefix ingesteld: factory/energy/{MACHINE_NR}
□ Server ingesteld: 10.1.111.26:1883
□ Data zichtbaar via mosquitto_sub -t "factory/energy/#" -v
```

### ☐ Fase 3 — Subscriber
```
□ pip install paho-mqtt requests
□ energy_asset_logs collectie aangemaakt in PocketBase
□ asset_energy_configs collectie geverifieerd
□ factory_subscriber.py geplaatst
□ Script gestart, MQTT verbinding OK
□ liveStats.activePower zichtbaar in machine record
□ energy_asset_logs bevat records
□ system_status toont MQTT_SUBSCRIBER = ONLINE
```

### ☐ Fase 4 — MT-LINKi (later)
```
□ MT-LINKi geïnstalleerd op server
□ Machines geconfigureerd in MT-LINKi Admin Tool
□ Swagger docs gevonden en bekeken
□ mtlinki_publisher.py veldmapping aangepast
□ Script gestart
□ factory/focas/# data zichtbaar in MQTT
□ liveStats bevat CNC data (programNumber, spindleLoad, etc.)
```
