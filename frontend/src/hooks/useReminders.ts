// import { useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { medicationsAPI, appointmentsAPI } from '../services/api';
// import { scheduleNotification, cancelAllNotifications } from '../services/notifications';

// const MS_PER_DAY = 86400000;

// export const useReminders = (refreshTrigger = 0) => {
//   const { userToken, userRole } = useAuth();

//   useEffect(() => {
//     const scheduleAll = async () => {
//       if (!userToken) {
//         console.log('useReminders: No token, skipping');
//         return;
//       }
//       if (userRole?.toUpperCase() !== 'PATIENT') {
//         console.log('useReminders: Not a patient, skipping');
//         return;
//       }

//       console.log('useReminders: Starting to schedule reminders for patient');

//       try {
//         cancelAllNotifications();

//         // ── Medications ──────────────────────────────────────────
//         console.log('Fetching medications...');
//         const medsRes = await medicationsAPI.getMyMedications();
//         const meds = Array.isArray(medsRes)
//           ? medsRes
//           : (medsRes as any).medications || [];
//         console.log(`Found ${meds.length} medications`);

//         for (const med of meds) {
//           const schedules = await medicationsAPI.getSchedules(med.id);
//           const endDate = med.end_date ? new Date(med.end_date) : null;
//           const now = new Date();

//           for (const sched of schedules) {
//             const [hourStr, minuteStr] = sched.time.split(':');
//             const hour = parseInt(hourStr, 10);
//             const minute = parseInt(minuteStr, 10);

//             // Start from today's dose time
//             let firstDose = new Date();
//             firstDose.setHours(hour, minute, 0, 0);

//             // If today's time has already passed, start from tomorrow
//             if (firstDose <= now) {
//               firstDose = new Date(firstDose.getTime() + MS_PER_DAY);
//             }

//             // Schedule one notification per day for up to 30 days
//             for (let day = 0; day < 30; day++) {
//               const doseTime = new Date(firstDose.getTime() + day * MS_PER_DAY);

//               // Stop scheduling if we've passed the medication end date
//               if (endDate && doseTime > endDate) break;

//               console.log(`Scheduling medication notification for ${med.name} at ${doseTime}`);

//               scheduleNotification(
//                 `med_${med.id}_${sched.time}_day${day}`,
//                 `💊 ${med.name}`,
//                 `Time to take your dose at ${sched.time}`,
//                 doseTime
//               );
//             }
//           }
//         }

//         // ── Appointments ─────────────────────────────────────────
//         console.log('Fetching appointments...');
//         const aptsRes = await appointmentsAPI.getMyAppointments({ filter: 'upcoming' });
//         const appointments = Array.isArray(aptsRes)
//           ? aptsRes
//           : (aptsRes as any).appointments || [];
//         console.log(`Found ${appointments.length} upcoming appointments`);

//         for (const apt of appointments) {
//           console.log('Appointment object:', JSON.stringify(apt, null, 2));

//           const aptTime: string = apt.appointment_time;
//           const normalizedTime = aptTime.length === 5 ? `${aptTime}:00` : aptTime;
//           const aptDateTime = new Date(`${apt.appointment_date}T${normalizedTime}`);

//           // Skip if the parsed date is invalid
//           if (isNaN(aptDateTime.getTime())) {
//             console.warn(
//               `Skipping appointment ${apt.id}: invalid date/time`,
//               apt.appointment_date,
//               aptTime
//             );
//             continue;
//           }

//           const now = new Date();

//           // Skip appointments that are already past
//           if (aptDateTime <= now) {
//             console.log(`Skipping past appointment ${apt.id} on ${apt.appointment_date}`);
//             continue;
//           }

//           // Resolve doctor name safely across different response shapes
//           const doctorName =
//             apt.doctor_name ||
//             apt.doctor?.full_name ||
//             apt.doctor?.user?.first_name + ' ' + apt.doctor?.user?.last_name ||
//             apt.doctor?.user?.first_name ||
//             'your doctor';

//           // 1 day before
//           const dayBefore = new Date(aptDateTime);
//           dayBefore.setDate(dayBefore.getDate() - 1);
//           if (dayBefore > now) {
//             console.log(`Scheduling 1-day reminder for appointment on ${apt.appointment_date}`);
//             scheduleNotification(
//               `apt_${apt.id}_daybefore`,
//               `📅 Appointment Reminder`,
//               `You have an appointment with Dr. ${doctorName} tomorrow at ${aptTime}`,
//               dayBefore
//             );
//           }

//           // 1 hour before
//           const hourBefore = new Date(aptDateTime);
//           hourBefore.setHours(hourBefore.getHours() - 1);
//           if (hourBefore > now) {
//             console.log(`Scheduling 1-hour reminder for appointment at ${aptTime}`);
//             scheduleNotification(
//               `apt_${apt.id}_hourbefore`,
//               `⏰ Appointment in 1 hour`,
//               `Your appointment with Dr. ${doctorName} is at ${aptTime}`,
//               hourBefore
//             );
//           }
//         }

//         console.log('useReminders: All reminders scheduled successfully');
//       } catch (error: any) {
//         console.error('useReminders error:', error?.message || error);
//         if (error.response) {
//           console.error('Response status:', error.response.status);
//           console.error('Response data:', error.response.data);
//         }
//       }
//     };

