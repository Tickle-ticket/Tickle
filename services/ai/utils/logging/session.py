"""세션 관리 모듈.

매크로/사람 데이터 수집의 최소 단위 = "세션". 한 번의 티켓팅 플로우(예매 시작 → 완료)가
한 세션. session_id 는 uuid4 hex 앞 12자로 세션마다 유니크.

`ts_ms` (세션 시작 이후 경과 ms) 를 EventLogger 가 각 이벤트에 찍음 → 절대 시간이 아닌
세션 상대 시간으로 분석 가능 (세션 간 비교 쉬움).
"""
import time
import uuid
from dataclasses import dataclass, field


@dataclass
class Session:
    source: str                                # 매크로 식별자 (예: "pyautogui_lv1", "human", "automouse_sequence_xxx")
    label: str = "macro"                       # "macro" | "human" — 학습 라벨 + EventLogger 의 저장 하위 폴더명
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])  # 12자 hex
    _start_ns: int = field(default=0, repr=False)  # perf_counter 기준 시작 시각 (ns)
    _end_ns: int = field(default=0, repr=False)    # 종료 시각 (ns)

    def start(self):
        self._start_ns = time.perf_counter_ns()

    def end(self):
        self._end_ns = time.perf_counter_ns()

    def elapsed_ms(self) -> float:
        """세션 시작 이후 경과 시간 (ms)."""
        return (time.perf_counter_ns() - self._start_ns) / 1e6

    @property
    def duration_ms(self) -> float:
        if self._end_ns == 0:
            return self.elapsed_ms()
        return (self._end_ns - self._start_ns) / 1e6
