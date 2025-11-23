import { Sparkles, Gift, Lock, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface WelcomeScreenProps {
  onLogin: () => void;
  isLoading: boolean;
}

export default function WelcomeScreen({ onLogin, isLoading }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl flex items-center justify-center transform rotate-12 shadow-2xl shadow-blue-500/50">
              <Gift size={64} className="text-white transform -rotate-12" />
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles size={32} className="text-white" />
            </div>
          </div>

          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            NFT Gifts
          </h1>
          <p className="text-gray-300 text-xl mb-8">
            Open cases, collect animated NFTs, and win amazing prizes!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-blue-500 transition-all hover:scale-105">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
              <Gift size={24} className="text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Open Cases</h3>
            <p className="text-gray-400 text-sm">
              Spin the wheel and win exclusive animated NFT items
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-cyan-500 transition-all hover:scale-105">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-xl flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Collect NFTs</h3>
            <p className="text-gray-400 text-sm">
              Build your collection of animated Telegram gifts
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-green-500 transition-all hover:scale-105">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={24} className="text-green-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Trade & Earn</h3>
            <p className="text-gray-400 text-sm">
              Upgrade items and withdraw to your TON wallet
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-gray-700 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock size={24} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">
                Login Required
              </h3>
              <p className="text-gray-300">
                Connect with your Telegram account to start opening cases and collecting NFTs.
                Your progress will be saved automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all shadow-2xl hover:shadow-blue-500/50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 4-1.74 6.68-2.89 8.03-3.45 3.82-1.59 4.62-1.87 5.14-1.88.11 0 .37.03.54.17.14.11.18.26.2.37.01.06.03.22.01.34z"/>
                </svg>
                <span>Continue with Telegram</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}
            >
              <Sparkles
                size={10 + Math.random() * 20}
                className="text-blue-400 opacity-20"
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
