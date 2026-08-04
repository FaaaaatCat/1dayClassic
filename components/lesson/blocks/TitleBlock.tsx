import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';

interface Props {
  /** 책 이름 태그 — "하루 클래식 공부", "듣기의 말들" */
  label: string;
  /** 기본값 'column' */
  layout?: 'column' | 'row';
  title: string;
  subtitle?: string;
  /** 보조행. 여러 개면 ✦로 잇는다. 예: ["Pizzicato Polka", "Johann Strauss II"] */
  meta?: string[];
  /** row 배치에서만 쓰는 우측 장식 이미지 */
  decoration?: ImageSourcePropType;
}

/**
 * 책 라벨 + 표제. `column`(클래식·삼국지)과 `row`(듣기)는 같은 두 필드(title, subtitle)를
 * 다르게 배치할 뿐이다.
 *
 * `row` 배치의 정확한 수치는 Figma(node 2136:1460)에서 확인하지 못했다 — 조회 중 Figma MCP
 * 호출 한도(Starter 플랜)에 걸렸다. 지금 이 배치를 실제로 쓰는 책이 없어(클래식은 column만
 * 쓴다) 당장 화면에 영향은 없지만, 듣기 책을 이관할 때 Figma로 다시 확인해야 한다.
 *
 * paddingTop:40은 기존 today.tsx의 `content` 컨테이너가 표제부 앞에 두던 여백이다.
 * DefaultDetail은 이 블록 대신 기존 LessonHeading을 계속 쓰므로(8권 화면 불변 규칙),
 * 이 여백 값은 클래식에만 적용된다.
 */
export default function TitleBlock({ label, layout = 'column', title, subtitle, meta, decoration }: Props) {
  return (
    <View style={[blockStyles.block, styles.section]}>
      <View style={blockStyles.tag}>
        <Text style={blockStyles.tagText}>{label}</Text>
      </View>

      {layout === 'column' ? (
        <View style={styles.columnTitles}>
          <Text style={blockStyles.title}>{title}</Text>
          {subtitle && <Text style={blockStyles.subtitle}>{subtitle}</Text>}
        </View>
      ) : (
        <View style={styles.rowTitles}>
          <View style={styles.rowTextGroup}>
            <Text style={blockStyles.title}>{title}</Text>
            {subtitle && <Text style={blockStyles.subtitle}>{subtitle}</Text>}
          </View>
          {decoration && <Image source={decoration} style={styles.decoration} resizeMode="contain" />}
        </View>
      )}

      {meta && meta.length > 0 && (
        <View style={blockStyles.meta}>
          {meta.map((text, index) => (
            <View key={index} style={styles.metaItem}>
              {index > 0 && <Text style={blockStyles.metaStar}>✦</Text>}
              <Text style={blockStyles.metaText}>{text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 40,
    gap: 16,
  },
  columnTitles: {
    gap: 8,
  },
  rowTitles: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rowTextGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  decoration: {
    width: 64,
    height: 64,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
