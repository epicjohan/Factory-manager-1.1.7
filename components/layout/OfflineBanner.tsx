
import React from 'react';
import { AlertTriangle } from '../../icons';

interface OfflineBannerProps {
    show: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ show }) => {
    // In development (npm run dev) de banner nooit tonen — voorkomt afleiding tijdens bouwen.
    // In productie builds werkt de banner normaal.
    if (!show || (import.meta as any).env?.DEV) return null;

    return (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-2xl sticky top-0 z-50 animate-in slide-in-from-top duration-500 border-b-2 border-red-800">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-2xl animate-pulse">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h4 className="font-black uppercase tracking-widest text-sm leading-none">Status: KRITIEK OFFLINE</h4>
                    <p className="text-[10px] opacity-90 mt-1 font-bold">Het systeem is langer dan 60 seconden niet verbonden met de server.</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase bg-black/20 px-3 py-1 rounded-full border border-white/20">Data wordt lokaal gebufferd</p>
            </div>
        </div>
    );
};
