import * as React from "react";
import { motion } from "framer-motion";
import { Package, Factory, ShoppingCart, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { formatCedi } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AuthUserRole } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboard();
  const { user } = useAuth();
  const isAdmin = user?.role === AuthUserRole.ADMIN;

  if (isLoading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded-lg" />
      {isAdmin && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}</div>}
      <div className="h-64 bg-white/5 rounded-2xl" />
    </div>
  );
  if (isError || !stats) return <div className="text-red-400 glass-card rounded-2xl p-6">Failed to load dashboard. Please refresh.</div>;

  const todayProduction = (stats as any).todayProduction ?? [];
  const lowStockItems = (stats as any).lowStockItems ?? [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">
          {isAdmin ? "Admin Dashboard" : "Today's Overview"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Inventory", value: String(stats.totalInventory ?? 0), icon: Package, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { title: "Units Produced Today", value: String(stats.totalProduced ?? 0), icon: Factory, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
              { title: "Dispatch Orders Today", value: String(stats.totalOrders ?? 0), icon: ShoppingCart, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              { title: "Revenue Today", value: formatCedi(stats.totalRevenue ?? 0), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            ].map((stat, idx) => (
              <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{stat.title}</p>
                    <h3 className="text-2xl font-display font-bold text-white">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {lowStockItems.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="glass-card rounded-2xl p-5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-red-400">Low Stock Alerts ({lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''})</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {lowStockItems.map((item: any) => (
                  <div key={item.name} className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                    <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                    <p className="text-xs text-red-400 mt-0.5">Stock: {item.quantity} / Min: {item.threshold}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isAdmin ? 0.4 : 0.1 }}
        className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Factory className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Today's Production</h3>
            <p className="text-xs text-muted-foreground">{todayProduction.length} batch{todayProduction.length !== 1 ? 'es' : ''} recorded today</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Quantity</th>
                <th className="p-4 font-semibold">Unit</th>
                <th className="p-4 font-semibold">Baker</th>
                <th className="p-4 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {todayProduction.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <CheckCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No batches recorded today yet.</p>
                  </td>
                </tr>
              ) : (
                todayProduction.map((b: any) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{b.product}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">{b.quantityProduced}</span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{b.unit}</td>
                    <td className="p-4 text-muted-foreground">{b.baker}</td>
                    <td className="p-4 text-muted-foreground text-sm italic">{b.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
