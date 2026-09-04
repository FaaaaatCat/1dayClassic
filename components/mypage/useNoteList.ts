import { useMemo } from 'react';

import { useNotes, type Note } from '@/context/NotesContext';
import { getBookCalendar } from '@/lib/books';
import type { BookId } from '@/types';

/** 남긴 노트 하나 — 어느 항목에 적은 것인지까지 붙여 준다. */
export interface NoteEntry {
  /** 화면의 key로 쓴다 — 노트 id는 그 자체로 유일하다. */
  key: string;
  lessonId: string;
  /** 목차에 적힌 그 항목의 표제. 어느 날 적은 것인지 알려 준다. */
  lessonTitle: string;
  month: number;
  day: number;
  note: Note;
}

/**
 * 그 책에 남긴 노트들.
 *
 * NotesContext는 항목별로만 들고 있어서(항목 id → 노트들), 책 한 권치를 보려면 목차를
 * 훑으며 모아야 한다. 그 일을 여기서 한다 — 틀린 문제(useWrongQuizzes)·책갈피
 * (useBookmarkList)와 같은 자리다.
 *
 * 차례는 목차 순이고, 한 항목 안에서는 최근에 적은 것이 먼저다(NotesContext가 새 노트를
 * 맨 앞에 넣는다). 시간순으로 통째로 줄 세우지 않는 건, 노트가 '언제 적었나'보다 '어느
 * 글을 읽고 적었나'로 찾아지는 물건이기 때문이다.
 *
 * @param bookId 학습 콘텐츠가 없는 책은 undefined다 — 적을 자리가 없으므로 빈 목록을 준다.
 */
export function useNoteList(bookId?: BookId): NoteEntry[] {
  const { notesOf } = useNotes();

  return useMemo(() => {
    if (!bookId) return [];

    const entries: NoteEntry[] = [];
    for (const day of getBookCalendar(bookId)) {
      if (day.lessonId === undefined) continue;
      for (const note of notesOf(day.lessonId)) {
        entries.push({
          key: note.id,
          lessonId: day.lessonId,
          lessonTitle: day.title,
          month: day.month,
          day: day.day,
          note,
        });
      }
    }
    return entries;
  }, [bookId, notesOf]);
}
