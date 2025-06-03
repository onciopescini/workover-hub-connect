
export class Validators {
  static validateWebhookSignature(signature: string | null): boolean {
    return signature !== null && signature.length > 0;
  }

  static validateWebhookSecret(secret: string | null): boolean {
    return secret !== null && secret.length > 0;
  }

  static validateBookingMetadata(metadata: any): boolean {
    return metadata && typeof metadata.booking_id === 'string';
  }

  static validateStripeEvent(event: any): boolean {
    return event && event.type && event.data && event.data.object;
  }

  static validateAccountVerification(account: any): boolean {
    return account && typeof account.charges_enabled === 'boolean' && typeof account.payouts_enabled === 'boolean';
  }
}
