/** React-query keys of the cabinet. Each starts with the data kind and the user it belongs to. */
export const queryKeys = {
  account: (userId: string | undefined) => ['account', userId] as const,
  home: (userId: string | undefined) => ['home', userId] as const,
  campaigns: (userId: string | undefined) => ['campaigns', userId] as const,
  campaignList: (userId: string | undefined) => ['campaigns', userId, 'list'] as const,
  campaignDetails: (userId: string | undefined, campaignId: string) => ['campaigns', userId, 'details', campaignId] as const,
  campaignPrefill: (userId: string | undefined, campaignId: string | null) => ['campaigns', userId, 'prefill', campaignId] as const,
  campaignInvoices: (userId: string | undefined, campaignId: string) => ['campaigns', userId, 'invoices', campaignId] as const,
  /** Under `campaigns`, so a top-up or an edit refreshes the statistics too. */
  stats: (userId: string | undefined) => ['campaigns', userId, 'stats'] as const,
  storeCatalog: (userId: string | undefined) => ['catalog', userId] as const,
  /** `storeIds` sorted, so the same choice in another order reads the cache. */
  storePlans: (userId: string | undefined, storeIds: string[]) => ['catalog', userId, 'plans', storeIds] as const,
  notifications: (userId: string | undefined) => ['notifications', userId] as const,
  notificationFeed: (userId: string | undefined) => ['notifications', userId, 'feed'] as const,
  unreadNotifications: (userId: string | undefined) => ['notifications', userId, 'unread'] as const,
  /** Plans are public, the same for every user. */
  tariffTerms: () => ['tariffs'] as const,
};
