import React from 'react';
// @ts-expect-error - Vite PWA virtual module interceptor
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from '../icons';

export const PwaUpdatePrompt: React.FC = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('Service Worker Registered');
        },
        onRegisterError(error: any) {
            console.error('Service Worker registration error', error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-500/30 border border-blue-400/50 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-white/20 p-2.5 rounded-xl">
                <RefreshCw className="animate-spin text-white" size={24} />
            </div>
            
            <div className="flex-1 pr-4">
                <p className="font-black text-sm tracking-wide uppercase">Nieuwe Versie Beschikbaar</p>
                <p className="text-xs text-blue-100 font-medium mt-1">Sla openstaande mutaties op en herstart de applicatie.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => updateServiceWorker(true)}
                    className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    Update Nu
                </button>
                
                <button 
                    onClick={() => setNeedRefresh(false)}
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
                    title="Sluiten (Update Negegeren)"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
