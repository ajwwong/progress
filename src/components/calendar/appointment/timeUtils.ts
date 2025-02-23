// src/components/calendar/appointment/timeUtils.ts
export function addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }
  
  export function getTimeDifferenceInMinutes(startTime: string, endTime: string): number {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    return (endHours * 60 + endMins) - (startHours * 60 + startMins);
  }

export function getDefaultAppointmentTime(date: Date = new Date()): Date {
  const defaultTime = new Date(date);
  defaultTime.setHours(9, 0, 0, 0); // Set to 9:00 AM
  return defaultTime;
}