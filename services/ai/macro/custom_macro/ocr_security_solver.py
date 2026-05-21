import os
import re
import json
import shutil
import uuid
import hashlib
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any, TYPE_CHECKING

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance

# NOTE: Paddle/PaddleOCR GPU wheels on Windows ship CUDA/cuDNN DLLs in
# `site-packages/nvidia/*/bin`. The Windows DLL loader won't always find these
# unless we add them explicitly before importing `paddle`.
def _ensure_windows_nvidia_dll_paths() -> None:
    if os.name != "nt":
        return

    try:
        import site
        from pathlib import Path

        candidates = []
        for sp in site.getsitepackages():
            sp_path = Path(sp)
            nvidia_dir = sp_path / "nvidia"
            if not nvidia_dir.is_dir():
                continue
            # Add every `bin` folder under site-packages/nvidia/**/bin
            for bin_dir in nvidia_dir.glob("**/bin"):
                if bin_dir.is_dir():
                    candidates.append(bin_dir)

        for bin_dir in candidates:
            try:
                os.add_dll_directory(str(bin_dir))
            except Exception:
                pass
    except Exception:
        pass


def _lazy_import_paddleocr():
    _ensure_windows_nvidia_dll_paths()
    from paddleocr import PaddleOCR  # type: ignore

    return PaddleOCR


SCREENSHOT_PATH = "screen.png"
DEBUG_IMAGE_PATH = "debug_result.png"

OCR_MIN_SCORE = float(os.getenv("OCR_MIN_SCORE") or "0.18")
OCR_LABEL_DIR = os.getenv("OCR_LABEL_DIR") or str(Path(__file__).resolve().parent / "data" / "labels")

Box = Tuple[int, int, int, int]

_ocr = None
_ocr_use_gpu = None
_ocr_rec_only = None
_ocr_rec_only_use_gpu = None


def _parse_bool_env(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None

    raw = str(value).strip().lower()
    if raw in ("1", "true", "t", "yes", "y", "on"):
        return True
    if raw in ("0", "false", "f", "no", "n", "off"):
        return False
    if raw in ("auto", ""):
        return None

    return None


def _parse_int(value, default: int) -> int:
    try:
        if value is None:
            return int(default)
        if isinstance(value, bool):
            return int(default)
        return int(float(value))
    except Exception:
        return int(default)


def _parse_float(value, default: float) -> float:
    try:
        if value is None:
            return float(default)
        if isinstance(value, bool):
            return float(default)
        return float(value)
    except Exception:
        return float(default)


def _load_ocr_config() -> Dict[str, Any]:
    # Optional config file (preferred over hardcoding; env vars can still override).
    # Default path: ./ocr_config.json (same folder as this file)
    try:
        config_path = Path(os.getenv("OCR_CONFIG_PATH") or "").expanduser()
    except Exception:
        config_path = Path()

    if not config_path:
        config_path = Path(__file__).resolve().parent / "ocr_config.json"

    try:
        if not config_path.is_file():
            return {}

        with config_path.open("r", encoding="utf-8") as f:
            data = json.load(f) or {}

        if isinstance(data, dict):
            return data
    except Exception:
        return {}

    return {}


def get_ocr_config_effective() -> Dict[str, Any]:
    """
    Return the effective OCR-related knobs used by this solver.
    (Useful for debugging /health outputs.)
    """
    loaded = _load_ocr_config()
    config = loaded if isinstance(loaded, dict) else {}

    env_use_angle = _parse_bool_env(os.getenv("OCR_USE_ANGLE_CLS"))
    config_use_angle = _parse_bool_env(config.get("use_angle_cls") if isinstance(config, dict) else None)
    use_angle_cls = (
        env_use_angle
        if env_use_angle is not None
        else (config_use_angle if config_use_angle is not None else False)
    )

    env_det_side = os.getenv("OCR_DET_LIMIT_SIDE_LEN")
    config_det_side = config.get("det_limit_side_len") if isinstance(config, dict) else None
    det_limit_side_len = _parse_int(env_det_side if env_det_side is not None else config_det_side, default=640)
    det_limit_side_len = max(160, min(det_limit_side_len, 1280))

    env_drop_score = os.getenv("OCR_DROP_SCORE")
    config_drop_score = config.get("drop_score") if isinstance(config, dict) else None
    drop_score = _parse_float(env_drop_score if env_drop_score is not None else config_drop_score, default=0.5)
    drop_score = max(0.0, min(drop_score, 1.0))

    save_debug = _parse_bool_env(os.getenv("OCR_SAVE_DEBUG"))
    if save_debug is None:
        save_debug = False

    capture_ambiguous = _parse_bool_env(os.getenv("OCR_CAPTURE_AMBIGUOUS"))
    if capture_ambiguous is None:
        capture_ambiguous = True

    env_grid_first = _parse_bool_env(os.getenv("OCR_KEYPAD_GRID_FIRST"))
    # Default OFF: whole-keypad OCR (single call) is typically faster than per-cell OCR.
    keypad_grid_first = env_grid_first if env_grid_first is not None else bool(config.get("keypad_grid_first", False))

    grid_rows = _parse_int(os.getenv("OCR_KEYPAD_GRID_ROWS"), default=_parse_int(config.get("keypad_grid_rows"), 4))
    grid_cols = _parse_int(os.getenv("OCR_KEYPAD_GRID_COLS"), default=_parse_int(config.get("keypad_grid_cols"), 3))
    grid_rows = max(2, min(grid_rows, 6))
    grid_cols = max(2, min(grid_cols, 6))

    return {
        "use_angle_cls": bool(use_angle_cls),
        "det_limit_side_len": int(det_limit_side_len),
        "drop_score": float(drop_score),
        "save_debug_image": bool(save_debug),
        "capture_ambiguous": bool(capture_ambiguous),
        "keypad_grid_first": bool(keypad_grid_first),
        "keypad_grid_rows": int(grid_rows),
        "keypad_grid_cols": int(grid_cols),
    }

def _paddle_cuda_available() -> bool:
    try:
        import paddle

        if not paddle.is_compiled_with_cuda():
            return False

        # Typical values: "cpu", "gpu:0"
        dev = str(paddle.device.get_device() or "").lower()
        return dev.startswith("gpu")
    except Exception:
        return False


def _build_ocr(use_gpu: bool):
    PaddleOCR = _lazy_import_paddleocr()
    config = _load_ocr_config()
    lang = None
    if isinstance(config, dict):
        lang = config.get("lang")
    lang = str(lang).strip().lower() if lang else ""
    if not lang:
        # This solver mainly targets digit-only challenges; English models tend to be
        # more reliable for digits than Korean multilingual models.
        lang = "en"

    # Speed-oriented defaults for this project's "digit keypad" use-case.
    # You can override via env vars or ocr_config.json.
    env_use_angle = _parse_bool_env(os.getenv("OCR_USE_ANGLE_CLS"))
    config_use_angle = _parse_bool_env(config.get("use_angle_cls") if isinstance(config, dict) else None)
    use_angle_cls = (
        env_use_angle
        if env_use_angle is not None
        else (config_use_angle if config_use_angle is not None else False)
    )

    env_det_side = os.getenv("OCR_DET_LIMIT_SIDE_LEN")
    config_det_side = config.get("det_limit_side_len") if isinstance(config, dict) else None
    det_limit_side_len = _parse_int(env_det_side if env_det_side is not None else config_det_side, default=640)
    det_limit_side_len = max(160, min(det_limit_side_len, 1280))

    env_drop_score = os.getenv("OCR_DROP_SCORE")
    config_drop_score = config.get("drop_score") if isinstance(config, dict) else None
    drop_score = _parse_float(env_drop_score if env_drop_score is not None else config_drop_score, default=0.5)
    drop_score = max(0.0, min(drop_score, 1.0))

    base_kwargs = {
        "use_angle_cls": bool(use_angle_cls),
        "lang": lang,
        "det_limit_side_len": int(det_limit_side_len),
        "drop_score": float(drop_score),
    }

    # PaddleOCR has multiple major versions with different init args.
    # - Some accept `use_gpu` directly.
    # - Newer pipeline versions reject unknown args (ValueError: "Unknown argument: use_gpu").
    try:
        return PaddleOCR(**base_kwargs, use_gpu=use_gpu)
    except (TypeError, ValueError) as exc:
        message = str(exc)
        if "use_gpu" not in message:
            raise

        # Fallback: choose device via Paddle (works for newer pipelines).
        try:
            import paddle

            paddle.device.set_device("gpu:0" if use_gpu else "cpu")
        except Exception:
            pass

        return PaddleOCR(**base_kwargs)


def _build_ocr_rec_only(use_gpu: bool):
    """
    Recognition-only OCR for small crops (e.g., keypad cells) to avoid det(dt_boxes).
    Falls back to the normal OCR builder if the installed PaddleOCR version does not
    support disabling detection via init args.
    """
    PaddleOCR = _lazy_import_paddleocr()
    config = _load_ocr_config()
    if not isinstance(config, dict):
        config = {}

    lang = config.get("lang")
    lang = str(lang).strip().lower() if lang else ""
    if not lang:
        lang = "en"

    env_use_angle = _parse_bool_env(os.getenv("OCR_USE_ANGLE_CLS"))
    config_use_angle = _parse_bool_env(config.get("use_angle_cls"))
    use_angle_cls = (
        env_use_angle
        if env_use_angle is not None
        else (config_use_angle if config_use_angle is not None else False)
    )

    env_drop_score = os.getenv("OCR_DROP_SCORE")
    drop_score = _parse_float(env_drop_score if env_drop_score is not None else config.get("drop_score"), default=0.5)
    drop_score = max(0.0, min(drop_score, 1.0))

    base_kwargs = {
        "use_angle_cls": bool(use_angle_cls),
        "lang": lang,
        "drop_score": float(drop_score),
    }

    try:
        return PaddleOCR(**base_kwargs, det=False, use_gpu=use_gpu)
    except (TypeError, ValueError) as exc:
        message = str(exc)
        if "use_gpu" not in message and "det" not in message:
            raise

        try:
            import paddle

            paddle.device.set_device("gpu:0" if use_gpu else "cpu")
        except Exception:
            pass

        try:
            return PaddleOCR(**base_kwargs, det=False)
        except Exception:
            return _build_ocr(use_gpu=use_gpu)


def get_ocr_rec_only(prefer_gpu: Optional[bool] = None):
    global _ocr_rec_only, _ocr_rec_only_use_gpu

    if _ocr_rec_only is None:
        env_choice = _parse_bool_env(os.getenv("OCR_USE_GPU"))
        if env_choice is None:
            env_choice = _parse_bool_env(os.getenv("PADDLEOCR_USE_GPU"))

        config_choice = None
        if env_choice is None:
            config = _load_ocr_config()
            config_choice = _parse_bool_env(config.get("use_gpu") if isinstance(config, dict) else None)

        prefer_gpu_effective = (
            env_choice if env_choice is not None else (config_choice if config_choice is not None else prefer_gpu)
        )
        if prefer_gpu_effective is None:
            prefer_gpu_effective = True

        if prefer_gpu_effective and _paddle_cuda_available():
            try:
                _ocr_rec_only = _build_ocr_rec_only(use_gpu=True)
                _ocr_rec_only_use_gpu = True
                return _ocr_rec_only
            except Exception:
                _ocr_rec_only = None

        _ocr_rec_only = _build_ocr_rec_only(use_gpu=False)
        _ocr_rec_only_use_gpu = False

    return _ocr_rec_only


def get_ocr(prefer_gpu: Optional[bool] = None):
    global _ocr, _ocr_use_gpu

    if _ocr is None:
        env_choice = _parse_bool_env(os.getenv("OCR_USE_GPU"))
        if env_choice is None:
            env_choice = _parse_bool_env(os.getenv("PADDLEOCR_USE_GPU"))

        config_choice = None
        if env_choice is None:
            config = _load_ocr_config()
            config_choice = _parse_bool_env(config.get("use_gpu") if isinstance(config, dict) else None)

        prefer_gpu_effective = (
            env_choice if env_choice is not None else (config_choice if config_choice is not None else prefer_gpu)
        )
        if prefer_gpu_effective is None:
            prefer_gpu_effective = True

        if prefer_gpu_effective and _paddle_cuda_available():
            try:
                _ocr = _build_ocr(use_gpu=True)
                _ocr_use_gpu = True
                return _ocr
            except Exception:
                # GPU init can fail (missing CUDA libs/driver mismatch). Fall back to CPU.
                _ocr = None

        _ocr = _build_ocr(use_gpu=False)
        _ocr_use_gpu = False

    return _ocr


def get_ocr_runtime_info() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        "use_gpu": _ocr_use_gpu,
        "paddle_cuda_available": _paddle_cuda_available(),
    }

    try:
        import paddle

        info["paddle_device"] = str(paddle.device.get_device())
        info["paddle_compiled_with_cuda"] = bool(paddle.is_compiled_with_cuda())
    except Exception:
        pass

    try:
        info["effective_config"] = get_ocr_config_effective()
    except Exception:
        pass

    try:
        info["rec_only_use_gpu"] = _ocr_rec_only_use_gpu
    except Exception:
        pass

    return info


