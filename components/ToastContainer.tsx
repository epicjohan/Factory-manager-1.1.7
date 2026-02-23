
import React, { useEffect, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from '../icons';

export const ToastContainer: React.FC = () => {
    const { notifications } = useNotifications();
    const [toasts, setToasts] = useState<string[]>([]); // Track IDs of visible toasts

    // When a new unread notification comes in, show it as a toast
    useEffect(() => {
        if (notifications.length > 0) {
            const latest = notifications[0];
            // Only show if it's very recent (created in last 2 seconds) to avoid spam on reload
            const isRecent = (new Date().getTime() - new Date(latest.timestamp).getTime()) < 2000;
            
            if (isRecent && !toasts.includes(latest.id)) {
                setToasts(prev => [...prev, latest.id]);
                // Auto dismiss after 5 seconds
                setTimeout(() => {
                    dismissToast(latest.id);
                }, 5000);
            }
        }
    }, [notifications]);

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(tId => tId !== id));
    };

    const visibleToasts = notifications.filter(n => toasts.includes(n.id));

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {visibleToasts.map(toast => (
                <div 
                    key={toast.id}
                    className="pointer-events-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3 animate-in slide-in-from-right-10 fade-in duration-300"
                >
                    <div className="mt-0.5">
                        {toast.type === 'SUCCESS' && <CheckCircle className="text-green-500" size={20} />}
                        {toast.type === 'ERROR' && <AlertCircle className="text-red-500" size={20} />}
                        {toast.type === 'WARNING' && <AlertTriangle className="text-orange-500" size={20} />}
                        {toast.type === 'INFO' && <Info className="text-blue-500" size={20} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{toast.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{toast.message}</p>
                    </div>
                    <button 
                        onClick={() => dismissToast(toast.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
