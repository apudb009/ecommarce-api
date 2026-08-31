export const CacheKeys = {
  // categories
  CATEGORIES_ALL: 'categories:all',
  CATEGORY_BY_SLUG: (slug: string) => `category:slug:${slug}`,

  // products
  PRODUCTS_LISTING: (params: object) =>
    `products:list:${JSON.stringify(params)}`,
  PRODUCT_BY_SLUG: (slug: string) => `product:slug:${slug}`,
  PRODUCT_BY_ID: (id: number) => `product:id:${id}`,
  PRODUCTS_FILTERS: (catId?: number) => `products:filters:${catId ?? 'all'}`,
  PRODUCTS_BEST_SELLERS: (limit: number) => `products:best-sellers:${limit}`,
  PRODUCTS_HOT: (limit: number) => `products:hots:${limit}`,

  // banners
  BANNERS_ACTIVE: 'banners:active',

  // flash sales
  FLASH_SALES_ACTIVE: 'flash-sales:active',
  FLASH_SALE_BY_ID: (id: number) => `flash-sale:id:${id}`,

  // settings
  SETTINGS_ALL: 'settings:all',
  SETTING_BY_KEY: (key: string) => `setting:${key}`,

  // analytics (heavy queries)
  ANALYTICS_OVERVIEW: 'analytics:overview',
  ANALYTICS_REVENUE: 'analytics:revenue',
  ANALYTICS_TOP_PRODUCTS: (limit: number) => `analytics:top-products:${limit}`,

  // homepage
  HOMEPAGE_DATA: 'homepage:data',
} as const;

// cache TTLs in seconds
export const CacheTTL = {
  VERY_SHORT: 15, // flash sales countdown
  SHORT: 30, // product listing
  MEDIUM: 60 * 5, // product detail (5 min)
  LONG: 60 * 10, // settings, banners (10 min)
  VERY_LONG: 60 * 60, // categories (1 hour)
  ANALYTICS: 60 * 10, // analytics (10 min)
} as const;

// cache tags for grouped invalidation
export const CacheTags = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  FLASH_SALES: 'flash-sales',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics',
} as const;
