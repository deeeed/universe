import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenWidth } from '../../hooks/useScreenWidth';
import { TextInput } from '../TextInput/TextInput';
import { PaginationItem } from './PaginationItem';

const getStyles = ({ isMobile }: { isMobile: boolean }) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
    },
    pageSizeOptionsContainer: {
      flexDirection: 'row',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
    },
    pageSizeOption: {
      marginHorizontal: 4,
      padding: 8,
    },
    paginationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    pageNumber: {
      marginHorizontal: 4,
      padding: 8,
    },
    currentPage: {},
    currentPageText: {
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
    ellipsis: {
      fontSize: 16,
    },
    pageIndicator: {
      fontSize: isMobile ? 16 : 14,
    },
    arrow: {
      fontSize: isMobile ? 20 : 16,
      fontWeight: 'bold',
      padding: isMobile ? 16 : 8, // Bigger touch target on mobile
    },
    quickJumperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    quickJumperInput: {
      borderWidth: 1,
      borderColor: 'gray',
      padding: 8,
      marginRight: 8,
      minWidth: 60,
    },
  });
};

const ELLIPSIS = -1;
export interface PaginationProps {
  current?: number;
  defaultCurrent?: number;
  defaultPageSize?: number;
  disabled?: boolean;
  maxVisiblePages?: number;
  hideOnSinglePage?: boolean;
  itemRender?: (_: {
    page: number;
    label?: string;
    originalElement: React.ReactNode;
  }) => React.ReactNode;
  pageSize?: number;
  pageSizeOptions?: Array<number>;
  responsive?: boolean;
  showQuickJumper?: boolean | { goButton: React.ReactNode };
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  simple?: boolean;
  size?: 'default' | 'small';
  total: number;
  onChange?: (page: number, pageSize: number) => void;
  onPageSizeChange?: (current: number, size: number) => void;
  testID?: string;
}
export const Pagination = ({
  current, // controlled prop: if provided, component is controlled
  defaultCurrent = 1, // uncontrolled prop: used to set initial state if `current` is not provided
  pageSize, // controlled prop: if provided, component is controlled
  defaultPageSize = 10, // uncontrolled prop: used to set initial state if `pageSize` is not provided
  maxVisiblePages = 5,
  disabled = false,
  hideOnSinglePage = false,
  itemRender,
  pageSizeOptions = [10, 20, 50, 100],
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal,
  total = 0,
  onChange,
  onPageSizeChange,
  testID,
}: PaginationProps) => {
  const windowSize = useScreenWidth();
  const isMobile = windowSize < 480;
  const styles = useMemo(() => getStyles({ isMobile }), [isMobile]);
  // useState hooks should initialize state only if the component is uncontrolled
  const [currentPage, setCurrentPage] = useState<number>(
    current ?? defaultCurrent
  );
  const [currentPageSize, setCurrentPageSize] = useState<number>(
    pageSize ?? defaultPageSize
  );

  useEffect(() => {
    // If `current` prop changes, update the state. This makes the component "controlled"
    if (current !== undefined) {
      setCurrentPage(current);
    }
  }, [current]);

  useEffect(() => {
    // If `pageSize` prop changes, update the state. This makes the component "controlled"
    if (pageSize !== undefined) {
      setCurrentPageSize(pageSize);
    }
  }, [pageSize]);

  const totalPages = Math.ceil(total / currentPageSize);
  const [jumperPage, setJumperPage] = useState('');
  const inputRef = useRef(null);

  const visiblePages = useMemo(() => {
    const totalVisiblePages = Math.min(maxVisiblePages, totalPages); // Ensure we don't exceed total pages
    let startPage: number, endPage: number;

    if (totalPages <= totalVisiblePages) {
      // Less than totalVisiblePages total pages so show all
      startPage = 1;
      endPage = totalPages;
    } else {
      // More than totalVisiblePages total pages, calculate range
      const visiblePagesBeforeCurrent = Math.floor((totalVisiblePages - 1) / 2);
      const _visiblePagesAfterCurrent =
        totalVisiblePages - 1 - visiblePagesBeforeCurrent;

      startPage = Math.max(currentPage - visiblePagesBeforeCurrent, 1);
      endPage = Math.min(startPage + totalVisiblePages - 1, totalPages);

      if (endPage - startPage < totalVisiblePages - 1) {
        startPage = Math.max(endPage - (totalVisiblePages - 1), 1);
      }
    }

    const range = Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );

    // Add the first page and ellipsis if necessary
    if (startPage > 1) {
      range.unshift(ELLIPSIS);
      range.unshift(1);
    }
    // Add the last page and ellipsis if necessary
    if (endPage < totalPages) {
      range.push(ELLIPSIS);
      range.push(totalPages);
    }

    return range;
  }, [currentPage, totalPages, maxVisiblePages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onChange?.(page, currentPageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setCurrentPageSize(size);
    onPageSizeChange?.(current ?? 1, size);
  };

  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }

  const renderItem = (page: number, label?: string) => {
    if (itemRender) {
      return itemRender({
        page,
        label,
        originalElement: (
          <PaginationItem
            key={page}
            page={page}
            label={label}
            isCurrent={currentPage === page}
            onPress={() => handlePageChange(page)}
            testID={`${testID}-item-${page}`}
          />
        ),
      });
    }
    return (
      <PaginationItem
        key={page}
        page={page}
        label={label}
        isCurrent={currentPage === page}
        onPress={() => handlePageChange(page)}
        testID={`${testID}-item-${page}`}
      />
    );
  };

  const renderTotal = () => {
    if (showTotal) {
      const start = currentPageSize * (currentPage - 1) + 1;
      const end = Math.min(currentPageSize * currentPage, total);
      return showTotal(total, [start, end]);
    }
    return null;
  };

  // Render page size changer
  const renderPageSizeOptions = () => {
    if (showSizeChanger) {
      return (
        <View
          style={styles.pageSizeOptionsContainer}
          testID={`${testID}-size-options`}
        >
          {pageSizeOptions.map((size) => (
            <Pressable
              key={size}
              style={styles.pageSizeOption}
              onPress={() => handlePageSizeChange(Number(size))}
              disabled={disabled}
              testID={`${testID}-size-option-${size}`}
            >
              <Text>{size} / Page</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    return null;
  };

  const handleJump = () => {
    const page = Number(jumperPage);
    if (page && page !== currentPage && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumperPage(''); // Optional: clear input after jump
      Keyboard.dismiss(); // This will dismiss the keyboard
    }
  };

  if (isMobile) {
    return (
      <View style={styles.container} testID={testID}>
        {currentPage > 1 && renderItem(currentPage - 1, '<')}

        {showTotal ? (
          <View testID={`${testID}-total`}>{renderTotal()}</View>
        ) : (
          <Text
            style={styles.pageIndicator}
            testID={`${testID}-page-indicator`}
          >
            Page {currentPage} of {totalPages}
          </Text>
        )}

        {currentPage < totalPages && renderItem(currentPage + 1, '>')}
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {renderTotal() && <View testID={`${testID}-total`}>{renderTotal()}</View>}
      <View style={styles.paginationContainer} testID={`${testID}-container`}>
        <Pressable
          onPress={() =>
            !disabled && currentPage > 1 && handlePageChange(currentPage - 1)
          }
          disabled={disabled || currentPage <= 1}
          testID={`${testID}-prev`}
        >
          <Text style={styles.arrow}>{'<'}</Text>
        </Pressable>
        {visiblePages.map((page) =>
          page === ELLIPSIS ? (
            <Text
              key={`ellipsis-${Math.random()}`}
              style={styles.ellipsis}
              testID={`${testID}-ellipsis`}
            >
              ...
            </Text>
          ) : (
            renderItem(page)
          )
        )}
        <Pressable
          onPress={() =>
            !disabled &&
            currentPage < totalPages &&
            handlePageChange(currentPage + 1)
          }
          disabled={disabled || currentPage >= totalPages}
          testID={`${testID}-next`}
        >
          <Text style={styles.arrow}>{'>'}</Text>
        </Pressable>
      </View>
      {renderPageSizeOptions()}
      {showQuickJumper && (
        <View style={styles.quickJumperContainer} testID={`${testID}-jumper`}>
          <TextInput
            ref={inputRef}
            value={jumperPage}
            onChangeText={setJumperPage}
            keyboardType="numeric"
            testID={`${testID}-jumper-input`}
          />
          {typeof showQuickJumper === 'object' && showQuickJumper.goButton ? (
            <Pressable onPress={handleJump} testID={`${testID}-jumper-button`}>
              {showQuickJumper.goButton}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleJump}
              testID={`${testID}-jumper-button`}
              disabled={disabled}
            >
              <Text>Go</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
