
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

export const userService = {
    getUsers: async () => {
        return await loadTable<User[]>(KEYS.USERS, []);
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
            // First run migration: Populate DB with default roles
            roles = DEFAULT_ROLES;
            await saveTable(KEYS.ROLES, roles);
            for (const r of roles) {
                await outboxUtils.addToOutbox(KEYS.ROLES, 'INSERT', r);
            }
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
