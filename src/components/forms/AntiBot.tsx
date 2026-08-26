import { useRef, useState } from 'react';

/**
 * Armadilha para robôs nos formulários públicos.
 *
 * COMO FUNCIONA, E PORQUÊ ASSIM
 *
 * Duas perguntas que uma pessoa e um robô respondem de maneira diferente:
 *
 *  1. Preencheu um campo que não se vê? Um robô lê o HTML e preenche tudo o que
 *     parece um campo. Uma pessoa não pode preencher o que não está no ecrã.
 *  2. Preencheu o formulário em menos de dois segundos e meio? Ninguém escreve
 *     nome, email e telefone nesse tempo.
 *
 * Nenhuma das duas incomoda quem está a preencher a sério: não há caixa para
 * carregar, não há imagens para decifrar, não há pedido a terceiros. É por isso
 * que se faz assim antes de se pensar em captcha — o captcha custa conversões a
 * toda a gente para travar uma minoria.
 *
 * O CAMPO NÃO SE CHAMA "HONEYPOT"
 *
 * Chama-se `hp_website` do lado do servidor, mas para o robô parece o campo
 * `website` de um formulário qualquer. Um nome óbvio ensina-o a saltá-lo.
 *
 * O RISCO REAL, E COMO SE FECHA
 *
 * Se o preenchimento automático do browser escrever neste campo, um lead
 * verdadeiro era descartado em silêncio. Por isso: `autocomplete="off"`, sem
 * `name` que o Chrome reconheça como morada ou empresa, `tabindex={-1}` para o
 * teclado nunca lá chegar, e `aria-hidden` para os leitores de ecrã o
 * ignorarem. E do lado do servidor fica registado sempre que dispara — se
 * começar a apanhar gente a sério, vê-se nos registos em vez de se descobrir
 * pelas queixas.
 */
export function useAntiBot() {
  const [isca, setIsca] = useState('');
  // Quando o formulário apareceu. `useRef` e não `useState`: isto não muda e
  // não pode provocar um novo render.
  const abertoEm = useRef(Date.now());

  return {
    isca,
    setIsca,
    /** Os campos a juntar ao corpo do pedido. */
    campos: (): Record<string, unknown> => ({
      hp_website: isca,
      hp_tempo_ms: Date.now() - abertoEm.current,
    }),
  };
}

/**
 * O campo invisível.
 *
 * Fica fora do ecrã em vez de `display:none` — há robôs que saltam o que está
 * escondido com `display`, e quase nenhum calcula posições.
 */
export function CampoArmadilha({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <label htmlFor="website">Não preencher este campo</label>
      <input
        id="website"
        name="website"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
