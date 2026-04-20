import React from 'react';
import type { TableProps } from './types';
import { Text } from './Text';

export function Table<T = any>({
  columns,
  data,
  isLoading = false,
  tableLayout = 'auto',
  textAlign = 'left',
  verticalAlign = 'middle',
  className = '',
}: TableProps<T>) {

  // 가로 정렬 (컬럼 개별 속성이 우선, 없으면 테이블 기본 속성)
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    const finalAlign = align || textAlign;
    switch (finalAlign) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  // 세로 정렬
  const getVAlignClass = () => {
    switch (verticalAlign) {
      case 'top': return 'align-top';
      case 'bottom': return 'align-bottom';
      default: return 'align-middle';
    }
  };

  // 스켈레톤 로딩 바 설정
  const renderSkeletons = () => {
    return Array.from({ length: 3 }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className="bg-white">
        {columns.map((col, colIndex) => {
          const finalAlign = col.align || textAlign;
          let marginClass = '';
          if (finalAlign === 'center') marginClass = 'mx-auto';
          else if (finalAlign === 'right') marginClass = 'ml-auto';

          return (
            <td
              key={`skeleton-col-${colIndex}`}
              className={`py-4 px-4 ${getVAlignClass()}`}
              style={{ width: col.width }}
            >
              <div
                className={`h-[18px] bg-gray-100 animate-pulse rounded-sm ${colIndex === 0 ? 'w-2/3' : 'w-1/2'} ${marginClass}`}
              />
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left" style={{ tableLayout, borderSpacing: 0 }}>
        <thead className="border-b-[1px] border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`py-3 px-4 font-medium ${getVAlignClass()} ${getAlignClass(col.align)}`}
                style={{ width: col.width }}
              >
                <Text typography="t6" fontWeight="medium" color="tertiary">
                  {col.header}
                </Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            renderSkeletons()
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-10 text-center h-[160px]">
                <Text typography="t5" color="tertiary">데이터가 없습니다.</Text>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-white hover:bg-gray-50 transition-colors duration-200">
                {columns.map((col) => {
                  const cellValue = row[col.key as keyof T];
                  return (
                    <td
                      key={String(col.key)}
                      className={`py-4 px-4 ${getVAlignClass()} ${getAlignClass(col.align)}`}
                    >
                      {col.render ? (
                        col.render(row, rowIndex)
                      ) : (
                        <Text typography="t5" color="primary" fontWeight="medium">
                          {String(cellValue ?? '')}
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
