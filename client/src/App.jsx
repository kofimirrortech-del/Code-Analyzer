import React from 'react';
import { useHashLocation } from 'wouter/use-hash-location';
import { Router, Route, Switch, Redirect } from 'wouter';
import { useAuth } from './hooks/useAuth.jsx';
import { canView, getHomeRoute } from './utils/permissions.js';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Store from './pages/Store.jsx';
import Ingredients from './pages/Ingredients.jsx';
import Production from './pages/Production.jsx';
import Bakery from './pages/Bakery.jsx';
import Packaging from './pages/Packaging.jsx';
import Dispatch from './pages/Dispatch.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import TodaysOrder from './pages/TodaysOrder.jsx';
import TodaysProduction from './pages/TodaysProduction.jsx';
import Users from './pages/Users.jsx';
import Analytics from './pages/Analytics.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';

function Protected({ component: Component, section, adminOnly }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a18' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Redirect to={getHomeRoute(user)} />;
  if (section && !canView(user, section)) return <Redirect to={getHomeRoute(user)} />;
  return <Layout><Component /></Layout>;
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/"                  component={() => <Protected component={Dashboard}        adminOnly />} />
        <Route path="/store"             component={() => <Protected component={Store}            section="store" />} />
        <Route path="/ingredients"       component={() => <Protected component={Ingredients}      section="ingredients" />} />
        <Route path="/production"        component={() => <Protected component={Production}       section="production" />} />
        <Route path="/bakery"            component={() => <Protected component={Bakery}           section="bakery" />} />
        <Route path="/packaging"         component={() => <Protected component={Packaging}        section="packaging" />} />
        <Route path="/dispatch"          component={() => <Protected component={Dispatch}         section="dispatch" />} />
        <Route path="/todays-order"      component={() => <Protected component={TodaysOrder}      section="todays-order" />} />
        <Route path="/todays-production" component={() => <Protected component={TodaysProduction} section="todays-production" />} />
        <Route path="/analytics"         component={() => <Protected component={Analytics}        adminOnly />} />
        <Route path="/purchase-orders"   component={() => <Protected component={PurchaseOrders}   adminOnly />} />
        <Route path="/users"             component={() => <Protected component={Users}            adminOnly />} />
        <Route path="/history"           component={() => <Protected component={History}          adminOnly />} />
        <Route path="/settings"          component={() => <Protected component={Settings}         adminOnly />} />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
    </Router>
  );
}
