from __future__ import annotations

import json
import os
from collections import deque
import threading
import time
import tkinter as tk
from tkinter import ttk, messagebox
import tkinter.simpledialog

import pyautogui
from pynput import keyboard as kb

from mouse_driver import (
    RuntimeConfig,
    click_xy,
    capture_screen,
    wait_until_screen_changed,
    SCREENSHOT_PATH,
)
from ocr_security_client import request_security_challenge, request_cv_security_challenge


DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "macro_data.json")

DEFAULT_DATA = {
    "runtime": {
        "click_duration_sec": 0.05,
        "between_click_sec": 0.05,
        "between_event_sec": 0.05,
        "mouse_steps": 3,
        "use_retina_scale": False,
        "ocr_server_url": "http://127.0.0.1:8010",
        "ocr_security_retry_max": 8,
        "ocr_security_retry_interval_sec": 0.25
    },
    "security": {
        "mode": "manual",
        "order_box": "",
        "keypad_box": "",
        "ocr_scale": 1
    },
    "macros": [
        {
            "name": "전체 플로우",
            "hotkey": "f9",
            "events": [
                {
                    "type": "click",
                    "x": 0,
                    "y": 0,
                    "button": "left",
                    "delay": 0,
                    "memo": "취소표 대기하기 클릭"
                },
                {
                    "type": "wait_change",
                    "seconds": 30.0,
                    "memo": "대기열 이후 화면 전환 대기"
                },
                {
                    "type": "wait",
                    "seconds": 0.5,
                    "memo": "전환 후 안정화 대기"
                },
                {
                    "type": "ocr_security",
                    "delay": 0,
                    "memo": "보안 인증 숫자 OCR 클릭"
                }
            ]
        }
    ]
}


_running = False


def stop_all():
    global _running
    _running = False


class FrameBuffer:
    """
    Capture screenshots continuously into an in-memory ring buffer.
    Used to avoid "too early capture" failures by consuming frames that arrive
    *after* the security UI is expected to appear, without recapturing per retry.
    """

    def __init__(self, fps: float = 10.0, max_sec: float = 3.0):
        self.fps = max(1.0, float(fps))
        self.maxlen = max(3, int(self.fps * max(0.5, float(max_sec))))
        self._frames = deque(maxlen=self.maxlen)  # (ts, PIL.Image)
        self._lock = threading.Lock()
        self._cv = threading.Condition(self._lock)
        self._running = False
        self._thread = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        with self._cv:
            self._running = False
            self._cv.notify_all()

    def _loop(self):
        interval = 1.0 / self.fps
        while True:
            with self._cv:
                if not self._running:
                    return

            t0 = time.perf_counter()
            try:
                img = pyautogui.screenshot()
                ts = time.time()
                with self._cv:
                    self._frames.append((ts, img))
                    self._cv.notify_all()
            except Exception:
                pass

            elapsed = time.perf_counter() - t0
            time.sleep(max(0.001, interval - elapsed))

    def wait_next(self, after_ts: float, timeout_sec: float):
        """
        Return the first frame with ts > after_ts. Wait up to timeout_sec.
        Returns None on timeout/stop.
        """
        deadline = time.time() + max(0.0, float(timeout_sec))
        with self._cv:
            while True:
                for ts, img in list(self._frames):
                    if ts > after_ts:
                        return ts, img

                if not self._running:
                    return None

                remaining = deadline - time.time()
                if remaining <= 0:
                    return None
                self._cv.wait(timeout=remaining)


def deep_default_data():
    return json.loads(json.dumps(DEFAULT_DATA, ensure_ascii=False))


def ensure_data_shape(data):
    if not isinstance(data, dict):
        data = deep_default_data()

    data.setdefault("runtime", {})
    data.setdefault("security", {})
    data.setdefault("macros", [])

    runtime = data["runtime"]
    runtime.setdefault("click_duration_sec", 0.05)
    runtime.setdefault("between_click_sec", 0.05)
    runtime.setdefault("between_event_sec", 0.05)
    runtime.setdefault("mouse_steps", 3)
    runtime.setdefault("use_retina_scale", False)
    runtime.setdefault("ocr_server_url", "http://127.0.0.1:8010")
    runtime.setdefault("ocr_security_retry_max", 8)
    runtime.setdefault("ocr_security_retry_interval_sec", 0.25)

    security = data["security"]
    security.setdefault("mode", "manual")
    security.setdefault("order_box", "")
    security.setdefault("keypad_box", "")
    security.setdefault("ocr_scale", 1)
    security.setdefault("keypad_grid_rows", 4)
    security.setdefault("keypad_grid_cols", 3)
    security.setdefault("keypad_grid_pad_ratio", 0.10)
    security.setdefault("keypad_cells", [])

    if not data["macros"]:
        data["macros"] = deep_default_data()["macros"]

    return data


def load_data():
    if not os.path.exists(DATA_PATH):
        data = deep_default_data()
        save_data(data)
        return data

    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            data = deep_default_data()
            save_data(data)
            return data

        data = json.loads(content)
        data = ensure_data_shape(data)
        save_data(data)
        return data

    except json.JSONDecodeError:
        backup_path = DATA_PATH + ".broken"

        try:
            os.rename(DATA_PATH, backup_path)
            print(f"[warn] 깨진 macro_data.json을 백업했습니다: {backup_path}")
        except Exception:
            pass

        data = deep_default_data()
        save_data(data)
        return data


