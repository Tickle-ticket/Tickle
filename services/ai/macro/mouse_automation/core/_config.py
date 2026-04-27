"""YAML 설정 로더."""
import yaml
from pathlib import Path
from typing import Optional

# macro/mouse_automation/core/_config.py -> services/ai/ -> configs/
_CONFIGS_DIR = Path(__file__).resolve().parents[3] / "configs"
_DEFAULT_CONFIG = _CONFIGS_DIR / "macro.yaml"
_DEFAULT_TARGETS_DIR = _CONFIGS_DIR / "macro_targets"


def load_config(config_path: Optional[str] = None) -> dict:
    """전역 설정 로드."""
    path = Path(config_path) if config_path else _DEFAULT_CONFIG
    if not path.exists():
        raise FileNotFoundError(f"설정 파일 없음: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_target(target_name: str, targets_dir: Optional[str] = None) -> dict:
    """시나리오별 타겟 설정 로드."""
    base = Path(targets_dir) if targets_dir else _DEFAULT_TARGETS_DIR
    path = base / f"{target_name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"타겟 설정 없음: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_base_resolution(config: dict) -> tuple[int, int]:
    """설정에서 기준 해상도 추출."""
    res = config.get("screen", {}).get("base_resolution", [1920, 1080])
    return (res[0], res[1])
