import { useState, useEffect } from 'react';
import { MkgApiService } from '../services/mkg/mkgApiService';
import { MkgProductionOrder } from '../services/mkg/types';

export const useProductionOrders = (articleCode: string | undefined, isEnabled: boolean) => {
    const [orders, setOrders] = useState<MkgProductionOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!isEnabled || !articleCode) {
            setOrders([]);
            setIsLoading(false);
            setIsError(false);
            return;
        }

        let mounted = true;
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                setIsError(false);
                const service = new MkgApiService('https://dummy', 'key');
                const data = await service.fetchProductionOrders(articleCode);
                if (mounted) setOrders(data);
            } catch (err) {
                if (mounted) setIsError(true);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchOrders();
        return () => { mounted = false; };
    }, [articleCode, isEnabled]);

    return { orders, isLoading, isError };
};
