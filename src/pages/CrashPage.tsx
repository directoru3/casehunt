import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, TrendingUp, Rocket, Star } from 'lucide-react';
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
  removeItemFromInventory: (itemId: string) => void;
}

export default function CrashPage({ inventory, balance, setBalance, addItemToInventory, removeItemFromInventory }: CrashPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'crashed'>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [nextRoundId, setNextRoundId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [nextRoundItem, setNextRoundItem] = useState<Item | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [currentBets, setCurrentBets] = useState<CrashBet[]>([]);
  const [myBet, setMyBet] = useState<CrashBet | null>(null);
  const [myNextRoundBet, setMyNextRoundBet] = useState<CrashBet | null>(null);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [username] = useState(() => `Player${Math.floor(Math.random() * 9999)}`);
  const [countdown, setCountdown] = useState(10);
  const [history, setHistory] = useState<number[]>([]);
  const animationRef = useRef<number>();
  const starsRef = useRef<Array<{ x: number; y: number; size: number; speed: number }>>([]);

  const generateCrashPoint = () => {
    return 1.5 + Math.random() * 3.5;
  };

  const initializeStars = () => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.2,
      });
    }
    starsRef.current = stars;
  };

  const fetchCurrentBets = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('crash_bets')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bets:', error);
        return;
      }

      if (data) {
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
    } catch (err) {
      console.error('Exception fetching bets:', err);
    }
  };

  const createNewRound = async () => {
    try {
      const newCrashPoint = generateCrashPoint();

      const { data, error } = await supabase
        .from('crash_rounds')
        .insert({
          crash_multiplier: newCrashPoint,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating round:', error);
        return null;
      }

      if (data) {
        console.log('Created new round:', data.id, 'crash point:', newCrashPoint);
        return { id: data.id, crashPoint: newCrashPoint };
      }
      return null;
    } catch (err) {
      console.error('Exception creating round:', err);
      return null;
    }
  };

  const startRound = async (roundId: string, roundCrashPoint: number) => {
    try {
      console.log('Starting round:', roundId, 'with crash point:', roundCrashPoint);
      setCrashPoint(roundCrashPoint);

      await supabase
        .from('crash_rounds')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', roundId);

      setGameState('playing');
      setMultiplier(1.0);

      if (myNextRoundBet && nextRoundItem) {
        setMyBet(myNextRoundBet);
        setSelectedItem(nextRoundItem);
        setBetAmount(nextRoundItem.price);
        setMyNextRoundBet(null);
        setNextRoundItem(null);
      }

      animateGraph(roundId, roundCrashPoint);
    } catch (err) {
      console.error('Exception starting round:', err);
    }
  };

  const endRound = async (roundId: string, finalMultiplier: number) => {
    try {
      console.log('Ending round:', roundId, 'at', finalMultiplier);

      setHistory(prev => [finalMultiplier, ...prev].slice(0, 10));

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

      if (myBet && myBet.status === 'pending' && selectedItem) {
        console.log('Player lost - item removed permanently');
        setMyBet({ ...myBet, status: 'lost' });
      }

      await fetchCurrentBets(roundId);
    } catch (err) {
      console.error('Exception ending round:', err);
    }
  };

  const animateGraph = (roundId: string, targetCrashPoint: number) => {
    const startTime = Date.now();
    const duration = 15000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentMultiplier = 1 + Math.pow(progress, 2) * (targetCrashPoint - 1);

      if (currentMultiplier >= targetCrashPoint || progress >= 1) {
        setMultiplier(targetCrashPoint);
        endRound(roundId, targetCrashPoint);
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

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a1b3d');
    gradient.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${star.size / 2})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
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

    const progress = (currentMultiplier - 1) / (crashPoint - 1);
    const pointCount = Math.floor(progress * 150);

    const lineGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, 0);
    if (gameState === 'crashed') {
      lineGradient.addColorStop(0, '#ef4444');
      lineGradient.addColorStop(1, '#dc2626');
    } else {
      lineGradient.addColorStop(0, '#10b981');
      lineGradient.addColorStop(0.5, '#22c55e');
      lineGradient.addColorStop(1, '#84cc16');
    }

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 4;
    ctx.shadowColor = gameState === 'crashed' ? '#ef4444' : '#10b981';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(20, CANVAS_HEIGHT - 50);

    for (let i = 1; i <= pointCount; i++) {
      const p = i / 150;
      const x = 20 + (CANVAS_WIDTH - 40) * p;
      const mult = 1 + Math.pow(p, 2) * (crashPoint - 1);
      let y = CANVAS_HEIGHT - 50 - Math.log(mult) * 80;
      y = Math.max(20, y);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = gameState === 'crashed' ? '#ef4444' : '#ffffff';
    ctx.shadowColor = gameState === 'crashed' ? '#ef4444' : '#10b981';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentMultiplier.toFixed(2)}x`, CANVAS_WIDTH / 2, 100);
    ctx.shadowBlur = 0;
  };

  const handleSelectItem = (item: Item) => {
    if (gameState === 'waiting' && !selectedItem && !nextRoundItem) {
      setSelectedItem(item);
      setBetAmount(item.price);
    } else if (gameState === 'playing' && !nextRoundItem) {
      setNextRoundItem(item);
    }
  };

  const handlePlaceBet = async () => {
    const itemToUse = gameState === 'waiting' ? selectedItem : nextRoundItem;
    const roundIdToUse = gameState === 'waiting' ? currentRoundId : nextRoundId;

    if (!itemToUse || !roundIdToUse) {
      console.log('Cannot place bet:', { itemToUse, roundIdToUse });
      return;
    }

    console.log('Placing bet with item:', itemToUse.name, 'for round:', roundIdToUse);

    removeItemFromInventory(itemToUse.id);

    try {
      const { data: profile } = await supabase
        .from('crash_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        console.log('Creating user profile');
        await supabase.from('crash_user_profiles').insert({
          user_id: userId,
          username: username,
        });
      }

      console.log('Inserting bet into database');
      const { data: betData, error } = await supabase
        .from('crash_bets')
        .insert({
          round_id: roundIdToUse,
          user_id: userId,
          item_id: itemToUse.id,
          item_name: itemToUse.name,
          item_image: itemToUse.image_url,
          item_rarity: itemToUse.rarity,
          bet_amount: itemToUse.price,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bet:', error);
        addItemToInventory(itemToUse);
        return;
      }

      if (betData) {
        console.log('Bet created successfully:', betData.id);
        const newBet: CrashBet = {
          ...betData,
          username: username,
        };

        if (gameState === 'waiting') {
          setMyBet(newBet);
          await fetchCurrentBets(roundIdToUse);
        } else {
          setMyNextRoundBet(newBet);
        }
      }
    } catch (err) {
      console.error('Exception placing bet:', err);
      addItemToInventory(itemToUse);
    }
  };

  const handleCancelBet = () => {
    if (gameState === 'waiting' && selectedItem && !myBet) {
      setSelectedItem(null);
      setBetAmount(null);
    } else if (gameState === 'playing' && nextRoundItem && !myNextRoundBet) {
      setNextRoundItem(null);
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'playing' || !myBet || !selectedItem || !currentRoundId) {
      console.log('Cannot cashout:', { gameState, myBet, selectedItem, currentRoundId });
      return;
    }

    console.log('Cashing out at', multiplier);
    const winnings = Number((selectedItem.price * multiplier).toFixed(2));

    try {
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

      const wonItem: Item = {
        id: `won-${Date.now()}`,
        name: selectedItem.name,
        image_url: selectedItem.image_url,
        rarity: selectedItem.rarity,
        price: winnings,
      };
      addItemToInventory(wonItem);

      setMyBet({ ...myBet, status: 'cashed_out', cashout_multiplier: multiplier, winnings });
      await fetchCurrentBets(currentRoundId);
    } catch (err) {
      console.error('Exception cashing out:', err);
    }
  };

  useEffect(() => {
    console.log('Initializing crash game');
    initializeStars();

    const initGame = async () => {
      const roundData = await createNewRound();
      if (roundData) {
        setCurrentRoundId(roundData.id);
        setCountdown(10);
        await fetchCurrentBets(roundData.id);
      }

      const nextRoundData = await createNewRound();
      if (nextRoundData) {
        setNextRoundId(nextRoundData.id);
      }
    };

    initGame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'waiting' && currentRoundId) {
      console.log('Starting countdown from', countdown);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);

            supabase
              .from('crash_rounds')
              .select('crash_multiplier')
              .eq('id', currentRoundId)
              .single()
              .then(({ data }) => {
                if (data) {
                  startRound(currentRoundId, data.crash_multiplier);
                }
              });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else if (gameState === 'crashed') {
      console.log('Round crashed, resetting in 3 seconds');
      const resetTimeout = setTimeout(async () => {
        setMyBet(null);
        setSelectedItem(null);
        setBetAmount(null);
        setWonAmount(null);
        setCashoutMultiplier(null);
        setCurrentBets([]);
        setMultiplier(1.0);

        setCurrentRoundId(nextRoundId);
        const newNextRoundData = await createNewRound();
        if (newNextRoundData) {
          setNextRoundId(newNextRoundData.id);
        }

        if (nextRoundId) {
          setGameState('waiting');
          setCountdown(10);
          await fetchCurrentBets(nextRoundId);
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
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, '#0a0e27');
          gradient.addColorStop(0.5, '#1a1b3d');
          gradient.addColorStop(1, '#0f0a1e');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 pt-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Rocket className="text-purple-400" size={28} />
            <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Crash Game
            </h1>
          </div>
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            className="text-gray-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-lg"
          >
            {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        {history.length > 0 && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Star className="text-yellow-400" size={16} />
              <h3 className="text-white font-bold text-sm">История раундов</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {history.map((mult, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    mult >= 2
                      ? 'bg-green-600/20 text-green-400 border border-green-500/50'
                      : 'bg-red-600/20 text-red-400 border border-red-500/50'
                  }`}
                >
                  {mult.toFixed(2)}x
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-2xl mb-8 relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full"
          />

          {gameState === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-50 animate-pulse"></div>
                  <p className="relative text-white text-6xl font-bold">{countdown}</p>
                </div>
                <p className="text-gray-300 text-xl">Раунд начнется через {countdown}с</p>
                <p className="text-purple-400 text-sm mt-2">Сделайте вашу ставку!</p>
              </div>
            </div>
          )}

          {gameState === 'crashed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                {wonAmount ? (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-green-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-green-400 text-5xl font-bold">ВЫИГРЫШ!</p>
                    </div>
                    <p className="text-white text-4xl mb-2 font-bold">+{wonAmount.toFixed(2)} TON</p>
                    <p className="text-gray-300">Коэффициент: {cashoutMultiplier?.toFixed(2)}x</p>
                  </>
                ) : myBet ? (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-red-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-red-400 text-5xl font-bold">ОБРУШЕНИЕ!</p>
                    </div>
                    <p className="text-white text-xl">Предмет потерян</p>
                    <p className="text-gray-300 text-sm mt-2">На коэффициенте {crashPoint.toFixed(2)}x</p>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-red-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-red-400 text-5xl font-bold">ОБРУШЕНИЕ!</p>
                    </div>
                    <p className="text-gray-300 text-sm mt-2">На коэффициенте {crashPoint.toFixed(2)}x</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-blue-500/30 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-400" />
              Статистика
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-gray-400">Коэффициент:</span>
                <span className="text-blue-400 font-bold text-3xl">{multiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-gray-400">Ставка:</span>
                <span className="text-white font-bold text-lg">{betAmount?.toFixed(2) || '—'} TON</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <span className="text-gray-400">Потенциальный выигрыш:</span>
                <span className="text-green-400 font-bold text-lg">{betAmount ? (betAmount * multiplier).toFixed(2) : '—'} TON</span>
              </div>
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-gray-400">Баланс:</span>
                <span className="text-blue-300 font-bold text-xl">{balance.toFixed(2)} TON</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-purple-500/30 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4">
              {gameState === 'playing' && nextRoundItem ? 'Ставка на следующий раунд' : 'Ваша ставка'}
            </h3>
            {(selectedItem || nextRoundItem) ? (
              <div className={`${getRarityStyle((nextRoundItem || selectedItem)!.rarity).bg} rounded-xl p-4 border-2 ${getRarityStyle((nextRoundItem || selectedItem)!.rarity).border} ${getRarityStyle((nextRoundItem || selectedItem)!.rarity).shadow}`}>
                <div className="mb-3 h-32 flex items-center justify-center bg-slate-950/40 rounded-lg p-2">
                  <img
                    src={(nextRoundItem || selectedItem)!.image_url}
                    alt={(nextRoundItem || selectedItem)!.name}
                    className="max-h-full max-w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <p className="text-white font-bold text-center text-sm mb-2">{(nextRoundItem || selectedItem)!.name}</p>
                <p className={`${getRarityStyle((nextRoundItem || selectedItem)!.rarity).text} text-center text-xs capitalize mb-3`}>
                  {(nextRoundItem || selectedItem)!.rarity}
                </p>
                <div className="flex items-center justify-center gap-2 bg-black/30 rounded-lg py-2 mb-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                  <span className="text-white font-bold text-lg">{(nextRoundItem || selectedItem)!.price.toFixed(2)} TON</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePlaceBet}
                    disabled={!!(gameState === 'waiting' ? myBet : myNextRoundBet)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                  >
                    {(gameState === 'waiting' ? myBet : myNextRoundBet) ? 'Ставка принята' : 'Поставить'}
                  </button>
                  <button
                    onClick={handleCancelBet}
                    disabled={!!(gameState === 'waiting' ? myBet : myNextRoundBet)}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="text-slate-500" size={32} />
                </div>
                <p className="text-gray-400">Выберите предмет из инвентаря</p>
              </div>
            )}
          </div>
        </div>

        {gameState === 'playing' && myBet && myBet.status === 'pending' && (
          <button
            onClick={handleCashout}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-8 rounded-2xl transition-all text-2xl shadow-2xl hover:shadow-green-500/50 hover:scale-105 transform border-2 border-green-400/50 mb-8 animate-pulse"
          >
            Забрать выигрыш ({(betAmount! * multiplier).toFixed(2)} TON)
          </button>
        )}

        {(currentBets.length > 0 || myBet) && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-cyan-500/30 overflow-hidden mb-8 shadow-xl">
            <h3 className="text-white font-bold text-lg px-6 py-4 border-b border-slate-700 bg-slate-800/50">
              Ставки игроков ({currentBets.length + (myBet ? 1 : 0)})
            </h3>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
              {myBet && (
                <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl p-3 border-2 border-cyan-500 shadow-lg shadow-cyan-500/30">
                  <div className="mb-2 h-16 flex items-center justify-center bg-black/20 rounded-lg p-1">
                    <img
                      src={myBet.item_image}
                      alt={myBet.item_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-cyan-300 text-xs font-bold mb-1">{myBet.username}</p>
                  <p className="text-white text-xs font-bold truncate mb-1">{myBet.item_name}</p>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[7px] font-bold">V</span>
                    </div>
                    <span className="text-white text-xs font-bold">{myBet.bet_amount.toFixed(1)}</span>
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded text-center text-xs font-bold ${
                    myBet.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    myBet.status === 'cashed_out' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {myBet.status === 'pending' ? 'Ожидание' : myBet.status === 'cashed_out' ? `${myBet.cashout_multiplier?.toFixed(2)}x` : 'Потеря'}
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
                  <div className="mb-2 h-16 flex items-center justify-center bg-black/20 rounded-lg p-1">
                    <img
                      src={bet.item_image}
                      alt={bet.item_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-gray-300 text-xs font-bold mb-1">{bet.username}</p>
                  <p className="text-white text-xs font-bold truncate mb-1">{bet.item_name}</p>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[7px] font-bold">V</span>
                    </div>
                    <span className="text-white text-xs font-bold">{bet.bet_amount.toFixed(1)}</span>
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded text-center text-xs font-bold ${
                    bet.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    bet.status === 'cashed_out' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {bet.status === 'pending' ? 'Ожидание' : bet.status === 'cashed_out' ? `${bet.cashout_multiplier?.toFixed(2)}x` : 'Потеря'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-xl">
          <h3 className="text-white font-bold text-lg px-6 py-4 border-b border-slate-700 bg-slate-800/50">
            Выберите предмет для ставки
          </h3>
          {inventory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-slate-500" size={40} />
              </div>
              <p className="text-gray-400 text-lg mb-2">В вашем инвентаре нет предметов</p>
              <p className="text-gray-500 text-sm">Откройте кейсы на главной странице</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {inventory.map((item, idx) => {
                const rarityStyle = getRarityStyle(item.rarity);
                const isSelected = selectedItem?.id === item.id || nextRoundItem?.id === item.id;
                const canSelect = (gameState === 'waiting' && !selectedItem) || (gameState === 'playing' && !nextRoundItem);

                return (
                  <div
                    key={`crash-${idx}`}
                    onClick={() => {
                      if (canSelect) {
                        handleSelectItem(item);
                      }
                    }}
                    className={`group ${rarityStyle.bg} rounded-xl p-3 border-2 ${rarityStyle.border} ${rarityStyle.shadow} transition-all ${
                      canSelect
                        ? 'cursor-pointer hover:scale-105 hover:brightness-110 hover:shadow-2xl'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isSelected ? 'ring-4 ring-cyan-500 scale-105' : ''}`}
                  >
                    <div className="mb-2 h-24 flex items-center justify-center bg-slate-950/40 rounded-lg p-2">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform drop-shadow-2xl"
                      />
                    </div>
                    <p className="text-white text-xs font-bold truncate mb-1">{item.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">V</span>
                      </div>
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
  );
}
