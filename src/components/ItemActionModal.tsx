import { X, Wallet, DollarSign, Gift, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Item } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import AnimatedNFT from './AnimatedNFT';
import TonIcon from './TonIcon';

interface ItemActionModalProps {
  item: Item;
  onClose: () => void;
  onSell: () => void;
  onWithdraw: () => void;
}

export default function ItemActionModal({ item, onClose, onSell, onWithdraw }: ItemActionModalProps) {
  const rarityStyle = getRarityStyle(item.rarity);
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [nftId, setNftId] = useState<string | null>(null);

  const handleMintNFT = async () => {
    setIsMinting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mint-nft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: localStorage.getItem('telegram_user_id') || 'demo',
            itemId: item.id,
            itemName: item.name,
            itemRarity: item.rarity,
            itemPrice: item.price,
            itemImage: item.image_url,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMintSuccess(true);
        setNftId(data.nftId);
      }
    } catch (error) {
      console.error('Minting failed:', error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl max-w-md w-full p-6 relative border border-gray-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className={`${rarityStyle.bg} rounded-2xl p-6 border-2 ${rarityStyle.border} ${rarityStyle.shadow} mb-4`}>
            <div className="w-48 h-48 mx-auto mb-4">
              <AnimatedNFT
                src={item.image_url}
                alt={item.name}
                rarity={item.rarity}
                autoplay={true}
                className="w-full h-full"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{item.name}</h2>
            <p className={`${rarityStyle.text} text-sm font-semibold capitalize mb-3`}>
              {item.rarity} Rarity
            </p>
            <div className="flex items-center justify-center gap-2 bg-black/30 px-4 py-2 rounded-lg inline-flex">
              <TonIcon className="w-6 h-6" />
              <span className="text-blue-300 text-xl font-bold">{item.price}</span>
            </div>
          </div>
        </div>

        {mintSuccess && nftId ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500 rounded-xl p-4 text-center">
              <Sparkles size={48} className="text-green-400 mx-auto mb-3" />
              <h3 className="text-green-300 font-bold text-lg mb-2">NFT Minted Successfully!</h3>
              <p className="text-green-200 text-sm mb-3">Your item has been converted to an NFT</p>
              <p className="text-gray-300 text-xs font-mono bg-black/30 px-3 py-2 rounded">{nftId}</p>
            </div>

            <button
              onClick={onWithdraw}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50"
            >
              <Wallet size={20} />
              <span>Transfer to TON Wallet</span>
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleMintNFT}
              disabled={isMinting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50 disabled:cursor-not-allowed"
            >
              {isMinting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Minting NFT...</span>
                </>
              ) : (
                <>
                  <Gift size={20} />
                  <span>Mint as NFT</span>
                </>
              )}
            </button>

            <button
              onClick={onSell}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/50"
            >
              <DollarSign size={20} />
              <span>Sell for</span>
              <span className="text-green-200">{(item.price * 0.94).toFixed(2)}</span>
              <TonIcon className="w-5 h-5" />
            </button>

            <button
              onClick={onWithdraw}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50"
            >
              <Wallet size={20} />
              <span>Transfer to Wallet</span>
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
