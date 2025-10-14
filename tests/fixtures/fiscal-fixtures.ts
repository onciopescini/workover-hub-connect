/**
 * Fiscal Test Fixtures
 * Centralized test data for fiscal and invoicing E2E tests
 */

export const fiscalTestFixtures = {
  hosts: {
    forfettario: {
      email: 'host.forfettario@test.workover.app',
      password: 'TestForfettario123!',
      firstName: 'Mario',
      lastName: 'Rossi',
      fiscal_regime: 'forfettario',
      tax_id: 'RSSMRA85M01H501Z',
      pec_email: 'mario.rossi@pec.it',
      iban: 'IT60X0542811101000000123456',
      legal_address: 'Via Roma 123, 20100 Milano MI',
      stripe_connected: true,
      kyc_documents_verified: true
    },
    ordinario: {
      email: 'host.ordinario@test.workover.app',
      password: 'TestOrdinario123!',
      firstName: 'Azienda',
      lastName: 'SRL',
      fiscal_regime: 'ordinario',
      vat_number: 'IT12345678901',
      pec_email: 'azienda@pec.it',
      sdi_code: 'ABCDE12',
      iban: 'IT60X0542811101000000789012',
      legal_address: 'Viale Milano 45, 00100 Roma RM',
      stripe_connected: true,
      kyc_documents_verified: true
    },
    privato: {
      email: 'host.privato@test.workover.app',
      password: 'TestPrivato123!',
      firstName: 'Giovanni',
      lastName: 'Bianchi',
      fiscal_regime: 'privato',
      iban: 'IT60X0542811101000000345678',
      legal_address: 'Corso Vittorio 78, 10100 Torino TO',
      stripe_connected: true,
      kyc_documents_verified: true
    },
    noStripe: {
      email: 'host.nostripe@test.workover.app',
      password: 'TestNoStripe123!',
      firstName: 'Luigi',
      lastName: 'Verdi',
      stripe_connected: false,
      kyc_documents_verified: false
    },
    pendingKyc: {
      email: 'host.pendingkyc@test.workover.app',
      password: 'TestPendingKyc123!',
      firstName: 'Pending',
      lastName: 'Host',
      fiscal_regime: 'forfettario',
      tax_id: 'PNDLGI90A01F205X',
      pec_email: 'pending@pec.it',
      iban: 'IT60X0542811101000000999999',
      legal_address: 'Via Test 1, 50100 Firenze FI',
      stripe_connected: true,
      kyc_documents_verified: false
    }
  },
  coworkers: {
    verified: {
      email: 'coworker.verified@test.workover.app',
      password: 'TestCoworker123!',
      firstName: 'Anna',
      lastName: 'Neri',
      email_verified: true
    },
    unverified: {
      email: 'coworker.unverified@test.workover.app',
      password: 'TestUnverified123!',
      firstName: 'Unverified',
      lastName: 'User',
      email_verified: false
    },
    withFiscalData: {
      email: 'coworker.fiscal@test.workover.app',
      password: 'TestCoworkerFiscal123!',
      firstName: 'Paolo',
      lastName: 'Gialli',
      tax_id: 'GLLPLA92B15H501W',
      email_verified: true
    }
  },
  admin: {
    email: 'admin@test.workover.app',
    password: 'TestAdmin123!',
    firstName: 'Admin',
    lastName: 'User'
  }
};

export const mockInvoiceData = {
  workoverServiceFee: {
    invoice_number: 'WF-2025-00001',
    base_amount: 4.50,
    vat_rate: 22.00,
    vat_amount: 0.99,
    total_amount: 5.49,
    recipient_type: 'host_piva'
  },
  workoverServiceFeePrivato: {
    invoice_number: 'WF-2025-00002',
    base_amount: 4.50,
    vat_rate: 22.00,
    vat_amount: 0.99,
    total_amount: 5.49,
    recipient_type: 'host_privato'
  }
};

export const mockNonFiscalReceipt = {
  canone_amount: 45.00,
  discount_amount: 0,
  total_amount: 45.00,
  disclaimer: 'Documento non valido ai fini fiscali, emesso esclusivamente per tracciabilità della transazione.'
};

export const mockPaymentData = {
  standard: {
    amount: 49.99,
    host_amount: 44.99,
    platform_fee: 5.00,
    currency: 'EUR',
    payment_status: 'completed'
  },
  requiresHostInvoice: {
    amount: 49.99,
    host_amount: 44.99,
    platform_fee: 5.00,
    currency: 'EUR',
    payment_status: 'completed',
    host_invoice_required: true,
    host_invoice_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
};

export const mockSpaceData = {
  basic: {
    title: 'Test Coworking Space',
    description: 'A test space for E2E testing',
    price_per_day: 45.00,
    city: 'Milano',
    address: 'Via Test 1',
    capacity: 10,
    confirmation_type: 'instant'
  }
};
