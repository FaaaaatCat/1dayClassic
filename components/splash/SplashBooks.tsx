import { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import SplashQuestion from '@/components/splash/SplashQuestion';
import TagChip from '@/components/TagChip';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { BOOKSTORE_BOOKS, isMvpBook } from '@/lib/bookstore';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { fieldsOf } from '@/lib/tags';

/** 골라 보여 줄 책의 수. 넘겨 볼 만하면서 고르기 부담 없는 정도다. */
const PICK_COUNT = 5;
/** 카드 사이 틈. */
const GAP = Space[12];
/** 카드가 화면 폭에서 차지하는 몫 — 나머지가 양옆으로 비쳐 더 있다는 걸 알린다. */
const CARD_RATIO = 0.57;
/** 카드에 붙는 분야 칩은 셋까지만. 그 아래로 줄이 늘면 카드 키가 들쭉날쭉해진다. */
const MAX_CHIPS = 3;

/** 추천으로 내보일 책들 — 학습 콘텐츠가 있는 책 중 앞의 다섯 권. */
const BOOKS = BOOKSTORE_BOOKS.filter((book) => isMvpBook(book.id)).slice(0, PICK_COUNT);

/**
 * 질문 2 — 처음 읽을 책 한 권.
 *
 * 시안의 책들은 자리표시라 앱에 실제로 있는 책을 쓴다. 고른 분야로 정말 걸러 내지는 않는다 —
 * 여기서 하는 일은 흐름을 보는 것뿐이고, 추천을 만드는 자리는 나중에 서버가 맡는다.
 *
 * 가로로 넘겨 고르고, 고른 카드에만 주황 테두리가 선다. 옆 카드를 누르면 가운데로 데려온다.
 */
export default function SplashBooks({
  fields,
  onNext,
  onBack,
}: {
  /** 앞 질문에서 고른 분야들 — 안내 문구에 그대로 되비친다. */
  fields: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<string | null>(null);
  const listRef = useRef<ScrollView>(null);

  const cardWidth = Math.round(width * CARD_RATIO);
  const stride = cardWidth + GAP;
  /** 첫 장과 끝 장도 가운데에 설 수 있게, 남는 폭의 절반씩을 양끝에 둔다. */
  const sidePad = Math.max(Space[20], (width - cardWidth) / 2);

  const choose = (index: number, id: string) => {
    setPicked(id);
    listRef.current?.scrollTo({ x: index * stride, animated: true });
  };

  return (
    <SplashQuestion
      step={2}
      title="처음 읽을 책 1권을 선택해주세요"
      hint={
        <>
          골라주신 <Text style={styles.hintPick}>{fields.join(', ')}</Text> 을 토대로{'\n'}
          제가 자신있게 골라봤어요.
        </>
      }
      canGoNext={picked !== null}
      onNext={onNext}
      onBack={onBack}
      scroll={false}
      padded={false}>
      <ScrollView
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={stride}
        decelerationRate="fast"
        contentContainerStyle={[styles.row, { paddingHorizontal: sidePad, gap: GAP }]}>
        {BOOKS.map((book, index) => (
          <BookChoice
            key={book.id}
            width={cardWidth}
            title={book.title}
            author={book.author}
            cover={book.coverImage}
            fields={fieldsOf(getCatalogBookByBookId(book.id)?.tags ?? []).slice(0, MAX_CHIPS)}
            selected={picked === book.id}
            onPress={() => choose(index, book.id)}
          />
        ))}
      </ScrollView>
    </SplashQuestion>
  );
}

/** 카드 한 장 — 표지, 제목, 지은이, 분야 칩. 고르면 주황 테두리가 선다. */
function BookChoice({
  width,
  title,
  author,
  cover,
  fields,
  selected,
  onPress,
}: {
  width: number;
  title: string;
  author: string;
  cover: string;
  fields: string[];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${author}`}
      style={[styles.card, { width }, selected && styles.cardOn]}
      onPress={onPress}>
      <View style={styles.coverBox}>
        <Image source={{ uri: cover }} style={styles.cover} resizeMode="contain" />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {author}
      </Text>
      <View style={styles.chips}>
        {fields.map((label) => (
          <TagChip key={label} label={label} variant="field" compact />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hintPick: {
    color: Spark.ember,
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
  /** 표지 자리 — 책마다 비율이 달라 자리를 고정하고 그 안에 맞춰 넣는다. */
  coverBox: {
    width: '100%',
    aspectRatio: 0.78,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space[8],
  },
  cover: {
    width: '100%',
    height: '100%',
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space[4],
    marginTop: Space[4],
  },
});
