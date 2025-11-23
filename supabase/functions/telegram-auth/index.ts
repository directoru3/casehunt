import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  isPremium?: boolean;
}

interface AuthRequest {
  initData: string;
  user: TelegramUser;
}

function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

function generateJWT(userId: number): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: String(userId),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const signature = `signature_${userId}_${Date.now()}`;

  return `${base64Header}.${base64Payload}.${signature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { initData, user }: AuthRequest = await req.json();

    if (!user || !user.id) {
      throw new Error('Invalid user data');
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error('Failed to fetch user');
    }

    const userData = {
      telegram_id: user.id,
      first_name: user.firstName,
      last_name: user.lastName || null,
      username: user.username || null,
      language_code: user.languageCode || 'en',
      photo_url: user.photoUrl || null,
      is_premium: user.isPremium || false,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('telegram_id', user.id);

      if (updateError) {
        console.error('Failed to update user:', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create user:', insertError);
      }

      const { error: balanceError } = await supabase
        .from('user_balances')
        .insert({
          user_id: String(user.id),
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (balanceError) {
        console.error('Failed to create balance:', balanceError);
      }
    }

    const token = generateJWT(user.id);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          photoUrl: user.photoUrl,
          isPremium: user.isPremium
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});