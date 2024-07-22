import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text } from 'react-native';

const windowWidth = Dimensions.get('window').width;

const getStyles = () => {
  const isMobile = windowWidth < 480;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
    },
    pageItem: {
      marginHorizontal: 8,
      paddingVertical: 4,
      paddingHorizontal: 12,
      minWidth: isMobile ? 44 : undefined,
      minHeight: isMobile ? 44 : undefined,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    currentPageItem: {
      borderColor: 'blue',
      backgroundColor: '#f0f8ff',
    },
    ellipsis: {
      fontSize: 16,
    },
    arrow: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    pageText: {
      fontSize: 16,
    },
    pageSizeSelector: {
      marginLeft: 16,
      padding: 4,
      borderWidth: 1,
      borderRadius: 4,
      borderColor: 'gray',
    },
  });
};

export interface PaginationItemProps {
  page: number;
  label?: string;
  isCurrent: boolean;
  disabled?: boolean;
  onPress: (page: number) => void;
}
export const PaginationItem = ({
  page,
  label,
  isCurrent,
  disabled = false,
  onPress,
}: PaginationItemProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <Pressable
      style={[styles.pageItem, isCurrent && styles.currentPageItem]}
      onPress={() => onPress(page)}
      disabled={disabled}
    >
      <Text style={styles.pageText}>{label ?? page}</Text>
    </Pressable>
  );
};
