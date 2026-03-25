import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, History as HistoryIcon, Package, Wheat, Factory, Archive, Truck, DollarSign, ChevronDown } from "lucide-react";
import { formatCedi, formatDate, formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/shared-ui";

interface DaySummary {
  date: string;
  store: any[];
  ingredients: any[];
  production: any[];
  packages: any[];
  orders: any[];
  stats: {
    totalInventory: number;
    totalProduced: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

export default function History() {
  const [dates, setDates] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [summaryData, setSummaryData] = React.useState<DaySummary | null>(null);
  const [isLoadingDates, setIsLoadingDates] = React.useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'store' | 'ingredients' | 'production' | 'packages' | 'orders'>('store');

  React.useEffect(() => {
    fetch('/api/history/dates')
      .then(res => res.json())
      .then((data: string[]) => {
        setDates(data);
        if (data.length > 0) {
          setSelectedDate(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingDates(false));
  }, []);

  React.useEffect(() => {
    if (!selectedDate) return;
    
    setIsLoadingSummary(true);
    fetch(`/api/history/summary?date=${selectedDate}`)
      .then(res => res.json())
      .then((data: DaySummary) => {
        setSummaryData(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingSummary(false));
  }, [selectedDate]);

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      // Adjusting for timezone to not shift date
      const d2 = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d2);
    } catch {
      return dateStr;
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'Delivered': return 'success';
      case 'Cancelled': return 'danger';
      case 'Processing': return 'info';
      case 'Dispatched': return 'primary';
      default: return 'warning';
    }
  };

  if (isLoadingDates) {
    return <div className="animate-pulse space-y-6"><div className="h-10 w-48 bg-white/5 rounded-lg" /><div className="flex gap-6"><div className="w-64 h-96 bg-white/5 rounded-2xl" /><div className="flex-1 h-96 bg-white/5 rounded-2xl" /></div></div>;
  }

  return (
    <div className="space-y-6 pb-10 flex flex-col h-full">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Daily History Backup</h1>
        <p className="text-muted-foreground mt-1">View read-only snapshots of previous days.</p>
      </div>

      {dates.length === 0 ? (
        <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <HistoryIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No history data yet</h2>
          <p className="text-muted-foreground max-w-md">Once days end, their data will be securely backed up and available here for review.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar for Dates */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-white/5 bg-black/20 flex items-center gap-2 text-white font-medium">
                <Calendar className="w-4 h-4 text-primary" />
                Available Backups
              </div>
              <div className="overflow-y-auto p-2 space-y-1 flex-1">
                {dates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedDate === date 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {isLoadingSummary ? (
              <div className="glass-card rounded-2xl p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : summaryData ? (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                  <h2 className="text-2xl font-bold text-white mb-6 relative z-10">{formatDisplayDate(summaryData.date)}</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Total Inventory</p>
                      <p className="text-xl font-bold text-white">{summaryData.stats.totalInventory}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Total Produced</p>
                      <p className="text-xl font-bold text-white">{summaryData.stats.totalProduced}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Total Orders</p>
                      <p className="text-xl font-bold text-white">{summaryData.stats.totalOrders}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <p className="text-xs text-emerald-400 font-medium mb-1">Total Revenue</p>
                      <p className="text-xl font-bold text-emerald-300">{formatCedi(summaryData.stats.totalRevenue)}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                  {[
                    { id: 'store', label: 'Store', icon: Package, count: summaryData.store.length },
                    { id: 'ingredients', label: 'Ingredients', icon: Wheat, count: summaryData.ingredients.length },
                    { id: 'production', label: 'Production', icon: Factory, count: summaryData.production.length },
                    { id: 'packages', label: 'Packages', icon: Archive, count: summaryData.packages.length },
                    { id: 'orders', label: 'Orders', icon: Truck, count: summaryData.orders.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                        activeTab === tab.id
                          ? 'bg-white text-black shadow-md'
                          : 'glass-card text-muted-foreground hover:text-white'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-black/10' : 'bg-white/10'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    {activeTab === 'store' && (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                            <th className="p-4 font-semibold">Item Name</th>
                            <th className="p-4 font-semibold">Quantity</th>
                            <th className="p-4 font-semibold">Supplier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryData.store.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No store records</td></tr>
                          ) : summaryData.store.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-medium text-white">{item.itemName}</td>
                              <td className="p-4 text-white">{item.quantity} units</td>
                              <td className="p-4 text-muted-foreground">{item.supplier}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'ingredients' && (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                            <th className="p-4 font-semibold">Ingredient</th>
                            <th className="p-4 font-semibold">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryData.ingredients.length === 0 ? (
                            <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No ingredients</td></tr>
                          ) : summaryData.ingredients.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-medium text-white">{item.name}</td>
                              <td className="p-4 text-white">{item.stock} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'production' && (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                            <th className="p-4 font-semibold">Product</th>
                            <th className="p-4 font-semibold">Qty Produced</th>
                            <th className="p-4 font-semibold">Baker</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryData.production.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No production</td></tr>
                          ) : summaryData.production.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-medium text-white">{item.product}</td>
                              <td className="p-4 text-white">{item.quantityProduced}</td>
                              <td className="p-4 text-muted-foreground">{item.baker}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'packages' && (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                            <th className="p-4 font-semibold">Package Type</th>
                            <th className="p-4 font-semibold">Stock</th>
                            <th className="p-4 font-semibold">Expiry Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryData.packages.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No packages</td></tr>
                          ) : summaryData.packages.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-medium text-white">{item.packageType}</td>
                              <td className="p-4 text-white">{item.stock}</td>
                              <td className="p-4 text-muted-foreground">{formatShortDate(item.expiryDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'orders' && (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                            <th className="p-4 font-semibold">Client</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Delivery Date</th>
                            <th className="p-4 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryData.orders.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No orders</td></tr>
                          ) : summaryData.orders.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-medium text-white">{item.client}</td>
                              <td className="p-4"><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></td>
                              <td className="p-4 text-muted-foreground">{formatShortDate(item.deliveryDate)}</td>
                              <td className="p-4 font-medium text-white">{formatCedi(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}