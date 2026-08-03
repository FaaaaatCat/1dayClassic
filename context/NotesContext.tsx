import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Note {
  id: string;
  text: string;
  /** "2026.07.01 (16:53)" 형태 */
  date: string;
}

/** 항목 id → 그 항목에 쓴 기록들. 항목마다 따로 보관해야 다른 날 기록이 섞이지 않는다. */
type NotesByLesson = Record<string, Note[]>;

interface NotesContextValue {
  /** 그 항목의 기록들 — 없으면 빈 배열. */
  notesOf: (lessonId: string) => Note[];
  /** 빈 문자열이면 아무것도 하지 않는다. 최신 기록이 맨 앞에 온다. */
  addNote: (lessonId: string, text: string) => void;
  deleteNote: (lessonId: string, noteId: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

/**
 * 데모용 시드 기록 — 피그마 시안과 동일. 피치카토 폴카에만 얹는다.
 * 내용이 그 곡을 두고 쓴 것이라 다른 항목에 붙으면 앞뒤가 맞지 않는다.
 */
const SEED_NOTES: NotesByLesson = {
  classic_1_polka: [
    {
      id: 'seed-1',
      text: '피치카토 주법을 찾아봐야겠어요. 그리고 다른 노래들도 있는지 알아봐야겠다.',
      date: '2026.07.01 (16:53)',
    },
    { id: 'seed-2', text: '처음 듣는데 진짜 좋다.', date: '2026.04.21 (12:13)' },
  ],
};

/** 감상 노트를 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'lesson-notes-v1';

function formatNoteDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${pad(date.getHours())}:${pad(date.getMinutes())})`;
}

/**
 * 감상 노트 보관소.
 *
 * 항목 전체를 담은 맵 하나로 저장한다 — 항목마다 키를 따로 두면 화면을 열 때마다 비동기
 * 조회가 필요해 기록이 한 박자 늦게 그려진다. 앱 시작 때 한 번 불러오면 이후로는 즉시 읽힌다.
 *
 * 저장된 값이 아예 없을 때만 시드를 얹는다. 저장된 값이 있으면 그대로 쓴다 —
 * 그래야 사용자가 시드 기록을 지운 뒤 재시작해도 되살아나지 않는다.
 */
export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notesByLesson, setNotesByLesson] = useState<NotesByLesson>(SEED_NOTES);
  /** 저장된 값을 불러오기 전까지는 시드를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setNotesByLesson(JSON.parse(raw) as NotesByLesson);
      } catch (error) {
        console.warn('[notes] 저장된 기록 불러오기 실패:', error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notesByLesson)).catch((error) => {
      console.warn('[notes] 기록 저장 실패:', error);
    });
  }, [notesByLesson, hydrated]);

  const addNote = useCallback((lessonId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: Note = { id: `note-${Date.now()}`, text: trimmed, date: formatNoteDate() };
    setNotesByLesson((prev) => ({ ...prev, [lessonId]: [note, ...(prev[lessonId] ?? [])] }));
  }, []);

  const deleteNote = useCallback((lessonId: string, noteId: string) => {
    setNotesByLesson((prev) => ({
      ...prev,
      [lessonId]: (prev[lessonId] ?? []).filter((note) => note.id !== noteId),
    }));
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({
      notesOf: (lessonId) => notesByLesson[lessonId] ?? [],
      addNote,
      deleteNote,
    }),
    [notesByLesson, addNote, deleteNote],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
