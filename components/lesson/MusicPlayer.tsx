import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PLAYER_H } from '@/lib/card-pages';
import { Colors, Fonts, tracking } from '@/constants/theme';

/*
 * 재생기의 크기는 카드 기하와 한 몸이라 lib/card-pages가 갖고 있다. 유튜브 약관이 정한
 * 최소 크기(200×200)이고, 카드가 그만큼 자리를 내준다.
 *
 * 닫기 버튼을 재생기 안이나 위에 두지 않는 것도 그 약관 때문이다 — 재생기를 가리는
 * 것이 되고, 줄을 하나 더 얹으면 카드가 그만큼 더 짧아진다. 닫기는 아래 버튼 줄에 있다.
 */

/**
 * 웹뷰는 네이티브 모듈이라 dev build를 다시 만들어야 붙는다. 아직 안 붙은 앱에서
 * 정적으로 불러오면 화면이 통째로 죽으므로, 필요한 순간에만 찾아보고 없으면 없는 대로
 * 둔다(expo-notifications에서 같은 방식으로 데인 적이 있다).
 */
function loadWebView(): React.ComponentType<Record<string, unknown>> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webview').WebView;
  } catch {
    return null;
  }
}

/**
 * 재생기 주소.
 *
 * 우리가 만든 HTML 안에 iframe을 넣지 않고 유튜브의 embed 쪽을 곧장 연다. 감싸는
 * 문서를 쓰면 웹뷰가 loadDataWithBaseURL로 띄우게 되는데, 그때 iframe이 갖는 출처가
 * 가짜라 재생기가 "이 동영상은 볼 수 없습니다(152)"로 막는다. 곧장 열면 출처가
 * 진짜 youtube.com이라 그 검사에 걸리지 않는다.
 *
 * playsinline이 없으면 안드로이드 웹뷰가 전체 화면 재생기로 넘겨 버려 글을 읽을 수 없다.
 */
function playerUrl(videoId: string): string {
  const params = new URLSearchParams({
    playsinline: '1',
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
    fs: '0',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * 웹뷰가 스스로를 밝히는 이름.
 *
 * 안드로이드 웹뷰의 기본값에는 'wv'가 들어 있어 유튜브가 앱 안 브라우저로 보고 다른
 * 길로 보낼 때가 있다. 평범한 모바일 크롬으로 말해 두면 embed 쪽이 그대로 열린다.
 */
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Mobile Safari/537.36';

/**
 * 카드 아래에 앉는 붙박이 재생기.
 *
 * 카드 '안'이 아니라 덱 위에 얹는다 — 카드 안에 두면 장을 넘길 때 함께 사라져 음악이
 * 끊긴다. 장을 넘겨도 이 뷰는 그대로 있으므로 소리가 이어진다.
 */
export default function MusicPlayer({ videoId }: { videoId: string }) {
  const WebView = useMemo(loadWebView, []);
  const url = useMemo(() => playerUrl(videoId), [videoId]);

  return (
    <View style={styles.player}>
      {WebView ? (
        <WebView
          source={{ uri: url }}
          style={styles.web}
          userAgent={USER_AGENT}
          // 화면 안에서 재생한다 — 전체 화면으로 넘어가면 글을 함께 볼 수 없다.
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          allowsFullscreenVideo={false}
          scrollEnabled={false}
          setBuiltInZoomControls={false}
        />
      ) : (
        // 웹뷰가 아직 안 붙은 앱(= dev build를 다시 만들기 전)에서 보이는 자리.
        <Text style={styles.absent}>{'앱을 다시 설치해야\n여기서 음악이 재생됩니다.'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    height: PLAYER_H,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  web: {
    flex: 1,
    backgroundColor: '#000000',
  },
  absent: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: tracking(13),
    textAlign: 'center',
    color: Colors.beige10,
  },
});
