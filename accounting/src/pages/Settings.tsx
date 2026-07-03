import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Select, Icons, HR_CURRENCY_OPTIONS, currencyLabel, setActiveCurrency,
  downloadTextFile, readFileAsText,
  ACCOUNTING_COMPANY_NAME_KEY,
  ACCOUNTING_COMPANY_ADDRESS_KEY,
  ACCOUNTING_COMPANY_EMAIL_KEY,
} from '@stratera/shared';
import { SectionHeader } from '../components/SectionHeader';
import { MetricCard } from '../components/MetricCard';
import { getAccountingApi } from '../api';
import { useActiveCurrency } from '../hooks/useActiveCurrency';
import { FISCAL_YEAR_KEY } from '../utils/companySettings';

const api = getAccountingApi();

const FISCAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key)?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function Settings() {
  const currency = useActiveCurrency();
  const [fiscalYear, setFiscalYear] = useState(() => readStored(FISCAL_YEAR_KEY, 'January'));
  const [companyName, setCompanyName] = useState(() =>
    readStored(ACCOUNTING_COMPANY_NAME_KEY, 'STRATERA R&D Software Group'),
  );
  const [companyAddress, setCompanyAddress] = useState(() =>
    readStored(ACCOUNTING_COMPANY_ADDRESS_KEY, ''),
  );
  const [companyEmail, setCompanyEmail] = useState(() =>
    readStored(ACCOUNTING_COMPANY_EMAIL_KEY, ''),
  );
  const [savedNote, setSavedNote] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const flashSaved = (message: string) => {
    setSavedNote(message);
    window.setTimeout(() => setSavedNote(''), 2500);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const json = await api.exportAccountingBackup();
      downloadTextFile(`stratera-accounting-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
      flashSaved('Backup downloaded.');
    } catch {
      flashSaved('Backup failed.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const text = await readFileAsText(file);
      const ok = await api.importAccountingBackup(text);
      flashSaved(ok ? 'Backup restored. Reopen pages to see changes.' : 'Restore failed. Check the file.');
    } catch {
      flashSaved('Restore failed. Check the file.');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  const handleCurrencyChange = (code: string) => {
    setActiveCurrency(code);
    flashSaved(`Currency updated to ${currencyLabel(code)}.`);
  };

  const handleFiscalYearChange = (month: string) => {
    setFiscalYear(month);
    try {
      localStorage.setItem(FISCAL_YEAR_KEY, month);
    } catch {
      /* ignore */
    }
    flashSaved(`Fiscal year start set to ${month}.`);
  };

  const handleCompanyChange = (value: string) => {
    setCompanyName(value);
    try {
      localStorage.setItem(ACCOUNTING_COMPANY_NAME_KEY, value.trim() || 'STRATERA R&D Software Group');
    } catch {
      /* ignore */
    }
  };

  const handleCompanyBlur = () => {
    const name = companyName.trim() || 'STRATERA R&D Software Group';
    setCompanyName(name);
    try {
      localStorage.setItem(ACCOUNTING_COMPANY_NAME_KEY, name);
    } catch {
      /* ignore */
    }
    flashSaved('Company name saved.');
  };

  const persistField = (key: string, value: string, label: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    flashSaved(`${label} saved.`);
  };

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

      {savedNote && (
        <div className="alert alert-success py-2 px-3 shadow-sm mb-4" role="status">
          <span className="small">{savedNote}</span>
        </div>
      )}

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-4">
        <MetricCard
          label="Company"
          value={companyName.split(' ')[0] || 'STRATERA'}
          meta="Software Group"
          accent="settings"
          icon={<Icons.Settings />}
          compactValue
        />
        <MetricCard
          label="Fiscal Year"
          value={fiscalYear}
          meta="Year start month"
          accent="accounts"
          icon={<Icons.Reports />}
          compactValue
        />
        <MetricCard
          label="Currency"
          value={currency}
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
                  <input
                    type="text"
                    className="form-control"
                    value={companyName}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    onBlur={handleCompanyBlur}
                  />
                </div>
                <div className="hr-settings-field-span-2">
                  <label className="form-label">Company Address</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Street, city, country"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    onBlur={() => persistField(ACCOUNTING_COMPANY_ADDRESS_KEY, companyAddress.trim(), 'Address')}
                  />
                </div>
                <div>
                  <label className="form-label">Company Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="billing@yourcompany.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    onBlur={() => persistField(ACCOUNTING_COMPANY_EMAIL_KEY, companyEmail.trim(), 'Email')}
                  />
                </div>
                <div>
                  <label className="form-label">Fiscal Year Start</label>
                  <Select
                    value={fiscalYear}
                    onChange={handleFiscalYearChange}
                    options={FISCAL_MONTHS.map((m) => ({ value: m, label: m }))}
                  />
                </div>
                <div>
                  <label className="form-label">Default Currency</label>
                  <Select
                    value={currency}
                    onChange={handleCurrencyChange}
                    options={HR_CURRENCY_OPTIONS.map((c) => ({
                      value: c.code,
                      label: `${c.code} — ${c.label}`,
                    }))}
                  />
                </div>
              </div>
              <p className="small text-muted mt-3 mb-0">
                Company details appear on invoice PDFs and financial reports. Currency changes apply
                immediately across the Accounting desktop.
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

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Backup & Restore"
                subtitle="Export or restore accounts, transactions, and invoices"
              />
            </div>
            <div className="card-body">
              <p className="small text-secondary mb-3" style={{ lineHeight: 1.6 }}>
                Download a full JSON backup of your accounting data, or restore from a previous
                backup file. Restoring overwrites matching records.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBackup}
                  disabled={backingUp}
                >
                  {backingUp ? 'Exporting...' : 'Export Backup'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={restoring}
                >
                  {restoring ? 'Restoring...' : 'Restore Backup'}
                </button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={handleRestore}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
