/**
 * `npm run dev` — 폰에서 앱을 보기까지 필요한 것을 한 번에 한다.
 *
 * 1) USB로 연결된 안드로이드 기기가 있는지 확인
 * 2) adb reverse 설정 — 폰이 USB를 통해 PC의 Metro(8081)를 보게 한다
 * 3) Metro 실행
 *
 * 폰이 안 꽂혀 있어도 Metro는 그냥 띄운다. 나중에 꽂고 `npm run device`만 다시 돌리면 된다.
 */
import { execFileSync, spawn } from 'node:child_process';

const PORT = 8081;

/** 연결된 기기 목록. adb가 없거나 실패하면 빈 배열. */
function connectedDevices() {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    return out
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.endsWith('\tdevice'))
      .map((line) => line.split('\t')[0]);
  } catch {
    return null; // adb 자체를 못 찾은 경우
  }
}

/** 폰이 PC의 Metro를 볼 수 있게 USB 터널을 연다. */
export function setupReverse() {
  const devices = connectedDevices();

  if (devices === null) {
    console.log('⚠  adb를 찾지 못했습니다. Android SDK platform-tools가 PATH에 있는지 확인해 주세요.');
    return false;
  }

  if (devices.length === 0) {
    console.log('⚠  연결된 폰이 없습니다.');
    console.log('   USB를 꽂고 폰에서 USB 디버깅을 허용한 뒤, 다른 터미널에서 `npm run device`를 실행하세요.');
    return false;
  }

  try {
    execFileSync('adb', ['reverse', `tcp:${PORT}`, `tcp:${PORT}`], { stdio: 'ignore' });
    console.log(`✓ 폰 연결됨 (${devices.join(', ')}) — 포트 ${PORT} 터널을 열었습니다.`);
    return true;
  } catch {
    console.log('⚠  adb reverse에 실패했습니다. 폰에서 USB 디버깅 허용 팝업을 확인해 주세요.');
    return false;
  }
}

/** 이 파일을 직접 실행했을 때만 Metro까지 띄운다(`npm run device`는 위 함수만 쓴다). */
if (process.argv[1] && process.argv[1].endsWith('dev.mjs')) {
  setupReverse();

  console.log(`\nMetro를 시작합니다 (포트 ${PORT})...`);
  console.log('폰에서 dev build 앱을 여세요. Expo Go로는 열리지 않습니다.\n');

  const metro = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['expo', 'start', '--localhost', '--port', String(PORT)],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' },
    },
  );

  metro.on('exit', (code) => process.exit(code ?? 0));
}
