// Map an IMAP mailbox to our folder role using its \Special-Use flag (reliable,
// language-independent) with a path/name fallback. Zoho/Gmail localize names
// ("Caixa de 'A receber'", "Enviado"), so NEVER match on the display name alone.
export function folderRole(box) {
  const u = (box.specialUse || '').toLowerCase();
  if (u.includes('inbox')) return 'inbox';
  if (u.includes('sent')) return 'sent';
  if (u.includes('drafts')) return 'drafts';
  if (u.includes('junk')) return 'junk';
  if (u.includes('trash')) return 'trash';
  if (u.includes('archive')) return 'archive';
  if (u.includes('all')) return 'archive';        // Gmail "All Mail"
  if ((box.path || '').toUpperCase() === 'INBOX') return 'inbox';
  return 'custom';
}

// Display order for the folder rail (system folders first, then custom).
const ROLE_SORT = { inbox: 0, drafts: 10, sent: 20, archive: 30, junk: 40, trash: 50, custom: 100 };
export function roleSort(role) {
  return ROLE_SORT[role] ?? 100;
}

// pt-PT label for a system role (used when we want a clean name regardless of
// the provider's localized mailbox name).
const ROLE_LABEL = {
  inbox: 'Entrada', sent: 'Enviados', drafts: 'Rascunhos',
  junk: 'Spam', trash: 'Lixo', archive: 'Arquivo',
};
export function roleLabel(role, fallback) {
  return ROLE_LABEL[role] || fallback;
}
