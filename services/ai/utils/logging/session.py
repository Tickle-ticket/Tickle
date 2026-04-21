"""세션 관리 모듈."""
import time
import uuid
from dataclasses import dataclass, field


@dataclass
class Session:
    source: str
    label: str = "macro"  # "macro" | "human"
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    _start_ns: int = field(default=0, repr=False)
    _end_ns: int = field(default=0, repr=False)

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
