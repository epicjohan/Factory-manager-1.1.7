
import { SetupTemplate, AssetType } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO } from './core';

const DEFAULT_TEMPLATES: SetupTemplate[] = [
    {
        id: 'template_mill_default',
        name: 'Standaard Freesbank (3-assig)',
        description: 'Basis opspanning voor verticale bewerkingscentra.',
        assetType: AssetType.CNC,
        isDefault: true,
        fields: [
            { key: 'fixture_type', label: 'Type Spanmiddel', type: 'select', options: ['Machineklem', '3-Klauw', 'Magneetplaat', 'Vacuüm', 'Custom Mal'] },
            { key: 'origin', label: 'Nulpunt (G54)', type: 'text', defaultValue: 'Links-Achter' },
            { key: 'stop_x', label: 'Aanslag X', type: 'text' },
            { key: 'stop_y', label: 'Aanslag Y', type: 'text' },
            { key: 'clamping_torque', label: 'Aandraaimoment', type: 'number', unit: 'Nm', defaultValue: 40 },
            { key: 'instructions', label: 'Opspan Instructies', type: 'textarea' }
        ]
    },
    {
        id: 'template_turn_default',
        name: 'Standaard Draaibank',
        description: 'Opspanning voor 2-assige draaibanken.',
        assetType: AssetType.CNC,
        isDefault: true,
        fields: [
            { key: 'chuck_type', label: 'Klauwplaat Type', type: 'select', options: ['Hainbuch', 'Kitagawa 3-Klauw', 'Collet'] },
            { key: 'jaws_type', label: 'Type Bekken', type: 'select', options: ['Harde Bekken', 'Zachte Bekken (Uitgedraaid)', 'Klauwen'] },
            { key: 'clamping_pressure', label: 'Spandruk', type: 'number', unit: 'bar', defaultValue: 20 },
            { key: 'stick_out', label: 'Materiaal Uitsteeklengte', type: 'number', unit: 'mm' },
            { key: 'z_zero_offset', label: 'Z-Nulpunt Verrekening', type: 'number', unit: 'mm' },
            { key: 'tailstock', label: 'Gebruik Tegenspil/Center', type: 'boolean', defaultValue: false }
        ]
    },
    {
        id: 'template_robot_default',
        name: 'Robotcel Pallet',
        description: 'Configuratie voor robotbelading.',
        assetType: AssetType.ROBOT,
        isDefault: true,
        fields: [
            { key: 'pallet_id', label: 'Pallet Nummer', type: 'text' },
            { key: 'grid_position', label: 'Grid Positie', type: 'text', defaultValue: '1-1' },
            { key: 'gripper_type', label: 'Grijper Type', type: 'select', options: ['2-Vinger', '3-Vinger', 'Vacuüm', 'Magneet'] },
            { key: 'stack_height', label: 'Stapelhoogte', type: 'number', unit: 'mm' }
        ]
    }
];

export const templateService = {
    getTemplates: async () => {
        let templates = await loadTable<SetupTemplate[]>(KEYS.SETUP_TEMPLATES, []);
        if (templates.length === 0) {
            templates = DEFAULT_TEMPLATES;
            await saveTable(KEYS.SETUP_TEMPLATES, templates);
        }
        return templates;
    },

    getTemplateById: async (id: string) => {
        const templates = await templateService.getTemplates();
        return templates.find(t => t.id === id);
    },

    saveTemplate: async (tpl: SetupTemplate) => {
        const now = getNowISO();
        tpl.updated = now;
        
        const templates = await templateService.getTemplates();
        const idx = templates.findIndex(t => t.id === tpl.id);
        
        let newTemplates;
        let action: 'INSERT' | 'UPDATE';

        if (idx !== -1) {
            newTemplates = [...templates];
            newTemplates[idx] = tpl;
            action = 'UPDATE';
        } else {
            newTemplates = [...templates, tpl];
            action = 'INSERT';
        }

        await saveTable(KEYS.SETUP_TEMPLATES, newTemplates);
        await outboxUtils.addToOutbox(KEYS.SETUP_TEMPLATES, action, tpl);
    },

    deleteTemplate: async (id: string) => {
        const templates = await templateService.getTemplates();
        const filtered = templates.filter(t => t.id !== id);
        await saveTable(KEYS.SETUP_TEMPLATES, filtered);
        await outboxUtils.addToOutbox(KEYS.SETUP_TEMPLATES, 'DELETE', { id });
    }
};
