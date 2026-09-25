import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText } from '@/componentsui/button';
import {
  AddIcon,
  GlobeIcon,
  Icon,
  PlayIcon,
  SettingsIcon,
} from '@/componentsui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/componentsui/menu';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.four,
          paddingRight: insets.right + Spacing.four,
          paddingLeft: insets.left + Spacing.four,
        },
      ]}>
      <Menu
        offset={Spacing.two}
        disabledKeys={['Settings']}
        trigger={(triggerProps) => (
          <Button {...triggerProps}>
            <ButtonText>Menu</ButtonText>
          </Button>
        )}>
        <MenuItem key="Add account" textValue="Add account">
          <Icon as={AddIcon} size="sm" className="mr-2" />
          <MenuItemLabel>Add account</MenuItemLabel>
        </MenuItem>
        <MenuItem key="Community" textValue="Community">
          <Icon as={GlobeIcon} size="sm" className="mr-2" />
          <MenuItemLabel>Community</MenuItemLabel>
        </MenuItem>
        <MenuItem key="Plugins" textValue="Plugins">
          <Icon as={PlayIcon} size="sm" className="mr-2" />
          <MenuItemLabel>Plugins</MenuItemLabel>
        </MenuItem>
        <MenuItem key="Settings" textValue="Settings">
          <Icon as={SettingsIcon} size="sm" className="mr-2" />
          <MenuItemLabel>Settings</MenuItemLabel>
        </MenuItem>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
