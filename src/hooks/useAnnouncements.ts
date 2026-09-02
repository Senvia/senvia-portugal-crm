import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useState } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  version: string | null;
  image_url: string | null;
  published_at: string;
  expires_at: string | null;
}

function getStorageKey(userId: string) {
  return `senvia_last_seen_announcement_${userId}`;
}

export function useAnnouncements() {
  const { user } = useAuth();
  // Bumped when the announcement is marked as seen, so the red dot clears
  // immediately instead of waiting for a remount to re-read localStorage.
  const [seenTick, setSeenTick] = useState(0);

  const { data: announcement } = useQuery({
    queryKey: ['latest-announcement'],
    queryFn: async (): Promise<Announcement | null> => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('app_announcements')
        .select('id, title, content, version, image_url, published_at, expires_at')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching announcement:', error);
        return null;
      }
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const alreadySeen = (() => {
    void seenTick;
    if (!user?.id || !announcement?.id) return true;
    try {
      return localStorage.getItem(getStorageKey(user.id)) === announcement.id;
    } catch {
      return false;
    }
  })();

  /** There is a published announcement this user hasn't opened yet. */
  const hasUnread = !!announcement && !alreadySeen;

  const markAsSeen = useCallback(() => {
    if (!user?.id || !announcement?.id) return;
    try {
      localStorage.setItem(getStorageKey(user.id), announcement.id);
    } catch {}
    setSeenTick((t) => t + 1);
  }, [user?.id, announcement?.id]);

  return { announcement, hasUnread, markAsSeen };
}
