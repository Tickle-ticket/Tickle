from __future__ import annotations

import json
import random
import threading
import urllib.error
import urllib.request
from dataclasses import dataclass, replace
from typing import Iterable

import tkinter as tk
from tkinter import messagebox, ttk

from .cli import DEFAULT_SEATS, DEFAULT_URL, MacroConfig, config_for_single_run, run_macro_sequence


@dataclass(frozen=True)
class RangePreset:
    slow_mo_ms: tuple[int, int]
    action_delay_ms: tuple[int, int]
    hover_ms: tuple[int, int]
    typing_delay_ms: tuple[int, int]
    mouse_steps: tuple[int, int]


# "완전 매크로" vs "사람 최대 반응속도(인간 한계)" vs "사람 유사" 기준값.
PRESETS = {
    "macro": RangePreset(
        slow_mo_ms=(0, 15),
        action_delay_ms=(0, 20),
        hover_ms=(0, 20),
        typing_delay_ms=(0, 15),
        mouse_steps=(1, 4),
    ),
    "human_limit": RangePreset(
        slow_mo_ms=(0, 20),
        action_delay_ms=(120, 260),
        hover_ms=(60, 180),
        typing_delay_ms=(55, 120),
        mouse_steps=(6, 14),
    ),
    "human_like": RangePreset(
        slow_mo_ms=(5, 30),
        action_delay_ms=(180, 650),
        hover_ms=(120, 500),
        typing_delay_ms=(70, 220),
        mouse_steps=(10, 28),
    ),
}


# 자동 랜덤모드 기본 범위: 완전 매크로(최소) ~ 인간 한계(최대)
AUTO_RANDOM_DEFAULT_BOUNDS = RangePreset(
    slow_mo_ms=(PRESETS["macro"].slow_mo_ms[0], PRESETS["human_limit"].slow_mo_ms[1]),
    action_delay_ms=(PRESETS["macro"].action_delay_ms[0], PRESETS["human_limit"].action_delay_ms[1]),
    hover_ms=(PRESETS["macro"].hover_ms[0], PRESETS["human_limit"].hover_ms[1]),
    typing_delay_ms=(PRESETS["macro"].typing_delay_ms[0], PRESETS["human_limit"].typing_delay_ms[1]),
    mouse_steps=(PRESETS["macro"].mouse_steps[0], PRESETS["human_limit"].mouse_steps[1]),
)


RANDOM_FIELDS: tuple[str, ...] = ("slow_mo_ms", "action_delay_ms", "hover_ms", "typing_delay_ms", "mouse_steps")


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=3) as res:  # noqa: S310 - local collector api
        body = res.read().decode("utf-8")
    return json.loads(body) if body else {}


class MacroRunnerApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Playwright Macro Runner")
        self.geometry("980x900")
        self.minsize(860, 680)
        self.configure(bg="#111827")
        self.resizable(True, True)

        self.worker: threading.Thread | None = None

        # Collector API가 켜져 있으면 매크로 실행 전 label=macro 신호를 보내서
        # 저장되는 trial이 human으로 잘못 라벨링되는 것을 방지한다.
        self.collector_api_var = tk.StringVar(value="http://127.0.0.1:8000")

        self.url_var = tk.StringVar(value=DEFAULT_URL)
        self.seats_var = tk.StringVar(value=" ".join(DEFAULT_SEATS))
        self.repeat_var = tk.StringVar(value="10")
        self.timeout_var = tk.StringVar(value="15000")

        self.headless_var = tk.BooleanVar(value=False)
        self.skip_queue_var = tk.BooleanVar(value=True)
        self.confirm_var = tk.BooleanVar(value=True)
        self.mode_var = tk.StringVar(value="random")

        self.slow_mo_var = tk.StringVar(value="10")
        self.action_delay_var = tk.StringVar(value="10")
        self.hover_var = tk.StringVar(value="10")
        self.typing_delay_var = tk.StringVar(value="10")
        self.mouse_steps_var = tk.StringVar(value="6")

        # 자동 랜덤모드: 범위를 직접 수정할 수 있게 한다.
        self.random_bounds_vars: dict[str, tuple[tk.StringVar, tk.StringVar]] = {}
        for field_name in RANDOM_FIELDS:
            low, high = getattr(AUTO_RANDOM_DEFAULT_BOUNDS, field_name)
            self.random_bounds_vars[field_name] = (tk.StringVar(value=str(low)), tk.StringVar(value=str(high)))

        self.canvas: tk.Canvas | None = None
        self.scrollable_body: tk.Frame | None = None
        self.log_widget: tk.Text | None = None
        self.run_button: tk.Button | None = None
        self.status_var = tk.StringVar(value="대기 중")

        self._build()

    def _section_frame(self, parent: tk.Widget, title: str) -> tuple[tk.Frame, tk.Frame]:
        frame = tk.Frame(parent, bg="#1f2937", highlightthickness=1, highlightbackground="#374151")
        tk.Label(
            frame,
            text=title,
            bg="#1f2937",
            fg="#f9fafb",
            font=("Malgun Gothic", 12, "bold"),
        ).pack(anchor="w", padx=14, pady=(12, 8))

        content = tk.Frame(frame, bg="#1f2937")
        content.pack(fill="both", expand=True, pady=(0, 8))
        return frame, content

    def _labeled_entry(self, parent: tk.Widget, row: int, label: str, variable: tk.StringVar) -> None:
        tk.Label(
            parent,
            text=label,
            bg="#1f2937",
            fg="#d1d5db",
            font=("Malgun Gothic", 10),
        ).grid(row=row, column=0, sticky="e", padx=(14, 10), pady=6)
        tk.Entry(
            parent,
            textvariable=variable,
            bg="#111827",
            fg="#f9fafb",
            insertbackground="#f9fafb",
            relief="flat",
            font=("Consolas", 10),
        ).grid(row=row, column=1, sticky="ew", padx=(0, 14), pady=6)

    def _build(self) -> None:
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = tk.Frame(self, bg="#111827")
        header.grid(row=0, column=0, sticky="ew", padx=18, pady=(18, 10))
        header.columnconfigure(0, weight=1)

        tk.Label(
            header,
            text="Playwright Macro Runner",
            bg="#111827",
            fg="#f9fafb",
            font=("Malgun Gothic", 20, "bold"),
        ).grid(row=0, column=0, sticky="w")
        tk.Label(
            header,
            text="수동 실행/자동 랜덤 파라미터 조정까지 지원하는 데스크탑 실행 UI",
            bg="#111827",
            fg="#9ca3af",
            font=("Malgun Gothic", 10),
        ).grid(row=1, column=0, sticky="w", pady=(6, 0))

        outer = tk.Frame(self, bg="#111827")
        outer.grid(row=1, column=0, sticky="nsew", padx=18, pady=(0, 18))
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(0, weight=1)

        canvas = tk.Canvas(outer, bg="#111827", highlightthickness=0, bd=0)
        canvas.grid(row=0, column=0, sticky="nsew")
        self.canvas = canvas

        scrollbar = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        canvas.configure(yscrollcommand=scrollbar.set)

        body = tk.Frame(canvas, bg="#111827")
        body.columnconfigure(0, weight=1)
        body.columnconfigure(1, weight=1)
        self.scrollable_body = body

        body_window = canvas.create_window((0, 0), window=body, anchor="nw")

        def on_body_configure(_event: tk.Event) -> None:
            canvas.configure(scrollregion=canvas.bbox("all"))

        def on_canvas_configure(event: tk.Event) -> None:
            canvas.itemconfigure(body_window, width=event.width)

        def on_mousewheel(event: tk.Event) -> None:
            delta = 0
            if getattr(event, "delta", 0):
                delta = int(-event.delta / 120)
            elif getattr(event, "num", None) == 4:
                delta = -1
            elif getattr(event, "num", None) == 5:
                delta = 1
            if delta:
                canvas.yview_scroll(delta, "units")

        body.bind("<Configure>", on_body_configure)
        canvas.bind("<Configure>", on_canvas_configure)
        canvas.bind_all("<MouseWheel>", on_mousewheel)
        canvas.bind_all("<Button-4>", on_mousewheel)
        canvas.bind_all("<Button-5>", on_mousewheel)

        self._build_basic_section(body)
        self._build_manual_section(body)
        self._build_random_section(body)
        self._build_log_section(body)

    def _build_basic_section(self, parent: tk.Widget) -> None:
        frame, content = self._section_frame(parent, "기본 설정")
        frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10), pady=(0, 10))
        content.columnconfigure(1, weight=1)

        self._labeled_entry(content, 0, "Collector API URL", self.collector_api_var)
        self._labeled_entry(content, 1, "대상 URL", self.url_var)
        self._labeled_entry(content, 2, "좌석 목록", self.seats_var)
        self._labeled_entry(content, 3, "반복 횟수", self.repeat_var)
        self._labeled_entry(content, 4, "Timeout(ms)", self.timeout_var)

        option_row = tk.Frame(content, bg="#1f2937")
        option_row.grid(row=5, column=0, columnspan=2, sticky="w", padx=14, pady=(8, 6))
        for variable, text in [
            (self.skip_queue_var, "대기열 스킵"),
            (self.confirm_var, "예매 확정"),
            (self.headless_var, "헤드리스"),
        ]:
            tk.Checkbutton(
                option_row,
                text=text,
                variable=variable,
                bg="#1f2937",
                fg="#f9fafb",
                selectcolor="#111827",
                activebackground="#1f2937",
                activeforeground="#f9fafb",
                font=("Malgun Gothic", 10),
            ).pack(side="left", padx=(0, 14))

        mode_row = tk.Frame(content, bg="#1f2937")
        mode_row.grid(row=6, column=0, columnspan=2, sticky="w", padx=14, pady=(4, 14))
        tk.Label(
            mode_row,
            text="실행 모드",
            bg="#1f2937",
            fg="#d1d5db",
            font=("Malgun Gothic", 10, "bold"),
        ).pack(side="left", padx=(0, 12))

        for value, label in [("manual", "수동 모드"), ("random", "자동 랜덤 모드")]:
            tk.Radiobutton(
                mode_row,
                text=label,
                variable=self.mode_var,
                value=value,
                bg="#1f2937",
                fg="#f9fafb",
                selectcolor="#111827",
                activebackground="#1f2937",
                activeforeground="#f9fafb",
                font=("Malgun Gothic", 10),
            ).pack(side="left", padx=(0, 14))

    def _build_manual_section(self, parent: tk.Widget) -> None:
        frame, content = self._section_frame(parent, "수동 파라미터")
        frame.grid(row=0, column=1, sticky="nsew", pady=(0, 10))
        content.columnconfigure(1, weight=1)

        self._labeled_entry(content, 0, "slow_mo_ms", self.slow_mo_var)
        self._labeled_entry(content, 1, "action_delay_ms", self.action_delay_var)
        self._labeled_entry(content, 2, "hover_ms", self.hover_var)
        self._labeled_entry(content, 3, "typing_delay_ms", self.typing_delay_var)
        self._labeled_entry(content, 4, "mouse_steps", self.mouse_steps_var)

        tk.Label(
            content,
            text="수동 모드에서는 위 값을 그대로 사용합니다.",
            bg="#1f2937",
            fg="#9ca3af",
            font=("Malgun Gothic", 9),
        ).grid(row=5, column=0, columnspan=2, sticky="w", padx=14, pady=(6, 14))

    def _build_random_section(self, parent: tk.Widget) -> None:
        frame, content = self._section_frame(parent, "자동 랜덤 모드")
        frame.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=(0, 10))

        tk.Label(
            content,
            text=(
                "자동 랜덤 모드에서는 반복 횟수만큼 파라미터를 범위 내에서 랜덤 샘플링해 순차 실행합니다.\n"
                "기본 범위는 '완전 매크로' 최소 ~ '인간 최대 반응속도' 최대이며, 아래에서 수정할 수 있습니다."
            ),
            bg="#1f2937",
            fg="#d1d5db",
            justify="left",
            font=("Malgun Gothic", 10),
        ).pack(anchor="w", padx=14, pady=(0, 10))

        grid = tk.Frame(content, bg="#1f2937")
        grid.pack(fill="x", padx=14, pady=(0, 14))
        for col in range(3):
            grid.columnconfigure(col, weight=1)

        for text, col in [("파라미터", 0), ("최소", 1), ("최대", 2)]:
            tk.Label(
                grid,
                text=text,
                bg="#1f2937",
                fg="#9ca3af",
                font=("Malgun Gothic", 9, "bold"),
            ).grid(row=0, column=col, sticky="w", pady=(0, 8))

        for row, field_name in enumerate(RANDOM_FIELDS, start=1):
            low_var, high_var = self.random_bounds_vars[field_name]
            tk.Label(
                grid,
                text=field_name,
                bg="#1f2937",
                fg="#d1d5db",
                font=("Consolas", 10),
            ).grid(row=row, column=0, sticky="w", pady=4)
            tk.Entry(
                grid,
                textvariable=low_var,
                bg="#111827",
                fg="#f9fafb",
                insertbackground="#f9fafb",
                relief="flat",
                font=("Consolas", 10),
            ).grid(row=row, column=1, sticky="ew", pady=4, padx=(0, 10))
            tk.Entry(
                grid,
                textvariable=high_var,
                bg="#111827",
                fg="#f9fafb",
                insertbackground="#f9fafb",
                relief="flat",
                font=("Consolas", 10),
            ).grid(row=row, column=2, sticky="ew", pady=4)

        tk.Label(
            content,
            text="예: 반복 횟수 10이면, 자동으로 10개 config를 만들어서 순차 실행합니다.",
            bg="#1f2937",
            fg="#fbbf24",
            font=("Malgun Gothic", 10, "bold"),
        ).pack(anchor="w", padx=14, pady=(0, 8))

    def _build_log_section(self, parent: tk.Widget) -> None:
        frame, content = self._section_frame(parent, "실행")
        frame.grid(row=2, column=0, columnspan=2, sticky="nsew", pady=(0, 10))

        button_row = tk.Frame(content, bg="#1f2937")
        button_row.pack(fill="x", padx=14, pady=(0, 10))

        self.run_button = tk.Button(
            button_row,
            text="매크로 실행",
            command=self.start_run,
            bg="#16a34a",
            fg="#ffffff",
            relief="flat",
            padx=40,
            pady=16,
            font=("Malgun Gothic", 14, "bold"),
        )
        self.run_button.pack(side="left", padx=(0, 10))

        tk.Button(
            button_row,
            text="로그 지우기",
            command=self.clear_log,
            bg="#4b5563",
            fg="#ffffff",
            relief="flat",
            padx=18,
            pady=14,
            font=("Malgun Gothic", 11),
        ).pack(side="left")

        tk.Label(
            button_row,
            textvariable=self.status_var,
            bg="#1f2937",
            fg="#fbbf24",
            font=("Malgun Gothic", 11, "bold"),
        ).pack(side="right")

        text_frame = tk.Frame(content, bg="#1f2937")
        text_frame.pack(fill="both", expand=True, padx=14, pady=(0, 14))
        text_frame.rowconfigure(0, weight=1)
        text_frame.columnconfigure(0, weight=1)

        self.log_widget = tk.Text(
            text_frame,
            bg="#111827",
            fg="#e5e7eb",
            insertbackground="#e5e7eb",
            font=("Consolas", 10),
            relief="flat",
            wrap="word",
            height=16,
        )
        self.log_widget.grid(row=0, column=0, sticky="nsew")

        scrollbar = ttk.Scrollbar(text_frame, orient="vertical", command=self.log_widget.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.log_widget.configure(yscrollcommand=scrollbar.set)

    def append_log(self, message: str) -> None:
        if self.log_widget is None:
            return
        self.log_widget.insert("end", f"{message}\n")
        self.log_widget.see("end")
        self.update_idletasks()

    def clear_log(self) -> None:
        if self.log_widget is None:
            return
        self.log_widget.delete("1.0", "end")

    def _safe_int(self, raw: str, field_label: str) -> int:
        try:
            return int(str(raw).strip())
        except Exception as error:  # noqa: BLE001
            raise ValueError(f"{field_label} 값이 정수가 아닙니다: {raw}") from error

    def build_base_config(self) -> MacroConfig:
        seats = tuple(part.strip() for part in self.seats_var.get().split() if part.strip())
        if not seats:
            raise ValueError("좌석 목록에 1개 이상 입력하세요.")

        return MacroConfig(
            url=self.url_var.get().strip() or DEFAULT_URL,
            seats=seats,
            headless=self.headless_var.get(),
            skip_queue=self.skip_queue_var.get(),
            confirm_booking=self.confirm_var.get(),
            repeat=max(1, self._safe_int(self.repeat_var.get(), "반복 횟수")),
            timeout_ms=max(1000, self._safe_int(self.timeout_var.get(), "Timeout(ms)")),
            slow_mo_ms=max(0, self._safe_int(self.slow_mo_var.get(), "slow_mo_ms")),
            action_delay_ms=max(0, self._safe_int(self.action_delay_var.get(), "action_delay_ms")),
            hover_ms=max(0, self._safe_int(self.hover_var.get(), "hover_ms")),
            typing_delay_ms=max(0, self._safe_int(self.typing_delay_var.get(), "typing_delay_ms")),
            mouse_steps=max(1, self._safe_int(self.mouse_steps_var.get(), "mouse_steps")),
        )

    def _random_between(self, bounds: tuple[int, int]) -> int:
        low, high = bounds
        if high < low:
            low, high = high, low
        return random.randint(low, high)

    def _get_bounds_from_ui(self, field_name: str) -> tuple[int, int]:
        low_var, high_var = self.random_bounds_vars[field_name]
        low = self._safe_int(low_var.get(), f"{field_name}.min")
        high = self._safe_int(high_var.get(), f"{field_name}.max")
        return (low, high)

    def build_run_configs(self) -> list[MacroConfig]:
        base = self.build_base_config()
        repeat = base.repeat

        if self.mode_var.get() == "manual":
            return [config_for_single_run(base) for _ in range(repeat)]

        configs: list[MacroConfig] = []
        for _ in range(repeat):
            configs.append(
                replace(
                    config_for_single_run(base),
                    slow_mo_ms=self._random_between(self._get_bounds_from_ui("slow_mo_ms")),
                    action_delay_ms=self._random_between(self._get_bounds_from_ui("action_delay_ms")),
                    hover_ms=self._random_between(self._get_bounds_from_ui("hover_ms")),
                    typing_delay_ms=self._random_between(self._get_bounds_from_ui("typing_delay_ms")),
                    mouse_steps=max(1, self._random_between(self._get_bounds_from_ui("mouse_steps"))),
                )
            )
        return configs

    def _enqueue_macro_labels(self, repeat: int) -> None:
        base_url = self.collector_api_var.get().strip()
        if not base_url:
            return
        url = f"{base_url.rstrip('/')}/api/labels/enqueue"
        try:
            _post_json(url, {"label": "macro", "repeat": int(repeat)})
            self.append_log(f"[label] collector_api에 label=macro x{repeat} 등록")
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            self.append_log(f"[warn] label 신호 전송 실패(collector_api 미기동?): {error}")

    def start_run(self) -> None:
        if self.worker and self.worker.is_alive():
            messagebox.showinfo("실행 중", "이미 실행 중입니다.")
            return

        try:
            configs = self.build_run_configs()
        except Exception as error:  # noqa: BLE001
            messagebox.showerror("입력 오류", str(error))
            return

        if self.run_button is not None:
            self.run_button.configure(state="disabled")
        self.status_var.set("실행 중")
        self.append_log("=== Macro run start ===")
        self.append_log(f"[mode] {self.mode_var.get()}")

        self._enqueue_macro_labels(len(configs))

        for index, config in enumerate(configs, start=1):
            self.append_log(
                f"[config {index}] slow_mo={config.slow_mo_ms}, action_delay={config.action_delay_ms}, "
                f"hover={config.hover_ms}, typing={config.typing_delay_ms}, mouse_steps={config.mouse_steps}"
            )

        def worker() -> None:
            exit_code = run_macro_sequence(configs, progress=self._queue_log)
            self.after(0, self._finish_run, exit_code)

        self.worker = threading.Thread(target=worker, daemon=True)
        self.worker.start()

    def _queue_log(self, message: str) -> None:
        self.after(0, self.append_log, message)

    def _finish_run(self, exit_code: int) -> None:
        if self.run_button is not None:
            self.run_button.configure(state="normal")
        self.status_var.set("완료" if exit_code == 0 else "실패")
        self.append_log(f"=== Macro run end: exit_code={exit_code} ===")


def main() -> None:
    app = MacroRunnerApp()
    app.mainloop()

