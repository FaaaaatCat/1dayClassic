import ClassicDetail from '@/components/lesson/books/ClassicDetail';
import DefaultDetail from '@/components/lesson/books/DefaultDetail';
import type { BookLesson } from '@/lib/books';

/**
 * 책 → 상세 화면 조합.
 *
 * 객체 표(Record<BookId, ComponentType>) 대신 switch를 쓰는 이유는 책마다 lesson 타입이 달라서다 —
 * 하나의 ComponentType으로 묶으면 prop 타입이 뭉개져 타입 안전성이 사라진다. switch는 분기 안에서
 * lesson이 그 책 타입으로 좁혀진다. lib/books.ts가 같은 이유로 같은 선택을 했다.
 */
export function renderBookDetail(bookLesson: BookLesson) {
  switch (bookLesson.book) {
    case 'classic':
      return <ClassicDetail lesson={bookLesson.lesson} />;
    default:
      return <DefaultDetail bookLesson={bookLesson} />;
  }
}