def parse_box(value) -> Optional[Box]:
    if value is None:
        return None

    if isinstance(value, str):
        raw = value.strip()

        if not raw:
            return None

        parts = [int(float(part.strip())) for part in raw.split(",")]

        if len(parts) != 4:
            raise ValueError(f"box 형식이 잘못되었습니다: {value}")

        left, top, right, bottom = parts

    elif isinstance(value, (list, tuple)):
        if len(value) != 4:
            raise ValueError(f"box 형식이 잘못되었습니다: {value}")

        left, top, right, bottom = [int(float(v)) for v in value]

    else:
        raise ValueError(f"box 형식이 잘못되었습니다: {value}")

    if right <= left or bottom <= top:
        raise ValueError(f"box 좌표가 잘못되었습니다: {value}")

    return left, top, right, bottom


def box_to_text(box: Optional[Box]) -> Optional[str]:
    if box is None:
        return None

    return f"{box[0]},{box[1]},{box[2]},{box[3]}"


def to_python_value(value):
    if hasattr(value, "tolist"):
        return value.tolist()

    return value


def is_non_empty(value) -> bool:
    if value is None:
        return False

    if hasattr(value, "size"):
        return value.size > 0

    try:
        return len(value) > 0
    except TypeError:
        return True


def first_non_empty(*values):
    for value in values:
        if is_non_empty(value):
            return value

    return []


def normalize_box(box):
    if box is None:
        return [0.0, 0.0, 0.0, 0.0]

    box = to_python_value(box)

    if (
        isinstance(box, (list, tuple))
        and len(box) == 4
        and not isinstance(box[0], (list, tuple))
    ):
        x1, y1, x2, y2 = box
        return [float(x1), float(y1), float(x2), float(y2)]

    if isinstance(box, (list, tuple)) and len(box) > 0:
        xs = []
        ys = []

        for point in box:
            point = to_python_value(point)

            if isinstance(point, (list, tuple)) and len(point) >= 2:
                xs.append(float(point[0]))
                ys.append(float(point[1]))

        if xs and ys:
            return [min(xs), min(ys), max(xs), max(ys)]

    return [0.0, 0.0, 0.0, 0.0]


def scale_box_down(box, scale: float):
    if scale <= 0:
        return box

    return [
        box[0] / scale,
        box[1] / scale,
        box[2] / scale,
        box[3] / scale,
    ]


def prepare_ocr_image(image_path: str, save_path: str, scale: int = 2):
    img = Image.open(image_path).convert("RGB")

    if scale > 1:
        img = img.resize(
            (img.width * scale, img.height * scale),
            Image.Resampling.LANCZOS,
        )

    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = ImageEnhance.Sharpness(img).enhance(1.2)
    img.save(save_path)

    return save_path, float(scale)


