"""tickle-ticket 오토마우스 v2 GUI — 계정 관리 + 실행."""
from __future__ import annotations

import json
import os
import sys
import io
import threading
from pathlib import Path
from dataclasses import replace
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

from macro.raw.macro import Config, run_macro, PRESETS

ACCOUNTS_FILE = Path(__file__).parent / "accounts.json"
BG = "#111827"
CARD = "#1f2937"
BORDER = "#374151"
FG = "#f9fafb"
FG2 = "#d1d5db"
FG3 = "#9ca3af"
GREEN = "#16a34a"
RED = "#dc2626"
YELLOW = "#fbbf24"
BLUE = "#3b82f6"
FONT = ("Malgun Gothic", 10)
FONT_B = ("Malgun Gothic", 10, "bold")
MONO = ("Consolas", 10)


# ── 계정 저장/불러오기 ─────────────────────────────────────────
def load_accounts() -> dict[int, dict]:
    if ACCOUNTS_FILE.exists():
        try:
            return {int(k): v for k, v in json.loads(ACCOUNTS_FILE.read_text("utf-8")).items()}
        except Exception:
            pass
    return {}


def save_accounts(accounts: dict[int, dict]) -> None:
    ACCOUNTS_FILE.write_text(
        json.dumps({str(k): v for k, v in sorted(accounts.items())}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ── 계정 추가/수정 다이얼로그 ──────────────────────────────────
class AccountDialog(tk.Toplevel):
    def __init__(self, parent: tk.Widget, slot: int, existing: dict | None = None):
        super().__init__(parent)
        self.title(f"계정 {slot:02d} {'수정' if existing else '추가'}")
        self.configure(bg=BG)
        self.resizable(False, False)
        self.result: dict | None = None

        self._id_var = tk.StringVar(value=existing.get("id", "") if existing else "")
        self._pw_var = tk.StringVar(value=existing.get("pw", "") if existing else "")
        self._label_var = tk.StringVar(value=existing.get("label", f"계정 {slot:02d}") if existing else f"계정 {slot:02d}")

        pad = {"padx": 14, "pady": 6}
        for row, (label, var, show) in enumerate([
            ("이름(별칭)", self._label_var, ""),
            ("이메일 / ID", self._id_var, ""),
            ("비밀번호", self._pw_var, "*"),
        ]):
            tk.Label(self, text=label, bg=BG, fg=FG2, font=FONT).grid(row=row, column=0, sticky="e", **pad)
            e = tk.Entry(self, textvariable=var, show=show, bg=CARD, fg=FG, insertbackground=FG,
                         relief="flat", font=MONO, width=28)
            e.grid(row=row, column=1, sticky="ew", **pad)

        btn_row = tk.Frame(self, bg=BG)
        btn_row.grid(row=3, column=0, columnspan=2, pady=(4, 14))

        tk.Button(btn_row, text="저장", command=self._save,
                  bg=GREEN, fg=FG, relief="flat", padx=20, pady=8, font=FONT_B).pack(side="left", padx=6)
        tk.Button(btn_row, text="취소", command=self.destroy,
                  bg=BORDER, fg=FG, relief="flat", padx=20, pady=8, font=FONT).pack(side="left", padx=6)

        self.grab_set()
        self.wait_window()

    def _save(self) -> None:
        id_ = self._id_var.get().strip()
        pw = self._pw_var.get()
        if not id_ or not pw:
            messagebox.showerror("입력 오류", "이메일/ID와 비밀번호를 입력하세요.", parent=self)
            return
        self.result = {"id": id_, "pw": pw, "label": self._label_var.get().strip() or id_}
        self.destroy()


# ── 메인 앱 ───────────────────────────────────────────────────
class MacroV2App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Tickle Macro v2 — 오토마우스")
        self.geometry("1100x760")
        self.minsize(900, 620)
        self.configure(bg=BG)

        self._accounts: dict[int, dict] = load_accounts()
        self._selected: set[int] = set()
        self._check_vars: dict[int, tk.BooleanVar] = {}
        self._worker: threading.Thread | None = None
        self._stop_event = threading.Event()

        # 설정 변수
        self._preset_var = tk.StringVar(value="macro")
        self._repeat_var = tk.StringVar(value="1")
        self._timeout_var = tk.StringVar(value="20000")
        self._collector_var = tk.StringVar(value="http://127.0.0.1:8000")
        self._event_idx_var = tk.StringVar(value="0")
        self._status_var = tk.StringVar(value="대기 중")

        self._build()

    # ── 레이아웃 ──────────────────────────────────────────────
    def _build(self) -> None:
        self.columnconfigure(0, weight=0)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(0, weight=1)

        self._build_left()
        self._build_right()

    def _build_left(self) -> None:
        frame = tk.Frame(self, bg=CARD, width=300, highlightthickness=1, highlightbackground=BORDER)
        frame.grid(row=0, column=0, sticky="nsew", padx=(12, 6), pady=12)
        frame.pack_propagate(False)

        # 헤더
        hdr = tk.Frame(frame, bg=CARD)
        hdr.pack(fill="x", padx=12, pady=(12, 4))
        tk.Label(hdr, text="계정 목록", bg=CARD, fg=FG, font=("Malgun Gothic", 13, "bold")).pack(side="left")

        # 전체 선택
        self._all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(hdr, text="전체", variable=self._all_var, command=self._toggle_all,
                       bg=CARD, fg=FG2, selectcolor=BG, activebackground=CARD,
                       activeforeground=FG, font=FONT).pack(side="right")

        # 버튼
        btn_row = tk.Frame(frame, bg=CARD)
        btn_row.pack(fill="x", padx=12, pady=(0, 8))
        for text, cmd, color in [
            ("+ 추가", self._add_account, BLUE),
            ("수정", self._edit_account, "#6b7280"),
            ("삭제", self._delete_account, RED),
        ]:
            tk.Button(btn_row, text=text, command=cmd, bg=color, fg=FG,
                      relief="flat", padx=10, pady=5, font=FONT).pack(side="left", padx=(0, 4))

        # 계정 스크롤 리스트
        list_outer = tk.Frame(frame, bg=CARD)
        list_outer.pack(fill="both", expand=True, padx=4, pady=(0, 8))
        list_outer.rowconfigure(0, weight=1)
        list_outer.columnconfigure(0, weight=1)

        self._list_canvas = tk.Canvas(list_outer, bg=CARD, highlightthickness=0)
        self._list_canvas.grid(row=0, column=0, sticky="nsew")

        sb = ttk.Scrollbar(list_outer, orient="vertical", command=self._list_canvas.yview)
        sb.grid(row=0, column=1, sticky="ns")
        self._list_canvas.configure(yscrollcommand=sb.set)

        self._list_frame = tk.Frame(self._list_canvas, bg=CARD)
        self._list_win = self._list_canvas.create_window((0, 0), window=self._list_frame, anchor="nw")

        self._list_frame.bind("<Configure>", lambda e: self._list_canvas.configure(
            scrollregion=self._list_canvas.bbox("all")))
        self._list_canvas.bind("<Configure>", lambda e: self._list_canvas.itemconfigure(
            self._list_win, width=e.width))
        self._list_canvas.bind_all("<MouseWheel>", self._on_mousewheel)

        self._refresh_list()

    def _build_right(self) -> None:
        right = tk.Frame(self, bg=BG)
        right.grid(row=0, column=1, sticky="nsew", padx=(0, 12), pady=12)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        # 설정 섹션
        cfg_frame = tk.Frame(right, bg=CARD, highlightthickness=1, highlightbackground=BORDER)
        cfg_frame.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        cfg_frame.columnconfigure(1, weight=1)
        cfg_frame.columnconfigure(3, weight=1)

        tk.Label(cfg_frame, text="실행 설정", bg=CARD, fg=FG,
                 font=("Malgun Gothic", 12, "bold")).grid(row=0, column=0, columnspan=4, sticky="w", padx=14, pady=(12, 8))

        fields = [
            ("속도 프리셋", self._preset_var, None),
            ("반복 횟수", self._repeat_var, None),
            ("이벤트 번호", self._event_idx_var, None),
            ("Timeout(ms)", self._timeout_var, None),
            ("Collector API", self._collector_var, None),
        ]

        for i, (label, var, _) in enumerate(fields):
            row, col = divmod(i, 2)
            row += 1
            col_offset = col * 2
            tk.Label(cfg_frame, text=label, bg=CARD, fg=FG2, font=FONT).grid(
                row=row, column=col_offset, sticky="e", padx=(14 if col == 0 else 6, 6), pady=5)
            if label == "속도 프리셋":
                ttk.Combobox(cfg_frame, textvariable=var, values=list(PRESETS.keys()),
                             state="readonly", width=14, font=FONT).grid(
                    row=row, column=col_offset + 1, sticky="ew", padx=(0, 14), pady=5)
            else:
                tk.Entry(cfg_frame, textvariable=var, bg=BG, fg=FG, insertbackground=FG,
                         relief="flat", font=MONO).grid(
                    row=row, column=col_offset + 1, sticky="ew", padx=(0, 14), pady=5)

        # 실행 버튼 행
        btn_row = tk.Frame(cfg_frame, bg=CARD)
        btn_row.grid(row=4, column=0, columnspan=4, sticky="w", padx=14, pady=(4, 14))

        self._run_btn = tk.Button(btn_row, text="선택 계정으로 실행", command=self._start_run,
                                  bg=GREEN, fg=FG, relief="flat", padx=28, pady=12,
                                  font=("Malgun Gothic", 13, "bold"))
        self._run_btn.pack(side="left", padx=(0, 8))

        self._stop_btn = tk.Button(btn_row, text="중단", command=self._stop_run,
                                   bg=RED, fg=FG, relief="flat", padx=14, pady=10,
                                   font=FONT_B, state="disabled")
        self._stop_btn.pack(side="left", padx=(0, 8))

        tk.Button(btn_row, text="로그 지우기", command=self._clear_log,
                  bg=BORDER, fg=FG, relief="flat", padx=14, pady=10, font=FONT).pack(side="left")

        tk.Label(btn_row, textvariable=self._status_var, bg=CARD, fg=YELLOW,
                 font=FONT_B).pack(side="right", padx=8)

        # 로그
        log_frame = tk.Frame(right, bg=CARD, highlightthickness=1, highlightbackground=BORDER)
        log_frame.grid(row=1, column=0, sticky="nsew")
        log_frame.rowconfigure(1, weight=1)
        log_frame.columnconfigure(0, weight=1)

        tk.Label(log_frame, text="실행 로그", bg=CARD, fg=FG,
                 font=FONT_B).grid(row=0, column=0, sticky="w", padx=14, pady=(10, 4))

        self._log = tk.Text(log_frame, bg=BG, fg="#e5e7eb", insertbackground=FG,
                            font=MONO, relief="flat", wrap="word", height=18)
        self._log.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 8))

        log_sb = ttk.Scrollbar(log_frame, orient="vertical", command=self._log.yview)
        log_sb.grid(row=1, column=1, sticky="ns", pady=(0, 8))
        self._log.configure(yscrollcommand=log_sb.set)

    # ── 계정 목록 렌더 ────────────────────────────────────────
    def _refresh_list(self) -> None:
        for w in self._list_frame.winfo_children():
            w.destroy()
        self._check_vars.clear()

        if not self._accounts:
            tk.Label(self._list_frame, text="계정이 없습니다\n+ 추가 버튼으로 등록하세요",
                     bg=CARD, fg=FG3, font=FONT, justify="center").pack(pady=30)
            return

        for slot in sorted(self._accounts.keys()):
            acc = self._accounts[slot]
            var = tk.BooleanVar(value=slot in self._selected)
            self._check_vars[slot] = var

            row = tk.Frame(self._list_frame, bg=CARD)
            row.pack(fill="x", padx=6, pady=2)

            tk.Checkbutton(row, variable=var, bg=CARD, selectcolor=BG,
                           activebackground=CARD,
                           command=lambda s=slot, v=var: self._on_check(s, v)).pack(side="left", padx=(4, 0))

            tk.Label(row, text=f"{slot:02d}", bg=CARD, fg=FG3, font=MONO, width=3).pack(side="left")

            info = tk.Frame(row, bg=CARD)
            info.pack(side="left", fill="x", expand=True, padx=6)
            tk.Label(info, text=acc.get("label", acc["id"]), bg=CARD, fg=FG, font=FONT,
                     anchor="w").pack(fill="x")
            tk.Label(info, text=acc["id"], bg=CARD, fg=FG3, font=("Consolas", 9),
                     anchor="w").pack(fill="x")

    def _on_check(self, slot: int, var: tk.BooleanVar) -> None:
        if var.get():
            self._selected.add(slot)
        else:
            self._selected.discard(slot)

    def _toggle_all(self) -> None:
        if self._all_var.get():
            self._selected = set(self._accounts.keys())
        else:
            self._selected.clear()
        for slot, var in self._check_vars.items():
            var.set(slot in self._selected)

    def _on_mousewheel(self, event: tk.Event) -> None:
        delta = 0
        if getattr(event, "delta", 0):
            delta = int(-event.delta / 120)
        elif getattr(event, "num", None) == 4:
            delta = -1
        elif getattr(event, "num", None) == 5:
            delta = 1
        if delta:
            self._list_canvas.yview_scroll(delta, "units")

    # ── 계정 CRUD ─────────────────────────────────────────────
    def _next_slot(self) -> int:
        for i in range(1, 100):
            if i not in self._accounts:
                return i
        return -1

    def _add_account(self) -> None:
        slot = self._next_slot()
        if slot == -1:
            messagebox.showinfo("가득 참", "최대 99개 계정까지 등록 가능합니다.")
            return
        dlg = AccountDialog(self, slot)
        if dlg.result:
            self._accounts[slot] = dlg.result
            save_accounts(self._accounts)
            self._refresh_list()

    def _selected_single(self) -> int | None:
        checked = [s for s, v in self._check_vars.items() if v.get()]
        if len(checked) != 1:
            messagebox.showinfo("안내", "정확히 1개 계정을 선택하세요.")
            return None
        return checked[0]

    def _edit_account(self) -> None:
        slot = self._selected_single()
        if slot is None:
            return
        dlg = AccountDialog(self, slot, existing=self._accounts[slot])
        if dlg.result:
            self._accounts[slot] = dlg.result
            save_accounts(self._accounts)
            self._refresh_list()

    def _delete_account(self) -> None:
        checked = [s for s, v in self._check_vars.items() if v.get()]
        if not checked:
            messagebox.showinfo("안내", "삭제할 계정을 선택하세요.")
            return
        if not messagebox.askyesno("삭제 확인", f"선택한 {len(checked)}개 계정을 삭제할까요?"):
            return
        for s in checked:
            self._accounts.pop(s, None)
            self._selected.discard(s)
        save_accounts(self._accounts)
        self._refresh_list()

    # ── 실행 ──────────────────────────────────────────────────
    def _log_append(self, msg: str) -> None:
        self._log.insert("end", msg + "\n")
        self._log.see("end")
        self.update_idletasks()

    def _clear_log(self) -> None:
        self._log.delete("1.0", "end")

    def _start_run(self) -> None:
        if self._worker and self._worker.is_alive():
            messagebox.showinfo("실행 중", "이미 실행 중입니다.")
            return

        slots = sorted(s for s, v in self._check_vars.items() if v.get())
        if not slots:
            messagebox.showinfo("안내", "실행할 계정을 1개 이상 선택하세요.")
            return

        try:
            repeat = max(1, int(self._repeat_var.get()))
            timeout_ms = max(1000, int(self._timeout_var.get()))
            event_idx = max(0, int(self._event_idx_var.get()))
        except ValueError:
            messagebox.showerror("입력 오류", "반복 횟수/Timeout은 정수여야 합니다.")
            return

        preset = self._preset_var.get()
        preset_vals = dict(PRESETS.get(preset, PRESETS["macro"]))
        collector = self._collector_var.get().strip()

        self._stop_event.clear()
        self._run_btn.configure(state="disabled")
        self._stop_btn.configure(state="normal")
        self._status_var.set("실행 중")
        self._log_append(f"=== 실행 시작: 계정 {slots} / preset={preset} / repeat={repeat} ===")

        def worker() -> None:
            for slot in slots:
                if self._stop_event.is_set():
                    break
                acc = self._accounts.get(slot)
                if not acc:
                    continue
                self.after(0, self._log_append, f"\n--- 계정 {slot:02d}: {acc['label']} ({acc['id']}) ---")
                cfg = Config(
                    headless=False,
                    repeat=repeat,
                    timeout_ms=timeout_ms,
                    login_id=acc["id"],
                    login_pw=acc["pw"],
                    event_index=event_idx,
                    collector_api_url=collector,
                    **preset_vals,
                )
                # run_macro의 print를 로그로 리디렉션
                import io as _io
                old_stdout = sys.stdout

                class LogWriter(_io.TextIOBase):
                    def __init__(self_inner):
                        pass
                    def write(self_inner, s: str) -> int:
                        if s.strip():
                            self.after(0, self._log_append, s.rstrip())
                        return len(s)

                sys.stdout = LogWriter()
                try:
                    run_macro(cfg)
                finally:
                    sys.stdout = old_stdout

            self.after(0, self._finish_run)

        self._worker = threading.Thread(target=worker, daemon=True)
        self._worker.start()

    def _stop_run(self) -> None:
        self._stop_event.set()
        self._status_var.set("중단 요청")
        self._log_append("=== 중단 요청 ===")

    def _finish_run(self) -> None:
        self._run_btn.configure(state="normal")
        self._stop_btn.configure(state="disabled")
        self._status_var.set("완료")
        self._log_append("=== 실행 완료 ===")


def main() -> None:
    app = MacroV2App()
    app.mainloop()


if __name__ == "__main__":
    main()
