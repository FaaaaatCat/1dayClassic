import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CARD_W, PLAYER_H } from '@/lib/card-pages';
import { Colors, Fonts, tracking } from '@/constants/theme';

/*
 * 재생기의 크기는 카드 기하와 한 몸이라 lib/card-pages가 갖고 있다. 유튜브 약관이 정한
 * 최소 크기(200×200)이고, 카드가 그만큼 자리를 내준다.
 *
 * 닫기 버튼을 재생기 안이나 위에 두지 않는 것도 그 약관 때문이다 — 재생기를 가리는
 * 것이 되고, 줄을 하나 더 얹으면 카드가 그만큼 더 짧아진다. 닫기는 아래 버튼 줄에 있다.
 */

/**
 * 유튜브 재생기.
 *
 * 손으로 iframe을 띄웠다가 두 번 막혔다. 유튜브는 '누가 이 재생기를 품고 있는지'를
 * Referer로 확인하는데, 웹뷰에서는 그 값이 정상적으로 만들어지지 않는다.
 * - 감싸는 HTML의 baseUrl을 youtube.com으로 주면 자기 자신을 품은 꼴이라 152로 막힌다.
 * - embed 주소를 곧장 열면 최상위 이동이라 Referer가 아예 없어 153으로 막힌다.
 *
 * react-native-youtube-iframe이 이 문제를 넘기려고 만들어진 라이브러리다. 유튜브가 아닌
 * 진짜 https 페이지를 baseUrl로 두고 IFrame Player API로 재생기를 세운다. 네이티브
 * 코드가 없는 순수 자바스크립트라(웹뷰만 있으면 된다) 다시 빌드하지 않아도 붙는다.
 */
function loadPlayer(): React.ComponentType<Record<string, unknown>> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-youtube-iframe').default;
  } catch {
    // 웹뷰가 아직 안 붙은 앱(= dev build를 다시 만들기 전).
    return null;
  }
}

/**
 * 카드 아래에 앉는 붙박이 재생기.
 *
 * 카드 '안'이 아니라 덱 위에 얹는다 — 카드 안에 두면 장을 넘길 때 함께 사라져 음악이
 * 끊긴다. 장을 넘겨도 이 뷰는 그대로 있으므로 소리가 이어진다.
 */
export default function MusicPlayer({
  videoId,
  paused,
}: {
  videoId: string;
  /** 밖에서 세워야 할 때(낭독을 켠 동안). 소리가 둘이 되면 아무것도 안 들린다. */
  paused: boolean;
}) {
  const YoutubePlayer = useMemo(loadPlayer, []);

  /**
   * 지금 재생 중인지.
   *
   * 이 값을 우리가 들고 있어야 밖에서 세울 수 있다. 재생기 제 버튼으로 시작한 것도
   * onChangeState로 받아 적어 둔다 — 그래야 낭독을 켰을 때 값이 바뀌며 멈춘다.
   */
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (paused) setPlaying(false);
  }, [paused]);

  if (!YoutubePlayer) {
    return (
      <View style={styles.player}>
        <Text style={styles.absent}>{'앱을 다시 설치해야\n여기서 음악이 재생됩니다.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.player}>
      <YoutubePlayer
        videoId={videoId}
        height={PLAYER_H}
        width={CARD_W}
        // 들어오자마자 소리를 내지 않는다 — 재생기는 늘 여기 있고, 들을지는 사람이 정한다.
        play={playing && !paused}
        onChangeState={(state: string) => {
          if (state === 'playing') setPlaying(true);
          else if (state === 'paused' || state === 'ended') setPlaying(false);
        }}
        initialPlayerParams={{
          // 화면 안에서 재생한다. 전체 화면으로 넘어가면 글을 함께 볼 수 없다.
          preventFullScreen: true,
          modestbranding: true,
          rel: false,
        }}
        webViewStyle={styles.web}
      />
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
    backgroundColor: '#000000',
    opacity: 0.99, // 안드로이드에서 웹뷰가 부모의 borderRadius를 따르게 하는 오래된 처방
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
