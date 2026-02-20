
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, RefreshCw, Folder, File, Terminal, Shield, AlertTriangle, CheckCircle, Info, ShieldCheck, HardDrive, Cpu, Database, Settings } from 'lucide-react';

export const ReleaseManual: React.FC = () => {
  const navigate = useNavigate();

  const FolderStructure = () => (
    <div className="bg-slate-950 text-slate-300 p-6 rounded-xl font-mono text-xs border border-slate-800 shadow-inner overflow-x-auto">
        <div className="flex items-center gap-2 text-blue-400 mb-2"><Folder size={14} /> C:\FactoryManager</div>
        <div className="pl-4 border-l border-slate-800 space-y-2">
            <div className="flex items-center gap-2"><Folder size={14} className="text-yellow-500" /> pb_data <span className="text-slate-600 ml-2">// SQLite DATABASE</span></div>
            <div className="flex items-center gap-2"><Folder size={14} className="text-emerald-500" /> pb_public <span className="text-slate-600 ml-2">// Compiled Frontend (Web UI)</span></div>
            <div className="flex items-center gap-2"><Folder size={14} className="text-purple-400" /> pb_migrations <span className="text-slate-600 ml-2">// Database Schema Logic</span></div>
            <div className="flex items-center gap-2"><Folder size={14} className="text-blue-500" /> bridges <span className="text-slate-600 ml-2">// Python Connectors (CNC/P1)</span></div>
            <div className="flex items-center gap-2"><Folder size={14} className="text-orange-400" /> bin <span className="text-slate-600 ml-2">// DLLs & Drivers (fwlib32.dll)</span></div>
            <div className="flex items-center gap-2"><Folder size={14} className="text-slate-500" /> backups <span className="text-slate-600 ml-2">// Automated Snapshots</span></div>
            <div className="flex items-center gap-2"><File size={14} className="text-blue-400" /> pocketbase.exe <span className="text-slate-600 ml-2">// Engine</span></div>
            <div className="flex items-center gap-2"><Terminal size={14} className="text-white" /> START.bat <span className="text-slate-600 ml-2">// Startup Launcher</span></div>
        </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
            <ArrowLeft size={18} />
            <span>Terug naar Dashboard</span>
        </button>

        <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <ShieldCheck size={12} /> Deployment Suite v3.1
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Automated Release Guide</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Professionele uitrol en onderhoudsprocedure voor industriële server omgevingen.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 1. INSTALLATIE */}
            <div className="lg:col-span-2 space-y-8">
                <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 italic uppercase">
                        <Package size={24} className="text-blue-600" /> 1. Installatie & Ingebruikname
                    </h2>
                    
                    <div className="space-y-6">
                        <div className="flex gap-6">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg">1</div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Schoon Installeren</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Voer <code>INSTALL.bat</code> uit als Administrator. Dit maakt de mappenstructuur op <code>C:\FactoryManager</code> aan. 
                                    Verwijder bij een herinstallatie eerst de map <code>pb_data</code> om met een schone database te beginnen.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg">2</div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Drivers & Bridges</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Plaats de Fanuc <code>fwlib32.dll</code> in de <code>bin</code> map. Kopieer uw Python scripts naar de <code>bridges</code> map en start deze als Windows Service (via NSSM).
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg">3</div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Admin Toegang</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Maak na het starten van de server direct een beheerder aan via <code>http://localhost:8095/_/</code>. Gebruik dit account om de machine-lijst te importeren via JSON.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 italic uppercase">
                        <RefreshCw size={24} className="text-orange-500" /> 2. Backups & Veiligheid
                    </h2>
                    
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 rounded-r-xl mb-6">
                        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-400 font-bold text-sm mb-1">
                            <Shield size={16} /> Data-Integriteit
                        </div>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                            De <code>backups</code> map bevat periodieke ZIP-exports van de database. Koppel deze map aan uw bedrijfs-NAS voor maximale zekerheid.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                            <h5 className="font-bold text-xs uppercase mb-2 flex items-center gap-2"><Cpu size={14}/> Bridge Monitoring</h5>
                            <p className="text-[10px] text-slate-500">Bridges loggen hun status in de <code>logs</code> map. Controleer deze bij verbindingsproblemen.</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                            <h5 className="font-bold text-xs uppercase mb-2 flex items-center gap-2"><Settings size={14}/> Poortbeheer</h5>
                            <p className="text-[10px] text-slate-500">De server draait standaard op poort 8095. Zorg dat deze in de Windows Firewall open staat voor inkomend verkeer.</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* 2. STRUCTUUR & SPECS */}
            <div className="space-y-6">
                <section className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-xl">
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <HardDrive size={14} /> Systeem Architectuur
                    </h3>
                    <FolderStructure />
                </section>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" /> Kritieke Tips
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Verwijder NOOIT de map <code>pb_data</code> zonder backup. Dit is de volledige fabriekshistorie.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Houd de <code>START.bat</code> terminal open. Bij sluiten stopt alle data-registratie direct.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-600 text-white rounded-[2rem] shadow-lg shadow-blue-500/30 text-center">
                    <Info size={32} className="mx-auto mb-3 opacity-50" />
                    <h4 className="font-black uppercase text-xs tracking-widest mb-1">Hulp Nodig?</h4>
                    <p className="text-[10px] opacity-80 leading-relaxed font-medium">Raadpleeg de Tech Docs voor details over de Python FOCAS implementatie.</p>
                </div>
            </div>
        </div>
    </div>
  );
};
