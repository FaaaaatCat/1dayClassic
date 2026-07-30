import { StyleSheet, Text, View } from 'react-native';

import { headingStyles } from '@/components/lesson/headingStyles';
import { Colors, Fonts, tracking } from '@/constants/theme';
import type { BookLesson } from '@/lib/books';
import type {
  EnglishLesson,
  HanjaLesson,
  HanmunLesson,
  LatinLesson,
  LiberalLesson,
  PsychologyLesson,
  QuoteLesson,
  Track,
  WritingLesson,
} from '@/types';

interface Props {
  bookLesson: BookLesson;
  /** 표제부 맨 위 태그에 넣을 책 이름 — 클래식은 항목이 tag를 따로 가질 수 있다. */
  bookName: string;
}

/**
 * 항목 상세의 표제부 — 책에 따라 갈라지는 단 하나의 자리.
 *
 * 히어로·본문·감상 노트·재생바는 9권이 똑같이 쓰고, 표제를 어떻게 짜는지만 책마다 다르다.
 * 판별자(book)로 갈라지므로 각 분기에서 lesson 타입이 좁혀져 캐스팅이 없다.
 */
export default function LessonHeading({ bookLesson, bookName }: Props) {
  switch (bookLesson.book) {
    case 'classic':
      return <ClassicHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'latin':
      return <LatinHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'quote':
      return <QuoteHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'hanja':
      return <HanjaHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'liberal':
      return <LiberalHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'psychology':
      return <PsychologyHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'writing':
      return <WritingHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'hanmun':
      return <HanmunHeading lesson={bookLesson.lesson} bookName={bookName} />;
    case 'english':
      return <EnglishHeading lesson={bookLesson.lesson} bookName={bookName} />;
  }
}

/** 책 이름 태그 — 9권 공통으로 표제부 맨 위에 놓인다. */
function Tag({ label }: { label: string }) {
  return (
    <View style={headingStyles.tag}>
      <Text style={headingStyles.tagText}>{label}</Text>
    </View>
  );
}

/** 하루 클래식 공부 — 곡명과 작곡가, 있으면 영문 표기행. */
function ClassicHeading({ lesson, bookName }: { lesson: Track; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={lesson.tag ?? bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.title}</Text>
        <Text style={headingStyles.subtitle}>{lesson.composer}</Text>
      </View>
      {lesson.titleEn && (
        <View style={headingStyles.meta}>
          <Text style={headingStyles.metaText}>{lesson.titleEn}</Text>
          <Text style={headingStyles.metaStar}>✦</Text>
          <Text style={headingStyles.metaText}>{lesson.composerEn}</Text>
        </View>
      )}
    </View>
  );
}

/** 하루 라틴어 공부 — 원문이 주인공, 아래에 우리말 뜻, 보조행에 한글 발음. */
function LatinHeading({ lesson, bookName }: { lesson: LatinLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.latin}</Text>
        <Text style={headingStyles.subtitle}>{lesson.meaning}</Text>
      </View>
      <View style={headingStyles.meta}>
        <Text style={headingStyles.metaText}>{lesson.pronunciation}</Text>
      </View>
    </View>
  );
}

/**
 * 하루 명언 공부 — 지면 순서대로 우리말 뜻이 가장 크게 오고, 한자 원문과 독음이 아래에 붙는다.
 * (목차 행은 한 줄뿐이라 원문을 앞세우지만, 여기서는 지면을 따른다.)
 */
function QuoteHeading({ lesson, bookName }: { lesson: QuoteLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.meaning}</Text>
        <Text style={headingStyles.subtitle}>
          {lesson.quote} · {lesson.reading}
        </Text>
      </View>
      {lesson.source && <Text style={headingStyles.source}>{lesson.source}</Text>}
    </View>
  );
}

/** 하루 한문 공부 — 원문(해설 번호 마커 포함), 토를 붙인 독음, 우리말 번역, 출처. */
function HanmunHeading({ lesson, bookName }: { lesson: HanmunLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.hanmun}</Text>
        <Text style={headingStyles.subtitle}>{lesson.reading}</Text>
      </View>
      <Text style={headingStyles.blockText}>{lesson.meaning}</Text>
      {lesson.source && <Text style={headingStyles.source}>{lesson.source}</Text>}
    </View>
  );
}

/**
 * 하루 한자 공부 — 지면의 "( 새로울-신 ) 新" 짜임을 그대로 옮긴다.
 * 하루에 두 자를 다루는 날이 있어 글자마다 한 줄씩 놓는다.
 */
function HanjaHeading({ lesson, bookName }: { lesson: HanjaLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={hanjaStyles.list}>
        {lesson.characters.map((character) => (
          <View key={character.hanja} style={hanjaStyles.row}>
            <Text style={hanjaStyles.gloss}>
              ( {character.meaning}-{character.sound} )
            </Text>
            <Text style={hanjaStyles.character}>{character.hanja}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 하루 교양 공부 — 글 제목과, 글이 기대고 있는 참고 도서. */
function LiberalHeading({ lesson, bookName }: { lesson: LiberalLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.title}</Text>
      </View>
      {lesson.source && <Text style={headingStyles.source}>{lesson.source}</Text>}
    </View>
  );
}

/** 하루 심리 공부 — 글 제목만. 부제로 쓸 필드가 없다. */
function PsychologyHeading({ lesson, bookName }: { lesson: PsychologyLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.title}</Text>
      </View>
    </View>
  );
}

/** 하루 쓰기 공부 — 글 제목 아래 인용문(에피그래프)과 말한 사람. */
function WritingHeading({ lesson, bookName }: { lesson: WritingLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.title}</Text>
      </View>
      <View style={headingStyles.block}>
        <Text style={headingStyles.blockText}>{lesson.epigraph}</Text>
        <Text style={headingStyles.blockSubText}>{lesson.epigraphBy}</Text>
      </View>
    </View>
  );
}

/** 하루 영어 교양 — 표현과 뜻, 그 아래 쓰임을 보여 주는 예문 한 쌍. */
function EnglishHeading({ lesson, bookName }: { lesson: EnglishLesson; bookName: string }) {
  return (
    <View style={headingStyles.section}>
      <Tag label={bookName} />
      <View style={headingStyles.titles}>
        <Text style={headingStyles.title}>{lesson.english}</Text>
        <Text style={headingStyles.subtitle}>{lesson.meaning}</Text>
      </View>
      <View style={headingStyles.block}>
        <Text style={headingStyles.blockText}>{lesson.example}</Text>
        <Text style={headingStyles.blockSubText}>{lesson.exampleMeaning}</Text>
      </View>
    </View>
  );
}

const hanjaStyles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gloss: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown50,
  },
  character: {
    fontFamily: Fonts.semiBold,
    fontSize: 40,
    letterSpacing: tracking(40),
    color: Colors.brown100,
  },
});
