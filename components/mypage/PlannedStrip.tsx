import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { MY_PAGE } from '@/components/mypage/MyPageShell';
import type { ShelfBook } from '@/components/mypage/useShelfBooks';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface } from '@/constants/theme';
import type { CatalogBook } from '@/lib/catalog';

/**
 * 읽을 예정인 책 — 마이페이지의 그 줄 아래 붙는 표지 띠.
 *
 * 담아 둔 책을 동그란 표지로 늘어놓는다. 목록(ShelfList)은 '어디까지 읽었나'를 견주는
 * 자리라 줄로 세우지만, 여기는 '무엇을 담아 뒀나'를 한눈에 보는 자리라 표지만 남긴다.
 *
 * 맨 앞은 더 담으러 가는 문이다 — 담은 책이 없을 때도 이 자리는 남아서, 빈 목록이
 * 막다른 길이 되지 않는다.
 *
 * 담은 책이 많으면 옆으로 밀어 본다. 넉넉한 화면에서 다섯 권까지는 밀지 않아도 다 보인다.
 */
export default function PlannedStrip({
  books,
  onAdd,
  onPressBook,
}: {
  books: ShelfBook[];
  /** 맨 앞 + 버튼 — 하루 서점으로 간다. */
  onAdd: () => void;
  onPressBook: (book: CatalogBook) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      <ScaleButton accessibilityLabel="하루 서점에서 책 담기" style={styles.add} onPress={onAdd}>
        <Ionicons name="add" color={Ink.muted} size={24} />
      </ScaleButton>

      {books.map((entry) => (
        <ScaleButton
          key={entry.book.id}
          accessibilityLabel={`${entry.book.title} 리포트`}
          style={styles.circle}
          onPress={() => onPressBook(entry.book)}>
          {/*
            표지를 원 안에 가둔다.
            바깥은 검은 실선 한 겹, 안쪽은 종이색 두 겹 — 표지가 어떤 색이든 원의 윤곽이
            끊기지 않게 하는 테두리다(피그마의 1px ink + 2px eggshell).
          */}
          <View style={styles.ring}>
            <Image
              source={{ uri: entry.book.coverImage }}
              style={styles.art}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        </ScaleButton>
      ))}
    </ScrollView>
  );
}

/** 동그라미 지름. */
const AVATAR = 52;

/**
 * 원 안에 넣는 표지 그림의 크기 — 원보다 한참 크다.
 *
 * 표지 그림은 알파 PNG라 책 둘레에 투명한 여백이 있고, 비스듬히 세운 표지일수록 그 여백이
 * 넓다. 원 크기에 딱 맞추면 정작 책은 원 한가운데에 작게 앉는다. 그래서 여백까지 셈에
 * 넣어 세로로 두 배 가까이 키우고, 넘치는 만큼은 원이 잘라 낸다.
 *
 * 가로는 표지 비율(108:160)을 따른다.
 */
const ART_H = 104;
const ART_W = Math.round((ART_H * 108) / 160);

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[8],
  },
  /** 더 담기 — 채우지 않고 선만 두른 원. 표지들 옆에서 비어 있는 자리로 읽힌다. */
  add: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
  },
  circle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Ink.primary,
  },
  /** 표지를 가두는 원 — 종이색 테를 한 겹 두르고 넘치는 그림을 잘라 낸다. */
  ring: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Corner.pill,
    borderWidth: 2,
    borderColor: Surface.canvas,
    overflow: 'hidden',
  },
  art: {
    width: ART_W,
    height: ART_H,
  },
});
