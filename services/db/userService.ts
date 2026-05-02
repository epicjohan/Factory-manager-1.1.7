
import { User, UserRole, UserRoleDefinition, Permission } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, ROLE_PERMISSIONS } from './core';

const DEFAULT_ROLES: UserRoleDefinition[] = [
    {
        id: UserRole.ADMIN,
        name: 'Administrator',
        description: 'Volledige systeemtoegang.',
        isSystem: true,
        color: 'purple',
        permissions: ROLE_PERMISSIONS[UserRole.ADMIN]
    },
    {
        id: UserRole.MANAGER,
        name: 'Productie Manager',
        description: 'Beheer van artikelen, planning en rapportages.',
        isSystem: true,
        color: 'blue',
        permissions: ROLE_PERMISSIONS[UserRole.MANAGER]
    },
    {
        id: UserRole.MAINTENANCE,
        name: 'Technische Dienst',
        description: 'Onderhoud, storingen en machine beheer.',
        isSystem: true,
        color: 'orange',
        permissions: ROLE_PERMISSIONS[UserRole.MAINTENANCE]
    },
    {
        id: UserRole.OPERATOR,
        name: 'Operator',
        description: 'Basis toegang voor machinebediening en registratie.',
        isSystem: true,
        color: 'slate',
        permissions: ROLE_PERMISSIONS[UserRole.OPERATOR]
    }
];

const LEGACY_ROLE_MAP: Record<string, string> = {
    'ADMIN': UserRole.ADMIN,
    'MAINTENANCE': UserRole.MAINTENANCE,
    'OPERATOR': UserRole.OPERATOR,
    'MANAGER': UserRole.MANAGER
};

export const userService = {
    getUsers: async () => {
        let users = await loadTable<User[]>(KEYS.USERS, []);
        let migrated = false;
        users = users.map(u => {
            if (LEGACY_ROLE_MAP[u.role]) {
                migrated = true;
                return { ...u, role: LEGACY_ROLE_MAP[u.role] };
            }
            return u;
        });
        if (migrated) await saveTable(KEYS.USERS, users);
        return users;
    },
    addUser: async (user: User) => { 
        const now = getNowISO();
        (user as any).updated = now;
        (user as any).created = now;
        const items = await userService.getUsers(); 
        items.push(user); 
        await saveTable(KEYS.USERS, items); 
        await outboxUtils.addToOutbox(KEYS.USERS, 'INSERT', user);
    },
    updateUser: async (user: User) => { 
        const now = getNowISO();
        (user as any).updated = now;
        const items = (await userService.getUsers()).map(u => u.id === user.id ? user : u); 
        await saveTable(KEYS.USERS, items); 
        await outboxUtils.addToOutbox(KEYS.USERS, 'UPDATE', user);
    },
    deleteUser: async (id: string) => { 
        const items = (await userService.getUsers()).filter(u => u.id !== id); 
        await saveTable(KEYS.USERS, items); 
        await outboxUtils.addToOutbox(KEYS.USERS, 'DELETE', { id });
    },

    // --- ROLE MANAGEMENT ---

    getRoles: async () => {
        let roles = await loadTable<UserRoleDefinition[]>(KEYS.ROLES, []);
        if (roles.length === 0) {
            // FIX: Op een nieuw device worden rollen NIET meer automatisch aangemaakt
            // en naar PocketBase gestuurd. De admin is verantwoordelijk voor het aanmaken
            // van rollen. We retourneren DEFAULT_ROLES als lokale fallback zodat de UI
            // functioneel blijft, maar zonder ze op te slaan of te syncen.
            return DEFAULT_ROLES;
        } else {
            // Migrate legacy roles
            let migrated = false;
            roles = roles.map(r => {
                if (LEGACY_ROLE_MAP[r.id]) {
                    migrated = true;
                    return { ...r, id: LEGACY_ROLE_MAP[r.id] };
                }
                return r;
            });
            if (migrated) await saveTable(KEYS.ROLES, roles);
        }
        return roles;
    },

    saveRole: async (role: UserRoleDefinition) => {
        const now = getNowISO();
        role.updated = now;
        
        const roles = await userService.getRoles();
        const idx = roles.findIndex(r => r.id === role.id);
        
        let newRoles;
        let action: 'INSERT' | 'UPDATE';

        if (idx !== -1) {
            newRoles = [...roles];
            newRoles[idx] = role;
            action = 'UPDATE';
        } else {
            (role as any).created = now;
            newRoles = [...roles, role];
            action = 'INSERT';
        }

        await saveTable(KEYS.ROLES, newRoles);
        await outboxUtils.addToOutbox(KEYS.ROLES, action, role);
    },

    deleteRole: async (id: string) => {
        const roles = await userService.getRoles();
        const role = roles.find(r => r.id === id);
        if (role?.isSystem) throw new Error("Systeemrollen kunnen niet worden verwijderd.");
        
        const filtered = roles.filter(r => r.id !== id);
        await saveTable(KEYS.ROLES, filtered);
        await outboxUtils.addToOutbox(KEYS.ROLES, 'DELETE', { id });
    }
};
