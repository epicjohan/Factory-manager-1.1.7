import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    RefreshCw, 
    CheckCircle, 
    Server, 
    AlertTriangle, 
    Terminal, 
    ChevronDown, 
    ChevronUp, 
    Database, 
    ShieldCheck,
    Cpu,
    CloudUpload,
    FileCode
} from '../icons';
import { VersionManager } from '../services/versionManager';
import { APP_INFO } from '../services/appInfo';
import { getStore } from '../services/storage';

export const SystemUpdate: React.FC = () => {
    const navigate = useNavigate();
    const [dbVersion, setDbVersion] = useState<string | null>(null);
    const [isLatest, setIsLatest] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    
    useEffect(() => {
        const load = async () => {
            const store = await getStore();
            const currentDbVersion = store.systemVersion || '0.0.0';
            setDbVersion(currentDbVersion);
            setIsLatest(currentDbVersion === APP_INFO.VERSION);
        };
        load();
    }, []);

    const handleConfirmUpdate = () => {
        if(window.confirm(`Bevestig activatie van v${APP_INFO.VERSION}. De database wordt gemigreerd naar de nieuwe software-structuur.`)) {
            VersionManager.confirmDatabaseUpdate();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors">
                        <ArrowLeft size={18} />
                        <span>Terug naar Admin</span>
                    </button>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                        <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20">
                            <RefreshCw size={32} />
                        </div>
                        Systeem Activatie
                    </h2>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    Build ID: {APP_INFO.BUILD}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Database size={120} />
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Database size={14} /> Database Status
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-black font-mono text-slate-700 dark:text-slate-200">{dbVersion}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isLatest ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {isLatest ? 'SYNCHRONIZED' : 'OUTDATED'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        De versie die momenteel is geregistreerd in PocketBase.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-blue-200 dark:border-blue-900/30 p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileCode size={120} />
                    </div>
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Cpu size={14} /> Software Code
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-black font-mono text-blue-600 dark:text-blue-400">{APP_INFO.VERSION}</span>
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">LOADED</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        De versie van de bestanden die nu in de browser draaien.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-10 shadow-xl text-center relative overflow-hidden">
                {!isLatest ? (
                    <div className="py-6 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <AlertTriangle size={48} className="text-orange-600" />
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500 animate-ping opacity-20"></div>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4">Activatie Vereist</h3>
                        <p className="text-slate-500 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                            Er zijn nieuwe software bestanden gedetecteerd. Activeer de update om de database-structuur bij te werken en nieuwe functies te ontgrendelen.
                        </p>
                        
                        <div className="flex flex-col items-center gap-4">
                            <button 
                                onClick={handleConfirmUpdate}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 flex items-center gap-4 text-xl"
                            >
                                <ShieldCheck size={28} />
                                NU ACTIVEREN
                            </button>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mt-4">
                                Veilige Migratie Handshake v1.0.0
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CheckCircle size={56} className="text-green-500" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Systeem is Up-to-Date</h3>
                        <p className="text-slate-500 text-lg">De database en software code zijn volledig in sync op versie {APP_INFO.VERSION}.</p>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <button 
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between p-8 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-slate-900 rounded-2xl text-blue-400 shadow-lg">
                            <CloudUpload size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">Handmatige Update Procedure</h3>
                            <p className="text-sm text-slate-500 font-medium">Hoe rol ik een nieuwe build uit naar de PocketBase server?</p>
                        </div>
                    </div>
                    {showGuide ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </button>

                {showGuide && (
                    <div className="p-10 pt-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg">1</div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">Build op Developer PC</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Voer <code>npm run build</code> uit. Dit genereert de <code>dist/</code> map met bestanden.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg">2</div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">Bestanden Overzetten</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Kopieer de inhoud van <code>dist/</code> naar de <code>pb_public/</code> map op de server.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg">3</div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">Handshake</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Herlaad de pagina en activeer de update via de knop hierboven.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};