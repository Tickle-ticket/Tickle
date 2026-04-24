"""매크로 추상 베이스 클래스.

모든 매크로 구현체의 공통 부모. 서브클래스는 `source_name` 과 `execute` 만 구현하면
세션 생명주기 관리 + 이벤트 로깅 + 타겟 YAML 로드 가 자동으로 처리됨.

상속 관계:
    BaseMacro
      ├─ PyAutoGUILv1  (mouse_automation/pyautogui_lv1.py)   — 고정좌표 즉시이동
      ├─ PyAutoGUILv2  (mouse_automation/pyautogui_lv2.py)   — 베지어 + 노이즈
      └─ (PlaywrightLv1/Lv2 는 임찬혁 담당 — browser_automation/)

사용 흐름:
    macro = PyAutoGUILv1(target_name="local_login")    # YAML 로드, Session 생성
    macro.run()                                        # session.start → execute → flush
"""
import os
from abc import ABC, abstractmethod
from pathlib import Path

from macro.mouse_automation.session import Session
from macro.mouse_automation.event_logger import EventLogger
from macro.mouse_automation._config import load_config, load_target, get_base_resolution


class BaseMacro(ABC):
    """모든 매크로의 베이스 클래스. 세션 생명주기와 로깅을 통합 관리."""

    def __init__(self, target_name: str, config_path: str = "config/default.yaml"):
        # 전역 매크로 설정 (configs/macro.yaml) + 타겟 시나리오 (configs/macro_targets/{name}.yaml)
        self.config = load_config(config_path)
        self.target = load_target(target_name)
        # 매크로 좌표의 기준 해상도 (YAML 의 coords 는 이 해상도 기준으로 작성됨)
        self.base_resolution = get_base_resolution(self.config)

        # EventLogger 는 session.label 을 폴더명으로 사용 ("macro" → data/raw/macro/)
        raw_dir = self.config.get("logging", {}).get("raw_dir", "data/raw")
        self.session = Session(source=self.source_name, label="macro")
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
