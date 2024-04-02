import { LockInput } from '@siteed/design-system';
import { Text, View } from 'react-native';

export default function Page() {
  return <View>
    <Text>Home page</Text>
    <LockInput text='ok' locked />
    </View>;
}
