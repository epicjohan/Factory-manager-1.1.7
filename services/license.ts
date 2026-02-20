
import { db } from './storage';
import { SystemSettings, LicenseStatus } from '../types';

const LICENSE_API_URL = 'https://api.factory-manager.nl/activate'; // Placeholder for your vendor server

export const LicenseService = {
    
    /**
     * Checks the local license validity (offline check)
     */
    checkLicense: async (): Promise<LicenseStatus> => {
        // --- FIX: getSystemSettings is async and must be awaited ---
        const settings = await db.getSystemSettings();
        
        if (!settings.licenseKey || !settings.licenseExpiry) {
            // Default to trial if no key, or invalid if key exists but broken
            return settings.licenseKey ? 'INVALID' : 'TRIAL';
        }

        const now = new Date();
        const expiry = new Date(settings.licenseExpiry);

        if (now > expiry) {
            return 'EXPIRED';
        }

        // In a real app, you would verify the `settings.licenseSignature` here
        // using a public key to ensure the expiry date wasn't manually edited in JSON.
        // For this MVP/Demo, we trust the storage.
        
        return 'ACTIVE';
    },

    /**
     * Simulates contacting the Vendor Server to activate a key
     * In production, this would be a real fetch() call.
     */
    activateLicense: async (key: string, holder: string): Promise<{ success: boolean; expiry?: string; signature?: string; message: string }> => {
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // MOCK SERVER LOGIC
                // Valid keys start with "FM-"
                if (key.startsWith("FM-")) {
                    
                    // Simulate 1 year validity
                    const expiryDate = new Date();
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    
                    resolve({
                        success: true,
                        expiry: expiryDate.toISOString(),
                        signature: "mock_jwt_signature_xyz123", // In real app, this is signed by server
                        message: "Licentie succesvol geactiveerd."
                    });
                } else {
                    resolve({
                        success: false,
                        message: "Ongeldige licentiesleutel. Controleer uw invoer."
                    });
                }
            }, 1500); // Simulate network delay
        });
    },

    /**
     * Helper to get days remaining
     */
    getDaysRemaining: async (): Promise<number> => {
        // --- FIX: getSystemSettings is async and must be awaited ---
        const settings = await db.getSystemSettings();
        if (!settings.licenseExpiry) return 0;
        
        const now = new Date().getTime();
        const expiry = new Date(settings.licenseExpiry).getTime();
        const diff = expiry - now;
        
        return Math.ceil(diff / (1000 * 3600 * 24));
    }
};
