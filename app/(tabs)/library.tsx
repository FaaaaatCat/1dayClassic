import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import MyPageRow, { MyPageGroup } from '@/components/mypage/MyPageRow';
import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useShelfBooks } from '@/components/mypage/useShelfBooks';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { findBgm } from '@/lib/bgm';

/**
 * 마이페이지.
 *
 * 예전의 '내 서재'를 대신한다 — 담아 둔 책과 설정이 한곳에 모인다. 서재를 따로 두지 않는 건,
 * 이 앱에서 책을 고르는 일과 앱을 손보는 일이 모두 '내 것'을 다루는 일이라서다.
 *
 * 경로는 /library 그대로다. 홈의 사람 버튼을 비롯해 여러 곳에 박혀 있어 이름만 바꾼다.
 *
 * '지금 읽고있는 책' 칸은 여기 없다. 지금 읽는 책으로 가는 길은 홈에서 바로 내기로 해서
 * 뗐다 — 홈이 이미 그 책 한 권을 화면 한가운데에 펼쳐 두고 있어, 마이페이지가 같은 것을
 * 한 번 더 말하면 어느 쪽이 그 책의 자리인지 흐려진다. 홈 쪽 길은 아직 만들지 않았다.
 */
export default function MyPageScreen() {
  const router = useRouter();
  const { bgmId } = useBgm();
  const { planned, finished } = useShelfBooks();

  return (
    <MyPageShell title="마이페이지" back="/">
      <MyPageGroup>
        <MyPageRow
          icon="layers-outline"
          label="읽을 예정인 책"
          value={`${planned.length}권`}
          onPress={() => router.push('/library/planned')}
        />
        <MyPageRow
          icon="sparkles-outline"
          label="완독한 책"
          value={`${finished.length}권`}
          onPress={() => router.push('/library/finished')}
        />
        <MyPageRow
          icon="musical-note-outline"
          label="배경음악 설정"
          value={findBgm(bgmId).label}
          onPress={() => router.push('/library/bgm')}
        />
        <MyPageRow
          icon="color-palette-outline"
          label="책 배경 설정"
          value="기본"
          onPress={() => router.push('/library/book-theme')}
          last
        />
      </MyPageGroup>

      {/* 프리미엄 안내 — 지금은 배너뿐이고 누를 곳이 없다. */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{'평생 광고 없이\n쾌적하게 독서하세요'}</Text>
        <ScaleButton accessibilityLabel="프리미엄 멤버십 보기" style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>프리미엄 멤버십 보기</Text>
        </ScaleButton>
      </View>

      <MyPageGroup>
        <MyPageRow label="권한 관리" onPress={() => router.push('/library/permissions')} />
        <MyPageRow label="계정 관리" onPress={() => router.push('/library/account')} last />
      </MyPageGroup>
    </MyPageShell>
  );
}

const styles = StyleSheet.create({
  /** 프리미엄 배너 — 이 화면에서 유일하게 색을 쓰는 자리다. */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    marginTop: Space[16],
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[20],
    backgroundColor: Spark.ember,
  },
  bannerText: {
    flex: 1,
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
  },
  bannerButton: {
    height: 40,
    paddingHorizontal: Space[16],
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  bannerButtonText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
});
