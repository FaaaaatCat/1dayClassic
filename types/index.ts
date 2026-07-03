export interface Track {
  id: string;
  title: string;
  composer: string;
  duration: string;
  uri: string;
  description?: string;
}

export interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  time: string;
  enabled: boolean;
  repeatDays: string[];
  trackId?: string;
}

export interface TracksData {
  tracks: Track[];
}

export interface NotificationsData {
  settings: NotificationSetting[];
}
