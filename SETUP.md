# NFT Gifts - Setup Instructions

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
The `.env` file is already configured with Supabase credentials:
```
VITE_SUPABASE_URL=https://hzwqtwbkjtbhwmfeewab.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_TELEGRAM_BOT_USERNAME=nft_gifts_bot
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

Production files will be in the `dist/` folder.

## Features Implemented

✅ **Telegram Authentication**
- Automatic login via Telegram Mini Apps
- User profile with avatar and username
- Session management

✅ **Telegram Stars Payment**
- Deposit modal with preset amounts
- Secure payment processing
- Balance synchronization

✅ **Animated NFTs**
- Rarity-based visual effects
- Video/GIF support with fallbacks
- Smooth animations and transitions

✅ **NFT Minting**
- Mint items as TON NFTs
- On-chain metadata
- Transfer to wallet functionality

✅ **Case Opening System**
- Single and multi-case opening
- Animated spinning wheel
- Keep or sell items instantly

✅ **Inventory Management**
- View all owned items
- Sell items (94% of value)
- Mint and transfer NFTs

✅ **Profile System**
- Telegram user data display
- Referral system
- Transaction history

## Database

All tables are set up in Supabase:
- `users` - User profiles
- `user_balances` - TON balances
- `nfts` - Minted NFTs
- `pending_payments` - Payment tracking
- `transactions` - Transaction history

## Edge Functions Deployed

- `telegram-auth` - User authentication
- `create-invoice` - Payment invoice generation
- `verify-payment` - Payment verification
- `get-user-balance` - Balance retrieval
- `mint-nft` - NFT minting
- `case-opener` - Case opening logic

## Testing in Telegram

To test as a Telegram Mini App:
1. Create a bot via @BotFather
2. Set up Mini App URL pointing to your deployed app
3. Open the app in Telegram

## Troubleshooting

### TypeScript Errors
```bash
npm run typecheck
```

### Build Errors
```bash
npm run build
```

### Clear Cache
```bash
rm -rf node_modules package-lock.json
npm install
```

## Notes

- The app works both in browser (demo mode) and Telegram Mini App
- All payments require Telegram Stars (available only in Telegram)
- NFT minting creates records in the database (TON blockchain integration ready)
- Animations use GIF fallbacks for items without video files

## Support

For issues or questions, check:
- `/src/types/telegram.d.ts` - Telegram WebApp types
- `/src/utils/telegramAuth.ts` - Authentication logic
- `/src/utils/telegramPayments.ts` - Payment processing
- `/supabase/functions/` - Backend functions
