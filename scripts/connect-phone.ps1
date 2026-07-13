# USB로 연결된 안드로이드 기기에서 앱을 실행한다.
# 전제: Metro가 localhost 모드로 8081에서 실행 중
#   cmd /c "set NODE_OPTIONS=--dns-result-order=ipv4first&&npx expo start --localhost"
# USB를 뽑았다 꽂으면 reverse 포워딩이 초기화되므로 이 스크립트를 다시 실행하면 된다.

$device = adb devices | Select-String "device$"
if (-not $device) {
    Write-Host "휴대폰이 인식되지 않습니다. USB 연결과 USB 디버깅 허용을 확인하세요." -ForegroundColor Red
    exit 1
}

adb reverse tcp:8081 tcp:8081 | Out-Null
Write-Host "포트 포워딩 완료: 휴대폰 localhost:8081 -> PC" -ForegroundColor Green

adb shell am force-stop host.exp.exponent
Start-Sleep -Seconds 1
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" | Out-Null
Write-Host "휴대폰에서 Expo Go 실행됨" -ForegroundColor Green
