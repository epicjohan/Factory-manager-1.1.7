import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types';

interface NotificationContextType {
    notifications: AppNotification[];
    addNotification: (type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', title: string, message: string, trigger?: string) => void;
    markAsRead: (id: string) => void;
    clearAll: () => void;
    pushPermission: NotificationPermission;
    requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
        try {
            return (window && 'Notification' in window) ? window.Notification.permission : 'denied';
        } catch (e) {
            return 'denied';
        }
    });

    useEffect(() => {
        const handleDbNotification = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                const { type, title, message, trigger } = customEvent.detail;
                addNotification(type, title, message, trigger);
            }
        };

        const handleQuotaError = () => {
            addNotification(
                'ERROR', 
                'Opslaggeheugen Vol', 
                'De browser kan geen nieuwe gegevens meer opslaan. Synchroniseer uw wijzigingen of wis de wachtrij in de Systeem Monitor.',
                'quota_error'
            );
        };

        window.addEventListener('app-notification', handleDbNotification);
        window.addEventListener('storage-quota-exceeded', handleQuotaError);
        
        return () => {
            window.removeEventListener('app-notification', handleDbNotification);
            window.removeEventListener('storage-quota-exceeded', handleQuotaError);
        };
    }, [pushPermission]);

    const addNotification = (type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', title: string, message: string, trigger?: string) => {
        const newNotif: AppNotification = {
            id: Date.now().toString() + Math.random().toString(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };

        setNotifications(prev => [newNotif, ...prev]);

        if (pushPermission === 'granted') {
            try {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    const NativeNotification = (window as any).Notification;
                    if (NativeNotification && typeof NativeNotification === 'function') {
                        new NativeNotification(title, {
                            body: message,
                            tag: trigger || 'general'
                        });
                    }
                }
            } catch (e) {
                console.warn("Native Notification API disabled or restricted in this browser environment.");
            }
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const requestPushPermission = async () => {
        if (!window || !('Notification' in window)) {
            alert("Deze browser ondersteunt geen native notificaties.");
            return;
        }
        try {
            const result = await window.Notification.requestPermission();
            setPushPermission(result);
        } catch (e) {
            console.error("Permission request failed", e);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, clearAll, pushPermission, requestPushPermission }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};