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
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: Error | null, success: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value: string) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, success: boolean) => void) => void;
        };
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  isPremium?: boolean;
}

export interface AuthSession {
  user: TelegramUser;
  token: string;
  expiresAt: number;
}

export class TelegramAuthService {
  private static instance: TelegramAuthService;
  private isInitialized = false;
  private currentUser: TelegramUser | null = null;
  private authToken: string | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TelegramAuthService {
    if (!TelegramAuthService.instance) {
      TelegramAuthService.instance = new TelegramAuthService();
    }
    return TelegramAuthService.instance;
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      this.isInitialized = true;
      this.loadUserFromWebApp();
    }
  }

  private loadUserFromWebApp(): void {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    const userData = webApp.initDataUnsafe.user;
    if (userData) {
      this.currentUser = {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        username: userData.username,
        languageCode: userData.language_code,
        photoUrl: userData.photo_url,
        isPremium: userData.is_premium,
      };
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && !!window.Telegram?.WebApp;
  }

  public getCurrentUser(): TelegramUser | null {
    return this.currentUser;
  }

  public getUserId(): string | null {
    return this.currentUser ? String(this.currentUser.id) : null;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getInitData(): string | null {
    if (!this.isAvailable()) return null;
    return window.Telegram?.WebApp.initData || null;
  }

  public async authenticate(): Promise<{ success: boolean; user?: TelegramUser; token?: string; error?: string }> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'Telegram WebApp not available. Please open this app in Telegram.'
        };
      }

      if (!this.currentUser) {
        return {
          success: false,
          error: 'User data not available from Telegram'
        };
      }

      const initData = this.getInitData();
      if (!initData) {
        return {
          success: false,
          error: 'Telegram init data not available'
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            initData,
            user: this.currentUser,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();

      if (data.success && data.token) {
        this.authToken = data.token;
        this.saveSession({
          user: this.currentUser,
          token: data.token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
        });

        return {
          success: true,
          user: this.currentUser,
          token: data.token,
        };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private saveSession(session: AuthSession): void {
    try {
      localStorage.setItem('telegram_auth_session', JSON.stringify(session));

      if (window.Telegram?.WebApp.CloudStorage) {
        window.Telegram.WebApp.CloudStorage.setItem(
          'auth_token',
          session.token,
          (error) => {
            if (error) {
              console.error('Failed to save to CloudStorage:', error);
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  public loadSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem('telegram_auth_session');
      if (!sessionData) return null;

      const session: AuthSession = JSON.parse(sessionData);

      if (session.expiresAt < Date.now()) {
        this.clearSession();
        return null;
      }

      this.currentUser = session.user;
      this.authToken = session.token;

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  public clearSession(): void {
    this.currentUser = null;
    this.authToken = null;
    localStorage.removeItem('telegram_auth_session');

    if (window.Telegram?.WebApp.CloudStorage) {
      window.Telegram.WebApp.CloudStorage.removeItem('auth_token');
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public getAvatarUrl(): string {
    if (this.currentUser?.photoUrl) {
      return this.currentUser.photoUrl;
    }

    const firstLetter = this.currentUser?.firstName.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=0D8ABC&color=fff&size=128`;
  }

  public getDisplayName(): string {
    if (!this.currentUser) return 'Guest';

    const { firstName, lastName } = this.currentUser;
    return lastName ? `${firstName} ${lastName}` : firstName;
  }
}

export const telegramAuth = TelegramAuthService.getInstance();
