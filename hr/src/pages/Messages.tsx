import { useState, useMemo } from 'react';

import {

  Button, LoadingSpinner, useAsyncData, Modal, formFieldStyle, Icons, ConfirmDialog,

  validateEmail,

  Select,

} from '@stratera/shared';

import type { SendMessageInput, EmployeeMessage } from '@stratera/shared';

import { getHrApi } from '../api';

import { MetricCard } from '../components/MetricCard';

import { SectionHeader } from '../components/SectionHeader';

import '../styles/hr-dashboard.css';



const api = getHrApi();



const emptyForm: SendMessageInput = {

  employeeIds: [],

  subject: '',

  body: '',

  type: 'Announcement',

};



const PRESET_MESSAGE_TYPES = ['Announcement', 'Notice', 'Reminder', 'Special'] as const;

const CUSTOM_TYPE_VALUE = '__custom__';

type SendMode = 'bulk' | 'special';

type ContentMode = 'saved' | 'custom';



function isPresetMessageType(value: string): value is (typeof PRESET_MESSAGE_TYPES)[number] {

  return (PRESET_MESSAGE_TYPES as readonly string[]).includes(value);

}



function formatSentAt(value: string) {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {

    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',

  });

}



function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message.replace(/^Error invoking remote method '[^']+': Error: /, '') || fallback;
  }
  return fallback;
}



