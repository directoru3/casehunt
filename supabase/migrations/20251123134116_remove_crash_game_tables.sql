/*
  # Remove Crash Game Tables

  1. Drops
    - Drop all policies from crash tables
    - Drop crash_bets table
    - Drop crash_rounds table
    - Drop crash_user_profiles table
    - Drop all indexes

  2. Notes
    - Removes all crash game related data
    - Cascade deletes will handle foreign key references
*/

-- Drop policies
DROP POLICY IF EXISTS "Anyone can view crash rounds" ON crash_rounds;
DROP POLICY IF EXISTS "Anyone can view crash bets" ON crash_bets;
DROP POLICY IF EXISTS "Users can insert own bets" ON crash_bets;
DROP POLICY IF EXISTS "Users can update own bets" ON crash_bets;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON crash_user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON crash_user_profiles;

-- Drop indexes
DROP INDEX IF EXISTS idx_crash_bets_round_id;
DROP INDEX IF EXISTS idx_crash_bets_user_id;
DROP INDEX IF EXISTS idx_crash_rounds_status;

-- Drop tables (cascade will handle foreign keys)
DROP TABLE IF EXISTS crash_bets CASCADE;
DROP TABLE IF EXISTS crash_user_profiles CASCADE;
DROP TABLE IF EXISTS crash_rounds CASCADE;
