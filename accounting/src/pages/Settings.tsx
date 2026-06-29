import type { CSSProperties } from 'react';
import { PageHeader, strateraTheme, Select } from '@stratera/shared';

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid ${strateraTheme.colors.gray300}`,
  fontSize: 14,
  color: strateraTheme.colors.gray700,
  background: strateraTheme.colors.gray50,
};

export function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your accounting application"
      />

      <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
        <section
          style={{
            background: strateraTheme.colors.white,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${strateraTheme.colors.gray200}`,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: strateraTheme.colors.navy, marginBottom: 16 }}>
            Company Information
          </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Company Name</span>
              <input type="text" value="STRATERA R&D Software Group" readOnly style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Fiscal Year Start</span>
              <Select
                value="January"
                onChange={() => undefined}
                options={[
                  { value: 'January', label: 'January' },
                  { value: 'April', label: 'April' },
                  { value: 'July', label: 'July' },
                ]}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Default Currency</span>
              <Select
                value="USD"
                onChange={() => undefined}
                options={[
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                ]}
              />
            </label>
          </div>
        </section>

        <section
          style={{
            background: strateraTheme.colors.white,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${strateraTheme.colors.gray200}`,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: strateraTheme.colors.navy, marginBottom: 8 }}>
            About
          </h3>
          <p style={{ fontSize: 14, color: strateraTheme.colors.gray500, lineHeight: 1.6 }}>
            STRATERA Accounting v1.0.0<br />
            Developed by STRATERA R&D Software Group<br />
            Professional accounting software for modern businesses.
          </p>
        </section>
      </div>
    </div>
  );
}
