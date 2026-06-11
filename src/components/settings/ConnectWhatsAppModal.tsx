import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, RefreshCw, Smartphone, AlertCircle } from "lucide-react";
import { useWhatsappConnect, useWhatsappStatus } from "@/hooks/useMessagingChannels";

interface ConnectWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWhatsAppModal({ open, onOpenChange }: ConnectWhatsAppModalProps) {
  const { mutateAsync: connect, isPending } = useWhatsappConnect();
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: status } = useWhatsappStatus(open);
  const connected = status?.status === "connected";

  // Fetch (or refresh) the QR code.
  const refreshQr = async () => {
    try {
      setErrorMsg(null);
      const data = await connect();
      if (data.already_connected) {
        setQr(null);
        setPairingCode(null);
        return;
      }
      setQr(data.qr ?? null);
      setPairingCode(data.pairing_code ?? null);
    } catch (e) {
      setErrorMsg((e as Error).message || "Não foi possível gerar o QR code.");
    }
  };

  // On open: load the first QR. On close: reset state.
  useEffect(() => {
    if (open) {
      refreshQr();
    } else {
      setQr(null);
      setPairingCode(null);
      setErrorMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The Evolution QR expires (~40s). Refresh every 30s until connected.
  useEffect(() => {
    if (!open || connected) return;
    const interval = setInterval(() => {
      refreshQr();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connected]);

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
          ) : isPending && !qr ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">A gerar QR code...</p>
            </div>
          ) : qr ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-white p-3">
                <img src={qr} alt="QR Code do WhatsApp" className="h-56 w-56" />
              </div>
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
                <Loader2 className="h-3 w-3 animate-spin" /> À espera da leitura...
              </p>
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
