
import { db } from './storage';
import { SystemSettings, LicenseStatus } from '../types';

const LICENSE_API_URL = 'https://api.factory-manager.nl/activate';

// SECURITY S-05: Publieke sleutel voor client-side HMAC verificatie.
// De vendor-server ondertekent de response met de bijbehorende private sleutel.
// Stel `VITE_LICENSE_HMAC_SECRET` in via .env.local (staat NIET in Git).
const LICENSE_HMAC_SECRET = (import.meta as any).env?.VITE_LICENSE_HMAC_SECRET ?? '';

// TESTFASE: Zet VITE_BYPASS_LICENSE=true in .env.local om de licentiecheck
// volledig over te slaan. Verwijder of zet op 'false' vóór productie go-live.
const BYPASS_LICENSE = (import.meta as any).env?.VITE_BYPASS_LICENSE === 'true';

/**
 * Verifieer een HMAC-SHA256 signature client-side.
 * Voorkomt dat een gebruiker de `licenseExpiry` datum handmatig aanpast in IndexedDB.
 */
const verifyHmacSignature = async (payload: string, signature: string, secret: string): Promise<boolean> => {
    try {
        if (!secret || !signature) return false;
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        // Signature van server is Base64-encoded
        const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    } catch {
        return false;
    }
};

export const LicenseService = {
    
    /**
     * Controleert de lokale licentiestatus (offline check).
     * Inclusief client-side signature verificatie indien een HMAC secret beschikbaar is.
     */
    checkLicense: async (): Promise<LicenseStatus> => {
        // TESTFASE BYPASS: Sla alle licentiechecks over indien geconfigureerd.
        // Stel in via .env.local: VITE_BYPASS_LICENSE=true
        if (BYPASS_LICENSE) {
            console.info('[LicenseService] Licentiecheck overgeslagen (VITE_BYPASS_LICENSE=true).');
            return 'ACTIVE';
        }

        const settings = await db.getSystemSettings();
        
        if (!settings.licenseKey || !settings.licenseExpiry) {
            return settings.licenseKey ? 'INVALID' : 'TRIAL';
        }

        // SECURITY S-05: Verifieer de signature zodat een handmatig aangepaste
        // licenseExpiry als INVALID wordt gedetecteerd.
        if (LICENSE_HMAC_SECRET && settings.licenseKey) {
            const payload = `${settings.licenseKey}:${settings.licenseExpiry}`;
            const isValid = await verifyHmacSignature(
                payload,
                (settings as any).licenseSignature ?? '',
                LICENSE_HMAC_SECRET
            );
            if (!isValid) {
                console.warn('[LicenseService] Signature verificatie mislukt — licentie als INVALID beschouwd.');
                return 'INVALID';
            }
        }

        const now = new Date();
        const expiry = new Date(settings.licenseExpiry);
        if (now > expiry) return 'EXPIRED';
        
        return 'ACTIVE';
    },

    /**
     * Activeert een licentiesleutel via de vendor-server.
     * SECURITY S-05: Alle key-validatie vindt nu server-side plaats.
     * De server geeft een HMAC-signed response terug die client-side geverifieerd wordt.
     */
    activateLicense: async (key: string, holder: string): Promise<{ success: boolean; expiry?: string; signature?: string; message: string }> => {
        try {
            const res = await fetch(LICENSE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: key.trim(), holder: holder.trim() }),
                signal: AbortSignal.timeout(15000) // 15s timeout
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return {
                    success: false,
                    message: err.message || `Activatie mislukt (HTTP ${res.status}). Controleer uw sleutel of neem contact op met support.`
                };
            }

            const data = await res.json();

            // Verifieer de server-signature vóór opslaan
            if (LICENSE_HMAC_SECRET && data.signature && data.expiry) {
                const payload = `${key.trim()}:${data.expiry}`;
                const isValid = await verifyHmacSignature(payload, data.signature, LICENSE_HMAC_SECRET);
                if (!isValid) {
                    return { success: false, message: 'Serverrespons kon niet worden geverifieerd. Neem contact op met support.' };
                }
            }

            return {
                success: true,
                expiry: data.expiry,
                signature: data.signature,
                message: data.message || 'Licentie succesvol geactiveerd.'
            };

        } catch (e: any) {
            // Onderscheid tussen timeout en andere netwerkfouten
            if (e.name === 'TimeoutError' || e.name === 'AbortError') {
                return { success: false, message: 'Verbinding met licentieserver timed out. Probeer het later opnieuw.' };
            }
            return { success: false, message: `Netwerkfout: ${e.message}` };
        }
    },

    /**
     * Geeft het aantal resterende licentiedagen terug.
     */
    getDaysRemaining: async (): Promise<number> => {
        const settings = await db.getSystemSettings();
        if (!settings.licenseExpiry) return 0;
        
        const now = new Date().getTime();
        const expiry = new Date(settings.licenseExpiry).getTime();
        const diff = expiry - now;
        
        return Math.ceil(diff / (1000 * 3600 * 24));
    }
};
