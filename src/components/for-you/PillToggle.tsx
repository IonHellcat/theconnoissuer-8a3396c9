interface PillToggleProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const PillToggle = ({ active, onClick, icon, label }: PillToggleProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-all font-body text-sm font-medium min-h-[44px] ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card text-muted-foreground hover:border-border/80 active:bg-secondary"
    }`}
  >
    {icon}
    {label}
  </button>
);
