import time
import requests
import json
import sys
import random
from datetime import datetime, timezone

# --- CONFIG ---
PB_URL = "http://10.1.111.26:8090"
ADMIN_EMAIL = "admin@admin.com"
ADMIN_PASS = "1234567890"

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level:<7}] {msg}")
    sys.stdout.flush()

class CNCBridge:
    def __init__(self):
        self.token = None
        self.machines = []

    def login(self):
        try:
            res = requests.post(f"{PB_URL}/api/collections/_superusers/auth-with-password",
                json={"identity": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=5)
            if res.ok:
                self.token = res.json().get("token")
                return True
            return False
        except: return False

    def fetch_machines(self):
        """Haalt de lijst met te monitoren CNC machines op uit de DB."""
        headers = {"Authorization": f"Bearer {self.token}"}
        try:
            res = requests.get(f"{PB_URL}/api/collections/machines/records", headers=headers)
            if res.ok:
                self.machines = [m for m in res.json().get('items', []) if m.get('focasIp')]
                log(f"Monitoring geactiveerd voor {len(self.machines)} machines.")
        except Exception as e:
            log(f"Kon machine lijst niet ophalen: {e}", "ERROR")

    def update_machine_stats(self, machine_id, stats):
        """Stuurt live telemetrie naar de machines collectie."""
        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{PB_URL}/api/collections/machines/records/{machine_id}"
        try:
            # We sturen alleen de liveStats field update
            requests.patch(url, json={"liveStats": stats}, headers=headers, timeout=1)
        except: pass

    def poll_focas(self, ip):
        """
        STUB: Hier zou de fwlib32.dll aanroep komen voor echte Fanuc data.
        Voor nu genereert dit realistische test-data als de bridge draait.
        """
        return {
            "connected": True,
            "lastUpdated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "executionState": "ACTIVE" if random.random() > 0.1 else "READY",
            "spindleLoad": random.randint(15, 85),
            "programNumber": "O1234",
            "feedOverride": 100,
            "partsCount": 42
        }

    def run(self):
        log("CNC Factory Bridge v1.0 start up...")
        if not self.login():
            log("PocketBase login mislukt!", "ERROR")
            return

        self.fetch_machines()
        
        while True:
            for m in self.machines:
                stats = self.poll_focas(m['focasIp'])
                self.update_machine_stats(m['id'], stats)
            
            # Status update voor Systeem Health Dashboard
            self.report_health()
            time.sleep(1)

    def report_health(self):
        """Meldt aan het Systeem Health dashboard dat deze bridge leeft."""
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "bridge_name": "CNC",
            "status": "ONLINE",
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        }
        try:
            # Patch op een vast ID of filter op naam
            requests.post(f"{PB_URL}/api/collections/system_status/records", json=payload, headers=headers, timeout=1)
        except: pass

if __name__ == "__main__":
    bridge = CNCBridge()
    try:
        bridge.run()
    except KeyboardInterrupt:
        sys.exit(0)
