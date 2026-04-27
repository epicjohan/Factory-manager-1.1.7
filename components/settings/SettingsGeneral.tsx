
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, BellRing, Save, CheckCircle, HelpCircle, CheckSquare, Square, AlertTriangle, Box, Wrench, Shield } from '../../icons';
import { db } from '../../services/storage';
import { NotificationTrigger, User } from '../../types';
import { useTable } from '../../hooks/useTable';
import { KEYS } from '../../services/db/core';
import { useNotifications } from '../../contexts/NotificationContext';

// Feed-definities met visuele configuratie
const NOTIFICATION_FEEDS = [
    {
        id: 'STORINGEN',
        label: 'Storingen',
        icon: '🔴',
        color: 'red',
        triggers: [NotificationTrigger.MACHINE_ERROR, NotificationTrigger.NEW_TICKET],
        description: 'Machine fouten & nieuwe storingsmeldingen'
    },
    {
        id: 'VOORRAAD',
        label: 'Voorraad',
        icon: '📦',
        color: 'orange',
        triggers: [NotificationTrigger.LOW_STOCK],
        description: 'Materiaal dat onder minimum voorraad zakt'
    },
    {
        id: 'ONDERHOUD',
        label: 'Onderhoud',
        icon: '🔧',
        color: 'blue',
        triggers: [NotificationTrigger.MAINTENANCE_DUE, NotificationTrigger.SUPPORT_DONE],
        description: 'Gepland onderhoud & afgeronde support'
    },
    {
        id: 'SETUP',
        label: 'Setup',
        icon: '✅',
        color: 'emerald',
        triggers: [NotificationTrigger.SETUP_REVIEW],
        description: 'Setup gereed voor goedkeuring'
    }
];

// Helper: check of user op een bepaalde feed is ingeschreven
const isSubscribedToFeed = (user: User, feedId: string): boolean => {
    const feed = NOTIFICATION_FEEDS.find(f => f.id === feedId);
    if (!feed || !user.notificationSubscriptions) return false;
    return feed.triggers.every(t => user.notificationSubscriptions!.includes(t));
};

// Helper: toggle feed subscription
const toggleFeedSubscription = (currentSubs: string[], feedId: string): string[] => {
    const feed = NOTIFICATION_FEEDS.find(f => f.id === feedId);
    if (!feed) return currentSubs;

    const allCurrentlySubscribed = feed.triggers.every(t => currentSubs.includes(t));

    if (allCurrentlySubscribed) {
        // Verwijder alle triggers van deze feed
        return currentSubs.filter(t => !feed.triggers.includes(t as NotificationTrigger));
    } else {
        // Voeg alle triggers van deze feed toe (dedup)
        const newSubs = [...currentSubs];
        feed.triggers.forEach(t => {
            if (!newSubs.includes(t)) newSubs.push(t);
        });
        return newSubs;
    }
};

interface UserEditState {
    email: string;
    subscriptions: string[];
    isDirty: boolean;
}

