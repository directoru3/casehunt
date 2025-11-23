import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MintNFTRequest {
  userId: string;
  itemId: string;
  itemName: string;
  itemRarity: string;
  itemPrice: number;
  itemImage: string;
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

    const { userId, itemId, itemName, itemRarity, itemPrice, itemImage }: MintNFTRequest = await req.json();

    if (!userId || !itemId) {
      throw new Error('Missing required fields');
    }

    const nftId = `nft_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const metadata = {
      name: itemName,
      description: `${itemRarity.charAt(0).toUpperCase() + itemRarity.slice(1)} NFT Gift from NFT Gifts`,
      image: itemImage,
      attributes: [
        {
          trait_type: 'Rarity',
          value: itemRarity
        },
        {
          trait_type: 'Value',
          value: itemPrice
        },
        {
          trait_type: 'Collection',
          value: 'NFT Gifts'
        },
        {
          trait_type: 'Created',
          value: new Date().toISOString()
        }
      ],
      animation_url: itemImage,
      external_url: `https://nft-gifts.app/nft/${nftId}`
    };

    const { data: nft, error: insertError } = await supabase
      .from('nfts')
      .insert({
        nft_id: nftId,
        user_id: userId,
        item_id: itemId,
        item_name: itemName,
        item_rarity: itemRarity,
        item_price: itemPrice,
        item_image: itemImage,
        metadata: metadata,
        minted_at: new Date().toISOString(),
        status: 'minted'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to mint NFT');
    }

    return new Response(
      JSON.stringify({
        success: true,
        nftId,
        metadata,
        nft
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Minting error:', error);
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