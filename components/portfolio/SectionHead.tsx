import type { ReactNode } from "react";

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}

export function SectionHead({ eyebrow, title, sub, action }: SectionHeadProps) {
  return (
    <div className="s-head">
      <div>
        <div className="s-eyebrow">{eyebrow}</div>
        <div className="s-title">{title}</div>
        {sub ? <div className="s-sub" style={{ marginTop: 12 }}>{sub}</div> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
