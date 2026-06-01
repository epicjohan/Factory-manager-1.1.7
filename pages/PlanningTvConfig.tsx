
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Plus, Trash2, ArrowLeft, Save, ExternalLink, Copy, Check, Settings, ChevronRight } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { KEYS, loadTable, saveTable, generateId, getNowISO, getCurrentUserName, outboxUtils } from '../services/db/core';
import { PlanningTvGroup, Machine } from '../types';

export const PlanningTvConfig: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PlanningTvGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMachineIds, setEditMachineIds] = useState<string[]>([]);
  const [editScrollInterval, setEditScrollInterval] = useState(15);
  const [editAutoFullscreen, setEditAutoFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: machines } = useTable<Machine>(KEYS.MACHINES);

  // ── Data loading ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTable<PlanningTvGroup[]>(KEYS.PLANNING_TV_GROUPS, []).then(setGroups);
  }, []);

  // Populate edit fields when selection changes
  useEffect(() => {
    const group = groups.find(g => g.id === selectedGroupId);
    if (group) {
      setEditName(group.name);
      setEditMachineIds([...group.machineIds]);
      setEditScrollInterval(group.scrollIntervalSeconds);
      setEditAutoFullscreen(group.autoFullscreen);
    }
  }, [selectedGroupId, groups]);

  // ── Sorted machines ───────────────────────────────────────────────────────────
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => {
      const numA = parseInt(a.machineNumber, 10);
      const numB = parseInt(b.machineNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.machineNumber.localeCompare(b.machineNumber);
    });
  }, [machines]);

  // ── Selected group ────────────────────────────────────────────────────────────
  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) ?? null, [groups, selectedGroupId]);

  // ── Dashboard URL ─────────────────────────────────────────────────────────────
  const getDashboardUrl = (groupId: string) =>
    `${window.location.origin}${window.location.pathname}#/tv-planning/${groupId}`;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    const newGroup: PlanningTvGroup = {
      id: generateId(),
      name: 'Nieuwe Groep',
      machineIds: [],
      scrollIntervalSeconds: 15,
      autoFullscreen: false,
      created: getNowISO(),
      createdBy: getCurrentUserName(),
    };
    const updated = [...groups, newGroup];
    await saveTable(KEYS.PLANNING_TV_GROUPS, updated);
    await outboxUtils.addToOutbox(KEYS.PLANNING_TV_GROUPS, 'INSERT', newGroup);
    setGroups(updated);
    setSelectedGroupId(newGroup.id);
  };

  const handleSaveGroup = async () => {
    if (!selectedGroupId) return;
    const updated = groups.map(g =>
      g.id === selectedGroupId
        ? {
            ...g,
            name: editName,
            machineIds: editMachineIds,
            scrollIntervalSeconds: editScrollInterval,
            autoFullscreen: editAutoFullscreen,
          }
        : g
    );
    await saveTable(KEYS.PLANNING_TV_GROUPS, updated);
    const savedGroup = updated.find(g => g.id === selectedGroupId);
    if (savedGroup) await outboxUtils.addToOutbox(KEYS.PLANNING_TV_GROUPS, 'UPDATE', savedGroup);
    setGroups(updated);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;
    if (!window.confirm(`Weet je zeker dat je "${group.name}" wilt verwijderen?`)) return;
    const updated = groups.filter(g => g.id !== selectedGroupId);
    await saveTable(KEYS.PLANNING_TV_GROUPS, updated);
    await outboxUtils.addToOutbox(KEYS.PLANNING_TV_GROUPS, 'DELETE', { id: selectedGroupId });
    setGroups(updated);
    setSelectedGroupId(null);
  };

  const handleCopyUrl = () => {
    if (!selectedGroupId) return;
    navigator.clipboard.writeText(getDashboardUrl(selectedGroupId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDashboard = () => {
    if (!selectedGroupId) return;
    window.open(getDashboardUrl(selectedGroupId), '_blank');
  };

  const toggleMachine = (machineId: string) => {
    setEditMachineIds(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 space-y-6 pb-20 text-left">
      {/* Back button + Header */}
      <div>
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 mb-2 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Terug naar Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-2xl flex items-center justify-center">
            <Monitor size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">TV Planning Configuratie</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Beheer machinegroepen voor de productievloer TV dashboards.
            </p>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Group List ────────────────────────────────────────────────── */}
        <div className="col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Settings size={16} className="text-slate-400" />
                Dashboard Groepen
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {groups.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <Monitor size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">Geen groepen aangemaakt.</p>
                </div>
              )}
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full flex items-center justify-between px-6 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                    selectedGroupId === group.id
                      ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white">{group.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {group.machineIds.length} machine{group.machineIds.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCreateGroup}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nieuwe Groep
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail Editor ───────────────────────────────────────────── */}
        <div className="col-span-1 lg:col-span-2">
          {!selectedGroup ? (
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Monitor size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Selecteer een groep</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">of maak een nieuwe groep aan</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Groep bewerken</h3>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full">
                  {selectedGroup.id}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Groepsnaam */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                    Groepsnaam
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Bijv. Freesafdeling"
                  />
                </div>

                {/* Machines in groep */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                    Machines in groep
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto">
                    {sortedMachines.length === 0 && (
                      <p className="px-4 py-6 text-xs text-slate-400 text-center">Geen machines gevonden.</p>
                    )}
                    {sortedMachines.map(machine => (
                      <label
                        key={machine.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={editMachineIds.includes(machine.id)}
                          onChange={() => toggleMachine(machine.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 accent-blue-600"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-bold">{machine.machineNumber}</span>
                          <span className="text-slate-400 dark:text-slate-500"> – </span>
                          <span>{machine.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                    {editMachineIds.length} machine{editMachineIds.length !== 1 ? 's' : ''} geselecteerd
                  </p>
                </div>

                {/* Scroll interval */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                    Scroll interval
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={editScrollInterval}
                      onChange={e => setEditScrollInterval(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg min-w-[60px] text-center">
                      {editScrollInterval}s
                    </span>
                  </div>
                </div>

                {/* Auto-fullscreen */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                      Auto-fullscreen
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Dashboard opent automatisch in volledig scherm
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editAutoFullscreen}
                    onClick={() => setEditAutoFullscreen(!editAutoFullscreen)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                      editAutoFullscreen
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                        editAutoFullscreen ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleSaveGroup}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-sm"
                  >
                    <Save size={14} />
                    Opslaan
                  </button>
                  <button
                    onClick={handleOpenDashboard}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Dashboard Openen
                  </button>
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Gekopieerd!' : 'URL Kopiëren'}
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors ml-auto"
                  >
                    <Trash2 size={14} />
                    Verwijderen
                  </button>
                </div>

                {/* URL preview */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Dashboard URL
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">
                    {getDashboardUrl(selectedGroup.id)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
