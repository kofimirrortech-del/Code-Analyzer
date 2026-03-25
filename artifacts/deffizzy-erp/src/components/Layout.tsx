import * as React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  LayoutGrid, Package, Wheat, Factory, 
  Archive, Truck, LogOut, Menu, X, ChefHat, History as HistoryIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AuthUserRole } from "@workspace/api-client-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutGrid, roles: [AuthUserRole.ADMIN] },
  { path: "/store", label: "Store", icon: Package, roles: [AuthUserRole.ADMIN, AuthUserRole.STORE] },
  { path: "/ingredients", label: "Ingredients", icon: Wheat, roles: [AuthUserRole.ADMIN, AuthUserRole.INGREDIENT] },
  { path: "/production", label: "Production", icon: Factory, roles: [AuthUserRole.ADMIN, AuthUserRole.PRODUCTION] },
  { path: "/packaging", label: "Packaging", icon: Archive, roles: [AuthUserRole.ADMIN, AuthUserRole.PACKAGE] },
  { path: "/dispatch", label: "Dispatch", icon: Truck, roles: [AuthUserRole.ADMIN, AuthUserRole.DISPATCH] },
  { path: "/history", label: "History", icon: HistoryIcon, roles: Object.values(AuthUserRole) },
];

export { NAV_ITEMS };

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (!user) return null;

  const allowedNavItems = NAV_ITEMS.filter(item => item.roles.includes(user.role as any));

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-8 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-lg shadow-accent/20">
          <ChefHat className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight text-gradient-accent">DEFFIZZY</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Cloud ERP</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="text-primary font-bold text-sm">{user.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className="block">
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}>
                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex w-full overflow-hidden selection:bg-primary/30">
      <aside className="hidden lg:flex w-72 flex-col glass-panel border-y-0 border-l-0 rounded-none z-20">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-x-0 border-t-0 rounded-none z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-accent" />
          <h1 className="font-display font-bold text-lg text-white">DEFFIZZY</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <motion.aside 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 w-72 glass-panel border-y-0 border-l-0 rounded-none flex flex-col"
          >
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <SidebarContent />
          </motion.aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pt-16 lg:pt-0 relative">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 relative z-10">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
