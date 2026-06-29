import { useState, useMemo } from 'react';
import {
  LoadingSpinner, useAsyncData, Modal, formFieldStyle, Icons, ConfirmDialog, Button,
} from '@stratera/shared';
import type { CreateDepartmentInput, Department } from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import '../styles/hr-dashboard.css';

const api = getHrApi();

const emptyDept: CreateDepartmentInput = { name: '' };

function formatSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const cleaned = msg.replace(/^Error invoking remote method '[^']+':\s*/i, '');
  const nested = cleaned.match(/Error:\s*(.+)$/);
  return nested ? nested[1] : cleaned || 'Could not save department.';
}

export function Departments() {
  const { data: departments, loading: deptLoading, reload: reloadDept } = useAsyncData(() => api.getDepartments());

  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState<CreateDepartmentInput>(emptyDept);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const deptList = departments ?? [];
  const totalEmployees = deptList.reduce((sum, d) => sum + d.employees, 0);
  const largestDept = deptList.length > 0
    ? deptList.reduce((max, d) => d.employees > max.employees ? d : max, deptList[0])
    : null;

  const filteredDepts = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return deptList;
    return deptList.filter((d) => d.name.toLowerCase().includes(q));
  }, [deptList, deptSearch]);

  const openCreateDept = () => {
    setEditingDeptId(null);
    setDeptForm(emptyDept);
    setFormError('');
    setShowDeptForm(true);
  };

  const openEditDept = (d: Department) => {
    setEditingDeptId(d.id);
    setDeptForm({ name: d.name });
    setFormError('');
    setShowDeptForm(true);
  };

  const saveDept = async () => {
    const name = deptForm.name.trim();
    if (!name) {
      setFormError('Department name is required.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const payload = { name };
      if (editingDeptId) await api.updateDepartment(editingDeptId, payload);
      else await api.createDepartment(payload);
      setShowDeptForm(false);
      setDeptForm(emptyDept);
      reloadDept();
    } catch (err) {
      setFormError(formatSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteDept = async () => {
    if (!deleteDeptId) return;
    setSaving(true);
    try {
      await api.deleteDepartment(deleteDeptId);
      setDeleteDeptId(null);
      reloadDept();
    } finally {
      setSaving(false);
    }
  };

  if (deptLoading && departments === null) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Departments"
            subtitle="Organizational structure and team units"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-4">
        <MetricCard
          label="Departments"
          value={String(deptList.length)}
          meta="Organization units"
          accent="departments"
          icon={<Icons.Departments />}
        />
        <MetricCard
          label="Total Employees"
          value={String(totalEmployees)}
          meta="Across all departments"
          metaType="positive"
          accent="employees"
          icon={<Icons.Employees />}
        />
        <MetricCard
          label="Largest Department"
          value={largestDept ? largestDept.name : '—'}
          meta={largestDept ? `${largestDept.employees} employees` : 'No departments yet'}
          accent="pending"
          icon={<Icons.Reports />}
        />
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <SectionHeader
            title="Departments"
            subtitle={`${deptList.length} organization units`}
            action={(
              <div className="d-flex gap-2 align-items-center flex-shrink-0">
                <input type="search" className="form-control form-control-sm" placeholder="Search..."
                  value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} style={{ maxWidth: 200 }} />
                <Button size="sm" onClick={openCreateDept}>
                  <Icons.Plus />
                  Add Department
                </Button>
              </div>
            )}
          />
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Employees</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="hr-directory-empty">No departments yet. Add your first department.</td>
                </tr>
              ) : (
                filteredDepts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="hr-emp-name">{row.name}</div>
                      <div className="hr-emp-id">{row.id}</div>
                    </td>
                    <td><span className="badge text-bg-light border">{row.employees}</span></td>
                    <td className="text-end">
                      <div className="hr-table-actions">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEditDept(row)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteDeptId(row.id)} disabled={row.employees > 0}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeptForm && (
        <Modal title={editingDeptId ? 'Edit Department' : 'Add Department'} onClose={() => setShowDeptForm(false)}
          onSubmit={saveDept} loading={saving} submitLabel={editingDeptId ? 'Save' : 'Add Department'}>
          <label style={formFieldStyle.field}>
            <span style={formFieldStyle.label}>Department Name</span>
            <input type="text" style={formFieldStyle.input} value={deptForm.name} autoFocus
              onChange={(e) => setDeptForm({ name: e.target.value })}
              placeholder="e.g. Engineering, Human Resources" />
          </label>
          {formError && <p className="small text-danger mt-2 mb-0">{formError}</p>}
        </Modal>
      )}

      {deleteDeptId && (
        <ConfirmDialog title="Delete department?" message="Only empty departments can be deleted."
          confirmLabel="Delete" onConfirm={deleteDept} onCancel={() => setDeleteDeptId(null)} loading={saving} />
      )}
    </div>
  );
}
