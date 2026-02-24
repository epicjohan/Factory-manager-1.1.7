import { DMSDocument } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, generateId } from './core';

const getCurrentUserName = () => {
    const userJson = localStorage.getItem('cnc_active_user_full');
    if (userJson) {
        try { return JSON.parse(userJson).name; } catch (e) { return 'Unknown User'; }
    }
    return 'Unknown User';
};

export const documentService = {
    getDocuments: () => loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []),

    getDocumentById: async (id: string) => {
        const items = await documentService.getDocuments();
        return items.find(d => d.id === id);
    },

    getDocumentsByIds: async (ids: string[]) => {
        const items = await documentService.getDocuments();
        return items.filter(d => ids.includes(d.id));
    },

    addDocumentFromBase64: async (name: string, type: string, base64Url: string, size?: number): Promise<DMSDocument> => {
        const now = getNowISO();
        const items = await loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []);

        // Bepaal volgend documentnummer (DOC-YYYY-XXXX)
        const currentYear = new Date().getFullYear().toString();
        const currentDocsThisYear = items.filter(d => d.documentNumber?.includes(currentYear)).length;
        const nextNum = (currentDocsThisYear + 1).toString().padStart(4, '0');
        const documentNumber = `DOC-${currentYear}-${nextNum}`;

        const doc: DMSDocument = {
            id: generateId(),
            documentNumber,
            name,
            type,
            size,
            url: base64Url,
            uploadedBy: getCurrentUserName(),
            uploadDate: now,
            isSynced: false
        };

        items.push(doc);
        await saveTable(KEYS.DOCUMENTS, items);

        // Let PocketBase sync handle the actual file upload conversion
        await outboxUtils.addToOutbox(KEYS.DOCUMENTS, 'INSERT', doc);

        return doc;
    },

    deleteDocument: async (id: string) => {
        const items = await loadTable<DMSDocument[]>(KEYS.DOCUMENTS, []);
        const idx = items.findIndex(x => x.id === id);

        if (idx !== -1) {
            const removedDoc = items[idx];
            items.splice(idx, 1);
            await saveTable(KEYS.DOCUMENTS, items);
            await outboxUtils.addToOutbox(KEYS.DOCUMENTS, 'DELETE', removedDoc);
        }
    }
};
