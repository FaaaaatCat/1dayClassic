import taxonomy from '@/data/tag-taxonomy.json';

/**
 * 서점 태그 분류 — 서점 필터와 상세 페이지 칩이 함께 쓴다.
 *
 * 카탈로그의 tags는 시리즈명과 분야가 한 칸에 섞여 들어온다
 * (예: ["고전", "동양고전", "하루시리즈"]). 여기서 둘로 갈라 준다.
 *
 * ── 분류를 고칠 일이 생기면 data/tag-taxonomy.json만 손대면 된다. ──
 * `npm run check:tags`가 어느 쪽에도 안 걸린 태그와 분야가 빈 책을 알려 준다.
 *
 * 표의 네 칸이 하는 일:
 *
 * - series: 출판사 넷의 시리즈 목록. 키는 데이터에 실제로 들어 있는 태그
 *   문자열이고(붙여 쓴 '하루시리즈'), 값이 화면에 쓸 이름이다('하루 시리즈').
 * - titleRules: 태그가 아니라 제목 끝으로 판별하는 시리즈. 시리즈 태그가 붙지 않은
 *   책을 제목으로 보완한다. '법'은 앞의 '는'까지 포함해 '는 법'으로 본다 — 그래야
 *   '맞춤법'류가 안 걸리고 '고전을 고르는 법'은 걸린다.
 * - fieldGroups: 뜻이 같은데 표기만 다른 태그들을 묶은 분야 그룹.
 *   한 책이 여러 그룹에 걸릴 수 있다('고전'이면서 '철학·사상').
 * - ignored: 필터에 넣지 않는 태그. 판형·판차처럼 책을 고르는 데 도움이 안 되는
 *   말들이다. 지금 카탈로그에는 하나도 쓰이지 않았고, 나중에 그런 태그가 들어와도
 *   필터에 새 칩이 생기지 않게 미리 적어 둔 것이다.
 */
interface Taxonomy {
  series: Record<string, string>;
  titleRules: { suffix: string; series: string }[];
  fieldGroups: { name: string; tags: string[] }[];
  ignored: string[];
}

const { series, titleRules, fieldGroups } = taxonomy as Taxonomy;

/** 태그 → 그 태그가 속한 분야 그룹들. 한 태그가 두 그룹에 들어가도 된다. */
const TAG_TO_FIELDS = new Map<string, string[]>();
for (const group of fieldGroups) {
  for (const tag of group.tags) {
    TAG_TO_FIELDS.set(tag, [...(TAG_TO_FIELDS.get(tag) ?? []), group.name]);
  }
}

/**
 * 이 책이 속한 시리즈들(표시용 이름). 시리즈가 없는 책은 빈 배열.
 * 태그로 찾은 것과 제목 규칙으로 찾은 것을 합친다 — 둘 다 걸려도 한 번만 넣는다.
 */
export function seriesOf(tags: string[], title: string): string[] {
  const found = new Set<string>();
  for (const tag of tags) {
    if (tag in series) found.add(series[tag]);
  }
  const trimmed = title.trim();
  for (const rule of titleRules) {
    if (trimmed.endsWith(rule.suffix)) found.add(rule.series);
  }
  return [...found];
}

/** 이 책의 분야들(그룹 이름, 중복 제거). 어디에도 안 걸리면 빈 배열. */
export function fieldsOf(tags: string[]): string[] {
  const found = new Set<string>();
  for (const tag of tags) {
    for (const name of TAG_TO_FIELDS.get(tag) ?? []) found.add(name);
  }
  return [...found];
}

/**
 * 시리즈 필터의 선택지 — 태그로 오는 것과 제목 규칙으로만 존재하는 것('사전')을 합친다.
 * 화면에서는 권수 많은 순으로 정렬해 쓰므로 여기 순서는 뜻이 없다.
 */
export const SERIES_NAMES: string[] = [
  ...new Set([...Object.values(series), ...titleRules.map((rule) => rule.series)]),
];

/** 분야 필터의 선택지. */
export const FIELD_NAMES: string[] = fieldGroups.map((group) => group.name);
