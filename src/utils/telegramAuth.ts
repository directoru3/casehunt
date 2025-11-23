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
    if (typeof window !== 'undefined') {
      if (window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
          this.isInitialized = true;
          this.loadUserFromWebApp();
          console.log('[TelegramAuth] Telegram WebApp initialized successfully');
        } catch (error) {
          console.error('[TelegramAuth] Error initializing Telegram WebApp:', error);
        }
      } else {
        console.log('[TelegramAuth] Telegram WebApp not available - running in browser mode');
        this.createDemoUser();
      }
    }
  }

  private loadUserFromWebApp(): void {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      console.log('[TelegramAuth] WebApp not available');
      return;
    }

    const userData = webApp.initDataUnsafe?.user;
    console.log('[TelegramAuth] Raw Telegram data:', webApp.initDataUnsafe);

    if (userData && userData.id) {
      this.currentUser = {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        username: userData.username,
        languageCode: userData.language_code,
        photoUrl: userData.photo_url,
        isPremium: userData.is_premium,
      };
      console.log('[TelegramAuth] User loaded from Telegram:', this.currentUser);
    } else {
      console.warn('[TelegramAuth] No user data in Telegram WebApp, creating demo user');
      this.createDemoUser();
    }
  }

  private createDemoUser(): void {
    const demoUserId = Math.floor(Math.random() * 1000000000);
    this.currentUser = {
      id: demoUserId,
      firstName: 'Demo',
      lastName: 'User',
      username: `demo_user_${demoUserId}`,
      languageCode: 'en',
      isPremium: false,
    };
    this.isInitialized = true;
    console.log('[TelegramAuth] Demo user created:', this.currentUser);
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
      console.log('[TelegramAuth] Starting authentication...');

      if (!this.currentUser) {
        console.error('[TelegramAuth] No current user available');
        return {
          success: false,
          error: 'User data not available. Please try again.'
        };
      }

      console.log('[TelegramAuth] Authenticating user:', this.currentUser.id);

      const initData = this.getInitData() || '';
      console.log('[TelegramAuth] InitData available:', !!initData);

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
        const errorText = await response.text();
        console.error('[TelegramAuth] Server error:', errorText);
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TelegramAuth] Authentication response:', { success: data.success });

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
