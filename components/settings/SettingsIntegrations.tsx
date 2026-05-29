
import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Link, Mail, Lock, RefreshCw, UserCheck, Network,
    Server, Info, MessageSquare, Zap, CheckCircle2, XCircle,
    Globe, Plug
} from '../../icons';
import { db } from '../../services/storage';
import { SyncService } from '../../services/sync';
import { useNotifications } from '../../contexts/NotificationContext';

// ─── Typen ────────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'testing' | 'success' | 'fail';

// ─── Subcomponent: Sectie Wrapper ──────────────────────────────────────────────

const Section: React.FC<{
    title: string;
    icon: React.ReactNode;
    accentColor: string;
    children: React.ReactNode;
}> = ({ title, icon, accentColor, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-left">
        <div className={`px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 ${accentColor}`}>
            {icon}
            <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
        </div>
        <div className="p-8 space-y-6">
            {children}
        </div>
    </div>
);

// ─── Subcomponent: Invoerveld ──────────────────────────────────────────────────

const InputField: React.FC<{
    label: string;
    icon: React.ReactNode;
    type?: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
    accentClass?: string;
}> = ({ label, icon, type = 'text', placeholder, value, onChange, hint, accentClass = 'focus:ring-blue-500' }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-4 text-slate-400 pointer-events-none">{icon}</div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full pl-12 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white text-sm font-medium focus:ring-2 ${accentClass} outline-none transition-all shadow-sm`}
            />
        </div>
        {hint && <p className="text-[10px] font-bold text-slate-400 ml-1">{hint}</p>}
    </div>
);

// ─── Subcomponent: Status Badge ────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TestStatus; label?: string }> = ({ status, label }) => {
    if (status === 'idle') return null;
    const map: Record<TestStatus, { icon: React.ReactNode; text: string; cls: string }> = {
        idle: { icon: null, text: '', cls: '' },
        testing: { icon: <RefreshCw size={14} className="animate-spin" />, text: 'Testen...', cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
        success: { icon: <CheckCircle2 size={14} />, text: label || 'Verbinding OK!', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
        fail: { icon: <XCircle size={14} />, text: 'Verbinding mislukt', cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
    };
    const { icon, text, cls } = map[status];
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${cls}`}>
            {icon} {text}
        </div>
    );
};

// ─── Hoofdcomponent ────────────────────────────────────────────────────────────

export const SettingsIntegrations: React.FC = () => {
    const { addNotification } = useNotifications();

    // ── PocketBase ──
    const [pbUrl, setPbUrl] = useState('');
    const [pbEmail, setPbEmail] = useState('');
    const [pbPassword, setPbPassword] = useState('');
    const [pbTestStatus, setPbTestStatus] = useState<TestStatus>('idle');
    const [pbTestError, setPbTestError] = useState<string | null>(null);
    const [pbSaveMsg, setPbSaveMsg] = useState('');

    // ── Backend overige ──
    const [teamsUrl, setTeamsUrl] = useState('');
    const [ncPath, setNcPath] = useState('');

    // ── MKG ──
    const [mkgUrl, setMkgUrl] = useState('');
    const [mkgApiKey, setMkgApiKey] = useState('');
    const [mkgUsername, setMkgUsername] = useState('');
    const [mkgPassword, setMkgPassword] = useState('');
    const [mkgTestStatus, setMkgTestStatus] = useState<TestStatus>('idle');
    const [mkgTestError, setMkgTestError] = useState<string | null>(null);
    const [mkgSaveMsg, setMkgSaveMsg] = useState('');

    // ── Laden ──
    useEffect(() => {
        const load = async () => {
            const srv = await db.getServerSettings();
            setPbUrl(srv.url || '');
            setPbEmail(srv.email || '');
            setPbPassword(srv.password || '');

            const sys = await db.getSystemSettings();
            setTeamsUrl(sys.teamsWebhook || '');
            setNcPath((sys as any).ncServerPath || '');

            const mkg = await db.getMkgSettings();
            setMkgUrl(mkg.serverUrl || '');
            setMkgApiKey(mkg.apiKey || '');
            setMkgUsername(mkg.username || '');
            setMkgPassword(mkg.password || '');
        };
        load();
    }, []);

    // ── PocketBase handlers ──
    const handleSavePb = async () => {
        await db.setServerSettings(pbUrl, pbEmail, pbPassword);
        setPbSaveMsg('Opgeslagen ✓');
        setTimeout(() => setPbSaveMsg(''), 3000);
    };

    const handleTestPb = async () => {
        setPbTestStatus('testing');
        setPbTestError(null);
        await db.setServerSettings(pbUrl, pbEmail, pbPassword);
        const res = await SyncService.authenticate(pbUrl, pbEmail, pbPassword);
        if (res.success) {
            setPbTestStatus('success');
            setTimeout(() => setPbTestStatus('idle'), 4000);
        } else {
            setPbTestStatus('fail');
            setPbTestError(res.message);
        }
    };

    const handleSaveBackend = async () => {
        const current = await db.getSystemSettings();
        await db.setSystemSettings({ ...current, teamsWebhook: teamsUrl, ...(ncPath ? { ncServerPath: ncPath } as any : {}) });
        addNotification('SUCCESS', 'Opgeslagen', 'Backend instellingen zijn opgeslagen.');
    };

    // ── MKG handlers ──
    const handleSaveMkg = async () => {
        await db.setMkgSettings(mkgUrl, mkgApiKey, mkgUsername, mkgPassword);
        setMkgSaveMsg('Opgeslagen ✓');
        setTimeout(() => setMkgSaveMsg(''), 3000);
        addNotification('SUCCESS', 'MKG Instellingen', 'MKG instellingen zijn veilig opgeslagen.');
    };

    const handleTestMkg = async () => {
        if (!mkgUrl) {
            addNotification('ERROR', 'Fout', 'Voer eerst een MKG Server URL in.');
            return;
        }
        if (!mkgUsername || !mkgPassword) {
            addNotification('ERROR', 'Fout', 'Voer ook een MKG gebruikersnaam en wachtwoord in.');
            return;
        }
        setMkgTestStatus('testing');
        setMkgTestError(null);

        // Sla eerst op naar system_config → PocketBase → alle devices
        await db.setMkgSettings(mkgUrl, mkgApiKey, mkgUsername, mkgPassword);

        try {
            // Proxy v2.0: credentials worden NIET meegestuurd — de PocketBase
            // proxy leest ze zelf uit system_config. De browser stuurt alleen
            // de actie. Hook: pb_hooks/mkg_proxy.pb.js
            const pbSrv = await db.getServerSettings();
            const proxyUrl = `${pbSrv.url || window.location.origin}/api/mkg-proxy`;

            const res = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'PING' }),
            });

            if (res.status === 404) {
                setMkgTestStatus('fail');
                setMkgTestError('De MKG proxy hook is niet gevonden op PocketBase. Controleer of pb_hooks/mkg_proxy.pb.js aanwezig is en PocketBase opnieuw is opgestart.');
                return;
            }

            const data = await res.json();
            if (data.success) {
                setMkgTestStatus('success');
                setTimeout(() => setMkgTestStatus('idle'), 4000);
                addNotification('SUCCESS', 'MKG Verbinding', data.message || 'Verbinding met MKG geslaagd!');
            } else {
                setMkgTestStatus('fail');
                setMkgTestError(data.message || `HTTP ${res.status} — verbinding mislukt.`);
            }
        } catch (e) {
            setMkgTestStatus('fail');
            setMkgTestError(`Netwerkfout: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* ── HERO BANNER ── */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-left">
                <div className="absolute -top-4 -right-4 opacity-10"><Plug size={120} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-xl"><Plug size={22} /></div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Integraties & Connectiviteit</h3>
                    </div>
                    <p className="text-sm font-bold text-blue-100 max-w-xl leading-relaxed">
                        Beheer alle externe verbindingen van Factory Manager: de PocketBase database server en het MKG ERP-systeem.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                BLOK 1: POCKETBASE
            ══════════════════════════════════════════════════════════════ */}
            <Section
                title="PocketBase Database"
                icon={<ShieldCheck size={18} />}
                accentColor="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            >
                <InputField
                    label="Server URL"
                    icon={<Link size={18} />}
                    type="url"
                    placeholder="http://10.1.111.26:8090"
                    value={pbUrl}
                    onChange={setPbUrl}
                    hint="Het IP-adres en de poort van de PocketBase server op jouw netwerk."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Admin E-mail"
                        icon={<Mail size={18} />}
                        type="email"
                        placeholder="admin@bedrijf.nl"
                        value={pbEmail}
                        onChange={setPbEmail}
                    />
                    <InputField
                        label="Admin Wachtwoord"
                        icon={<Lock size={18} />}
                        type="password"
                        placeholder="••••••••"
                        value={pbPassword}
                        onChange={setPbPassword}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        onClick={handleSavePb}
                        className="px-8 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-blue-400 transition-all shadow-sm"
                    >
                        Opslaan
                    </button>
                    <button
                        onClick={handleTestPb}
                        disabled={pbTestStatus === 'testing'}
                        className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-60"
                    >
                        {pbTestStatus === 'testing' ? <RefreshCw size={16} className="animate-spin" /> : <Network size={16} />}
                        Test Verbinding
                    </button>
                    <StatusBadge status={pbTestStatus} />
                    {pbSaveMsg && <span className="text-xs font-bold text-emerald-600">{pbSaveMsg}</span>}
                </div>
                {pbTestStatus === 'fail' && pbTestError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400">
                        {pbTestError}
                    </div>
                )}
            </Section>

            {/* ── Backend Automatisering ── */}
            <Section
                title="Backend Automatisering"
                icon={<Server size={18} />}
                accentColor="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Teams Webhook URL"
                        icon={<MessageSquare size={18} />}
                        type="url"
                        placeholder="https://outlook.office.com/webhook/..."
                        value={teamsUrl}
                        onChange={setTeamsUrl}
                        hint="Voor real-time meldingen in Microsoft Teams."
                    />
                    <InputField
                        label="Factory Data Root (Server Path)"
                        icon={<Server size={18} />}
                        placeholder="D:\FactoryData"
                        value={ncPath}
                        onChange={setNcPath}
                        hint="Hoofdmap op de server voor Assets, Artikelen en Tickets."
                    />
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800">
                        <Info size={16} className="text-orange-600 shrink-0" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-orange-800 dark:text-orange-300">
                            Zorg dat de PocketBase service schrijfrechten heeft op dit pad.
                        </span>
                    </div>
                    <button
                        onClick={handleSaveBackend}
                        className="ml-4 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                        Opslaan
                    </button>
                </div>
            </Section>

            {/* ══════════════════════════════════════════════════════════════
                BLOK 2: MKG ERP KOPPELING
            ══════════════════════════════════════════════════════════════ */}
            <Section
                title="MKG ERP Koppeling"
                icon={<Zap size={18} />}
                accentColor="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
            >
                {/* Uitleg banner */}
                <div className="flex gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl">
                    <Globe size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                            On-Premise koppeling via proxy
                        </p>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            Factory Manager verbindt met de MKG API via een veilig PocketBase proxy-endpoint.
                            Alle credentials worden versleuteld opgeslagen op dit apparaat.
                        </p>
                    </div>
                </div>

                <InputField
                    label="MKG Server URL"
                    icon={<Globe size={18} />}
                    type="url"
                    placeholder="http://192.168.1.100:8080/mkg"
                    value={mkgUrl}
                    onChange={setMkgUrl}
                    hint="Te vinden in de MKG client via Help → MKG API. Formaat: http://<server>:<poort>/mkg of /mkgoefenclient"
                    accentClass="focus:ring-emerald-500"
                />

                <InputField
                    label="API Sleutel (apikey)"
                    icon={<Lock size={18} />}
                    type="password"
                    placeholder="••••••••••••••••"
                    value={mkgApiKey}
                    onChange={setMkgApiKey}
                    hint="Aan te maken via de MKG module 'API applicaties'. Versleuteld opgeslagen."
                    accentClass="focus:ring-emerald-500"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="MKG Gebruikersnaam"
                        icon={<UserCheck size={18} />}
                        placeholder="gebruiker@bedrijf.nl"
                        value={mkgUsername}
                        onChange={setMkgUsername}
                        accentClass="focus:ring-emerald-500"
                    />
                    <InputField
                        label="MKG Wachtwoord"
                        icon={<Lock size={18} />}
                        type="password"
                        placeholder="••••••••"
                        value={mkgPassword}
                        onChange={setMkgPassword}
                        hint="Versleuteld opgeslagen via AES-256."
                        accentClass="focus:ring-emerald-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        onClick={handleSaveMkg}
                        className="px-8 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-emerald-400 transition-all shadow-sm"
                    >
                        Opslaan
                    </button>
                    <button
                        onClick={handleTestMkg}
                        disabled={mkgTestStatus === 'testing' || !mkgUrl}
                        className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-60"
                    >
                        {mkgTestStatus === 'testing' ? <RefreshCw size={16} className="animate-spin" /> : <Plug size={16} />}
                        Test Verbinding
                    </button>
                    <StatusBadge status={mkgTestStatus} label="MKG Verbinding OK!" />
                    {mkgSaveMsg && <span className="text-xs font-bold text-emerald-600">{mkgSaveMsg}</span>}
                </div>

                {mkgTestStatus === 'fail' && mkgTestError && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl text-xs font-bold text-orange-700 dark:text-orange-400 flex gap-3 items-start">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <span>{mkgTestError}</span>
                    </div>
                )}

                {/* Status info rij */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                        { label: 'Authenticatie', desc: 'Session-based (Spring Security)', icon: <ShieldCheck size={16} /> },
                        { label: 'Transport', desc: 'Via PocketBase Proxy (CORS-vrij)', icon: <Server size={16} /> },
                        { label: 'Opslag', desc: 'AES-256 GCM versleuteld', icon: <Lock size={16} /> },
                    ].map(({ label, desc, icon }) => (
                        <div key={label} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                            <div className="flex justify-center mb-2 text-emerald-500">{icon}</div>
                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{label}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">{desc}</p>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
};
