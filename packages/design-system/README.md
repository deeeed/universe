# design-system

## Installation
```bash
npx expo install @siteed/design-system react-native-paper react-native-safe-area-context @gorhom/bottom-sheet@5.0.0-alpha.9 react-native-gesture-handler @expo/vector-icons expo-localization

npm install # or yarn install
```

## Usage
```tsx
import { UIProvider, DefaultDarkTheme } from "@siteed/design-system";
// Customize by overwritting the darkTheme
<UIProvider locale={"en"} darkTheme={{...DefaultDarkTheme, colors: { ...DefaultDarkTheme.colors, background: "yellow"}}>
    {children}
</UIProvider>
```


## Storybook
```bash
yarn storybook
```
