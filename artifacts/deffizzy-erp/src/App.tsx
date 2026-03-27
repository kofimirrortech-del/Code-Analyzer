import * as React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuth } from "@/hooks/use-auth";
import { Layout, NAV_ITEMS } from "@/components/Layout";
import { AuthUserRole } from "@workspace/api-client-react";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Store from "@/pages/Store";
import Ingredients from "@/pages/Ingredients";
import Production from "@/pages/Production";
import Packaging from "@/pages/Packaging";
import Dispatch from "@/pages/Dispatch";
import History from "@/pages/History";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

function ProtectedRoute({ component: Component, requiredRoles }: { component: React.ComponentType<any>, requiredRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    const firstAllowed = NAV_ITEMS.find(item => item.roles.includes(user.role));
    return <Redirect to={firstAllowed?.path ?? "/history"} />;
  }

  return <Layout><Component /></Layout>;
}

function Router() {
  const allRoles = Object.values(AuthUserRole) as string[];
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} requiredRoles={allRoles} />} />
      <Route path="/store" component={() => <ProtectedRoute component={Store} requiredRoles={[AuthUserRole.ADMIN, AuthUserRole.STORE]} />} />
      <Route path="/ingredients" component={() => <ProtectedRoute component={Ingredients} requiredRoles={[AuthUserRole.ADMIN, AuthUserRole.INGREDIENT]} />} />
      <Route path="/production" component={() => <ProtectedRoute component={Production} requiredRoles={[AuthUserRole.ADMIN, AuthUserRole.PRODUCTION]} />} />
      <Route path="/packaging" component={() => <ProtectedRoute component={Packaging} requiredRoles={[AuthUserRole.ADMIN, AuthUserRole.PACKAGE]} />} />
      <Route path="/dispatch" component={() => <ProtectedRoute component={Dispatch} requiredRoles={[AuthUserRole.ADMIN, AuthUserRole.DISPATCH]} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} requiredRoles={allRoles} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
