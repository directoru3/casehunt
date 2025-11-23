import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Item } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import { getAllItems } from '../data/mockData';
import TonIcon from '../components/TonIcon';

interface UpgradePageProps {
  inventory: Item[];
  onUpgrade: (fromIndex: number, toItem: Item, success: boolean) => void;
}

export default function UpgradePage({ inventory, onUpgrade }: UpgradePageProps) {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [targetItem, setTargetItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'target'>('inventory');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<'success' | 'fail' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const selectedItem = selectedItemIndex !== null ? inventory[selectedItemIndex] : null;
  const allItems = getAllItems();

  const getTargetItems = () => {
    if (!selectedItem) return [];
    const minPrice = selectedItem.price * 1.8;
    const maxPrice = selectedItem.price * 2.2;
    return allItems.filter(item =>
      item.price >= minPrice &&
      item.price <= maxPrice &&
      item.id !== selectedItem.id
    );
  };

  const targetItems = getTargetItems();

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTargets = targetItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateChance = () => {
    if (!selectedItem || !targetItem) return 0;
    const ratio = selectedItem.price / targetItem.price;
    return Math.round(ratio * 100);
  };

  const handleUpgrade = () => {
    if (!selectedItem || !targetItem || selectedItemIndex === null || isUpgrading) return;

    setIsUpgrading(true);
    setUpgradeResult(null);
    setShowResult(false);

    setTimeout(() => {
      const chance = calculateChance();
      const success = Math.random() * 100 < chance;
      setUpgradeResult(success ? 'success' : 'fail');
      setIsUpgrading(false);
      setShowResult(true);

      setTimeout(() => {
        if (selectedItemIndex !== null) {
          onUpgrade(selectedItemIndex, targetItem!, success);
        }
        setShowResult(false);
        setUpgradeResult(null);
        setSelectedItemIndex(null);
        setTargetItem(null);
      }, 3000);
    }, 3000);
  };

  const chance = calculateChance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-bold mb-6 transition-all shadow-lg hover:shadow-xl">
            ВОЙТИ ЧЕРЕЗ TELEGRAM
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Апгрейд NFT
          </h1>
          <p className="text-gray-400">Улучшите ваши подарки на более ценные!</p>
        </div>

        {isUpgrading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 border-8 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-blue-400 animate-pulse" size={48} />
                </div>
              </div>
              <p className="text-white text-2xl font-bold mt-6 animate-pulse">
                Улучшение...
              </p>
              <p className="text-gray-400 text-lg mt-2">
                Шанс успеха: {chance}%
              </p>
            </div>
          </div>
        )}

        {showResult && upgradeResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className={`absolute inset-0 ${upgradeResult === 'success' ? 'bg-gradient-to-br from-green-600/80 to-emerald-600/80' : 'bg-gradient-to-br from-red-600/80 to-rose-600/80'}`} />

            <div className="absolute inset-0 overflow-hidden">
              {upgradeResult === 'success' && [...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-10%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                >
                  <Sparkles
                    size={15 + Math.random() * 25}
                    className="text-yellow-300 opacity-80"
                  />
                </div>
              ))}
            </div>

            <div className="relative z-10 text-center animate-scale-in">
              {upgradeResult === 'success' ? (
                <>
                  <div className="mb-8">
                    <CheckCircle2 className="text-white mx-auto mb-6 animate-bounce-slow drop-shadow-2xl" size={120} />
                    <h1 className="text-7xl font-bold text-white mb-4 animate-pulse-slow drop-shadow-2xl">
                      УСПЕШНО!
                    </h1>
                    <p className="text-2xl text-green-100 font-semibold">
                      Апгрейд выполнен успешно!
                    </p>
                  </div>

                  {targetItem && (
                    <div className="relative inline-block p-8 rounded-3xl border-4 border-white bg-black/30 backdrop-blur-sm shadow-2xl">
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
                      <img
                        src={targetItem.image_url}
                        alt={targetItem.name}
                        className="w-64 h-64 object-contain drop-shadow-2xl relative z-10 animate-float-slow"
                      />
                      <div className="mt-6">
                        <h2 className="text-3xl font-bold text-white mb-3">
                          {targetItem.name}
                        </h2>
                        <div className="flex items-center justify-center gap-3">
                          <TonIcon className="w-8 h-8" />
                          <span className="text-2xl font-bold text-white">{targetItem.price} TON</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-8">
                    <XCircle className="text-white mx-auto mb-6 animate-shake drop-shadow-2xl" size={120} />
                    <h1 className="text-7xl font-bold text-white mb-4 animate-pulse-slow drop-shadow-2xl">
                      НЕУДАЧА!
                    </h1>
                    <p className="text-2xl text-red-100 font-semibold">
                      Апгрейд не удался
                    </p>
                  </div>

                  {selectedItem && (
                    <div className="relative inline-block p-8 rounded-3xl border-4 border-white bg-black/30 backdrop-blur-sm shadow-2xl opacity-50">
                      <img
                        src={selectedItem.image_url}
                        alt={selectedItem.name}
                        className="w-48 h-48 object-contain drop-shadow-2xl grayscale"
                      />
                      <div className="mt-6">
                        <h2 className="text-2xl font-bold text-white mb-3">
                          Предмет потерян
                        </h2>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-white font-bold text-lg mb-4">Исходный предмет</h3>
            {selectedItem ? (
              <div className={`${getRarityStyle(selectedItem.rarity).bg} rounded-xl p-4 border-2 ${getRarityStyle(selectedItem.rarity).border}`}>
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full aspect-square object-cover rounded-lg mb-3"
                />
                <p className="text-white font-bold text-sm truncate mb-2">{selectedItem.name}</p>
                <div className="flex items-center justify-center gap-2">
                  <TonIcon className="w-5 h-5" />
                  <span className="text-white font-bold">{selectedItem.price}</span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-xl">
                <p className="text-gray-500">Выберите предмет</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-white font-bold text-lg mb-4">Целевой предмет</h3>
            {targetItem ? (
              <div className={`${getRarityStyle(targetItem.rarity).bg} rounded-xl p-4 border-2 ${getRarityStyle(targetItem.rarity).border}`}>
                <img
                  src={targetItem.image_url}
                  alt={targetItem.name}
                  className="w-full aspect-square object-cover rounded-lg mb-3"
                />
                <p className="text-white font-bold text-sm truncate mb-2">{targetItem.name}</p>
                <div className="flex items-center justify-center gap-2">
                  <TonIcon className="w-5 h-5" />
                  <span className="text-white font-bold">{targetItem.price}</span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-xl">
                <p className="text-gray-500">Выберите цель</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-2xl p-6 border-2 border-blue-500/50">
            <h3 className="text-white font-bold text-lg mb-4">Информация</h3>
            {selectedItem && targetItem ? (
              <div className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Шанс успеха</p>
                  <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${chance}%` }}
                    />
                    <p className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                      {chance}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? 'Улучшение...' : 'УЛУЧШИТЬ'}
                </button>
                <p className="text-gray-400 text-xs text-center">
                  При неудаче исходный предмет будет потерян
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Выберите предметы для апгрейда
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Мой инвентарь
              </button>
              <button
                onClick={() => setActiveTab('target')}
                disabled={!selectedItem}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                  activeTab === 'target' && selectedItem
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white disabled:cursor-not-allowed'
                }`}
              >
                Целевые предметы
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Поиск предметов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'inventory' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredInventory.map((item, index) => {
                  const rarityStyle = getRarityStyle(item.rarity);
                  const isSelected = selectedItemIndex === index;
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      onClick={() => {
                        setSelectedItemIndex(index);
                        setTargetItem(null);
                      }}
                      className={`${rarityStyle.bg} rounded-xl p-3 border-2 ${rarityStyle.border} ${
                        isSelected ? 'ring-4 ring-blue-500' : ''
                      } cursor-pointer hover:scale-105 transition-all`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                      <p className="text-white text-xs font-bold truncate mb-1">{item.name}</p>
                      <div className="flex items-center justify-center gap-1">
                        <TonIcon className="w-4 h-4" />
                        <span className="text-white text-xs font-bold">{item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredTargets.map((item) => {
                  const rarityStyle = getRarityStyle(item.rarity);
                  const isSelected = targetItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setTargetItem(item)}
                      className={`${rarityStyle.bg} rounded-xl p-3 border-2 ${rarityStyle.border} ${
                        isSelected ? 'ring-4 ring-blue-500' : ''
                      } cursor-pointer hover:scale-105 transition-all`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                      <p className="text-white text-xs font-bold truncate mb-1">{item.name}</p>
                      <div className="flex items-center justify-center gap-1">
                        <TonIcon className="w-4 h-4" />
                        <span className="text-white text-xs font-bold">{item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-float-slow {
          animation: float-slow 3s ease-in-out infinite;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        .animate-shine {
          animation: shine 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
