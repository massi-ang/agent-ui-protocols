import { CreditCard, TrendingUp, TrendingDown, X } from 'lucide-react';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

interface Account {
  name: string;
  balance: number;
  number: string;
}

interface BankData {
  accounts: Account[];
  recent_transactions: Transaction[];
  monthly_spending: Record<string, number>;
}

export function BankAccountCard({ data, onClose }: { data: BankData; onClose: () => void }) {
  const totalBalance = data.accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg shadow-xl p-6 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">Bank Account</h3>
          <p className="text-emerald-200">Total Balance</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="text-4xl font-bold mb-6">
        ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {data.accounts.map((account) => (
          <div key={account.number} className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-emerald-200">{account.name}</p>
            <p className="font-semibold text-sm">${account.balance.toLocaleString()}</p>
            <p className="text-xs text-emerald-300">{account.number}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-emerald-500/30 pt-4">
        <h4 className="text-sm font-semibold text-emerald-200 mb-2">Recent Transactions</h4>
        <div className="space-y-2">
          {data.recent_transactions.slice(0, 4).map((tx, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                {tx.amount > 0 ? <TrendingUp size={14} className="text-green-300" /> : <TrendingDown size={14} className="text-red-300" />}
                <span className="text-emerald-100">{tx.description}</span>
              </div>
              <span className={tx.amount > 0 ? 'text-green-300 font-medium' : 'text-red-300 font-medium'}>
                {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-emerald-400/30 text-sm text-emerald-100">
        🎯 AG-UI: Pre-built React component with typed data
      </div>
    </div>
  );
}
