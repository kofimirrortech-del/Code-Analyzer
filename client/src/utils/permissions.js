const ROLE_DEFAULTS = {
  STORE:       { store: { view: true, edit: true }, 'todays-production': { view: true, edit: false } },
  INGREDIENT:  { ingredients: { view: true, edit: true }, 'todays-production': { view: true, edit: false } },
  PRODUCTION:  { production: { view: true, edit: true }, 'todays-production': { view: true, edit: false } },
  BAKERY:      { bakery: { view: true, edit: true }, 'todays-production': { view: true, edit: false } },
  PACKAGE:     { packaging: { view: true, edit: true }, 'todays-order': { view: true, edit: false } },
  DISPATCH:    { dispatch: { view: true, edit: true }, 'todays-order': { view: true, edit: false } },
};

function getEffectivePermissions(user) {
  if (!user) return {};
  if (user.permissions) return user.permissions;
  return ROLE_DEFAULTS[user.role] || {};
}

export function canView(user, section) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const perms = getEffectivePermissions(user);
  return perms[section]?.view === true;
}

export function canEdit(user, section) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const perms = getEffectivePermissions(user);
  return perms[section]?.edit === true;
}

export function getHomeRoute(user) {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/';
  const perms = getEffectivePermissions(user);
  const order = ['todays-production', 'todays-order', 'store', 'ingredients', 'production', 'bakery', 'packaging', 'dispatch'];
  for (const s of order) {
    if (perms[s]?.view) return `/${s}`;
  }
  return '/';
}
