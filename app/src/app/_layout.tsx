import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

// import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AnimatedSplashOverlay } from '../components/animated-icon';

import '../i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@/context/session';

import { GluestackUIProvider } from '@/componentsui/gluestack-ui-provider';
import '@/global.css';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { t } = useTranslation();
  const [queryClient] = useState(() => new QueryClient());
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{
              headerShown: false
            }}>
              <Stack.Screen name='(tabs)'></Stack.Screen>
              <Stack.Screen name='credits-card' options={{
                title: t('menu.creditCards'),
                headerShown: true
              }}></Stack.Screen>
              <Stack.Screen name='accounts' options={{
                title: t('menu.accounts'),
                headerShown: true
              }}></Stack.Screen>
              <Stack.Screen name='categories' options={{
                title: t('menu.categories'),
                headerShown: true
              }}></Stack.Screen>
              <Stack.Screen name='invoices' options={{
                title: t('menu.invoices'),
                headerShown: true
              }}></Stack.Screen>
              <Stack.Screen name='installment-groups' options={{
                title: t('menu.installmentGroups'),
                headerShown: true
              }}></Stack.Screen>
              <Stack.Screen name='users' options={{
                title: t('menu.userSettings'),
                headerShown: true
              }}></Stack.Screen>
            </Stack>
          </ThemeProvider>
        </GluestackUIProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
