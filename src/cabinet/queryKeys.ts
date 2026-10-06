/** React-query keys of the cabinet. Each starts with the data kind and the user it belongs to. */
export const queryKeys = {
  account: (userId: string | undefined) => ['account', userId] as const,
  home: (userId: string | undefined) => ['home', userId] as const,
  campaignList: (userId: string | undefined) => ['campaigns', userId, 'list'] as const,
};
