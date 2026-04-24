export interface MkgProductionOrder {
    orderNumber: string;
    articleCode: string;
    quantity: number;
    resourceGroup?: string;
    plannedStartDate: string;
    plannedEndDate: string;
    status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
}
