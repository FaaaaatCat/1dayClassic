import { getTracks } from '@/lib/data';
import type { Track } from '@/types';

/** 홈 화면에서 '오늘'로 고정 표시할 날짜 — 실제 시스템 날짜는 읽지 않는다. */
export const TODAY_MONTH = 1;
export const TODAY_DAY = 1;

export const CALENDAR_MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 실제 트랙이 아직 없는 날짜를 채우는 자리표시 곡 목록. 재생되지 않으며 순환 사용된다. */
const PLACEHOLDER_PIECES: { title: string; composer: string; composerLatin: string }[] = [
  { title: '사계 중 「봄」 1악장', composer: '안토니오 비발디', composerLatin: 'A. Vivaldi' },
  { title: '녹턴 Op.9 No.2', composer: '프레데리크 쇼팽', composerLatin: 'F. Chopin' },
  { title: '골드베르크 변주곡 BWV 988', composer: '요한 제바스티안 바흐', composerLatin: 'J. S. Bach' },
  { title: "피아노 소나타 14번 '월광'", composer: '루트비히 판 베토벤', composerLatin: 'L. v. Beethoven' },
  { title: '아이네 클라이네 나흐트무지크', composer: '볼프강 아마데우스 모차르트', composerLatin: 'W. A. Mozart' },
  { title: "현악 4중주 '죽음과 소녀'", composer: '프란츠 슈베르트', composerLatin: 'F. Schubert' },
  { title: "교향곡 '신세계로부터'", composer: '안토닌 드보르자크', composerLatin: 'A. Dvořák' },
  { title: '발라드 1번 G단조', composer: '프레데리크 쇼팽', composerLatin: 'F. Chopin' },
  { title: '수상 음악 모음곡', composer: '게오르크 프리드리히 헨델', composerLatin: 'G. F. Handel' },
  { title: '헝가리 무곡 5번', composer: '요하네스 브람스', composerLatin: 'J. Brahms' },
  { title: '교향시 「핀란디아」', composer: '장 시벨리우스', composerLatin: 'J. Sibelius' },
  { title: '피아노 협주곡 21번 K.467', composer: '볼프강 아마데우스 모차르트', composerLatin: 'W. A. Mozart' },
];

export interface CalendarDay {
  month: number;
  day: number;
  title: string;
  composer: string;
  composerLatin?: string;
  /** 실제 재생 가능한 트랙이 있을 때만 존재 — 없으면 잠긴 자리표시 날짜다. */
  trackId?: string;
  locked: boolean;
  isToday: boolean;
}

/** track.date("1월 1일" 형태)를 {month, day}로 파싱한다. 형식이 안 맞으면 null. */
function parseTrackDate(dateStr: string | undefined): { month: number; day: number } | null {
  const match = dateStr?.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (!match) return null;
  return { month: Number(match[1]), day: Number(match[2]) };
}

/** 1월 1일부터 12월 31일까지 365일 — 실제 트랙이 있으면 그 데이터를, 없으면 잠긴 자리표시를 채운다. */
export function buildCalendarYear(): CalendarDay[] {
  const trackByDate = new Map<string, Track>();
  for (const track of getTracks()) {
    const parsed = parseTrackDate(track.date);
    if (parsed) trackByDate.set(`${parsed.month}-${parsed.day}`, track);
  }

  const days: CalendarDay[] = [];
  let placeholderIndex = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day++) {
      const isToday = month === TODAY_MONTH && day === TODAY_DAY;
      const track = trackByDate.get(`${month}-${day}`);
      if (track) {
        days.push({
          month,
          day,
          title: track.title,
          composer: track.composer,
          composerLatin: track.composerEn,
          trackId: track.id,
          locked: false,
          isToday,
        });
      } else {
        const piece = PLACEHOLDER_PIECES[placeholderIndex % PLACEHOLDER_PIECES.length];
        placeholderIndex++;
        days.push({
          month,
          day,
          title: piece.title,
          composer: piece.composer,
          composerLatin: piece.composerLatin,
          locked: true,
          isToday,
        });
      }
    }
  }
  return days;
}
