
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Server, Database, Activity, FileCode, FileText, 
    Settings, AlignLeft, Hash, Braces, ToggleLeft, Clock, ChevronDown, ChevronRight, 
    Code, CheckCircle, AlertTriangle, Terminal, Cpu, Zap, Monitor, 
    ShieldCheck, Archive, RefreshCw, ArrowRight, Droplet, Megaphone, Info, 
    Shield, History, Layers, ListChecks, User, ShieldPlus, Folders, Binary as BinaryIcon, 
    Bug, Grid, Wind, Lightbulb, FileJson, Copy, Sun, HardDrive, Globe
} from 'lucide-react';

import { 
    HARDWARE_SPECS, 
    FILESYSTEM_BLUEPRINT, 
    COLLECTIONS_BLUEPRINT,
} from '../config/blueprints';

const CodeBlock = ({ children, label, language = 'PYTHON' }: React.PropsWithChildren<{ label?: string, language?: string }>) => {
    const [copied, setCopied] = useState(false);

    const cleanCode = useMemo(() => {
        const lines = String(children).split('\n');
        while (lines.length > 0 && lines[0].trim() === '') lines.shift();
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
        
        const minIndent = lines.reduce((min, line) => {
            if (line.trim() === '') return min;
            const match = line.match(/^\s*/);
            const count = match ? match[0].length : 0;
            return count < min ? count : min;
        }, Infinity);

        return lines.map(line => line.slice(minIndent === Infinity ? 0 : minIndent)).join('\n');
    }, [children]);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(cleanCode);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = cleanCode;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                textArea.setAttribute('readonly', '');
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
        }
    };

    return (
        <div className="mt-3 mb-8 group relative shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
            <div className="bg-slate-900 px-5 py-3 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/40"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/40"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono ml-2">{label || language}</span>
                </div>
                <button 
                    onClick={handleCopy} 
                    className={`text-[10px] font-black uppercase transition-all flex items-center gap-2 px-4 py-2 rounded-xl ${copied ? 'text-white bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'text-blue-400 hover:text-white hover:bg-white/5'}`}
                >
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied ? 'Gekopieerd!' : 'Kopieer Script'}
                </button>
            </div>
            <pre className="bg-[#0b1221] text-blue-300/90 p-6 overflow-x-auto font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar text-left select-text">
                <code className="select-text whitespace-pre">{cleanCode}</code>
            </pre>
        </div>
    );
};

interface FolderNodeProps {
    name: string;
    comment?: string;
    type: string;
    level?: number;
}

