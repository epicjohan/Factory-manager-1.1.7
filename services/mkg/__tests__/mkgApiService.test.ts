import { describe, it, expect } from 'vitest';
import { MkgApiService } from '../mkgApiService';

describe('MkgApiService', () => {
    it('throws error if missing config', async () => {
        const service = new MkgApiService('', '');
        await expect(service.fetchProductionOrders('ART-01')).rejects.toThrow('API configuratie');
    });

    it('returns structured orders on success', async () => {
        const service = new MkgApiService('https://mkg-dummy', 'dummy-key');
        const orders = await service.fetchProductionOrders('TEST-ART');
        expect(orders).toBeDefined();
        expect(orders.length).toBeGreaterThan(0);
        expect(orders[0].articleCode).toBe('TEST-ART');
    });
});
