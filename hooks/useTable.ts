import { useState, useEffect, useMemo } from 'react';
import { loadTable, KEYS } from '../services/db/core';

/**
 * useTable<T>
 * Optimized hook for reading and listening to a specific database table.
 */
export function useTable<T>(tableKey: string, defaultValue: T[] = []) {
    const [data, setData] = useState<T[]>([]);
    const [outbox, setOutbox] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = async () => {
        const result = await loadTable<T[]>(tableKey, defaultValue);
        setData(Array.isArray(result) ? result : defaultValue);
        setIsLoading(false);
    };

    const refreshOutbox = async () => {
        const result = await loadTable<any[]>(KEYS.OUTBOX, []);
        setOutbox(Array.isArray(result) ? result : []);
    };

    useEffect(() => {
        refreshData();
        refreshOutbox();

        const handleTableUpdate = (e: any) => {
            // Als er data wordt meegegeven in het event, gebruiken we die direct (sneller)
            if (e.detail) {
                setData(Array.isArray(e.detail) ? e.detail : []);
            } else {
                refreshData();
            }
        };
        const handleOutboxUpdate = () => refreshOutbox();

        // Luister alleen naar events specifiek voor DEZE tabel
        window.addEventListener(`db:${tableKey}:updated`, handleTableUpdate);
        window.addEventListener('outbox-changed', handleOutboxUpdate);

        return () => {
            window.removeEventListener(`db:${tableKey}:updated`, handleTableUpdate);
            window.removeEventListener('outbox-changed', handleOutboxUpdate);
        };
    }, [tableKey]);

    // Optimistic UI Merge
    const mergedData = useMemo(() => {
        const safeOutbox = Array.isArray(outbox) ? outbox : [];
        const tableOutbox = safeOutbox.filter(item => item && item.table === tableKey);
        
        if (tableOutbox.length === 0) return Array.isArray(data) ? data : [];

        const dataMap = new Map();
        if (Array.isArray(data)) {
            data.forEach((item: any) => item && dataMap.set(item.id, { ...item }));
        }

        tableOutbox.forEach(item => {
            if (!item.data || !item.data.id) return;
            if (item.action === 'INSERT' || item.action === 'UPDATE') {
                const existing = dataMap.get(item.data.id);
                dataMap.set(item.data.id, { ...existing, ...item.data, isPending: true });
            } else if (item.action === 'DELETE') {
                dataMap.delete(item.data.id);
            }
        });

        return Array.from(dataMap.values());
    }, [data, outbox, tableKey]);

    return { 
        data: mergedData, 
        raw: data, 
        isLoading, 
        refresh: refreshData 
    };
}