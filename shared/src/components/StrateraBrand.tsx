import type { CSSProperties } from 'react';
import { STRATERA_GROUP, STRATERA_NAME, STRATERA_SYMBOL_SRC } from '../branding';
import { strateraTheme } from '../theme';

type BrandVariant = 'light' | 'dark';
type BrandSize = 'sm' | 'md' | 'lg' | 'hero';
type BrandLayout = 'horizontal' | 'vertical' | 'symbol';

interface StrateraBrandProps {
  variant?: BrandVariant;
  size?: BrandSize;
  layout?: BrandLayout;
  subtitle?: string;
  symbolSrc?: string;
  style?: CSSProperties;
  className?: string;
}

const symbolSizes: Record<BrandSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  hero: 88,
};

const nameSizes: Record<BrandSize, { name: number; sub: number }> = {
  sm: { name: 15, sub: 9 },
  md: { name: 18, sub: 10 },
  lg: { name: 22, sub: 11 },
  hero: { name: 32, sub: 12 },
};

export function StrateraBrand({
  variant = 'light',
  size = 'md',
  layout = 'horizontal',
  subtitle,
  symbolSrc = STRATERA_SYMBOL_SRC,
  style,
  className,
}: StrateraBrandProps) {
  const sym = symbolSizes[size];
  const typography = nameSizes[size];
  const textColor = variant === 'light' ? strateraTheme.colors.white : strateraTheme.colors.navy;
  const subColor =
    variant === 'light' ? 'rgba(255,255,255,0.62)' : strateraTheme.colors.gray500;

  const symbolEl = (
    <img
      src={symbolSrc}
      alt=""
      width={sym}
      height={sym}
      style={{
        width: sym,
        height: sym,
        display: 'block',
        borderRadius: Math.round(sym * 0.14),
        flexShrink: 0,
        objectFit: 'cover',
        boxShadow: variant === 'light' ? '0 8px 24px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,27,58,0.12)',
      }}
    />
  );

  if (layout === 'symbol') {
    return (
      <div className={className} style={style}>
        {symbolEl}
      </div>
    );
  }

  const textBlock = (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: typography.name,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: textColor,
          lineHeight: 1.1,
        }}
      >
        {STRATERA_NAME}
      </div>
      {(subtitle || size !== 'sm') && (
        <div
          style={{
            fontSize: typography.sub,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: subColor,
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {subtitle ?? STRATERA_GROUP}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: layout === 'vertical' ? 14 : 12,
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        textAlign: layout === 'vertical' ? 'center' : 'left',
        ...style,
      }}
    >
      {symbolEl}
      {textBlock}
    </div>
  );
}
