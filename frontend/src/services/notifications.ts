import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// Convert string id to a stable number for Android compatibility
const hashId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const configureNotifications = () => {
  PushNotification.configure({
    onNotification: function (notification: any) {
      console.log('NOTIFICATION:', notification);
      // Show notification even when app is in foreground
      if (notification.foreground) {
        PushNotification.localNotification({
          channelId: 'medication_reminders',
          title: notification.title || 'Reminder',
          message: notification.message || 'Time to take your medication',
        });
      }
    },
    requestPermissions: Platform.OS === 'ios',
  });

  PushNotification.createChannel(
    {
      channelId: 'medication_reminders',
      channelName: 'Medication Reminders',
      channelDescription: 'Reminders to take your medications',
      soundName: 'default',
      importance: 4,
      vibrate: true,
    },
    (created: boolean) => console.log(`Channel created: ${created}`)
  );
};

export const scheduleNotification = (
  id: string,
  title: string,
  message: string,
  date: Date,
  repeatType?: 'day' | 'week' | 'month' | 'year'
) => {
  console.log(`Scheduling notification "${title}" for ${date}`);
  PushNotification.localNotificationSchedule({
    id: String(hashId(id)),  // must be numeric string for Android
    title,
    message,
    date,
    repeatType,
    allowWhileIdle: true,
    channelId: 'medication_reminders',
    userInfo: { type: 'medication', id },
  });
};

export const cancelNotification = (id: string) => {
  PushNotification.cancelLocalNotification(String(hashId(id)));
  console.log(`Notification cancelled: ${id}`);
};

export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
  console.log('All local notifications cancelled');
};