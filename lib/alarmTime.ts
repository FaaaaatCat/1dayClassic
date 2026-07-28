const MINUTES_PER_DAY = 24 * 60;

/**
 * 다음 알람까지 남은 시간을 "n시간 n분 후에 알람이 울려요" 형태의 문구로 만든다.
 * 반복 요일이 하나도 켜져 있지 않으면(=실제로 울릴 알람이 없으면) null.
 */
export function getNextAlarmMessage(
  alarm: { hour: number; minute: number; repeatDays: boolean[] },
  now: Date = new Date(),
): string | null {
  if (!alarm.repeatDays.some(Boolean)) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = alarm.hour * 60 + alarm.minute;
  const today = now.getDay();

  let minDiff = Infinity;
  for (let offset = 0; offset < 7; offset++) {
    const day = (today + offset) % 7;
    if (!alarm.repeatDays[day]) continue;
    let diff = offset * MINUTES_PER_DAY + (targetMinutes - nowMinutes);
    if (diff <= 0) diff += 7 * MINUTES_PER_DAY;
    minDiff = Math.min(minDiff, diff);
  }

  if (!Number.isFinite(minDiff)) return null;

  const hours = Math.floor(minDiff / 60);
  const minutes = minDiff % 60;

  if (hours === 0) return `${minutes}분 후에 알람이 울려요`;
  if (minutes === 0) return `${hours}시간 후에 알람이 울려요`;
  return `${hours}시간 ${minutes}분 후에 알람이 울려요`;
}
