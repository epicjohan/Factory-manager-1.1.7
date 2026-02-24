
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Link, Mail, Lock, RefreshCw, UserCheck, Network, AlertCircle, CloudDownload, CloudUpload, MessageSquare, HardDrive, Info, Server } from '../../icons';
import { db } from '../../services/storage';
import { SyncService } from '../../services/sync';
import { KEYS } from '../../services/db/core';
import { useTable } from '../../hooks/useTable';

export const SettingsIntegrations: React.FC = () => {
    const [serverUrl, setServerUrl] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [teamsUrl, setTeamsUrl] = useState('');
    const [ncPath, setNcPath] = useState('');

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
    const [syncBusy, setSyncBusy] = useState(false);
    const [lastSyncError, setLastSyncError] = useState<string | null>(null);
    const [saveMsg, setSaveMsg] = useState('');
    const [isUrlWarningVisible, setIsUrlWarningVisible] = useState(false);

    const { data: systemConfig } = useTable<any>(KEYS.SYSTEM_CONFIG);

    useEffect(() => {
        const load = async () => {
            const srv = await db.getServerSettings();
            setServerUrl(srv.url || '');
            setAdminEmail(srv.email || '');
            setAdminPassword(srv.password || '');

            const sys = await db.getSystemSettings();
            setTeamsUrl(sys.teamsWebhook || '');
            setNcPath(sys.ncServerPath || '');
        };
        load();
    }, []);

    const handleSaveConnection = async () => {
        await db.setServerSettings(serverUrl, adminEmail, adminPassword);
        setSaveMsg('Verbinding opgeslagen');
        setIsUrlWarningVisible(false);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleSaveBackendSettings = async () => {
        const current = await db.getSystemSettings();
        await db.setSystemSettings({ ...current, teamsWebhook: teamsUrl, ncServerPath: ncPath });
        setSaveMsg('Systeeminstellingen opgeslagen');
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        await db.setServerSettings(serverUrl, adminEmail, adminPassword);
        const res = await SyncService.authenticate(serverUrl, adminEmail, adminPassword);
        if (res.success) {
            setTestStatus('success');
            setTimeout(() => setTestStatus('idle'), 3000);
        } else {
            setTestStatus('fail');
            setLastSyncError(res.message);
        }
    };

    const handleCloudSync = async (mode: 'UPLOAD' | 'DOWNLOAD') => {
        if (!serverUrl) return alert("Voer eerst een Server URL in.");
        setSyncBusy(true);
        setLastSyncError(null);
        const res = mode === 'UPLOAD' ? await SyncService.uploadState(true) : await SyncService.downloadState();
        setSyncBusy(false);
        if (!res.success) setLastSyncError(res.message);
        else alert(res.message);
        if (mode === 'DOWNLOAD' && res.success) window.location.reload();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-6 opacity-10"><ShieldCheck size={100} /></div>
                <h3 className="text-xl font-black uppercase italic mb-2 tracking-tighter">PocketBase Automatisering</h3>
                <p className="text-sm font-bold text-blue-100 max-w-xl leading-relaxed">
                    Beheer de verbinding tussen de browser en de centrale database server.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-8 text-left">
                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">PocketBase Server URL</label>
                        <div className="relative">
                            <Link className="absolute left-4 top-4 text-slate-400" size={18} />
                            <input
                                type="url"
                                placeholder="http://10.1.111.26:8090"
                                className="w-full pl-12 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                value={serverUrl}
                                onChange={e => {
                                    setServerUrl(e.target.value);
                                    setIsUrlWarningVisible(true);
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input type="email" placeholder="admin@bedrijf.nl" className="w-full pl-12 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Wachtwoord</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input type="password" placeholder="••••••••" className="w-full pl-12 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <button onClick={handleSaveConnection} className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-blue-500 transition-all shadow-sm">Opslaan</button>
                    <button onClick={handleTestConnection} disabled={testStatus === 'testing'} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 shadow-sm ${testStatus === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : testStatus === 'fail' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:border-slate-300 dark:hover:border-slate-500'}`}>
                        {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={18} /> : testStatus === 'success' ? <UserCheck size={18} /> : <Network size={18} />}
                        {testStatus === 'testing' ? 'Testen...' : testStatus === 'success' ? 'Verbinding OK!' : 'Test Verbinding'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-8 text-left">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest border-b dark:border-slate-700 pb-6 flex items-center gap-3"><Server size={18} className="text-blue-500" /> Backend Automatisering</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <MessageSquare size={14} className="text-[#464EB8]" /> Teams Webhook URL
                        </label>
                        <input type="url" placeholder="https://outlook.office.com/webhook/..." className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-[#464EB8] shadow-sm transition-all" value={teamsUrl} onChange={e => setTeamsUrl(e.target.value)} />
                        <p className="text-[10px] font-bold text-slate-400 ml-1">Voor real-time meldingen in Microsoft Teams.</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Server size={14} className="text-orange-500" /> Factory Data Root (Server Path)
                        </label>
                        <input type="text" placeholder="D:\FactoryData" className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all" value={ncPath} onChange={e => setNcPath(e.target.value)} />
                        <p className="text-[10px] font-bold text-slate-400 italic ml-1">Hoofdmap op de server voor Assets, Artikelen en Tickets.</p>
                    </div>
                </div>

                <div className="pt-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800 shadow-inner">
                        <Info size={16} className="text-orange-600 shrink-0" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-orange-800 dark:text-orange-300">Zorg dat de PocketBase service schrijfrechten heeft op dit pad.</span>
                    </div>
                    <button onClick={handleSaveBackendSettings} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95">Instellingen Opslaan</button>
                </div>
            </div>

            {saveMsg && <div className="text-center text-xs text-green-600 font-bold animate-pulse">{saveMsg}</div>}
        </div>
    );
};
