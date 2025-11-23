export interface TelegramInvoice {
  title: string;
  description: string;
  payload: string;
  currency: string;
  prices: Array<{
    label: string;
    amount: number;
  }>;
}

export interface PaymentResult {
  status: 'paid' | 'failed' | 'cancelled';
  payloadId?: string;
}

export class TelegramPaymentService {
  private static instance: TelegramPaymentService;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TelegramPaymentService {
    if (!TelegramPaymentService.instance) {
      TelegramPaymentService.instance = new TelegramPaymentService();
    }
    return TelegramPaymentService.instance;
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      this.isInitialized = true;
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && !!window.Telegram?.WebApp;
  }

  public getUserId(): string | null {
    if (!this.isAvailable()) return null;
    const userId = window.Telegram?.WebApp.initDataUnsafe.user?.id;
    return userId ? String(userId) : null;
  }

  public async createInvoice(stars: number, coins: number): Promise<{ invoice: TelegramInvoice; payloadId: string; invoiceLink?: string } | null> {
    try {
      const userId = this.getUserId();
      if (!userId) {
        throw new Error('User ID not available');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId, stars, coins }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      return null;
    }
  }

  public async openInvoice(invoiceLink: string, payloadId: string): Promise<PaymentResult> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        console.error('[TelegramPayments] WebApp not available');
        resolve({ status: 'failed' });
        return;
      }

      console.log('[TelegramPayments] Opening invoice:', invoiceLink);

      try {
        window.Telegram!.WebApp.openInvoice(invoiceLink, (status: string) => {
          console.log('[TelegramPayments] Payment status:', status);
          const normalizedStatus = status.toLowerCase() as 'paid' | 'failed' | 'cancelled';
          resolve({
            status: normalizedStatus,
            payloadId: payloadId
          });
        });
      } catch (error) {
        console.error('[TelegramPayments] Error opening invoice:', error);
        resolve({ status: 'failed' });
      }
    });
  }

  public async verifyPayment(payloadId: string, status: 'paid' | 'failed' | 'cancelled'): Promise<{ success: boolean; newBalance?: number }> {
    try {
      const userId = this.getUserId();
      if (!userId) {
        throw new Error('User ID not available');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId, payloadId, status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const data = await response.json();
      return {
        success: data.success,
        newBalance: data.newBalance
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false };
    }
  }

  public async processPayment(stars: number, coins: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      console.log('[TelegramPayments] Processing payment:', stars, 'stars for', coins, 'coins');

      // Step 1: Create invoice
      const invoiceData = await this.createInvoice(stars, coins);
      if (!invoiceData || !invoiceData.invoiceLink) {
        console.error('[TelegramPayments] Failed to create invoice');
        return { success: false, error: 'Failed to create invoice' };
      }

      console.log('[TelegramPayments] Invoice created:', invoiceData.payloadId);

      // Step 2: Open Telegram payment interface
      const paymentResult = await this.openInvoice(invoiceData.invoiceLink, invoiceData.payloadId);
      console.log('[TelegramPayments] Payment result:', paymentResult);

      // Step 3: Verify payment on backend
      if (paymentResult.status === 'paid') {
        const verificationResult = await this.verifyPayment(invoiceData.payloadId, 'paid');
        if (verificationResult.success) {
          console.log('[TelegramPayments] Payment verified successfully');
          return {
            success: true,
            newBalance: verificationResult.newBalance
          };
        } else {
          console.error('[TelegramPayments] Payment verification failed');
          return { success: false, error: 'Payment verification failed' };
        }
      } else if (paymentResult.status === 'cancelled') {
        console.log('[TelegramPayments] Payment cancelled by user');
        await this.verifyPayment(invoiceData.payloadId, 'cancelled');
        return { success: false, error: 'Payment cancelled' };
      } else {
        console.error('[TelegramPayments] Payment failed');
        await this.verifyPayment(invoiceData.payloadId, 'failed');
        return { success: false, error: 'Payment failed' };
      }
    } catch (error) {
      console.error('[TelegramPayments] Error processing payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const telegramPayments = TelegramPaymentService.getInstance();
