import { getAvailableCapacity } from './capacity-utils';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/sre-logger', () => ({
  sreLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('getAvailableCapacity', () => {
  it('should use full ISO strings for start_time and end_time queries', async () => {
    const spaceBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { max_capacity: 10 }, error: null }),
    };

    const bookingsBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: [], error: null })), // For await
    };

    (supabase.from as jest.Mock)
        .mockReturnValueOnce(spaceBuilder)
        .mockReturnValueOnce(bookingsBuilder);

    const spaceId = 'space-123';
    const date = '2026-01-23';
    const startTime = '13:30';
    const endTime = '14:30';

    await getAvailableCapacity(spaceId, date, startTime, endTime);

    // Verify .lt('start_time', ...) was called with an ISO string
    // The query is .lt('start_time', endDateTimeIso)
    expect(bookingsBuilder.lt).toHaveBeenCalledWith(
        'start_time',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    );

    // Verify .gt('end_time', ...) was called with an ISO string
    // The query is .gt('end_time', startDateTimeIso)
    expect(bookingsBuilder.gt).toHaveBeenCalledWith(
        'end_time',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    );

    // Verify that the ISO string contains the correct date (in UTC or approximate)
    // Since input is 2026-01-23, the ISO string should probably match that day (depending on timezone conversion)
    // But importantly, it must NOT be just "13:30" or "14:30"
    const ltArg = bookingsBuilder.lt.mock.calls[0][1];
    expect(ltArg).not.toBe(endTime);
    expect(ltArg).toContain('2026-01-23');

    const gtArg = bookingsBuilder.gt.mock.calls[0][1];
    expect(gtArg).not.toBe(startTime);
    expect(gtArg).toContain('2026-01-23');
  });
});
