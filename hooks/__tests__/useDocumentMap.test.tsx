import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDocumentMap } from '../useDocumentMap';
import { ArticleFile } from '../../types';

// GLOBALS MOCKING
const mocks = vi.hoisted(() => {
    return {
        getServerSettings: vi.fn(),
        getDocumentsByIds: vi.fn(),
        resolveFileUrl: vi.fn()
    };
});

vi.mock('../../services/storage', () => ({
    db: {
        getServerSettings: mocks.getServerSettings
    }
}));

vi.mock('../../services/db/documentService', () => ({
    documentService: {
        getDocumentsByIds: mocks.getDocumentsByIds
    }
}));

vi.mock('../../services/sync', () => ({
    SyncService: {
        resolveFileUrl: mocks.resolveFileUrl
    }
}));

vi.mock('../../services/db/core', () => ({
    KEYS: { DOCUMENTS: 'documents' }
}));

const mockFiles = [
    { id: 'file-1', documentId: 'doc-1', name: 'modern_file.pdf', category: 'ART_DOC', size: 100, version: 1, uploadDate: '2023' },
    { id: 'file-2', name: 'legacy_file.pdf', category: 'ART_DOC', size: 200, version: 1, uploadDate: '2023' }, // Legacy without docId
] as any as ArticleFile[];

describe('useDocumentMap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getServerSettings.mockResolvedValue({ url: 'http://my-pb-server' });
        mocks.getDocumentsByIds.mockResolvedValue([
            { id: 'doc-1', url: 'data:image/png;base64,...', name: 'modern_file.pdf' }
        ]);
        mocks.resolveFileUrl.mockImplementation((id: string, name: any, key: string, server: string) => {
            return `${server}/api/files/${key}/${id}/${typeof name === 'string' ? name : name.name}`;
        });
    });

    it('should resolve url via documentId and bulk loader', async () => {
        // Only passing file-1 (modern)
        const { result } = renderHook(() => useDocumentMap([mockFiles[0]]));
        
        // Wait for resolveUrls to finish
        await waitFor(() => {
            expect(result.current.loadingMap['file-1']).toBe(false);
        });

        // Bulk array loader should have been called
        expect(mocks.getDocumentsByIds).toHaveBeenCalledWith(['doc-1']);
        
        // Result mapped to the document url
        expect(result.current.urlMap['file-1']).toBe('data:image/png;base64,...');
    });

    it('should use legacy sync URL resolver when no documentId is provided', async () => {
        // Only passing file-2 (legacy) with parent details
        const { result } = renderHook(() => useDocumentMap([mockFiles[1]], 'parent-id', 'collection-key'));
        
        // Wait for resolveUrls to finish
        await waitFor(() => {
            expect(result.current.loadingMap['file-2']).toBe(false);
        });

        // Bulk loader should NOT have been called (no documentId)
        expect(mocks.getDocumentsByIds).not.toHaveBeenCalled();
        
        // Resolves via legacy resolver
        expect(mocks.resolveFileUrl).toHaveBeenCalledWith('parent-id', 'legacy_file.pdf', 'collection-key', 'http://my-pb-server');
        expect(result.current.urlMap['file-2']).toBe('http://my-pb-server/api/files/collection-key/parent-id/legacy_file.pdf');
    });
});