def _heuristic_fix_1_vs_7(image_path: str, predicted: str) -> str:
    """
    Heuristic disambiguation for frequent OCR confusion between '1' and '7'.
    Works on a cropped digit patch (slot/cell).
    """
    pred = str(predicted or "").strip()
    if pred not in ("1", "7"):
        return pred

    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return pred

        # Normalize size and enhance contrast
        img = cv2.resize(img, (64, 64), interpolation=cv2.INTER_CUBIC)
        img = cv2.GaussianBlur(img, (3, 3), 0)

        # Binarize: digit strokes become white
        _, th = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Remove tiny noise
        kernel = np.ones((2, 2), np.uint8)
        th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

        # Remove rounded-rect border influence by masking margins, then keep the largest component.
        h, w = th.shape
        margin_x = int(w * 0.12)
        margin_y = int(h * 0.12)
        if margin_x > 0:
            th[:, :margin_x] = 0
            th[:, w - margin_x :] = 0
        if margin_y > 0:
            th[:margin_y, :] = 0
            th[h - margin_y :, :] = 0

        # Keep largest connected component (the digit), drop any leftover border fragments.
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(th, connectivity=8)
        if num_labels > 1:
            # stats[0] is background
            largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            th = np.where(labels == largest, 255, 0).astype(np.uint8)

        if h == 0 or w == 0:
            return pred

        row_sum = th.sum(axis=1) / 255.0  # number of white pixels per row
        col_sum = th.sum(axis=0) / 255.0  # number of white pixels per col

        top_band = row_sum[: int(h * 0.22)]
        mid_cols = col_sum[int(w * 0.42) : int(w * 0.58)]

        top_h = float(top_band.max() if len(top_band) else 0.0)
        mid_v = float(mid_cols.max() if len(mid_cols) else 0.0)

        # Normalize by dimension for scale invariance
        top_h_n = top_h / float(w)
        mid_v_n = mid_v / float(h)

        # Robust cue: '7' usually contains a long diagonal stroke; '1' does not.
        edges = cv2.Canny(th, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180.0, threshold=25, minLineLength=18, maxLineGap=3)
        diag_votes = 0
        vert_votes = 0
        if lines is not None:
            for x1, y1, x2, y2 in lines.reshape(-1, 4):
                dx = float(x2 - x1)
                dy = float(y2 - y1)
                if dx == 0 and dy == 0:
                    continue
                angle = abs(np.degrees(np.arctan2(dy, dx)))
                # Normalize to [0, 90]
                if angle > 90:
                    angle = 180 - angle
                length = (dx * dx + dy * dy) ** 0.5
                if length < 16:
                    continue
                if 20 <= angle <= 70:
                    diag_votes += 1
                elif angle >= 80:
                    vert_votes += 1

        # Prefer diagonal evidence for 7
        if diag_votes >= 2:
            return "7"
        if vert_votes >= 2 and diag_votes == 0:
            return "1"

        # Fallback cue: compare dominance of top horizontal vs center vertical.
        # Note: digit '1' may have a small top serif, so require a stronger top bar to call '7'.
        if top_h_n > 0.68 and (top_h_n - mid_v_n) > 0.16:
            return "7"
        if mid_v_n > 0.62 and (mid_v_n - top_h_n) > 0.10:
            return "1"

        return pred
    except Exception:
        return pred


def _digit_to_unit_vector(mask: np.ndarray, size: int = 48) -> Optional[np.ndarray]:
    """
    Convert a binary mask (0/255) into a normalized 0/1 vector with fixed size.
    """
    if mask is None:
        return None
    try:
        if mask.ndim != 2:
            return None
        if mask.shape[0] <= 0 or mask.shape[1] <= 0:
            return None

        # Tight crop to foreground
        ys, xs = np.where(mask > 0)
        if len(xs) == 0 or len(ys) == 0:
            return None
        x1, x2 = int(xs.min()), int(xs.max())
        y1, y2 = int(ys.min()), int(ys.max())
        crop = mask[y1 : y2 + 1, x1 : x2 + 1]

        crop = cv2.resize(crop, (size, size), interpolation=cv2.INTER_NEAREST)
        v = (crop.astype(np.float32) / 255.0).reshape(-1)
        n = float(np.linalg.norm(v))
        if n <= 1e-6:
            return None
        return v / n
    except Exception:
        return None


def _mask_blue_digit(bgr: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract blue digit strokes from a slot image (returns binary 0/255 mask).
    """
    if bgr is None:
        return None
    try:
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        # Broad "blue" range in OpenCV HSV (H: 0-179)
        lower = np.array([90, 40, 40], dtype=np.uint8)
        upper = np.array([140, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower, upper)

        # Clean up and keep largest component
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        if num_labels <= 1:
            return mask
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = np.where(labels == largest, 255, 0).astype(np.uint8)
        return mask
    except Exception:
        return None


def _mask_dark_digit(bgr: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract dark(gray/black) digit strokes from keypad crops (returns binary 0/255 mask).
    """
    if bgr is None:
        return None
    try:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        # Invert so strokes become white
        _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        # Remove border influence
        h, w = th.shape
        mx = int(w * 0.12)
        my = int(h * 0.12)
        if mx > 0:
            th[:, :mx] = 0
            th[:, w - mx :] = 0
        if my > 0:
            th[:my, :] = 0
            th[h - my :, :] = 0

        kernel = np.ones((2, 2), np.uint8)
        th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)
        return th
    except Exception:
        return None


def _template_match_digit(slot_bgr: np.ndarray, templates: Dict[str, np.ndarray]) -> Tuple[Optional[str], float]:
    """
    Match a blue slot digit against keypad-derived templates using cosine similarity.
    """
    if not templates:
        return None, 0.0
    mask = _mask_blue_digit(slot_bgr)
    vec = _digit_to_unit_vector(mask)
    if vec is None:
        return None, 0.0

    best_digit = None
    best_score = -1.0
    for digit, tmpl in templates.items():
        if tmpl is None:
            continue
        try:
            score = float(np.dot(vec, tmpl))
        except Exception:
            continue
        if score > best_score:
            best_score = score
            best_digit = digit

    return best_digit, float(best_score if best_score > -1.0 else 0.0)


def build_keypad_digit_templates(keypad_path: str, keypad_items: List[Dict[str, Any]]) -> Dict[str, np.ndarray]:
    """
    Build digit templates from keypad OCR boxes (one template per digit, best score wins).
    """
    templates: Dict[str, np.ndarray] = {}
    best_scores: Dict[str, float] = {}

    try:
        img = cv2.imread(keypad_path, cv2.IMREAD_COLOR)
        if img is None:
            return {}

        for item in keypad_items or []:
            if item.get("score", 0) < min(OCR_MIN_SCORE, 0.10):
                continue
            digits = extract_digits_from_text(item.get("text", ""))
            if len(digits) != 1:
                continue
            digit = digits[0]
            x1, y1, x2, y2 = [int(float(v)) for v in item.get("box", [0, 0, 0, 0])]
            if x2 <= x1 or y2 <= y1:
                continue

            pad = 6
            x1 = max(0, x1 - pad)
            y1 = max(0, y1 - pad)
            x2 = min(img.shape[1], x2 + pad)
            y2 = min(img.shape[0], y2 + pad)
            crop = img[y1:y2, x1:x2]
            mask = _mask_dark_digit(crop)
            vec = _digit_to_unit_vector(mask)
            if vec is None:
                continue

            score = float(item.get("score", 0.0))
            if digit not in templates or score > best_scores.get(digit, -1.0):
                templates[digit] = vec
                best_scores[digit] = score

        return templates
    except Exception:
        return {}


def parse_paddle_v3_result(page_result, scale: float):
    items = []

    if not isinstance(page_result, dict):
        return items

    rec_texts = page_result.get("rec_texts", [])
    rec_scores = page_result.get("rec_scores", [])

    boxes = first_non_empty(
        page_result.get("rec_boxes"),
        page_result.get("rec_polys"),
        page_result.get("dt_polys"),
        page_result.get("det_polys"),
    )

    rec_texts = to_python_value(rec_texts) or []
    rec_scores = to_python_value(rec_scores) or []
    boxes = to_python_value(boxes) or []

    for idx, text in enumerate(rec_texts):
        score = rec_scores[idx] if idx < len(rec_scores) else 1.0
        box = boxes[idx] if idx < len(boxes) else [0, 0, 0, 0]

        norm_box = normalize_box(box)
        norm_box = scale_box_down(norm_box, scale)

        items.append({
            "text": str(text).strip(),
            "score": float(score),
            "box": norm_box,
        })

    return items


def parse_paddle_v2_result(page_result, scale: float):
    items = []

    if not page_result:
        return items

    for entry in page_result:
        try:
            points = entry[0]
            text = str(entry[1][0]).strip()
            score = float(entry[1][1])

            norm_box = normalize_box(points)
            norm_box = scale_box_down(norm_box, scale)

            items.append({
                "text": text,
                "score": score,
                "box": norm_box,
            })

        except Exception:
            continue

    return items


def run_ocr(image_path: str, scale: int = 2):
    scale = max(1, int(scale))

    prepared_path = image_path + "_ocr.png"
    prepared_path, scale_factor = prepare_ocr_image(
        image_path,
        prepared_path,
        scale=scale,
    )

    try:
        result = get_ocr().ocr(prepared_path)

        items = []

        if result is None:
            return items

        for page_result in result:
            if isinstance(page_result, dict):
                items.extend(parse_paddle_v3_result(page_result, scale_factor))
            else:
                items.extend(parse_paddle_v2_result(page_result, scale_factor))

        return items

    finally:
        if os.path.exists(prepared_path):
            os.remove(prepared_path)


