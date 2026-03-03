import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  delta: number;
  icon: ReactNode;
  highlight?: 'neutral' | 'warning' | 'critical' | 'positive';
  hideFooter?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  icon,
  highlight = 'neutral',
  hideFooter = false,
}: KpiCardProps) {
  const isPositive = delta >= 0;

  return (
    <article className={`panel kpi-card kpi-${highlight}`}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <strong className="kpi-value">{value}</strong>
      {hideFooter ? null : (
        <div className="kpi-footer">
          <span className={`kpi-delta ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="kpi-subtitle">{subtitle}</span>
        </div>
      )}
    </article>
  );
}
