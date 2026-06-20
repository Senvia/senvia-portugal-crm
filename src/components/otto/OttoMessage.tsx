import ReactMarkdown from "react-markdown";
import { User, ExternalLink, MessageCircle, Sparkles } from "lucide-react";
const ottoMascot = "/otto-mascot.svg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { OttoMessage as OttoMessageType } from "@/hooks/useOttoChat";
import { useTourStore } from "@/stores/useTourStore";
import { useModalStore, type OttoManagedModal } from "@/stores/useModalStore";
import { useOttoStore } from "@/stores/useOttoStore";
import { getTour } from "./tours";

// [tour:id] launches a deterministic guided tour. [modal:name] opens a managed modal.
function parseTours(content: string) {
  const re = /\[tour:(.+?)\]/g;
  const ids: string[] = [];
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1].trim());
  return { cleanContent: content.replace(re, "").trim(), tourIds: ids };
}
function parseModals(content: string) {
  const re = /\[modal:(.+?)\]/g;
  const ids: string[] = [];
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1].trim());
  return { cleanContent: content.replace(re, "").trim(), modalIds: ids };
}

interface OttoMessageProps {
  message: OttoMessageType;
  onButtonClick?: (text: string) => void;
  onLinkClick?: () => void;
  isStreaming?: boolean;
}

function parseButtons(content: string) {
  const buttonRegex = /\[botao:(.+?)\]/g;
  const buttons: string[] = [];
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    buttons.push(match[1]);
  }
  const cleanContent = content.replace(buttonRegex, "").trim();
  return { cleanContent, buttons };
}

function parseLinks(content: string) {
  const linkRegex = /\[link:(.+?)\|(.+?)\]/g;
  const links: { label: string; path: string }[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({ label: match[1], path: match[2] });
  }
  const cleanContent = content.replace(linkRegex, "").trim();
  return { cleanContent, links };
}

function parseWhatsAppLinks(content: string) {
  const regex = /\[whatsapp:(.+?)\|(.+?)\]/g;
  const waLinks: { label: string; url: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    waLinks.push({ label: match[1], url: match[2] });
  }
  const cleanContent = content.replace(regex, "").trim();
  return { cleanContent, waLinks };
}

export function OttoMessageComponent({ message, onButtonClick, onLinkClick, isStreaming }: OttoMessageProps) {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const startTour = useTourStore((s) => s.start);
  const openModal = useModalStore((s) => s.openModal);
  const setOttoOpen = useOttoStore((s) => s.setOpen);

  const parsed = isUser
    ? { cleanContent: message.content, buttons: [], links: [], waLinks: [], tourIds: [], modalIds: [] }
    : (() => {
        const { cleanContent: c1, buttons } = parseButtons(message.content);
        const { cleanContent: c2, links } = parseLinks(c1);
        const { cleanContent: c3, waLinks } = parseWhatsAppLinks(c2);
        const { cleanContent: c4, tourIds } = parseTours(c3);
        const { cleanContent: c5, modalIds } = parseModals(c4);
        return { cleanContent: c5, buttons, links, waLinks, tourIds, modalIds };
      })();

  const { cleanContent, buttons, links, waLinks, tourIds, modalIds } = parsed;

  // Launch a guided tour: close the chat so the spotlight over the real UI is visible.
  const launchTour = (id: string) => {
    setOttoOpen(false);
    startTour(id);
  };
  const launchModal = (id: string) => {
    setOttoOpen(false);
    openModal(id as Exclude<OttoManagedModal, null>);
  };

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ${
          isUser ? "bg-primary text-primary-foreground" : ""
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <img src={ottoMascot} alt="Otto" className="w-full h-full object-cover" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] space-y-2`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          }`}
        >
          {isUser ? (
            <p>{cleanContent}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ol]:my-1 [&_ul]:my-1">
              <ReactMarkdown>{cleanContent}</ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 rounded-sm" />
          )}
        </div>

        {/* Action buttons */}
        {buttons.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5">
            {buttons.map((btn, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs rounded-full whitespace-normal text-left"
                onClick={() => onButtonClick?.(btn)}
              >
                {btn}
              </Button>
            ))}
          </div>
        )}

        {/* Navigation links */}
        {links.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5">
            {links.map((link, i) => (
              <Button
                key={i}
                variant="default"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs rounded-full whitespace-normal text-left gap-1.5"
                onClick={() => {
                  navigate(link.path);
                  onLinkClick?.();
                }}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {link.label}
              </Button>
            ))}
          </div>
        )}

        {/* Guided tours + managed modals */}
        {!isStreaming && tourIds.map((id, i) => {
          const tour = getTour(id);
          if (!tour) return null;
          return (
            <Button
              key={`tour-${i}`}
              variant="default"
              size="sm"
              className="h-auto w-full justify-start gap-1.5 rounded-full py-1.5 px-3 text-xs"
              onClick={() => launchTour(id)}
            >
              <Sparkles className="h-3 w-3 flex-shrink-0" />
              Mostra-me: {tour.title}
            </Button>
          );
        })}
        {!isStreaming && modalIds.map((id, i) => (
          <Button
            key={`modal-${i}`}
            variant="default"
            size="sm"
            className="h-auto w-full justify-start gap-1.5 rounded-full py-1.5 px-3 text-xs"
            onClick={() => launchModal(id)}
          >
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            Abrir
          </Button>
        ))}

        {/* WhatsApp links */}
        {waLinks.length > 0 && !isStreaming && (
          <div className="flex flex-col gap-2 w-full">
            {waLinks.map((wa, i) => (
              <a
                key={i}
                href={wa.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] 
                  text-white rounded-xl p-3.5 transition-all duration-200 
                  hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm">{wa.label}</p>
                  <p className="text-[11px] text-white/80">
                    Toca para abrir o WhatsApp e enviar
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/60 flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
