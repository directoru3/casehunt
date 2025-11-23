import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Item {
  id: string;
  name: string;
  rarity: string;
  price: number;
  image_url: string;
}

interface CaseOpenRequest {
  items: Item[];
  count?: number;
}

function getCryptoRandomFloat(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / (0xFFFFFFFF + 1);
}

function selectWinnerByRarity(items: Item[]): Item {
  const random = getCryptoRandomFloat() * 100;
  let cumulativeProbability = 0;

  const rarityProbabilities: { [key: string]: number } = {
    'common': 50,
    'uncommon': 30,
    'rare': 15,
    'epic': 4,
    'legendary': 1
  };

  const sortedItems = [...items].sort((a, b) => {
    const rarityOrder: { [key: string]: number } = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 4,
      'legendary': 5
    };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  for (const item of sortedItems) {
    const probability = rarityProbabilities[item.rarity] || 10;
    cumulativeProbability += probability;
    if (random <= cumulativeProbability) {
      return item;
    }
  }

  return sortedItems[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { items, count = 1 }: CaseOpenRequest = await req.json();

    if (!items || items.length === 0) {
      throw new Error('No items provided');
    }

    if (count < 1 || count > 5) {
      throw new Error('Count must be between 1 and 5');
    }

    const winners: Item[] = [];
    for (let i = 0; i < count; i++) {
      const winner = selectWinnerByRarity(items);
      winners.push(winner);
    }

    return new Response(
      JSON.stringify({ winners }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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