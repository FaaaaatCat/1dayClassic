import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import BookCoverArt from '@/components/book/BookCoverArt';
import { COVER_RATIO } from '@/components/book/BookCover';
import SplashQuestion from '@/components/splash/SplashQuestion';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { BOOKSTORE_BOOKS, isReadableBook } from '@/lib/bookstore';
import type { BookId } from '@/types';

/** 골라 보여 줄 책의 수. 넘겨 볼 만하면서 고르기 부담 없는 정도다. */
const PICK_COUNT = 5;
/** 카드 사이 틈. */
const GAP = Space[12];
/** 카드가 화면 폭에서 차지하는 몫 — 나머지가 양옆으로 비쳐 더 있다는 걸 알린다. */
const CARD_RATIO = 0.57;
/**
 * 카드 높이 = 폭 × 이 값 — 시안의 205×280.
 *
 * 다섯 장의 키가 같아야 넘길 때 아래가 들썩이지 않는다. 내용에 맡기면 제목이 두 줄이 되거나
 * 칩이 하나 더 붙는 책에서 카드가 혼자 길어진다 — 그래서 키를 못 박고, 남고 모자라는 몫은
 * 표지 자리가 늘고 줄며 받아 낸다.
 */
const CARD_ASPECT = 280 / 205;

/** 추천으로 내보일 책들 — 학습 콘텐츠가 있는 책 중 앞의 다섯 권. */
const BOOKS = BOOKSTORE_BOOKS.filter((book) => isReadableBook(book.id)).slice(0, PICK_COUNT);

/**
 * 질문 2 — 처음 읽을 책 한 권.
 *
 * 원래는 앞에서 고른 분야로 걸러 다섯 권을 추천하는 자리다. 지금은 학습 콘텐츠가 있는 책이
 * 아홉 권뿐이라 걸러 낼 것이 없어, 분야와 상관없이 그중 앞의 다섯 권을 보여 준다 —
 * 거르는 일은 책이 늘고 추천을 만드는 서버가 생긴 뒤에 붙인다.
 *
 * 가로로 넘겨 고르고, 고른 카드에만 주황 테두리가 선다. 옆 카드를 누르면 가운데로 데려온다.
 */
export default function SplashBooks({
  fields,
  onNext,
  onBack,
}: {
  /** 앞 질문에서 고른 분야들 — 아직 거르는 데 쓰지 않는다(위 주석 참고). */
  fields: string[];
  /** 고른 책을 함께 올린다. 이 화면은 어디에도 저장하지 않는다. */
  onNext: (bookId: BookId) => void;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<BookId | null>(null);
  const listRef = useRef<ScrollView>(null);

  const cardWidth = Math.round(width * CARD_RATIO);
  const cardHeight = Math.round(cardWidth * CARD_ASPECT);
  const stride = cardWidth + GAP;
  /** 첫 장과 끝 장도 가운데에 설 수 있게, 남는 폭의 절반씩을 양끝에 둔다. */
  const sidePad = Math.max(Space[20], (width - cardWidth) / 2);

  const choose = (index: number, id: BookId) => {
    setPicked(id);
    listRef.current?.scrollTo({ x: index * stride, animated: true });
  };

  return (
    <SplashQuestion
      step={4}
      title="처음 읽을 책 1권을 선택해주세요"
      hint="고른 관심분야에서 가장 인기있는 책입니다."
      canGoNext={picked !== null}
      onNext={() => picked && onNext(picked)}
      onBack={onBack}
      scroll={false}
      padded={false}>
      {/* 카드는 물음 바로 아래에 붙인다 — 남는 높이 한가운데에 두면 키 큰 화면에서 아래로 처진다.
          남는 높이는 카드 아래가 갖는다(알람 질문과 같은 짜임). */}
      <View style={styles.top}>
      <ScrollView
        ref={listRef}
        horizontal
        style={styles.list}
        showsHorizontalScrollIndicator={false}
        snapToInterval={stride}
        decelerationRate="fast"
        contentContainerStyle={[styles.row, { paddingHorizontal: sidePad, gap: GAP }]}>
        {BOOKS.map((book, index) => (
          <BookChoice
            key={book.id}
            width={cardWidth}
            height={cardHeight}
            title={book.title}
            author={book.author}
            bookId={book.id}
            selected={picked === book.id}
            onPress={() => choose(index, book.id)}
          />
        ))}
      </ScrollView>
      </View>
    </SplashQuestion>
  );
}

/** 카드 한 장 — 표지, 제목, 지은이. 고르면 주황 테두리가 선다. */
function BookChoice({
  width,
  height,
  title,
  author,
  bookId,
  selected,
  onPress,
}: {
  width: number;
  /** 다섯 장이 모두 같은 값을 받는다 — 카드 키는 내용이 아니라 여기서 정해진다. */
  height: number;
  title: string;
  author: string;
  bookId: BookId;
  selected: boolean;
  onPress: () => void;
}) {
  /**
   * 표지가 앉을 자리의 크기 — 재고 나서 그린다.
   *
   * 카드 키는 다섯 장이 같은 값으로 고정이고, 표지 자리는 제목·칩이 쓰고 남은 몫이라
   * 미리 셈할 수 없다. 재어 본 상자 안에 표지 비율대로 들어가는 가장 큰 폭을 고른다.
   */
  const [box, setBox] = useState({ width: 0, height: 0 });
  const coverWidth = Math.floor(Math.min(box.width, box.height / COVER_RATIO));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${author}`}
      style={[styles.card, { width, height }, selected && styles.cardOn]}
      onPress={onPress}>
      <View
        style={styles.coverBox}
        onLayout={(event) => {
          const { width: w, height: h } = event.nativeEvent.layout;
          setBox({ width: w, height: h });
        }}>
        {coverWidth > 0 ? <BookCoverArt bookId={bookId} width={coverWidth} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {author}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flex: 1,
  },
  /** 가로 목록은 기본이 세로로 늘어나 남는 높이를 채운다 — 카드 키만큼만 차지하게 묶는다. */
  list: {
    flexGrow: 0,
  },
  row: {
    alignItems: 'center',
  },

  /**
   * 카드 — 바탕(taupe)에서 한 단 올라온 eggshell이다. 그림자 대신 색과 선으로 띄운다.
   *
   * 테두리를 고른 뒤에만 두껍게 하면 카드가 2px 커지므로, 평소에도 같은 굵기로 두고
   * 색만 바꾼다 — 골랐을 때 카드가 들썩이지 않는다.
   */
  card: {
    alignItems: 'center',
    gap: Space[8],
    padding: Space[20],
    borderRadius: Corner.card,
    borderWidth: 2,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  cardOn: {
    borderColor: Spark.ember,
  },
  /**
   * 표지 자리 — 카드에서 글자가 쓰고 남은 높이를 다 갖는다.
   *
   * 비율을 못 박지 않는 것은, 카드 키가 고정이라 남는 몫을 여기가 받아야 하기 때문이다.
   * 책마다 표지 비율이 다르지만 contain으로 넣으므로 잘리지 않고 이 안에 들어앉는다.
   */
  coverBox: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space[8],
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.primary,
  },
  author: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 18,
    color: Ink.muted,
  },
});
