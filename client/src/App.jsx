import React from 'react';
import { useHashLocation } from 'wouter/use-hash-location';
import { Router, Route, Switch, Redirect } from 'wouter';
import { useAuth } from './hooks/useAuth.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Store from './pages/Store.jsx';
import Ingredients from './pages/Ingredients.jsx';
import Production from './pages/Production.jsx';
import Packaging from './pages/Packaging.jsx';
import Dispatch from './pages/Dispatch.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import TodaysOrder from './pages/TodaysOrder.jsx';
import TodaysProduction from './pages/TodaysProduction.jsx';

const ROLE_HOME = {
  ADMIN: '/',
  STORE: '/todays-production',
  INGREDIENT: '/todays-production',
  PRODUCTION: '/todays-production',
  PACKAGE: '/todays-order',
  DISPATCH: '/todays-order',
};

function Protected({ component: Component, roles }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a18' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) {
    return <Redirect to={ROLE_HOME[user.role] || '/'} />;
  }
  return <Layout><Component /></Layout>;
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/"                  component={() => <Protected component={Dashboard}        roles={['ADMIN']} />} />
        <Route path="/store"             component={() => <Protected component={Store}            roles={['ADMIN','STORE']} />} />
        <Route path="/ingredients"       component={() => <Protected component={Ingredients}      roles={['ADMIN','INGREDIENT']} />} />
        <Route path="/production"        component={() => <Protected component={Production}       roles={['ADMIN','PRODUCTION']} />} />
        <Route path="/packaging"         component={() => <Protected component={Packaging}        roles={['ADMIN','PACKAGE']} />} />
        <Route path="/dispatch"          component={() => <Protected component={Dispatch}         roles={['ADMIN','DISPATCH']} />} />
        <Route path="/todays-order"      component={() => <Protected component={TodaysOrder}      roles={['ADMIN','PACKAGE','DISPATCH']} />} />
        <Route path="/todays-production" component={() => <Protected component={TodaysProduction} roles={['ADMIN','STORE','INGREDIENT','PRODUCTION']} />} />
        <Route path="/history"           component={() => <Protected component={History}          roles={['ADMIN']} />} />
        <Route path="/settings"          component={() => <Protected component={Settings}         roles={['ADMIN']} />} />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
    </Router>
  );
}
