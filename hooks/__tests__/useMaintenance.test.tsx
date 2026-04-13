import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMaintenance } from '../useMaintenance';
import { MaintenanceTicket } from '../../types';

// GLOBALS MOCKING
const mocks = vi.hoisted(() => {
    return {
        getTickets: vi.fn(),
        getOutbox: vi.fn(),
    };
});

vi.mock('../../services/storage', () => ({
    db: {
        getTickets: mocks.getTickets,
        getOutbox: mocks.getOutbox
    }
}));

const mockTickets = [
    {
        id: 't-1', machineId: 'm-1', description: 'Ticket 1', status: 'OPEN',
        reportedBy: 'User A', reportedDate: '2023-10-01'
    },
    {
        id: 't-2', machineId: 'm-1', description: 'Ticket 2', status: 'RESOLVED',
        reportedBy: 'User B', reportedDate: '2023-10-02'
    }
] as any as MaintenanceTicket[];

describe('useMaintenance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getTickets.mockResolvedValue(mockTickets);
        mocks.getOutbox.mockResolvedValue([]);
    });

    it('should load tickets and correctly identify OPEN active tickets', async () => {
        const { result } = renderHook(() => useMaintenance('m-1'));

        // Initially empty
        expect(result.current.tickets).toEqual([]);

        // Wait for refresh via useEffect to load mock tickets
        await waitFor(() => {
            expect(result.current.tickets.length).toBe(2);
        });

        // Test filtering logic for OPEN tickets
        expect(result.current.activeTickets.length).toBe(1);
        expect(result.current.activeTickets[0].id).toBe('t-1');
    });

    it('should optimistically fuse outbox pending updates into tickets state', async () => {
        // Set outbox to have a pending UPDATE on t-1, changing its status to RESOLVED
        mocks.getOutbox.mockResolvedValue([
            {
                id: 'sync-1', action: 'UPDATE', table: 'fm_table_tickets', timestamp: Date.now(),
                data: { id: 't-1', machineId: 'm-1', status: 'RESOLVED' }
            }
        ]);

        const { result } = renderHook(() => useMaintenance('m-1'));

        await waitFor(() => {
            expect(result.current.tickets.length).toBe(2);
        });

        // Find t-1 in tickets, it should be RESOLVED and have isPending true
        const modifiedTicket = result.current.tickets.find(t => t.id === 't-1') as MaintenanceTicket & { isPending?: boolean };
        
        expect(modifiedTicket).toBeDefined();
        expect(modifiedTicket?.status).toBe('RESOLVED');
        expect(modifiedTicket?.isPending).toBe(true);

        // Since t-1 is RESOLVED now, activeTickets should be completely empty!
        expect(result.current.activeTickets.length).toBe(0);
    });
});
