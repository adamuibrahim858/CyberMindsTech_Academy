import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  lastPage = 1,
  total = 0,
  from = 0,
  to = 0,
  onPageChange,
  isLoading = false,
}) => {
  if (lastPage <= 1 && total <= 0) return null;

  const pages = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(lastPage, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        {total > 0 ? (
          <span>
            Showing <strong>{from || 1}</strong> to <strong>{to || total}</strong> of{' '}
            <strong>{total}</strong> results
          </span>
        ) : (
          <span>Page {currentPage} of {lastPage}</span>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              className={`pagination-num ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => onPageChange(1)}
              disabled={isLoading}
            >
              1
            </button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-num ${currentPage === p ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={isLoading}
          >
            {p}
          </button>
        ))}

        {endPage < lastPage && (
          <>
            {endPage < lastPage - 1 && <span className="pagination-ellipsis">...</span>}
            <button
              type="button"
              className={`pagination-num ${currentPage === lastPage ? 'active' : ''}`}
              onClick={() => onPageChange(lastPage)}
              disabled={isLoading}
            >
              {lastPage}
            </button>
          </>
        )}

        <button
          type="button"
          className="pagination-btn"
          disabled={currentPage >= lastPage || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
