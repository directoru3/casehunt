declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
            is_premium?: boolean;
          };
          auth_date?: number;
          hash?: string;
        };
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        openInvoice: (url: string, callback: (status: string) => void) => void;
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: Error | null, success: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value: string) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, success: boolean) => void) => void;
        };
      };
    };
  }
}

export {};
