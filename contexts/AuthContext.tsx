
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserRole, Permission, AppModule, CommercialModule, SystemSettings, UserRoleDefinition } from '../types';
import { ROLE_PERMISSIONS, db } from '../services/storage';
import { getEnabledAppModules } from '../config/commercialModules';
import { KEYS } from '../services/db/core';

interface AuthContextType {
    user: User | null;
    login: (userId: string) => Promise<void>;
    // S-01 FIX: loginWithPin centraliseert de PIN-vergelijking in AuthContext.
    // LoginScreen hoeft de Ghost PIN niet meer te kennen — alles verloopt via VITE_GHOST_PIN.
    loginWithPin: (pin: string) => Promise<boolean>;
    logout: () => void;
    users: User[];
    roles: UserRoleDefinition[];
    hasPermission: (permission: Permission) => boolean;
    canAccessAsset: (assetId: string) => boolean;
    canAccessModule: (module: AppModule) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// CLEAN-03: Pin wordt gelezen uit de VITE_GHOST_PIN environment variable.
// Stel dit in via .env.local (staat NIET in Git) zodat de pin niet in de broncode staat.
// Als de env var niet is ingesteld, wordt de standaard fallback-waarde gebruikt.
const GHOST_PIN = (import.meta as any).env?.VITE_GHOST_PIN ?? '000894';

const GHOST_USER: User = {
    id: 'super-admin-ghost',
    name: 'Super Admin (Ghost)',
    pinCode: GHOST_PIN,
    role: UserRole.ADMIN,
    permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
    restrictedAccess: false
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRoleDefinition[]>([]);
    const [cachedSettings, setCachedSettings] = useState<SystemSettings>({ companyName: 'Factory Manager', activeModules: [CommercialModule.CORE] });
    const [user, setUser] = useState<User | null>(null);

    const handleSetUser = (u: User | null) => {
        setUser(u);
        if (u) {
            localStorage.setItem('cnc_active_user', u.id);
            localStorage.setItem('cnc_active_user_full', JSON.stringify(u));
        } else {
            localStorage.removeItem('cnc_active_user');
            localStorage.removeItem('cnc_active_user_full');
        }
    };

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
                handleSetUser(GHOST_USER);
            } else if (savedUserId) {
                const freshUser = loadedUsers.find(u => u.id === savedUserId);
                if (freshUser) handleSetUser(freshUser);
            }
        };
        init();

        const handleDbUpdate = async (e: Event) => {
            const customEvent = e as CustomEvent;

            // Check of de update relevant is voor Auth (Users, Roles of Settings)
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

                const currentUser = userRef.current;
                if (currentUser && currentUser.id !== GHOST_USER.id) {
                    const freshUser = loadedUsers.find(u => u.id === currentUser.id);
                    // Deep compare om onnodige state updates te voorkomen
                    if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                        handleSetUser(freshUser);
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
    }, []);

    // CLEAN-05: useRef om te voorkomen dat de effect opnieuw registreert bij elke user-wijziging
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // AUTO-LOGOUT: Log de gebruiker automatisch uit na inactiviteit.
    // De timeout is configureerbaar via system_config.autoLogoutMinutes (standaard 15 min).
    // Ghost admin is uitgesloten van auto-logout.
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOGOUT_MS = cachedSettings.autoLogoutMinutes
        ? cachedSettings.autoLogoutMinutes * 60 * 1000
        : 15 * 60 * 1000; // Standaard 15 minuten

    useEffect(() => {
        // Niet actief als niemand is ingelogd of als Ghost admin
        if (!user || user.id === GHOST_USER.id) return;
        // Niet actief als autoLogoutMinutes op 0 staat (uitgeschakeld)
        if (cachedSettings.autoLogoutMinutes === 0) return;

        const resetTimer = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                console.log('[AuthContext] Auto-logout na inactiviteit');
                handleSetUser(null);
            }, AUTO_LOGOUT_MS);
        };

        // Track gebruikersactiviteit
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

        // Start de timer
        resetTimer();

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [user, AUTO_LOGOUT_MS]);

    const login = async (userId: string) => {
        if (userId === GHOST_USER.id) {
            handleSetUser(GHOST_USER);
            return;
        }
        const currentUsers = await db.getUsers();
        const found = currentUsers.find(u => u.id === userId);
        if (found) {
            handleSetUser(found);
        }
    };

    // S-01 FIX: Alle PIN-vergelijking zit hier — LoginScreen hoeft de Ghost PIN niet te kennen.
    // GHOST_PIN wordt uitgelezen uit VITE_GHOST_PIN in .env.local (staat niet in Git).
    const loginWithPin = async (pin: string): Promise<boolean> => {
        if (pin === GHOST_PIN) {
            await login(GHOST_USER.id);
            return true;
        }
        const currentUsers = await db.getUsers();
        const found = currentUsers.find(u => u.pinCode === pin);
        if (found) {
            await login(found.id);
            return true;
        }
        return false;
    };

    const logout = () => {
        handleSetUser(null);
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        if (user.id === GHOST_USER.id) return true;

        // 1. Zoek de actieve rol definitie uit de database (Dynamic RBAC)
        const userRoleDef = roles.find((r: UserRoleDefinition) => r.id === user.role);
        if (userRoleDef) {
            if (userRoleDef.permissions.includes(permission)) return true;
        }

        // 2. Fallback: Check directe user permissies (persoonlijke override)
        if (user.permissions && user.permissions.includes(permission)) {
            return true;
        }

        // BUG-07: De legacy 'if (user.role === ADMIN) return true' bypass is verwijderd.
        // Admin-permissies worden correct afgehandeld via de rol-definitie in stap 1.

        return false;
    };

    const canAccessAsset = (assetId: string): boolean => {
        if (!user) return false;
        if (user.id === GHOST_USER.id) return true;

        // BUG-08: Consistente admin-check via de roles lookup
        const isAdmin = user.role === UserRole.ADMIN ||
            !!roles.find((r: UserRoleDefinition) => r.id === user.role && (r.isSystem && r.name === 'Administrator'));
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

        // BUG-08: Consistente admin-check via de roles lookup
        const isAdmin = user.role === UserRole.ADMIN ||
            !!roles.find((r: UserRoleDefinition) => r.id === user.role && r.isSystem && r.name === 'Administrator');
        if (isAdmin) return true;

        if (!user.allowedModules) return true;
        return user.allowedModules.includes(module);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWithPin, logout, users, roles, hasPermission, canAccessAsset, canAccessModule }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
