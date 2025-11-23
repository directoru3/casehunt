/*
  # Users Table for Telegram Authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `telegram_id` (bigint, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `username` (text)
      - `language_code` (text)
      - `photo_url` (text)
      - `is_premium` (boolean)
      - `last_login` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on users table
    - Users can read their own data
    - Service role can manage all users
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text,
  username text,
  language_code text DEFAULT 'en',
  photo_url text,
  is_premium boolean DEFAULT false,
  last_login timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (telegram_id = (auth.jwt()->>'sub')::bigint);

CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