def run_ocr_rec_only(image_path: str, scale: int = 2):
    """
    OCR optimized for small single-digit crops.
    Attempts to use a recognition-only OCR pipeline to avoid detection overhead.
    Returns items compatible with choose_best_digit_* helpers.
    """
    scale = max(1, int(scale))

    prepared_path = image_path + "_ocr.png"
    prepared_path, scale_factor = prepare_ocr_image(
        image_path,
        prepared_path,
        scale=scale,
    )

    try:
        ocr = get_ocr_rec_only()

        # Different PaddleOCR versions accept different call signatures.
        try:
            result = ocr.ocr(prepared_path, det=False, rec=True)
        except TypeError:
            try:
                result = ocr.ocr(prepared_path, det=False)
            except TypeError:
                result = ocr.ocr(prepared_path)

        items = []
        if result is None:
            return items

        # When det=False, some versions return a list of [text, score] pairs per image.
        for page_result in result:
            if isinstance(page_result, dict):
                # v3 style: reuse existing parser (boxes may be absent; parser handles missing)
                items.extend(parse_paddle_v3_result(page_result, scale_factor))
                continue

            if isinstance(page_result, list):
                # Common shapes:
                # - [[text, score], [text, score], ...]
                # - [[box, [text, score]], ...] (rare even with det=False)
                for entry in page_result:
                    try:
                        if isinstance(entry, (list, tuple)) and len(entry) == 2 and isinstance(entry[0], str):
                            text = str(entry[0]).strip()
                            score = float(entry[1])
                            items.append({"text": text, "score": score, "box": [0, 0, 0, 0]})
                        elif isinstance(entry, (list, tuple)) and len(entry) == 2 and isinstance(entry[1], (list, tuple)):
                            text = str(entry[1][0]).strip()
                            score = float(entry[1][1])
                            items.append({"text": text, "score": score, "box": [0, 0, 0, 0]})
                    except Exception:
                        continue

        return items

    finally:
        if os.path.exists(prepared_path):
            os.remove(prepared_path)


def crop_image(image_path: str, crop_box: Box, save_path: str):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    left, top, right, bottom = crop_box

    left = max(0, min(left, width))
    right = max(0, min(right, width))
    top = max(0, min(top, height))
    bottom = max(0, min(bottom, height))

    if right <= left or bottom <= top:
        raise ValueError(f"잘못된 crop 영역입니다. image_size={img.size}, crop_box={crop_box}")

    img.crop((left, top, right, bottom)).save(save_path)

    return save_path


def crop_bgr_by_box(bgr: np.ndarray, crop_box: Box) -> Optional[np.ndarray]:
    """
    Crop a BGR ndarray by (left, top, right, bottom). Returns a copy.
    """
    if bgr is None:
        return None
    try:
        height, width = bgr.shape[:2]
        left, top, right, bottom = crop_box
        left = max(0, min(int(left), width))
        right = max(0, min(int(right), width))
        top = max(0, min(int(top), height))
        bottom = max(0, min(int(bottom), height))
        if right <= left or bottom <= top:
            return None
        return bgr[top:bottom, left:right].copy()
    except Exception:
        return None


def detect_white_modal_box(image_path: str) -> Box:
    img = cv2.imread(image_path)

    if img is None:
        raise ValueError("이미지를 읽지 못했습니다.")

    height, width = img.shape[:2]
    ignore_top = int(height * 0.10)

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    lower = np.array([220, 220, 220], dtype=np.uint8)
    upper = np.array([255, 255, 255], dtype=np.uint8)

    mask = cv2.inRange(rgb, lower, upper)
    mask[:ignore_top, :] = 0

    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    candidates = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h

        if area < 30000:
            continue

        if w < 200 or h < 220:
            continue

        if w > width * 0.8 or h > height * 0.9:
            continue

        aspect = w / h

        if aspect < 0.35 or aspect > 1.6:
            continue

        center_x = x + w / 2
        center_y = y + h / 2
        distance = abs(center_x - width / 2) + abs(center_y - height / 2)
        score = area - distance * 30

        candidates.append((score, x, y, w, h))

    if not candidates:
        raise ValueError("흰색 보안 인증 모달을 찾지 못했습니다.")

    candidates.sort(reverse=True)
    _, x, y, w, h = candidates[0]

    pad = 4

    return (
        max(0, x - pad),
        max(0, y - pad),
        min(width, x + w + pad),
        min(height, y + h + pad),
    )


def derive_security_boxes(modal_box: Box):
    left, top, right, bottom = modal_box

    w = right - left
    h = bottom - top

    order_box = (
        int(left + w * 0.10),
        int(top + h * 0.22),
        int(right - w * 0.10),
        int(top + h * 0.38),
    )

    keypad_box = (
        int(left + w * 0.10),
        int(top + h * 0.38),
        int(right - w * 0.10),
        int(top + h * 0.88),
    )

    return order_box, keypad_box


def extract_digits_from_text(text: str):
    raw = str(text or "")
    if not raw:
        return []

    # Common OCR confusions for simple keypad digits.
    # Keep this conservative: only map glyphs that are very frequently misread.
    char_map = {
        "O": "0",
        "o": "0",
        "D": "0",
        "Q": "0",
        "I": "1",
        "l": "1",
        "|": "1",
        "!": "1",
        "Z": "2",
        "z": "2",
        "S": "5",
        "s": "5",
        "G": "6",
        "B": "8",
        "b": "6",  # sometimes "6" is read as "b"
        "T": "7",
        "?": "7",
    }

    digits: List[str] = []

    # Normalize fullwidth digits to ASCII.
    for ch in raw:
        if "０" <= ch <= "９":
            digits.append(str(ord(ch) - ord("０")))
            continue

        # Circled digits ①..⑨ (U+2460..U+2468)
        codepoint = ord(ch)
        if 0x2460 <= codepoint <= 0x2468:
            digits.append(str(codepoint - 0x2460 + 1))
            continue

        # Double circled digits ⓵..⓽ (U+24F5..U+24FD)
        if 0x24F5 <= codepoint <= 0x24FD:
            digits.append(str(codepoint - 0x24F5 + 1))
            continue

        if ch.isdigit():
            digits.append(ch)
            continue

        mapped = char_map.get(ch)
        if mapped is not None:
            digits.append(mapped)

    if digits:
        return digits

    # Last resort: extract any ASCII digits from the string.
    return re.findall(r"\d", raw)


def choose_best_digit_from_items(items: List[Dict[str, Any]], min_score: float = OCR_MIN_SCORE) -> Optional[str]:
    candidates = []

    for item in items:
        score = float(item.get("score", 0.0))
        text = str(item.get("text", "")).strip()
        digits = extract_digits_from_text(text)

        if not digits:
            continue

        if score < float(min_score or 0.0):
            continue

        for digit in digits:
            candidates.append((score, digit, text))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def choose_best_digit_with_score(
    items: List[Dict[str, Any]],
    min_score: float = OCR_MIN_SCORE,
) -> Tuple[Optional[str], float]:
    """
    Same selection logic as choose_best_digit_from_items, but returns (digit, score).
    """
    candidates: List[Tuple[float, str]] = []
    for item in items:
        score = float(item.get("score", 0.0))
        if score < float(min_score or 0.0):
            continue
        text = str(item.get("text", "")).strip()
        digits = extract_digits_from_text(text)
        if not digits:
            continue
        for digit in digits:
            candidates.append((score, digit))

    if not candidates:
        return None, 0.0

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1], float(candidates[0][0])


def split_order_box_into_slots(order_box: Box) -> List[Box]:
    left, top, right, bottom = order_box

    width = right - left
    height = bottom - top

    # order_box가 넓게 잡혀 있어도 안내 문구와 아래 라인을 줄이기 위해 내부 여백을 둠
    inner_left = int(left + width * 0.03)
    inner_right = int(right - width * 0.03)
    inner_top = int(top + height * 0.08)
    inner_bottom = int(bottom - height * 0.08)

    inner_width = inner_right - inner_left
    slot_width = inner_width / 3.0

    slots = []

    for idx in range(3):
        slot_left = int(inner_left + slot_width * idx)
        slot_right = int(inner_left + slot_width * (idx + 1))

        # 화살표가 칸 사이에 있으면 OCR을 방해하므로 각 슬롯 좌우를 살짝 줄임
        pad_x = int(slot_width * 0.12)

        crop_left = slot_left + pad_x
        crop_right = slot_right - pad_x

        slots.append((
            crop_left,
            inner_top,
            crop_right,
            inner_bottom,
        ))

    return slots


