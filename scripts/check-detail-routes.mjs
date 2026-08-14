import { readFile } from "node:fs/promises";

const [libraryRoute, libraryList, bookstoreRoute] = await Promise.all([
  readFile("app/(tabs)/library/book/[id].tsx", "utf8"),
  readFile("app/(tabs)/library.tsx", "utf8"),
  readFile("app/(tabs)/book/[id].tsx", "utf8"),
]);

if (!libraryRoute.includes("LibraryBookDetailScreen")) {
  throw new Error("내 서재 상세 route가 전용 화면을 렌더링하지 않습니다.");
}

if (!/pathname:\s*["']\/library\/book\/\[id\]["']/.test(libraryList)) {
  throw new Error("내 서재 목록이 전용 상세 route로 이동하지 않습니다.");
}

if (bookstoreRoute.includes("LibraryBookDetailView")) {
  throw new Error("하루서점 상세 route에 내 서재 전용 화면이 남아 있습니다.");
}

console.log("detail routes are separated");
