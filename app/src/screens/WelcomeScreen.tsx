import { useEffect, useState } from 'react';
import { StrateraBrand } from '@stratera/shared';
import { WelcomeSlideVisual, type WelcomeSlideTag } from '../components/WelcomeSlideVisual';
const SLIDES: {
  accent: string;
  tag: WelcomeSlideTag;
  title: string;
  caption: string;
}[] = [
  {
    accent: '#0EA5E9',
    tag: 'Finance',
    title: 'Accounting & reporting',
    caption: 'Transactions, invoicing, and real-time financial visibility for your organization.',
  },
  {
    accent: '#10B981',
    tag: 'People',
    title: 'Human resources',
    caption: 'Payroll, attendance, leave, and employee records in one secure workspace.',
  },
  {
    accent: '#818CF8',
    tag: 'Platform',
    title: 'One company, many desktops',
    caption: 'Each team signs into the workspace they need — independently, at the same time.',
  },
];
interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const current = SLIDES[slide];

  return (
    <div className="portal-root portal-welcome">
      <div className="portal-grid-bg" />
      <div className="portal-glow portal-glow-a" style={{ background: current.accent }} />
      <div
        className="portal-glow portal-glow-b"
        style={{ background: current.accent, opacity: 0.4 }}
      />

      <div className="portal-welcome-layout">
        <section className="portal-welcome-brand portal-slide-up">
          <StrateraBrand size="lg" layout="vertical" />
          <p className="portal-welcome-tagline">
            Enterprise desktop suite for finance, people operations, and growth teams.
          </p>
          <div className="portal-feature-pills">
            {SLIDES.map((s, i) => (
              <button
                key={s.tag}
                type="button"
                className={`portal-pill ${i === slide ? 'active' : ''}`}
                onClick={() => setSlide(i)}
                style={{ '--pill-accent': s.accent } as React.CSSProperties}
              >
                {s.tag}
              </button>
            ))}
          </div>
        </section>

        <section className="portal-welcome-panel portal-fade-in">
          <div className="portal-welcome-visual">
            <div className="welcome-visual-stage">
              <div className="welcome-visual-carousel">
                {SLIDES.map((s, i) => (
                  <div key={s.tag} className={`welcome-visual-slide ${i === slide ? 'active' : ''}`}>
                    <WelcomeSlideVisual variant={s.tag} accent={s.accent} />
                  </div>
                ))}
              </div>
            </div>

            <div className="portal-panel-card portal-panel-card-overlay">
              <span
                className="portal-panel-badge"
                style={{ color: current.accent, borderColor: `${current.accent}44` }}
              >
                {current.tag}
              </span>
              <h2 className="portal-panel-title">{current.title}</h2>
              <p className="portal-panel-caption">{current.caption}</p>

              <div className="portal-slide-dots">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    className={`portal-dot ${i === slide ? 'active' : ''}`}
                    onClick={() => setSlide(i)}
                    style={
                      i === slide ? ({ background: current.accent } as React.CSSProperties) : undefined
                    }
                  />
                ))}
              </div>

              <div className="portal-panel-actions">
                <button type="button" className="portal-cta portal-cta-full" onClick={onContinue}>
                  Choose your desktop
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
