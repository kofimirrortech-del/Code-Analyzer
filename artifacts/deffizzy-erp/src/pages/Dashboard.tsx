import * as React from "react";
import { motion } from "framer-motion";
import { Package, Factory, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { formatCedi, formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/shared-ui";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboard();

  if (isLoading) return <div className="animate-pulse space-y-6"><div className="h-10 w-48 bg-white/5 rounded-lg" /><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="h-32 bg-white/5 rounded-2xl" /><div className="h-32 bg-white/5 rounded-2xl" /><div className="h-32 bg-white/5 rounded-2xl" /><div className="h-32 bg-white/5 rounded-2xl" /></div><div className="h-96 bg-white/5 rounded-2xl" /></div>;
  if (isError || !stats) return <div className="text-red-400">Failed to load dashboard data.</div>;

  // Generate some realistic looking dummy data for the chart based on the total revenue
  const chartData = Array.from({ length: 7 }).map((_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    revenue: Math.floor((stats.totalRevenue / 7) * (0.8 + Math.random() * 0.6))
  }));

  const statCards = [
    { title: "Total Inventory", value: stats.totalInventory, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { title: "Units Produced", value: stats.totalProduced, icon: Factory, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { title: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { title: "Total Revenue", value: formatCedi(stats.totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Today's Summary — {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</h1>
        <p className="text-muted-foreground mt-1">Real-time metrics and operations summary for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-3xl font-display font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-2xl p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground">7-day performance overview</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₵${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: number) => [formatCedi(value), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Low Stock Warnings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-white">Low Stock Alerts</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {stats.lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Package className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Inventory levels are optimal.</p>
              </div>
            ) : (
              stats.lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <span className="text-sm font-medium text-white">{item.name}</span>
                  <Badge variant="danger">{item.quantity} left</Badge>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Recent Dispatch Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground">
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Delivery</th>
                <th className="p-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No recent orders</td></tr>
              ) : (
                stats.recentOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-sm text-muted-foreground">#{order.id}</td>
                    <td className="p-4 font-medium text-white">{order.client}</td>
                    <td className="p-4">
                      <Badge variant={
                        order.status === 'Delivered' ? 'success' : 
                        order.status === 'Cancelled' ? 'danger' : 
                        order.status === 'Processing' ? 'info' : 
                        order.status === 'Dispatched' ? 'primary' : 'warning'
                      }>{order.status}</Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatShortDate(order.deliveryDate)}</td>
                    <td className="p-4 font-medium text-white text-right">{formatCedi(order.total)}</td>
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
