import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'guest',
      },
    });
  }),

  // Spaces endpoints
  http.get('/rest/v1/spaces', () => {
    return HttpResponse.json([
      {
        id: 'space-1',
        title: 'Modern Coworking Space',
        description: 'A beautiful modern space',
        price_per_hour: 25,
        capacity: 10,
        status: 'active',
        host_id: 'host-1',
      },
      {
        id: 'space-2',
        title: 'Private Office',
        description: 'Quiet private office',
        price_per_hour: 50,
        capacity: 4,
        status: 'active',
        host_id: 'host-2',
      },
    ]);
  }),

  http.get('/rest/v1/spaces/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      title: 'Modern Coworking Space',
      description: 'A beautiful modern space',
      price_per_hour: 25,
      capacity: 10,
      status: 'active',
      host_id: 'host-1',
    });
  }),

  // Bookings endpoints
  http.post('/rest/v1/bookings', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'booking-123',
      ...body,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get('/rest/v1/bookings', () => {
    return HttpResponse.json([
      {
        id: 'booking-1',
        space_id: 'space-1',
        guest_id: 'user-123',
        start_time: '2025-01-15T10:00:00Z',
        end_time: '2025-01-15T12:00:00Z',
        status: 'confirmed',
      },
    ]);
  }),

  // Admin endpoints
  http.patch('/rest/v1/spaces/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.get('/rest/v1/profiles', () => {
    return HttpResponse.json([
      {
        id: 'user-1',
        email: 'user1@example.com',
        full_name: 'Test User 1',
        role: 'guest',
        status: 'active',
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        full_name: 'Test User 2',
        role: 'host',
        status: 'active',
      },
    ]);
  }),

  http.patch('/rest/v1/profiles/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // Admin actions log
  http.post('/rest/v1/admin_actions_log', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'action-123',
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Connections endpoints
  http.post('/rest/v1/connections', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'connection-123',
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch('/rest/v1/connections/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // Events endpoints
  http.post('/rest/v1/events', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'event-123',
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post('/rest/v1/event_participants', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'participant-123',
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Fiscal endpoints (Step 5 E2E Tests)
  http.get('/rest/v1/invoices', () => {
    return HttpResponse.json([
      {
        id: 'invoice-mock-1',
        invoice_number: 'FT-2025-001',
        invoice_date: '2025-01-15',
        total_amount: 122.00,
        base_amount: 100.00,
        vat_amount: 22.00,
        vat_rate: 22,
      },
    ]);
  }),

  http.get('/rest/v1/non_fiscal_receipts', () => {
    return HttpResponse.json([
      {
        id: 'receipt-mock-1',
        receipt_number: 'RIC-2025-001',
        receipt_date: '2025-01-15',
        total_amount: 100.00,
        canone_amount: 100.00,
      },
    ]);
  }),

  http.patch('/rest/v1/profiles/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),
];
