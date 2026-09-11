import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import type { ImageSourcePropType } from 'react-native';

import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import { getCoverDesign } from '@/lib/coverDesign';
import {
  getAlarmImageTargets,
  previewAlarm,
  setAlarmBook,
  type AlarmCoverInput,
  type AlarmPreviewBook,
} from '@/modules/alarm-clock';
import type { BookId } from '@/types';

/**
 * 서점에서 고른 책을 잠금화면 알람 쪽에 내려보낸다 — 책 이름, 표지 값, 배경 사진 한 장.
 *
 * 알람이 울릴 때는 JS가 안 돌고 있어서(앱 종료·재부팅 직후에도 울려야 한다) 그때 물어볼 수
 * 없다. 그래서 책을 고르는 시점에 미리 밀어 둔다. 책이 백 권을 넘어도 내려보낼 건 늘
 * '지금 고른 책' 한 벌뿐이라 이 구조는 그대로 간다.
 *
 * 표지는 그림이 아니라 값으로 간다. 예전에는 알람용 목업 표지를 파일로 깔아 두었는데,
 * 표지를 코드로 그리게 되면서 깔아 둘 그림이 없어졌다. 알람은 같은 값으로 제 화면에
 * 직접 그린다(AlarmCoverView).
 */
export async function syncAlarmBook(bookId: BookId): Promise<void> {
  const book = BOOKSTORE_BOOKS.find((candidate) => candidate.id === bookId);
  if (!book) return;

  await setAlarmBook(book.title, coverInput(bookId), book.backgroundCredit ?? '');

  const targets = await getAlarmImageTargets();
  // 네이티브 모듈이 없는 환경(웹 등) — 알람 자체가 없으므로 조용히 건너뛴다.
  if (!targets) return;

  new Directory(targets.directory).create({ intermediates: true, idempotent: true });
  await placeImage(book.alarmBackground, targets.background);
}

/**
 * 표지 값 한 벌 — 알람이 그리는 데 필요한 것만 추린다.
 *
 * 짜임(layout)과 정렬(align)은 보내지 않는다. 알람은 여섯 짜임을 다 그리지 않고 하나로
 * 그리기 때문이다(AlarmCoverView의 주석 참고). 보내 봐야 쓰이지 않는 값이 오가면 어느 쪽이
 * 진짜인지 헷갈린다.
 */
function coverInput(bookId: BookId): AlarmCoverInput {
  const design = getCoverDesign(bookId);
  return {
    paper: design.paper,
    ink: design.ink,
    title: design.title,
    author: design.author,
    imprint: design.imprint,
    mark: design.mark,
    dark: design.dark ?? false,
    pattern: design.pattern,
  };
}

/**
 * 설정의 '알람 테스트' — 열 권의 알람 화면을 실제 화면 그대로 넘겨 보게 띄운다.
 *
 * 미리보기 전용 폴더에 책마다 배경을 깔고 경로를 넘긴다. 알람이 실제로 읽는 자리
 * (background)는 건드리지 않는다 — 테스트가 진짜 알람 설정을 덮어쓰면 안 된다.
 */
export async function previewAlarmScreens(): Promise<void> {
  const targets = await getAlarmImageTargets();
  if (!targets) return;

  const directory = new Directory(targets.directory, 'preview');
  directory.create({ intermediates: true, idempotent: true });

  const books: AlarmPreviewBook[] = [];
  for (const book of BOOKSTORE_BOOKS) {
    const backgroundUri = new File(directory, `${book.id}-bg`).uri;
    await placeImage(book.alarmBackground, backgroundUri);
    books.push({
      name: book.title,
      cover: coverInput(book.id),
      backgroundUri,
      credit: book.backgroundCredit ?? '',
    });
  }

  await previewAlarm(books);
}

/**
 * 번들 이미지 하나를 알람이 읽는 자리에 놓는다. 소스가 없으면 앞 책이 남긴 파일을 지운다 —
 * 안 지우면 배경 없는 책을 골랐을 때 이전 책 사진이 계속 뜬다.
 *
 * 복사는 임시 파일에 하고 마지막에 이름만 바꾼다. 같은 파일시스템 안에서의 rename은 원자적이라,
 * 복사 도중에 알람이 울려도 반쯤 쓰인 이미지를 읽는 일이 없다.
 */
async function placeImage(
  source: ImageSourcePropType | undefined,
  destinationUri: string,
): Promise<void> {
  const destination = new File(destinationUri);
  const staging = new File(`${destinationUri}.tmp`);

  // require()로 번들된 이미지는 모듈 id(숫자)다. 알람 배경이 그렇다.
  if (typeof source !== 'number') {
    if (destination.exists) destination.delete();
    return;
  }

  const [asset] = await Asset.loadAsync(source);
  if (!asset.localUri) return;

  if (staging.exists) staging.delete();
  await new File(asset.localUri).copy(staging, { overwrite: true });
  // 옮기는 동안 반쪽짜리 파일이 보이지 않게 한다.
  await staging.move(destination, { overwrite: true });
}
