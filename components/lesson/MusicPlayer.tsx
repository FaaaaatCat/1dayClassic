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
 * 재생기 안에 띄우는 문서.
 *
 * playsinline이 없으면 안드로이드 웹뷰가 전체 화면 재생기로 넘겨 버려 글을 읽을 수 없다.
 * baseUrl을 유튜브로 주는 건 iframe이 제대로 된 출처를 갖게 하려는 것이다 — about:blank
 * 위에서는 재생기가 오류를 낸다.
 */
function playerHtml(videoId: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}
  iframe{border:0;width:100%;height:100%;display:block}
</style></head><body>
<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&rel=0&modestbranding=1"
  allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
</body></html>`;
}

/**
 * 카드 아래에 앉는 붙박이 재생기.
 *
 * 카드 '안'이 아니라 덱 위에 얹는다 — 카드 안에 두면 장을 넘길 때 함께 사라져 음악이
 * 끊긴다. 장을 넘겨도 이 뷰는 그대로 있으므로 소리가 이어진다.
 */
export default function MusicPlayer({ videoId }: { videoId: string }) {
  const WebView = useMemo(loadWebView, []);
  const html = useMemo(() => playerHtml(videoId), [videoId]);

  return (
    <View style={styles.player}>
      {WebView ? (
        <WebView
          source={{ html, baseUrl: 'https://www.youtube.com' }}
          style={styles.web}
          // 화면 안에서 재생한다 — 전체 화면으로 넘어가면 글을 함께 볼 수 없다.
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
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
