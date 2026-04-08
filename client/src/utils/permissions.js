export function canView(user, section) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions?.[section]?.view === true;
}

export function canEdit(user, section) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions?.[section]?.edit === true;
}

export function getHomeRoute(user) {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/';
  const perms = user.permissions || {};
  const order = ['todays-production', 'todays-order', 'store', 'ingredients', 'production', 'bakery', 'packaging', 'dispatch'];
  for (const s of order) {
    if (perms[s]?.view) return `/${s}`;
  }
  return '/';
}
