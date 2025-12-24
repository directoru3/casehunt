import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyPaymentRequest {
  userId: string;
  payloadId: string;
  status: 'paid' | 'failed' | 'cancelled';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, payloadId, status }: VerifyPaymentRequest = await req.json();
    console.log('[VerifyPayment] Request:', { userId, payloadId, status });

    if (!userId || !payloadId || !status) {
      throw new Error('Missing required fields');
    }

    // Fetch payment
    const { data: payment, error: fetchError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('payload_id', payloadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[VerifyPayment] Fetch error:', fetchError);
      throw new Error('Failed to fetch payment');
    }

    if (!payment) {
      console.warn('[VerifyPayment] Payment not found:', payloadId);
      throw new Error('Payment not found');
    }

    console.log('[VerifyPayment] Payment found:', payment);

    if (payment.status !== 'pending') {
      console.warn('[VerifyPayment] Payment already processed:', payment.status);
      throw new Error('Payment already processed');
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('pending_payments')
      .update({
        status: status,
        completed_at: new Date().toISOString()
      })
      .eq('payload_id', payloadId);

    if (updateError) {
      console.error('[VerifyPayment] Update error:', updateError);
      throw new Error('Failed to update payment status');
    }

    console.log('[VerifyPayment] Payment status updated to:', status);

    let newBalance = 0;

    // If payment is paid, update balance
    if (status === 'paid') {
      console.log('[VerifyPayment] Processing paid status, adding', payment.coins_amount, 'coins');

      const { data: userData, error: userFetchError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (userFetchError && userFetchError.code !== 'PGRST116') {
        console.error('[VerifyPayment] User fetch error:', userFetchError);
        throw new Error('Failed to fetch user balance');
      }

      const currentBalance = userData?.balance || 0;
      newBalance = currentBalance + payment.coins_amount;

      console.log('[VerifyPayment] Current balance:', currentBalance, '→ New balance:', newBalance);

      if (userData) {
        // Update existing balance
        const { error: balanceUpdateError } = await supabase
          .from('user_balances')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (balanceUpdateError) {
          console.error('[VerifyPayment] Balance update error:', balanceUpdateError);
          throw new Error('Failed to update balance');
        }
        console.log('[VerifyPayment] Balance updated successfully');
      } else {
        // Create new balance record
        const { error: balanceInsertError } = await supabase
          .from('user_balances')
          .insert({
            user_id: userId,
            balance: newBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (balanceInsertError) {
          console.error('[VerifyPayment] Balance insert error:', balanceInsertError);
          throw new Error('Failed to create balance record');
        }
        console.log('[VerifyPayment] Balance record created successfully');
      }

      // Log transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'deposit',
          amount: payment.coins_amount,
          stars_amount: payment.stars_amount,
          status: 'completed',
          payload_id: payloadId,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.warn('[VerifyPayment] Transaction log error (non-critical):', transactionError);
      } else {
        console.log('[VerifyPayment] Transaction logged successfully');
      }
    } else {
      console.log('[VerifyPayment] Payment', status, '- not processing balance');
    }

    const response = {
      success: true,
      status,
      newBalance: status === 'paid' ? newBalance : null,
      message: status === 'paid' ? 'Payment successful' : `Payment ${status}`
    };

    console.log('[VerifyPayment] Response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[VerifyPayment] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Verification failed'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});