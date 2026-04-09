/**
 * D-05 FIX: Gecentraliseerde hook voor document-categorieën.
 * Vervangt dubbele categorie-loading in SetupProgTab.tsx en SleekDocumentList.tsx.
 * 
 * Laadt categorieën eenmalig uit SystemSettings en biedt:
 * - categories: gefilterde lijst
 * - getCategoryByCode: naam + kleur lookup
 * - getRoleIcon: JSX icon resolver
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DocumentCategory } from '../types';
import { db } from '../services/storage';

// Icon imports — dezelfde set als voorheen in SleekDocumentList en SetupProgTab
import {
    FileText, Camera, Hammer, Image, Table,
    ClipboardList, Ruler, BarChart, FileCode,
    Terminal, Archive, Box
} from '../icons';
import React from 'react';

// Default fallback als er geen settings geladen zijn
const DEFAULT_CATEGORIES: DocumentCategory[] = [
    { id: '1', name: 'Document', code: 'OTHER', isSystem: true, applicableTo: 'BOTH', icon: 'FileText', color: 'text-slate-500' }
];

interface UseDocumentCategoriesOptions {
    /** Filter categorieën op basis van waar ze gebruikt worden */
    applicableTo?: 'ARTICLE' | 'SETUP' | 'MACHINE' | 'BOTH' | 'ALL';
    /** Categorieën uitsluiten op code (bijv. ['CAM', 'NC']) */
    excludedCategories?: string[];
}

export const useDocumentCategories = (options: UseDocumentCategoriesOptions = {}) => {
    const { applicableTo, excludedCategories = [] } = options;
    const [allCategories, setAllCategories] = useState<DocumentCategory[]>(DEFAULT_CATEGORIES);
    const [loaded, setLoaded] = useState(false);

    // Laad categorieën eenmalig uit system settings
    useEffect(() => {
        if (loaded) return;
        db.getSystemSettings().then(settings => {
            if (settings.documentCategories && settings.documentCategories.length > 0) {
                setAllCategories(settings.documentCategories);
            }
            setLoaded(true);
        });
    }, [loaded]);

    // Gefilterde lijst op basis van applicableTo en exclusions
    const categories = useMemo(() => {
        if (!applicableTo) return allCategories.filter(c => !excludedCategories.includes(c.code));

        return allCategories.filter(c => {
            const isMatch = c.applicableTo === applicableTo ||
                c.applicableTo === 'ALL' ||
                (c.applicableTo === 'BOTH' && (applicableTo === 'ARTICLE' || applicableTo === 'SETUP'));
            return isMatch && !excludedCategories.includes(c.code);
        });
    }, [allCategories, applicableTo, excludedCategories]);

    // Lookup: code → category object
    const getCategoryByCode = useCallback((code: string): DocumentCategory => {
        return allCategories.find(c => c.code === code) ||
            { id: 'unknown', name: code, code, icon: 'FileText', color: 'text-slate-400', isSystem: false, applicableTo: 'ALL' } as DocumentCategory;
    }, [allCategories]);

    // Icon resolver: code → JSX element
    const getRoleIcon = useCallback((code: string, size: number = 18) => {
        const cat = getCategoryByCode(code);
        const props = { size, className: cat.color };

        switch (cat.icon) {
            case 'Hammer': return React.createElement(Hammer, props);
            case 'Camera': return React.createElement(Camera, props);
            case 'Image': return React.createElement(Image, props);
            case 'Table': return React.createElement(Table, props);
            case 'ClipboardList': return React.createElement(ClipboardList, props);
            case 'Ruler': return React.createElement(Ruler, props);
            case 'BarChart': return React.createElement(BarChart, props);
            case 'FileCode': return React.createElement(FileCode, props);
            case 'Terminal': return React.createElement(Terminal, props);
            case 'Archive': return React.createElement(Archive, props);
            case 'Box': return React.createElement(Box, props);
            default: return React.createElement(FileText, props);
        }
    }, [getCategoryByCode]);

    return { categories, getCategoryByCode, getRoleIcon, loaded };
};