const FolderNode: React.FC<FolderNodeProps> = ({ name, comment, type, level = 0 }) => {
    const icons: any = {
        folder: <div className="text-blue-400 fill-blue-400/20"><Archive size={16} /></div>,
        file: <FileText size={16} className="text-slate-400" />,
        exe: <div className="bg-blue-600 text-white text-[8px] font-black px-1 rounded flex items-center justify-center h-4 w-7 shadow-sm">EXE</div>,
        py: <FileCode size={16} className="text-yellow-400" />,
        dll: <Settings size={16} className="text-orange-400" />,
        cmd: <Terminal size={16} className="text-emerald-400" />
    };
    return (
        <div className="flex items-center gap-3 py-1 hover:bg-white/5 rounded px-2 transition-colors group min-w-max relative">
            <div style={{ width: (level || 0) * 28 }} className="shrink-0 flex items-center h-full">
                {(level || 0) > 0 && (
                    <div className="relative h-full w-full flex items-center">
                        <div className="absolute left-[-14px] top-[-10px] bottom-[50%] w-px bg-slate-700 opacity-40"></div>
                        <div className="absolute left-[-14px] top-[50%] w-4 h-px bg-slate-700 opacity-40"></div>
                    </div>
                )}
            </div>
            <div className="shrink-0">{icons[type] || icons.file}</div>
            <div className="font-mono text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wider">{name}</div>
            {comment && <div className="text-[9px] text-slate-500 italic ml-4 border-l border-slate-700 pl-4 hidden sm:block tracking-wide font-mono"># {comment}</div>}
        </div>
    );
};

const BlueprintItem = ({ name, type, desc, required }: any) => {
    const types: any = {
        'Text': { icon: <AlignLeft size={10}/>, color: 'bg-slate-100 text-slate-600 border-slate-200' },
        'Number': { icon: <Hash size={10}/>, color: 'bg-blue-100 text-blue-600 border-blue-200' },
        'JSON': { icon: <Braces size={10}/>, color: 'bg-purple-100 text-purple-600 border-purple-200' },
        'Bool': { icon: <ToggleLeft size={10}/>, color: 'bg-green-100 text-green-600 border-green-200' },
        'Date': { icon: <Clock size={10}/>, color: 'bg-orange-100 text-orange-600 border-orange-200' },
        'Relation': { icon: <ArrowRight size={10}/>, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
        'File': { icon: <Archive size={10}/>, color: 'bg-teal-100 text-teal-600 border-teal-200' }
    };
    const t = types[type] || types['Text'];
    return (
        <div className="grid grid-cols-12 gap-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 px-4 transition-colors">
            <div className="col-span-4 font-mono text-xs font-black text-slate-800 dark:text-slate-200">{name} {required && <span className="text-red-500">*</span>}</div>
            <div className="col-span-3 flex items-center"><span className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded border ${t.color}`}>{t.icon} {type}</span></div>
            <div className="col-span-5 text-[10px] text-slate-500 leading-tight">{desc}</div>
        </div>
    );
};

const CollectionSpec = ({ name, desc, fields, icon: Icon, color }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-3 shadow-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${color} text-white shadow-lg shadow-current/10`}><Icon size={20} /></div>
                    <div className="text-left">
                        <h4 className="font-mono font-black text-slate-900 dark:text-white uppercase tracking-tighter">{name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{desc}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 border border-slate-100 dark:border-slate-700 rounded-full">{fields.length} VELDEN</div>
                    {isOpen ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 dark:bg-slate-900/50 py-2 px-4 border-b border-slate-100 dark:border-slate-700 grid grid-cols-12 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="col-span-4">Kolom</div><div className="col-span-3">Type</div><div className="col-span-5">Doel</div>
                    </div>
                    {fields.map((f: any) => <BlueprintItem key={f.name} {...f} />)}
                </div>
            )}
        </div>
    );
};

export const SuperAdminHelp: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'HARDWARE' | 'SOFTWARE' | 'FILESYSTEM' | 'DB' | 'BRIDGES' | 'MAINTENANCE'>('HARDWARE');

    return (
        <div className="max-w-6xl mx-auto pb-20 text-left">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-8 transition-colors">
                <ArrowLeft size={18} /><span>Terug naar Dashboard</span>
            </button>

            <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <ShieldCheck size={12} /> Ghost Admin - Industrial Deployment
                </div>
                <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 italic uppercase">Enterprise Master Guide</h1>
                <p className="text-xl text-slate-500 max-w-2xl font-light leading-relaxed">De volledige blauwdruk voor het uitrollen van een industriële installatie. Focus op stabiliteit en data-integriteit.</p>
            </div>

            <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 mb-10 no-scrollbar">
                {[
                    { id: 'HARDWARE', label: '1. Infra & HW', icon: Server },
                    { id: 'SOFTWARE', label: '2. Software Stack', icon: Layers },
                    { id: 'FILESYSTEM', label: '3. File System', icon: Folders },
                    { id: 'DB', label: '4. DB Blueprint', icon: Database },
                    { id: 'BRIDGES', label: '5. Python Bridges', icon: Cpu },
                    { id: 'MAINTENANCE', label: '6. Support', icon: Archive },
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>
                        <t.icon size={18} /> {t.label.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {activeTab === 'HARDWARE' && (
                    <div className="space-y-8">
                         <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-5"><Server size={160} /></div>
                             <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">1. Server & Infrastructuur</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {HARDWARE_SPECS.map(spec => (
                                     <div key={spec.title} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                                         <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-500"><spec.icon size={20} /></div>
                                         <div>
                                             <h4 className="font-bold text-slate-800 dark:text-slate-100">{spec.title}</h4>
                                             <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-1 mb-2">{spec.spec}</div>
                                             <p className="text-xs text-slate-500 leading-relaxed">{spec.detail}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'SOFTWARE' && (
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                             <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">2. Software Ecosystem</h2>
                             <div className="space-y-6">
                                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                     <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest mb-4">A. Database Engine (PocketBase v0.35)</h3>
                                     <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-5">
                                         <li>Draait als een single binary executable (geen externe SQL installatie nodig).</li>
                                         <li>Gebruikt <strong>SQLite</strong> als data-opslag voor extreme stabiliteit.</li>
                                         <li>Real-time subscriptions via SSE (Server-Sent Events).</li>
                                         <li>Ingebouwde User Management en File Storage API.</li>
                                     </ul>
                                 </div>
                                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                     <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest mb-4">B. Frontend (React 19)</h3>
                                     <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-5">
                                         <li>Offline-first architectuur met <strong>IndexedDB</strong> caching.</li>
                                         <li>Tailwind CSS voor een responsieve industriële interface.</li>
                                         <li>Lucide React voor het iconografie systeem.</li>
                                     </ul>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'FILESYSTEM' && (
                    <div className="bg-slate-900 text-white p-10 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-blue-400">3. File System Blueprint</h2>
                        <div className="bg-[#0b1221] p-8 rounded-[2rem] border border-slate-800 shadow-inner overflow-x-auto custom-scrollbar">
                            <div className="space-y-1">
                                {FILESYSTEM_BLUEPRINT.map((node, idx) => (
                                    <FolderNode key={idx} {...node} />
                                ))}
                            </div>
                        </div>
                        <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                            <Info className="text-blue-400 shrink-0" />
                            <p className="text-xs text-blue-300/80 leading-relaxed">
                                Zorg dat de map <strong>FactoryManager</strong> buiten de <code>Program Files</code> staat om permissie-fouten bij het schrijven van de SQLite database te voorkomen. Aanbevolen: <code>C:\FactoryManager</code> of een aparte data-partitie.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'DB' && (
                    <div className="space-y-6">
                        {COLLECTIONS_BLUEPRINT.map(group => (
                            <div key={group.group}>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">{group.group}</h3>
                                <div className="space-y-2">
                                    {group.items.map(item => (
                                        <CollectionSpec key={item.name} {...item} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'BRIDGES' && (
                    <div className="space-y-10">
                        <div className="bg-slate-950 text-white p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden mb-8">
                             <div className="absolute top-0 right-0 p-10 opacity-10"><Cpu size={160} /></div>
                             <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-blue-400">5. Factory Bridges</h2>
                             <p className="text-slate-400 font-medium max-w-2xl leading-relaxed">
                                 De brug tussen fysieke hardware en de database. Gebruik Python voor maximale flexibiliteit en stabiliteit.
                             </p>
                        </div>

                        <div className="space-y-6 text-left">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic uppercase"><Sun size={24} className="text-yellow-500" /> B. Energy Master Bridge (P1 + Solar)</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Deze bridge leest twee HomeWizard P1 meters tegelijk uit. Het vereist authenticatie om naar PocketBase te mogen schrijven.
                            </p>
                            <CodeBlock label="energy_bridge.py" language="PYTHON">
{`import time, requests, threading
from datetime import datetime, timezone

# --- CONFIG ---
PB_URL = "http://127.0.0.1:8095" # Gebruik IPv4 IP voor stabiliteit
ADMIN_EMAIL = "admin@bedrijf.nl"
ADMIN_PASS = "admin123456"

IP_CONS = "192.168.1.10" # Bruto Verbruik
IP_PROD = "192.168.1.11" # Bruto Solar

class PBClient:
    def __init__(self, url, email, password):
        self.url = url.rstrip('/')
        self.email = email
        self.password = password
        self.token = None

    def login(self):
        try:
            res = requests.post(f"{self.url}/api/collections/_superusers/auth-with-password",
                json={"identity": self.email, "password": self.password}, timeout=2)
            if res.ok:
                self.token = res.json().get("token")
                return True
            return False
        except: return False

    def push_live(self, payload):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        try:
            res = requests.patch(f"{self.url}/api/collections/energy_live/records/live_now_record", 
                               json=payload, headers=headers, timeout=1)
            if res.status_code == 404: # Record aanmaken als niet bestaat
                requests.post(f"{self.url}/api/collections/energy_live/records", 
                             json={**payload, "id": "live_now_record"}, headers=headers)
        except: pass

def main():
    pb = PBClient(PB_URL, ADMIN_EMAIL, ADMIN_PASS)
    pb.login()
    print("--- ENERGY MASTER BRIDGE ACTIVE ---")
    
    while True:
        c = requests.get(f"http://{IP_CONS}/api/v1/data").json()
        p = requests.get(f"http://{IP_PROD}/api/v1/data").json()
        
        if c and p:
            payload = {
                "active_power_w": c.get('active_power_w', 0),
                "production_w": p.get('active_power_w', 0),
                "net_power_w": c.get('active_power_w', 0) - p.get('active_power_w', 0),
                "updated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            }
            pb.push_live(payload)
        time.sleep(1.0)

if __name__ == "__main__":
    main()`}
                            </CodeBlock>
                        </div>
                    </div>
                )}
                
                {activeTab === 'MAINTENANCE' && (
                    <div className="space-y-8">
                         <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                             <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">6. Ghost Support & Maintenance</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                     <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><Shield size={18} className="text-blue-500" /> Systeem Herstel</h3>
                                     <p className="text-xs text-slate-500 leading-relaxed">
                                         Bij database-corruptie: Stop <code>START.bat</code>, vervang de inhoud van <code>pb_data</code> met de laatste ZIP uit de <code>backups</code> map, en start de server opnieuw.
                                     </p>
                                 </div>
                                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                     <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><Zap size={18} className="text-yellow-500" /> Remote Diagnostics</h3>
                                     <p className="text-xs text-slate-500 leading-relaxed">
                                         Gebruik de <strong>Systeem Monitor</strong> in het Admin paneel om latency en sync-wachtrijen te controleren zonder fysiek bij de server te zijn.
                                     </p>
                                 </div>
                             </div>
                         </div>
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 text-slate-400">
                    <Terminal size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Master Manual - Ghost Admin - v2026.1 Portable Build</span>
                </div>
            </footer>
        </div>
    );
};
