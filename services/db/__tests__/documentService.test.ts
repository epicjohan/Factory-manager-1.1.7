import { describe, it, expect, beforeEach, vi } from 'vitest';
import { documentService } from '../documentService';
import { loadTable, saveTable, KEYS } from '../core';

describe('Document Service (DMS)', () => {
    
    beforeEach(async () => {
        // Clear all relevant DB tables via saveTable before each test
        await saveTable(KEYS.DOCUMENTS, []);
        await saveTable(KEYS.ARTICLES, []);
        await saveTable(KEYS.OUTBOX, []);
    });

    it('should safely construct and return an initially empty array of documents', async () => {
        const docs = await documentService.getDocuments();
        expect(docs).toBeInstanceOf(Array);
        expect(docs).toHaveLength(0);
    });

    it('should add a document using addDocumentFromBase64', async () => {
        // Run: Creating a document
        const createdDoc = await documentService.addDocumentFromBase64(
            'Test_Drawing.pdf',
            'DRAWING',
            'data:application/pdf;base64,JVBERi0xLjQK...',
            1024
        );
        
        // Assertions: 
        expect(createdDoc.id).toBeDefined();
        // The first DOC- should include the current year and '0001'
        const currentYear = new Date().getFullYear().toString();
        expect(createdDoc.documentNumber).toContain(`DOC-${currentYear}-0001`);
        expect(createdDoc.name).toBe('Test_Drawing.pdf');
        expect(createdDoc.type).toBe('DRAWING');
        expect(createdDoc.size).toBe(1024);
        expect(createdDoc.isSynced).toBe(false);

        // Fetch it back to prove DB stored it natively
        const docs = await documentService.getDocuments();
        expect(docs).toHaveLength(1);
        expect(docs[0].id).toBe(createdDoc.id);
    });

    it('should accurately delete a document and remove it from DB', async () => {
        // Setup
        const doc = await documentService.addDocumentFromBase64('DeleteMe.pdf', 'DRAWING', '', 500);
        expect((await documentService.getDocuments()).length).toBe(1);

        // Run Deletion
        await documentService.deleteDocument(doc.id);

        // Verify
        const verifyDocs = await documentService.getDocuments();
        expect(verifyDocs).toHaveLength(0);
    });

    it('should properly identify orphaned documents (not linked to an active article)', async () => {
        // Create 2 Docs
        const doc1 = await documentService.addDocumentFromBase64('Orphan.pdf', 'DRAWING', '', 100);
        const doc2 = await documentService.addDocumentFromBase64('Retained.pdf', 'MODEL', '', 100);

        // Create an Article that uses doc2 but NOT doc1
        // Note: we inject a fake article with files linking to doc2
        const dummyArticle = {
            id: 'article123',
            articleCode: 'A-100',
            name: 'Dummy',
            status: 'DRAFT',
            files: [
                { id: 'f1', documentId: doc2.id }
            ]
        };
        await saveTable(KEYS.ARTICLES, [dummyArticle]);

        // Run orphaned check
        const orphaned = await documentService.getOrphanedDocuments();

        // Verification
        expect(orphaned).toHaveLength(1);
        expect(orphaned[0].id).toBe(doc1.id);
        expect(orphaned[0].name).toBe('Orphan.pdf');
    });

    it('should correctly filter searches by name and documentNumber', async () => {
        await documentService.addDocumentFromBase64('Instruction_Manual_V1.pdf', 'OTHER', '', 30);
        await documentService.addDocumentFromBase64('Cad_File_A.step', 'MODEL', '', 30);
        
        // Search "manual"
        const results1 = await documentService.searchDocuments('manual');
        expect(results1).toHaveLength(1);
        expect(results1[0].name).toBe('Instruction_Manual_V1.pdf');

        // Search "cad"
        const results2 = await documentService.searchDocuments('Cad');
        expect(results2).toHaveLength(1);
        expect(results2[0].name).toBe('Cad_File_A.step');
    });
});