export const SettingsGeneral: React.FC = () => {
    const { data: users } = useTable<User>(KEYS.USERS);
    const { addNotification } = useNotifications();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Lokale edit-state per user (key = user.id)
    const [editState, setEditState] = useState<Record<string, UserEditState>>({});

    // Initialiseer edit-state wanneer users laden
    useEffect(() => {
        if (users.length === 0) return;
        setEditState(prev => {
            const next: Record<string, UserEditState> = {};
            users.forEach(u => {
                if (prev[u.id] && prev[u.id].isDirty) {
                    // Behoud unsaved wijzigingen
                    next[u.id] = prev[u.id];
                } else {
                    next[u.id] = {
                        email: u.email || '',
                        subscriptions: u.notificationSubscriptions || [],
                        isDirty: false
                    };
                }
            });
            return next;
        });
    }, [users]);

    const hasUnsavedChanges = useMemo(() =>
        Object.values(editState).some(s => s.isDirty),
    [editState]);

    const updateUserField = (userId: string, field: 'email', value: string) => {
        setEditState(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value,
                isDirty: true
            }
        }));
    };

    const toggleUserFeed = (userId: string, feedId: string) => {
        setEditState(prev => {
            const current = prev[userId];
            if (!current) return prev;
            return {
                ...prev,
                [userId]: {
                    ...current,
                    subscriptions: toggleFeedSubscription(current.subscriptions, feedId),
                    isDirty: true
                }
            };
        });
    };

    const handleSaveAll = async () => {
        setSaveStatus('saving');

        const dirtyUsers = Object.entries(editState).filter(([_, s]) => s.isDirty);
        let savedCount = 0;

        for (const [userId, state] of dirtyUsers) {
            const user = users.find(u => u.id === userId);
            if (!user) continue;

            await db.updateUser({
                ...user,
                email: state.email.trim(),
                notificationSubscriptions: state.subscriptions
            });
            savedCount++;
        }

        // Reset dirty flags
        setEditState(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                if (next[id].isDirty) {
                    next[id] = { ...next[id], isDirty: false };
                }
            });
            return next;
        });

        setSaveStatus('saved');
        addNotification('SUCCESS', 'Opgeslagen', `Notificatie-instellingen voor ${savedCount} gebruiker(s) bijgewerkt.`);
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* INFO BANNER */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-[2rem] flex gap-4 shadow-sm items-center">
                <HelpCircle className="text-blue-500 shrink-0" size={24} />
                <div>
                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Notificatie Abonnementen</h4>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                        Stel per gebruiker in welke meldingen zij per e-mail ontvangen. Vul eerst een e-mailadres in en activeer de gewenste feeds.
                    </div>
                </div>
            </div>

            {/* FEED LEGENDA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {NOTIFICATION_FEEDS.map(feed => (
                    <div key={feed.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{feed.icon}</span>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{feed.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{feed.description}</p>
                    </div>
                ))}
            </div>

            {/* USER SUBSCRIPTION TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-widest">
                        <Mail size={18} className="text-blue-500" /> Gebruikers & Abonnementen
                    </h3>
                    {hasUnsavedChanges && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle size={12} /> Niet-opgeslagen wijzigingen
                        </span>
                    )}
                </div>

                {users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Shield size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-bold text-sm">Geen gebruikers gevonden</p>
                        <p className="text-xs mt-1">Voeg eerst gebruikers toe via Gebruikers & Rechten.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {/* HEADER ROW */}
                        <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_repeat(4,80px)] gap-4 px-8 py-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div>Gebruiker</div>
                            <div>E-mail</div>
                            {NOTIFICATION_FEEDS.map(f => (
                                <div key={f.id} className="text-center">{f.icon} {f.label}</div>
                            ))}
                        </div>

                        {/* USER ROWS */}
                        {users.map(user => {
                            const state = editState[user.id];
                            if (!state) return null;

                            const hasEmail = state.email.trim().length > 0;
                            const subCount = NOTIFICATION_FEEDS.filter(f => isSubscribedToFeed({ ...user, notificationSubscriptions: state.subscriptions } as User, f.id)).length;

                            return (
                                <div key={user.id} className={`grid grid-cols-1 md:grid-cols-[1fr_1.5fr_repeat(4,80px)] gap-4 px-8 py-4 items-center transition-colors ${state.isDirty ? 'bg-amber-50/50 dark:bg-amber-900/5' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}>
                                    {/* NAME + ROLE */}
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${subCount > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800 dark:text-white">{user.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono uppercase">{user.role || '—'}</div>
                                        </div>
                                    </div>

                                    {/* EMAIL */}
                                    <div>
                                        <input
                                            type="email"
                                            placeholder="naam@bedrijf.nl"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                            value={state.email}
                                            onChange={e => updateUserField(user.id, 'email', e.target.value)}
                                        />
                                    </div>

                                    {/* FEED TOGGLES */}
                                    {NOTIFICATION_FEEDS.map(feed => {
                                        const isActive = isSubscribedToFeed({ ...user, notificationSubscriptions: state.subscriptions } as User, feed.id);
                                        const disabled = !hasEmail;

                                        return (
                                            <div key={feed.id} className="flex justify-center">
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => toggleUserFeed(user.id, feed.id)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                        disabled
                                                            ? 'opacity-20 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                                                            : isActive
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50 shadow-sm'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-500'
                                                    }`}
                                                    title={disabled ? 'Vul eerst een e-mailadres in' : `${feed.label} ${isActive ? 'uitschakelen' : 'inschakelen'}`}
                                                >
                                                    {isActive ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSaveAll}
                    disabled={!hasUnsavedChanges && saveStatus !== 'saved'}
                    className={`px-8 py-4 rounded-2xl shadow-lg font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${
                        saveStatus === 'saved'
                            ? 'bg-emerald-500 text-white'
                            : hasUnsavedChanges
                                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/30 active:scale-95'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
                    <span>{saveStatus === 'saved' ? 'Opgeslagen' : saveStatus === 'saving' ? 'Bezig...' : 'Wijzigingen Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
