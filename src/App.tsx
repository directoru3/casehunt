import { useState, useEffect } from 'react';
import Header from './components/Header';
import CategoryIcons from './components/CategoryIcons';
import PromoSection from './components/PromoSection';
import FilterTabs from './components/FilterTabs';
import CaseCard from './components/CaseCard';
import CaseOpenModal from './components/CaseOpenModal';
import MultiCaseOpenModal from './components/MultiCaseOpenModal';
import MultiCaseResultModal from './components/MultiCaseResultModal';
import BottomNav from './components/BottomNav';
import ProfilePage from './pages/ProfilePage';
import UpgradePage from './pages/UpgradePage';
import CrashPage from './pages/CrashPage';
import { mockCases, mockItems } from './data/mockData';
import { Case, Item } from './lib/supabase';
import { supabase } from './lib/supabase';

type Page = 'main' | 'profile' | 'upgrade' | 'crash';

const USER_ID = 'demo-user-' + Math.random().toString(36).substring(7);

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showMultiOpen, setShowMultiOpen] = useState(false);
  const [multiOpenResults, setMultiOpenResults] = useState<Item[] | null>(null);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const savedInventory = localStorage.getItem('inventory');
    const savedBalance = localStorage.getItem('balance');

    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    }
    if (savedBalance) {
      setBalance(parseFloat(savedBalance));
    }
  };

  const saveToLocalStorage = (newInventory: Item[], newBalance: number) => {
    localStorage.setItem('inventory', JSON.stringify(newInventory));
    localStorage.setItem('balance', newBalance.toString());
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black pt-16">
      <Header balance={balance} />

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
    </div>
  );
}

export default App;
