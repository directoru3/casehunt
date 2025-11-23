import { Plus } from 'lucide-react';
import TonConnectButton from './TonConnectButton';

interface HeaderProps {
  balance?: number;
  onDepositClick?: () => void;
}

export default function Header({ balance = 0, onDepositClick }: HeaderProps) {
  return (
    <header className="bg-black/90 backdrop-blur-sm border-b border-gray-800 px-3 md:px-4 py-2 md:py-3 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-end">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-2 md:px-4 py-1.5 md:py-2 rounded-lg border border-blue-500/50">
              <span className="text-white font-bold text-sm md:text-lg">{balance.toFixed(2)}</span>
              <svg className="w-4 h-4 md:w-6 md:h-6" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0098EA"/>
                <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5381 22.4861C43.3045 19.4251 41.0761 15.6277 37.5627 15.6277H37.5603Z" fill="white"/>
              </svg>
            </div>
            {onDepositClick && (
              <button
                onClick={onDepositClick}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 active:scale-95 text-white font-bold px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/50 flex items-center gap-1 touch-manipulation"
              >
                <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-xs md:text-sm">Deposit</span>
              </button>
            )}
          </div>
          <TonConnectButton />
        </div>
      </div>
    </header>
  );
}
