import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Search, Filter, Loader2, Package, Star, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getProducts, type Product } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function StoreView({ onAddToCart }: { onAddToCart?: (product: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [gridDensity, setGridDensity] = useState(3); // 1: List, 2: Compact Grid, 3: Dense Grid

  const categories = ['All', 'Units', 'Accessories', 'Filters', 'Spare Parts'];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error('Fetch Store Error:', error);
      toast.error('Failed to load store items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Opening Matrix Store...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Search & Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative group flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-600 shadow-sm text-xs"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 shrink-0">
             <span className="text-[10px] font-black text-slate-400 uppercase">Size</span>
             <input 
               type="range" 
               min="1" 
               max="3" 
               step="1"
               value={gridDensity}
               onChange={(e) => setGridDensity(parseInt(e.target.value))}
               className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-100" 
                  : "bg-white text-slate-400 border border-slate-100 hover:border-blue-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 border border-slate-200 border-dashed text-center">
          <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2 text-center">Item Not Found</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto text-center font-medium">Try searching for something else or browse different categories.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3 transition-all duration-300",
          gridDensity === 1 ? "grid-cols-1" : 
          gridDensity === 2 ? "grid-cols-2" : 
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        )}>
          {filteredProducts.map((product, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              key={product.id}
              className={cn(
                "bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all group flex flex-col",
                gridDensity === 1 ? "flex-row h-28" : "flex-col"
              )}
            >
              <div className={cn(
                "bg-slate-50 relative overflow-hidden shrink-0",
                gridDensity === 1 ? "w-28 h-full" : "aspect-square w-full"
              )}>
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Package size={gridDensity === 3 ? 20 : 32} />
                  </div>
                )}
                
                {gridDensity < 3 && (
                  <div className="absolute top-2 left-2">
                    <div className="px-2 py-0.5 bg-white/80 backdrop-blur-md rounded text-[7px] font-black uppercase tracking-tighter text-slate-900 border border-white">
                      {product.category}
                    </div>
                  </div>
                )}
              </div>

              <div className={cn(
                "p-3 flex-1 flex flex-col justify-between",
                gridDensity === 3 ? "p-2" : "p-3"
              )}>
                <div className="space-y-0.5">
                  <h4 className={cn(
                    "font-bold text-slate-900 leading-tight truncate",
                    gridDensity === 3 ? "text-[10px]" : "text-xs"
                  )}>
                    {product.name}
                  </h4>
                  {gridDensity === 1 && (
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-tight pr-8">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                   <p className={cn(
                     "font-black text-slate-900",
                     gridDensity === 3 ? "text-xs" : "text-sm"
                   )}>₹{product.price.toLocaleString()}</p>
                   
                   <button 
                     onClick={() => onAddToCart?.(product)}
                     className={cn(
                     "flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all",
                     gridDensity === 3 ? "w-6 h-6" : "w-8 h-8"
                   )}>
                      <ShoppingCart size={gridDensity === 3 ? 12 : 16} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
