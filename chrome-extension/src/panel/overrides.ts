// Manually-set phone numbers, remembered per conversation.
//
// Detection covers most chats (DOM jid, then WhatsApp's own IndexedDB), but it
// will never be 100% — business accounts, privacy ids and contacts whose stored
// name differs from the header all slip through. Rather than leave the panel
// dead for those, the agent types the number once and it sticks.
//
// Keyed by WhatsApp jid (or `name:<title>` when that's all we have), so it
// survives reloads and follows the conversation.

const KEY = 'senvia.phoneOverrides';

type Overrides = Record<string, string>;

async function readAll(): Promise<Overrides> {
  const bag = await chrome.storage.local.get(KEY);
  return (bag?.[KEY] as Overrides | undefined) ?? {};
}

export async function getOverride(chatKey: string): Promise<string> {
  if (!chatKey) return '';
  const all = await readAll();
  return all[chatKey] ?? '';
}

export async function setOverride(chatKey: string, phone: string): Promise<void> {
  if (!chatKey) return;
  const digits = phone.replace(/\D/g, '');
  const all = await readAll();
  if (digits.length >= 9) all[chatKey] = digits;
  else delete all[chatKey];
  await chrome.storage.local.set({ [KEY]: all });
}
