import { Pressable, StyleSheet, Switch } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getTrackById } from '@/lib/data';
import type { NotificationSetting } from '@/types';

type NotificationSettingItemProps = {
  setting: NotificationSetting;
  onToggle: (id: string, enabled: boolean) => void;
};

export default function NotificationSettingItem({
  setting,
  onToggle,
}: NotificationSettingItemProps) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme].tint;
  const linkedTrack = setting.trackId ? getTrackById(setting.trackId) : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.title}>{setting.title}</Text>
          <Text style={styles.time}>{setting.time}</Text>
        </View>
        <Switch
          value={setting.enabled}
          onValueChange={(value) => onToggle(setting.id, value)}
          trackColor={{ false: '#767577', true: tint }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.description}>{setting.description}</Text>

      <View style={styles.meta}>
        <Text style={styles.repeatDays}>{setting.repeatDays.join(' · ')}</Text>
        {linkedTrack && (
          <Text style={styles.trackLink}>
            {linkedTrack.composer} — {linkedTrack.title}
          </Text>
        )}
      </View>

      <Pressable style={[styles.editButton, { borderColor: tint }]}>
        <Text style={[styles.editButtonText, { color: tint }]}>시간 설정 (UI)</Text>
      </Pressable>

      <Text style={styles.note}>※ 실제 알림 스케줄링은 추후 구현 예정</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  info: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  meta: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  repeatDays: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  trackLink: {
    fontSize: 13,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    opacity: 0.5,
    textAlign: 'center',
  },
});
