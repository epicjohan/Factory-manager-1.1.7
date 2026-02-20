
import time
import requests
import json
import sys
import traceback
from datetime import datetime, timezone, timedelta

# =================================================================
# CONFIGURATIE - JOUW FABRIEKSSPECIFIEKE INSTELLINGEN
# =================================================================
PB_URL = "http://10.1.111.26:8090"  # IP van de PocketBase Server
ADMIN_EMAIL = "admin@admin.com"      # Admin account
ADMIN_PASS = "1234567890"            # Admin wachtwoord

# IPs gebaseerd op jouw laatste logs
IP_CONS = "10.1.112.22" # IP van Bruto Verbruiksmeter (HomeWizard P1)
IP_PROD = "10.1.112.37" # IP van Bruto Solar/Productiemeter (HomeWizard P1)
POLL_INT = 1.0           # Interval in seconden (1Hz)

# PocketBase Record ID voor real-time data
LIVE_RECORD_ID = "livenowrecord01"

# --- DEBUG SETTINGS ---
DEBUG_MODE = True 

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    prefix = f"[{timestamp}] [{level.upper():<7}]"
    print(f"{prefix} {msg}")
    sys.stdout.flush() 

class PBClient:
    def __init__(self, url, email, password):
        self.url = url.rstrip('/')
        self.email = email
        self.password = password
        self.token = None
        self.c_factor = 1.0
        self.p_factor = 1.0

    def login(self):
        log(f"PocketBase login op {self.url}...", "AUTH")
        try:
            res = requests.post(
                f"{self.url}/api/collections/_superusers/auth-with-password",
                json={"identity": self.email, "password": self.password},
                timeout=5
            )
            if res.ok:
                self.token = res.json().get("token")
                log("Authenticatie OK.", "AUTH")
                self.refresh_settings()
                return True
            else:
                log(f"Login geweigerd: {res.status_code}", "ERROR")
                return False
        except Exception as e:
            log(f"Server onbereikbaar: {str(e)}", "ERROR")
            return False

    def refresh_settings(self):
        if not self.token: return
        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.url}/api/collections/energy_settings/records?sort=-updated&perPage=1"
        try:
            res = requests.get(url, headers=headers, timeout=5)
            if res.ok:
                items = res.json().get("items", [])
                if items:
                    settings = items[0]
                    self.c_factor = settings.get("consumptionFactor", 1.0)
                    self.p_factor = settings.get("productionFactor", 1.0)
                    log(f"Instellingen geladen: Verbruik x{self.c_factor} | Solar x{self.p_factor}", "CONFIG")
                else:
                    log("Geen settings gevonden, gebruik factor 1.0", "WARN")
            else:
                log(f"Kon instellingen niet ophalen: {res.status_code}", "WARN")
        except Exception as e:
            log(f"Fout bij ophalen instellingen: {str(e)}", "ERROR")

    def push_live(self, payload):
        if not self.token: return
        headers = {"Authorization": f"Bearer {self.token}"}
        url_patch = f"{self.url}/api/collections/energy_live/records/{LIVE_RECORD_ID}"
        try:
            res = requests.patch(url_patch, json=payload, headers=headers, timeout=2)
            if res.status_code == 404:
                requests.post(f"{self.url}/api/collections/energy_live/records", 
                             json={**payload, "id": LIVE_RECORD_ID}, headers=headers, timeout=2)
            elif res.status_code == 401:
                if self.login(): self.push_live(payload)
        except Exception: pass

    def push_historical(self, payload):
        """Voegt een kwartier-record toe aan energy_historical."""
        if not self.token: return
        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.url}/api/collections/energy_historical/records"
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=5)
            if res.ok:
                log(f"Kwartier opgeslagen: {payload['consumption_wh']:.0f}Wh verbruik.", "HISTORY")
            else:
                log(f"Fout bij opslaan historie: {res.status_code}", "ERROR")
        except Exception as e:
            log(f"Fout bij pushen historie: {str(e)}", "ERROR")

def get_meter_data(ip):
    url = f"http://{ip}/api/v1/data"
    try:
        res = requests.get(url, timeout=2.0)
        if res.ok: return res.json()
        return None
    except Exception: return None

