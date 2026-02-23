import ReactMarkdown from "react-markdown";
import { User } from "lucide-react";
const ottoMascot = "/otto-mascot.svg";
import { Button } from "@/components/ui/button";
import type { OttoMessage as OttoMessageType } from "@/hooks/useOttoChat";

interface OttoMessageProps {
  message: OttoMessageType;
  onButtonClick?: (text: string) => void;
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

export function OttoMessageComponent({ message, onButtonClick, isStreaming }: OttoMessageProps) {
  const isUser = message.role === "user";
  const { cleanContent, buttons } = isUser
    ? { cleanContent: message.content, buttons: [] }
    : parseButtons(message.content);

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
      </div>
    </div>
  );
}
