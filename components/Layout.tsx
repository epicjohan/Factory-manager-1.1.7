
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/storage';
import { loadTable, KEYS } from '../services/db/core'; 
import { VersionManager } from '../services/versionManager';
import { APP_INFO } from '../services/appInfo';
import { TeamsSupportModal } from './TeamsSupportModal';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationCenter } from './NotificationCenter';
import { ToastContainer } from './ToastContainer';
import { OutboxManager } from './OutboxManager';
import { UserProfileModal } from './layout/UserProfileModal';
import { MODULE_GROUPS } from '../config/moduleGroups';
import { UserRole, SupportStatus, SupportType, AssetType, AppModule } from '../types';

// Layout Components
import { Sidebar } from './layout/Sidebar';
import { OfflineBanner } from './layout/OfflineBanner';
import { UpdateBanner } from './layout/UpdateBanner';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, canAccessModule } = useAuth();
  const { theme, toggleTheme, setThemeExplicit, setDarkFlavorExplicit, setLightFlavorExplicit } = useTheme();
  const { notifications } = useNotifications();
  
  // UI State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [brandName, setBrandName] = useState(APP_INFO.NAME);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  
  // Modals
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [showOutbox, setShowOutbox] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // System State
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'OFFLINE' | 'SYNCING' | 'DEMO' | 'LIVE'>('ONLINE');
  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(null);
  const [showCriticalOfflineBar, setShowCriticalOfflineBar] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);

  // Data Counters
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [pendingSupport, setPendingSupport] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState(0);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  useEffect(() => {
      const init = async () => {
          const meta = await loadTable<any>(KEYS.METADATA, {});
          const sysSettings = await db.getSystemSettings();
          const machines = await db.getMachines(true);
          
          setAllMachines(machines);
          setIsDemo(!!meta.isDemoMode);
          setOutboxCount((await db.getOutbox()).length);

          const checkUpdate = async () => {
              if (user?.role === UserRole.ADMIN) {
                  const mismatch = await VersionManager.checkVersionMismatch();
                  setHasUpdate(mismatch);
              }
          };
          checkUpdate();

          if (sysSettings.companyName) setBrandName(sysSettings.companyName);
          if (sysSettings.logoUrl) setBrandLogo(sysSettings.logoUrl);

          const handleOutbox = async () => {
              setOutboxCount((await db.getOutbox()).length);
          };
          window.addEventListener('outbox-changed', handleOutbox);
          window.addEventListener(`db:${KEYS.SYSTEM_CONFIG}:updated`, checkUpdate);

          const pollRequests = async () => {
              const all = await db.getSupportRequests();
              setPendingSupport(all.filter(r => r.type !== SupportType.QUESTION && r.status === SupportStatus.PENDING).length);
              const questions = all.filter(r => r.type === SupportType.QUESTION && r.status === SupportStatus.PENDING);
              setPendingQuestions((user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN) ? questions.length : questions.filter(r => r.requester === user?.name).length);
          };
          pollRequests();
          const interval = setInterval(pollRequests, 10000);

          return { handleOutbox, interval, checkUpdate };
      };

      const handleResize = () => { setIsCollapsed(window.innerWidth < 1024); };
      handleResize();
      window.addEventListener('resize', handleResize);

      const handleConnection = (e: any) => { 
          if (e.detail?.status) {
              setConnectionStatus(e.detail.status); 
          }
      };
      window.addEventListener('connection-status-change', handleConnection);

      const cleanupPromise = init();

      return () => { 
          window.removeEventListener('resize', handleResize); 
          window.removeEventListener('connection-status-change', handleConnection);
          cleanupPromise.then(res => {
              if (res) {
                window.removeEventListener('outbox-changed', res.handleOutbox);
                window.removeEventListener(`db:${KEYS.SYSTEM_CONFIG}:updated`, res.checkUpdate);
                clearInterval(res.interval);
              }
          });
      };
  }, [user]);

  // S-02 FIX: Pas het thema en styling-smaak toe wanneer de ingelogde gebruiker een eigen voorkeur heeft in zijn profiel
  useEffect(() => {
     if (user) {
         if (user.theme && user.theme !== theme) {
             setThemeExplicit(user.theme);
         }
         // Doorsturen actieve smaken. Undefined zorgt ervoor dat ThemeContext netjes terugvalt op SystemSettings
         setDarkFlavorExplicit(user.preferredDarkStyle);
         setLightFlavorExplicit(user.preferredLightStyle);
     }
  }, [user?.id, user?.theme, user?.preferredDarkStyle, user?.preferredLightStyle]);

  // S-02 FIX: Wrapper voor de thema-knop, zodat de wijziging lokaal & centraal in PocketBase (voor de user) opgeslagen wordt
  const handleThemeToggle = async () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      toggleTheme(); // Directe visuele update
      
      if (user && user.id !== 'super-admin-ghost') {
          try {
              await db.updateUser({ ...user, theme: newTheme });
          } catch (e) {
              console.error("Kon thema voorkeur niet opslaan naar de server", e);
          }
      }
  };

  // Connectivity Warning Logic
  useEffect(() => {
    if (connectionStatus === 'OFFLINE') {
        if (!offlineStartTime) setOfflineStartTime(Date.now());
    } else {
        setOfflineStartTime(null);
        setShowCriticalOfflineBar(false);
    }
  }, [connectionStatus]);

  useEffect(() => {
      if (offlineStartTime) {
          const interval = setInterval(() => {
              const elapsed = (Date.now() - offlineStartTime) / 1000;
              if (elapsed > 60) {
                  setShowCriticalOfflineBar(true);
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [offlineStartTime]);

  const filteredModuleGroups = useMemo(() => {
    return MODULE_GROUPS.map(group => {
        const filteredItems = group.items.filter(item => {
            if (!canAccessModule(item.id)) return false;
            if (user?.restrictedAccess && user.allowedAssetIds) {
                const assetMap: Record<AppModule, AssetType> = {
                    [AppModule.MACHINES]: AssetType.CNC,
                    [AppModule.ROBOTS]: AssetType.ROBOT,
                    [AppModule.CMM]: AssetType.CMM,
                    [AppModule.CLIMATE]: AssetType.CLIMATE,
                } as any;
                const targetType = assetMap[item.id];
                if (targetType) {
                    const hasAssetInType = allMachines.some(m => user.allowedAssetIds!.includes(m.id) && m.type === targetType);
                    if (!hasAssetInType) return false;
                }
            }
            return true;
        });
        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);
  }, [user, allMachines, canAccessModule]);

  // Favorieten state — opgeslagen per user (Ghost user: localStorage, overige: database)
  const [ghostFavorites, setGhostFavorites] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('fm_ghost_favorites') || '[]'); } catch { return []; }
  });
  const [ghostDefaultPage, setGhostDefaultPage] = useState<string>(() => {
      return localStorage.getItem('fm_ghost_default_page') || '/';
  });

  // Lokale override state voor reguliere users — zorgt voor onmiddellijke UI-update
  const [userFavorites, setUserFavorites] = useState<string[]>(user?.favoriteModules || []);

  // Sync lokale state als de user wisselt of als AuthContext refresht
  useEffect(() => {
      if (user && user.id !== 'super-admin-ghost') {
          setUserFavorites(user.favoriteModules || []);
      }
  }, [user]);

  const favoriteModulePaths = useMemo(() => {
      if (user?.id === 'super-admin-ghost') return ghostFavorites;
      return userFavorites;
  }, [user, ghostFavorites, userFavorites]);

  const defaultPagePath = useMemo(() => {
      if (user?.id === 'super-admin-ghost') return ghostDefaultPage || '/';
      return user?.defaultPath || '/';
  }, [user, ghostDefaultPage]);

  const handleToggleFavorite = async (path: string) => {
      if (!user) return;
      
      const current = user.id === 'super-admin-ghost' ? ghostFavorites : userFavorites;
      let updated: string[];
      
      if (current.includes(path)) {
          updated = current.filter(p => p !== path);
      } else {
          if (current.length >= 5) return; // Max 5 favorieten
          updated = [...current, path];
      }
      
      if (user.id === 'super-admin-ghost') {
          setGhostFavorites(updated);
          localStorage.setItem('fm_ghost_favorites', JSON.stringify(updated));
      } else {
          // Onmiddellijke UI update
          setUserFavorites(updated);
          const updatedUser = { ...user, favoriteModules: updated };
          localStorage.setItem('cnc_active_user_full', JSON.stringify(updatedUser));
          try {
              await db.updateUser(updatedUser);
          } catch (e) {
              console.error('Kon favorieten niet opslaan', e);
              // Rollback bij fout
              setUserFavorites(current);
          }
      }
  };

  const handleSetDefaultPage = async (path: string) => {
      if (!user) return;
      
      // Toggle: als het al de default is, reset naar '/'
      const newDefault = (user.id === 'super-admin-ghost' ? ghostDefaultPage : user.defaultPath) === path ? '/' : path;
      
      if (user.id === 'super-admin-ghost') {
          setGhostDefaultPage(newDefault);
          localStorage.setItem('fm_ghost_default_page', newDefault);
      } else {
          const updatedUser = { ...user, defaultPath: newDefault };
          try {
              await db.updateUser(updatedUser);
          } catch (e) {
              console.error('Kon default pagina niet opslaan', e);
          }
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      
      <Sidebar 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          brandName={brandName}
          brandLogo={brandLogo}
          moduleGroups={filteredModuleGroups}
          canAccessModule={canAccessModule}
          user={user}
          logout={logout}
          theme={theme}
          toggleTheme={handleThemeToggle}
          onShowTeams={() => setShowTeamsModal(true)}
          onShowNotif={() => setShowNotifCenter(true)}
          onShowOutbox={() => setShowOutbox(true)}
          onShowProfile={() => setShowUserProfile(true)}
          unreadNotifications={unreadNotifications}
          pendingSupport={pendingSupport}
          pendingQuestions={pendingQuestions}
          connectionStatus={connectionStatus}
          isDemo={isDemo}
          outboxCount={outboxCount}
          favoriteModulePaths={favoriteModulePaths}
          onToggleFavorite={handleToggleFavorite}
          defaultPagePath={defaultPagePath}
          onSetDefaultPage={handleSetDefaultPage}
      />

      <main className="flex-1 overflow-auto relative w-full">
        <OfflineBanner show={showCriticalOfflineBar} />
        <UpdateBanner show={hasUpdate} />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
        </div>
      </main>

      {/* GLOBAL MODALS */}
      <TeamsSupportModal isOpen={showTeamsModal} onClose={() => setShowTeamsModal(false)} />
      <NotificationCenter isOpen={showNotifCenter} onClose={() => setShowNotifCenter(false)} />
      <OutboxManager isOpen={showOutbox} onClose={() => setShowOutbox(false)} />
      <UserProfileModal isOpen={showUserProfile} onClose={() => setShowUserProfile(false)} user={user} />
      <ToastContainer />
    </div>
  );
};
