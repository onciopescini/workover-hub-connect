/**
 * Frontend Production Logger
 * 
 * Provides structured logging for frontend components with proper error handling
 * and production-safe output management.
 */
import { logger } from '@/lib/logger';

class FrontendLogger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log validation results for payment systems
   */
  paymentValidation(testName: string, result?: any) {
    if (this.isDevelopment) {
      logger.debug(`Payment Validation: ${testName}`, { action: 'payment_validation' });
    }
  }

  /**
   * Log Stripe integration events
   */
  stripeIntegration(event: string, data?: any) {
    if (this.isDevelopment) {
      logger.debug(`Stripe Integration: ${event}`, { action: 'stripe_integration' });
    }
  }

  /**
   * Log admin dashboard actions
   */
  adminAction(action: string, details?: any, context?: { component?: string }) {
    logger.info(`Admin Action: ${action}`, { 
      action: 'admin_dashboard',
      component: context?.component || 'unknown'
    });
  }

  /**
   * Log payment dashboard events
   */
  paymentDashboard(event: string, context?: { component?: string, error?: string }) {
    logger.info(`Payment Dashboard: ${event}`, { 
      action: 'payment_dashboard',
      component: context?.component || 'unknown'
    });
  }

  /**
   * Log booking dashboard events
   */
  bookingDashboard(event: string, error?: Error, context?: { component?: string }) {
    if (error) {
      logger.error(`Booking Dashboard Error: ${event}`, { 
        action: 'booking_dashboard_error',
        component: context?.component || 'unknown'
      }, error);
    } else {
      logger.info(`Booking Dashboard: ${event}`, { 
        action: 'booking_dashboard',
        component: context?.component || 'unknown'
      });
    }
  }

  /**
   * Log messaging system events
   */
  messagingSystem(event: string, error?: Error, context?: { component?: string, chatId?: string }) {
    if (error) {
      logger.error(`Messaging System Error: ${event}`, { 
        action: 'messaging_error',
        component: context?.component || 'unknown'
      }, error);
    } else {
      logger.info(`Messaging System: ${event}`, { 
        action: 'messaging_system',
        component: context?.component || 'unknown'
      });
    }
  }

  /**
   * Log image processing events
   */
  imageProcessing(event: string, details?: any, context?: { component?: string, filePath?: string, spaceId?: string | undefined }) {
    if (this.isDevelopment) {
      logger.debug(`Image Processing: ${event}`, { 
        action: 'image_processing',
        component: context?.component || 'unknown'
      });
    }
  }

  /**
   * Log UI component load events
   */
  componentLoad(componentName: string, loadTime?: number, context?: { component?: string }) {
    if (this.isDevelopment && componentName) {
      logger.debug(`Component Load: ${componentName}`, { 
        action: 'component_performance',
        component: context?.component || 'unknown'
      });
    }
  }

  /**
   * Log calculation testing events
   */
  calculationTest(testName: string, input?: any, output?: any) {
    if (this.isDevelopment) {
      logger.debug(`Calculation Test: ${testName}`, { action: 'calculation_test' });
    }
  }
}

export const frontendLogger = new FrontendLogger();