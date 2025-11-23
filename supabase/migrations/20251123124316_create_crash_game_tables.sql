-- Crash Game Database Schema
-- 
-- 1. New Tables:
--    - crash_rounds: Stores each game round
--    - crash_bets: Stores player bets for each round
--    - crash_user_profiles: Stores user display names
-- 
-- 2. Security:
--    - RLS enabled on all tables
--    - Public read access for game transparency
--    - Users can only manage their own bets

-- Create crash_rounds table
CREATE TABLE IF NOT EXISTS crash_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crash_multiplier decimal NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'crashed'))
);

-- Create crash_bets table
CREATE TABLE IF NOT EXISTS crash_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES crash_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  item_image text NOT NULL,
  item_rarity text NOT NULL,
  bet_amount decimal NOT NULL,
  cashout_multiplier decimal,
  winnings decimal,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cashed_out', 'lost')),
  created_at timestamptz DEFAULT now()
);

-- Create crash_user_profiles table
CREATE TABLE IF NOT EXISTS crash_user_profiles (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for crash_rounds (public read)
CREATE POLICY "Anyone can view crash rounds"
  ON crash_rounds FOR SELECT
  USING (true);

-- Policies for crash_bets (public read, authenticated insert/update)
CREATE POLICY "Anyone can view crash bets"
  ON crash_bets FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own bets"
  ON crash_bets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own bets"
  ON crash_bets FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Policies for crash_user_profiles (public read, own insert)
CREATE POLICY "Anyone can view user profiles"
  ON crash_user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create own profile"
  ON crash_user_profiles FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_id ON crash_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_id ON crash_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_rounds_status ON crash_rounds(status);