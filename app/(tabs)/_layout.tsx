import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Palette } from '@/constants/theme';

function tabIcon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} tintColor={color} size={26} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: Palette.subText,
        tabBarStyle: {
          backgroundColor: Palette.card,
          borderTopColor: Palette.divider,
        },
        sceneStyle: { backgroundColor: Palette.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: tabIcon({ ios: 'sun.max', android: 'wb_sunny', web: 'wb_sunny' }),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '보관함',
          tabBarIcon: tabIcon({ ios: 'heart', android: 'favorite', web: 'favorite' }),
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: '알람',
          tabBarIcon: tabIcon({ ios: 'alarm', android: 'alarm', web: 'alarm' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: tabIcon({ ios: 'gearshape', android: 'settings', web: 'settings' }),
        }}
      />
    </Tabs>
  );
}
