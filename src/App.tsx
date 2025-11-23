import { useState, useEffect } from 'react';
import Header from './components/Header';
import CategoryIcons from './components/CategoryIcons';
import PromoSection from './components/PromoSection';
import FilterTabs from './components/FilterTabs';
import CaseCard from './components/CaseCard';
import CaseOpenModal from './components/CaseOpenModal';
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
        />
      )}

      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />

      {selectedCase && (
        <CaseOpenModal
          caseData={selectedCase}
          items={mockItems[selectedCase.id] || []}
          onClose={() => setSelectedCase(null)}
          onKeepItem={handleKeepItem}
          balance={balance}
          onNavigateToCharge={() => {
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