def extract_sequence_by_slots(
    image_path: str,
    order_box: Box,
    ocr_scale: int,
    templates: Optional[Dict[str, np.ndarray]] = None,
):
    sequence: List[str] = []
    slot_boxes = split_order_box_into_slots(order_box)
    slot_scores: List[float] = []
    overrides = _load_label_overrides()

    temp_paths = []

    try:
        for idx, slot_box in enumerate(slot_boxes):
            slot_path = f"{image_path}_order_slot_{idx}.png"
            temp_paths.append(slot_path)

            crop_image(image_path, slot_box, slot_path)

            # Try template matching first (learning-free, uses keypad-derived templates).
            try:
                if templates:
                    slot_bgr = cv2.imread(slot_path, cv2.IMREAD_COLOR)
                    if slot_bgr is not None:
                        t_digit, t_score = _template_match_digit(slot_bgr, templates)
                        if t_digit is not None and t_score >= 0.35:
                            sequence.append(t_digit)
                            slot_scores.append(float(max(0.0, min(1.0, t_score))))
                            continue
            except Exception:
                pass

            slot_hash = _sha256_file(slot_path)
            if slot_hash and slot_hash in overrides:
                sequence.append(overrides[slot_hash])
                slot_scores.append(1.0)
                continue

            # scale이 1이면 작은 숫자가 흔들릴 수 있으니 order 슬롯은 최소 2로 보정
            slot_scale = max(2, int(ocr_scale))
            items = run_ocr(slot_path, scale=slot_scale)

            digit, digit_score = choose_best_digit_with_score(items, min_score=min(OCR_MIN_SCORE, 0.10))
            candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is None:
                # 한 번 더 큰 scale로 재시도
                retry_scale = max(3, slot_scale + 1)
                items = run_ocr(slot_path, scale=retry_scale)
                digit, digit_score = choose_best_digit_with_score(items, min_score=min(OCR_MIN_SCORE, 0.10))
                if not candidates:
                    candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is not None:
                digit = _heuristic_fix_1_vs_7(slot_path, digit)
                sequence.append(digit)
                slot_scores.append(float(digit_score))
            else:
                slot_scores.append(0.0)

            # Record what OCR predicted so it can be corrected later.
            try:
                if slot_hash:
                    unlabeled_copy = _save_unlabeled_image_copy(slot_path, kind=f"order_slot_{idx}", image_hash=slot_hash)
                    _append_pending_label({
                        "ts": datetime.now().isoformat(timespec="seconds"),
                        "kind": "order",
                        "slot_index": idx,
                        "hash": slot_hash,
                        "predicted": digit,
                        "score": float(digit_score or 0.0),
                        "candidates": candidates,
                        "image": unlabeled_copy,
                    })
            except Exception:
                pass

        return sequence, slot_boxes, slot_scores

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


def extract_sequence_fallback(order_items):
    filtered = []

    for item in order_items:
        if item.get("score", 0) < min(OCR_MIN_SCORE, 0.10):
            continue

        digits = extract_digits_from_text(item.get("text", ""))

        if not digits:
            continue

        filtered.append(item)

    filtered.sort(key=lambda item: item["box"][0])

    sequence = []

    for item in filtered:
        sequence.extend(extract_digits_from_text(item.get("text", "")))

    return sequence


def extract_keypad_buttons(keypad_items, offset_x: int, offset_y: int):
    buttons = {}

    for item in keypad_items:
        if item.get("score", 0) < OCR_MIN_SCORE:
            continue

        digits = extract_digits_from_text(item.get("text", ""))

        if len(digits) != 1:
            continue

        digit = digits[0]
        x1, y1, x2, y2 = item["box"]

        if x2 <= x1 or y2 <= y1:
            continue

        cx = (x1 + x2) / 2 + offset_x
        cy = (y1 + y2) / 2 + offset_y

        buttons[digit] = [float(cx), float(cy)]

    return buttons


def _split_box_into_grid(box: Box, rows: int, cols: int, pad_ratio: float = 0.06) -> List[Box]:
    left, top, right, bottom = box
    w = right - left
    h = bottom - top
    if w <= 0 or h <= 0:
        return []

    inner_left = int(left + w * 0.04)
    inner_right = int(right - w * 0.04)
    inner_top = int(top + h * 0.04)
    inner_bottom = int(bottom - h * 0.04)

    inner_w = inner_right - inner_left
    inner_h = inner_bottom - inner_top
    if inner_w <= 0 or inner_h <= 0:
        return []

    cell_w = inner_w / float(cols)
    cell_h = inner_h / float(rows)

    boxes: List[Box] = []
    for r in range(rows):
        for c in range(cols):
            x1 = int(inner_left + c * cell_w)
            x2 = int(inner_left + (c + 1) * cell_w)
            y1 = int(inner_top + r * cell_h)
            y2 = int(inner_top + (r + 1) * cell_h)

            pad_x = int((x2 - x1) * pad_ratio)
            pad_y = int((y2 - y1) * pad_ratio)
            boxes.append((x1 + pad_x, y1 + pad_y, x2 - pad_x, y2 - pad_y))

    return boxes


def extract_keypad_buttons_by_grid(
    image_path: str,
    keypad_box: Box,
    ocr_scale: int,
    rows: int = 4,
    cols: int = 3,
) -> Tuple[Dict[str, List[float]], Dict[str, np.ndarray]]:
    # Grid OCR: split keypad into NxM cells and OCR each cell.
    rows = max(2, int(rows))
    cols = max(2, int(cols))
    cells = _split_box_into_grid(keypad_box, rows=rows, cols=cols, pad_ratio=0.10)
    if not cells:
        return {}, {}

    buttons: Dict[str, List[float]] = {}
    templates: Dict[str, np.ndarray] = {}
    temp_paths: List[str] = []
    overrides = _load_label_overrides()

    try:
        for idx, cell in enumerate(cells):
            cell_path = f"{image_path}_keypad_cell_{idx}.png"
            temp_paths.append(cell_path)
            crop_image(image_path, cell, cell_path)

            cell_hash = _sha256_file(cell_path)
            if cell_hash and cell_hash in overrides:
                digit = overrides[cell_hash]
                digit = _heuristic_fix_1_vs_7(cell_path, digit)
                if digit in buttons:
                    continue
                cx = (cell[0] + cell[2]) / 2.0
                cy = (cell[1] + cell[3]) / 2.0
                buttons[digit] = [float(cx), float(cy)]
                continue

            # Per-cell OCR benefits from higher scale; use rec-only path to avoid detection overhead.
            cell_scale = max(3, int(ocr_scale) + 1)
            items = run_ocr_rec_only(cell_path, scale=cell_scale)
            digit = choose_best_digit_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))
            candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is None:
                # Retry with even higher scale.
                items = run_ocr_rec_only(cell_path, scale=max(4, cell_scale + 1))
                digit = choose_best_digit_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))
                if not candidates:
                    candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is None:
                continue

            digit = _heuristic_fix_1_vs_7(cell_path, digit)

            # Build a template vector from this cell crop for later order-slot matching.
            try:
                bgr = cv2.imread(cell_path, cv2.IMREAD_COLOR)
                if bgr is not None:
                    mask = _mask_dark_digit(bgr)
                    vec = _digit_to_unit_vector(mask)
                    if vec is not None and digit not in templates:
                        templates[digit] = vec
            except Exception:
                pass

            try:
                if cell_hash:
                    unlabeled_copy = _save_unlabeled_image_copy(cell_path, kind=f"keypad_cell_{idx}", image_hash=cell_hash)
                    _append_pending_label({
                        "ts": datetime.now().isoformat(timespec="seconds"),
                        "kind": "keypad",
                        "cell_index": idx,
                        "hash": cell_hash,
                        "predicted": digit,
                        "candidates": candidates,
                        "image": unlabeled_copy,
                    })
            except Exception:
                pass

            if digit in buttons:
                # Keep the first occurrence; duplicates are likely misreads.
                continue

            cx = (cell[0] + cell[2]) / 2.0
            cy = (cell[1] + cell[3]) / 2.0
            buttons[digit] = [float(cx), float(cy)]

        return buttons, templates

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


