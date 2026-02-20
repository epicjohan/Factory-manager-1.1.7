
import { Article, ArticleStatus, SetupStatus, SetupVerificationStatus, ArticleFile } from '../../types';
import { KEYS, loadTable, saveTable, outboxUtils, getNowISO, generateId } from './core';

const getCurrentUserName = () => {
    const userJson = localStorage.getItem('cnc_active_user_full');
    if (userJson) {
        try { return JSON.parse(userJson).name; } catch(e) { return 'Unknown User'; }
    }
    return 'Unknown User';
};

const getNextRevision = (currentRev: string): string => {
    if (!currentRev) return 'A';
    const lastChar = currentRev.slice(-1);
    const prefix = currentRev.slice(0, -1);
    
    const charCode = lastChar.charCodeAt(0);
    if (charCode >= 90) { // Z
        return prefix + "AA"; 
    }
    return prefix + String.fromCharCode(charCode + 1);
};

export const articleService = {
    getArticles: () => loadTable<Article[]>(KEYS.ARTICLES, []),
    
    getArticleById: async (id: string) => {
        const items = await articleService.getArticles();
        return items.find(a => a.id === id);
    },

    addArticle: async (a: Article) => { 
        const now = getNowISO();
        a.created = now;
        a.updated = now;
        
        const items = await loadTable<Article[]>(KEYS.ARTICLES, []);
        items.push(a);
        
        await saveTable(KEYS.ARTICLES, items);
        await outboxUtils.addToOutbox(KEYS.ARTICLES, 'INSERT', a);
        
        await outboxUtils.logAudit('CREATE_ARTICLE', getCurrentUserName(), `Artikel aangemaakt: ${a.articleCode} - ${a.name}`);
    },
    
    updateArticle: async (a: Article) => { 
        const now = getNowISO();
        a.updated = now;
        
        const items = await loadTable<Article[]>(KEYS.ARTICLES, []);
        const idx = items.findIndex(x => x.id === a.id);
        
        if (idx !== -1) {
            items[idx] = a;
            await saveTable(KEYS.ARTICLES, items);
            await outboxUtils.addToOutbox(KEYS.ARTICLES, 'UPDATE', a);
        }
    },

    updateArticleStatus: async (id: string, newStatus: ArticleStatus, reason?: string) => {
        const items = await loadTable<Article[]>(KEYS.ARTICLES, []);
        const idx = items.findIndex(x => x.id === id);
        
        if (idx === -1) return;
        const article = items[idx];
        const oldStatus = article.status;

        const isLocked = newStatus === ArticleStatus.RELEASED || newStatus === ArticleStatus.OBSOLETE;
        
        const updatedArticle: Article = {
            ...article,
            status: newStatus,
            isLocked: isLocked,
            updated: getNowISO(),
            updatedBy: getCurrentUserName(),
            auditTrail: [
                {
                    id: generateId(),
                    timestamp: getNowISO(),
                    user: getCurrentUserName(),
                    action: `Status gewijzigd: ${oldStatus} -> ${newStatus}${reason ? ` (${reason})` : ''}`
                },
                ...(article.auditTrail || [])
            ]
        };

        items[idx] = updatedArticle;
        await saveTable(KEYS.ARTICLES, items);
        await outboxUtils.addToOutbox(KEYS.ARTICLES, 'UPDATE', updatedArticle);
        await outboxUtils.logAudit('STATUS_CHANGE', getCurrentUserName(), `Artikel ${article.articleCode} ${article.revision} naar ${newStatus}`);
        
        return updatedArticle;
    },

    createNewRevision: async (sourceId: string, changeReason: string): Promise<string> => {
        const items = await loadTable<Article[]>(KEYS.ARTICLES, []);
        const sourceIdx = items.findIndex(x => x.id === sourceId);
        if (sourceIdx === -1) throw new Error("Artikel niet gevonden");

        const sourceArticle = items[sourceIdx];
        const user = getCurrentUserName();
        const now = getNowISO();

        // 1. Set old article to OBSOLETE
        if (sourceArticle.status === ArticleStatus.RELEASED) {
            const obsoleteArticle = {
                ...sourceArticle,
                status: ArticleStatus.OBSOLETE,
                isLocked: true,
                updated: now,
                updatedBy: user
            };
            items[sourceIdx] = obsoleteArticle;
            await outboxUtils.addToOutbox(KEYS.ARTICLES, 'UPDATE', obsoleteArticle);
        }

        // Mapping van oude naar nieuwe IDs om bestanden correct te koppelen
        const setupIdMap = new Map<string, string>();

        // 2. Create Deep Copy for New Revision
        const newOperations = sourceArticle.operations.map(op => ({
            ...op,
            id: generateId(),
            setups: op.setups.map(setup => {
                const newSetupId = generateId();
                setupIdMap.set(setup.id, newSetupId);
                return {
                    ...setup,
                    id: newSetupId,
                    status: SetupStatus.DRAFT,
                    verificationStatus: SetupVerificationStatus.UNVERIFIED,
                    verifiedBy: undefined,
                    verifiedDate: undefined
                };
            })
        }));

        // Bestanden overdragen
        const newFiles: ArticleFile[] = (sourceArticle.files || []).map(f => ({
            ...f,
            id: generateId(), // Nieuwe IDs voor de nieuwe record-attachements
            setupId: f.setupId ? setupIdMap.get(f.setupId) : undefined,
            lockedBy: undefined, // Locks ALTIJD vrijgeven bij nieuwe revisie
            lockedAt: undefined,
            uploadDate: now,
            uploadedBy: user,
            version: 1 // Start weer bij versie 1 voor de nieuwe revisie
        }));

        const nextRev = getNextRevision(sourceArticle.revision);

        const newArticle: Article = {
            ...sourceArticle,
            id: generateId(),
            revision: nextRev,
            previousRevisionId: sourceArticle.id,
            changeReason: changeReason,
            status: ArticleStatus.DRAFT,
            isLocked: false,
            operations: newOperations,
            files: newFiles,
            created: now,
            createdBy: user,
            updated: now,
            updatedBy: user,
            auditTrail: [{
                id: generateId(),
                timestamp: now,
                user: user,
                action: `Nieuwe revisie ${nextRev} aangemaakt. Reden: ${changeReason}`
            }]
        };

        items.push(newArticle);
        await saveTable(KEYS.ARTICLES, items);
        await outboxUtils.addToOutbox(KEYS.ARTICLES, 'INSERT', newArticle);
        await outboxUtils.logAudit('REVISION_CREATED', user, `Revisie ${nextRev} gemaakt voor ${newArticle.articleCode}`);

        return newArticle.id;
    },
    
    deleteArticle: async (id: string) => { 
        const items = await loadTable<Article[]>(KEYS.ARTICLES, []);
        const toDelete = items.find(x => x.id === id);
        if (toDelete) {
            const filtered = items.filter(x => x.id !== id);
            await saveTable(KEYS.ARTICLES, filtered);
            await outboxUtils.addToOutbox(KEYS.ARTICLES, 'DELETE', { id });
        }
    }
};
