import { createContext } from 'react';

export type ChatSite = 'public' | 'admin';
export const ChatSiteContext = createContext<ChatSite>('public');
