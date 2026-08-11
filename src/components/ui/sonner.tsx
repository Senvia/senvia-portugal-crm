import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // O sonner é ancorado em BAIXO (bottom-right por omissão), por isso a
      // safe-area que interessa é a de baixo (barra do iPhone), não a de cima.
      // Havia aqui um `style={{ top: ... }}`: como o CSS do sonner já define
      // `position:fixed` + `bottom` e não define `height`, acrescentar `top`
      // esticava o contentor de cima a baixo do ecrã — uma coluna invisível de
      // 356px encostada à direita, com z-index 999999999 e pointer-events
      // normais, que engolia todos os cliques enquanto houvesse um toast.
      offset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
