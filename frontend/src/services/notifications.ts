import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

interface Notification {
  userInfo?: any;
}

export const configureNotifications = () => {
  PushNotification.configure({
    onNotification: function (notification: Notification) {
      console.log('NOTIFICATION:', notification);
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
  console.log(`Scheduling notification for ${date}`);
  PushNotification.localNotificationSchedule(
    {
      id,
      title,
      message,
      date,
      repeatType,
      allowWhileIdle: true,
      channelId: 'medication_reminders',
      userInfo: { type: 'medication', id },
    },
    (error?: any) => {
      if (error) {
        console.error('Notification scheduling error:', error);
      } else {
        console.log('Notification scheduled successfully');
      }
    }
  );
};

export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};