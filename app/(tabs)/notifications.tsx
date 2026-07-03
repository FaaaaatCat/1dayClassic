import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import NotificationSettingItem from '@/components/NotificationSettingItem';
import { Text, View } from '@/components/Themed';
import { getNotificationSettings } from '@/lib/data';
import type { NotificationSetting } from '@/types';

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>(getNotificationSettings());

  const handleToggle = (id: string, enabled: boolean) => {
    setSettings((prev) =>
      prev.map((setting) => (setting.id === id ? { ...setting, enabled } : setting))
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>알림 설정</Text>
      <Text style={styles.subheader}>
        UI만 구현된 상태입니다. 실제 알림 스케줄링은 추후 expo-notifications로 연동됩니다.
      </Text>

      <FlatList
        data={settings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationSettingItem setting={item} onToggle={handleToggle} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  subheader: {
    fontSize: 13,
    opacity: 0.6,
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
