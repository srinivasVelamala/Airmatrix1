import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Calendar, CreditCard, ChevronRight, Loader2, Package, Search } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { getPurchaseHistory, type Purchase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PurchaseHistoryProps {
  customerId: string;
}

export default function PurchaseHistory({ customerId }: PurchaseHistoryProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseHistory(customerId);
      setPurchases(data);
    } catch (error: any) {
      console.error('Fetch Purchases Error:', error);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [customerId]);

  const filteredPurchases = purchases.filter(p => 
    (p.item_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.item_category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-sm font-black uppercase tracking-widest">Loading Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search purchases or services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-600"
        />
      </div>

      {filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 border-dashed text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-black text-slate-900 mb-1">No Transactions Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">Your history will appear here once you complete a service or make a purchase.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              key={purchase.id}
              className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  purchase.item_category === 'Service' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {purchase.item_category === 'Service' ? <Package size={18} /> : <ShoppingBag size={18} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-slate-900 text-xs truncate pr-2">
                      {purchase.item_name}
                    </h4>
                    <p className="text-[10px] font-black text-slate-900">
                      ₹{purchase.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {purchase.item_category || 'Misc'}
                      </p>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <p className="text-[9px] font-medium text-slate-400">
                        {formatDate(purchase.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-slate-400">
                        <CreditCard size={10} />
                        {purchase.payment_method}
                      </div>
                      <div className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-tighter">
                        {purchase.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {filteredPurchases.length > 0 && (
        <div className="bg-slate-900 px-5 py-4 rounded-3xl text-white overflow-hidden relative shadow-lg shadow-slate-200">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total Expenses</p>
              <h3 className="text-xl font-black">
                ₹{filteredPurchases.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-black">
              {filteredPurchases.length} TX
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
