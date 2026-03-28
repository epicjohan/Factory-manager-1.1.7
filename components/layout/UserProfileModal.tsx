import React, { useState } from 'react';
import { User } from '../../types';
import { X, Moon, Sun, Settings } from '../../icons';
import { db } from '../../services/storage';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
    // Only local loading state for immediate click feedback
    const [saving, setSaving] = useState(false);

    if (!isOpen || !user || user.id === 'super-admin-ghost') return null;

    const handleUpdate = async (updates: Partial<User>) => {
        setSaving(true);
        try {
            await db.updateUser({ ...user, ...updates });
        } catch (e) {
            console.error('Failed to update user preferences', e);
        } finally {
            setSaving(false);
        }
    };

    const isDark = user.theme === 'dark';
    const darkStyle = user.preferredDarkStyle || 'OLED';
    const lightStyle = user.preferredLightStyle || 'STANDARD';

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative border-4 border-white/50 dark:border-slate-800">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Mijn Voorkeuren</h2>
                        <p className="text-xs font-bold font-mono tracking-widest text-slate-500">{user.name}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Dark Mode Flavors */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Moon size={16} className="text-blue-500" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Dark Mode Stijl</h3>
                        </div>
                        <div className="flex gap-2">
                            {(['OLED', 'CLASSIC', 'MIDNIGHT'] as const).map(style => (
                                <button
                                    key={style}
                                    onClick={() => handleUpdate({ preferredDarkStyle: style })}
                                    disabled={saving}
                                    className={`flex-1 py-3 px-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                                        darkStyle === style 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Light Mode Flavors */}
                    <div className="opacity-90">
                        <div className="flex items-center gap-2 mb-3">
                            <Sun size={16} className="text-amber-500" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Light Mode Stijl</h3>
                        </div>
                        <div className="flex gap-2">
                            {(['STANDARD', 'SOFT', 'COOL'] as const).map(style => (
                                <button
                                    key={style}
                                    onClick={() => handleUpdate({ preferredLightStyle: style })}
                                    disabled={saving}
                                    className={`flex-1 py-3 px-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                                        lightStyle === style 
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105' 
                                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {style === 'STANDARD' ? 'DEFAULT' : style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hoofdthema Schakelaar */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">Activeer Thema</h3>
                            <p className="text-[10px] font-bold text-slate-500">Wat is momenteel zichtbaar?</p>
                        </div>
                        <button 
                            onClick={() => handleUpdate({ theme: isDark ? 'light' : 'dark' })}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                                isDark ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                        >
                            {isDark ? <Moon size={16} /> : <Sun size={16} />}
                            {isDark ? 'Dark Actief' : 'Light Actief'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
