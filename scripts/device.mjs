/**
 * `npm run device` — Metro는 이미 켜져 있는데 폰만 다시 꽂았거나 앱이 안 열릴 때 쓴다.
 * USB 터널을 다시 열고 앱을 띄운다.
 */
import { launchApp, setupReverse } from './dev.mjs';

if (setupReverse()) {
  launchApp();
}
