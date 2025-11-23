import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, Plane } from 'lucide-react';
import { Item, supabase } from '../lib/supabase';
import { getRarityStyle } from '../utils/rarityStyles';
import TonIcon from '../components/TonIcon';

interface PlayerBet {
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
  avatar_color: string;
}

interface CrashPageProps {
  inventory: Item[];
  balance: number;
  setBalance: (balance: number) => void;
  addItemToInventory: (item: Item) => void;
  removeItemFromInventory: (itemId: string) => void;
}

export default function CrashPage({ inventory, addItemToInventory, removeItemFromInventory }: CrashPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [nextRoundId, setNextRoundId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [myBet, setMyBet] = useState<PlayerBet | null>(null);
  const [allBets, setAllBets] = useState<PlayerBet[]>([]);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [username] = useState(() => `Игрок${Math.floor(Math.random() * 9999)}`);
  const [countdown, setCountdown] = useState(10);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showExplosion, setShowExplosion] = useState(false);
  const animationRef = useRef<number>();
  const cloudsRef = useRef<Array<{ x: number; y: number; size: number; speed: number }>>([]);

  const generateCrashPoint = () => {
    const random = Math.random();
    if (random < 0.03) return 1.0 + Math.random() * 0.5;
    if (random < 0.15) return 1.5 + Math.random() * 0.5;
    if (random < 0.40) return 2.0 + Math.random();
    if (random < 0.70) return 3.0 + Math.random() * 2;
    return 5.0 + Math.random() * 5;
  };

  const initializeClouds = () => {
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * 1000,
        y: Math.random() * 400,
        size: 60 + Math.random() * 40,
        speed: 0.3 + Math.random() * 0.4,
      });
    }
    cloudsRef.current = clouds;
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

      if (error) throw error;

      if (data) {
        return { id: data.id, crashPoint: newCrashPoint };
      }
      return null;
    } catch (err) {
      console.error('Error creating round:', err);
      return null;
    }
  };

  const fetchBets = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('crash_bets')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const betsWithUsernames = await Promise.all(
          data.map(async (bet) => {
            const { data: profile } = await supabase
              .from('crash_user_profiles')
              .select('username')
              .eq('user_id', bet.user_id)
              .maybeSingle();

            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
            return {
              ...bet,
              username: profile?.username || 'Игрок',
              avatar_color: colors[Math.floor(Math.random() * colors.length)],
            } as PlayerBet;
          })
        );
        setAllBets(betsWithUsernames);
      }
    } catch (err) {
      console.error('Error fetching bets:', err);
    }
  };

  const startRound = async (roundId: string, roundCrashPoint: number) => {
    try {
      setCrashPoint(roundCrashPoint);

      await supabase
        .from('crash_rounds')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', roundId);

      setGameState('flying');
      setMultiplier(1.0);
      animateFlight(roundId, roundCrashPoint);
    } catch (err) {
      console.error('Error starting round:', err);
    }
  };

  const endRound = async (roundId: string) => {
    try {
      await supabase
        .from('crash_rounds')
        .update({
          status: 'crashed',
          ended_at: new Date().toISOString(),
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
      setShowExplosion(true);

      if (myBet && myBet.status === 'pending') {
        setMyBet({ ...myBet, status: 'lost' });
      }

      await fetchBets(roundId);

      setTimeout(() => setShowExplosion(false), 1500);
    } catch (err) {
      console.error('Error ending round:', err);
    }
  };

  const animateFlight = (roundId: string, targetCrashPoint: number) => {
    const startTime = Date.now();
    const duration = targetCrashPoint * 3000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentMultiplier = 1 + (targetCrashPoint - 1) * Math.pow(progress, 0.7);

      if (currentMultiplier >= targetCrashPoint || progress >= 1) {
        setMultiplier(targetCrashPoint);
        endRound(roundId);
        return;
      }

      setMultiplier(currentMultiplier);
      drawScene(currentMultiplier, progress);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const drawScene = (currentMultiplier: number, progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0ea5e9');
    gradient.addColorStop(0.5, '#38bdf8');
    gradient.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    cloudsRef.current.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.size < 0) {
        cloud.x = width + cloud.size;
        cloud.y = Math.random() * height;
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.2, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    const planeX = 100 + (width - 200) * progress;
    const planeY = height - 100 - (height - 200) * Math.pow(progress, 0.6);

    ctx.strokeStyle = gameState === 'crashed' ? '#ef4444' : '#10b981';
    ctx.lineWidth = 4;
    ctx.shadowColor = gameState === 'crashed' ? '#ef4444' : '#10b981';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(100, height - 100);

    for (let i = 0; i <= progress * 100; i++) {
      const p = i / 100;
      const x = 100 + (width - 200) * p;
      const y = height - 100 - (height - 200) * Math.pow(p, 0.6);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(-Math.PI / 6);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(25, -5);
    ctx.lineTo(20, -10);
    ctx.lineTo(-20, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-15, -20);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, -5, 8, 3);

    ctx.restore();

    ctx.fillStyle = gameState === 'crashed' ? '#ef4444' : '#ffffff';
    ctx.shadowColor = gameState === 'crashed' ? '#ef4444' : '#10b981';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentMultiplier.toFixed(2)}x`, width / 2, 80);
    ctx.shadowBlur = 0;

    if (showExplosion) {
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const distance = 30 + Math.random() * 30;
        ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.8 - Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(
          planeX + Math.cos(angle) * distance,
          planeY + Math.sin(angle) * distance,
          5 + Math.random() * 5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedItem || !currentRoundId || myBet) return;

    removeItemFromInventory(selectedItem.id);

    try {
      let profile = await supabase
        .from('crash_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile.data) {
        await supabase.from('crash_user_profiles').insert({
          user_id: userId,
          username: username,
        });
      }

      const { data: betData, error } = await supabase
        .from('crash_bets')
        .insert({
          round_id: currentRoundId,
          user_id: userId,
          item_id: selectedItem.id,
          item_name: selectedItem.name,
          item_image: selectedItem.image_url,
          item_rarity: selectedItem.rarity,
          bet_amount: selectedItem.price,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        addItemToInventory(selectedItem);
        return;
      }

      if (betData) {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
        setMyBet({
          ...betData,
          username: username,
          avatar_color: colors[Math.floor(Math.random() * colors.length)],
        });
        await fetchBets(currentRoundId);
      }
    } catch (err) {
      console.error('Error placing bet:', err);
      addItemToInventory(selectedItem);
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'flying' || !myBet || !selectedItem || !currentRoundId) return;

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

      const wonItem: Item = {
        id: `won-${Date.now()}`,
        name: selectedItem.name,
        image_url: selectedItem.image_url,
        rarity: selectedItem.rarity,
        price: winnings,
      };
      addItemToInventory(wonItem);

      setMyBet({ ...myBet, status: 'cashed_out', cashout_multiplier: multiplier, winnings });
      await fetchBets(currentRoundId);
    } catch (err) {
      console.error('Error cashing out:', err);
    }
  };

  useEffect(() => {
    initializeClouds();

    const initGame = async () => {
      const roundData = await createNewRound();
      if (roundData) {
        setCurrentRoundId(roundData.id);
        setCountdown(10);
        await fetchBets(roundData.id);
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
      const resetTimeout = setTimeout(async () => {
        setMyBet(null);
        setSelectedItem(null);
        setAllBets([]);
        setMultiplier(1.0);

        setCurrentRoundId(nextRoundId);
        const newNextRoundData = await createNewRound();
        if (newNextRoundData) {
          setNextRoundId(newNextRoundData.id);
        }

        if (nextRoundId) {
          setGameState('waiting');
          setCountdown(10);
          await fetchBets(nextRoundId);
        }
      }, 3000);

      return () => clearTimeout(resetTimeout);
    }
  }, [gameState, currentRoundId]);

  useEffect(() => {
    if (currentRoundId && gameState === 'waiting') {
      const interval = setInterval(() => {
        fetchBets(currentRoundId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentRoundId, gameState]);

  useEffect(() => {
    if (gameState === 'waiting') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, '#0ea5e9');
          gradient.addColorStop(0.5, '#38bdf8');
          gradient.addColorStop(1, '#7dd3fc');
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
            <Plane className="text-sky-400" size={28} />
            <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              Самолетик
            </h1>
          </div>
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            className="text-gray-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-lg"
          >
            {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-sky-500/30 overflow-hidden shadow-2xl mb-8 relative">
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            className="w-full"
          />

          {gameState === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-50 animate-pulse"></div>
                  <p className="relative text-white text-7xl font-bold">{countdown}</p>
                </div>
                <p className="text-gray-300 text-2xl mb-2">Раунд начнется через {countdown}с</p>
                <p className="text-sky-400 text-lg">Самолетик взлетает!</p>
              </div>
            </div>
          )}

          {gameState === 'crashed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                {myBet?.status === 'cashed_out' ? (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-green-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-green-400 text-6xl font-bold">ВЫИГРЫШ!</p>
                    </div>
                    <p className="text-white text-5xl mb-2 font-bold">+{myBet.winnings?.toFixed(2)} TON</p>
                    <p className="text-gray-300 text-xl">Коэффициент: {myBet.cashout_multiplier?.toFixed(2)}x</p>
                  </>
                ) : myBet ? (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-red-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-red-400 text-6xl font-bold">ВЗРЫВ!</p>
                    </div>
                    <p className="text-white text-2xl">Подарок потерян</p>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-red-500 blur-3xl opacity-50 animate-pulse"></div>
                      <p className="relative text-red-400 text-6xl font-bold">ВЗРЫВ!</p>
                    </div>
                    <p className="text-gray-300 text-xl">На {crashPoint.toFixed(2)}x</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            {selectedItem && !myBet ? (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-sky-500/30 shadow-xl">
                <h3 className="text-white font-bold text-lg mb-4">Ваша ставка</h3>
                <div className="flex items-center gap-4">
                  <div className={`${getRarityStyle(selectedItem.rarity).bg} rounded-xl p-3 border-2 ${getRarityStyle(selectedItem.rarity).border} w-32 h-32 flex items-center justify-center`}>
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="max-h-full max-w-full object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-xl mb-2">{selectedItem.name}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <TonIcon className="w-6 h-6" />
                      <span className="text-white font-bold text-2xl">{selectedItem.price.toFixed(2)} TON</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePlaceBet}
                        disabled={gameState !== 'waiting'}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all text-lg shadow-lg"
                      >
                        {gameState === 'waiting' ? 'Поставить' : 'Раунд идет'}
                      </button>
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : myBet ? (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-sky-500/30 shadow-xl">
                <h3 className="text-white font-bold text-lg mb-4">Ваша ставка в игре</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`${getRarityStyle(selectedItem!.rarity).bg} rounded-xl p-3 border-2 ${getRarityStyle(selectedItem!.rarity).border} w-24 h-24 flex items-center justify-center`}>
                    <img
                      src={selectedItem!.image_url}
                      alt={selectedItem!.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg mb-1">{selectedItem!.name}</p>
                    <div className="flex items-center gap-2">
                      <TonIcon className="w-5 h-5" />
                      <span className="text-gray-300 font-bold">{selectedItem!.price.toFixed(2)} TON</span>
                    </div>
                  </div>
                </div>
                {gameState === 'flying' && myBet.status === 'pending' && (
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Текущий выигрыш:</span>
                      <span className="text-green-400 font-bold text-2xl">
                        {(selectedItem!.price * multiplier).toFixed(2)} TON
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Коэффициент:</span>
                      <span className="text-white font-bold text-xl">{multiplier.toFixed(2)}x</span>
                    </div>
                  </div>
                )}
                {gameState === 'flying' && myBet.status === 'pending' && (
                  <button
                    onClick={handleCashout}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all text-xl shadow-2xl hover:shadow-green-500/50 hover:scale-105 transform animate-pulse"
                  >
                    Забрать {(selectedItem!.price * multiplier).toFixed(2)} TON
                  </button>
                )}
                {myBet.status === 'cashed_out' && (
                  <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-4 text-center">
                    <p className="text-green-400 font-bold text-lg">Выигрыш забран!</p>
                    <p className="text-white text-2xl font-bold">{myBet.winnings?.toFixed(2)} TON</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-12 border-2 border-slate-700 shadow-xl text-center">
                <Plane className="text-slate-600 mx-auto mb-4" size={48} />
                <p className="text-gray-400 text-lg">Выберите подарок для ставки</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-purple-500/30 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              Игроки ({allBets.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allBets.map((bet) => (
                <div
                  key={bet.id}
                  className={`p-3 rounded-xl border-2 ${
                    bet.user_id === userId
                      ? 'bg-sky-600/20 border-sky-500'
                      : bet.status === 'cashed_out'
                      ? 'bg-green-600/20 border-green-500'
                      : bet.status === 'lost'
                      ? 'bg-red-600/20 border-red-500'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: bet.avatar_color }}
                    >
                      {bet.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{bet.username}</p>
                      <div className="flex items-center gap-1">
                        <TonIcon className="w-3 h-3" />
                        <span className="text-gray-300 text-xs">{bet.bet_amount.toFixed(1)}</span>
                      </div>
                    </div>
                    {bet.status === 'cashed_out' && (
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-sm">{bet.cashout_multiplier?.toFixed(2)}x</p>
                        <p className="text-green-300 text-xs">{bet.winnings?.toFixed(1)}</p>
                      </div>
                    )}
                    {bet.status === 'pending' && (
                      <div className="text-yellow-400 text-xs font-bold">Ждет</div>
                    )}
                    {bet.status === 'lost' && (
                      <div className="text-red-400 text-xs font-bold">Потеря</div>
                    )}
                  </div>
                </div>
              ))}
              {allBets.length === 0 && (
                <p className="text-gray-500 text-center py-8">Пока нет ставок</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-xl">
          <h3 className="text-white font-bold text-lg px-6 py-4 border-b border-slate-700 bg-slate-800/50">
            Выберите подарок
          </h3>
          {inventory.length === 0 ? (
            <div className="p-12 text-center">
              <Plane className="text-slate-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400 text-lg mb-2">В вашем инвентаре нет подарков</p>
              <p className="text-gray-500">Откройте кейсы на главной странице</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {inventory.map((item, idx) => {
                const rarityStyle = getRarityStyle(item.rarity);
                const isSelected = selectedItem?.id === item.id;
                const canSelect = !myBet && gameState === 'waiting';

                return (
                  <div
                    key={`item-${idx}`}
                    onClick={() => {
                      if (canSelect) {
                        setSelectedItem(item);
                      }
                    }}
                    className={`group ${rarityStyle.bg} rounded-xl p-3 border-2 ${rarityStyle.border} ${rarityStyle.shadow} transition-all ${
                      canSelect
                        ? 'cursor-pointer hover:scale-105 hover:brightness-110'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isSelected ? 'ring-4 ring-sky-500 scale-105' : ''}`}
                  >
                    <div className="mb-2 h-24 flex items-center justify-center bg-slate-950/40 rounded-lg p-2">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform drop-shadow-2xl"
                      />
                    </div>
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
  );
}
