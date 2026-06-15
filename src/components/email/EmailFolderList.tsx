import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useEmailFolders } from '@/hooks/useEmail';
import { ROLE_META, folderLabel } from './emailShared';

// Folder rows for one email caixa, shown nested in the caixa rail. Auto-selects
// the Inbox when this caixa becomes active without a chosen folder.
export function EmailFolderList({
  channelId,
  activeFolderId,
  onSelect,
}: {
  channelId: string;
  activeFolderId: string | null;
  onSelect: (folderId: string) => void;
}) {
  const { data: folders = [] } = useEmailFolders(channelId);

  useEffect(() => {
    if (folders.length && (!activeFolderId || !folders.some((f) => f.id === activeFolderId))) {
      onSelect((folders.find((f) => f.role === 'inbox') || folders[0]).id);
    }
  }, [folders, activeFolderId, onSelect]);

  return (
    <div className="space-y-0.5 py-1 pl-3">
      {folders.map((f) => {
        const { Icon } = ROLE_META[f.role];
        const active = f.id === activeFolderId;
        const showUnread = f.unread_count > 0 && f.role !== 'sent' && f.role !== 'drafts';
        return (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
              active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground/70 hover:bg-accent',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{folderLabel(f)}</span>
            {showUnread && (
              <span className={cn('shrink-0 rounded-full px-1.5 text-[10px] font-semibold', active ? 'bg-primary/20' : 'bg-muted text-muted-foreground')}>
                {f.unread_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
