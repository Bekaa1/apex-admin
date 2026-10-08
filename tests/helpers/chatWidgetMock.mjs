// Local-only fixture: no Supabase imports, fetch, sockets or real credentials.
export const chatUuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const chatRow = (n, sender = 'responder', body = `Local message ${n}`) => ({
  id: chatUuid(n + 100), sessionId: chatUuid(1), clientMessageId: chatUuid(n + 1000),
  sender, body, createdAt: new Date(Date.UTC(2026, 9, 8, 8, 0, n)).toISOString(),
});
export function createChatWidgetMock(initial = []) {
  const listeners = new Set(), calls = { initialize: 0, prepare: 0, send: [], older: [], dispose: 0, refresh: 0 };
  let sequence = 5000, failure = false, sendGate = null, initializationError = null;
  let state = { phase: 'idle', sessionId: null, messages: [], error: null, errorSource: null, historyLoaded: false, hasOlderMessages: false };
  const emit = patch => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
  const transport = {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    initialize: async () => {
      calls.initialize++; emit({ phase: 'connecting', error: null, errorSource: null });
      await Promise.resolve();
      if (initializationError) {
        emit({ phase: 'error', error: initializationError, errorSource: 'connection' });
        throw initializationError;
      }
      emit({ phase: 'ready', sessionId: chatUuid(1), messages: initial, historyLoaded: true, hasOlderMessages: initial.length >= 200 });
    },
    dispose: async () => { calls.dispose++; },
    prepareMessage: body => { calls.prepare++; return Object.freeze({ sessionId: chatUuid(1), clientMessageId: chatUuid(sequence++), body: body.trim() }); },
    send: async message => {
      calls.send.push(message);
      if (sendGate) await sendGate;
      if (failure) { failure = false; throw new Error('Network error (synthetic)'); }
      const existing = state.messages.find(item => item.sender === 'visitor' && item.clientMessageId === message.clientMessageId);
      if (existing) return existing.id;
      const row = { ...chatRow(sequence++, 'visitor', message.body), clientMessageId: message.clientMessageId };
      emit({ messages: [...state.messages, row] });
      return row.id;
    },
    refreshHistory: async () => { calls.refresh++; emit({ phase: 'ready', error: null, errorSource: null }); },
    loadOlder: async (before, limit) => {
      calls.older.push({ before, limit });
      await Promise.resolve();
      const older = [chatRow(-1, 'responder', 'Earlier local message')];
      emit({ messages: [...older, ...state.messages], hasOlderMessages: false }); return older;
    },
  };
  return { transport, calls, emit,
    reply: (body = 'Синтетический ответ поддержки') => emit({ messages: [...state.messages, chatRow(sequence++, 'responder', body)] }),
    failNextSend: () => { failure = true; },
    setSendGate: promise => { sendGate = promise; },
    setInitializationError: error => { initializationError = error; },
  };
}
