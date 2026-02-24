
import React from 'react';
import { UserCircle, LogOut, Sun, Moon, Bell, CloudUpload, FlaskConical, Zap, Wifi, WifiOff } from '../../icons';
import { User } from '../../types';
import { APP_INFO } from '../../services/appInfo';

interface SidebarFooterProps {
    isCollapsed: boolean;
    user: User | null;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    logout: () => void;
    onShowNotifications: () => void;
    unreadNotifications: number;
    connectionStatus: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'DEMO' | 'LIVE';
    isDemo: boolean;
    outboxCount: number;
    onShowOutbox: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
    isCollapsed, user, theme, toggleTheme, logout,
    onShowNotifications, unreadNotifications, connectionStatus, isDemo, outboxCount, onShowOutbox
}) => {

    const getStatusClasses = () => {
        if (isDemo) return 'bg-blue-900/20 text-blue-400 border-blue-800/50';
        if (connectionStatus === 'LIVE') return 'bg-teal-900/20 text-teal-400 border-teal-800/50';
        if (connectionStatus === 'SYNCING') return 'bg-amber-900/20 text-amber-500 border-amber-800/50';
        if (connectionStatus === 'OFFLINE') return 'bg-slate-800 text-slate-500 border-slate-700';
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
    };

    const getStatusLabel = () => {
        if (isDemo) return 'SANDBOX';
        if (connectionStatus === 'LIVE') return 'PULSE LIVE';
        if (connectionStatus === 'SYNCING') return 'SYNCING...';
        if (connectionStatus === 'OFFLINE') return 'OFFLINE';
        return 'ONLINE';
    };

    return (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3">
            <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
                <button onClick={toggleTheme} className="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors shrink-0">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={onShowNotifications} className="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors relative shrink-0">
                    <Bell size={20} />
                    {unreadNotifications > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>}
                </button>
                <button onClick={logout} className={`flex items-center gap-2 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-300 rounded-2xl transition-colors shrink-0`}><LogOut size={20} /></button>
            </div>

            {!isCollapsed && (
                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] overflow-hidden">
                        <UserCircle size={32} className="shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate" title={user?.name}>{user?.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{user?.role}</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-2xl text-[10px] font-mono border transition-all duration-700 ${getStatusClasses()}`}>
                            <span className="flex items-center gap-1.5 truncate">
                                {isDemo ? <FlaskConical size={10} className="shrink-0" /> : connectionStatus === 'LIVE' ? <Zap size={10} className="shrink-0" /> : connectionStatus === 'OFFLINE' ? <WifiOff size={10} className="shrink-0" /> : <Wifi size={10} className="shrink-0" />}
                                <span className="truncate">{getStatusLabel()}</span>
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${connectionStatus === 'OFFLINE' ? 'opacity-50' : 'animate-pulse'}`}></span>
                        </div>
                        {outboxCount > 0 && (
                            <button onClick={onShowOutbox} className="bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500 border border-orange-500/30 rounded-2xl px-2 flex items-center gap-1.5 animate-pulse hover:bg-orange-500/20 dark:hover:bg-orange-500/30 transition-colors shrink-0" title="Items in wachtrij">
                                <CloudUpload size={14} />
                                <span className="text-[10px] font-black">{outboxCount}</span>
                            </button>
                        )}
                    </div>
                    <div className="px-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-0.5">
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">v{APP_INFO.VERSION}</div>
                        <div className="text-[7px] text-slate-400 dark:text-slate-600 font-mono tracking-tighter uppercase leading-none opacity-60">Build: {APP_INFO.BUILD}</div>
                    </div>
                </div>
            )}
        </div>
    );
};
