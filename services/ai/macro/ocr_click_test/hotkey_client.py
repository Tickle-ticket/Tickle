import time
import threading
import requests
import pyautogui
from pynput import keyboard


SOLVER_URL = "http://localhost:8000/solve"

SCREENSHOT_PATH = "screen.png"

BETWEEN_CLICK_SEC = 0.3
BEFORE_FIRST_CLICK_SEC = 0.1
AFTER_DONE_SEC = 0.5

is_running = False
lock = threading.Lock()


def capture_screen():
    img = pyautogui.screenshot()
    img.save(SCREENSHOT_PATH)
    return SCREENSHOT_PATH


def request_solver(image_path: str):
    with open(image_path, "rb") as f:
        response = requests.post(
            SOLVER_URL,
            files={"file": ("screen.png", f, "image/png")},
            timeout=60,
        )

    response.raise_for_status()
    return response.json()


def click_sequence(sequence, buttons):
    time.sleep(BEFORE_FIRST_CLICK_SEC)

    for digit in sequence:
        if digit not in buttons:
            raise ValueError(f"{digit} 버튼 좌표가 없습니다.")

        x, y = buttons[digit]

        print(f"click {digit}: ({x:.1f}, {y:.1f})")

        pyautogui.click(x, y)
        time.sleep(BETWEEN_CLICK_SEC)

    time.sleep(AFTER_DONE_SEC)


def solve_once():
    global is_running

    with lock:
        if is_running:
            print("이미 실행 중입니다.")
            return

        is_running = True

    try:
        print("화면 캡처 중...")
        image_path = capture_screen()

        print("OCR 서버 요청 중...")
        result = request_solver(image_path)

        if not result.get("ready"):
            print("실행 불가:", result.get("reason"))
            print("debug_result.png를 확인하세요.")

            print("mode:", result.get("mode"))
            print("modal_box:", result.get("modal_box"))
            print("order_box:", result.get("order_box"))
            print("keypad_box:", result.get("keypad_box"))
            print("sequence:", result.get("sequence"))
            print("buttons:", result.get("buttons"))

            return

        sequence = result["sequence"]
        buttons = result["buttons"]

        print("mode:", result.get("mode"))
        print("modal_box:", result.get("modal_box"))
        print("order_box:", result.get("order_box"))
        print("keypad_box:", result.get("keypad_box"))
        print("sequence:", sequence)
        print("buttons:", buttons)

        print("클릭 시작")
        click_sequence(sequence, buttons)
        print("완료")

    except Exception as e:
        print("에러:", e)

    finally:
        is_running = False


def start_in_thread():
    thread = threading.Thread(target=solve_once, daemon=True)
    thread.start()


def on_press(key):
    if key == keyboard.Key.f9:
        start_in_thread()

    elif key == keyboard.Key.f10:
        print("종료")
        return False


def main():
    print("프로그램 시작")
    print("F9: 현재 화면 캡처 후 OCR 실행")
    print("F10: 종료")
    print()
    print("주의: 숫자 화면이 보이는 상태에서 F9를 누르세요.")

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()


if __name__ == "__main__":
    main()