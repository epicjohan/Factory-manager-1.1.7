
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/storage';
import { SyncService } from '../services/sync';
import { ArrowLeft, Server, Activity, Wifi, WifiOff, Clock, AlertTriangle, RefreshCw, Cpu, Database, HardDrive, Trash2, BarChart, Zap, Monitor } from 'lucide-react';
import { KEYS } from '../services/db/core';
import { Machine, SystemStatus, SyncEntry } from '../types';
import { useTable } from '../hooks/useTable';

interface LocalNodeStatus {
    id: string;
    name: string;
    ip: string;
    type: string;
    lastSeen: Date | null;
    status: 'ONLINE' | 'LAGGING' | 'OFFLINE';
    latency: number; 
}

export const SystemHealth: React.FC = () => {
    const navigate = useNavigate();
    
    const { data: machines } = useTable<Machine>(KEYS.MACHINES);
    const { data: outbox } = useTable<SyncEntry>(KEYS.OUTBOX);
    const { data: systemStatusRaw } = useTable<SystemStatus>(KEYS.SYSTEM_STATUS);

    const [serverUrl, setServerUrl] = useState<string>('');
    const [storageStats, setStorageStats] = useState({ usage: 0, percent: 0 });
    const [manualSyncMsg, setManualSyncMsg] = useState('');

    // Filter unieke bridges op basis van naam
    const uniqueBridges = useMemo(() => {
        const map = new Map<string, SystemStatus>();
        const sorted = [...systemStatusRaw].sort((a,b) => {
            const timeA = new Date(a.last_seen || 0).getTime();
            const timeB = new Date(b.last_seen || 0).getTime();
            return timeB - timeA;
        });
        sorted.forEach(s => {
            if (!map.has(s.bridge_name)) {
                map.set(s.bridge_name, s);
            }
        });
        return Array.from(map.values());
    }, [systemStatusRaw]);

    const nodes: LocalNodeStatus[] = useMemo(() => {
        const now = Date.now();
        return machines.map(m => {
            let lastSeen: Date | null = null;
            let status: 'ONLINE' | 'LAGGING' | 'OFFLINE' = 'OFFLINE';
            let latency = 999;
            
            if (m.liveStats?.lastUpdated) {
                // Zulu parsing
                lastSeen = new Date(m.liveStats.lastUpdated);
                latency = Math.floor((now - lastSeen.getTime()) / 1000);
                
                // Marge iets ruimer voor netwerkjitter
                if (latency < 45) status = 'ONLINE';
                else if (latency < 120) status = 'LAGGING';
                else status = 'OFFLINE';
            }
            return { id: m.id, name: m.name, ip: m.focasIp || 'Niet ingesteld', type: m.type, lastSeen, status, latency };
        });
    }, [machines]);

    useEffect(() => {
        const loadNonReactive = async () => {
            const serverConfig = await db.getServerSettings();
            setServerUrl(serverConfig.url || 'Niet geconfigureerd');

            if (navigator.storage && navigator.storage.estimate) {
                try {
                    const estimate = await navigator.storage.estimate();
                    const usageKb = Math.round((estimate.usage || 0) / 1024);
                    const softQuota = 1024 * 1024 * 1024; 
                    setStorageStats({ 
                        usage: usageKb, 
                        percent: Math.min(100, ((estimate.usage || 0) / softQuota) * 100) 
                    });
                } catch (e) {}
            }
        };
        loadNonReactive();
        const interval = setInterval(loadNonReactive, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleForceSync = async () => {
        setManualSyncMsg('Synchroniseren...');
        const res = await SyncService.uploadState(true);
        setManualSyncMsg(res.message);
        setTimeout(() => setManualSyncMsg(''), 3000);
    };

    const serverStatus = serverUrl !== 'Niet geconfigureerd' && serverUrl ? 'CONNECTED' : 'DISCONNECTED';

    const getBridgeStatus = (lastSeenISO: string) => {
        if (!lastSeenISO) return 'OFFLINE';
        const cleanISO = lastSeenISO.includes(' ') && !lastSeenISO.includes('T') 
            ? lastSeenISO.replace(' ', 'T') 
            : lastSeenISO;
        
        const diff = (Date.now() - new Date(cleanISO).getTime()) / 1000;
        if (diff < 45) return 'ONLINE';
        if (diff < 120) return 'LAGGING';
        return 'OFFLINE';
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 text-left space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors"><ArrowLeft size={18} /><span>Terug naar Admin</span></button>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 italic uppercase"><Activity className="text-emerald-500" /> Systeem Monitor</h2>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Live Status</div>
                    <div className="flex items-center justify-end gap-2 text-emerald-500 font-bold text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Monitoring Actief</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div><h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 uppercase text-xs tracking-widest"><Server size={16} /> Server</h3></div>
                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${serverStatus === 'CONNECTED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{serverStatus}</div>
                    </div>
                    <div className="mt-6 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border font-mono truncate">{serverUrl}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div><h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 uppercase text-xs tracking-widest"><Cpu size={16} /> Cloud Sync</h3><p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">PocketBase Wachtrij</p></div>
                    <div className="mt-6"><button onClick={handleForceSync} className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><RefreshCw size={12} /> Sync Nu</button>{manualSyncMsg && <div className="text-[10px] text-center mt-2 text-blue-500 font-bold">{manualSyncMsg}</div>}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div><h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 uppercase text-xs tracking-widest"><HardDrive size={16} /> Opslag (DB)</h3></div>
                        <div className="text-right"><div className="text-lg font-black text-slate-700 dark:text-slate-300">{storageStats.usage} KB</div></div>
                    </div>
                    <div className="mt-6 space-y-3">
                        <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${storageStats.percent > 70 ? 'bg-orange-50' : 'bg-blue-500'}`} style={{ width: `${Math.max(2, storageStats.percent)}%` }} /></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wachtrij: <span className="text-slate-900 dark:text-white font-black">{outbox.length} items</span></div>
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mt-10 mb-4 flex items-center gap-2"><Cpu size={16} className="text-blue-500" /> Actieve Services (Bridges)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueBridges.length > 0 ? uniqueBridges.map(status => {
                    const health = getBridgeStatus(status.last_seen);
                    return (
                        <div key={status.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${health === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {status.bridge_name === 'CNC' ? <Monitor size={20} /> : <Zap size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight italic">{status.bridge_name} BRIDGE</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Service Heartbeat</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    health === 'ONLINE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
                                    health === 'LAGGING' ? 'bg-orange-50 border-orange-200 text-orange-600' : 
                                    'bg-red-50 border-red-200 text-red-600'
                                }`}>
                                    {health}
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="flex items-center gap-1.5"><Clock size={12} /> Laatste Signaal:</span>
                                <span className="font-black">
                                    {status.last_seen ? new Date(status.last_seen.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Nooit'}
                                </span>
                            </div>
                            {health === 'ONLINE' && <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: '100%' }} />}
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 italic text-sm">
                        Geen bridges geregistreerd. Start een Python script om verbinding te maken.
                    </div>
                )}
            </div>

            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mt-10 mb-4 flex items-center gap-2"><BarChart size={16} className="text-blue-500" /> Machine Connectiviteit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodes.map(node => (
                    <div key={node.id} className={`rounded-[2rem] p-5 border transition-all ${node.status === 'ONLINE' ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm' : 'bg-slate-100 dark:bg-slate-900 opacity-75'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight italic">{node.name}</h4><span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 font-mono mt-2 inline-block">{node.ip}</span></div>
                            <div className={`p-3 rounded-2xl shadow-sm ${node.status === 'ONLINE' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>{node.status === 'ONLINE' ? <Wifi size={20} /> : <WifiOff size={20} />}</div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-slate-500">Status</span><span className={`${node.status === 'ONLINE' ? 'text-green-600' : 'text-red-500'}`}>{node.status}</span></div>
                            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase">
                                <span className="text-slate-500">Latentie</span>
                                <span className="text-slate-700 dark:text-slate-300">
                                    {node.latency < 999 ? `${node.latency}s` : '> 999s'} 
                                    {node.lastSeen && <span className="ml-1 opacity-40 text-[8px]">(@{node.lastSeen.toLocaleTimeString()})</span>}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
