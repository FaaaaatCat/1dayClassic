import { readFile } from "node:fs/promises";

/**
 * 내 서재 상세와 하루 서점 상세가 섞이지 않았는지 확인한다.
 *
 * 목록이 어느 route로 가는지 보는 파일이 예전에는 마이페이지(library.tsx) 하나였다.
 * 지금은 '지금 읽고있는 책' 칸이 마이페이지에서 빠지면서, 그 route로 가는 목록이
 * 읽을 예정인 책·완독한 책 둘로 옮겨졌다.
 */
const SHELF_LISTS = [
  "app/(tabs)/library/planned.tsx",
  "app/(tabs)/library/finished.tsx",
];

const [libraryRoute, bookstoreRoute, ...shelfLists] = await Promise.all([
  readFile("app/(tabs)/library/book/[id].tsx", "utf8"),
  readFile("app/(tabs)/book/[id].tsx", "utf8"),
  ...SHELF_LISTS.map((path) => readFile(path, "utf8")),
]);

if (!libraryRoute.includes("LibraryBookDetailScreen")) {
  throw new Error("내 서재 상세 route가 전용 화면을 렌더링하지 않습니다.");
}

const DETAIL_PATHNAME = /pathname:\s*["']\/library\/book\/\[id\]["']/;
shelfLists.forEach((source, index) => {
  if (!DETAIL_PATHNAME.test(source)) {
    throw new Error(`${SHELF_LISTS[index]}가 전용 상세 route로 이동하지 않습니다.`);
  }
});

if (bookstoreRoute.includes("LibraryBookDetailView")) {
  throw new Error("하루서점 상세 route에 내 서재 전용 화면이 남아 있습니다.");
}

console.log("detail routes are separated");
