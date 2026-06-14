import { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, RefreshCw, Smartphone, AlertCircle, Clock } from "lucide-react";
import { useWhatsappConnect, useWhatsappStatus } from "@/hooks/useMessagingChannels";

interface ConnectWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Reconnect an existing channel (by id), or create a new one with this label.
  channelId?: string;
  label?: string;
}

export function ConnectWhatsAppModal({ open, onOpenChange, channelId, label }: ConnectWhatsAppModalProps) {
  const { mutateAsync: connect, isPending } = useWhatsappConnect();
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(0);
  // For a new channel the id is only known after the first connect() response.
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(channelId);
  // Ref avoids stale closures: always reconnects the SAME channel instead of
  // creating a new row, and never fires while one is already in flight.
  const activeIdRef = useRef<string | undefined>(channelId);
  const inFlightRef = useRef(false);

  // Only poll status once we KNOW which channel we're connecting. For a new caixa
  // the id only exists after the first connect() response; polling earlier (with no
  // channel_id) would fall back to the org's existing channel and wrongly report
  // "connected", hiding the QR.
  const { data: status } = useWhatsappStatus(open && !!activeChannelId, activeChannelId);
  const connected = status?.status === "connected";

  // whatsapp-status returns qr when Evolution includes it in connectionState
  // (some builds do). Use it as the live QR so we never need to call
  // /instance/connect/ again after the first provision — which would regenerate
  // the QR, trigger a Chatwoot event, and potentially trip the flap guard.
  const displayQr = status?.qr ?? qr;

  // Fetch (or refresh) the QR code. Only called on modal open and on manual
  // "Atualizar QR" clicks — NOT on a timer. Automatic 30-second refreshes were
  // calling /instance/connect/ repeatedly, which generated a new QR (invalidating
  // any scan in progress) and sent a Chatwoot event each time.
  const refreshQr = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setErrorMsg(null);
      const data = await connect({ channelId: activeIdRef.current ?? channelId, label });
      if (data.channel_id) {
        activeIdRef.current = data.channel_id;
        setActiveChannelId(data.channel_id);
      }
      if (data.already_connected) {
        setQr(null);
        setPairingCode(null);
        return;
      }
      setQr(data.qr ?? null);
      setPairingCode(data.pairing_code ?? null);
    } catch (e) {
      setErrorMsg((e as Error).message || "Não foi possível gerar o QR code.");
    } finally {
      inFlightRef.current = false;
    }
  }, [connect, channelId, label]);

  // On open: load the first QR. On close: reset state.
  useEffect(() => {
    if (open) {
      activeIdRef.current = channelId;
      setActiveChannelId(channelId);
      refreshQr();
    } else {
      setQr(null);
      setPairingCode(null);
      setErrorMsg(null);
      setQrExpiry(0);
      activeIdRef.current = channelId;
      setActiveChannelId(channelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start a 20s countdown whenever the displayed QR changes. Baileys regenerates
  // the QR every ~20s; scanning an expired QR leaves the phone stuck on
  // "A ligar..." indefinitely. We refresh automatically so the user always has
  // a valid code — no manual button click required.
  useEffect(() => {
    if (displayQr) setQrExpiry(20);
  }, [displayQr]);

  // Tick the countdown down.
  useEffect(() => {
    if (!displayQr || qrExpiry <= 0) return;
    const t = setTimeout(() => setQrExpiry((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [displayQr, qrExpiry]);

  // Auto-refresh when the countdown reaches 0 — but ONLY if not yet connected.
  // whatsapp-connect with a channelId and 'connecting' status skips instance
  // recreation and just fetches the current QR from Evolution (fast path).
  useEffect(() => {
    if (qrExpiry !== 0 || !displayQr || isPending || connected) return;
    refreshQr();
  }, [qrExpiry, displayQr, isPending, connected, refreshQr]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Liga o teu número de WhatsApp ao Senvia para gerir as mensagens dentro do CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 min-h-[320px]">
          {connected ? (
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
              <div>
                <p className="font-semibold">WhatsApp conectado!</p>
                {status?.phone_number && (
                  <p className="text-sm text-muted-foreground">+{status.phone_number}</p>
                )}
              </div>
              <Button onClick={() => onOpenChange(false)} className="mt-2">Concluir</Button>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center text-center gap-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive max-w-xs">{errorMsg}</p>
              <Button variant="outline" onClick={refreshQr} disabled={isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : isPending && !displayQr ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">A gerar QR code...</p>
            </div>
          ) : displayQr ? (
            <div className="flex flex-col items-center gap-4">
              <div className={`rounded-lg border bg-white p-3 transition-opacity ${qrExpiry === 0 ? "opacity-30" : ""}`}>
                <img src={displayQr} alt="QR Code do WhatsApp" className="h-56 w-56" />
              </div>
              {qrExpiry > 0 ? (
                <>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Abre o <strong>WhatsApp</strong> no telemóvel</li>
                    <li>Vai a <strong>Definições → Aparelhos conectados</strong></li>
                    <li>Toca em <strong>Conectar um aparelho</strong> e aponta para o código</li>
                  </ol>
                  {pairingCode && (
                    <p className="text-xs text-muted-foreground">
                      Ou usa o código: <span className="font-mono font-semibold">{pairingCode}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> QR expira em {qrExpiry}s
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A atualizar QR...
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">A preparar ligação...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
