import { KEYS, generateId, getNowISO, loadTable, saveTable, outboxUtils } from './core';
import { ToolPreparationRequest } from '../../types';

export const toolPrepService = {
    getToolPrepRequests: async (): Promise<ToolPreparationRequest[]> => {
        return loadTable<ToolPreparationRequest[]>(KEYS.TOOL_PREP_REQUESTS, []);
    },

    getToolPrepRequestById: async (id: string): Promise<ToolPreparationRequest | undefined> => {
        const requests = await toolPrepService.getToolPrepRequests();
        return requests.find(r => r.id === id);
    },

    addToolPrepRequest: async (request: ToolPreparationRequest): Promise<void> => {
        const requests = await toolPrepService.getToolPrepRequests();
        if (!request.id) request.id = generateId();
        requests.push(request);
        await saveTable(KEYS.TOOL_PREP_REQUESTS, requests);
        
        window.dispatchEvent(new CustomEvent(`db:${KEYS.TOOL_PREP_REQUESTS}:updated`, { detail: requests }));
        await outboxUtils.addToOutbox(KEYS.TOOL_PREP_REQUESTS, 'INSERT', request);
    },

    updateToolPrepRequest: async (request: ToolPreparationRequest): Promise<void> => {
        const requests = await toolPrepService.getToolPrepRequests();
        const updated = requests.map(r => r.id === request.id ? request : r);
        await saveTable(KEYS.TOOL_PREP_REQUESTS, updated);
        
        window.dispatchEvent(new CustomEvent(`db:${KEYS.TOOL_PREP_REQUESTS}:updated`, { detail: updated }));
        await outboxUtils.addToOutbox(KEYS.TOOL_PREP_REQUESTS, 'UPDATE', request);
    },

    deleteToolPrepRequest: async (id: string): Promise<void> => {
        const requests = await toolPrepService.getToolPrepRequests();
        const filtered = requests.filter(r => r.id !== id);
        await saveTable(KEYS.TOOL_PREP_REQUESTS, filtered);
        
        window.dispatchEvent(new CustomEvent(`db:${KEYS.TOOL_PREP_REQUESTS}:updated`, { detail: filtered }));
        await outboxUtils.addToOutbox(KEYS.TOOL_PREP_REQUESTS, 'DELETE', { id });
    }
};
