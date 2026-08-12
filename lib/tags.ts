import taxonomy from '@/data/tag-taxonomy.json';

/**
 * 유유출판사 태그 분류 — 서점 필터와 상세 페이지 칩이 함께 쓴다.
 *
 * 출판사 쪽 '분야/시리즈' 필드는 시리즈명과 분야가 한 칸에 섞여 들어온다
 * (예: ["땅콩문고시리즈", "인문", "글쓰기", "한국어"]). 여기서 둘로 갈라 준다.
 *
 * ── 분류를 고칠 일이 생기면 data/tag-taxonomy.json만 손대면 된다. ──
 * `npm run check:tags`가 어느 쪽에도 안 걸린 태그와 분야가 빈 책을 알려 준다.
 *
 * 표의 세 칸이 하는 일:
 *
 * - series: 출판사 홈페이지의 시리즈 목록. 키는 데이터에 실제로 들어 있는 태그
 *   문자열이고(데이터 쪽은 '땅콩문고시리즈'처럼 표기가 제각각이다) 값이 화면에 쓸 이름이다.
 * - titleRules: 태그가 아니라 제목 끝으로 판별하는 시리즈. 출판사가 시리즈 태그를
 *   빠뜨린 책이 많아서('공자의 말들'에 문장시리즈 태그가 없다) 제목으로 보완한다.
 *   '법'은 앞의 공백까지 포함해 ' 법'으로 본다 — 그래야 '끝내주는 맞춤법'이 안 걸린다.
 * - fieldGroups: 뜻이 같은데 표기만 다른 태그들을 묶은 분야 그룹.
 *   한 책이 여러 그룹에 걸릴 수 있다('고전'이면서 '철학·사상').
 * - ignored: 필터에 넣지 않는 태그. '인문'은 277권 중 193권(70%)에 붙어 있어
 *   걸러 봐야 거의 전체가 남아 필터로 쓸모가 없다.
 *   '서미석'은 역자 이름이 태그에 잘못 들어간 것으로 보인다.
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
