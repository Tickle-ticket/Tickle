import time
import math
import os
from dataclasses import dataclass

import pyautogui
from PIL import Image, ImageChops

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.0


SCREENSHOT_PATH = "screen.png"


def _normalize_roi_box(roi_box):
    """
    Normalize ROI box into a (left, top, right, bottom) int tuple.
    Accepts list/tuple of length 4. Returns None when invalid.
    """
    if roi_box is None:
        return None

    if isinstance(roi_box, (list, tuple)) and len(roi_box) == 4:
        try:
            left, top, right, bottom = [int(float(v)) for v in roi_box]
        except Exception:
            return None

        if right <= left or bottom <= top:
            return None

        return left, top, right, bottom

    return None


def _crop_for_diff(img: Image.Image, roi_box):
    box = _normalize_roi_box(roi_box)
    if box is None:
        return img

    try:
        w, h = img.size
        left, top, right, bottom = box
        left = max(0, min(left, w))
        right = max(0, min(right, w))
        top = max(0, min(top, h))
        bottom = max(0, min(bottom, h))
        if right <= left or bottom <= top:
            return img
        return img.crop((left, top, right, bottom))
    except Exception:
        return img


@dataclass
class RuntimeConfig:
    click_duration_sec: float = 0.05
    between_click_sec: float = 0.05
    between_event_sec: float = 0.05
    mouse_steps: int = 3
    use_retina_scale: bool = False


def capture_screen(path: str = SCREENSHOT_PATH) -> str:
    img = pyautogui.screenshot()
    img.save(path)
    return path


def get_scale(path: str = SCREENSHOT_PATH):
    if not os.path.exists(path):
        return 1.0, 1.0

    screen_w, screen_h = pyautogui.size()

    try:
        img = Image.open(path)
        image_w, image_h = img.size
    except Exception:
        return 1.0, 1.0

    if image_w == 0 or image_h == 0:
        return 1.0, 1.0

    return screen_w / image_w, screen_h / image_h


def scale_point(x: float, y: float, runtime: RuntimeConfig):
    if not runtime.use_retina_scale:
        return x, y

    scale_x, scale_y = get_scale()
    return x * scale_x, y * scale_y


def move_to(x: float, y: float, runtime: RuntimeConfig):
    steps = max(1, int(runtime.mouse_steps))

    if steps <= 1 or runtime.click_duration_sec <= 0:
        pyautogui.moveTo(x, y)
        return

    start_x, start_y = pyautogui.position()

    for i in range(1, steps + 1):
        t = i / steps
        eased = 0.5 - 0.5 * math.cos(math.pi * t)

        nx = start_x + (x - start_x) * eased
        ny = start_y + (y - start_y) * eased

        pyautogui.moveTo(nx, ny)
        time.sleep(max(0.001, runtime.click_duration_sec / steps))


def click_xy(
    x: float,
    y: float,
    runtime: RuntimeConfig,
    button: str = "left",
    label: str = "",
):
    sx, sy = scale_point(x, y, runtime)

    print(
        f"[click] {label} "
        f"raw=({x}, {y}) "
        f"scaled=({sx:.1f}, {sy:.1f}) "
        f"button={button}"
    )

    move_to(sx, sy, runtime)

    if button == "double":
        pyautogui.doubleClick()
    else:
        pyautogui.click(button=button)

    time.sleep(runtime.between_click_sec)


def image_diff_ratio(
    img1: Image.Image,
    img2: Image.Image,
    threshold: int = 25,
) -> float:
    img1 = img1.convert("RGB")
    img2 = img2.convert("RGB")

    if img1.size != img2.size:
        img2 = img2.resize(img1.size)

    small_size = (320, 180)

    img1 = img1.resize(small_size)
    img2 = img2.resize(small_size)

    diff = ImageChops.difference(img1, img2)

    changed = 0
    total = small_size[0] * small_size[1]

    for r, g, b in diff.getdata():
        if r > threshold or g > threshold or b > threshold:
            changed += 1

    return changed / total


def wait_until_screen_changed(
    timeout_sec: float = 30.0,
    interval_sec: float = 0.25,
    change_ratio_threshold: float = 0.015,
    stable_after_change_count: int = 2,
    roi_box=None,
):
    print(
        f"[wait_change] timeout={timeout_sec}, "
        f"interval={interval_sec}, "
        f"threshold={change_ratio_threshold}"
    )

    baseline_full = pyautogui.screenshot()
    baseline = _crop_for_diff(baseline_full, roi_box)
    start = time.time()

    changed_once = False
    stable_count = 0
    prev_full = baseline_full
    prev = baseline

    while True:
        if time.time() - start > timeout_sec:
            raise TimeoutError("화면 변화 대기 시간이 초과되었습니다.")

        time.sleep(interval_sec)

        current_full = pyautogui.screenshot()
        current = _crop_for_diff(current_full, roi_box)

        if not changed_once:
            ratio = image_diff_ratio(baseline, current)

            if ratio >= change_ratio_threshold:
                print(f"[wait_change] screen changed, ratio={ratio:.4f}")
                changed_once = True
                prev_full = current_full
                prev = current

            continue

        ratio_after = image_diff_ratio(prev, current)

        if ratio_after < change_ratio_threshold / 2:
            stable_count += 1
        else:
            stable_count = 0

        if stable_count >= stable_after_change_count:
            print("[wait_change] screen stable after change")
            current_full.save(SCREENSHOT_PATH)
            return True

        prev_full = current_full
        prev = current
