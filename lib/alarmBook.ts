import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import type { ImageSourcePropType } from 'react-native';

import { BOOKSTORE_BOOKS, type BookstoreBook } from '@/lib/bookstore';
import {
  getAlarmImageTargets,
  previewAlarm,
  setAlarmBook,
  type AlarmCoverStyle,
  type AlarmPreviewBook,
} from '@/modules/alarm-clock';
import type { BookId } from '@/types';

/**
 * 서점에서 고른 책을 잠금화면 알람 쪽에 내려보낸다 — 책 이름과 이미지 두 장.
 *
 * 알람이 울릴 때는 JS가 안 돌고 있어서(앱 종료·재부팅 직후에도 울려야 한다) 그때 물어볼 수
 * 없다. 그래서 책을 고르는 시점에 미리 밀어 둔다. 227권으로 늘어나도 내려보낼 건 늘
 * '지금 고른 책' 한 벌뿐이라 이 구조는 그대로 간다.
 */
export async function syncAlarmBook(bookId: BookId): Promise<void> {
  const book = BOOKSTORE_BOOKS.find((candidate) => candidate.id === bookId);
  if (!book) return;

  await setAlarmBook(book.title, coverStyle(book));

  const targets = await getAlarmImageTargets();
  // 네이티브 모듈이 없는 환경(웹 등) — 알람 자체가 없으므로 조용히 건너뛴다.
  if (!targets) return;

  new Directory(targets.directory).create({ intermediates: true, idempotent: true });

  await Promise.all([
    placeImage(book.alarmBackground, targets.background),
    placeImage(book.alarmCover ?? book.coverImage, targets.cover),
  ]);
}

/**
 * 알람용 목업 표지가 없는 책은 서점 표지를 빌려 쓴다. 그건 비율도 다르고 납작해서
 * 알람 화면이 더 작은 자리에 놓는다 — 그래서 어느 쪽인지 함께 알려 준다.
 */
function coverStyle(book: BookstoreBook): AlarmCoverStyle {
  return book.alarmCover ? 'mockup' : 'flat';
}

/**
 * 설정의 '알람 테스트' — 아홉 권의 알람 화면을 실제 화면 그대로 넘겨 보게 띄운다.
 *
 * 미리보기 전용 폴더에 책마다 이미지를 깔고 경로를 넘긴다. 알람이 실제로 읽는 자리
 * (background/cover)는 건드리지 않는다 — 테스트가 진짜 알람 설정을 덮어쓰면 안 된다.
 */
export async function previewAlarmScreens(): Promise<void> {
  const targets = await getAlarmImageTargets();
  if (!targets) return;

  const directory = new Directory(targets.directory, 'preview');
  directory.create({ intermediates: true, idempotent: true });

  const books: AlarmPreviewBook[] = [];
  for (const book of BOOKSTORE_BOOKS) {
    const backgroundUri = new File(directory, `${book.id}-bg`).uri;
    const coverUri = new File(directory, `${book.id}-cover`).uri;

    await placeImage(book.alarmBackground, backgroundUri);
    await placeImage(book.alarmCover ?? book.coverImage, coverUri);

    books.push({ name: book.title, coverStyle: coverStyle(book), backgroundUri, coverUri });
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

  // require()로 번들된 이미지는 모듈 id(숫자)다. 이미지를 원격으로 옮기면
  // 여기서 URL 분기가 생긴다 — File.downloadFileAsync로 받아 같은 자리에 놓으면 된다.
  if (typeof source !== 'number') {
    if (destination.exists) destination.delete();
    return;
  }

  const [asset] = await Asset.loadAsync(source);
  if (!asset.localUri) return;

  const staging = new File(`${destinationUri}.tmp`);
  if (staging.exists) staging.delete();

  await new File(asset.localUri).copy(staging, { overwrite: true });
  await staging.move(destination, { overwrite: true });
}
