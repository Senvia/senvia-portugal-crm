// Emoji rendering shared across the inbox. We render emojis with the Apple set
// (via emoji-mart) so they look like iPhone/WhatsApp on every device — Windows,
// Android, Mac — instead of each OS's own (flatter) style.
import { init } from "emoji-mart";
import emojiRegex from "emoji-regex";
import React from "react";

// The emoji dataset (~420KB of JSON) is fetched as its own chunk instead of
// being inlined into the Inbox bundle — this module is imported eagerly (it
// renders every emoji in every message), so a static import here used to pull
// the whole dataset into Inbox's main chunk. EmojiPicker.tsx reuses this same
// promise so the data is only ever fetched once.
export const emojiDataPromise = import("@emoji-mart/data").then((m) => m.default);

// Register the emoji data + Apple set once it arrives. This powers both the
// <em-emoji> web component and the picker. Until it resolves, already-rendered
// <em-emoji> elements sit un-upgraded (invisible) and pop in once `init` runs —
// the fetch starts as soon as the inbox module loads, so this is normally done
// well before the first message paints.
emojiDataPromise.then((data) => init({ data, set: "apple" }));

// Battle-tested matcher for full emoji grapheme clusters (ZWJ sequences like
// 👨‍👩‍👧, flags, skin-tone modifiers, variation selectors).
const RE = emojiRegex();

// True if the text contains at least one emoji — lets callers skip the split work
// for the common all-text message.
export function hasEmoji(text: string): boolean {
  RE.lastIndex = 0;
  return RE.test(text);
}

// Split a plain string into React nodes, replacing each emoji with an Apple-style
// image (<em-emoji>). Text runs are returned as-is. `size` is a CSS length so the
// emoji scales with the surrounding font.
export function renderWithEmoji(
  text: string,
  opts: { keyPrefix?: string; size?: string } = {},
): React.ReactNode[] {
  const { keyPrefix = "", size = "1.25em" } = opts;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <em-emoji
        key={`${keyPrefix}e${m.index}`}
        native={m[0]}
        set="apple"
        size={size}
        fallback={m[0]}
        // Keep the glyph on the text baseline so it doesn't push line-height around.
        style={{ display: "inline-block", verticalAlign: "-0.15em" }}
      />,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
