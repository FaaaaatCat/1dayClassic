import notificationsData from '@/data/notifications.json';
import tracksData from '@/data/tracks.json';
import type {
  NotificationSetting,
  NotificationsData,
  Track,
  TracksData,
} from '@/types';

export function getTracks(): Track[] {
  return (tracksData as TracksData).tracks;
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((track) => track.id === id);
}

export function getNotificationSettings(): NotificationSetting[] {
  return (notificationsData as NotificationsData).settings;
}
