
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Code, 
    Database, 
    RefreshCw, 
    Shield, 
    Layers, 
    Terminal, 
    Bug, 
    FileCode, 
    Search, 
    AlertTriangle,
    CheckCircle,
    Info,
    Cpu,
    Wifi,
    Globe,
    BookOpen,
    ChevronRight,
    Braces
} from 'lucide-react';

export const DeveloperGuide: React.FC = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('OVERVIEW');

    const sections = [
        { id: 'OVERVIEW', label: 'Systeem Architectuur', icon: Layers },
        { id: 'DATA', label: 'Data & Storage', icon: Database },
        { id: 'SYNC', label: 'Sync Mechanism', icon: RefreshCw },
        { id: 'LIVE', label: 'Live Data & Bridges', icon: Cpu },
        { id: 'DEBUG', label: 'Troubleshooting Tips', icon: Bug },
    ];

    const CodeBlock = ({ code }: { code: string }) => (
        <pre className="bg-slate-950 text-blue-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner my-3">
            <code>{code}</code>
        </pre>
    );

    const InfoCard = ({ title, children, type = 'info' }: any) => (
        <div className={`p-4 rounded-xl border mb-6 ${
            type === 'warning' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 
            'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800'
        }`}>
            <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${type === 'warning' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'}`}>
                {type === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
                {title}
            </h4>
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {children}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 text-left flex flex-col md:flex-row gap-10">
            {/* SIDEBAR NAVIGATION */}
            <aside className="w-full md:w-64 shrink-0 space-y-2 sticky top-8 h-fit">
                <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
                    <ArrowLeft size={18} />
                    <span>Terug naar Admin</span>
                </button>
                
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 mb-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Doc Secties</h3>
                    <nav className="space-y-1">
                        {sections.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                <s.icon size={16} />
                                {s.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="text-[10px] text-slate-500 uppercase font-black px-4">
                    Developer OS v1.0.0
                </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                
                {activeSection === 'OVERVIEW' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Layers className="text-blue-500" size={32} />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Software Architectuur</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Factory Manager is gebouwd als een <strong>Offline-First Single Page Application (SPA)</strong>. 
                            De applicatie draait volledig in de browser van de gebruiker en communiceert asynchroon met de randapparatuur.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileCode size={20} className="text-indigo-500" /> Frontend Stack
                                </h3>
                                <ul className="text-sm text-slate-500 space-y-2">
                                    <li><strong>React 19:</strong> UI Framework.</li>
                                    <li><strong>TypeScript:</strong> Type safety voor alle data-structuren.</li>
                                    <li><strong>Tailwind CSS:</strong> Voor de styling en responsive layouts.</li>
                                    <li><strong>Lucide React:</strong> Consistent icon-systeem.</li>
                                    <li><strong>Recharts:</strong> Voor alle dashboard grafieken.</li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Braces size={20} className="text-teal-500" /> Belangrijke Bestanden
                                </h3>
                                <ul className="text-sm font-mono text-slate-500 space-y-1">
                                    <li>/types.ts: De bron van alle interfaces.</li>
                                    <li>/services/storage.ts: De database engine.</li>
                                    <li>/services/sync.ts: De synchronisatie engine.</li>
                                    <li>/App.tsx: Routing en security guards.</li>
                                </ul>
                            </div>
                        </div>

                        <InfoCard title="Hoe de code te lezen">
                            Begin altijd bij <strong>types.ts</strong>. Als je begrijpt hoe een <code>Machine</code> of <code>AppState</code> is opgebouwd, begrijp je hoe de UI die data rendert. Alle wijzigingen in de database gaan via de <code>db</code> constante in <strong>storage.ts</strong>.
                        </InfoCard>
                    </div>
                )}

                {activeSection === 'DATA' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="text-emerald-500" size={32} />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Data & Persistence</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            Er is geen directe verbinding nodig met een SQL server. Alle data leeft in de <strong>LocalStorage</strong> van de browser.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">De Storage Key</h3>
                            <p className="text-sm text-slate-500">De volledige database staat onder één sleutel in de browser:</p>
                            <CodeBlock code="localStorage.getItem('cnc_manager_live_db_v1');" />
                        </div>

                        <InfoCard title="Troubleshooting Data" type="warning">
                            Als een gebruiker klaagt over corrupte data, kun je in de Browser Console (F12) de data inspecteren. 
                            Typ <code>JSON.parse(localStorage.getItem('cnc_manager_live_db_v1'))</code> om het volledige object te zien.
                        </InfoCard>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Schema Migraties</h3>
                            <p className="text-sm text-slate-500">In <code>storage.ts</code> vind je de <code>migrate</code> functie. Bij elke versie-update van de software controleert deze functie of de data-structuur nog klopt en voegt indien nodig ontbrekende velden toe.</p>
                        </div>
                    </div>
                )}

                {activeSection === 'SYNC' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <RefreshCw className="text-blue-500" size={32} />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Sync Mechanism</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            De <code>SyncService</code> in <code>services/sync.ts</code> is verantwoordelijk voor de koppeling met de PocketBase server.
                        </p>

                        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold flex items-center gap-2"><Globe size={18} /> Conflict Handling</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                We gebruiken een <strong>Timestamp-based Last-Write-Wins</strong> strategie. 
                                Elke keer dat de database lokaal wordt aangepast, wordt <code>lastModified</code> bijgewerkt naar <code>Date.now()</code>.
                                De sync engine vergelijkt deze timestamp met de versie op de server.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Sync Flow:</h4>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
                                    <span>Interval (elke 5s) checkt <code>lastSaveTime</code> vs <code>lastPushTime</code>.</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">2</div>
                                    <span>Indien lokale wijziging: Push naar PocketBase collectie <code>factory_sync</code>.</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">3</div>
                                    <span>Indien server nieuwer: Download volledige blob en trigger <code>window.location.reload()</code>.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'LIVE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Cpu className="text-purple-500" size={32} />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Live Data & Bridges</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            Live data (zoals Spindle Load of Energie) gaat <strong>niet</strong> via de database blob, maar via aparte API streams.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">CNC/Focas Bridge</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Schrijft direct naar PocketBase collectie <code>machines</code>. De web-app pollt dit elke seconde in <code>fetchLiveStreams()</code>.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Energy/P1 Bridge</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Schrijft naar collectie <code>energy_live</code>. Dashboard rendert de laatste record.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">De "Heartbeat" Logica</h3>
                            <p className="text-sm text-slate-500">
                                In <code>FocasPanel.tsx</code> en <code>SystemHealth.tsx</code> wordt gekeken naar het veld <code>lastUpdated</code>. 
                                Is dit ouder dan 15 seconden? Dan tonen we <strong>OFFLINE</strong> in de UI, zelfs als de database-verbinding nog werkt.
                            </p>
                        </div>
                    </div>
                )}

                {activeSection === 'DEBUG' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Bug className="text-red-500" size={32} />
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Troubleshooting Matrix</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-bold">
                                        <tr>
                                            <th className="px-6 py-3">Symptoom</th>
                                            <th className="px-6 py-3">Oorzaak</th>
                                            <th className="px-6 py-3">Oplossing</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-bold text-red-600">"Witte Pagina" na Update</td>
                                            <td className="px-6 py-4">Cache conflict of JS error in types.</td>
                                            <td className="px-6 py-4">Hard Refresh (Ctrl+F5) of Reset via Console.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-bold text-orange-600">Sync icoon blijft rood</td>
                                            <td className="px-6 py-4">Server URL onjuist of API Key mismatch.</td>
                                            <td className="px-6 py-4">Check <code>Settings.tsx</code> integratie tab.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-bold text-blue-600">Geen live load op CNC</td>
                                            <td className="px-6 py-4">Bridge script op server staat stil.</td>
                                            <td className="px-6 py-4">Check Python proces op fabriek-PC.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-bold text-purple-600">User ziet tabs niet</td>
                                            <td className="px-6 py-4">Rechten-beperking per gebruiker.</td>
                                            <td className="px-6 py-4">Beheer via <code>UserManagement.tsx</code>.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-900 text-green-400 rounded-2xl border border-slate-800 font-mono text-xs">
                            <h4 className="text-white font-bold mb-3 uppercase text-[10px]">Power-User Console Commando's:</h4>
                            <div className="space-y-2">
                                <div><span className="text-slate-500">// Volledige database exporteren naar log</span><br/>console.table(JSON.parse(localStorage.getItem('cnc_manager_live_db_v1')));</div>
                                <div className="mt-3"><span className="text-slate-500">// Forceer demo mode uitschakelen</span><br/>const s = JSON.parse(localStorage.getItem('cnc_manager_live_db_v1')); s.isDemoMode = false; localStorage.setItem('cnc_manager_live_db_v1', JSON.stringify(s)); location.reload();</div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
