import { useState, useEffect } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import CategoryIcons from './components/CategoryIcons';
import PromoSection from './components/PromoSection';
import FilterTabs from './components/FilterTabs';
import CaseCard from './components/CaseCard';
import CaseOpenModal from './components/CaseOpenModal';
import MultiCaseOpenModal from './components/MultiCaseOpenModal';
import MultiCaseResultModal from './components/MultiCaseResultModal';
import DepositModal from './components/DepositModal';
import BottomNav from './components/BottomNav';
import ProfilePage from './pages/ProfilePage';
import UpgradePage from './pages/UpgradePage';
import CrashPage from './pages/CrashPage';
import { mockCases, mockItems } from './data/mockData';
import { Case, Item } from './lib/supabase';
import { supabase } from './lib/supabase';
import { telegramAuth, TelegramUser } from './utils/telegramAuth';

type Page = 'main' | 'profile' | 'upgrade' | 'crash';

const USER_ID = 'demo-user-' + Math.random().toString(36).substring(7);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showMultiOpen, setShowMultiOpen] = useState(false);
  const [multiOpenResults, setMultiOpenResults] = useState<Item[] | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    setIsAuthLoading(true);

    const session = telegramAuth.loadSession();
    if (session) {
      setIsAuthenticated(true);
      setCurrentUser(session.user);
      await loadUserData(session.user.id);
    } else {
      const user = telegramAuth.getCurrentUser();
      if (user) {
        await handleLogin();
      }
    }

    setIsAuthLoading(false);
  };

  const handleLogin = async () => {
    setIsAuthLoading(true);

    const result = await telegramAuth.authenticate();

    if (result.success && result.user) {
      setIsAuthenticated(true);
      setCurrentUser(result.user);
      await loadUserData(result.user.id);
    } else {
      console.error('Login failed:', result.error);
    }

    setIsAuthLoading(false);
  };

  const loadUserData = async (userId: number) => {
    const userIdStr = String(userId);

    const savedInventory = localStorage.getItem(`inventory_${userIdStr}`);
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-balance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: userIdStr }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Failed to load user balance:', error);
      const savedBalance = localStorage.getItem(`balance_${userIdStr}`);
      if (savedBalance) {
        setBalance(parseFloat(savedBalance));
      }
    }
  };

  const saveToLocalStorage = (newInventory: Item[], newBalance: number) => {
    if (currentUser) {
      const userIdStr = String(currentUser.id);
      localStorage.setItem(`inventory_${userIdStr}`, JSON.stringify(newInventory));
      localStorage.setItem(`balance_${userIdStr}`, newBalance.toString());
    }
  };

  const filteredCases = activeFilter === 'all'
    ? mockCases
    : mockCases.filter(c => c.category === activeFilter);

  const handleKeepItem = (item: Item, casePrice: number) => {
    const newInventory = [...inventory, item];
    const newBalance = balance - casePrice;
    setInventory(newInventory);
    setBalance(newBalance);
    saveToLocalStorage(newInventory, newBalance);
  };

  const handleSellItemFromCase = (item: Item, sellPrice: number, casePrice: number) => {
    const newBalance = balance - casePrice + sellPrice;
    setBalance(newBalance);
    saveToLocalStorage(inventory, newBalance);
  };

  const handleMultiOpen = async (selections: { caseData: Case; count: number }[]) => {
    setShowMultiOpen(false);

    const allItems: Item[] = [];
    let totalCost = 0;

    for (const selection of selections) {
      const caseItems = mockItems[selection.caseData.id] || [];

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/case-opener`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ items: caseItems, count: selection.count }),
          }
        );

        const data = await response.json();
        allItems.push(...data.winners);
        totalCost += selection.caseData.price * selection.count;
      } catch (error) {
        console.error('Error opening cases:', error);
      }
    }

    setBalance(balance - totalCost);
    setMultiOpenResults(allItems);
  };

  const handleClaimAll = () => {
    if (multiOpenResults) {
      const newInventory = [...inventory, ...multiOpenResults];
      setInventory(newInventory);
      saveToLocalStorage(newInventory, balance);
      setMultiOpenResults(null);
    }
  };

  const handleDeposit = (newBalance: number) => {
    setBalance(newBalance);
    saveToLocalStorage(inventory, newBalance);
  };

  const handleSellItem = (item: Item, inventoryIndex: number) => {
    const newInventory = [...inventory];
    newInventory.splice(inventoryIndex, 1);
    const sellPrice = Number((item.price * 0.94).toFixed(2));
    const newBalance = Number((balance + sellPrice).toFixed(2));

    setInventory(newInventory);
    setBalance(newBalance);
    saveToLocalStorage(newInventory, newBalance);
  };

  const handleWithdrawItem = (item: Item, inventoryIndex: number) => {
    const newInventory = [...inventory];
    newInventory.splice(inventoryIndex, 1);
    setInventory(newInventory);
    saveToLocalStorage(newInventory, balance);
  };

  const handleUpgradeItem = (fromIndex: number, toItem: Item, success: boolean) => {
    const newInventory = [...inventory];
    if (success) {
      newInventory[fromIndex] = toItem;
    } else {
      newInventory.splice(fromIndex, 1);
    }
    setInventory(newInventory);
    saveToLocalStorage(newInventory, balance);
  };

  const addItemToInventory = (item: Item) => {
    const newInventory = [...inventory, item];
    setInventory(newInventory);
    saveToLocalStorage(newInventory, balance);
  };

  const removeItemFromInventory = (itemId: string) => {
    const newInventory = inventory.filter(item => item.id !== itemId);
    setInventory(newInventory);
    saveToLocalStorage(newInventory, balance);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <WelcomeScreen onLogin={handleLogin} isLoading={isAuthLoading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black pt-16">
      <Header balance={balance} onDepositClick={() => setShowDeposit(true)} />

      {currentPage === 'main' && (
        <>
          <CategoryIcons />
          <PromoSection />

          <div className="max-w-7xl mx-auto px-4 pb-24">
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowMultiOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-purple-500/50"
              >
                🎁 Multi-Open (Up to 5)
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCases.map((caseData) => (
                <CaseCard
                  key={caseData.id}
                  caseData={caseData}
                  onClick={() => setSelectedCase(caseData)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {currentPage === 'profile' && (
        <ProfilePage
          inventory={inventory}
          balance={balance}
          onSellItem={handleSellItem}
          onWithdrawItem={handleWithdrawItem}
        />
      )}

      {currentPage === 'upgrade' && (
        <UpgradePage
          inventory={inventory}
          onUpgrade={handleUpgradeItem}
        />
      )}

      {currentPage === 'crash' && (
        <CrashPage
          inventory={inventory}
          balance={balance}
          setBalance={setBalance}
          addItemToInventory={addItemToInventory}
          removeItemFromInventory={removeItemFromInventory}
        />
      )}

      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />

      {selectedCase && (
        <CaseOpenModal
          caseData={selectedCase}
          items={mockItems[selectedCase.id] || []}
          onClose={() => setSelectedCase(null)}
          onKeepItem={handleKeepItem}
          onSellItem={handleSellItemFromCase}
          balance={balance}
          onNavigateToCharge={() => {
            setSelectedCase(null);
          }}
        />
      )}

      {showMultiOpen && (
        <MultiCaseOpenModal
          cases={mockCases}
          onClose={() => setShowMultiOpen(false)}
          onOpenCases={handleMultiOpen}
          balance={balance}
        />
      )}

      {multiOpenResults && (
        <MultiCaseResultModal
          winners={multiOpenResults}
          onClaimAll={handleClaimAll}
        />
      )}

      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onDeposit={handleDeposit}
          currentBalance={balance}
        />
      )}
    </div>
  );
}

export default App;
