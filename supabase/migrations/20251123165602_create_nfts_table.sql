/*
  # NFTs Table for Minting and Tracking

  1. New Tables
    - `nfts`
      - `id` (uuid, primary key)
      - `nft_id` (text, unique)
      - `user_id` (text)
      - `item_id` (text)
      - `item_name` (text)
      - `item_rarity` (text)
      - `item_price` (numeric)
      - `item_image` (text)
      - `metadata` (jsonb)
      - `ton_address` (text)
      - `status` (text)
      - `minted_at` (timestamptz)
      - `transferred_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on nfts table
    - Users can read their own NFTs
    - Service role can manage all NFTs
*/

CREATE TABLE IF NOT EXISTS nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id text UNIQUE NOT NULL,
  user_id text NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  item_rarity text NOT NULL,
  item_price numeric NOT NULL,
  item_image text NOT NULL,
  metadata jsonb NOT NULL,
  ton_address text,
  status text DEFAULT 'minted' NOT NULL,
  minted_at timestamptz DEFAULT now() NOT NULL,
  transferred_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own NFTs"
  ON nfts
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Service role can manage NFTs"
  ON nfts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_nft_id ON nfts(nft_id);
CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts(status);
CREATE INDEX IF NOT EXISTS idx_nfts_minted_at ON nfts(minted_at DESC);
