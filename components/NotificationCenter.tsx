
import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { X, Check, Trash2, Bell, AlertTriangle, CheckCircle, Info, BellRing } from '../icons';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { notifications, markAsRead, clearAll, pushPermission, requestPushPermission } = useNotifications();

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch(type) {
            case 'ERROR': return <AlertTriangle className="text-red-500" size={20} />;
            case 'WARNING': return <AlertTriangle className="text-orange-500" size={20} />;
            case 'SUCCESS': return <CheckCircle className="text-green-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    const getBgColor = (type: string, read: boolean) => {
        if (read) return 'bg-white dark:bg-slate-800 opacity-60';
        switch(type) {
            case 'ERROR': return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
            case 'WARNING': return 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500';
            case 'SUCCESS': return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500';
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={onClose}></div>
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Bell size={20} /> Notificaties
                        {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Push Permission Request */}
                {pushPermission === 'default' && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-start gap-3">
                            <BellRing className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
                            <div>
                                <p className="text-xs text-indigo-900 dark:text-indigo-200 font-bold mb-1">Push meldingen inschakelen?</p>
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mb-2">Ontvang alerts ook als de app niet open staat.</p>
                                <button onClick={requestPushPermission} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-bold transition-colors">
                                    Inschakelen
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Bell size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Geen meldingen.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all ${getBgColor(notif.type, notif.read)}`}
                                onClick={() => markAsRead(notif.id)}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`text-sm font-bold ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>{notif.title}</h4>
                                            {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                                        <div className="text-[10px] text-slate-400 mt-2 text-right">
                                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(notif.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <button 
                            onClick={clearAll}
                            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 text-sm font-bold transition-colors"
                        >
                            <Trash2 size={16} /> Alles Wissen
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
