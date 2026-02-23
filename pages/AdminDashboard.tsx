
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, Settings, ArrowRight, BarChart2, RefreshCw, BookOpen, Presentation, Terminal, Shield, Activity, Beaker, Briefcase, Code, Archive, Box, Info, Cpu, Zap, Layers, PlayCircle, ClipboardList, FileJson, LayoutTemplate } from '../icons';
import { useAuth } from '../contexts/AuthContext';
import { Machine, AppModule } from '../types';
import { APP_INFO } from '../services/appInfo';
import { useTable } from '../hooks/useTable';
import { KEYS } from '../services/db/core';

export const AdminDashboard: React.FC = () => {
  const { user, canAccessModule } = useAuth();
  
  // REACTIVE HOOK
  const { data: machines } = useTable<Machine>(KEYS.MACHINES);
  
  // Derived State
  const archivedMachines = useMemo(() => machines.filter(m => m.isArchived), [machines]);

  const SectionHeader = ({ title }: { title: string }) => (
      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 mt-8 first:mt-0">
          {title}
      </h3>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400">Centraal beheer van productie en systeem.</p>
        </div>
        <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">GEREGISTREERD ALS: {user?.name.toUpperCase()}</span>
        </div>
      </div>

      <div>
        <SectionHeader title="Operationeel Beheer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/admin/create-machine" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PlusCircle size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Nieuwe Asset</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Registreer een nieuwe CNC machine, Robot of CMM.
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide">
                    <span>Toevoegen</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            <Link to="/admin/users" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Gebruikers & Rechten</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Beheer accounts, pincodes en toegangsrollen.
                </p>
                <div className="flex items-center text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wide">
                    <span>Beheren</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            {canAccessModule(AppModule.ENERGY) && (
                <Link to="/admin/energy-config" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Zap size={24} className="text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Energie Monitor</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                        Beheer tarieven, limieten en bekijk live verbruik.
                    </p>
                    <div className="flex items-center text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wide">
                        <span>Configureren</span>
                        <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            )}

            <Link to="/admin/cost-report" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Financieel Rapport</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Analyseer reparatiekosten en stilstand.
                </p>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide">
                    <span>Bekijken</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>
        </div>

        <SectionHeader title="Productie Instellingen" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canAccessModule(AppModule.ARTICLES) && (
                <Link to="/admin/templates" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <LayoutTemplate size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Setup Templates</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                        Configureer dynamische invulvelden voor verschillende machinetypes (Freesbank, Draaibank, Robot).
                    </p>
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wide">
                        <span>Beheer Sjablonen</span>
                        <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            )}

            {canAccessModule(AppModule.INVENTORY) && (
                <Link to="/admin/inventory" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Box size={24} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Materieel & Voorraad</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                        Beheer reserveonderdelen en algemene magazijnartikelen.
                    </p>
                    <div className="flex items-center text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wide">
                        <span>Voorraad</span>
                        <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            )}
        </div>

        {archivedMachines.length > 0 && (
            <>
                <SectionHeader title="Gearchiveerde Assets" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedMachines.map(m => (
                        <Link key={m.id} to={`/machine/${m.id}`} className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <Archive size={20} className="text-slate-400" />
                                <div>
                                    <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">{m.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{m.machineNumber}</div>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-slate-400" />
                        </Link>
                    ))}
                </div>
            </>
        )}

        <SectionHeader title="Systeem & Configuratie" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/admin/health" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-teal-100 dark:bg-teal-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Activity size={24} className="text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Systeem Monitor</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Live status van server, bridge en machine verbindingen.
                </p>
                <div className="flex items-center text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wide">
                    <span>Check Status</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            <Link to="/settings" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-slate-100 dark:bg-slate-700/50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Settings size={24} className="text-slate-600 dark:text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Instellingen</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Notificaties, Roosters, Cloud Sync & Backups.
                </p>
                <div className="flex items-center text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wide">
                    <span>Configureren</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            {/* GOLD CARD SHOWCASE LINK */}
            <Link to="/showcase" className="group relative bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/10 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800/50 shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Presentation size={80} className="text-yellow-600" />
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/40 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                    <PlayCircle size={24} className="text-yellow-700 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-1">Systeem Presentatie</h3>
                <p className="text-yellow-700 dark:text-yellow-300/80 text-xs mb-4 min-h-[2.5em]">
                    Start de interactieve showcase modus. Ideaal voor verkoop en demo's.
                </p>
                <div className="flex items-center text-yellow-800 dark:text-yellow-400 text-xs font-black uppercase tracking-wide">
                    <span>Start Demo</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            {user?.id === 'super-admin-ghost' && (
                <>
                    <Link to="/admin/license-config" className="group relative bg-indigo-900 border-2 border-indigo-500 rounded-xl p-6 shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Layers size={100} className="text-white" />
                        </div>
                        <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Shield size={24} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Module & Licentie Beheer</h3>
                        <p className="text-indigo-200 text-xs mb-4 min-h-[2.5em]">
                            Schakel commerciële functies in en beheer klantlicentie status.
                        </p>
                        <div className="flex items-center text-indigo-400 text-xs font-bold uppercase tracking-wide">
                            <span>Beheer Modules</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                    
                    <Link to="/admin/release-guide" className="group relative bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="bg-indigo-100 dark:bg-indigo-900/40 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <ClipboardList size={24} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Release & Installatie</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                            Instructies voor uitrol en updates bij de klant.
                        </p>
                        <div className="flex items-center text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wide">
                            <span>Open Handleiding</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </>
            )}
        </div>

        <SectionHeader title="Informatie & Support" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/admin/help" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="bg-cyan-100 dark:bg-cyan-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen size={24} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Handleiding</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                    Gebruikershandleiding voor operators.
                </p>
                <div className="flex items-center text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wide">
                    <span>Lezen</span>
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            {user?.id === 'super-admin-ghost' && (
                <>
                    <Link to="/admin/simulator" className="group relative bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Beaker size={24} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Test Unit / Simulator</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                            Injecteer test-data in machines zonder fysieke koppeling.
                        </p>
                        <div className="flex items-center text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wide">
                            <span>Open Test Unit</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    <Link to="/admin/super-help" className="group relative bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-700 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-3 right-3">
                            <Shield size={16} className="text-amber-500" />
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-900/40 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Terminal size={24} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Tech Docs</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                            Server installatie, DB Schema's & Python Bridges.
                        </p>
                        <div className="flex items-center text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide">
                            <span>Full Technical Manual</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                    
                    <Link to="/admin/update" className="group relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <RefreshCw size={24} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Systeem Update</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 min-h-[2.5em]">
                            Beheer software versies en updates.
                        </p>
                        <div className="flex items-center text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wide">
                            <span>Check Updates</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </>
            )}
        </div>
      </div>

      <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      <Info size={32} />
                  </div>
                  <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{APP_INFO.NAME}</h4>
                      <p className="text-sm text-slate-500 font-medium">Production Operating System for Industry 4.0</p>
                  </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Cpu size={10}/> Versie</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{APP_INFO.VERSION}</div>
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Terminal size={10}/> Build</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{APP_INFO.BUILD}</div>
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Shield size={10}/> Status</div>
                      <div className="text-sm font-black text-emerald-500 font-mono">STABLE</div>
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={10}/> Author</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{APP_INFO.AUTHOR}</div>
                  </div>
              </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-6 uppercase tracking-[0.3em]">&copy; {APP_INFO.YEAR} {APP_INFO.AUTHOR} &bull; All Rights Reserved</p>
      </div>
    </div>
  );
};
