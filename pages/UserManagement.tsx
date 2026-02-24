
import React, { useEffect, useState, useMemo } from 'react';
import { User, UserRoleDefinition, Permission, Machine, AppModule, AssetTab, CommercialModule, AssetType } from '../types';
import { db, ROLE_DEFAULT_TABS } from '../services/storage';
import { generateId, KEYS } from '../services/db/core';
import { MODULE_GROUPS, ModuleGroupConfig } from '../config/moduleGroups';
import { getEnabledAppModules } from '../config/commercialModules';
import { Trash2, UserPlus, Shield, Wrench, User as UserIcon, ArrowLeft, CheckSquare, Square, Edit, Eye, EyeOff, LayoutGrid, Lock, Layers, List, Monitor, ShieldCheck, Users, Save, Plus } from '../icons';
import { useNavigate } from 'react-router-dom';
import { useTable } from '../hooks/useTable';
import { useNotifications } from '../contexts/NotificationContext';

// Permission Groups for UI
const PERMISSION_GROUPS = [
    {
        label: 'Systeem & Beheer',
        permissions: [Permission.MANAGE_USERS, Permission.MANAGE_MACHINES, Permission.VIEW_FINANCIALS]
    },
    {
        label: 'Productie & Planning',
        permissions: [Permission.UPDATE_MACHINE_STATUS, Permission.MANAGE_SCHEDULE, Permission.CREATE_TICKET, Permission.RESOLVE_TICKET, Permission.USE_TOOLGUARD]
    },
    {
        label: 'PDM & Artikelen',
        permissions: [Permission.PDM_VIEW, Permission.PDM_CREATE, Permission.PDM_EDIT_OWN, Permission.PDM_EDIT_ALL, Permission.PDM_RELEASE]
    },
    {
        label: 'Logistiek & Voorraad',
        permissions: [Permission.MANAGE_INVENTORY]
    }
];

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  // REACTIVE DATA
  const { data: users } = useTable<User>(KEYS.USERS);
  const { data: roles, refresh: refreshRoles } = useTable<UserRoleDefinition>(KEYS.ROLES);
  const { data: machines } = useTable<Machine>(KEYS.MACHINES);
  
  // Initialize default roles if empty
  useEffect(() => {
      if (roles.length === 0) {
          db.getRoles().then(() => refreshRoles());
      }
  }, [roles.length]);

  const [globallyEnabledModules, setGloballyEnabledModules] = useState<AppModule[]>([]);
  
  // Main Tab: USERS or ROLES
  const [activeMainTab, setActiveMainTab] = useState<'USERS' | 'ROLES'>('USERS');
  
  // --- USER EDIT STATE ---
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [userRoleId, setUserRoleId] = useState<string>(''); // References Role ID
  // Permissions are now DERIVED from Role, but we keep custom overrides if needed (future proofing)
  // For now, selecting a role applies that role's permissions
  
  const [restrictedAccess, setRestrictedAccess] = useState(false);
  const [allowedAssetIds, setAllowedAssetIds] = useState<string[]>([]);
  const [allowedModules, setAllowedModules] = useState<AppModule[]>([]);
  const [allowedTabs, setAllowedTabs] = useState<AssetTab[]>([]);
  const [defaultPath, setDefaultPath] = useState<string>('/');

  // --- ROLE EDIT STATE ---
  const [editingRole, setEditingRole] = useState<UserRoleDefinition | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
        const settings = await db.getSystemSettings();
        const activeCommercial = settings.activeModules || [CommercialModule.CORE];
        setGloballyEnabledModules(getEnabledAppModules(activeCommercial));
    };
    loadSettings();
  }, []);

  // --- USER HANDLERS ---

  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setUserName(user.name);
      setPinCode(user.pinCode || ''); 
      setUserRoleId(user.role);
      
      setRestrictedAccess(user.restrictedAccess || false);
      setAllowedAssetIds(user.allowedAssetIds || []);
      setAllowedModules(user.allowedModules || Object.values(AppModule));
      setAllowedTabs(user.allowedTabs || ROLE_DEFAULT_TABS['OPERATOR'] || Object.values(AssetTab));
      setDefaultPath(user.defaultPath || '/');
      setActiveMainTab('USERS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateUser = () => {
      setEditingUser(null);
      setUserName('');
      setPinCode('');
      // Default to Operator role if exists, otherwise first available
      const opRole = roles.find(r => r.name === 'Operator');
      setUserRoleId(opRole ? opRole.id : roles[0]?.id || '');
      
      setRestrictedAccess(false);
      setAllowedAssetIds([]);
      setAllowedModules(Object.values(AppModule)); 
      setAllowedTabs(ROLE_DEFAULT_TABS['OPERATOR']);
      setDefaultPath('/');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !pinCode.trim()) return;
    
    const duplicate = users.find(u => u.pinCode === pinCode && u.id !== editingUser?.id);
    if (duplicate) { alert("Pincode in gebruik"); return; }

    // Look up selected role to get base permissions (snapshot)
    // In Step 3 we will make this dynamic, but for now we snapshot permissions to User object for compat.
    const selectedRoleDef = roles.find(r => r.id === userRoleId);
    const snapshotPermissions = selectedRoleDef ? selectedRoleDef.permissions : [];

    const userDataPart = {
        name: userName, 
        pinCode, 
        role: userRoleId, 
        permissions: snapshotPermissions, 
        restrictedAccess, 
        allowedAssetIds, 
        allowedModules, 
        allowedTabs, 
        defaultPath
    };

    if (editingUser) {
        await db.updateUser({ ...editingUser, ...userDataPart });
        addNotification('SUCCESS', 'Gebruiker Bijgewerkt', `Gegevens van ${userName} opgeslagen.`);
    } else {
        await db.addUser({ id: generateId(), ...userDataPart } as User);
        addNotification('SUCCESS', 'Gebruiker Aangemaakt', `${userName} toegevoegd.`);
    }
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("Gebruiker verwijderen?")) {
      db.deleteUser(id);
    }
  };

  // --- ROLE HANDLERS ---

  const handleEditRole = (role: UserRoleDefinition) => {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description || '');
      setRolePermissions(role.permissions);
  };

  const handleCreateRole = () => {
      const newRole: UserRoleDefinition = {
          id: generateId(),
          name: 'Nieuwe Rol',
          description: '',
          permissions: [],
          isSystem: false,
          color: 'slate'
      };
      setEditingRole(newRole);
      setRoleName(newRole.name);
      setRoleDesc('');
      setRolePermissions([]);
  };

  const handleSaveRole = async () => {
      if (!editingRole || !roleName.trim()) return;
      
      const roleData: UserRoleDefinition = {
          ...editingRole,
          name: roleName,
          description: roleDesc,
          permissions: rolePermissions
      };

      await db.saveRole(roleData);
      setEditingRole(null);
      addNotification('SUCCESS', 'Rol Opgeslagen', `Rol "${roleName}" is bijgewerkt.`);
  };

  const handleDeleteRole = async (id: string) => {
      if (window.confirm("Rol verwijderen? Gebruikers met deze rol vallen terug op beperkte rechten.")) {
          try {
              await db.deleteRole(id);
          } catch (e: any) {
              addNotification('ERROR', 'Fout', e.message);
          }
      }
  };

  const toggleRolePermission = (perm: Permission) => {
      setRolePermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  // --- HELPERS ---

  const toggleModuleAccess = (mod: AppModule) => {
      setAllowedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const toggleTabAccess = (tab: AssetTab) => {
      setAllowedTabs(prev => prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]);
  };

  const filteredAssetTabs = Object.values(AssetTab).filter(t => t !== AssetTab.TOOLS);
  const machinesByType = useMemo(() => {
    const grouped: Record<string, Machine[]> = {
      'CNC Machines': machines.filter(m => m.type === AssetType.CNC),
      'Robots': machines.filter(m => m.type === AssetType.ROBOT),
      'Overig': machines.filter(m => m.type !== AssetType.CNC && m.type !== AssetType.ROBOT)
    };
    return grouped;
  }, [machines]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 mb-2">
                <ArrowLeft size={18} /><span>Terug naar Admin</span>
            </button>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Gebruikers & Rechten</h2>
         </div>
         
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
            <button onClick={() => { setActiveMainTab('USERS'); setEditingUser(null); }} className={`px-6 py-2.5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMainTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500'}`}> <Users size={16} /> Gebruikers </button>
            <button onClick={() => { setActiveMainTab('ROLES'); setEditingRole(null); }} className={`px-6 py-2.5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMainTab === 'ROLES' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-md' : 'text-slate-500'}`}> <ShieldCheck size={16} /> Rollen Beheer </button>
         </div>
      </div>

      {/* --- USERS TAB --- */}
      {activeMainTab === 'USERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
              {/* User List */}
              <div className="lg:col-span-4 space-y-4">
                  <button onClick={handleCreateUser} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all">
                      <UserPlus size={18} /> Nieuwe Gebruiker
                  </button>
                  <div className="space-y-3">
                      {users.map(u => {
                          const roleDef = roles.find(r => r.id === u.role);
                          return (
                              <div key={u.id} onClick={() => handleEditUser(u)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all bg-white dark:bg-slate-800 ${editingUser?.id === u.id ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-700 hover:border-blue-300'}`}>
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-[2rem] flex items-center justify-center font-black text-lg ${editingUser?.id === u.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{u.name.charAt(0)}</div>
                                          <div>
                                              <div className="font-bold text-slate-800 dark:text-white">{u.name}</div>
                                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{roleDef?.name || u.role}</div>
                                          </div>
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100">
                                          <Edit size={16} className="text-slate-400" />
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* User Editor */}
              <div className="lg:col-span-8">
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                      <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">
                              {editingUser ? `Bewerk: ${editingUser.name}` : 'Nieuwe Gebruiker'}
                          </h3>
                          {editingUser && (
                              <button onClick={() => handleDeleteUser(editingUser.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                          )}
                      </div>

                      <form onSubmit={handleSaveUser} className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Naam</label>
                                  <input required type="text" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={userName} onChange={e => setUserName(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Pincode (Login)</label>
                                  <input required type="text" maxLength={8} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white tracking-widest" value={pinCode} onChange={e => setPinCode(e.target.value)} />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rol (Rechtenprofiel)</label>
                                  <select className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={userRoleId} onChange={e => setUserRoleId(e.target.value)}>
                                      {roles.map(r => (
                                          <option key={r.id} value={r.id}>{r.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Startpagina</label>
                                  <select className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={defaultPath} onChange={e => setDefaultPath(e.target.value)}>
                                      <option value="/">Fabriek Overzicht</option>
                                      <option value="/machines">Machine Lijst</option>
                                      <option value="/support">Support Dashboard</option>
                                      <option value="/planner">Planning</option>
                                  </select>
                              </div>
                          </div>

                          {/* Detail Permissions Accordion Style */}
                          <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14}/> Module Toegang</h4>
                              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {MODULE_GROUPS.map(group => group.items.map(item => {
                                      const isEnabled = globallyEnabledModules.includes(item.id);
                                      return (
                                          <div key={item.id} onClick={() => isEnabled && toggleModuleAccess(item.id)} className={`flex items-center gap-2 p-2 rounded-2xl cursor-pointer select-none ${!isEnabled ? 'opacity-40' : allowedModules.includes(item.id) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                              {allowedModules.includes(item.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                              <span className="text-xs font-bold">{item.label}</span>
                                          </div>
                                      );
                                  }))}
                              </div>
                          </div>

                          <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Zichtbare Tabs</h4>
                              <div className="flex flex-wrap gap-2">
                                  {filteredAssetTabs.map(tab => (
                                      <button type="button" key={tab} onClick={() => toggleTabAccess(tab)} className={`px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wide border transition-all ${allowedTabs.includes(tab) ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-white border-slate-200 text-slate-400'}`}>
                                          {tab}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Monitor size={14}/> Asset Toegang</h4>
                                  <button type="button" onClick={() => setRestrictedAccess(!restrictedAccess)} className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${restrictedAccess ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                      {restrictedAccess ? 'Beperkt' : 'Alles'}
                                  </button>
                              </div>
                              {restrictedAccess && (
                                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 max-h-40 overflow-y-auto custom-scrollbar">
                                      {Object.entries(machinesByType).map(([cat, items]) => (
                                          <div key={cat} className="mb-2">
                                              <div className="text-[9px] font-black uppercase text-slate-400 mb-1">{cat}</div>
                                              <div className="flex flex-wrap gap-2">
                                                  {(items as Machine[]).map(m => (
                                                      <button type="button" key={m.id} onClick={() => setAllowedAssetIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} className={`px-2 py-1 rounded text-[10px] font-bold border ${allowedAssetIds.includes(m.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                                          {m.name}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>

                          <div className="pt-6 flex gap-4">
                              <button type="button" onClick={handleCreateUser} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors">Annuleren</button>
                              <button type="submit" className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95">Opslaan</button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* --- ROLES TAB --- */}
      {activeMainTab === 'ROLES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Role List */}
              <div className="lg:col-span-4 space-y-4">
                  <button onClick={handleCreateRole} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all">
                      <ShieldCheck size={18} /> Nieuwe Rol
                  </button>
                  <div className="space-y-3">
                      {roles.map(r => (
                          <div key={r.id} onClick={() => handleEditRole(r)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all bg-white dark:bg-slate-800 ${editingRole?.id === r.id ? 'border-purple-500 shadow-md ring-1 ring-purple-500' : 'border-slate-100 dark:border-slate-700 hover:border-purple-300'}`}>
                              <div className="flex justify-between items-center">
                                  <div>
                                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                          {r.name}
                                          {r.isSystem && <Lock size={12} className="text-slate-400" />}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{r.description || 'Geen beschrijving'}</div>
                                  </div>
                                  <div className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">
                                      {r.permissions.length} Rechten
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Role Editor */}
              <div className="lg:col-span-8">
                  {editingRole ? (
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                          <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">
                                  {editingRole.id ? `Rol: ${editingRole.name}` : 'Nieuwe Rol Definitie'}
                              </h3>
                              {!editingRole.isSystem && editingRole.id && (
                                  <button onClick={() => handleDeleteRole(editingRole.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                              )}
                          </div>

                          <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rol Naam</label>
                                      <input disabled={editingRole.isSystem} type="text" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-60" value={roleName} onChange={e => setRoleName(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Beschrijving</label>
                                      <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium outline-none focus:ring-2 focus:ring-purple-500 dark:text-white text-sm" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} />
                                  </div>
                              </div>

                              <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Shield size={14} className="text-purple-500"/> Permissie Matrix</h4>
                                  
                                  <div className="space-y-6">
                                      {PERMISSION_GROUPS.map(group => (
                                          <div key={group.label} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                              <h5 className="text-[10px] font-black uppercase text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">{group.label}</h5>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  {group.permissions.map(perm => (
                                                      <div key={perm} onClick={() => toggleRolePermission(perm)} className={`flex items-center gap-3 p-2.5 rounded-[2rem] cursor-pointer select-none transition-all ${rolePermissions.includes(perm) ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 shadow-sm' : 'hover:bg-white dark:hover:bg-slate-800'}`}>
                                                          {rolePermissions.includes(perm) ? <CheckSquare size={18} className="text-purple-600"/> : <Square size={18} className="text-slate-300"/>}
                                                          <span className="text-xs font-bold">{perm.replace(/_/g, ' ')}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="pt-6 flex justify-end">
                                  <button onClick={handleSaveRole} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                      <Save size={18} /> Opslaan
                                  </button>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                          <ShieldCheck size={64} className="mb-4" />
                          <p className="font-bold uppercase tracking-widest text-sm">Selecteer een rol om te bewerken</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
