import { Select } from '@stratera/shared';
import { Icons } from '@stratera/shared';
import { SectionHeader } from '../components/SectionHeader';
import { MetricCard } from '../components/MetricCard';

export function Settings() {
  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Settings"
            subtitle="Company profile and accounting preferences"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-4">
        <MetricCard
          label="Company"
          value="STRATERA R&D"
          meta="Software Group"
          accent="settings"
          icon={<Icons.Settings />}
          compactValue
        />
        <MetricCard
          label="Fiscal Year"
          value="January"
          meta="Year start month"
          accent="accounts"
          icon={<Icons.Reports />}
          compactValue
        />
        <MetricCard
          label="Currency"
          value="USD"
          meta="Default reporting currency"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card hr-panel-card hr-settings-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Company Information"
                subtitle="Displayed on invoices and financial reports"
              />
            </div>
            <div className="card-body">
              <div className="hr-settings-form-grid">
                <div className="hr-settings-field-span-2">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-control" value="STRATERA R&D Software Group" readOnly />
                </div>
                <div>
                  <label className="form-label">Fiscal Year Start</label>
                  <Select
                    value="January"
                    onChange={() => undefined}
                    options={[
                      { value: 'January', label: 'January' },
                      { value: 'April', label: 'April' },
                      { value: 'July', label: 'July' },
                    ]}
                  />
                </div>
                <div>
                  <label className="form-label">Default Currency</label>
                  <Select
                    value="USD"
                    onChange={() => undefined}
                    options={[
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                      { value: 'GHS', label: 'GHS — Ghana Cedi' },
                    ]}
                  />
                </div>
              </div>
              <p className="small text-muted mt-3 mb-0">
                Editable company settings will be available in a future update. Values shown are used for PDF exports today.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card hr-panel-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="About STRATERA Accounting"
                subtitle="Application information"
              />
            </div>
            <div className="card-body">
              <p className="small text-secondary mb-3" style={{ lineHeight: 1.6 }}>
                <strong>STRATERA Accounting v1.0.0</strong><br />
                Developed by STRATERA R&D Software Group.<br />
                Professional accounting software for modern businesses.
              </p>
              <ul className="small text-secondary mb-0 ps-3">
                <li>Shared database with STRATERA HR for payroll sync</li>
                <li>PDF invoices and six financial report types</li>
                <li>Local SQLite storage — your data stays on your machine</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
