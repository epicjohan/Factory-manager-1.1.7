
import React, { useState, useEffect } from 'react';
import { Mail, BellRing, CheckSquare, Square, Save, CheckCircle, HelpCircle } from '../../icons';
import { db } from '../../services/storage';
import { NotificationTrigger } from '../../types';

export const SettingsGeneral: React.FC = () => {
    const [emails, setEmails] = useState<string[]>(['', '']);
    const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

    useEffect(() => {
        const load = async () => {
            const dbEmails = await db.getNotificationEmails();
            setEmails(dbEmails.length >= 2 ? dbEmails : [dbEmails[0] || '', '']);
            setTriggers(await db.getNotificationTriggers());
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaveStatus('saving');
        // Get fresh system settings to ensure we don't overwrite other fields (although emails are handled via specific helper usually, checking service...)
        // service setNotificationEmails updates system settings internally.
        await db.setNotificationEmails(emails.filter(e => e.trim() !== ''));
        await db.setNotificationTriggers(triggers);

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-[2rem] flex gap-4 shadow-sm items-center">
                <HelpCircle className="text-blue-500 shrink-0" size={24} />
                <div>
                    <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Meldingen beheren</h4>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                        Bepaal wie systeem-meldingen ontvangt en bij welke events.
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-widest">
                    <Mail size={18} className="text-blue-500" /> E-mail Ontvangers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emails.map((email, idx) => (
                        <input
                            key={idx}
                            type="email"
                            placeholder="beheer@bedrijf.nl"
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                            value={email}
                            onChange={e => { const n = [...emails]; n[idx] = e.target.value; setEmails(n); }}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-widest">
                    <BellRing size={18} className="text-orange-500" /> Events
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.values(NotificationTrigger).map(t => (
                        <button
                            key={t}
                            onClick={() => { if (triggers.includes(t)) setTriggers(triggers.filter(x => x !== t)); else setTriggers([...triggers, t]); }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${triggers.includes(t) ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 shadow-sm' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                            {triggers.includes(t) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                            <div className="text-xs font-black uppercase tracking-widest">{t.replace(/_/g, ' ')}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className={`px-8 py-4 rounded-2xl shadow-lg font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/30'}`}
                >
                    {saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
                    <span>{saveStatus === 'saved' ? 'Opgeslagen' : 'Configuratie Opslaan'}</span>
                </button>
            </div>
        </div>
    );
};
