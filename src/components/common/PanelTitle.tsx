import type { ReactNode } from 'react';

interface PanelTitleProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PanelTitle({ title, subtitle, right }: PanelTitleProps) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
