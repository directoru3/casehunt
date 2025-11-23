import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceRequest {
  userId: string;
  stars: number;
  coins: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, stars, coins }: InvoiceRequest = await req.json();
    console.log('[CreateInvoice] Request:', { userId, stars, coins });

    if (!userId || !stars || !coins) {
      throw new Error('Missing required fields');
    }

    const payloadId = `deposit_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log('[CreateInvoice] Generated payloadId:', payloadId);

    await supabase
      .from('pending_payments')
      .insert({
        payload_id: payloadId,
        user_id: userId,
        stars_amount: stars,
        coins_amount: coins,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    let invoiceLink = null;

    if (botToken) {
      try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Balance Top-Up',
            description: `Add ${coins} TON to your balance`,
            payload: payloadId,
            currency: 'XTR',
            prices: [{ label: `${stars} Stars`, amount: stars }]
          })
        });

        const telegramData = await telegramResponse.json();
        console.log('[CreateInvoice] Telegram API response:', telegramData);

        if (telegramData.ok && telegramData.result) {
          invoiceLink = telegramData.result;
          console.log('[CreateInvoice] Invoice link created:', invoiceLink);
        } else {
          console.error('[CreateInvoice] Telegram API error:', telegramData);
        }
      } catch (error) {
        console.error('[CreateInvoice] Error calling Telegram API:', error);
      }
    } else {
      console.warn('[CreateInvoice] TELEGRAM_BOT_TOKEN not configured');
    }

    const invoice = {
      title: 'Balance Top-Up',
      description: `Add ${coins} TON to your balance`,
      payload: payloadId,
      currency: 'XTR',
      prices: [{ label: `${stars} Stars`, amount: stars }]
    };

    return new Response(
      JSON.stringify({ invoice, payloadId, invoiceLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CreateInvoice] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});