def extract_sequence_by_slots_cv(
    bgr_full: np.ndarray,
    order_box: Box,
    keypad_cell_vectors: List[Tuple[np.ndarray, List[float]]],
) -> Tuple[List[str], Dict[str, List[float]], List[Box], List[float]]:
    """
    CV-only order-sequence extraction.
    - Uses shape matching (cosine similarity) between:
      - order-slot blue digit vectors
      - keypad-cell dark digit vectors
    - Uses label_overrides.json when available.
    - Does NOT call PaddleOCR (no OCR fallback).
    """
    sequence: List[str] = []
    buttons: Dict[str, List[float]] = {}
    used_cell_indices = set()
    slot_boxes = split_order_box_into_slots(order_box)
    slot_scores: List[float] = []

    try:
        for idx, slot_box in enumerate(slot_boxes):
            slot_bgr = crop_bgr_by_box(bgr_full, slot_box)
            if slot_bgr is None:
                slot_scores.append(0.0)
                continue

            mask = _mask_blue_digit(slot_bgr)
            slot_vec = _digit_to_unit_vector(mask, size=32)
            if slot_vec is None:
                slot_scores.append(0.0)
                continue

            best_idx = None
            best_score = -1.0
            for cell_idx, (cell_vec, cell_center) in enumerate(keypad_cell_vectors or []):
                if cell_vec is None:
                    continue
                if cell_idx in used_cell_indices:
                    continue
                try:
                    score = float(np.dot(slot_vec, cell_vec))
                except Exception:
                    continue
                if score > best_score:
                    best_score = score
                    best_idx = cell_idx

            if best_idx is None:
                slot_scores.append(0.0)
                continue

            key = f"s{idx + 1}"
            sequence.append(key)
            # lock the chosen cell by putting an entry into buttons under a unique key
            _, chosen_center = keypad_cell_vectors[best_idx]
            buttons[key] = chosen_center
            used_cell_indices.add(best_idx)
            slot_scores.append(float(max(0.0, min(1.0, best_score))))

        return sequence, buttons, slot_boxes, slot_scores

    finally:
        pass


def solve_security_challenge_cv(
    image_path: str = SCREENSHOT_PATH,
    mode: str = "auto",
    order_box=None,
    keypad_box=None,
    keypad_cells=None,
) -> Dict[str, Any]:
    """
    CV-only solver (no PaddleOCR).
    Requires keypad_cells (pre-split boxes) for reliability.
    """
    modal_box, resolved_order_box, resolved_keypad_box = resolve_security_boxes(
        image_path=image_path,
        mode=mode,
        order_box=order_box,
        keypad_box=keypad_box,
    )

    parsed_cells = _parse_keypad_cells(keypad_cells)
    if not parsed_cells:
        raise ValueError("cv mode requires keypad_cells (generate once in GUI and save).")

    bgr_full = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if bgr_full is None:
        raise ValueError("failed to read image")

    timings: Dict[str, Any] = {
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "steps": [],
    }

    def _time_step(name: str, fn):
        start = time.perf_counter()
        out = fn()
        timings["steps"].append({"name": name, "ms": round((time.perf_counter() - start) * 1000.0, 2)})
        return out

    def _keypad_vectors():
        vectors: List[Tuple[np.ndarray, List[float]]] = []
        for cell in parsed_cells:
            crop = crop_bgr_by_box(bgr_full, cell)
            if crop is None:
                continue
            mask = _mask_dark_digit(crop)
            vec = _digit_to_unit_vector(mask, size=32)
            if vec is None:
                continue
            cx = (cell[0] + cell[2]) / 2.0
            cy = (cell[1] + cell[3]) / 2.0
            vectors.append((vec, [float(cx), float(cy)]))
        return vectors

    keypad_cell_vectors = _time_step("keypad_cells_cv_vectors", _keypad_vectors)
    if not keypad_cell_vectors:
        raise RuntimeError("cv keypad failed to extract cell vectors")

    sequence, buttons, order_slot_boxes, order_slot_scores = _time_step(
        "extract_order_sequence_cv",
        lambda: extract_sequence_by_slots_cv(
            bgr_full=bgr_full,
            order_box=resolved_order_box,
            keypad_cell_vectors=keypad_cell_vectors,
        ),
    )

    if len(sequence) < 3:
        raise RuntimeError(f"cv order sequence not found. sequence={sequence}")

    sequence = sequence[:3]

    # Sequence keys are s1..s3 mapped to click points.
    for key in sequence:
        if key not in buttons:
            raise RuntimeError(f"cv missing click point for {key}. buttons={buttons}")

    return {
        "sequence": sequence,
        "buttons": buttons,
        "mode": mode,
        "modal_box": box_to_text(modal_box),
        "order_box": box_to_text(resolved_order_box),
        "keypad_box": box_to_text(resolved_keypad_box),
        "timings": timings,
    }

def _parse_keypad_cells(value) -> Optional[List[Box]]:
    """
    Parse keypad_cells from request/config into a list of Box.
    Accepts:
    - list of [l,t,r,b]
    - JSON string of that list
    """
    if value is None:
        return None

    raw = value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            raw = json.loads(s)
        except Exception:
            return None

    if not isinstance(raw, list) or not raw:
        return None

    out: List[Box] = []
    for item in raw:
        try:
            if not isinstance(item, (list, tuple)) or len(item) != 4:
                continue
            left, top, right, bottom = [int(float(v)) for v in item]
            if right <= left or bottom <= top:
                continue
            out.append((left, top, right, bottom))
        except Exception:
            continue

    return out or None


def extract_keypad_buttons_by_cells(
    image_path: str,
    cells: List[Box],
    ocr_scale: int,
) -> Tuple[Dict[str, List[float]], Dict[str, np.ndarray]]:
    """
    Use pre-defined keypad cell boxes to map digit -> click point.
    This avoids any detection step on the keypad area.
    """
    if not cells:
        return {}, {}

    buttons: Dict[str, List[float]] = {}
    templates: Dict[str, np.ndarray] = {}
    temp_paths: List[str] = []
    overrides = _load_label_overrides()

    try:
        for idx, cell in enumerate(cells):
            cell_path = f"{image_path}_keypad_cell_{idx}.png"
            temp_paths.append(cell_path)
            crop_image(image_path, cell, cell_path)

            cell_hash = _sha256_file(cell_path)
            if cell_hash and cell_hash in overrides:
                digit = overrides[cell_hash]
                digit = _heuristic_fix_1_vs_7(cell_path, digit)
                if digit not in buttons:
                    cx = (cell[0] + cell[2]) / 2.0
                    cy = (cell[1] + cell[3]) / 2.0
                    buttons[digit] = [float(cx), float(cy)]
                continue

            cell_scale = max(3, int(ocr_scale) + 1)
            items = run_ocr_rec_only(cell_path, scale=cell_scale)
            digit = choose_best_digit_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))
            candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is None:
                items = run_ocr_rec_only(cell_path, scale=max(4, cell_scale + 1))
                digit = choose_best_digit_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))
                if not candidates:
                    candidates = _digit_candidates_from_items(items, min_score=min(OCR_MIN_SCORE, 0.10))

            if digit is None:
                continue

            digit = _heuristic_fix_1_vs_7(cell_path, digit)

            # Build a template vector from this cell crop for later order-slot matching.
            try:
                bgr = cv2.imread(cell_path, cv2.IMREAD_COLOR)
                if bgr is not None:
                    mask = _mask_dark_digit(bgr)
                    vec = _digit_to_unit_vector(mask)
                    if vec is not None and digit not in templates:
                        templates[digit] = vec
            except Exception:
                pass

            try:
                if cell_hash:
                    unlabeled_copy = _save_unlabeled_image_copy(cell_path, kind=f"keypad_cell_{idx}", image_hash=cell_hash)
                    _append_pending_label({
                        "ts": datetime.now().isoformat(timespec="seconds"),
                        "kind": "keypad",
                        "cell_index": idx,
                        "hash": cell_hash,
                        "predicted": digit,
                        "candidates": candidates,
                        "image": unlabeled_copy,
                    })
            except Exception:
                pass

            if digit in buttons:
                continue

            cx = (cell[0] + cell[2]) / 2.0
            cy = (cell[1] + cell[3]) / 2.0
            buttons[digit] = [float(cx), float(cy)]

        return buttons, templates

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


