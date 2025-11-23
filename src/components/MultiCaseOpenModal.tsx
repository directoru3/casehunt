import { X, Plus, Minus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Case, Item } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import TonIcon from './TonIcon';

interface MultiCaseOpenModalProps {
  cases: Case[];
  onClose: () => void;
  onOpenCases: (selections: { caseData: Case; count: number }[]) => void;
  balance: number;
}

export default function MultiCaseOpenModal({ cases, onClose, onOpenCases, balance }: MultiCaseOpenModalProps) {
  const [selections, setSelections] = useState<{ [caseId: string]: number }>({});

  const updateCount = (caseId: string, delta: number) => {
    const currentCount = selections[caseId] || 0;
    const newCount = Math.max(0, Math.min(5, currentCount + delta));

    const totalSelected = Object.values(selections).reduce((sum, count) => sum + count, 0) - currentCount + newCount;

    if (totalSelected <= 5) {
      setSelections(prev => ({
        ...prev,
        [caseId]: newCount
      }));
    }
  };

  const totalSelected = Object.values(selections).reduce((sum, count) => sum + count, 0);
  const totalCost = cases.reduce((sum, caseData) => {
    const count = selections[caseData.id] || 0;
    return sum + (caseData.price * count);
  }, 0);

  const canAfford = totalCost <= balance;

  const handleOpenAll = () => {
    const selectionsArray = cases
      .filter(caseData => (selections[caseData.id] || 0) > 0)
      .map(caseData => ({
        caseData,
        count: selections[caseData.id]
      }));

    onOpenCases(selectionsArray);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-white">Multi-Open Cases</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={28} />
            </button>
          </div>
          <p className="text-gray-400">Select up to 5 cases to open at once</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((caseData) => {
              const count = selections[caseData.id] || 0;
              const rarityStyle = getRarityStyle('rare');

              return (
                <div
                  key={caseData.id}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border-2 transition-all ${
                    count > 0 ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-gray-700'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={caseData.image_url}
                        alt={caseData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">{caseData.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <TonIcon className="w-5 h-5" />
                        <span className="text-white font-bold">{caseData.price}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCount(caseData.id, -1)}
                          disabled={count === 0}
                          className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Minus size={16} className="text-white" />
                        </button>

                        <div className="w-12 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">{count}</span>
                        </div>

                        <button
                          onClick={() => updateCount(caseData.id, 1)}
                          disabled={count === 5 || totalSelected >= 5}
                          className="w-8 h-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Plus size={16} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">Selected Cases</p>
              <p className="text-white text-2xl font-bold">{totalSelected} / 5</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm text-right">Total Cost</p>
              <div className="flex items-center gap-2 justify-end">
                <TonIcon className="w-6 h-6" />
                <p className="text-white text-2xl font-bold">{totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {!canAfford && totalSelected > 0 && (
            <p className="text-orange-400 text-sm mb-4 text-center">
              ⚠️ Insufficient funds! You need {totalCost.toFixed(2)} TON, you have {balance.toFixed(2)} TON
            </p>
          )}

          <button
            onClick={handleOpenAll}
            disabled={totalSelected === 0 || !canAfford}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            <span>OPEN ALL ({totalSelected})</span>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
}
