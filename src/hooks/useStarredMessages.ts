import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'inbox-starred-messages-v1';

interface StarredMessage {
  id: number;
  conversationId: number;
  content: string;
  sender: string;
  timestamp: number;
}

function loadStarred(): StarredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStarred(items: StarredMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useStarredMessages() {
  const [starred, setStarred] = useState<StarredMessage[]>(loadStarred);

  useEffect(() => {
    const handler = () => setStarred(loadStarred());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isStarred = useCallback((id: number) => {
    return starred.some((s) => s.id === id);
  }, [starred]);

  const toggleStar = useCallback((msg: { id: number; conversationId: number; content: string; sender: string; timestamp: number }) => {
    setStarred((prev) => {
      const exists = prev.some((s) => s.id === msg.id);
      const next = exists
        ? prev.filter((s) => s.id !== msg.id)
        : [...prev, msg];
      saveStarred(next);
      return next;
    });
  }, []);

  const getStarredForConversation = useCallback((conversationId: number) => {
    return starred.filter((s) => s.conversationId === conversationId);
  }, [starred]);

  return { starred, isStarred, toggleStar, getStarredForConversation };
}
