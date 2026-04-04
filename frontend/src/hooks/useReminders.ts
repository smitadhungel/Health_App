import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { medicationsAPI, appointmentsAPI } from '../services/api';
import { scheduleNotification, cancelAllNotifications } from '../services/notifications';

export const useReminders = () => {
  const { userToken } = useAuth();

  useEffect(() => {
    if (!userToken) return;

    const scheduleAll = async () => {
      try {
        cancelAllNotifications(); // remove previous schedules

        // ---------- Medication reminders ----------
        const medsRes = await medicationsAPI.getMyMedications();
        // API may return an array directly or an object with a 'medications' property
        const meds = Array.isArray(medsRes) ? medsRes : (medsRes as any).medications || [];

        for (const med of meds) {
          const schedules = await medicationsAPI.getSchedules(med.id);
          const endDate = med.end_date ? new Date(med.end_date) : null;
          const now = new Date();

          for (const sched of schedules) {
            const [hour, minute] = sched.time.split(':');
            let doseTime = new Date();
            // doseTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
            doseTime.setMinutes(doseTime.getMinutes() + 2);

            if (doseTime <= now) doseTime.setDate(doseTime.getDate() + 1);
            if (endDate && doseTime > endDate) continue;

            scheduleNotification(
              `med_${med.id}_${sched.time}`,
              `${med.name}`,
              `Time to take your dose at ${sched.time}`,
              doseTime,
              'day' // repeat daily
            );
          }
        }

        // ---------- Appointment reminders ----------
        const aptsRes = await appointmentsAPI.getMyAppointments({ status: 'upcoming' });
        // API may return an array directly or an object with an 'appointments' property
        const appointments = Array.isArray(aptsRes) ? aptsRes : (aptsRes as any).appointments || [];

        for (const apt of appointments) {
          const aptTime = apt.appointment_time;
          const aptDateTime = new Date(apt.appointment_date + 'T' + aptTime);
          const now = new Date();

          // 1 day before
          const dayBefore = new Date(aptDateTime);
          dayBefore.setDate(dayBefore.getDate() - 1);
          if (dayBefore > now) {
            scheduleNotification(
              `apt_${apt.id}_daybefore`,
              `Appointment Reminder`,
              `You have an appointment with Dr. ${apt.doctor_name} tomorrow at ${aptTime}`,
              dayBefore
            );
          }

          // 1 hour before
          const hourBefore = new Date(aptDateTime);
          hourBefore.setHours(hourBefore.getHours() - 1);
          if (hourBefore > now) {
            scheduleNotification(
              `apt_${apt.id}_hourbefore`,
              `Appointment in 1 hour`,
              `Your appointment with Dr. ${apt.doctor_name} is at ${aptTime}`,
              hourBefore
            );
          }
        }
      } catch (error) {
        console.error('Error scheduling reminders:', error);
      }
    };

    scheduleAll();
  }, [userToken]);
};