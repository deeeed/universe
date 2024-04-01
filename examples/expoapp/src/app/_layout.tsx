import { Slot } from 'expo-router';
import { Text, View } from 'react-native';
import { UIProvider } from '@siteed/design-system'
import { LoggerProvider, useLoggerActions } from '@siteed/react-native-logger';
import { useEffect } from 'react';
import { useScreenWidth } from '@siteed/design-system';

const WithLogger = ({ children }: { children: React.ReactNode }) => {
    const { logger } = useLoggerActions('GoodApp')
    const width = useScreenWidth()

    useEffect(() => {
        logger.info('App started')
    }, [logger])

    return (
    <View>
        <Text>Width: {width}</Text>
        {children}
        </View>
    )
}

export default function HomeLayout() {
  return <LoggerProvider>
        <WithLogger>
            <Slot />
        </WithLogger>
    </LoggerProvider>;
}
