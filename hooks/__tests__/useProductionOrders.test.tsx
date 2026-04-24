import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProductionOrders } from '../useProductionOrders';

describe('useProductionOrders Hook', () => {
    it('returns empty array if not enabled or no articleCode', () => {
        const { result } = renderHook(() => useProductionOrders('', false));
        expect(result.current.orders).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('fetches data when enabled', async () => {
        const { result } = renderHook(() => useProductionOrders('PO-ART-1', true));
        // initial state
        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.orders.length).toBeGreaterThan(0);
        expect(result.current.orders[0].articleCode).toBe('PO-ART-1');
        expect(result.current.isError).toBe(false);
    });
});
