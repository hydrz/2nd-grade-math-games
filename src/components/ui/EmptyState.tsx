import { ArrowRight, type LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  note,
  small = false,
  action,
}: {
  icon: LucideIcon;
  title: string;
  note: string;
  small?: boolean;
  action?: {
    label: string;
    kind?: 'primary' | 'secondary';
    onClick: () => void;
  };
}) {
  const Heading = small ? 'h3' : 'h2';
  return (
    <div className="empty-state">
      <Icon size={small ? 42 : 45} />
      <Heading>{title}</Heading>
      <p>{note}</p>
      {action && (
        <button className={action.kind ?? 'primary'} onClick={action.onClick}>
          {action.label}
          <ArrowRight size={17} />
        </button>
      )}
    </div>
  );
}