//     scheduleAll();
//   }, [userToken, userRole, refreshTrigger]);
// };

// export const refreshReminders = (
//   setTrigger: React.Dispatch<React.SetStateAction<number>>
// ) => {
//   setTrigger(prev => prev + 1);
// };


import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { medicationsAPI, appointmentsAPI } from '../services/api';
import { scheduleNotification, cancelAllNotifications } from '../services/notifications';

const MS_PER_DAY = 86400000;

export const useReminders = (refreshTrigger = 0) => {
  const { userToken, userRole } = useAuth();

  useEffect(() => {
    const scheduleAll = async () => {
      if (!userToken) {
        console.log('useReminders: No token, skipping');
        return;
      }
      if (userRole?.toUpperCase() !== 'PATIENT') {
        console.log('useReminders: Not a patient, skipping');
        return;
      }

      console.log('useReminders: Starting to schedule reminders for patient');

      try {
        cancelAllNotifications();

        // ── Medications ──────────────────────────────────────────
        // ✅ Only fetch active, non-expired meds — api.ts now handles this
        const meds = await medicationsAPI.getMyMedications();
        console.log(`Found ${meds.length} active medications`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const med of meds) {
          // ✅ Double-check: skip if end_date is today or earlier
          if (med.end_date) {
            const endDate = new Date(med.end_date);
            endDate.setHours(23, 59, 59, 999); // include the end day fully
            if (endDate < new Date()) {
              console.log(`Skipping expired medication: ${med.name} (ended ${med.end_date})`);
              continue;
            }
          }

          // ✅ Skip if medication hasn't started yet
          if (med.start_date) {
            const startDate = new Date(med.start_date);
            startDate.setHours(0, 0, 0, 0);
            if (startDate > new Date()) {
              console.log(`Skipping future medication: ${med.name} (starts ${med.start_date})`);
              continue;
            }
          }

          const schedules = await medicationsAPI.getSchedules(med.id);
          const endDate = med.end_date ? new Date(med.end_date) : null;
          if (endDate) endDate.setHours(23, 59, 59, 999); // include end day

          const now = new Date();

          for (const sched of schedules) {
            const [hourStr, minuteStr] = sched.time.split(':');
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);

            let firstDose = new Date();
            firstDose.setHours(hour, minute, 0, 0);

            // If today's dose time has already passed, start from tomorrow
            if (firstDose <= now) {
              firstDose = new Date(firstDose.getTime() + MS_PER_DAY);
            }

            for (let day = 0; day < 30; day++) {
              const doseTime = new Date(firstDose.getTime() + day * MS_PER_DAY);

              // ✅ Stop if we've passed or reached the end date
              if (endDate && doseTime > endDate) break;

              console.log(`Scheduling medication notification for ${med.name} at ${doseTime}`);

              scheduleNotification(
                `med_${med.id}_${sched.time}_day${day}`,
                `💊 ${med.name}`,
                `Time to take your dose at ${sched.time}`,
                doseTime
              );
            }
          }
        }

        // ── Appointments ─────────────────────────────────────────
        const aptsRes = await appointmentsAPI.getMyAppointments({ filter: 'upcoming' });
        // ✅ Unwrap { appointments: [...] } shape
        const appointments = Array.isArray(aptsRes)
          ? aptsRes
          : (aptsRes as any).appointments ?? [];
        console.log(`Found ${appointments.length} upcoming appointments`);

        for (const apt of appointments) {
          const aptTime: string = apt.appointment_time;
          const normalizedTime = aptTime.length === 5 ? `${aptTime}:00` : aptTime;
          const aptDateTime = new Date(`${apt.appointment_date}T${normalizedTime}`);

          if (isNaN(aptDateTime.getTime())) {
            console.warn(`Skipping appointment ${apt.id}: invalid date/time`);
            continue;
          }

          const now = new Date();
          if (aptDateTime <= now) {
            console.log(`Skipping past appointment ${apt.id}`);
            continue;
          }

          const doctorName =
            apt.doctor_name ||
            apt.doctor?.full_name ||
            'your doctor';

          // 1 day before
          const dayBefore = new Date(aptDateTime);
          dayBefore.setDate(dayBefore.getDate() - 1);
          if (dayBefore > now) {
            scheduleNotification(
              `apt_${apt.id}_daybefore`,
              `📅 Appointment Reminder`,
              `You have an appointment with Dr. ${doctorName} tomorrow at ${aptTime}`,
              dayBefore
            );
          }

          // 1 hour before
          const hourBefore = new Date(aptDateTime);
          hourBefore.setHours(hourBefore.getHours() - 1);
          if (hourBefore > now) {
            scheduleNotification(
              `apt_${apt.id}_hourbefore`,
              `⏰ Appointment in 1 hour`,
              `Your appointment with Dr. ${doctorName} is at ${aptTime}`,
              hourBefore
            );
          }
        }

        console.log('useReminders: All reminders scheduled successfully');
      } catch (error: any) {
        console.error('useReminders error:', error?.message || error);
      }
    };

    scheduleAll();
  }, [userToken, userRole, refreshTrigger]);
};

export const refreshReminders = (
  setTrigger: React.Dispatch<React.SetStateAction<number>>
) => {
  setTrigger(prev => prev + 1);
};