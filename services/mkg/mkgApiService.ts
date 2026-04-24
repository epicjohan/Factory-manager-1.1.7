import { MkgProductionOrder } from './types';

export class MkgApiService {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async fetchProductionOrders(articleCode: string, resourceGroup?: string): Promise<MkgProductionOrder[]> {
        // Dummy implementation for now, should use axios or fetch
        if (!this.baseUrl || !this.apiKey) {
            throw new Error('API configuratie ontbreekt');
        }

        const orders: MkgProductionOrder[] = [
            {
                orderNumber: `PO-${Math.floor(Math.random() * 10000)}`,
                articleCode,
                quantity: 100,
                resourceGroup,
                plannedStartDate: new Date().toISOString(),
                plannedEndDate: new Date(Date.now() + 86400000).toISOString(),
                status: 'ACTIVE'
            }
        ];

        return Promise.resolve(orders);
    }
}
