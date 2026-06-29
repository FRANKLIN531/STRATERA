export function TablePagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top bg-white">
      <span className="small text-muted">
        Showing {from}–{to} of {total}
      </span>
      <div className="btn-group btn-group-sm">
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span className="btn btn-outline-secondary disabled">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