def save_debug_image(
    image_path: str,
    sequence,
    buttons,
    modal_box: Optional[Box],
    order_box: Optional[Box],
    keypad_box: Optional[Box],
    mode: str,
    order_slot_boxes: Optional[List[Box]] = None,
):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    if modal_box is not None:
        draw.rectangle(modal_box, outline="yellow", width=4)

    if order_box is not None:
        draw.rectangle(order_box, outline="blue", width=3)

    if order_slot_boxes:
        colors = ["cyan", "cyan", "cyan"]

        for idx, slot_box in enumerate(order_slot_boxes):
            draw.rectangle(slot_box, outline=colors[idx % len(colors)], width=2)
            draw.text((slot_box[0], max(0, slot_box[1] - 16)), f"slot{idx + 1}", fill="cyan")

    if keypad_box is not None:
        draw.rectangle(keypad_box, outline="green", width=3)

    for digit, point in buttons.items():
        x, y = point
        r = 7
        draw.ellipse((x - r, y - r, x + r, y + r), outline="red", width=3)
        draw.text((x + 10, y - 10), digit, fill="red")

    draw.text((20, 20), f"mode: {mode}", fill="red")
    draw.text((20, 42), f"security sequence: {' '.join(sequence)}", fill="red")

    img.save(DEBUG_IMAGE_PATH)


def _safe_copy(src: str, dst: str) -> None:
    try:
        if src and os.path.exists(src):
            shutil.copy2(src, dst)
    except Exception:
        pass


def _sha256_file(path: str) -> Optional[str]:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


