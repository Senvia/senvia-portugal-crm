import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATE_VARIABLES } from "@/types/marketing";
import { cn } from "@/lib/utils";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TemplateEditor({ value, onChange, className }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update preview when value changes
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #333;
                  padding: 16px;
                  margin: 0;
                  background: white;
                }
                a { color: #3B82F6; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>${value || '<p style="color: #999;">O preview aparecerá aqui...</p>'}</body>
          </html>
        `);
        doc.close();
      }
    }
  }, [value]);

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.slice(0, start) + variable + value.slice(end);
    
    onChange(newValue);
    
    // Restore cursor position after variable
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Variables */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          Inserir variáveis
        </Label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <Button
              key={v.key}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => insertVariable(v.key)}
            >
              {v.key}
            </Button>
          ))}
        </div>
      </div>

      {/* Editor and Preview */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor HTML</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="mt-4">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<p>Olá {{nome}},</p>
<p>Obrigado pelo seu contacto!</p>
<p>Cumprimentos,<br>{{organizacao}}</p>"
            className="min-h-[300px] font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-md bg-white overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Email Preview"
              className="w-full h-[300px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick formatting tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Dica:</strong> Use HTML básico para formatar o email:</p>
        <p className="font-mono bg-muted px-2 py-1 rounded inline-block">
          {"<p>Parágrafo</p> <strong>Negrito</strong> <a href=\"...\">Link</a>"}
        </p>
      </div>
    </div>
  );
}
