import { useState, useCallback } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export const usePagination = ({ 
  initialPage = 1, 
  initialPageSize = 12 
}: PaginationOptions = {}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const getOffset = useCallback(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  const getLimit = useCallback(() => {
    return pageSize;
  }, [pageSize]);

  return {
    currentPage,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    getOffset,
    getLimit
  };
};
