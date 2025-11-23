import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Item } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import TonIcon from './TonIcon';

interface MultiCaseResultModalProps {
  winners: Item[];
  onClaimAll: () => void;
}

export default function MultiCaseResultModal({ winners, onClaimAll }: MultiCaseResultModalProps) {
  const [showAnimation, setShowAnimation] = useState(true);
  const [revealedItems, setRevealedItems] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showAnimation) {
      const interval = setInterval(() => {
        setRevealedItems(prev => {
          if (prev < winners.length) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [showAnimation, winners.length]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {showAnimation ? (
        <div className="text-center animate-scale-in">
          <div className="relative inline-block mb-8">
            <div className="w-40 h-40 border-8 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="text-blue-400 animate-pulse" size={64} />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 animate-pulse">
            Opening Cases...
          </h1>
          <p className="text-gray-400 text-xl">
            {winners.length} cases being opened
          </p>
        </div>
      ) : (
        <div className="max-w-6xl w-full px-4 animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4 animate-bounce-slow">
              CONGRATULATIONS!
            </h1>
            <p className="text-2xl text-gray-300">
              You won {winners.length} amazing items!
            </p>
          </div>

          <div className="relative mb-12">
            <div className="flex gap-6 overflow-x-auto pb-6 px-4 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
              {winners.map((item, index) => {
                const rarityStyle = getRarityStyle(item.rarity);
                const isRevealed = index < revealedItems;

                return (
                  <div
                    key={index}
                    className={`flex-shrink-0 w-80 transition-all duration-500 ${
                      isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                    }`}
                  >
                    <div className={`${rarityStyle.bg} rounded-2xl p-6 border-4 ${rarityStyle.border} ${rarityStyle.shadow} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />

                      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-white font-bold text-sm">#{index + 1}</span>
                      </div>

                      <div className="relative z-10">
                        <div className="w-full h-64 mb-4 flex items-center justify-center bg-black/20 rounded-xl">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain drop-shadow-2xl animate-float-slow"
                          />
                        </div>

                        <h3 className="text-white text-2xl font-bold mb-2 text-center">
                          {item.name}
                        </h3>

                        <p className={`${rarityStyle.text} text-lg font-semibold uppercase text-center mb-4`}>
                          {item.rarity} Rarity
                        </p>

                        <div className="flex items-center justify-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg py-3">
                          <TonIcon className="w-6 h-6" />
                          <span className="text-white text-xl font-bold">{item.price} TON</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute left-0 top-0 bottom-6 w-20 bg-gradient-to-r from-black/90 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-6 w-20 bg-gradient-to-l from-black/90 to-transparent pointer-events-none" />
          </div>

          <div className="text-center">
            <button
              onClick={onClaimAll}
              disabled={revealedItems < winners.length}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-6 px-12 rounded-2xl transition-all shadow-2xl hover:shadow-green-500/50 disabled:cursor-not-allowed text-2xl flex items-center gap-3 mx-auto"
            >
              <Sparkles size={28} />
              <span>CLAIM ALL ITEMS</span>
            </button>
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${4 + Math.random() * 3}s`
                }}
              >
                <Sparkles
                  size={10 + Math.random() * 20}
                  className="text-blue-400 opacity-30"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scale-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
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
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-shine {
          animation: shine 3s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  );
}
