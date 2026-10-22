import { T } from '@admiral-ds/react-ui';
import type { ReactNode } from 'react';

interface PageIntroProps {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function PageIntro({ kicker, title, description, children }: PageIntroProps) {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span className="section-kicker">{kicker}</span>
        <T font="Header/H2" as="h2">
          {title}
        </T>
        <p>{description}</p>
      </section>
      {children}
    </div>
  );
}
