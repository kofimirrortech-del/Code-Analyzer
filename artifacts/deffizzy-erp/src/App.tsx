import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Store from "@/pages/Store";
import Ingredients from "@/pages/Ingredients";
import Production from "@/pages/Production";
import Packaging from "@/pages/Packaging";
import Dispatch from "@/pages/Dispatch";
import History from "@/pages/History";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// A simple protected route wrapper
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Redirect to="/login" />;

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/store" component={() => <ProtectedRoute component={Store} />} />
      <Route path="/ingredients" component={() => <ProtectedRoute component={Ingredients} />} />
      <Route path="/production" component={() => <ProtectedRoute component={Production} />} />
      <Route path="/packaging" component={() => <ProtectedRoute component={Packaging} />} />
      <Route path="/dispatch" component={() => <ProtectedRoute component={Dispatch} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />

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
