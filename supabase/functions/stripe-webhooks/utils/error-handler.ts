
export class ErrorHandler {
  static logError(context: string, error: any, details?: Record<string, any>) {
    console.error(`🔴 ${context}:`, error);
    if (details) {
      console.error('Error details:', details);
    }
  }

  static logSuccess(message: string, details?: Record<string, any>) {
    console.log(`✅ ${message}`);
    if (details) {
      console.log('Success details:', details);
    }
  }

  static logInfo(message: string, details?: Record<string, any>) {
    console.log(`🔵 ${message}`);
    if (details) {
      console.log('Info details:', details);
    }
  }

  static logWarning(message: string, details?: Record<string, any>) {
    console.log(`⚠️ ${message}`);
    if (details) {
      console.log('Warning details:', details);
    }
  }
}
