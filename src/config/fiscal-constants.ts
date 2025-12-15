/**
 * Centralized Fiscal Constants
 *
 * Single source of truth for all tax and fee rates.
 * These values are used across the application to ensure consistency
 * in billing, invoicing, and Stripe payments.
 */

/**
 * Platform Fee Rate (5%)
 * The commission taken by the platform on each transaction.
 */
export const PLATFORM_FEE_RATE = 0.05;

/**
 * VAT Rate (22%)
 * Standard Italian Value Added Tax rate.
 */
export const VAT_RATE = 0.22;

/**
 * Withholding Tax Rate (21%)
 * "Ritenuta d'acconto" applicable to payments for professional services in Italy.
 */
export const WITHHOLDING_TAX_RATE = 0.21;
