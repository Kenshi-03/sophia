import React, { ReactNode } from 'react';

// Reusable Calendar component layout with premium styling
export default function CalendarComponentLayout({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '2rem',
        background: 'linear-gradient(135deg, hsl(210, 30%, 95%), hsl(210, 30%, 90%))',
        fontFamily: `'Inter', sans-serif`,
      }}
    >
      {children}
    </section>
  );
}
