import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { TEMPLATE_VARIABLES } from "@/types/marketing";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Unlink,
} from "lucide-react";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL do link:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Lista"
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={setLink}
        aria-label="Inserir link"
      >
        <LinkIcon className="h-4 w-4" />
      </Toggle>

      {editor.isActive("link") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label="Remover link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Desfazer"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Refazer"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TemplateEditor({ value, onChange, className }: TemplateEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder: "Escreva o conteúdo do seu email aqui...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[250px] p-4 focus:outline-none",
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

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
                h1 { font-size: 1.5em; margin: 0.5em 0; }
                h2 { font-size: 1.25em; margin: 0.5em 0; }
                p { margin: 0.5em 0; }
                ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
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
    if (editor) {
      editor.chain().focus().insertContent(variable).run();
    }
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor Visual</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="border rounded-md overflow-hidden bg-background">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </TabsContent>

        <TabsContent value="html" className="mt-4">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[350px] font-mono text-sm"
            placeholder="<p>Escreva o seu HTML aqui...</p>"
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

      {/* Quick tips */}
      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Dica:</strong> Use a toolbar para formatar o texto. As variáveis como{" "}
          <code className="bg-muted px-1 py-0.5 rounded">{"{{nome}}"}</code> serão
          substituídas pelos dados reais ao enviar.
        </p>
      </div>
    </div>
  );
}
