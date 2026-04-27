"""
Windows DPI/해상도 정규화 모듈.
PyAutoGUI import 전에 ensure_dpi_aware()를 반드시 호출해야 함.
"""
import ctypes
import ctypes.wintypes
import sys


_dpi_initialized = False


def ensure_dpi_aware():
    """프로세스를 Per-Monitor DPI Aware로 설정. PyAutoGUI import 전에 호출."""
    global _dpi_initialized
    if _dpi_initialized:
        return

    if sys.platform == "win32":
        try:
            # Per Monitor DPI Aware (값 2)
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except (AttributeError, OSError):
            try:
                # 폴백: System DPI Aware
                ctypes.windll.user32.SetProcessDPIAware()
            except (AttributeError, OSError):
                pass

    _dpi_initialized = True


def get_screen_resolution() -> tuple[int, int]:
    """실제 물리 해상도 반환 (DPI 스케일링 반영)."""
    if sys.platform == "win32":
        user32 = ctypes.windll.user32
        w = user32.GetSystemMetrics(0)  # SM_CXSCREEN
        h = user32.GetSystemMetrics(1)  # SM_CYSCREEN
        return (w, h)
    # 폴백
    import pyautogui
    return pyautogui.size()


def get_dpi_scale() -> float:
    """현재 모니터의 DPI 스케일 비율 반환 (1.0 = 100%, 1.25 = 125%)."""
    if sys.platform == "win32":
        try:
            hdc = ctypes.windll.user32.GetDC(0)
            dpi = ctypes.windll.gdi32.GetDeviceCaps(hdc, 88)  # LOGPIXELSX
            ctypes.windll.user32.ReleaseDC(0, hdc)
            return dpi / 96.0
        except (AttributeError, OSError):
            pass
    return 1.0


def scale_coords(x: int, y: int, base_w: int, base_h: int) -> tuple[int, int]:
    """기준 해상도 좌표를 현재 해상도로 변환."""
    actual_w, actual_h = get_screen_resolution()
    scaled_x = int(x * actual_w / base_w)
    scaled_y = int(y * actual_h / base_h)
    return (scaled_x, scaled_y)


def validate_coordinates():
    """시작 시 좌표 정합성 검증. 문제 있으면 경고 출력."""
    import pyautogui

    test_x, test_y = 100, 100
    pyautogui.moveTo(test_x, test_y, duration=0)
    actual = pyautogui.position()

    if abs(actual.x - test_x) > 5 or abs(actual.y - test_y) > 5:
        scale = get_dpi_scale()
        res = get_screen_resolution()
        print(f"[WARNING] 좌표 불일치 감지!")
        print(f"  요청: ({test_x}, {test_y}), 실제: ({actual.x}, {actual.y})")
        print(f"  해상도: {res}, DPI 스케일: {scale:.0%}")
        print(f"  Windows 디스플레이 설정에서 배율을 100%로 변경하거나")
        print(f"  config/default.yaml에서 override_resolution을 설정하세요.")
        return False

    return True
