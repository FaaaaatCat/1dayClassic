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

/**
 * 붙어 있는 기기와 그 상태. adb를 못 찾으면 null.
 * 상태는 'device'(정상) 외에 'offline', 'unauthorized'가 있고 각각 처방이 다르다.
 */
function listDevices() {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    return out
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.includes('\t'))
      .map((line) => {
        const [serial, state] = line.split('\t');
        return { serial, state };
      });
  } catch {
    return null; // adb 자체를 못 찾은 경우
  }
}

/** adb 데몬을 껐다 켠다 — 'offline'은 대개 이걸로 풀린다. */
function restartAdb() {
  try {
    execFileSync('adb', ['kill-server'], { stdio: 'ignore' });
    execFileSync('adb', ['start-server'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** 폰이 PC의 Metro를 볼 수 있게 USB 터널을 연다. */
export function setupReverse() {
  let devices = listDevices();

  if (devices === null) {
    console.log('⚠  adb를 찾지 못했습니다. Android SDK platform-tools가 PATH에 있는지 확인해 주세요.');
    return false;
  }

  // 컴퓨터를 껐다 켜거나 케이블을 다시 꽂으면 기기가 'offline'으로 남는 일이 잦다.
  // 사람이 매번 adb kill-server를 치는 대신 여기서 한 번 되살려 본다.
  if (devices.length > 0 && devices.every((d) => d.state === 'offline')) {
    console.log('… 폰이 offline 상태라 adb를 재시작합니다.');
    restartAdb();
    devices = listDevices() ?? [];
  }

  const ready = devices.filter((d) => d.state === 'device');

  if (ready.length === 0) {
    const unauthorized = devices.some((d) => d.state === 'unauthorized');
    const offline = devices.some((d) => d.state === 'offline');

    if (unauthorized) {
      console.log('⚠  폰이 이 컴퓨터를 아직 승인하지 않았습니다.');
      console.log('   폰 화면의 "USB 디버깅을 허용하시겠습니까?" 팝업에서 허용을 눌러 주세요.');
    } else if (offline) {
      console.log('⚠  폰이 계속 offline 상태입니다.');
      console.log('   USB 케이블을 뽑았다 다시 꽂고 `npm run device`를 실행해 주세요.');
    } else {
      console.log('⚠  연결된 폰이 없습니다.');
      console.log('   USB를 꽂고 폰에서 USB 디버깅을 허용한 뒤 `npm run device`를 실행하세요.');
    }
    return false;
  }

  try {
    execFileSync('adb', ['reverse', `tcp:${PORT}`, `tcp:${PORT}`], { stdio: 'ignore' });
    console.log(`✓ 폰 연결됨 (${ready.map((d) => d.serial).join(', ')}) — 포트 ${PORT} 터널을 열었습니다.`);
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
