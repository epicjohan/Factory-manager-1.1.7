import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDocumentCategories } from '../useDocumentCategories';
import { db } from '../../services/storage';
import { DocumentCategory } from '../../types';

// GLOBALS MOCKING
const mocks = vi.hoisted(() => {
    return {
        getSystemSettings: vi.fn(),
        getDocumentCategories: vi.fn(),
    };
});

vi.mock('../../services/storage', () => ({
    db: {
        getSystemSettings: mocks.getSystemSettings,
        getDocumentCategories: mocks.getDocumentCategories
    }
}));

const mockCategories: DocumentCategory[] = [
    { id: '1', name: 'Art Doc', code: 'ART_DOC', isSystem: false, applicableTo: 'ARTICLE', icon: 'FileText', color: 'text-blue-500' },
    { id: '2', name: 'Machine Doc', code: 'MACH_DOC', isSystem: false, applicableTo: 'MACHINE', icon: 'FileText', color: 'text-red-500' },
    { id: '3', name: 'Setup Doc', code: 'SETUP_DOC', isSystem: false, applicableTo: 'SETUP', icon: 'FileText', color: 'text-green-500' },
    { id: '4', name: 'Both Doc', code: 'BOTH_DOC', isSystem: false, applicableTo: 'BOTH', icon: 'FileText', color: 'text-yellow-500' },
    { id: '5', name: 'CAM File', code: 'CAM', isSystem: false, applicableTo: 'ALL', icon: 'FileCode', color: 'text-purple-500' }
];

describe('useDocumentCategories', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getDocumentCategories.mockResolvedValue(mockCategories);
    });

    it('should correctly filter categories based on applicableTo="ARTICLE"', async () => {
        const { result } = renderHook(() => useDocumentCategories({ applicableTo: 'ARTICLE' }));
        
        // Wait for async load implementation via useEffect -> db.getSystemSettings()
        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        const codes = result.current.categories.map(c => c.code);
        // "ARTICLE", "BOTH" and "ALL" should be present, "MACHINE" and "SETUP" excluded
        expect(codes).toContain('ART_DOC');
        expect(codes).toContain('BOTH_DOC');
        expect(codes).toContain('CAM');
        expect(codes).not.toContain('MACH_DOC');
        expect(codes).not.toContain('SETUP_DOC');
    });

    it('should exclude explicitly excluded categories based on excludedCategories array', async () => {
        const { result } = renderHook(() => useDocumentCategories({ excludedCategories: ['CAM', 'BOTH_DOC'] }));
        
        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        const codes = result.current.categories.map(c => c.code);
        expect(codes).not.toContain('CAM');
        expect(codes).not.toContain('BOTH_DOC');
        
        // As no applicableTo was passed, the remaining ones should be there
        expect(codes).toContain('ART_DOC');
        expect(codes).toContain('MACH_DOC');
    });
});
