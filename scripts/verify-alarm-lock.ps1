<#
  잠금화면 위 알람 플로우 검증 하네스.

  알람은 adb로 강제 발화할 수 없다(AlarmReceiver가 exported="false"). 그래서 이 스크립트는
  "알람이 울릴 때까지 기다렸다가" 측정한다 — 실행해 두고 폰에서 알람을 2~3분 뒤로 맞춘 뒤
  화면을 끄면 된다.

  판정은 눈이 아니라 dumpsys 값으로 한다:
    mKeyguardOccluded=true  → 잠금화면이 가려짐(컨텐츠가 보임)
    mKeyguardOccluded=false → 잠금화면이 앞
#>
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [int]$TimeoutMinutes = 12,
  # 탭 없이 알람 화면 상태만 보고 끝낼 때 사용(뒤로가기·홈 시나리오는 수동 조작이 필요하다).
  [switch]$NoTap,
  # 알람을 기다리지 않고 지금 화면 상태만 한 번 찍는다 — 하네스 자체를 점검할 때 쓴다.
  [switch]$ProbeOnly
)

$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb를 찾을 수 없습니다: $adb" }

$outDir = Join-Path $PSScriptRoot '..\.alarm-verify'
New-Item -ItemType Directory -Force $outDir | Out-Null
$out = Join-Path $outDir ($Label + '.log')
Set-Content -Path $out -Value ("=== " + $Label + " @ " + (Get-Date) + " ===") -Encoding utf8

function Log($m) { Add-Content $out $m; Write-Host $m }

function Get-Top {
  $hit = (& $adb shell dumpsys activity activities) |
    Where-Object { $_ -like '*topResumedActivity=*' } | Select-Object -First 1
  if ($hit) { return ($hit -replace '\s+', ' ').Trim() }
  return '(none)'
}

function Get-Occluded {
  $hit = (& $adb shell dumpsys window) |
    Where-Object { $_ -like '*mKeyguardOccluded=*' } | Select-Object -First 1
  if ($hit) { return ($hit -replace '\s+', ' ').Trim() }
  return '(none)'
}

function Snap($name) {
  & $adb shell screencap -p /sdcard/cl.png | Out-Null
  & $adb pull /sdcard/cl.png (Join-Path $outDir ($Label + '-' + $name + '.png')) | Out-Null
  & $adb shell rm /sdcard/cl.png | Out-Null
}

# 알람 화면의 '공부하기'는 레이아웃상 두 버튼 중 위쪽이다.
function Get-StudyButtonPoint {
  & $adb shell uiautomator dump /sdcard/ui.xml | Out-Null
  $local = Join-Path $outDir ($Label + '-ui.xml')
  & $adb pull /sdcard/ui.xml $local | Out-Null
  & $adb shell rm /sdcard/ui.xml | Out-Null

  $xml = Get-Content $local -Raw -Encoding utf8
  $pattern = '<node[^>]*class="android\.widget\.Button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
  $btns = @()
  foreach ($m in [regex]::Matches($xml, $pattern)) {
    $btns += [pscustomobject]@{
      x1 = [int]$m.Groups[1].Value; y1 = [int]$m.Groups[2].Value
      x2 = [int]$m.Groups[3].Value; y2 = [int]$m.Groups[4].Value
    }
  }
  Log ("  buttons: " + $btns.Count)
  if ($btns.Count -lt 1) { throw '알람 화면에서 버튼을 찾지 못했습니다' }
  $t = $btns | Sort-Object y1 | Select-Object -First 1
  return @([int](($t.x1 + $t.x2) / 2), [int](($t.y1 + $t.y2) / 2))
}

if ($ProbeOnly) {
  Log '[Probe] 지금 화면 상태만 기록합니다.'
  Log ('  top      : ' + (Get-Top))
  Log ('  keyguard : ' + (Get-Occluded))
  Snap 'probe'
  Log '[완료]'
  exit 0
}

Log '[대기] 폰에서 알람을 2~3분 뒤로 맞추고 화면을 끄십시오.'
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$found = $false
while ((Get-Date) -lt $deadline) {
  if ((Get-Top) -like '*AlarmActivity*') { $found = $true; break }
  Start-Sleep -Milliseconds 1000
}
if (-not $found) { Log '[TIMEOUT] 알람 화면이 뜨지 않았습니다'; exit 1 }

Log ('[A] 알람 화면 @ ' + (Get-Date).ToString('HH:mm:ss'))
Log ('  top      : ' + (Get-Top))
Log ('  keyguard : ' + (Get-Occluded))
Snap 'A'

if ($NoTap) { Log '[NoTap] 여기서 종료합니다'; exit 0 }

$pt = Get-StudyButtonPoint
Log ('[TAP] ' + $pt[0] + ',' + $pt[1])
& $adb shell input tap $pt[0] $pt[1] | Out-Null

for ($i = 1; $i -le 6; $i++) {
  Start-Sleep -Milliseconds 1200
  Log ('[B.' + $i + '] top      : ' + (Get-Top))
  Log ('       keyguard : ' + (Get-Occluded))
}
Snap 'B'
Log '[완료]'
