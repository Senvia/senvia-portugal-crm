import { useEffect, useState } from "react";
import { useMessagingChannels } from "@/hooks/useMessagingChannels";
import { useEmailFolders } from "@/hooks/useEmail";
import { useMetaUnreadTotals } from "@/hooks/useMetaInbox";
import { cn } from "@/lib/utils";

/**
 * Por ler de UMA caixa de email — as pastas trazem o contador já feito.
 *
 * Um componente por caixa porque `useEmailFolders` é por canal: é a forma de ter
 * um número por caixa sem uma consulta que junte tudo. São poucas caixas.
 */
function ContaEmail({ channelId, onCount }: { channelId: string; onCount: (n: number) => void }) {
  const { data: folders = [] } = useEmailFolders(channelId);
  const total = folders
    // Enviados e rascunhos não contam: são nossos.
    .filter((f) => f.role !== "sent" && f.role !== "drafts")
    .reduce((s, f) => s + (f.unread_count || 0), 0);
  useEffect(() => { onCount(total); }, [total, onCount]);
  return null;
}

/**
 * Contador de mensagens por ler, no menu.
 *
 * Montado globalmente, mantém também o título do separador em dia — "(3) Senvia
 * OS" — para se ver que chegou coisa nova estando noutra página.
 *
 * Já contou o Chatwoot. Deixou de haver: o email vem das nossas pastas IMAP e o
 * Instagram/Messenger das nossas tabelas.
 */
export function InboxUnreadBadge({ className }: { className?: string }) {
  const { data: channels = [] } = useMessagingChannels();
  const { data: metaUnread } = useMetaUnreadTotals();

  const emailChannels = channels.filter((c) => c.channel_type === "email");
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});

  const totalMeta = Object.values(metaUnread ?? {}).reduce((s, n) => s + n, 0);
  const totalEmail = Object.values(emailCounts).reduce((s, n) => s + n, 0);
  const total = totalMeta + totalEmail;

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    // Sair com mensagens por ler (ex.: mudar para uma organização sem caixas)
    // não pode deixar um "(3)" preso no separador.
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [total]);

  return (
    <>
      {emailChannels.map((c) => (
        <ContaEmail
          key={c.id}
          channelId={c.id}
          onCount={(n) => setEmailCounts((prev) => (prev[c.id] === n ? prev : { ...prev, [c.id]: n }))}
        />
      ))}
      {total > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white",
            className,
          )}
        >
          {total > 99 ? "99+" : total}
        </span>
      )}
    </>
  );
}
