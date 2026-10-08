/** React-query keys of the cabinet. Each starts with the data kind and the user it belongs to. */
export const queryKeys = {
  account: (userId: string | undefined) => ['account', userId] as const,
  home: (userId: string | undefined) => ['home', userId] as const,
  campaigns: (userId: string | undefined) => ['campaigns', userId] as const,
  campaignList: (userId: string | undefined) => ['campaigns', userId, 'list'] as const,
  campaignDetails: (userId: string | undefined, campaignId: string) => ['campaigns', userId, 'details', campaignId] as const,
  campaignPrefill: (userId: string | undefined, campaignId: string | null) => ['campaigns', userId, 'prefill', campaignId] as const,
  /** Under `campaigns`, so a top-up or an edit refreshes the statistics too. */
  stats: (userId: string | undefined) => ['campaigns', userId, 'stats'] as const,
  storeCatalog: (userId: string | undefined) => ['catalog', userId] as const,
  /** Plans are public, the same for every user. */
  tariffTerms: () => ['tariffs'] as const,
};