def _load_json_file(path: Path) -> Any:
    try:
        if not path.is_file():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_json_file(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_label_overrides() -> Dict[str, str]:
    """
    Map: sha256(image_bytes) -> digit string ("0".."9").
    User can edit this file while automation runs.
    """
    overrides_path = Path(OCR_LABEL_DIR) / "label_overrides.json"
    data = _load_json_file(overrides_path)
    if isinstance(data, dict):
        out: Dict[str, str] = {}
        for k, v in data.items():
            if isinstance(k, str) and isinstance(v, str) and v.strip().isdigit():
                out[k] = v.strip()
        return out
    return {}


def _append_pending_label(record: Dict[str, Any]) -> None:
    """
    Append a jsonl record for manual inspection/correction.
    """
    try:
        base = Path(OCR_LABEL_DIR)
        base.mkdir(parents=True, exist_ok=True)
        pending_path = base / "pending.jsonl"
        with pending_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _save_unlabeled_image_copy(src_path: str, kind: str, image_hash: str) -> Optional[str]:
    try:
        base = Path(OCR_LABEL_DIR) / "unlabeled"
        base.mkdir(parents=True, exist_ok=True)
        dst = base / f"{kind}__{image_hash}.png"
        if not dst.exists():
            shutil.copy2(src_path, dst)
        return str(dst)
    except Exception:
        return None


def _digit_candidates_from_items(items: List[Dict[str, Any]], min_score: float) -> List[Dict[str, Any]]:
    """
    Produce a compact candidate list: [{digit, score, text}] sorted by score desc.
    """
    candidates: List[Tuple[float, str, str]] = []
    for item in items or []:
        try:
            score = float(item.get("score", 0.0))
        except Exception:
            score = 0.0
        if score < float(min_score or 0.0):
            continue
        text = str(item.get("text", "")).strip()
        digits = extract_digits_from_text(text)
        for d in digits:
            candidates.append((score, d, text))

    candidates.sort(key=lambda x: x[0], reverse=True)
    out: List[Dict[str, Any]] = []
    seen = set()
    for score, d, text in candidates:
        if d in seen:
            continue
        seen.add(d)
        out.append({"digit": d, "score": float(score), "text": text})
        if len(out) >= 5:
            break
    return out


def _save_failure_bundle(
    image_path: str,
    error: Exception,
    *,
    modal_box: Optional[Box],
    order_box: Optional[Box],
    keypad_box: Optional[Box],
    ocr_scale: int,
    mode: str,
    sequence: Optional[List[str]] = None,
    buttons: Optional[Dict[str, List[float]]] = None,
    order_slot_boxes: Optional[List[Box]] = None,
    order_slot_scores: Optional[List[float]] = None,
    order_items: Optional[List[Dict[str, Any]]] = None,
    keypad_items: Optional[List[Dict[str, Any]]] = None,
    grid_buttons: Optional[Dict[str, List[float]]] = None,
) -> Optional[str]:
    """
    Persist failure artifacts so we can build a dataset without breaking automation.
    Bundle includes source screenshot, debug overlay, crops, and raw OCR JSON.

    Enable unconditionally by keeping this function called on exceptions.
    """
    try:
        base_dir = Path(__file__).resolve().parent / "failures"
        base_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        bundle_dir = base_dir / f"{ts}_{uuid.uuid4().hex[:8]}"
        bundle_dir.mkdir(parents=True, exist_ok=True)

        # Save main images
        _safe_copy(image_path, str(bundle_dir / "screen.png"))
        _safe_copy(DEBUG_IMAGE_PATH, str(bundle_dir / "debug_result.png"))

        # Save crops (best effort)
        try:
            if order_box is not None:
                crop_image(image_path, order_box, str(bundle_dir / "order.png"))
        except Exception:
            pass
        try:
            if keypad_box is not None:
                crop_image(image_path, keypad_box, str(bundle_dir / "keypad.png"))
        except Exception:
            pass

        # Save order slot crops if available
        if order_slot_boxes:
            for idx, box in enumerate(order_slot_boxes):
                try:
                    crop_image(image_path, box, str(bundle_dir / f"order_slot_{idx}.png"))
                except Exception:
                    continue

        payload = {
            "error": {
                "type": type(error).__name__,
                "message": str(error),
            },
            "context": {
                "mode": mode,
                "ocr_scale": int(ocr_scale),
                "modal_box": box_to_text(modal_box) if modal_box is not None else None,
                "order_box": box_to_text(order_box) if order_box is not None else None,
                "keypad_box": box_to_text(keypad_box) if keypad_box is not None else None,
            },
            "outputs": {
                "sequence": sequence or [],
                "order_slot_scores": order_slot_scores or [],
                "buttons": buttons or {},
                "grid_buttons": grid_buttons or {},
            },
            "raw": {
                "order_items": order_items or [],
                "keypad_items": keypad_items or [],
            },
        }

        (bundle_dir / "failure.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return str(bundle_dir)
    except Exception:
        return None


def _save_sample_bundle(
    image_path: str,
    *,
    modal_box: Optional[Box],
    order_box: Optional[Box],
    keypad_box: Optional[Box],
    ocr_scale: int,
    mode: str,
    sequence: Optional[List[str]] = None,
    buttons: Optional[Dict[str, List[float]]] = None,
    order_slot_boxes: Optional[List[Box]] = None,
    order_slot_scores: Optional[List[float]] = None,
    order_items: Optional[List[Dict[str, Any]]] = None,
    keypad_items: Optional[List[Dict[str, Any]]] = None,
    grid_buttons: Optional[Dict[str, List[float]]] = None,
) -> Optional[str]:
    """
    Persist a non-failure sample for dataset building (e.g., ambiguous digits).
    """
    try:
        base_dir = Path(__file__).resolve().parent / "samples"
        base_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        bundle_dir = base_dir / f"{ts}_{uuid.uuid4().hex[:8]}"
        bundle_dir.mkdir(parents=True, exist_ok=True)

        _safe_copy(image_path, str(bundle_dir / "screen.png"))
        _safe_copy(DEBUG_IMAGE_PATH, str(bundle_dir / "debug_result.png"))

        try:
            if order_box is not None:
                crop_image(image_path, order_box, str(bundle_dir / "order.png"))
        except Exception:
            pass
        try:
            if keypad_box is not None:
                crop_image(image_path, keypad_box, str(bundle_dir / "keypad.png"))
        except Exception:
            pass

        if order_slot_boxes:
            for idx, box in enumerate(order_slot_boxes):
                try:
                    crop_image(image_path, box, str(bundle_dir / f"order_slot_{idx}.png"))
                except Exception:
                    continue

        payload = {
            "context": {
                "mode": mode,
                "ocr_scale": int(ocr_scale),
                "modal_box": box_to_text(modal_box) if modal_box is not None else None,
                "order_box": box_to_text(order_box) if order_box is not None else None,
                "keypad_box": box_to_text(keypad_box) if keypad_box is not None else None,
            },
            "outputs": {
                "sequence": sequence or [],
                "order_slot_scores": order_slot_scores or [],
                "buttons": buttons or {},
                "grid_buttons": grid_buttons or {},
            },
            "raw": {
                "order_items": order_items or [],
                "keypad_items": keypad_items or [],
            },
        }

        (bundle_dir / "sample.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return str(bundle_dir)
    except Exception:
        return None


def resolve_security_boxes(
    image_path: str,
    mode: str = "auto",
    order_box=None,
    keypad_box=None,
):
    mode = (mode or "auto").lower().strip()

    if mode == "manual":
        parsed_order_box = parse_box(order_box)
        parsed_keypad_box = parse_box(keypad_box)

        if parsed_order_box is None or parsed_keypad_box is None:
            raise ValueError("manual 모드에서는 order_box, keypad_box가 필요합니다.")

        return None, parsed_order_box, parsed_keypad_box

    modal_box = detect_white_modal_box(image_path)
    auto_order_box, auto_keypad_box = derive_security_boxes(modal_box)

    return modal_box, auto_order_box, auto_keypad_box


def solve_security_challenge(
    image_path: str = SCREENSHOT_PATH,
    mode: str = "auto",
    order_box=None,
    keypad_box=None,
    keypad_cells=None,
    ocr_scale: int = 2,
):
    ocr_scale = max(2, int(ocr_scale or 2))
    config = _load_ocr_config()
    if not isinstance(config, dict):
        config = {}
    env_grid_first = _parse_bool_env(os.getenv("OCR_KEYPAD_GRID_FIRST"))
    # Default OFF for performance. Enable explicitly when you want per-cell recovery.
    keypad_grid_first = env_grid_first if env_grid_first is not None else bool(config.get("keypad_grid_first", False))
    grid_rows = _parse_int(os.getenv("OCR_KEYPAD_GRID_ROWS"), default=_parse_int(config.get("keypad_grid_rows"), 4))
    grid_cols = _parse_int(os.getenv("OCR_KEYPAD_GRID_COLS"), default=_parse_int(config.get("keypad_grid_cols"), 3))
    grid_rows = max(2, min(grid_rows, 6))
    grid_cols = max(2, min(grid_cols, 6))

    modal_box, resolved_order_box, resolved_keypad_box = resolve_security_boxes(
        image_path=image_path,
        mode=mode,
        order_box=order_box,
        keypad_box=keypad_box,
    )

    keypad_path = image_path + "_keypad.png"
    order_slot_boxes = []
    order_items = None
    keypad_items = None
    grid_buttons = None
    sequence = []
    buttons = {}
    order_slot_scores = []
    timings: Dict[str, Any] = {
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "steps": [],
    }

    def _time_step(name: str, fn):
        start = time.perf_counter()
        out = fn()
        timings["steps"].append({"name": name, "ms": round((time.perf_counter() - start) * 1000.0, 2)})
        return out

    try:
        # order는 3개 슬롯으로 나눠서 각각 OCR
        # Keypad first: contains all digits and is easier/more stable to recognize.
        # Speed: prefer grid-based per-cell OCR to avoid the expensive det(dt_boxes) pass on the whole keypad.
        _time_step("crop_keypad", lambda: crop_image(image_path, resolved_keypad_box, keypad_path))
        keypad_items = _time_step("ocr_keypad", lambda: run_ocr(keypad_path, scale=max(2, int(ocr_scale))))

        buttons = _time_step(
            "extract_keypad_buttons",
            lambda: extract_keypad_buttons(
                keypad_items,
                offset_x=resolved_keypad_box[0],
                offset_y=resolved_keypad_box[1],
            ),
        )

        templates: Dict[str, np.ndarray] = _time_step(
            "build_keypad_templates",
            lambda: build_keypad_digit_templates(keypad_path, keypad_items or []),
        )

        parsed_cells = _parse_keypad_cells(keypad_cells)
        # Recovery is opt-in:
        # - Provide keypad_cells in the request, or
        # - Enable OCR_KEYPAD_GRID_FIRST / keypad_grid_first.
        if len(buttons) < 8 and (parsed_cells is not None or keypad_grid_first):
            try:
                fill_buttons, fill_templates = _time_step(
                    "keypad_recovery_fill",
                    lambda: (
                        extract_keypad_buttons_by_cells(
                            image_path=image_path,
                            cells=parsed_cells,
                            ocr_scale=ocr_scale,
                        )
                        if parsed_cells
                        else extract_keypad_buttons_by_grid(
                            image_path=image_path,
                            keypad_box=resolved_keypad_box,
                            ocr_scale=ocr_scale,
                            rows=grid_rows,
                            cols=grid_cols,
                        )
                    ),
                )
                grid_buttons = fill_buttons
                for digit, point in (fill_buttons or {}).items():
                    buttons.setdefault(digit, point)
                for digit, vec in (fill_templates or {}).items():
                    templates.setdefault(digit, vec)
            except Exception:
                pass

        sequence, order_slot_boxes, order_slot_scores = _time_step(
            "extract_order_sequence",
            lambda: extract_sequence_by_slots(
                image_path=image_path,
                order_box=resolved_order_box,
                ocr_scale=ocr_scale,
                templates=templates,
            ),
        )

        # 슬롯 방식이 실패하면 기존 방식으로 한 번 더 fallback
        if len(sequence) < 3:
            order_path = image_path + "_order.png"

            try:
                _time_step("crop_order_fallback", lambda: crop_image(image_path, resolved_order_box, order_path))
                order_items = _time_step("ocr_order_fallback", lambda: run_ocr(order_path, scale=max(2, int(ocr_scale))))
                fallback_sequence = _time_step("extract_order_fallback", lambda: extract_sequence_fallback(order_items))

                if len(fallback_sequence) > len(sequence):
                    sequence = fallback_sequence

            finally:
                if os.path.exists(order_path):
                    os.remove(order_path)

        save_debug = _parse_bool_env(os.getenv("OCR_SAVE_DEBUG"))
        if save_debug is None:
            # Default OFF for speed; enable explicitly when debugging.
            save_debug = False
        if save_debug:
            _time_step(
                "save_debug_image",
                lambda: save_debug_image(
                    image_path=image_path,
                    sequence=sequence,
                    buttons=buttons,
                    modal_box=modal_box,
                    order_box=resolved_order_box,
                    keypad_box=resolved_keypad_box,
                    mode=mode,
                    order_slot_boxes=order_slot_boxes,
                ),
            )

        # Capture ambiguous samples for later labeling/training (does not affect the result).
        try:
            capture_ambiguous = _parse_bool_env(os.getenv("OCR_CAPTURE_AMBIGUOUS"))
            if capture_ambiguous is None:
                capture_ambiguous = True

            if capture_ambiguous:
                has_17 = any(d in ("1", "7") for d in (sequence or []))
                low_conf = any((float(s) if s is not None else 0.0) < 0.25 for s in (order_slot_scores or []))
                if has_17 or low_conf:
                    _save_sample_bundle(
                        image_path=image_path,
                        modal_box=modal_box,
                        order_box=resolved_order_box,
                        keypad_box=resolved_keypad_box,
                        ocr_scale=int(ocr_scale),
                        mode=mode,
                        sequence=sequence,
                        buttons=buttons,
                        order_slot_boxes=order_slot_boxes,
                        order_slot_scores=order_slot_scores,
                        order_items=order_items,
                        keypad_items=keypad_items,
                        grid_buttons=grid_buttons,
                    )
        except Exception:
            pass

        if len(sequence) < 3:
            raise RuntimeError(f"보안 인증 숫자 순서를 충분히 찾지 못했습니다. sequence={sequence}")

        sequence = sequence[:3]

        for digit in sequence:
            if digit not in buttons:
                raise RuntimeError(f"보안 인증 숫자 {digit}의 버튼 좌표를 찾지 못했습니다. buttons={buttons}")

        return {
            "sequence": sequence,
            "buttons": buttons,
            "mode": mode,
            "modal_box": box_to_text(modal_box),
            "order_box": box_to_text(resolved_order_box),
            "keypad_box": box_to_text(resolved_keypad_box),
            "ocr_scale": int(ocr_scale),
            "timings": timings,
        }

    except Exception as exc:
        bundle_dir = _save_failure_bundle(
            image_path=image_path,
            error=exc,
            modal_box=modal_box,
            order_box=resolved_order_box,
            keypad_box=resolved_keypad_box,
            ocr_scale=int(ocr_scale),
            mode=mode,
            sequence=sequence,
            buttons=buttons,
            order_slot_boxes=order_slot_boxes,
            order_slot_scores=order_slot_scores,
            order_items=order_items,
            keypad_items=keypad_items,
            grid_buttons=grid_buttons,
        )
        if bundle_dir:
            raise RuntimeError(f"{exc} (saved failure bundle: {bundle_dir})") from exc
        raise

    finally:
        if os.path.exists(keypad_path):
            os.remove(keypad_path)
if TYPE_CHECKING:
    from paddleocr import PaddleOCR  # pragma: no cover
