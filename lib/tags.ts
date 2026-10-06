import taxonomy from '@/data/tag-taxonomy.json';

/**
 * 서점 태그 분류 — 서점 필터와 상세 페이지 칩이 함께 쓴다.
 *
 * 카탈로그의 tags를 분야 그룹으로 묶어 준다(예: ["고전", "동양고전"] → "고전").
 *
 * ── 분류를 고칠 일이 생기면 data/tag-taxonomy.json만 손대면 된다. ──
 * `npm run check:tags`가 어느 분야에도 안 걸린 태그와 분야가 빈 책을 알려 준다.
 *
 * 표의 두 칸이 하는 일:
 *
 * - fieldGroups: 뜻이 같은데 표기만 다른 태그들을 묶은 분야 그룹.
 *   한 책이 여러 그룹에 걸릴 수 있다('고전'이면서 '철학·사상').
 * - ignored: 필터에 넣지 않는 태그. 판형·판차처럼 책을 고르는 데 도움이 안 되는
 *   말들이다. 지금 카탈로그에는 하나도 쓰이지 않았고, 나중에 그런 태그가 들어와도
 *   필터에 새 칩이 생기지 않게 미리 적어 둔 것이다.
 */
interface Taxonomy {
  fieldGroups: { name: string; tags: string[] }[];
  ignored: string[];
}

const { fieldGroups } = taxonomy as Taxonomy;

/** 태그 → 그 태그가 속한 분야 그룹들. 한 태그가 두 그룹에 들어가도 된다. */
const TAG_TO_FIELDS = new Map<string, string[]>();
for (const group of fieldGroups) {
  for (const tag of group.tags) {
    TAG_TO_FIELDS.set(tag, [...(TAG_TO_FIELDS.get(tag) ?? []), group.name]);
  }
}

/** 이 책의 분야들(그룹 이름, 중복 제거). 어디에도 안 걸리면 빈 배열. */
export function fieldsOf(tags: string[]): string[] {
  const found = new Set<string>();
  for (const tag of tags) {
    for (const name of TAG_TO_FIELDS.get(tag) ?? []) found.add(name);
  }
  return [...found];
}

/** 분야 필터의 선택지. */
export const FIELD_NAMES: string[] = fieldGroups.map((group) => group.name);
