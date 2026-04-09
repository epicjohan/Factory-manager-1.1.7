
import { AssetEnergyConfig } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, getCurrentUserName } from './core';

export const energyService = {
    // ASSET ENERGY CONFIGS
    getAllConfigs: () => loadTable<AssetEnergyConfig[]>(KEYS.ASSET_ENERGY_CONFIGS, []),
    
    getConfigForMachine: async (machineId: string) => {
        const configs = await loadTable<AssetEnergyConfig[]>(KEYS.ASSET_ENERGY_CONFIGS, []);
        return configs.find(c => c.machineId === machineId);
    },

    saveConfig: async (config: AssetEnergyConfig) => {
        const now = getNowISO();
        config.updated = now;
        
        const configs = await loadTable<AssetEnergyConfig[]>(KEYS.ASSET_ENERGY_CONFIGS, []);
        const idx = configs.findIndex(c => c.id === config.id);
        
        let newConfigs;
        let action: 'INSERT' | 'UPDATE';

        if (idx !== -1) {
            // Update
            newConfigs = [...configs];
            newConfigs[idx] = config;
            action = 'UPDATE';
        } else {
            // Create
            (config as any).created = now;
            newConfigs = [...configs, config];
            action = 'INSERT';
        }

        await saveTable(KEYS.ASSET_ENERGY_CONFIGS, newConfigs);
        await outboxUtils.addToOutbox(KEYS.ASSET_ENERGY_CONFIGS, action, config);
        
        await outboxUtils.logAudit('ENERGY_CONFIG', getCurrentUserName(), `Sensor configuratie opgeslagen voor machine ${config.machineId}`);
    },

    deleteConfig: async (id: string) => {
        const configs = await loadTable<AssetEnergyConfig[]>(KEYS.ASSET_ENERGY_CONFIGS, []);
        const filtered = configs.filter(c => c.id !== id);
        await saveTable(KEYS.ASSET_ENERGY_CONFIGS, filtered);
        await outboxUtils.addToOutbox(KEYS.ASSET_ENERGY_CONFIGS, 'DELETE', { id });
    }
};
