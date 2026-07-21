import { initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD-ojrteEbXT_shUpuWCr9E704SdaEyQ80",
  authDomain: "dayclassic-c5e64.firebaseapp.com",
  projectId: "dayclassic-c5e64",
  storageBucket: "dayclassic-c5e64.firebasestorage.app",
  messagingSenderId: "77116105084",
  appId: "1:77116105084:web:fe17e661d389473eb384f9",
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

/** "musics/foo.mp3" 같은 Storage 경로인지, 이미 완성된 http(s) URL인지 구분한다. */
export function isStoragePath(source: string): boolean {
  return !/^https?:\/\//i.test(source);
}

// 동일 경로를 매번 재생 버튼 누를 때마다 다시 조회하지 않도록 진행 중인 요청을 캐싱한다.
const downloadUrlCache = new Map<string, Promise<string>>();

/**
 * Storage 경로 → 다운로드 가능한 URL. 실패하면(파일 미업로드, 규칙 미설정 등)
 * 캐시에서 지워 다음 시도 때 다시 조회할 수 있게 한다.
 */
export function getStorageDownloadUrl(path: string): Promise<string> {
  const cached = downloadUrlCache.get(path);
  if (cached) return cached;

  const promise = getDownloadURL(ref(storage, path)).catch((error) => {
    downloadUrlCache.delete(path);
    throw error;
  });
  downloadUrlCache.set(path, promise);
  return promise;
}
