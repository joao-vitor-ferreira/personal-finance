import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  const { t } = useTranslation();

  const router = useRouter();

  const handleClick = (name: string) => {
    switch(name) {
      case 'creditCard':
        router.navigate('/credits-card');
        break;
      case 'accounts':
        router.navigate('/accounts');
        break;
      case 'invoices':
        router.navigate('/invoices');
        break;
      case 'userSettings':
        router.navigate('/users');
        break;
      case 'categories':
        router.navigate('/categories');
        break;
      case 'installmentGroups':
        router.navigate('/installment-groups');
        break;
    //   case 'logout':
    //     router.navigate('/logout');
    //     break;
      default:
        router.navigate('/');
        break;
    }
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.sectionsWrapper}>
            <Pressable onPress={() => {handleClick('creditCard')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'creditcard', android: 'credit_card', web: 'credit_card' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.creditCards')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('accounts')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.accounts')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('invoices')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'doc.text.below.ecg', android: 'receipt', web: 'receipt' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.invoices')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('userSettings')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'person.crop.circle', android: 'user_attributes', web: 'user_attributes' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.userSettings')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('categories')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'person.crop.circle', android: 'category', web: 'category' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.categories')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('installmentGroups')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenu}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'dollarsign.arrow.circlepath', android: 'currency_exchange', web: 'currency_exchange' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.installmentGroups')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>

            <Pressable onPress={() => {handleClick('logout')}}>
                <ThemedView type='backgroundElement' style={styles.lineMenuLast}>
                    <SymbolView
                        tintColor={theme.text}
                        name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
                        size={23}
                    />
                    <ThemedText type='small'>
                        {t('menu.logout')} 
                    </ThemedText>
                </ThemedView>
            </Pressable>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  collapsible: {
    paddingLeft: Spacing.five,
    padding: Spacing.three
  },
  lineMenu: {
    flexDirection: 'row',
    gap: Spacing.two,
    // padding: Spacing.three,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#aaaaaa',
    paddingBottom: Spacing.three,
  },
  lineMenuLast: {
    flexDirection: 'row',
    gap: Spacing.two,
    // padding: Spacing.three,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    // borderColor: '#aaaaaa',
    paddingBottom: Spacing.three,
  }
});