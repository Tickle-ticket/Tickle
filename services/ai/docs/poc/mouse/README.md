# 3-A 마우스 제어 라이브러리 PoC

Sprint 3 베지어 곡선(3-B) + human-like 프로파일(3-C) 적용의 기반 라이브러리 선정.

## 비교 대상

| 라이브러리 | 설치 상태 | 요약 |
|---|---|---|
| PyAutoGUI | ✅ v0.9.54 | 가장 보편. 내장 tween. float 입력 → int 반올림 |
| pynput | ✅ 설치됨 | controller + listener 세트. tween 미지원(수동) |
| Interception | ❌ 미설치 | 커널 드라이버 기반. 탐지 회피 최고. 설치 부담 |

## 비교 기준

| 기준 | PyAutoGUI | pynput | Interception |
|---|---|---|---|
| 좌표 정밀도 (float) | ❌ int 반올림 | ❌ int 반올림 | ❌ int 반올림 |
| 이동 속도 제어 | ✅ duration + tween (easings 내장) | ⚠️ 수동 (time.sleep) | ⚠️ 수동 |
| 이벤트 주입 방식 | 유저 레벨 (user32 mouse_event) | 유저 레벨 (SendInput) | **커널 드라이버** |
| 브라우저 호환성 | ✅ 브라우저 mousemove 이벤트 정상 발생 | ✅ 동일 | ✅ 하드웨어 구분 불가 |
| OS 지원 | Windows/Mac/Linux | Windows/Mac/Linux | Windows 전용 |
| 설치 난이도 | pip 한 줄 | pip 한 줄 | 드라이버 + 재부팅 |
| 탐지 회피성 | 낮음 (SendInput 시그니처 있음) | 낮음 (동일) | **높음** (하드웨어 수준) |
| 리스너 기능 | 없음 (pyautogui.position 폴링만) | ✅ on_move/on_click listener | ✅ 양방향 capture |

## 결정 권장

### Sprint 3-A/3-B/3-C 구현용: **PyAutoGUI + pynput 조합**

- **PyAutoGUI**: 기본 이동/클릭. `duration` + 베지어(3-B)로 곡선 구현
- **pynput**: 이미 `simulator/human/recorder.py` 에서 리스너로 사용 중. 통일성

이유:
1. 설치 용이 — 팀원이 바로 개발/테스트 가능
2. 기존 코드 재활용 (simulator/macros/pyautogui_lv1/2 에서 이미 사용)
3. float 정밀도는 이동 보간 해상도에 영향이 있으나 브라우저가 ~60Hz 로 샘플링하므로 실질 손실 없음
4. 매크로 레벨 1, 2 타겟에는 충분 — "사람처럼 보이는" 시뮬레이션이 목표이지 "탐지 회피"가 목표가 아님

### Sprint 4 이후 고려: **Interception 추가**

- 실제 운영 환경의 매크로 다수는 Interception/유사 드라이버 수준 사용
- 탐지 모델의 강건성(robustness) 검증을 위해서는 이 수준의 매크로 샘플도 필요
- 단, 팀원 모두가 개발 환경 구성하기 어려우므로 **별도 장비/VM** 에서 진행 권장

## 인터페이스 통합

`training/datasets/simulator/macros/mouse_driver.py` (신규) 에 공통 인터페이스를 두고,
실제 구현을 backend 별로 분리한다. 기본 backend = pyautogui.

```python
class MouseDriver(ABC):
    @abstractmethod
    def move_to(self, x: float, y: float, duration_ms: float = 0) -> None: ...
    @abstractmethod
    def move_path(self, points: list[tuple[float, float]], total_duration_ms: float) -> None: ...
    @abstractmethod
    def click(self, button: str = "left") -> None: ...
    @abstractmethod
    def position(self) -> tuple[int, int]: ...

class PyAutoGUIDriver(MouseDriver): ...
class PynputDriver(MouseDriver): ...
class InterceptionDriver(MouseDriver): ...  # 설치 시
```

## 실행 방법 (PoC 검증)

**주의**: 실행 시 마우스가 자동 이동합니다. 사용자 손을 뗀 상태에서 진행하세요.
비상 중지: 마우스를 화면 왼쪽 상단 모서리로 (PyAutoGUI FAILSAFE).

```bash
# 터미널 1 (테스트)
cd C:\Users\SSAFY\Desktop\ai-macro-detection
python docs/poc/mouse/poc_pyautogui.py
python docs/poc/mouse/poc_pynput.py
# python docs/poc/mouse/poc_interception.py  # 미설치
```

## PoC 결과 (실행 후 채움)

### PyAutoGUI
- 정밀도 실측:
- 경로 50포인트 이동 총 시간:
- tween easeInOutQuad 체감:

### pynput
- 정밀도 실측:
- 경로 50포인트 이동 총 시간:

### Interception (나중에)
- 해당 없음 (미설치)
