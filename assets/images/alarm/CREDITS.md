# 알람 배경 사진

잠금화면 알람의 배경입니다. 전부 [Unsplash](https://unsplash.com)에서 받았습니다.

[Unsplash 라이선스](https://unsplash.com/license)는 상업적 이용을 포함해 무료로 쓸 수 있고
허락을 따로 받지 않아도 됩니다. 표기 의무도 없지만, 알람 화면 맨 아래(다시 알림 버튼 밑)에
"사진 ○○○ · Unsplash"로 적습니다 — 남의 사진을 쓰면서 이름을 지우는 것은 다른 문제이고,
이 앱은 출판사에 보여 줄 물건이라 출처가 화면에 있어야 합니다.

사진은 1080×1120으로 자릅니다. 알람 화면에서 사진이 덮는 자리가 화면 위쪽 절반이라,
세로로 길게 두면 가운데 띠만 보입니다(activity_alarm.xml의 weight 1:1).

밝은 사진은 받을 때 노출을 내렸습니다. 화면에는 40% 어둠이 한 겹 덮이는데 그것만으로는
시계 글자가 사진의 밝은 부분을 이기지 못했습니다. 화면 쪽 덮개를 더 짙게 하면 어두운
사진까지 뭉개지므로, 원판을 맞추는 쪽을 택했습니다.

| 책 | 파일 | 찍은 사람 | 사진 | 손본 것 |
|---|---|---|---|---|
| 명심보감 | `bg-quote.jpg` | Yifeng Lu | [pMSIUfvI_18](https://unsplash.com/photos/pMSIUfvI_18) | 노출 -42 |
| 천자문 | `bg-hanja.jpg` | Sixian Li | [QZne0IwB1R0](https://unsplash.com/photos/QZne0IwB1R0) | 노출 -32 |
| 논어 | `bg-hanmun.jpg` | Paul Pastourmatzis | [KT3WlrL_bsg](https://unsplash.com/photos/KT3WlrL_bsg) | 노출 -8 |
| 채근담 | `bg-listening.jpg` | Max van den Oetelaar | [1e60bqR1Ar0](https://unsplash.com/photos/1e60bqR1Ar0) | 원본 그대로 |
| 명상록 | `bg-psychology.jpg` | Jameson Berrios | [ov8B1TrWb0g](https://unsplash.com/photos/ov8B1TrWb0g) | 노출 -38 |
| 라틴어 | `bg-latin.jpg` | Miguel Alcântara | [Oykfrq3WLcU](https://unsplash.com/photos/Oykfrq3WLcU) | 노출 -32 |
| 영어 속담 | `bg-english.jpg` | Marek Szturc | [4CDdd1RCt6w](https://unsplash.com/photos/4CDdd1RCt6w) | 노출 -6 |
| 글쓰기 | `bg-writing.jpg` | Miguel Alcântara | [ZgT86iu3CAw](https://unsplash.com/photos/ZgT86iu3CAw) | 노출 -18 |
| 클래식 | `bg-classic.jpg` | Geert Pieters | [8QrPJ3Kfie4](https://unsplash.com/photos/8QrPJ3Kfie4) | 노출 -42 |

교체하려면 `scripts`가 아니라 사람이 고릅니다 — 어두운 사진이어야 하고, 시계(80sp)가
놓이는 가운데 위쪽이 밝지 않아야 합니다.
