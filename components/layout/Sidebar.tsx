
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, ShieldCheck, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Star, Home } from '../../icons';
import { SidebarFooter } from './SidebarFooter';
import { AppModule, UserRole, User } from '../../types';
import { SubModuleConfig } from '../../config/moduleGroups';

const MAX_FAVORITES = 5;

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    brandName: string;
    brandLogo: string | null;
    moduleGroups: any[];
    canAccessModule: (m: AppModule) => boolean;
    user: User | null;
    logout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onShowTeams: () => void;
    onShowNotif: () => void;
    onShowOutbox: () => void;
    onShowProfile: () => void;
    unreadNotifications: number;
    pendingSupport: number;
    pendingQuestions: number;
    connectionStatus: any;
    isDemo: boolean;
    outboxCount: number;
    favoriteModulePaths: string[];
    onToggleFavorite: (path: string) => void;
    defaultPagePath: string;
    onSetDefaultPage: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed, setIsCollapsed, brandName, brandLogo, moduleGroups, canAccessModule,
    user, logout, theme, toggleTheme, onShowTeams, onShowNotif, onShowOutbox, onShowProfile,
    unreadNotifications, pendingSupport, pendingQuestions, connectionStatus, isDemo, outboxCount,
    favoriteModulePaths, onToggleFavorite,
    defaultPagePath, onSetDefaultPage
}) => {
    const location = useLocation();

    // Auto-expand de groep die de actieve route bevat
    const initialOpenGroup = useMemo(() => {
        const groups: Record<string, boolean> = {
            'MONITORING': false,
            'ASSETS': false,
            'TOOLS': false,
            'COMMS': false
        };
        for (const group of moduleGroups) {
            if (group.items.some((item: any) => item.path === location.pathname)) {
                groups[group.id] = true;
                break;
            }
        }
        // Fallback: als geen groep matcht, open Monitoring
        if (!Object.values(groups).some(v => v)) {
            groups['MONITORING'] = true;
        }
        return groups;
    }, []); // Alleen bij mount berekenen

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroup);

    const toggleGroup = (groupId: string) => {
        if (isCollapsed) { setIsCollapsed(false); setOpenGroups(prev => ({ ...prev, [groupId]: true })); }
        else { setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })); }
    };

    // Verzamel alle favoriete items uit de moduleGroups
    const favoriteItems = useMemo(() => {
        const allItems: SubModuleConfig[] = [];
        for (const group of moduleGroups) {
            for (const item of group.items) {
                if (favoriteModulePaths.includes(item.path)) {
                    allItems.push(item);
                }
            }
        }
        // Sorteer in dezelfde volgorde als favoriteModulePaths
        return allItems.sort((a, b) => favoriteModulePaths.indexOf(a.path) - favoriteModulePaths.indexOf(b.path));
    }, [moduleGroups, favoriteModulePaths]);

    const isFavorite = (path: string) => favoriteModulePaths.includes(path);
    const canAddFavorite = favoriteModulePaths.length < MAX_FAVORITES;

    const isActive = (path: string) => location.pathname === path ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800";
    const getLinkClasses = (path: string) => `flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-sm font-medium ${isActive(path)}`;

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-r border-slate-200 dark:border-transparent flex flex-col shadow-xl z-20 transition-all duration-300 relative flex-shrink-0`}>
            {/* HEADER */}
            <div className={`p-5 border-b border-slate-200 dark:border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        {brandLogo && <img src={brandLogo} alt="Logo" className="w-8 h-8 object-contain shrink-0" />}
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 dark:from-blue-400 to-teal-500 dark:to-teal-400 bg-clip-text text-transparent truncate max-w-[180px]" title={brandName}>{brandName}</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Production OS</p>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-10 h-10 rounded-[2rem] bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shrink-0">
                        {brandLogo ? <img src={brandLogo} className="w-6 h-6 object-contain" /> : brandName.charAt(0)}
                    </div>
                )}
            </div>

            {/* COLLAPSE TOGGLE */}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-20 bg-blue-600 text-white rounded-full p-1.5 shadow-md hover:bg-blue-700 transition-colors z-30 hidden lg:flex border-2 border-white dark:border-slate-800">
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* NAVIGATION */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {/* HOME / DEFAULT PAGE LINK */}
                <Link to={defaultPagePath} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3 py-2' : 'gap-3 px-3 py-2.5'} rounded-2xl mb-2 transition-all ${location.pathname === defaultPagePath ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'}`}>
                    <Home size={20} className="shrink-0" />
                    {!isCollapsed && <span className="text-sm font-bold">Startpagina</span>}
                </Link>

                {/* FAVORIETEN SECTIE — alleen zichtbaar als sidebar is uitgeklapt */}
                {!isCollapsed && (
                    <div className="mb-3">
                        <div className="px-3 py-1.5 flex items-center gap-2">
                            <Star size={13} className="text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">Favorieten</span>
                        </div>
                        {favoriteItems.length > 0 ? (
                            <div className="space-y-0.5 ml-1 pl-2.5 border-l-2 border-amber-400/30 dark:border-amber-500/20">
                                {favoriteItems.map((item: any) => {
                                    const badgeCount = item.badgeKey === 'support' ? pendingSupport : item.badgeKey === 'questions' ? pendingQuestions : 0;
                                    return (
                                        <div key={`fav-${item.path}`} className="group flex items-center">
                                            <Link to={item.path} className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-2xl transition-all text-sm font-medium ${isActive(item.path)}`}>
                                                <div className="relative shrink-0">
                                                    <item.icon size={16} className="shrink-0" />
                                                    {badgeCount > 0 && (<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{badgeCount}</span>)}
                                                </div>
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                            {/* 🏠 Set as default page */}
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSetDefaultPage(item.path); }}
                                                className={`p-1 rounded-lg transition-all shrink-0 ${
                                                    defaultPagePath === item.path
                                                        ? 'text-blue-500 opacity-100'
                                                        : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-blue-500 hover:bg-blue-500/10'
                                                }`}
                                                title={defaultPagePath === item.path ? 'Dit is je startpagina' : 'Instellen als startpagina'}
                                            >
                                                <Home size={12} className={defaultPagePath === item.path ? 'fill-blue-500' : ''} />
                                            </button>
                                            {/* ⭐ Unpin */}
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.path); }}
                                                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
                                                title="Verwijder uit favorieten"
                                            >
                                                <Star size={12} className="fill-amber-500" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-3 py-2 italic">
                                Klik ⭐ bij een item om het hier te pinnen
                            </p>
                        )}
                    </div>
                )}

                {/* MODULE GROEPEN */}
                {moduleGroups.map(group => {
                    const isOpen = openGroups[group.id];
                    return (
                        <div key={group.id} className="mb-1">
                            <button onClick={() => toggleGroup(group.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-colors ${isCollapsed ? 'justify-center' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}>
                                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} ${isOpen && !isCollapsed ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    <group.icon size={20} className="shrink-0" />
                                    {!isCollapsed && (
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            {group.title}
                                            <span className="ml-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 normal-case tracking-normal">({group.items.length})</span>
                                        </span>
                                    )}
                                </div>
                                {!isCollapsed && (<div>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>)}
                            </button>
                            {(!isCollapsed && isOpen) && (
                                <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200/80 dark:border-slate-700/50 space-y-0.5">
                                    {group.items.map((item: any) => {
                                        const badgeCount = item.badgeKey === 'support' ? pendingSupport : item.badgeKey === 'questions' ? pendingQuestions : 0;
                                        const pinned = isFavorite(item.path);
                                        return (
                                            <div key={item.path} className="group flex items-center">
                                                <Link to={item.path} className={`flex-1 ${getLinkClasses(item.path)}`}>
                                                    <div className="relative shrink-0">
                                                        <item.icon size={18} className="shrink-0" />
                                                        {badgeCount > 0 && (<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{badgeCount}</span>)}
                                                    </div>
                                                    <span className="truncate">{item.label}</span>
                                                </Link>
                                                {/* ⭐ PIN TOGGLE */}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.path); }}
                                                    className={`p-1 rounded-lg transition-all shrink-0 ${
                                                        pinned
                                                            ? 'text-amber-500 opacity-100 hover:text-amber-400 hover:bg-amber-500/10'
                                                            : canAddFavorite
                                                                ? 'text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-500/10'
                                                                : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-50 cursor-not-allowed'
                                                    }`}
                                                    title={pinned ? 'Verwijder uit favorieten' : canAddFavorite ? 'Toevoegen aan favorieten' : `Maximum ${MAX_FAVORITES} favorieten bereikt`}
                                                    disabled={!pinned && !canAddFavorite}
                                                >
                                                    <Star size={13} className={pinned ? 'fill-amber-500' : ''} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* EXTRA ACTIONS */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                    {canAccessModule(AppModule.QUESTIONS) && (
                        <button onClick={onShowTeams} className={`w-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-[#464EB8] dark:hover:bg-[#3b429c] dark:text-white rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-purple-500/20 flex items-center justify-center transition-all ${isCollapsed ? 'p-3' : 'px-4 py-3 gap-3'}`}>
                            <MessageSquare size={20} className="shrink-0" />
                            {!isCollapsed && <span className="font-bold text-sm truncate">Vraag aan Manager</span>}
                        </button>
                    )}
                    {user?.role === UserRole.ADMIN && (
                        <Link to="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${location.pathname.startsWith('/admin') ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-100 hover:border-blue-200 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'} ${isCollapsed ? 'justify-center border-transparent dark:border-transparent' : ''}`}>
                            <ShieldCheck size={22} className="shrink-0" />
                            {!isCollapsed && <span className="text-sm font-bold truncate">Systeem Beheer</span>}
                        </Link>
                    )}
                </div>
            </nav>

            <SidebarFooter
                isCollapsed={isCollapsed}
                user={user}
                theme={theme}
                toggleTheme={toggleTheme}
                logout={logout}
                onShowNotifications={onShowNotif}
                unreadNotifications={unreadNotifications}
                connectionStatus={connectionStatus}
                isDemo={isDemo}
                outboxCount={outboxCount}
                onShowOutbox={onShowOutbox}
                onShowProfile={onShowProfile}
            />
        </aside>
    );
};
