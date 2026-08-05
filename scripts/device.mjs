/**
 * `npm run device` — Metro는 이미 켜져 있는데 폰만 다시 꽂았을 때 쓴다.
 * USB 터널만 다시 연다.
 */
import { setupReverse } from './dev.mjs';

const ok = setupReverse();
if (ok) {
  console.log('\n폰에서 dev build 앱을 열거나, 이미 열려 있으면 Reload 하세요.');
}
