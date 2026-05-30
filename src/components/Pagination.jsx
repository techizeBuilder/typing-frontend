import React from 'react';
import './Pagination.css';

function buildPageNums(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current]);
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) set.add(i);
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

const Pagination = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  if (totalItems === 0) return null;
  const safeTotalPages = Math.max(1, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const nums = buildPageNums(page, safeTotalPages);

  return (
    <div className="pg-bar">
      <span className="pg-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong>
      </span>
      <div className="pg-controls">
        <button className="pg-btn" disabled={page <= 1} onClick={() => onPageChange(1)} title="First">«</button>
        <button className="pg-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Prev">‹</button>
        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="pg-ellipsis">…</span>
            : <button
                key={n}
                className={`pg-btn${n === page ? ' pg-btn--active' : ''}`}
                onClick={() => onPageChange(n)}
              >{n}</button>
        )}
        <button className="pg-btn" disabled={page >= safeTotalPages} onClick={() => onPageChange(page + 1)} title="Next">›</button>
        <button className="pg-btn" disabled={page >= safeTotalPages} onClick={() => onPageChange(safeTotalPages)} title="Last">»</button>
      </div>
      <select
        className="pg-size-select"
        value={pageSize}
        onChange={e => onPageSizeChange(Number(e.target.value))}
      >
        {pageSizeOptions.map(s => <option key={s} value={s}>{s} / page</option>)}
      </select>
    </div>
  );
};

export default Pagination;
