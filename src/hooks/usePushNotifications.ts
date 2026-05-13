import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = 'BPheJr4xGbGEdqLeawCOx4bahUlERq9bOvn1dGznjrei6yRo4GfRYCJaj-WD_zVvMHekax5FQYUV-Uw89jyWFhA';

/** Wait for SW to be ready, but bail out after `ms` to avoid infinite hang. */
function swReady(ms = 8000): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Service worker não está pronto')), ms);
    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Ensure the push SW is registered; returns registration or null. */
async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  try {
    // Check if already registered
    const regs = await navigator.serviceWorker.getRegistrations();
    const existing = regs.find((r) => r.active?.scriptURL?.endsWith('/sw.js'));
    if (existing) return existing;

    // Not registered yet — register now and wait
    const reg = await navigator.serviceWorker.register('/sw.js');
    // Wait for it to activate (up to 5s)
    if (!reg.active) {
      await new Promise<void>((resolve) => {
        const sw = reg.installing || reg.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', function handler() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', handler);
            resolve();
          }
        });
        setTimeout(resolve, 5000);
      });
    }
    return reg;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { user, organization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!cancelled) {
        setIsSupported(supported);
        setPermission(supported ? Notification.permission : 'default');
      }

      if (!supported || !user) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const reg = await ensureSW();
        if (!reg || cancelled) { if (!cancelled) setIsLoading(false); return; }

        const subscription = await reg.pushManager.getSubscription();
        if (subscription && !cancelled) {
          const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

          if (!cancelled) setIsSubscribed(!error && !!data);
        }
      } catch (err) {
        console.error('Error checking push subscription:', err);
      }

      if (!cancelled) setIsLoading(false);
    };

    check();
    return () => { cancelled = true; };
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !organization) {
      toast({
        title: 'Erro',
        description: 'Notificações push não suportadas ou utilizador não autenticado.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Precisa de permitir notificações para receber alertas.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Get or register the SW with timeout protection
      const registration = await ensureSW();
      if (!registration) {
        throw new Error('Não foi possível registar o service worker. Tente reabrir o app.');
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      if (!p256dh || !auth) {
        throw new Error('Falha ao obter chaves de subscrição');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          organization_id: organization.id,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(p256dh),
          auth: arrayBufferToBase64(auth),
        }, {
          onConflict: 'endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        throw new Error('Erro ao guardar subscrição');
      }

      setIsSubscribed(true);
      toast({
        title: 'Notificações ativadas',
        description: 'Vai receber alertas quando chegarem novos leads.',
      });
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao ativar notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, organization, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await swReady(5000);
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast({
        title: 'Notificações desativadas',
        description: 'Já não vai receber alertas de novos leads.',
      });
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao desativar notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const toggle = useCallback(async () => {
    return isSubscribed ? await unsubscribe() : await subscribe();
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    toggle,
  };
}
