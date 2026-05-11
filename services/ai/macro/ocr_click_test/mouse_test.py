import pyautogui
import time
import math

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.01

screen_w, screen_h = pyautogui.size()

center_x = screen_w // 2
center_y = screen_h // 2
radius = 200

print("screen size:", pyautogui.size())
print("current position:", pyautogui.position())
print("3초 뒤 마우스가 원을 그립니다.")
print("종료: Ctrl + C")
print("긴급 중지: 마우스를 화면 왼쪽 위 모서리로 이동")

time.sleep(3)

try:
    while True:
        for degree in range(0, 360, 3):
            rad = math.radians(degree)

            x = center_x + radius * math.cos(rad)
            y = center_y + radius * math.sin(rad)

            pyautogui.moveTo(x, y, duration=0.03)

        print("current position:", pyautogui.position())

except KeyboardInterrupt:
    print("종료")