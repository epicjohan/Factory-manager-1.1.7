import { useState, useEffect, useCallback, useRef } from 'react';

// Veilige fallback voor dev-omgeving (buiten build-context)
const CURRENT_BUILD: number = typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : 0;

const STORAGE_KEY = 'fm_last_build';

export interface AppUpdateState {
  /** Er is een nieuwe SW-versie klaar om te activeren */
  swUpdateReady: boolean;
  /** Een nieuwere build is gedetecteerd via het build-nummer */
  buildUpdateReady: boolean;
  /** Gecombineerd: toont de banner als een van de twee true is */
  updateAvailable: boolean;
  currentBuild: number;
  detectedBuild: number | null;
  /** Herlaad de pagina en activeer de nieuwe versie */
  applyUpdate: () => void;
  /** Sluit de banner zonder te herladen */
  dismiss: () => void;
}

export function useAppUpdate(): AppUpdateState {
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [buildUpdateReady, setBuildUpdateReady] = useState(false);
  const [detectedBuild, setDetectedBuild] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // --- Stap 1: Sla het huidige build-nummer op bij eerste load ---
  useEffect(() => {
    const lastBuild = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

    if (CURRENT_BUILD > 0) {
      if (lastBuild > 0 && CURRENT_BUILD > lastBuild) {
        // Nieuwere build gedetecteerd vs vorige sessie
        setDetectedBuild(CURRENT_BUILD);
        setBuildUpdateReady(false); // Al bijgewerkt, geen banner nodig
      }
      // Sla de huidige build op als baseline
      localStorage.setItem(STORAGE_KEY, String(CURRENT_BUILD));
    }
  }, []);

  // --- Stap 2: Luister naar SW update events ---
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWUpdate = (reg: ServiceWorkerRegistration) => {
      swRegistrationRef.current = reg;
      if (reg.waiting) {
        setSwUpdateReady(true);
        setDismissed(false);
      }
    };

    navigator.serviceWorker.ready.then(reg => {
      // Check of er al een wachtende SW is
      if (reg.waiting) {
        handleSWUpdate(reg);
      }

      // Luister naar nieuwe installaties
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleSWUpdate(reg);
          }
        });
      });
    }).catch(() => {});

    // Periodieke SW update check (elke 5 minuten)
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // --- Stap 3: Check op tab-focus (Optie 2) ---
  useEffect(() => {
    const handleFocus = () => {
      if (!('serviceWorker' in navigator)) return;
      // Trigger SW update check bij terugkeer naar tab
      navigator.serviceWorker.ready.then(reg => {
        reg.update().then(() => {
          if (reg.waiting) {
            swRegistrationRef.current = reg;
            setSwUpdateReady(true);
            setDismissed(false);
          }
        }).catch(() => {});
      }).catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // --- Actie: activeer update en herlaad ---
  const applyUpdate = useCallback(() => {
    const reg = swRegistrationRef.current;
    if (reg?.waiting) {
      // Stuur skipWaiting bericht naar de wachtende SW
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Herlaad zodra de nieuwe SW het overneemt
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    } else {
      // Geen wachtende SW: gewoon herladen
      window.location.reload();
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    swUpdateReady,
    buildUpdateReady,
    updateAvailable: !dismissed && (swUpdateReady || buildUpdateReady),
    currentBuild: CURRENT_BUILD,
    detectedBuild,
    applyUpdate,
    dismiss,
  };
}
