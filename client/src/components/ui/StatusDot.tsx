import type { Project } from '../../types';

type ProjectStatus = Project['status'];

interface StatusMeta {
  color: string;
  pillBg: string;
  pulse: boolean;
}

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  uploaded: { color: 'var(--status-uploaded)', pillBg: 'rgba(207, 175, 82, 0.12)', pulse: false },
  analyzing: { color: 'var(--status-analyzing)', pillBg: 'rgba(92, 156, 214, 0.12)', pulse: true },
  ready: { color: 'var(--status-ready)', pillBg: 'rgba(85, 179, 110, 0.12)', pulse: false },
  rendering: { color: 'var(--status-rendering)', pillBg: 'rgba(232, 147, 58, 0.12)', pulse: true },
  complete: { color: 'var(--status-ready)', pillBg: 'rgba(85, 179, 110, 0.12)', pulse: false },
  failed: { color: 'var(--status-failed)', pillBg: 'rgba(217, 95, 88, 0.12)', pulse: false },
};

export function StatusDot({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.uploaded;
  return (
    <span
      className={`inline-block w-[7px] h-[7px] rounded-full shrink-0 ${meta.pulse ? 'animate-status-pulse' : ''}`}
      style={{ background: meta.color }}
    />
  );
}
