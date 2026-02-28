
import { useState, useEffect, useCallback } from 'react';
import { ArticleStatus } from '../types';

export type PdmSortKey = 'updated' | 'created' | 'name' | 'code' | 'revision';

export interface PdmFilterState {
    searchTerm: string;
    activeStatuses: ArticleStatus[];
    sortBy: PdmSortKey;
    sortDir: 'asc' | 'desc';
    activeMachineIds: string[];
}

const DEFAULT_FILTERS: PdmFilterState = {
    searchTerm: '',
    activeStatuses: [],
    sortBy: 'created',
    sortDir: 'desc',
    activeMachineIds: [],
};

const getStorageKey = (): string => {
    try {
        const userId = localStorage.getItem('cnc_active_user') || 'guest';
        return `fm_pdm_filters_${userId}`;
    } catch {
        return 'fm_pdm_filters_guest';
    }
};

const loadFilters = (): PdmFilterState => {
    try {
        const raw = localStorage.getItem(getStorageKey());
        if (!raw) return { ...DEFAULT_FILTERS };
        const parsed = JSON.parse(raw);
        return {
            searchTerm: parsed.searchTerm ?? DEFAULT_FILTERS.searchTerm,
            activeStatuses: Array.isArray(parsed.activeStatuses) ? parsed.activeStatuses : [],
            sortBy: parsed.sortBy ?? DEFAULT_FILTERS.sortBy,
            sortDir: parsed.sortDir ?? DEFAULT_FILTERS.sortDir,
            activeMachineIds: Array.isArray(parsed.activeMachineIds) ? parsed.activeMachineIds : [],
        };
    } catch {
        return { ...DEFAULT_FILTERS };
    }
};

const saveFilters = (filters: PdmFilterState): void => {
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(filters));
    } catch {
        // Ignore storage errors silently
    }
};

export const usePdmFilters = () => {
    const [filters, setFilters] = useState<PdmFilterState>(loadFilters);

    // Persist on every change
    useEffect(() => {
        saveFilters(filters);
    }, [filters]);

    const setSearchTerm = useCallback((searchTerm: string) =>
        setFilters(f => ({ ...f, searchTerm })), []);

    const toggleStatus = useCallback((status: ArticleStatus) =>
        setFilters(f => ({
            ...f,
            activeStatuses: f.activeStatuses.includes(status)
                ? f.activeStatuses.filter(s => s !== status)
                : [...f.activeStatuses, status],
        })), []);

    const setSortBy = useCallback((sortBy: PdmSortKey) =>
        setFilters(f => ({ ...f, sortBy })), []);

    const setSortDir = useCallback((sortDir: 'asc' | 'desc') =>
        setFilters(f => ({ ...f, sortDir })), []);

    const toggleMachine = useCallback((machineId: string) =>
        setFilters(f => ({
            ...f,
            activeMachineIds: f.activeMachineIds.includes(machineId)
                ? f.activeMachineIds.filter(id => id !== machineId)
                : [...f.activeMachineIds, machineId],
        })), []);

    const clearFilters = useCallback(() =>
        setFilters(f => ({
            ...DEFAULT_FILTERS,
            searchTerm: f.searchTerm, // Keep search term; only clear dropdowns
        })), []);

    const clearAll = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

    return {
        ...filters,
        setSearchTerm,
        toggleStatus,
        setSortBy,
        setSortDir,
        toggleMachine,
        clearFilters,
        clearAll,
    };
};