def save_data(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_button_colors(widget):
    try:
        if isinstance(widget, tk.Button):
            widget.configure(
                bg="#ffffff",
                fg="#000000",
                activebackground="#e5e7eb",
                activeforeground="#000000",
                highlightbackground="#ffffff",
                relief="flat",
            )
    except Exception:
        pass

    try:
        for child in widget.winfo_children():
            normalize_button_colors(child)
    except Exception:
        pass


def build_runtime(data) -> RuntimeConfig:
    raw = data.get("runtime", {})

    return RuntimeConfig(
        click_duration_sec=float(raw.get("click_duration_sec", 0.05)),
        between_click_sec=float(raw.get("between_click_sec", 0.05)),
        between_event_sec=float(raw.get("between_event_sec", 0.05)),
        mouse_steps=int(raw.get("mouse_steps", 3)),
        use_retina_scale=bool(raw.get("use_retina_scale", False)),
    )


def get_ocr_server_url(data) -> str:
    runtime = data.setdefault("runtime", {})
    return runtime.get("ocr_server_url", "http://127.0.0.1:8010")


def get_ocr_security_retry_config(data) -> tuple[int, float]:
    runtime = data.setdefault("runtime", {})
    retry_max = int(runtime.get("ocr_security_retry_max", 8) or 8)
    retry_max = max(1, min(retry_max, 30))
    interval = float(runtime.get("ocr_security_retry_interval_sec", 0.25) or 0.25)
    interval = max(0.05, min(interval, 5.0))
    return retry_max, interval


def box_to_text(box):
    if not box:
        return ""

    if isinstance(box, str):
        return box

    if isinstance(box, (list, tuple)) and len(box) == 4:
        return ",".join(str(int(float(v))) for v in box)

    return ""


def parse_box_int(box):
    if not box:
        return None

    if isinstance(box, str):
        raw = box.strip()
        if not raw:
            return None
        parts = [p.strip() for p in raw.split(",")]
        if len(parts) != 4:
            return None
        try:
            left, top, right, bottom = [int(float(p)) for p in parts]
        except Exception:
            return None
    elif isinstance(box, (list, tuple)) and len(box) == 4:
        try:
            left, top, right, bottom = [int(float(v)) for v in box]
        except Exception:
            return None
    else:
        return None

    if right <= left or bottom <= top:
        return None

    return [left, top, right, bottom]


def union_boxes(a, b):
    ba = parse_box_int(a)
    bb = parse_box_int(b)
    if ba is None and bb is None:
        return None
    if ba is None:
        return bb
    if bb is None:
        return ba

    return [
        min(ba[0], bb[0]),
        min(ba[1], bb[1]),
        max(ba[2], bb[2]),
        max(ba[3], bb[3]),
    ]


def split_box_into_grid(box, rows: int, cols: int, pad_ratio: float = 0.10):
    """
    Split a single box ([l,t,r,b] or "l,t,r,b") into rows*cols sub-boxes.
    """
    b = parse_box_int(box)
    if b is None:
        return []

    rows = max(2, int(rows))
    cols = max(2, int(cols))
    pad_ratio = max(0.0, min(float(pad_ratio), 0.30))

    left, top, right, bottom = b
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

    cells = []
    for r in range(rows):
        for c in range(cols):
            x1 = int(inner_left + c * cell_w)
            x2 = int(inner_left + (c + 1) * cell_w)
            y1 = int(inner_top + r * cell_h)
            y2 = int(inner_top + (r + 1) * cell_h)

            pad_x = int((x2 - x1) * pad_ratio)
            pad_y = int((y2 - y1) * pad_ratio)
            cells.append([x1 + pad_x, y1 + pad_y, x2 - pad_x, y2 - pad_y])

    return cells


def split_box(box):
    if not box:
        return "", "", "", ""

    if isinstance(box, str):
        raw = box.strip()

        if not raw:
            return "", "", "", ""

        parts = [part.strip() for part in raw.split(",")]

        if len(parts) != 4:
            return "", "", "", ""

        return parts[0], parts[1], parts[2], parts[3]

    if isinstance(box, (list, tuple)) and len(box) == 4:
        return (
            str(int(float(box[0]))),
            str(int(float(box[1]))),
            str(int(float(box[2]))),
            str(int(float(box[3]))),
        )

    return "", "", "", ""


def make_box_from_xy(lt_x, lt_y, rb_x, rb_y):
    left = int(float(lt_x))
    top = int(float(lt_y))
    right = int(float(rb_x))
    bottom = int(float(rb_y))

    if right <= left:
        raise ValueError("우하단 X는 좌상단 X보다 커야 합니다.")

    if bottom <= top:
        raise ValueError("우하단 Y는 좌상단 Y보다 커야 합니다.")

    return [left, top, right, bottom]


class EventDialog(tk.Toplevel):
    def __init__(self, parent, event=None):
        super().__init__(parent)
        self.title("이벤트 편집")
        self.resizable(False, False)
        self.configure(bg="#1e1e2e")
        self.result = None
        self._event = event or {
            "type": "click",
            "x": 0,
            "y": 0,
            "button": "left",
            "delay": 0,
            "seconds": 1.0,
            "memo": ""
        }

        self._build()
        self.grab_set()

    def _build(self):
        bg = "#1e1e2e"
        fg = "#cdd6f4"
        ent = "#313244"

        pad = {"padx": 12, "pady": 5}

        def label(text, row):
            tk.Label(
                self,
                text=text,
                bg=bg,
                fg=fg,
                font=("Malgun Gothic", 10)
            ).grid(row=row, column=0, sticky="e", **pad)

        def entry(var, row, width=14):
            e = tk.Entry(
                self,
                textvariable=var,
                width=width,
                bg=ent,
                fg=fg,
                insertbackground=fg,
                relief="flat",
                font=("Malgun Gothic", 10)
            )
            e.grid(row=row, column=1, sticky="w", **pad)
            return e

        self.type_var = tk.StringVar(value=self._event.get("type", "click"))
        self.x_var = tk.StringVar(value=str(self._event.get("x", 0)))
        self.y_var = tk.StringVar(value=str(self._event.get("y", 0)))
        self.delay_var = tk.StringVar(value=str(self._event.get("delay", 0)))
        self.seconds_var = tk.StringVar(value=str(self._event.get("seconds", 1.0)))
        self.button_var = tk.StringVar(value=self._event.get("button", "left"))
        self.memo_var = tk.StringVar(value=self._event.get("memo", ""))

        label("이벤트 타입", 0)
        type_box = ttk.Combobox(
            self,
            textvariable=self.type_var,
            values=["click", "wait", "wait_change", "wait_security", "ocr_security", "cv_security", "screenshot", "pause"],
            width=18,
            state="readonly"
        )
        type_box.grid(row=0, column=1, sticky="w", **pad)

        label("X 좌표", 1)
        entry(self.x_var, 1)

        label("Y 좌표", 2)
        entry(self.y_var, 2)

        label("딜레이, 초", 3)
        entry(self.delay_var, 3)

        label("대기시간, 초", 4)
        entry(self.seconds_var, 4)

        label("버튼", 5)
        btn_frame = tk.Frame(self, bg=bg)
        btn_frame.grid(row=5, column=1, sticky="w", **pad)

        for value, text in [
            ("left", "좌클릭"),
            ("right", "우클릭"),
            ("double", "더블클릭")
        ]:
            tk.Radiobutton(
                btn_frame,
                text=text,
                variable=self.button_var,
                value=value,
                bg=bg,
                fg=fg,
                selectcolor=ent,
                activebackground=bg,
                activeforeground=fg,
                font=("Malgun Gothic", 9)
            ).pack(side="left", padx=4)

        label("메모", 6)
        entry(self.memo_var, 6, width=28)

        tk.Button(
            self,
            text="저장",
            padx=24,
            pady=7,
            font=("Malgun Gothic", 10, "bold"),
            command=self._save
        ).grid(row=7, column=0, columnspan=2, pady=12)

        normalize_button_colors(self)

    def _save(self):
        event_type = self.type_var.get()

        try:
            event = {
                "type": event_type,
                "memo": self.memo_var.get()
            }

            if event_type == "click":
                event.update({
                    "x": int(float(self.x_var.get())),
                    "y": int(float(self.y_var.get())),
                    "button": self.button_var.get(),
                    "delay": float(self.delay_var.get())
                })

            elif event_type == "wait":
                event.update({
                    "seconds": float(self.seconds_var.get())
                })

            elif event_type == "wait_change":
                event.update({
                    "seconds": float(self.seconds_var.get())
                })

            elif event_type == "wait_security":
                event.update({
                    "seconds": float(self.seconds_var.get()),
                    "delay": float(self.delay_var.get()),
                })

            elif event_type == "ocr_security":
                event.update({
                    "delay": float(self.delay_var.get())
                })

            elif event_type == "cv_security":
                event.update({
                    "delay": float(self.delay_var.get())
                })

            elif event_type == "screenshot":
                event.update({
                    "delay": float(self.delay_var.get())
                })

            elif event_type == "pause":
                event.update({
                    "message": self.memo_var.get() or "계속하려면 확인을 누르세요."
                })

            self.result = event
            self.destroy()

        except ValueError:
            messagebox.showwarning("입력 오류", "좌표는 정수, 시간은 숫자로 입력하세요.", parent=self)


class RuntimeTab(tk.Frame):
    def __init__(self, parent, data, status_cb):
        super().__init__(parent, bg="#1e1e2e")
        self.data = data
        self.status_cb = status_cb
        self._build()

    def _build(self):
        bg = "#1e1e2e"
        fg = "#cdd6f4"
        ent = "#313244"

        runtime = self.data.setdefault("runtime", {})

        self.click_duration_var = tk.StringVar(value=str(runtime.get("click_duration_sec", 0.05)))
        self.between_click_var = tk.StringVar(value=str(runtime.get("between_click_sec", 0.05)))
        self.between_event_var = tk.StringVar(value=str(runtime.get("between_event_sec", 0.05)))
        self.mouse_steps_var = tk.StringVar(value=str(runtime.get("mouse_steps", 3)))
        self.retina_var = tk.BooleanVar(value=bool(runtime.get("use_retina_scale", False)))
        self.ocr_server_url_var = tk.StringVar(value=str(runtime.get("ocr_server_url", "http://127.0.0.1:8010")))

        rows = [
            ("마우스 이동 시간, 초", self.click_duration_var),
            ("클릭 간격, 초", self.between_click_var),
            ("이벤트 간격, 초", self.between_event_var),
            ("마우스 이동 스텝", self.mouse_steps_var),
            ("OCR 서버 URL", self.ocr_server_url_var),
        ]

        for row, (label_text, var) in enumerate(rows):
            tk.Label(
                self,
                text=label_text,
                bg=bg,
                fg=fg,
                font=("Malgun Gothic", 10)
            ).grid(row=row, column=0, sticky="e", padx=12, pady=8)

            width = 28 if label_text == "OCR 서버 URL" else 14

            tk.Entry(
                self,
                textvariable=var,
                bg=ent,
                fg=fg,
                insertbackground=fg,
                relief="flat",
                width=width,
                font=("Consolas", 10)
            ).grid(row=row, column=1, sticky="w", padx=12, pady=8)

        tk.Checkbutton(
            self,
            text="Retina 스케일 보정 사용",
            variable=self.retina_var,
            bg=bg,
            fg=fg,
            selectcolor=ent,
            activebackground=bg,
            activeforeground=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=5, column=0, columnspan=2, sticky="w", padx=12, pady=8)

        tk.Button(
            self,
            text="속도 파라미터 저장",
            padx=18,
            pady=8,
            font=("Malgun Gothic", 10, "bold"),
            command=self.save_runtime
        ).grid(row=6, column=0, columnspan=2, padx=12, pady=14)

        normalize_button_colors(self)

    def save_runtime(self):
        try:
            self.data["runtime"] = {
                "click_duration_sec": float(self.click_duration_var.get()),
                "between_click_sec": float(self.between_click_var.get()),
                "between_event_sec": float(self.between_event_var.get()),
                "mouse_steps": int(self.mouse_steps_var.get()),
                "use_retina_scale": bool(self.retina_var.get()),
                "ocr_server_url": self.ocr_server_url_var.get().strip() or "http://127.0.0.1:8010",
            }

            save_data(self.data)
            self.status_cb("속도 파라미터 저장 완료")

        except ValueError:
            messagebox.showwarning("입력 오류", "속도 파라미터 값을 확인하세요.")


class SecurityTab(tk.Frame):
    def __init__(self, parent, data, status_cb):
        super().__init__(parent, bg="#1e1e2e")
        self.data = data
        self.status_cb = status_cb
        self._build()

    def _build(self):
        bg = "#1e1e2e"
        fg = "#cdd6f4"
        ent = "#313244"

        security = self.data.setdefault("security", {})

        order_lt_x, order_lt_y, order_rb_x, order_rb_y = split_box(security.get("order_box", ""))
        keypad_lt_x, keypad_lt_y, keypad_rb_x, keypad_rb_y = split_box(security.get("keypad_box", ""))

        self.mode_var = tk.StringVar(value=str(security.get("mode", "manual")))

        self.order_lt_x_var = tk.StringVar(value=order_lt_x)
        self.order_lt_y_var = tk.StringVar(value=order_lt_y)
        self.order_rb_x_var = tk.StringVar(value=order_rb_x)
        self.order_rb_y_var = tk.StringVar(value=order_rb_y)

        self.keypad_lt_x_var = tk.StringVar(value=keypad_lt_x)
        self.keypad_lt_y_var = tk.StringVar(value=keypad_lt_y)
        self.keypad_rb_x_var = tk.StringVar(value=keypad_rb_x)
        self.keypad_rb_y_var = tk.StringVar(value=keypad_rb_y)

        self.ocr_scale_var = tk.StringVar(value=str(security.get("ocr_scale", 1)))
        self.keypad_rows_var = tk.StringVar(value=str(security.get("keypad_grid_rows", 4)))
        self.keypad_cols_var = tk.StringVar(value=str(security.get("keypad_grid_cols", 3)))
        self.keypad_pad_var = tk.StringVar(value=str(security.get("keypad_grid_pad_ratio", 0.10)))

        tk.Label(
            self,
            text="보안 인증 OCR 설정",
            bg=bg,
            fg="#f9fafb",
            font=("Malgun Gothic", 14, "bold")
        ).grid(row=0, column=0, columnspan=5, sticky="w", padx=14, pady=(16, 12))

        tk.Label(
            self,
            text="모드",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=1, column=0, sticky="e", padx=12, pady=8)

        mode_frame = tk.Frame(self, bg=bg)
        mode_frame.grid(row=1, column=1, columnspan=4, sticky="w", padx=12, pady=8)

        for value, text in [("manual", "수동 영역"), ("auto", "자동 모달 탐지")]:
            tk.Radiobutton(
                mode_frame,
                text=text,
                variable=self.mode_var,
                value=value,
                bg=bg,
                fg=fg,
                selectcolor=ent,
                activebackground=bg,
                activeforeground=fg,
                font=("Malgun Gothic", 10)
            ).pack(side="left", padx=(0, 12))

        tk.Label(
            self,
            text="상단 숫자 영역",
            bg=bg,
            fg="#f9fafb",
            font=("Malgun Gothic", 11, "bold")
        ).grid(row=2, column=0, columnspan=5, sticky="w", padx=14, pady=(16, 6))

        self._add_xy_row(
            row=3,
            title="좌상단",
            x_var=self.order_lt_x_var,
            y_var=self.order_lt_y_var,
        )
        self._add_xy_row(
            row=4,
            title="우하단",
            x_var=self.order_rb_x_var,
            y_var=self.order_rb_y_var,
        )

        tk.Label(
            self,
            text="키패드 영역",
            bg=bg,
            fg="#f9fafb",
            font=("Malgun Gothic", 11, "bold")
        ).grid(row=5, column=0, columnspan=5, sticky="w", padx=14, pady=(16, 6))

        self._add_xy_row(
            row=6,
            title="좌상단",
            x_var=self.keypad_lt_x_var,
            y_var=self.keypad_lt_y_var,
        )
        self._add_xy_row(
            row=7,
            title="우하단",
            x_var=self.keypad_rb_x_var,
            y_var=self.keypad_rb_y_var,
        )

        tk.Label(
            self,
            text="OCR scale",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=8, column=0, sticky="e", padx=12, pady=8)

        tk.Entry(
            self,
            textvariable=self.ocr_scale_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=8,
            font=("Consolas", 10)
        ).grid(row=8, column=1, sticky="w", padx=12, pady=8)

        tk.Label(
            self,
            text="1이 빠름, 인식률이 낮으면 2",
            bg=bg,
            fg="#9ca3af",
            font=("Malgun Gothic", 9)
        ).grid(row=8, column=2, columnspan=3, sticky="w", padx=8, pady=8)

        tk.Label(
            self,
            text="Keypad grid",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=9, column=0, sticky="e", padx=12, pady=6)

        grid_frame = tk.Frame(self, bg=bg)
        grid_frame.grid(row=9, column=1, columnspan=4, sticky="w", padx=12, pady=6)

        tk.Label(grid_frame, text="rows", bg=bg, fg=fg, font=("Consolas", 9)).pack(side="left")
        tk.Entry(
            grid_frame,
            textvariable=self.keypad_rows_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=4,
            font=("Consolas", 10)
        ).pack(side="left", padx=(6, 12))

        tk.Label(grid_frame, text="cols", bg=bg, fg=fg, font=("Consolas", 9)).pack(side="left")
        tk.Entry(
            grid_frame,
            textvariable=self.keypad_cols_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=4,
            font=("Consolas", 10)
        ).pack(side="left", padx=(6, 12))

        tk.Label(grid_frame, text="pad", bg=bg, fg=fg, font=("Consolas", 9)).pack(side="left")
        tk.Entry(
            grid_frame,
            textvariable=self.keypad_pad_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=6,
            font=("Consolas", 10)
        ).pack(side="left", padx=(6, 12))

        tk.Button(
            grid_frame,
            text="Generate cells",
            padx=10,
            pady=4,
            command=self.generate_keypad_cells,
        ).pack(side="left")

        tk.Button(
            self,
            text="보안 인증 설정 저장",
            padx=20,
            pady=9,
            font=("Malgun Gothic", 10, "bold"),
            command=self.save_security
        ).grid(row=10, column=0, columnspan=5, sticky="w", padx=14, pady=(14, 8))

        help_text = (
            "입력 예시\n"
            "상단 숫자 영역, 좌상단 X=808, 좌상단 Y=356, 우하단 X=1111, 우하단 Y=529\n"
            "키패드 영역, 좌상단 X=808, 좌상단 Y=498, 우하단 X=1111, 우하단 Y=807\n\n"
            "수동 영역 모드에서는 저장된 좌표만 crop해서 OCR합니다.\n"
            "브라우저 위치, 창 크기, 확대 비율이 바뀌면 좌표도 다시 맞춰야 합니다."
        )

        tk.Label(
            self,
            text=help_text,
            bg=bg,
            fg="#d1d5db",
            justify="left",
            font=("Malgun Gothic", 9)
        ).grid(row=11, column=0, columnspan=5, sticky="w", padx=14, pady=(12, 8))

        normalize_button_colors(self)

    def _add_xy_row(self, row, title, x_var, y_var):
        bg = "#1e1e2e"
        fg = "#cdd6f4"
        ent = "#313244"

        tk.Label(
            self,
            text=title,
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=row, column=0, sticky="e", padx=12, pady=6)

        tk.Label(
            self,
            text="X",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=row, column=1, sticky="e", padx=(12, 4), pady=6)

        tk.Entry(
            self,
            textvariable=x_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=10,
            font=("Consolas", 10)
        ).grid(row=row, column=2, sticky="w", padx=(0, 12), pady=6)

        tk.Label(
            self,
            text="Y",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=row, column=3, sticky="e", padx=(12, 4), pady=6)

        tk.Entry(
            self,
            textvariable=y_var,
            bg=ent,
            fg=fg,
            insertbackground=fg,
            relief="flat",
            width=10,
            font=("Consolas", 10)
        ).grid(row=row, column=4, sticky="w", padx=(0, 12), pady=6)

    def save_security(self):
        try:
            mode = self.mode_var.get()

            order_box = ""
            keypad_box = ""

            if mode == "manual":
                order_box = make_box_from_xy(
                    self.order_lt_x_var.get(),
                    self.order_lt_y_var.get(),
                    self.order_rb_x_var.get(),
                    self.order_rb_y_var.get(),
                )

                keypad_box = make_box_from_xy(
                    self.keypad_lt_x_var.get(),
                    self.keypad_lt_y_var.get(),
                    self.keypad_rb_x_var.get(),
                    self.keypad_rb_y_var.get(),
                )

            ocr_scale = max(1, int(float(self.ocr_scale_var.get())))
            keypad_rows = max(2, int(float(self.keypad_rows_var.get())))
            keypad_cols = max(2, int(float(self.keypad_cols_var.get())))
            keypad_pad = float(self.keypad_pad_var.get())
            keypad_pad = max(0.0, min(keypad_pad, 0.30))

            prev_security = self.data.get("security", {}) if isinstance(self.data.get("security", {}), dict) else {}
            keypad_cells = prev_security.get("keypad_cells", [])

            self.data["security"] = {
                "mode": mode,
                "order_box": order_box,
                "keypad_box": keypad_box,
                "ocr_scale": ocr_scale,
                "keypad_grid_rows": keypad_rows,
                "keypad_grid_cols": keypad_cols,
                "keypad_grid_pad_ratio": keypad_pad,
                "keypad_cells": keypad_cells,
            }

            save_data(self.data)
            self.status_cb("보안 인증 설정 저장 완료")

        except Exception as error:
            messagebox.showwarning("입력 오류", str(error))

    def generate_keypad_cells(self):
        try:
            security = self.data.setdefault("security", {})

            keypad_box = security.get("keypad_box", "")
            if not keypad_box:
                keypad_box = make_box_from_xy(
                    self.keypad_lt_x_var.get(),
                    self.keypad_lt_y_var.get(),
                    self.keypad_rb_x_var.get(),
                    self.keypad_rb_y_var.get(),
                )

            rows = max(2, int(float(self.keypad_rows_var.get())))
            cols = max(2, int(float(self.keypad_cols_var.get())))
            pad = float(self.keypad_pad_var.get())
            pad = max(0.0, min(pad, 0.30))

            cells = split_box_into_grid(keypad_box, rows=rows, cols=cols, pad_ratio=pad)
            if not cells:
                raise ValueError("keypad_box가 비어있거나 잘못되었습니다.")

            security["keypad_cells"] = cells
            security["keypad_grid_rows"] = rows
            security["keypad_grid_cols"] = cols
            security["keypad_grid_pad_ratio"] = pad
            save_data(self.data)

            self.status_cb(f"keypad_cells 생성 완료 ({len(cells)} cells)")
            messagebox.showinfo("완료", f"keypad_cells 생성 완료: {len(cells)}개", parent=self)
        except Exception as error:
            messagebox.showwarning("생성 오류", str(error), parent=self)


class MacroTab(tk.Frame):
    def __init__(self, parent, data, status_cb):
        super().__init__(parent, bg="#1e1e2e")
        self.data = data
        self.status_cb = status_cb
        self.run_button = None
        self.tree = None
        self.macro_combo = None
        self.macro_var = tk.StringVar()
        self.hotkey_var = tk.StringVar()
        self._build()
        self._load_macro_list()

    def _build(self):
        bg = "#1e1e2e"
        fg = "#cdd6f4"
        ent = "#313244"

        style = ttk.Style()
        style.configure("Treeview", background=ent, foreground=fg, fieldbackground=ent, rowheight=25)
        style.configure("Treeview.Heading", background=ent, foreground=fg)

        tk.Label(
            self,
            text="매크로 슬롯",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=0, column=0, sticky="e", padx=10, pady=8)

        self.macro_combo = ttk.Combobox(
            self,
            textvariable=self.macro_var,
            width=28,
            state="readonly"
        )
        self.macro_combo.grid(row=0, column=1, sticky="w", padx=10, pady=8)
        self.macro_combo.bind("<<ComboboxSelected>>", self._on_select)

        btn_frame = tk.Frame(self, bg=bg)
        btn_frame.grid(row=0, column=2, sticky="w")

        for text, command in [
            ("추가", self._add_macro),
            ("이름변경", self._rename_macro),
            ("삭제", self._delete_macro)
        ]:
            tk.Button(
                btn_frame,
                text=text,
                padx=8,
                pady=4,
                command=command
            ).pack(side="left", padx=3)

        tk.Label(
            self,
            text="실행 핫키",
            bg=bg,
            fg=fg,
            font=("Malgun Gothic", 10)
        ).grid(row=1, column=0, sticky="e", padx=10, pady=8)

        hotkey_combo = ttk.Combobox(
            self,
            textvariable=self.hotkey_var,
            values=["f1", "f2", "f3", "f4", "f7", "f8", "f9", "f10", "f11"],
            width=12,
            state="readonly"
        )
        hotkey_combo.grid(row=1, column=1, sticky="w", padx=10, pady=8)
        hotkey_combo.bind("<<ComboboxSelected>>", self._on_hotkey_change)

        columns = ("순서", "타입", "X", "Y", "버튼", "딜레이", "대기", "메모")

        self.tree = ttk.Treeview(self, columns=columns, show="headings", height=12)
        widths = [50, 120, 70, 70, 70, 70, 70, 260]

        for col, width in zip(columns, widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=width, anchor="center")

        self.tree.grid(row=2, column=0, columnspan=4, sticky="nsew", padx=12, pady=8)
        self.tree.bind("<Double-Button-1>", lambda _: self._edit_event())

        edit_frame = tk.Frame(self, bg=bg)
        edit_frame.grid(row=3, column=0, columnspan=4, sticky="w", padx=12, pady=8)

        for text, command in [
            ("추가", self._add_event),
            ("편집", self._edit_event),
            ("삭제", self._delete_event),
            ("위로", self._move_up),
            ("아래로", self._move_down),
        ]:
            tk.Button(
                edit_frame,
                text=text,
                padx=10,
                pady=6,
                command=command
            ).pack(side="left", padx=4)

        run_frame = tk.Frame(self, bg=bg)
        run_frame.grid(row=4, column=0, columnspan=4, sticky="w", padx=12, pady=12)

        self.run_button = tk.Button(
            run_frame,
            text="선택 매크로 실행",
            font=("Malgun Gothic", 11, "bold"),
            padx=24,
            pady=9,
            command=self._run_selected
        )
        self.run_button.pack(side="left", padx=(0, 8))

        tk.Button(
            run_frame,
            text="중단, ESC",
            padx=18,
            pady=9,
            command=stop_all
        ).pack(side="left")

        normalize_button_colors(self)

    def _current_index(self):
        if self.macro_combo is None:
            return -1
        return self.macro_combo.current()

    def _load_macro_list(self):
        names = [macro["name"] for macro in self.data.get("macros", [])]
        self.macro_combo["values"] = names

        if names:
            self.macro_combo.current(0)
            self._on_select()

    def _on_select(self, _event=None):
        idx = self._current_index()

        if idx < 0:
            return

        macro = self.data["macros"][idx]
        self.hotkey_var.set(macro.get("hotkey", "f9"))
        self._refresh_events()

    def _on_hotkey_change(self, _event=None):
        idx = self._current_index()

        if idx < 0:
            return

        self.data["macros"][idx]["hotkey"] = self.hotkey_var.get()
        save_data(self.data)

    def _refresh_events(self):
        self.tree.delete(*self.tree.get_children())

        idx = self._current_index()

        if idx < 0:
            return

        events = self.data["macros"][idx].get("events", [])

        for i, event in enumerate(events):
            self.tree.insert(
                "",
                "end",
                iid=str(i),
                values=(
                    i + 1,
                    event.get("type", ""),
                    event.get("x", ""),
                    event.get("y", ""),
                    event.get("button", ""),
                    event.get("delay", ""),
                    event.get("seconds", ""),
                    event.get("memo", ""),
                )
            )

    def _selected_event_index(self):
        selected = self.tree.selection()

        if not selected:
            return None

        return int(selected[0])

    def _add_macro(self):
        name = tkinter.simpledialog.askstring("매크로 추가", "매크로 이름:", parent=self)

        if not name:
            return

        self.data["macros"].append({
            "name": name,
            "hotkey": "f9",
            "events": []
        })

        save_data(self.data)
        self._load_macro_list()
        self.macro_combo.current(len(self.data["macros"]) - 1)
        self._on_select()

    def _rename_macro(self):
        idx = self._current_index()

        if idx < 0:
            return

        old_name = self.data["macros"][idx]["name"]

        name = tkinter.simpledialog.askstring(
            "이름 변경",
            "새 이름:",
            initialvalue=old_name,
            parent=self
        )

        if not name:
            return

        self.data["macros"][idx]["name"] = name
        save_data(self.data)
        self._load_macro_list()
        self.macro_combo.current(idx)

    def _delete_macro(self):
        idx = self._current_index()

        if idx < 0:
            return

        name = self.data["macros"][idx]["name"]

        if not messagebox.askyesno("삭제", f"{name} 삭제할까요?"):
            return

        self.data["macros"].pop(idx)
        save_data(self.data)
        self._load_macro_list()

    def _add_event(self):
        idx = self._current_index()

        if idx < 0:
            return

        dialog = EventDialog(self)
        self.wait_window(dialog)

        if dialog.result:
            self.data["macros"][idx]["events"].append(dialog.result)
            save_data(self.data)
            self._refresh_events()

    def _edit_event(self):
        idx = self._current_index()
        event_idx = self._selected_event_index()

        if idx < 0 or event_idx is None:
            return

        old_event = self.data["macros"][idx]["events"][event_idx]

        dialog = EventDialog(self, event=old_event)
        self.wait_window(dialog)

        if dialog.result:
            self.data["macros"][idx]["events"][event_idx] = dialog.result
            save_data(self.data)
            self._refresh_events()

    def _delete_event(self):
        idx = self._current_index()
        event_idx = self._selected_event_index()

        if idx < 0 or event_idx is None:
            return

        self.data["macros"][idx]["events"].pop(event_idx)
        save_data(self.data)
        self._refresh_events()

    def _move_up(self):
        idx = self._current_index()
        event_idx = self._selected_event_index()

        if idx < 0 or event_idx is None or event_idx == 0:
            return

        events = self.data["macros"][idx]["events"]
        events[event_idx - 1], events[event_idx] = events[event_idx], events[event_idx - 1]

        save_data(self.data)
        self._refresh_events()
        self.tree.selection_set(str(event_idx - 1))

    def _move_down(self):
        idx = self._current_index()
        event_idx = self._selected_event_index()

        if idx < 0 or event_idx is None:
            return

        events = self.data["macros"][idx]["events"]

        if event_idx >= len(events) - 1:
            return

        events[event_idx], events[event_idx + 1] = events[event_idx + 1], events[event_idx]

        save_data(self.data)
        self._refresh_events()
        self.tree.selection_set(str(event_idx + 1))

    def _run_selected(self):
        idx = self._current_index()

        if idx < 0:
            return

        self.run_macro_by_index(idx)

    def run_macro_by_index(self, idx):
        events = self.data["macros"][idx].get("events", [])

        if not events:
            messagebox.showwarning("이벤트 없음", "이벤트를 먼저 추가하세요.")
            return

        self._execute_events(events, self.data["macros"][idx]["name"])

    def _execute_events(self, events, macro_name):
        global _running

        if _running:
            return

        _running = True
        runtime = build_runtime(self.data)
        ocr_server_url = get_ocr_server_url(self.data)
        security_config = self.data.get("security", {})

        if self.run_button is not None:
            self.run_button.config(state="disabled")

        self.status_cb(f"실행 중: {macro_name}")

        def worker():
            global _running

            try:
                for i, event in enumerate(events, start=1):
                    if not _running:
                        break

                    event_type = event.get("type")
                    memo = event.get("memo", "")

                    self.after(0, self.status_cb, f"[{i}/{len(events)}] {event_type} {memo}")

                    delay = float(event.get("delay", 0) or 0)
                    if delay > 0:
                        time.sleep(delay)

                    if not _running:
                        break

                    if event_type == "click":
                        click_xy(
                            x=float(event["x"]),
                            y=float(event["y"]),
                            runtime=runtime,
                            button=event.get("button", "left"),
                            label=memo or f"event_{i}",
                        )

                    elif event_type == "wait":
                        seconds = float(event.get("seconds", 1.0))
                        time.sleep(seconds)

                    elif event_type == "wait_change":
                        timeout_sec = float(event.get("seconds", 30.0))
                        wait_until_screen_changed(
                            timeout_sec=timeout_sec,
                            interval_sec=0.25,
                            change_ratio_threshold=0.015,
                        )

                    elif event_type == "wait_security":
                        timeout_sec = float(event.get("seconds", 30.0))
                        roi_box = union_boxes(
                            security_config.get("order_box"),
                            security_config.get("keypad_box"),
                        )

                        # If boxes are not configured, fall back to full-screen change detection.
                        wait_until_screen_changed(
                            timeout_sec=timeout_sec,
                            interval_sec=0.10,
                            change_ratio_threshold=0.012,
                            roi_box=roi_box,
                        )

                    elif event_type == "ocr_security":
                        retry_max, retry_interval = get_ocr_security_retry_config(self.data)
                        last_error = None
                        result = None

                        # Start capturing a short post-event window of frames. If the first frame is
                        # "too early" (security UI not yet visible), consume the next buffered frame
                        # immediately instead of doing a slow re-capture loop.
                        buffer_fps = 12.0
                        buffer_sec = max(2.0, float(retry_max) * float(retry_interval) + 0.75)
                        min_delay_sec = min(0.60, max(0.10, float(retry_interval)))
                        deadline = time.time() + max(2.0, float(retry_max) * float(retry_interval) + 3.0)

                        fb = FrameBuffer(fps=buffer_fps, max_sec=buffer_sec)
                        fb.start()

                        try:
                            start_ts = time.time()
                            last_used_ts = start_ts + min_delay_sec

                            for attempt in range(1, retry_max + 1):
                                if not _running:
                                    break

                                remaining = max(0.1, deadline - time.time())
                                frame = fb.wait_next(after_ts=last_used_ts, timeout_sec=remaining)
                                if frame is None:
                                    last_error = TimeoutError("ocr_security: no buffered frames available")
                                    break

                                frame_ts, frame_img = frame
                                last_used_ts = frame_ts

                                try:
                                    frame_img.save(SCREENSHOT_PATH)
                                except Exception:
                                    capture_screen(SCREENSHOT_PATH)

                                try:
                                    result = request_security_challenge(
                                        image_path=SCREENSHOT_PATH,
                                        server_url=ocr_server_url,
                                        security_config=security_config,
                                        timeout_sec=90,
                                    )
                                    last_error = None
                                    break
                                except Exception as error:
                                    last_error = error
                                    print(f"[ocr_security] attempt {attempt}/{retry_max} failed: {error}")
                                    # No sleep here: we rely on subsequent buffered frames arriving shortly.

                            if result is None:
                                raise RuntimeError(f"ocr_security failed after {retry_max} attempts: {last_error}")
                        finally:
                            fb.stop()

                        sequence = result["sequence"]
                        buttons = result["buttons"]

                        print("[ocr_security] mode:", result.get("mode"))
                        print("[ocr_security] order_box:", result.get("order_box"))
                        print("[ocr_security] keypad_box:", result.get("keypad_box"))
                        print("[ocr_security] sequence:", sequence)
                        print("[ocr_security] buttons:", buttons)

                        for digit in sequence:
                            if not _running:
                                break

                            x, y = buttons[digit]
                            click_xy(
                                x=float(x),
                                y=float(y),
                                runtime=runtime,
                                button="left",
                                label=f"security_{digit}",
                            )

                    elif event_type == "cv_security":
                        # CV solver is fully separate from OCR. If it fails, we raise and stop.
                        capture_screen(SCREENSHOT_PATH)
                        result = request_cv_security_challenge(
                            image_path=SCREENSHOT_PATH,
                            server_url=ocr_server_url,
                            security_config=security_config,
                            timeout_sec=15,
                        )

                        sequence = result["sequence"]
                        buttons = result["buttons"]

                        print("[cv_security] sequence:", sequence)
                        print("[cv_security] buttons:", buttons)

                        for digit in sequence:
                            if not _running:
                                break
                            x, y = buttons[digit]
                            click_xy(
                                x=float(x),
                                y=float(y),
                                runtime=runtime,
                                button="left",
                                label=f"cv_security_{digit}",
                            )

                    elif event_type == "screenshot":
                        capture_screen(SCREENSHOT_PATH)

                    elif event_type == "pause":
                        messagebox.showinfo("일시정지", event.get("message", "계속하려면 확인을 누르세요."))

                    else:
                        raise ValueError(f"알 수 없는 이벤트 타입입니다: {event_type}")

                    time.sleep(runtime.between_event_sec)

                self.after(0, self.status_cb, "매크로 완료")

            except Exception as error:
                self.after(0, self.status_cb, f"에러: {error}")
                print("[error]", error)

            finally:
                _running = False
                if self.run_button is not None:
                    self.after(0, self.run_button.config, {"state": "normal"})

        threading.Thread(target=worker, daemon=True).start()


class MacroApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Custom Macro Runner")
        self.geometry("1040x760")
        self.minsize(960, 660)
        self.configure(bg="#1e1e2e")

        self.data = load_data()

        self._build()
        self._start_hotkey_listener()
        self.protocol("WM_DELETE_WINDOW", self._quit)

    def _build(self):
        bg = "#1e1e2e"

        tk.Label(
            self,
            text="Custom Macro Runner",
            bg=bg,
            fg="#e61e2b",
            font=("Malgun Gothic", 17, "bold")
        ).pack(pady=(14, 6))

        coord_frame = tk.Frame(self, bg="#11111b")
        coord_frame.pack(fill="x", padx=14, pady=(0, 8))

        tk.Label(
            coord_frame,
            text="현재 좌표",
            bg="#11111b",
            fg="#6c7086",
            font=("Malgun Gothic", 9)
        ).pack(side="left", padx=(8, 8), pady=5)

        self.coord_var = tk.StringVar(value="X: 0   Y: 0")

        tk.Label(
            coord_frame,
            textvariable=self.coord_var,
            bg="#11111b",
            fg="#89dceb",
            font=("Consolas", 11, "bold")
        ).pack(side="left", pady=5)

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=14, pady=8)

        self.macro_tab = MacroTab(self.notebook, self.data, self.set_status)
        self.security_tab = SecurityTab(self.notebook, self.data, self.set_status)
        self.runtime_tab = RuntimeTab(self.notebook, self.data, self.set_status)

        self.notebook.add(self.macro_tab, text="시퀀스 매크로")
        self.notebook.add(self.security_tab, text="보안 인증 설정")
        self.notebook.add(self.runtime_tab, text="속도 파라미터")

        self.status_var = tk.StringVar(value="대기 중")

        tk.Label(
            self,
            textvariable=self.status_var,
            bg="#11111b",
            fg="#a6e3a1",
            font=("Consolas", 10),
            anchor="w",
            padx=10
        ).pack(fill="x", padx=14, pady=(4, 12))

        self._update_coord()
        normalize_button_colors(self)

    def _update_coord(self):
        try:
            x, y = pyautogui.position()
            self.coord_var.set(f"X: {x}   Y: {y}")
        except Exception:
            pass

        self.after(100, self._update_coord)

    def set_status(self, message):
        self.status_var.set(message)

    def _start_hotkey_listener(self):
        def on_press(key):
            try:
                name = key.name.lower()
            except Exception:
                return

            if name == "esc":
                stop_all()
                self.after(0, self.set_status, "ESC, 긴급 중단")
                return

            for index, macro in enumerate(self.data.get("macros", [])):
                if macro.get("hotkey", "").lower() == name:
                    if not _running:
                        self.after(0, self.macro_tab.run_macro_by_index, index)
                    break

        self.listener = kb.Listener(on_press=on_press)
        self.listener.daemon = True
        self.listener.start()

    def _quit(self):
        try:
            self.listener.stop()
        except Exception:
            pass

        stop_all()
        self.destroy()


if __name__ == "__main__":
    app = MacroApp()
    app.mainloop()