def main():
    print("\n" + "="*70)
    print("   ENERGY MASTER BRIDGE - INDUSTRIAL VERSION 2.0")
    print("   FEATURE: 15-Minute Aggregation & P1 Sync")
    print("="*70 + "\n")

    pb = PBClient(PB_URL, ADMIN_EMAIL, ADMIN_PASS)
    while not pb.login():
        time.sleep(10)

    # Aggregatie state
    current_interval_start = None
    start_kwh_cons = None
    start_kwh_prod = None
    samples_cons = []
    samples_prod = []
    peak_w = 0

    log(f"🚀 Bridge Actief. Polling: {IP_CONS} & {IP_PROD}", "INIT")
    
    while True:
        start_loop = time.time()
        now = datetime.now()
        
        # 1. Bepaal kwartier boundary (0, 15, 30, 45)
        minute = now.minute
        interval_minute = (minute // 15) * 15
        interval_timestamp = now.replace(minute=interval_minute, second=0, microsecond=0)

        # 2. Lees meters
        c_data = get_meter_data(IP_CONS)
        p_data = get_meter_data(IP_PROD)
        
        if c_data and p_data:
            # Factoren toepassen (Consumption & Production)
            curr_w_cons = c_data.get('active_power_w', 0) * pb.c_factor
            curr_w_prod = p_data.get('active_power_w', 0) * pb.p_factor
            curr_kwh_cons = c_data.get('total_power_import_kwh', 0) * pb.c_factor
            curr_kwh_prod = p_data.get('total_power_import_kwh', 0) * pb.p_factor

            # Update Live Stand
            pb.push_live({
                "active_power_w": curr_w_cons,
                "production_w": curr_w_prod,
                "net_power_w": curr_w_cons - curr_w_prod,
                "total_kwh": curr_kwh_cons,
                "total_production_kwh": curr_kwh_prod,
                "l1_amp": c_data.get('active_current_l1_a', 0) * pb.c_factor,
                "l2_amp": c_data.get('active_current_l2_a', 0) * pb.c_factor,
                "l3_amp": c_data.get('active_current_l3_a', 0) * pb.c_factor,
                "updated": now.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            })

            # 3. Kwartier Aggregatie Logica
            if current_interval_start is None:
                # Eerste run: Initialiseer bucket
                current_interval_start = interval_timestamp
                start_kwh_cons = curr_kwh_cons
                start_kwh_prod = curr_kwh_prod
                log(f"Start nieuw kwartier bucket: {current_interval_start.strftime('%H:%M')}", "SYNC")
            
            elif interval_timestamp > current_interval_start:
                # Kwartier voorbij! Bereken en push.
                delta_cons_wh = (curr_kwh_cons - start_kwh_cons) * 1000
                delta_prod_wh = (curr_kwh_prod - start_kwh_prod) * 1000
                avg_cons_w = sum(samples_cons) / len(samples_cons) if samples_cons else 0
                avg_prod_w = sum(samples_prod) / len(samples_prod) if samples_prod else 0

                pb.push_historical({
                    "timestamp": current_interval_start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "consumption_wh": max(0, delta_cons_wh),
                    "production_wh": max(0, delta_prod_wh),
                    "avg_consumption_w": avg_cons_w,
                    "avg_production_w": avg_prod_w,
                    "peak_w": peak_w
                })

                # Reset voor nieuw kwartier
                current_interval_start = interval_timestamp
                start_kwh_cons = curr_kwh_cons
                start_kwh_prod = curr_kwh_prod
                samples_cons = []
                samples_prod = []
                peak_w = 0
                pb.refresh_settings() # Ververs instellingen bij elk nieuw kwartier
            
            # Verzamel data voor lopend kwartier
            samples_cons.append(curr_w_cons)
            samples_prod.append(curr_w_prod)
            if curr_w_cons > peak_w: peak_w = curr_w_cons

        # Sleep tot volgende seconde
        elapsed = time.time() - start_loop
        time.sleep(max(0.1, POLL_INT - elapsed))

if __name__ == "__main__":
    try: main()
    except KeyboardInterrupt: sys.exit(0)
    except Exception:
        traceback.print_exc()
        time.sleep(10)
