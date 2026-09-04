import ScreenHeader from '@/components/ScreenHeader';

/**
 * 탭 네비게이터가 화면 위에 얹는 헤더.
 *
 * 하는 일은 공용 헤더(ScreenHeader)에 제목과 돌아갈 곳을 넘기는 것뿐이다. 이 껍데기가
 * 남아 있는 건 네비게이터가 요구하는 모양(`header: () => …`)이 컴포넌트 하나라서다.
 *
 * 홈으로 명시해 옮긴다. 여기를 거치는 화면들은 Tabs의 형제라 옮겨 와도 스택에 쌓이지
 * 않아서, back()은 그 앞에 남아 있던 것으로 튄다 — 지금은 그것이 우연히 홈일 뿐이다.
 */
export default function AppHeader({ title }: { title: string }) {
  return <ScreenHeader title={title} back="/" />;
}
