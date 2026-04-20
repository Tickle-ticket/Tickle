"""매크로 추상 베이스 클래스."""
import os
from abc import ABC, abstractmethod
from pathlib import Path

from utils.logging.session import Session
from utils.logging.event_logger import EventLogger
from macro._config import load_config, load_target, get_base_resolution


class BaseMacro(ABC):
    """모든 매크로의 베이스 클래스. 세션 생명주기와 로깅을 통합 관리."""

    def __init__(self, target_name: str, config_path: str = "config/default.yaml"):
        self.config = load_config(config_path)
        self.target = load_target(target_name)
        self.base_resolution = get_base_resolution(self.config)

        raw_dir = self.config.get("logging", {}).get("raw_dir", "data/raw")
        self.session = Session(source=self.source_name, label=0)
        self.logger = EventLogger(self.session, base_dir=raw_dir)

    @property
    @abstractmethod
    def source_name(self) -> str:
        """매크로 식별자 (예: pyautogui_lv1)."""
        ...

    @abstractmethod
    def execute(self):
        """매크로 실행 로직. 서브클래스에서 구현."""
        ...

    def run(self) -> str:
        """매크로 실행. 세션 ID 반환."""
        print(f"[{self.source_name}] 매크로 시작 - 세션: {self.session.session_id}")
        print(f"  타겟: {self.target.get('name', 'unknown')}")
        print(f"  URL: {self.target.get('url', 'N/A')}")

        self.session.start()
        try:
            self.execute()
        except KeyboardInterrupt:
            print("\n[!] 사용자에 의해 중단됨")
        except Exception as e:
            print(f"\n[ERROR] {e}")
            raise
        finally:
            self.session.end()
            self.logger.flush()
            print(f"[{self.source_name}] 매크로 종료 - 소요: {self.session.duration_ms:.0f}ms")
            print(f"  로그 저장: {self.logger.file_path}")

        return self.session.session_id
