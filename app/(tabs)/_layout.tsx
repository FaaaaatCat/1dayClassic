import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '음악',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'music.note',
                android: 'music_note',
                web: 'music_note',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'bell',
                android: 'notifications',
                web: 'notifications',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
