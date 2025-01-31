import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ColorItem } from '../../components/Colors/ColorItem/ColorItem';
import { useTheme } from '../../providers/ThemeProvider';

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      maxWidth: '100%',
    },
  });
};

export interface ThemeViewerProps {}
export const ThemeViewer = (_: ThemeViewerProps) => {
  const { colors, dark } = useTheme();
  const styles = useMemo(() => getStyles(), []);

  // Filter out non-string color values (like the 'elevation' object)
  const colorEntries = Object.entries(colors).filter(
    ([, value]) => typeof value === 'string'
  );

  return (
    <View style={styles.container}>
      <Text>DarkMode: {dark ? 'YES' : 'NO'}</Text>
      <ColorItem color={colors.background} label={'colors.background'} />
      <ColorItem color={colors.backdrop} label={'colors.backdrop'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        <View style={{ borderWidth: 1, padding: 5 }}>
          <Text>Active Theme Colors</Text>
          {colorEntries.map(([key, value]) => (
            // Only render ColorItem for string type colors
            <ColorItem
              key={key}
              color={value as string}
              label={`colors.${key}`}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
