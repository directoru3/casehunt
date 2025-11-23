import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, TrendingUp } from 'lucide-react';
import { Item, supabase } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';

interface CrashBet {
  id: string;
  user_id: string;
  username: string;
  item_id: string;
  item_name: string;
  item_image: string;
  item_rarity: string;
  bet_amount: number;
  cashout_multiplier: number | null;
  winnings: number | null;
  status: 'pending' | 'cashed_out' | 'lost';
}

interface CrashPageProps {
  inventory: Item[];
  balance: number;
  setBalance: (balance: number) => void;
  addItemToInventory: (item: Item) => void;
}

export default function CrashPage({ inventory, balance, setBalance, addItemToInventory }: CrashPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'crashed'>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [currentBets, setCurrentBets] = useState<CrashBet[]>([]);
  const [myBet, setMyBet] = useState<CrashBet | null>(null);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [countdown, setCountdown] = useState(10);
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();

  const generateCrashPoint = () => {
    return 1.5 + Math.random() * 3.5;
  };

  const fetchCurrentBets = async (roundId: string) => {
    const { data, error } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const betsWithUsernames = await Promise.all(
        data.map(async (bet) => {
          const { data: profile } = await supabase
            .from('crash_user_profiles')
            .select('username')
            .eq('user_id', bet.user_id)
            .maybeSingle();

          return {
            ...bet,
            username: profile?.username || 'Anonymous',
          } as CrashBet;
        })
      );
      setCurrentBets(betsWithUsernames);
    }
  };

  const createNewRound = async () => {
    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);

    const { data, error } = await supabase
      .from('crash_rounds')
      .insert({
        crash_multiplier: newCrashPoint,
        status: 'waiting',
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentRoundId(data.id);
      return data.id;
    }
    return null;
  };

  const startRound = async (roundId: string) => {
    await supabase
      .from('crash_rounds')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', roundId);

    setGameState('playing');
    setMultiplier(1.0);
    animateGraph(roundId);
  };

  const endRound = async (roundId: string, finalMultiplier: number) => {
    await supabase
      .from('crash_rounds')
      .update({
        status: 'crashed',
        ended_at: new Date().toISOString(),
        crash_multiplier: finalMultiplier
      })
      .eq('id', roundId);

    const { data: bets } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('round_id', roundId)
      .eq('status', 'pending');

    if (bets) {
      for (const bet of bets) {
        await supabase
          .from('crash_bets')
          .update({ status: 'lost' })
          .eq('id', bet.id);
      }
    }

    setGameState('crashed');
  };

  const animateGraph = (roundId: string) => {
    const startTime = Date.now();
    const duration = 7000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentMultiplier = 1 + Math.pow(progress, 1.5) * (crashPoint - 1);

      if (currentMultiplier >= crashPoint || progress >= 1) {
        setMultiplier(crashPoint);
        endRound(roundId, crashPoint);

        if (myBet && myBet.status === 'pending') {
          setMyBet({ ...myBet, status: 'lost' });
          if (selectedItem) {
            addItemToInventory(selectedItem);
          }
        }
        return;
      }

      setMultiplier(currentMultiplier);
      drawGraph(currentMultiplier);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const drawGraph = (currentMultiplier: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CANVAS_WIDTH = canvas.width;
    const CANVAS_HEIGHT = canvas.height;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#1a4d4d';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    ctx.strokeStyle = gameState === 'crashed' ? '#ef4444' : '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, CANVAS_HEIGHT - 50);

    const progress = (currentMultiplier - 1) / (crashPoint - 1);
    const pointCount = Math.floor(progress * 100);

    for (let i = 1; i <= pointCount; i++) {
      const p = i / 100;
      const x = 20 + (CANVAS_WIDTH - 40) * p;
      const mult = 1 + Math.pow(p, 1.5) * (crashPoint - 1);
      let y = CANVAS_HEIGHT - 50 - Math.log(mult) * 60;
      y = Math.max(20, y);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = gameState === 'crashed' ? '#ef4444' : '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentMultiplier.toFixed(2)}x`, CANVAS_WIDTH / 2, 80);
  };

  const handleBet = async (item: Item) => {
    if (gameState !== 'waiting' || !currentRoundId) return;

    setSelectedItem(item);
    setBetAmount(item.price);

    const { data: profile } = await supabase
      .from('crash_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      await supabase.from('crash_user_profiles').insert({
        user_id: userId,
        username: `Player${Math.floor(Math.random() * 9999)}`,
      });
    }

    const { data: betData } = await supabase
      .from('crash_bets')
      .insert({
        round_id: currentRoundId,
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        item_image: item.image_url,
        item_rarity: item.rarity,
        bet_amount: item.price,
        status: 'pending',
      })
      .select()
      .single();

    if (betData) {
      const newBet: CrashBet = {
        ...betData,
        username: 'You',
      };
      setMyBet(newBet);
      await fetchCurrentBets(currentRoundId);
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'playing' || !myBet || !selectedItem || !currentRoundId) return;

    const winnings = selectedItem.price * multiplier;

    await supabase
      .from('crash_bets')
      .update({
        status: 'cashed_out',
        cashout_multiplier: multiplier,
        winnings: winnings,
      })
      .eq('id', myBet.id);

    setWonAmount(winnings);
    setCashoutMultiplier(multiplier);
    setBalance(balance + winnings);

    const wonItem: Item = {
      id: `won-${Date.now()}`,
      name: `${selectedItem.name} (${multiplier.toFixed(2)}x)`,
      image_url: selectedItem.image_url,
      rarity: selectedItem.rarity,
      price: winnings,
    };
    addItemToInventory(wonItem);

    setMyBet({ ...myBet, status: 'cashed_out', cashout_multiplier: multiplier, winnings });
  };

  useEffect(() => {
    const initGame = async () => {
      const roundId = await createNewRound();
      if (roundId) {
        setCountdown(10);
      }
    };

    initGame();

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'waiting' && currentRoundId) {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            startRound(currentRoundId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else if (gameState === 'crashed') {
      const resetTimeout = setTimeout(async () => {
        setMyBet(null);
        setSelectedItem(null);
        setBetAmount(null);
        setWonAmount(null);
        setCashoutMultiplier(null);
        setCurrentBets([]);
        setMultiplier(1.0);

        const roundId = await createNewRound();
        if (roundId) {
          setGameState('waiting');
          setCountdown(10);
        }
      }, 3000);

      return () => clearTimeout(resetTimeout);
    }
  }, [gameState, currentRoundId]);

  useEffect(() => {
    if (currentRoundId && gameState === 'waiting') {
      const interval = setInterval(() => {
        fetchCurrentBets(currentRoundId);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentRoundId, gameState]);

  useEffect(() => {
    if (gameState === 'waiting' || gameState === 'crashed') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 pt-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-end gap-2 mb-8">
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl mb-8 relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full"
          />

          {gameState === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-white text-4xl font-bold mb-4">Раунд начнется через {countdown}с</p>
                <p className="text-gray-300 text-lg">Выберите предмет для ставки</p>
              </div>
            </div>
          )}

          {gameState === 'crashed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                {wonAmount ? (
                  <>
                    <p className="text-green-400 text-4xl font-bold mb-2">🎉 ВЫИГРЫШ! 🎉</p>
                    <p className="text-white text-3xl mb-2">+{wonAmount.toFixed(2)} TON</p>
                    <p className="text-gray-300">Коэффициент: {cashoutMultiplier?.toFixed(2)}x</p>
                  </>
                ) : myBet ? (
                  <>
                    <p className="text-red-400 text-4xl font-bold mb-2">💥 ОБРУШЕНИЕ! 💥</p>
                    <p className="text-white text-xl">Предмет возвращен в инвентарь</p>
                    <p className="text-gray-300 text-sm mt-2">На коэффициенте {crashPoint.toFixed(2)}x</p>
                  </>
                ) : (
                  <>
                    <p className="text-red-400 text-4xl font-bold mb-2">💥 ОБРУШЕНИЕ! 💥</p>
                    <p className="text-gray-300 text-sm mt-2">На коэффициенте {crashPoint.toFixed(2)}x</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Статистика
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Коэффициент:</span>
                <span className="text-blue-400 font-bold text-2xl">{multiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Ставка:</span>
                <span className="text-white font-bold">{betAmount?.toFixed(2) || '—'} TON</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Потенциальный выигрыш:</span>
                <span className="text-green-400 font-bold">{betAmount ? (betAmount * multiplier).toFixed(2) : '—'} TON</span>
              </div>
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-gray-400">Баланс:</span>
                <span className="text-blue-300 font-bold">{balance.toFixed(2)} TON</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-white font-bold text-lg mb-4">Ваша ставка</h3>
            {selectedItem ? (
              <div className={`${getRarityStyle(selectedItem.rarity).bg} rounded-xl p-4 border-2 ${getRarityStyle(selectedItem.rarity).border} ${getRarityStyle(selectedItem.rarity).shadow}`}>
                <div className="mb-3 h-24 overflow-hidden rounded-lg bg-black/20">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-white font-bold text-center text-sm mb-2">{selectedItem.name}</p>
                <p className={`${getRarityStyle(selectedItem.rarity).text} text-center text-xs capitalize mb-3`}>
                  {selectedItem.rarity}
                </p>
                <div className="flex items-center justify-center gap-2 bg-black/30 rounded-lg py-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    V
                  </div>
                  <span className="text-white font-bold">{selectedItem.price} TON</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Ставка не выбрана</p>
            )}
          </div>
        </div>

        {gameState === 'playing' && myBet && (
          <button
            onClick={handleCashout}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 rounded-2xl transition-all text-xl shadow-2xl hover:shadow-green-500/50 hover:scale-105 transform border border-green-400/50 mb-8"
          >
            💰 Забрать выигрыш ({(betAmount! * multiplier).toFixed(2)} TON)
          </button>
        )}

        {currentBets.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-8">
            <h3 className="text-white font-bold text-lg px-6 py-4 border-b border-slate-700">
              Ставки игроков ({currentBets.length + (myBet ? 1 : 0)})
            </h3>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
              {myBet && (
                <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl p-3 border-2 border-cyan-500 shadow-lg shadow-cyan-500/30">
                  <div className="mb-2 h-12 overflow-hidden rounded-lg bg-black/20">
                    <img
                      src={myBet.item_image}
                      alt={myBet.item_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-cyan-300 text-xs font-bold mb-1">{myBet.username}</p>
                  <p className="text-white text-xs font-bold truncate mb-1">{myBet.item_name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white text-[7px] font-bold">
                      V
                    </div>
                    <span className="text-white text-xs font-bold">{myBet.bet_amount.toFixed(1)}</span>
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded text-center text-xs font-bold ${
                    myBet.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    myBet.status === 'cashed_out' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {myBet.status === 'pending' ? '⏳' : myBet.status === 'cashed_out' ? '✅' : '❌'}
                    {myBet.cashout_multiplier && ` ${myBet.cashout_multiplier.toFixed(2)}x`}
                  </div>
                </div>
              )}
              {currentBets.filter(bet => bet.user_id !== userId).map((bet) => (
                <div
                  key={bet.id}
                  className={`rounded-xl p-3 border-2 ${
                    bet.status === 'pending'
                      ? 'bg-slate-700/50 border-slate-600'
                      : bet.status === 'cashed_out'
                      ? 'bg-green-600/20 border-green-500'
                      : 'bg-red-600/20 border-red-500'
                  }`}
                >
                  <div className="mb-2 h-12 overflow-hidden rounded-lg bg-black/20">
                    <img
                      src={bet.item_image}
                      alt={bet.item_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-gray-300 text-xs font-bold mb-1">{bet.username}</p>
                  <p className="text-white text-xs font-bold truncate mb-1">{bet.item_name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white text-[7px] font-bold">
                      V
                    </div>
                    <span className="text-white text-xs font-bold">{bet.bet_amount.toFixed(1)}</span>
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded text-center text-xs font-bold ${
                    bet.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    bet.status === 'cashed_out' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {bet.status === 'pending' ? '⏳' : bet.status === 'cashed_out' ? '✅' : '❌'}
                    {bet.cashout_multiplier && ` ${bet.cashout_multiplier.toFixed(2)}x`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <h3 className="text-white font-bold text-lg px-6 py-4 border-b border-slate-700">Выберите предмет для ставки</h3>
          {inventory.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">В вашем инвентаре нет предметов</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {inventory.map((item, idx) => {
                const rarityStyle = getRarityStyle(item.rarity);
                const isSelected = selectedItem?.id === item.id;

                return (
                  <div
                    key={`crash-${idx}`}
                    onClick={() => {
                      if (gameState === 'waiting' && !selectedItem) {
                        handleBet(item);
                      }
                    }}
                    className={`group ${rarityStyle.bg} rounded-xl p-3 border-2 ${rarityStyle.border} ${rarityStyle.shadow} transition-all ${
                      gameState === 'waiting' && !selectedItem
                        ? 'cursor-pointer hover:scale-110'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isSelected ? 'ring-4 ring-cyan-500 scale-110' : ''}`}
                  >
                    <div className="mb-2 h-20 overflow-hidden rounded-lg bg-black/20">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <p className="text-white text-xs font-bold truncate">{item.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <div className="w-3 h-3 bg-white/90 rounded-full flex items-center justify-center text-slate-900 text-[8px] font-bold">
                        V
                      </div>
                      <span className="text-white text-xs font-bold">{item.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
