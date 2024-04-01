import { Slot } from 'expo-router';
import { Text, View } from 'react-native';
import { UIProvider } from '@siteed/design-system'

export default function HomeLayout() {
  return <UIProvider>
    <Text>Header</Text>
    <Slot />
    </UIProvider>;
}
