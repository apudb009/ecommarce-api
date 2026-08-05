export const MODULES = [
  'dashboard',
  'users',
  'products',
  'categories',
  'orders',
  'invoices',
  'coupons',
  'banners',
  'reviews',
  'returns',
  'flash-sales',
  'analytics',
  'notifications',
  'settings',
  'taxes',
  'shipping',
  'wishlists',
  'scheduler',
  'roles',
] as const;

export const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionKey = `${Module}:${Action}`;

// ── DEFAULT ADMIN PERMISSIONS (all) ───────────────
export const ADMIN_PERMISSIONS: PermissionKey[] = MODULES.flatMap((module) =>
  ACTIONS.map<PermissionKey>((action) => `${module}:${action}`),
);

// ── MODULE DISPLAY NAMES ───────────────────────────
export const MODULE_LABELS: Record<Module, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  products: 'Products',
  categories: 'Categories',
  orders: 'Orders',
  invoices: 'Invoices',
  coupons: 'Coupons',
  banners: 'Banners',
  reviews: 'Reviews',
  returns: 'Returns',
  'flash-sales': 'Flash Sales',
  analytics: 'Analytics',
  notifications: 'Notifications',
  settings: 'Settings',
  taxes: 'Taxes',
  shipping: 'Shipping',
  wishlists: 'Wishlists',
  scheduler: 'Scheduler',
  roles: 'Roles & Permissions',
};
