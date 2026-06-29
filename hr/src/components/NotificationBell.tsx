import { useState, useRef, useEffect } from 'react';
import { useAsyncData, Icons } from '@stratera/shared';
import type { HrNotification } from '@stratera/shared';
import { getHrApi } from '../api';
import { useHrNav } from '../context/HrNavContext';

const api = getHrApi();

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function NotificationBell() {
  const { data: notifications, reload } = useAsyncData(() => api.getNotifications());
  const { navigate } = useHrNav();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleRead = async (n: HrNotification) => {
    await api.markNotificationRead(n.id);
    reload();
    if (n.linkPage) {
      navigate(n.linkPage);
      setOpen(false);
    }
  };

  const markAll = async () => {
    await api.markAllNotificationsRead();
    reload();
  };

  return (
    <div className="position-relative" ref={ref}>
      <button
        type="button"
        className="btn btn-light border btn-sm position-relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Icons.Mail />
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card shadow-lg border-0"
          style={{ position: 'absolute', right: 0, top: '110%', width: 320, zIndex: 1050 }}
        >
          <div className="card-header py-2 d-flex justify-content-between align-items-center">
            <span className="small fw-semibold">Notifications</span>
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="list-group list-group-flush" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div className="p-3 text-muted small text-center">No notifications</div>
            ) : (
              list.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`list-group-item list-group-item-action py-2 ${n.read ? '' : 'bg-light'}`}
                  onClick={() => handleRead(n)}
                >
                  <div className="small fw-semibold text-dark">{n.title}</div>
                  <div className="small text-secondary">{n.message}</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatTime(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
