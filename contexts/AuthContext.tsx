
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission, AppModule, CommercialModule, SystemSettings, UserRoleDefinition } from '../types';
import { ROLE_PERMISSIONS, db } from '../services/storage';
import { getEnabledAppModules } from '../config/commercialModules';
import { KEYS } from '../services/db/core';

interface AuthContextType {
  user: User | null;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  users: User[];
  roles: UserRoleDefinition[];
  hasPermission: (permission: Permission) => boolean;
  canAccessAsset: (assetId: string) => boolean;
  canAccessModule: (module: AppModule) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GHOST_USER: User = {
    id: 'super-admin-ghost',
    name: 'Super Admin (Ghost)',
    pinCode: '000894',
    role: UserRole.ADMIN,
    permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
    restrictedAccess: false
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRoleDefinition[]>([]);
  const [cachedSettings, setCachedSettings] = useState<SystemSettings>({ companyName: 'Factory Manager', activeModules: [CommercialModule.CORE] });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
      const init = async () => {
          // Haal users, roles en settings op
          const [loadedUsers, loadedRoles, sysSettings] = await Promise.all([
              db.getUsers(),
              db.getRoles(),
              db.getSystemSettings()
          ]);
          
          setUsers(loadedUsers);
          setRoles(loadedRoles);
          setCachedSettings(sysSettings);
          
          const savedUserId = localStorage.getItem('cnc_active_user');
          if (savedUserId === GHOST_USER.id) {
              setUser(GHOST_USER);
          } else if (savedUserId) {
              const freshUser = loadedUsers.find(u => u.id === savedUserId);
              if (freshUser) setUser(freshUser);
          }
      };
      init();

      const handleDbUpdate = async (e: Event) => {
          const customEvent = e as CustomEvent;
          
          // Check of de update relevant is voor Auth (Users, Roles of Settings)
          // Als detail leeg is (legacy full update) of als het specifieke tabellen betreft
          const isRelevant = !customEvent.detail || 
                             (customEvent.type.includes(KEYS.USERS)) ||
                             (customEvent.type.includes(KEYS.ROLES)) ||
                             (customEvent.type.includes(KEYS.SYSTEM_CONFIG));

          if (isRelevant) {
              const [loadedUsers, loadedRoles, sysSettings] = await Promise.all([
                  db.getUsers(),
                  db.getRoles(),
                  db.getSystemSettings()
              ]);
              
              setUsers(loadedUsers);
              setRoles(loadedRoles);
              setCachedSettings(sysSettings);
              
              if (user && user.id !== GHOST_USER.id) {
                  const freshUser = loadedUsers.find(u => u.id === user.id);
                  // Deep compare om onnodige state updates te voorkomen
                  if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(user)) {
                      setUser(freshUser);
                  }
              }
          }
      };

      window.addEventListener('db-updated', handleDbUpdate);
      window.addEventListener(`db:${KEYS.USERS}:updated`, handleDbUpdate);
      window.addEventListener(`db:${KEYS.ROLES}:updated`, handleDbUpdate);
      window.addEventListener(`db:${KEYS.SYSTEM_CONFIG}:updated`, handleDbUpdate);
      
      const handleSettingsChanged = (e: any) => {
          if (e.detail?.settings) setCachedSettings(e.detail.settings);
      };
      window.addEventListener('settings-changed', handleSettingsChanged);

      return () => {
          window.removeEventListener('db-updated', handleDbUpdate);
          window.removeEventListener(`db:${KEYS.USERS}:updated`, handleDbUpdate);
          window.removeEventListener(`db:${KEYS.ROLES}:updated`, handleDbUpdate);
          window.removeEventListener(`db:${KEYS.SYSTEM_CONFIG}:updated`, handleDbUpdate);
          window.removeEventListener('settings-changed', handleSettingsChanged);
      };
  }, [user]);

  const login = async (userId: string) => {
    if (userId === GHOST_USER.id) {
        setUser(GHOST_USER);
        localStorage.setItem('cnc_active_user', GHOST_USER.id);
        return;
    }
    const currentUsers = await db.getUsers();
    const found = currentUsers.find(u => u.id === userId);
    if (found) {
      setUser(found);
      localStorage.setItem('cnc_active_user', found.id);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cnc_active_user');
  };

  const hasPermission = (permission: Permission): boolean => {
      if (!user) return false;
      if (user.id === GHOST_USER.id) return true;

      // 1. Zoek de actieve rol definitie uit de database
      const userRoleDef = roles.find(r => r.id === user.role);

      // 2. Als de rol bestaat, check de permissies daarin (Dynamic RBAC)
      if (userRoleDef) {
          if (userRoleDef.permissions.includes(permission)) return true;
      }

      // 3. Fallback / Legacy: Check of de user directe permissies heeft (override)
      if (user.permissions && user.permissions.includes(permission)) {
          return true;
      }

      // 4. Fallback: Admin heeft altijd alles (voor legacy ADMIN string role)
      if (user.role === UserRole.ADMIN) return true;

      return false;
  };

  const canAccessAsset = (assetId: string): boolean => {
      if (!user) return false;
      if (user.id === GHOST_USER.id) return true;
      
      // Admin rol check (zowel via ID als legacy string)
      const isAdmin = user.role === UserRole.ADMIN || roles.find(r => r.id === user.role)?.name === 'Administrator';
      if (isAdmin) return true;

      if (!user.restrictedAccess) return true;
      return !!user.allowedAssetIds?.includes(assetId);
  };

  const canAccessModule = (module: AppModule): boolean => {
      if (!user) return false;
      if (user.id === GHOST_USER.id) return true;

      const activeModules = cachedSettings.activeModules || [CommercialModule.CORE];
      const enabledAppModules = getEnabledAppModules(activeModules);
      if (!enabledAppModules.includes(module)) return false;

      const isAdmin = user.role === UserRole.ADMIN || roles.find(r => r.id === user.role)?.name === 'Administrator';
      if (isAdmin) return true;

      if (!user.allowedModules) return true;
      return user.allowedModules.includes(module);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, roles, hasPermission, canAccessAsset, canAccessModule }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
