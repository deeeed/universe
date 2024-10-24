import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { ColorPicker } from '../../components/Colors/ColorPicker/ColorPicker';
import { LabelSwitch } from '../../components/LabelSwitch/LabelSwitch';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme, useThemePreferences } from '../../providers/ThemeProvider';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.padding.s,
      padding: theme.padding.s,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export interface ThemeConfigProps {
  flexDirection?: 'row' | 'column';
  colors: string[];
}

export const ThemeConfig = ({
  flexDirection = 'row',
  colors,
}: ThemeConfigProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { setDarkMode, setThemeColor, darkMode } = useThemePreferences();
  const { i18n } = useTranslation();

  return (
    <View style={[styles.container, { flexDirection }]}>
      <LabelSwitch
        label={'DarkMode'}
        value={darkMode}
        onValueChange={setDarkMode}
      />
      <ColorPicker
        label={'Primary'}
        color={theme.colors.primary}
        colorOptions={colors}
        onChange={(newColor: string) => {
          console.log(newColor);
          // setThemeColor({ name: "primary", value: newColor })
        }}
      />
      <ColorPicker
        label={'Secondary'}
        color={theme.colors.secondary}
        colorOptions={colors}
        onChange={(newColor: string) => {
          console.log(newColor);
          setThemeColor({ name: 'secondary', value: newColor });
        }}
      />
      <SegmentedButtons
        value={i18n.language}
        onValueChange={(newLocale) => {
          if (newLocale !== i18n.language) {
            console.log(`change language to ${newLocale}`, i18n);
            i18n.changeLanguage(newLocale);
          }
        }}
        buttons={[
          { label: 'EN', value: 'en' },
          { label: 'FR', value: 'fr' },
        ]}
      />
    </View>
  );
};