export function Messages() {

  const { data: employees, loading: empLoading } = useAsyncData(() => api.getEmployees());

  const { data: messages, loading: msgLoading, reload } = useAsyncData(() => api.getMessages());

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<SendMessageInput>(emptyForm);

  const [sending, setSending] = useState(false);

  const [formError, setFormError] = useState('');

  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const [viewMessage, setViewMessage] = useState<EmployeeMessage | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'all' | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');

  const [sendMode, setSendMode] = useState<SendMode>('bulk');

  const [contentMode, setContentMode] = useState<ContentMode>('custom');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [messageTypeChoice, setMessageTypeChoice] = useState<string>('Announcement');

  const [customTypeText, setCustomTypeText] = useState('');

  const { data: templates } = useAsyncData(() => api.getMessageTemplates());



  const empList = employees ?? [];

  const msgList = messages ?? [];

  const announcementCount = msgList.filter((m) => m.type === 'Announcement').length;

  const uniqueRecipients = new Set(msgList.map((m) => m.employee)).size;



  const filteredMessages = useMemo(() => {

    const q = search.trim().toLowerCase();

    if (!q) return msgList;

    return msgList.filter((m) =>

      m.employee.toLowerCase().includes(q) ||

      m.subject.toLowerCase().includes(q) ||

      m.type.toLowerCase().includes(q),

    );

  }, [msgList, search]);



  const filteredIds = useMemo(() => filteredMessages.map((m) => m.id), [filteredMessages]);

  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const someFilteredSelected = selectedIds.length > 0 && !allFilteredSelected;



  const toggleMessageSelection = (id: string) => {

    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  };



  const toggleSelectAllFiltered = () => {

    setSelectedIds((prev) => {

      if (allFilteredSelected) {

        return prev.filter((id) => !filteredIds.includes(id));

      }

      return [...new Set([...prev, ...filteredIds])];

    });

  };



  const clearSelection = () => setSelectedIds([]);



  const handleDelete = async () => {

    setDeleting(true);

    try {

      if (deleteId) {

        await api.deleteMessage(deleteId);

        setDeleteId(null);

      } else if (bulkDeleteMode === 'all') {

        await api.deleteAllMessages();

        setBulkDeleteMode(null);

        clearSelection();

      } else if (bulkDeleteMode === 'selected' && selectedIds.length > 0) {

        await api.deleteMessages(selectedIds);

        setBulkDeleteMode(null);

        clearSelection();

      }

      reload();

    } finally {

      setDeleting(false);

    }

  };



  const toggleEmployee = (id: string) => {

    setForm((prev) => ({

      ...prev,

      employeeIds: prev.employeeIds.includes(id)

        ? prev.employeeIds.filter((x) => x !== id)

        : [...prev.employeeIds, id],

    }));

  };



  const allRecipientsSelected = empList.length > 0 && form.employeeIds.length === empList.length;

  const someRecipientsSelected = form.employeeIds.length > 0 && !allRecipientsSelected;



  const toggleSelectAllRecipients = () => {

    setForm((prev) => ({

      ...prev,

      employeeIds: allRecipientsSelected ? [] : empList.map((e) => e.id),

    }));

  };



  const resetSendFormState = () => {

    setForm(emptyForm);

    setSendMode('bulk');

    setContentMode('custom');

    setSelectedTemplateId('');

    setMessageTypeChoice('Announcement');

    setCustomTypeText('');

    setFormError('');

  };



  const openSendForm = (mode: SendMode) => {

    setForm(emptyForm);

    setSendMode(mode);

    setContentMode('custom');

    setSelectedTemplateId('');

    setMessageTypeChoice(mode === 'special' ? 'Special' : 'Announcement');

    setCustomTypeText('');

    setFormError('');

    setSendFeedback(null);

    setShowForm(true);

  };



  const switchSendMode = (mode: SendMode) => {

    setSendMode(mode);

    if (mode === 'special') {

      setMessageTypeChoice((current) => (current === 'Announcement' ? 'Special' : current));

      if (allRecipientsSelected) {

        setForm((prev) => ({ ...prev, employeeIds: [] }));

      }

    }

  };



  const applyTemplate = (templateId: string) => {

    setSelectedTemplateId(templateId);

    const tpl = (templates ?? []).find((t) => t.id === templateId);

    if (!tpl) return;

    setForm((prev) => ({

      ...prev,

      subject: tpl.subject,

      body: tpl.body,

    }));

    if (isPresetMessageType(tpl.type)) {

      setMessageTypeChoice(tpl.type);

      setCustomTypeText('');

    } else {

      setMessageTypeChoice(CUSTOM_TYPE_VALUE);

      setCustomTypeText(tpl.type);

    }

  };



  const handleSend = async () => {

    setFormError('');

    const effectiveType = messageTypeChoice === CUSTOM_TYPE_VALUE ? customTypeText.trim() : messageTypeChoice;



    if (!effectiveType) {

      setFormError('Message type is required. Choose a preset or type your own.');

      return;

    }



    if (!form.subject.trim() || !form.body.trim() || form.employeeIds.length === 0) {

      setFormError(

        sendMode === 'special'

          ? 'Subject, message, and at least one selected employee are required.'

          : 'Subject, message, and at least one recipient are required.',

      );

      return;

    }



    const selected = empList.filter((e) => form.employeeIds.includes(e.id));

    for (const emp of selected) {

      const emailErr = validateEmail(emp.email);

      if (emailErr) {

        setFormError(`${emp.name}: ${emailErr}`);

        return;

      }

    }



    setSending(true);

    try {

      const result = await api.sendEmployeeMessage({ ...form, type: effectiveType });

      setShowForm(false);

      resetSendFormState();

      reload();

      if (result.failures.length === 0) {

        setSendFeedback({

          type: 'success',

          text: `Message sent to ${result.messages.length} employee${result.messages.length === 1 ? '' : 's'}.`,

        });

      } else {

        const failedNames = result.failures.map((f) => `${f.employee} (${f.error})`).join('; ');

        setSendFeedback({

          type: 'warning',

          text: `Sent to ${result.messages.length} employee${result.messages.length === 1 ? '' : 's'}. Could not reach: ${failedNames}`,

        });

      }

    } catch (err) {

      setFormError(formatApiError(err, 'Unable to send message.'));

    } finally {

      setSending(false);

    }

  };



  if (empLoading || msgLoading) return <LoadingSpinner />;



  return (

    <div className="hr-page container-fluid px-0">

      <header className="hr-page-header">

        <div className="hr-page-header-row">

          <SectionHeader
            size="page"
            title="Messages"
            subtitle="Send email announcements to employees via your configured mail server"
          />

          <div className="hr-page-actions d-flex flex-wrap gap-2">

            <Button variant="secondary" onClick={() => openSendForm('special')}>

              Special Message

            </Button>

            <Button onClick={() => openSendForm('bulk')}>

              <Icons.Mail />

              New Message

            </Button>

          </div>

        </div>

      </header>



      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">

        <MetricCard

          label="Messages Sent"

          value={String(msgList.length)}

          meta="Total in message log"

          accent="reports"

          icon={<Icons.Mail />}

        />

        <MetricCard

          label="Announcements"

          value={String(announcementCount)}

          meta="Policy & company updates"

          accent="pending"

          icon={<Icons.Reports />}

        />

        <MetricCard

          label="Recipients"

          value={String(uniqueRecipients)}

          meta="Employees contacted"

          metaType="positive"

          accent="employees"

          icon={<Icons.Employees />}

        />

        <MetricCard

          label="Employee Pool"

          value={String(empList.length)}

          meta="Valid email required"

          accent="settings"

          icon={<Icons.Employees />}

        />

      </div>



      {sendFeedback && (

        <div

          className={`alert ${sendFeedback.type === 'success' ? 'alert-success' : 'alert-warning'} d-flex align-items-center justify-content-between shadow-sm mb-4 py-2 px-3`}

          role="alert"

        >

          <span className="small mb-0">{sendFeedback.text}</span>

          <button type="button" className="btn-close btn-close-sm ms-3" aria-label="Dismiss" onClick={() => setSendFeedback(null)} />

        </div>

      )}



      <div className="alert alert-light border shadow-sm mb-4 py-3 px-4" role="note">

        <div className="d-flex gap-3 align-items-start">

          <span className="hr-stat-icon mt-1">

            <Icons.Mail />

          </span>

          <div className="small text-secondary lh-base">

            Messages are delivered by email through the SMTP server configured in Settings (the same server used for account verification and password reset).

            Each employee must have a valid email on their record. Successful sends are logged in the message history below.

          </div>

        </div>

      </div>



      <div className="card hr-panel-card hr-directory-card shadow-sm">

        <div className="card-header py-3">

          <div className="row g-3 align-items-center">

            <div className="col-lg-5">

              <SectionHeader
                title="Message History"
                subtitle={`${msgList.length} messages sent${selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ''}`}
              />

            </div>

            <div className="col-lg-7">

              <div className="d-flex flex-wrap gap-2 justify-content-lg-end align-items-center">

                {selectedIds.length > 0 && (

                  <button

                    type="button"

                    className="btn btn-sm btn-outline-danger"

                    onClick={() => setBulkDeleteMode('selected')}

                  >

                    Delete selected ({selectedIds.length})

                  </button>

                )}

                {msgList.length > 0 && (

                  <button

                    type="button"

                    className="btn btn-sm btn-outline-danger"

                    onClick={() => setBulkDeleteMode('all')}

                  >

                    Delete all

                  </button>

                )}

                <div className="input-group input-group-sm hr-directory-search flex-grow-1" style={{ minWidth: 200, maxWidth: 320 }}>

                  <span className="input-group-text bg-white">

                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />

                    </svg>

                  </span>

                  <input

                    type="search"

                    className="form-control"

                    placeholder="Search messages..."

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                  />

                </div>

              </div>

            </div>

          </div>

        </div>



        <div className="table-responsive">

          <table className="table table-hover align-middle mb-0 hr-directory-table">

            <thead>

              <tr>

                <th style={{ width: 40 }}>

                  <input

                    type="checkbox"

                    className="form-check-input"

                    aria-label="Select all messages in view"

                    checked={allFilteredSelected}

                    ref={(el) => {

                      if (el) el.indeterminate = someFilteredSelected;

                    }}

                    onChange={toggleSelectAllFiltered}

                    disabled={filteredMessages.length === 0}

                  />

                </th>

                <th>Employee</th>

                <th>Type</th>

                <th>Subject</th>

                <th>Sent</th>

                <th>By</th>

                <th className="text-end">Actions</th>

              </tr>

            </thead>

            <tbody>

              {filteredMessages.length === 0 ? (

                <tr>

                  <td colSpan={7} className="hr-directory-empty">

                    {search.trim() ? 'No messages match your search.' : 'No messages sent yet.'}

                  </td>

                </tr>

              ) : (

                filteredMessages.map((msg) => (

                  <tr key={msg.id} className={selectedIds.includes(msg.id) ? 'table-active' : undefined}>

                    <td>

                      <input

                        type="checkbox"

                        className="form-check-input"

                        aria-label={`Select message to ${msg.employee}`}

                        checked={selectedIds.includes(msg.id)}

                        onChange={() => toggleMessageSelection(msg.id)}

                      />

                    </td>

                    <td>

                      <div className="hr-emp-name">{msg.employee}</div>

                      <div className="hr-emp-email">{msg.employeeEmail}</div>

                    </td>

                    <td><span className="hr-dept-pill">{msg.type}</span></td>

                    <td className="text-secondary small">

                      <button type="button" className="hr-text-link" onClick={() => setViewMessage(msg)}>{msg.subject}</button>

                    </td>

                    <td className="text-secondary small">{formatSentAt(msg.sentAt)}</td>

                    <td className="text-muted small">{msg.sentBy}</td>

                    <td>

                      <div className="hr-table-actions">

                        <button

                          type="button"

                          className="btn btn-sm btn-outline-danger"

                          onClick={() => setDeleteId(msg.id)}

                        >

                          Delete

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>



      {viewMessage && (

        <Modal title={viewMessage.subject} onClose={() => setViewMessage(null)} onSubmit={() => setViewMessage(null)} submitLabel="Close">

          <p className="small text-muted mb-2">To: {viewMessage.employee} · {formatSentAt(viewMessage.sentAt)}</p>

          <div className="border rounded p-3 small text-secondary" style={{ whiteSpace: 'pre-wrap' }}>{viewMessage.body}</div>

        </Modal>

      )}



      {(deleteId || bulkDeleteMode) && (

        <ConfirmDialog

          title={

            bulkDeleteMode === 'all'

              ? 'Delete all messages?'

              : bulkDeleteMode === 'selected'

                ? `Delete ${selectedIds.length} selected message${selectedIds.length === 1 ? '' : 's'}?`

                : 'Delete message?'

          }

          message={

            bulkDeleteMode === 'all'

              ? `This will permanently remove all ${msgList.length} messages from the history log.`

              : bulkDeleteMode === 'selected'

                ? 'Selected messages will be removed from the history log.'

                : 'This message will be removed from the history log.'

          }

          confirmLabel="Delete"

          onConfirm={handleDelete}

          onCancel={() => {

            setDeleteId(null);

            setBulkDeleteMode(null);

          }}

          loading={deleting}

        />

      )}



      {showForm && (

        <Modal

          title={sendMode === 'special' ? 'Send Special Message' : 'Send Message to Employees'}

          onClose={() => { setShowForm(false); resetSendFormState(); }}

          onSubmit={handleSend}

          loading={sending}

          submitLabel={sendMode === 'special' ? 'Send Special Message' : 'Send Message'}

          width={580}

        >

          <div style={{ display: 'grid', gap: 16 }}>

            <div>

              <span style={formFieldStyle.label}>Send as</span>

              <div className="hr-send-mode-tabs mt-1" role="tablist">

                <button

                  type="button"

                  className={sendMode === 'bulk' ? 'active' : ''}

                  onClick={() => switchSendMode('bulk')}

                >

                  Bulk message

                </button>

                <button

                  type="button"

                  className={sendMode === 'special' ? 'active' : ''}

                  onClick={() => switchSendMode('special')}

                >

                  Special message

                </button>

              </div>

              <p className="small text-muted mb-0 mt-2">

                {sendMode === 'special'

                  ? 'Write your own message and pick the employee(s) who should receive it.'

                  : 'Send an announcement to some or all employees.'}

              </p>

            </div>



            <div>

              <span style={formFieldStyle.label}>Message content</span>

              <div className="hr-send-mode-tabs mt-1">

                <button

                  type="button"

                  className={contentMode === 'custom' ? 'active' : ''}

                  onClick={() => { setContentMode('custom'); setSelectedTemplateId(''); }}

                >

                  Write custom

                </button>

                <button

                  type="button"

                  className={contentMode === 'saved' ? 'active' : ''}

                  onClick={() => setContentMode('saved')}

                >

                  Use saved template

                </button>

              </div>

            </div>



            {contentMode === 'saved' && (

              <label style={formFieldStyle.field}>

                <span style={formFieldStyle.label}>Saved template</span>

                <Select
                  value={selectedTemplateId}
                  onChange={applyTemplate}
                  placeholder="Choose a template..."
                  options={[
                    { value: '', label: 'Choose a template...' },
                    ...(templates ?? []).map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />

                <span className="small text-muted d-block mt-1">

                  Fills subject, type, and message below — you can still edit any field.

                </span>

              </label>

            )}



            <label style={formFieldStyle.field}>

              <span style={formFieldStyle.label}>Message type</span>

              <Select
                value={messageTypeChoice}
                onChange={(next) => {
                  setMessageTypeChoice(next);
                  if (next !== CUSTOM_TYPE_VALUE) setCustomTypeText('');
                }}
                options={[
                  ...PRESET_MESSAGE_TYPES.map((type) => ({ value: type, label: type })),
                  { value: CUSTOM_TYPE_VALUE, label: 'Other — type your own' },
                ]}
              />

            </label>



            {messageTypeChoice === CUSTOM_TYPE_VALUE && (

              <label style={formFieldStyle.field}>

                <span style={formFieldStyle.label}>Custom message type</span>

                <input

                  type="text"

                  style={formFieldStyle.input}

                  value={customTypeText}

                  onChange={(e) => setCustomTypeText(e.target.value)}

                  placeholder="e.g. Personal, Urgent follow-up, HR notice"

                />

              </label>

            )}



            <label style={formFieldStyle.field}>

              <span style={formFieldStyle.label}>Subject</span>

              <input

                type="text"

                style={formFieldStyle.input}

                value={form.subject}

                onChange={(e) => setForm({ ...form, subject: e.target.value })}

                placeholder="Type your own subject"

              />

            </label>



            <label style={formFieldStyle.field}>

              <span style={formFieldStyle.label}>Message</span>

              <textarea

                style={{ ...formFieldStyle.input, minHeight: 120, resize: 'vertical' }}

                value={form.body}

                onChange={(e) => setForm({ ...form, body: e.target.value })}

                placeholder={

                  sendMode === 'special'

                    ? 'Type the special message you want to send...'

                    : 'Write your message to employees...'

                }

              />

            </label>



            <div>

              <div className="d-flex justify-content-between align-items-center gap-2 mb-1">

                <span style={formFieldStyle.label}>

                  Recipients ({form.employeeIds.length} selected)

                </span>

                {sendMode === 'bulk' && (

                  <button type="button" className="hr-link-subtle" onClick={toggleSelectAllRecipients}>

                    {allRecipientsSelected ? 'Deselect all' : 'Select all'}

                  </button>

                )}

              </div>

              {sendMode === 'special' && (

                <p className="small text-muted mb-2">

                  Select one or more employees for this special message.

                </p>

              )}

              <div className="border rounded p-2" style={{ maxHeight: 160, overflowY: 'auto' }}>

                {sendMode === 'bulk' && (

                  <label className="d-flex align-items-center gap-2 py-1 small border-bottom mb-1 pb-2" style={{ cursor: 'pointer' }}>

                    <input

                      type="checkbox"

                      checked={allRecipientsSelected}

                      ref={(el) => {

                        if (el) el.indeterminate = someRecipientsSelected;

                      }}

                      onChange={toggleSelectAllRecipients}

                    />

                    <span className="fw-semibold text-dark">All employees</span>

                    <span className="text-muted">({empList.length})</span>

                  </label>

                )}

                {empList.map((emp) => (

                  <label key={emp.id} className="d-flex align-items-center gap-2 py-1 small" style={{ cursor: 'pointer' }}>

                    <input

                      type="checkbox"

                      checked={form.employeeIds.includes(emp.id)}

                      onChange={() => toggleEmployee(emp.id)}

                    />

                    <span>{emp.name}</span>

                    <span className="text-muted">— {emp.department}</span>

                  </label>

                ))}

              </div>

            </div>



            {formError && <p className="small text-danger mb-0">{formError}</p>}

          </div>

        </Modal>

      )}

    </div>

  );

}

