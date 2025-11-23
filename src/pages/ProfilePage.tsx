import { Package, TrendingUp, Copy, Star } from 'lucide-react';
import { useState } from 'react';
import { Item } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import ItemActionModal from '../components/ItemActionModal';
import AnimatedNFT from '../components/AnimatedNFT';
import TonIcon from '../components/TonIcon';
import { telegramAuth } from '../utils/telegramAuth';

interface ProfilePageProps {
  inventory: Item[];
  balance: number;
  onSellItem: (item: Item, inventoryIndex: number) => void;
  onWithdrawItem: (item: Item, inventoryIndex: number) => void;
}

export default function ProfilePage({ inventory, balance, onSellItem, onWithdrawItem }: ProfilePageProps) {
  const [selectedItem, setSelectedItem] = useState<{ item: Item; index: number } | null>(null);
  const totalItems = inventory.length;
  const currentUser = telegramAuth.getCurrentUser();
  const userId = currentUser?.id || 0;
  const referralCode = `NFT-${userId.toString().slice(-6).toUpperCase()}`;

  const handleSell = () => {
    if (selectedItem) {
      onSellItem(selectedItem.item, selectedItem.index);
      setSelectedItem(null);
    }
  };

  const handleWithdraw = () => {
    if (selectedItem) {
      onWithdrawItem(selectedItem.item, selectedItem.index);
      setSelectedItem(null);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

          <div className="flex items-center gap-6 mb-6 relative z-10">
            <div className="relative">
              <img
                src={telegramAuth.getAvatarUrl()}
                alt={telegramAuth.getDisplayName()}
                className="w-24 h-24 rounded-full border-4 border-white/30 shadow-xl"
              />
              {currentUser?.isPremium && (
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1.5 border-2 border-white">
                  <Star size={16} className="text-white fill-white" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">{telegramAuth.getDisplayName()}</h1>
              {currentUser?.username && (
                <p className="text-white/90 text-lg mb-1">@{currentUser.username}</p>
              )}
              <div className="flex items-center gap-2">
                <p className="text-white/70">ID: {userId}</p>
                {currentUser?.isPremium && (
                  <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Star size={12} className="fill-yellow-300" />
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package size={20} className="text-white" />
                <p className="text-white/80 text-sm">Total Items</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalItems}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-white" />
                <p className="text-white/80 text-sm">Balance</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-white">{balance.toFixed(2)}</p>
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                  V
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Referral Program</h2>
          <p className="text-gray-400 text-sm mb-4">
            Share your referral code with friends and get bonuses!
          </p>
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-white font-mono">{referralCode}</span>
              <button
                onClick={copyReferralCode}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Referrals</p>
              <p className="text-white text-2xl font-bold">0</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Bonus Earned</p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-white text-2xl font-bold">0</p>
                <TonIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Active</p>
              <p className="text-green-400 text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">My Inventory</h2>

          {inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package size={64} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Your inventory is empty</p>
              <p className="text-gray-500 text-sm mt-2">Open cases to collect NFT items!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {inventory.map((item, index) => {
                const rarityStyle = getRarityStyle(item.rarity);
                return (
                  <div
                    key={`${item.id}-${index}`}
                    onClick={() => setSelectedItem({ item, index })}
                    className={`${rarityStyle.bg} rounded-xl p-4 border-2 ${rarityStyle.border} ${rarityStyle.shadow} ${rarityStyle.glow} transition-all cursor-pointer group`}
                  >
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-black/20">
                      <AnimatedNFT
                        src={item.image_url}
                        alt={item.name}
                        rarity={item.rarity}
                        autoplay={true}
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-white text-sm font-bold truncate mb-1">{item.name}</p>
                    <div className="flex items-center justify-between">
                      <p className={`${rarityStyle.text} text-xs capitalize font-semibold`}>
                        {item.rarity}
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-white/90 rounded-full flex items-center justify-center text-gray-900 text-[10px] font-bold">
                          V
                        </div>
                        <span className="text-white text-xs font-bold">{item.price}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <ItemActionModal
          item={selectedItem.item}
          onClose={() => setSelectedItem(null)}
          onSell={handleSell}
          onWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
}
