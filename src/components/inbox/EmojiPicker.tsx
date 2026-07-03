// Full emoji picker (all ~1800 emojis) in the Apple/WhatsApp style, with search,
// categories and skin tones. Thin wrapper around emoji-mart so the inbox only
// depends on our own small surface. Lazy-loaded by the composer.
import Picker from "@emoji-mart/react";
import { useEffect, useState } from "react";
import { emojiDataPromise } from "@/lib/emoji";

// pt-PT labels for the picker chrome (emoji-mart defaults to English).
const I18N_PT = {
  search: "Pesquisar",
  search_no_results_1: "Nenhum emoji encontrado",
  search_no_results_2: "Tenta outra palavra.",
  pick: "Escolhe um emoji…",
  add_custom: "Adicionar emoji personalizado",
  categories: {
    activity: "Atividades",
    custom: "Personalizados",
    flags: "Bandeiras",
    foods: "Comida e Bebida",
    frequent: "Usados com frequência",
    nature: "Animais e Natureza",
    objects: "Objetos",
    people: "Sorrisos e Pessoas",
    places: "Viagens e Lugares",
    symbols: "Símbolos",
  },
  skins: {
    choose: "Escolhe o tom de pele padrão",
    "1": "Padrão",
    "2": "Claro",
    "3": "Médio-claro",
    "4": "Médio",
    "5": "Médio-escuro",
    "6": "Escuro",
  },
};

export function EmojiPicker({ onSelect }: { onSelect: (native: string) => void }) {
  // Shares the single fetch of the ~420KB dataset with lib/emoji.tsx (kicked
  // off as soon as the inbox module loaded) — usually already resolved by the
  // time the user opens the picker, since opening it also waits on this
  // component's own lazy chunk.
  const [data, setData] = useState<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    emojiDataPromise.then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);

  if (!data) {
    return (
      <div className="flex h-72 w-72 items-center justify-center text-sm text-muted-foreground">
        A carregar…
      </div>
    );
  }

  return (
    <Picker
      data={data}
      set="apple"
      theme="auto"
      i18n={I18N_PT}
      previewPosition="none"
      skinTonePosition="search"
      perLine={8}
      maxFrequentRows={2}
      navPosition="top"
      onEmojiSelect={(emoji: { native?: string }) => {
        if (emoji?.native) onSelect(emoji.native);
      }}
    />
  );
}
