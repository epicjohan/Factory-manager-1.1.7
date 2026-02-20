
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Machine } from '../types';
import { Activity, Database, Zap, ImageIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SyncService } from '../services/sync';
import { db } from '../services/storage';
import { KEYS } from '../services/db/core';

interface MachineCardProps {
  machine: Machine;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine }) => {
  const [isGlowing, setIsGlowing] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
      const load = async () => {
          const cfg = await db.getServerSettings();
          setServerUrl(cfg.url);
      };
      load();

      if (machine.lastRemoteUpdate) {
          const diff = Date.now() - machine.lastRemoteUpdate;
          if (diff < 3000) {
              setIsGlowing(true);
              const timer = setTimeout(() => setIsGlowing(false), 3000);
              return () => clearTimeout(timer);
          }
      }
  }, [machine.lastRemoteUpdate]);

  const imageUrl = SyncService.resolveFileUrl(machine.id, machine.image, KEYS.MACHINES, serverUrl);

  return (
    <Link to={`/machine/${machine.id}`} className="block group">
      <div className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border-2 transform hover:-translate-y-1 relative ${isGlowing ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.02]' : 'border-transparent dark:border-slate-700'}`}>
        
        {isGlowing && (
            <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                <Zap size={8} fill="currentColor" /> LIVE UPDATE
            </div>
        )}

        <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={machine.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                <ImageIcon size={48} />
            </div>
          )}
          <div className="absolute top-3 right-3">
             <StatusBadge status={machine.status} showIcon={false} className="shadow-lg" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
             <h3 className="text-white font-bold text-lg truncate" title={machine.name}>{machine.name}</h3>
             <p className="text-blue-400 text-sm font-black font-mono tracking-widest uppercase">{machine.machineNumber}</p>
          </div>
        </div>
        
        <div className="p-4 flex items-center justify-between text-slate-600 dark:text-slate-400">
           <div className="flex items-center gap-2 text-sm font-medium">
             <Database size={16} className="text-slate-400 shrink-0" />
             <span>{machine.tankCapacity || 0}L Tank</span>
           </div>
           <div className="flex items-center gap-2 text-sm text-blue-500 group-hover:text-blue-400 font-bold transition-colors">
             Details <Activity size={14} className="shrink-0" />
           </div>
        </div>
      </div>
    </Link>
  );
};
