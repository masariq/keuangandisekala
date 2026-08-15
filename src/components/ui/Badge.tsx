interface BadgeProps {
  children: React.ReactNode;
  color?: 'rose' | 'emerald' | 'amber' | 'red' | 'slate' | 'blue';
  className?: string;
}

const colorClasses: Record<string, string> = {
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
};

export function Badge({ children, color = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}
