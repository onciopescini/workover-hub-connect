export class ErrorHandler {
  private static isProduction = Deno.env.get('ENVIRONMENT') === 'production';

  static logError(context: string, error: any, metadata?: Record<string, any>) {
    const errorData = {
      context,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    // Always log errors, but structured for production
    if (this.isProduction) {
      console.error(JSON.stringify(errorData));
    } else {
      console.error(`🔴 ${context}:`, error);
      if (metadata) {
        console.error('Metadata:', metadata);
      }
    }
  }

  static logSuccess(message: string, metadata?: Record<string, any>) {
    if (!this.isProduction) {
      console.log(`✅ ${message}`);
      if (metadata) {
        console.log('Details:', metadata);
      }
    }
  }

  static logInfo(message: string, metadata?: Record<string, any>) {
    if (!this.isProduction) {
      console.log(`🔵 ${message}`);
      if (metadata) {
        console.log('Details:', metadata);
      }
    }
  }

  static logWarning(message: string, metadata?: Record<string, any>) {
    const warningData = {
      level: 'warning',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    if (this.isProduction) {
      console.warn(JSON.stringify(warningData));
    } else {
      console.warn(`⚠️ ${message}`);
      if (metadata) {
        console.warn('Details:', metadata);
      }
    }
  }
}