"""
오토마우스 v1.7 스타일 - 무한클릭 + 시퀀스 매크로
"""

import tkinter as tk
from tkinter import ttk, messagebox
import tkinter.simpledialog
import json, os, sys, time, threading
import pyautogui
from pynput import keyboard as kb

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "automouse_data.json")

DEFAULT_DATA = {
    "macros": [
        {"name": "Macro 1 - 날짜+예매하기", "hotkey": "f1", "events": []},
        {"name": "Macro 2 - 회차+다음단계",  "hotkey": "f2", "events": []},
        {"name": "Macro 3 - 좌석+선택완료", "hotkey": "f3", "events": []},
    ]
}

def load_data():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_DATA.copy()

def save_data(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── 전역 상태 ────────────────────────────────────────────
_running = False

def stop_all():
    global _running
    _running = False


# ══════════════════════════════════════════════════════════
# 탭 1 : 무한 클릭
# ══════════════════════════════════════════════════════════
class InfiniteClickTab(tk.Frame):
    def __init__(self, parent, status_cb):
        super().__init__(parent, bg="#1e1e2e")
        self._status = status_cb
        self._thread = None
        self._build()

    def _build(self):
        BG = "#1e1e2e"; FG = "#cdd6f4"; ENT = "#313244"; ACC = "#e61e2b"
        PAD = {"padx": 14, "pady": 6}

        style = ttk.Style()
        style.configure("IC.TLabel",  background=BG, foreground=FG, font=("Malgun Gothic", 10))
        style.configure("IC.TEntry",  fieldbackground=ENT, foreground=FG)
        style.configure("ICSub.TLabel", background=BG, foreground="#6c7086", font=("Malgun Gothic", 9))

        # ── 클릭 타입 ──
        ttk.Label(self, text="클릭 종류", style="IC.TLabel").grid(row=0, column=0, sticky="e", **PAD)
        self.btn_type = tk.StringVar(value="left")
        bf = tk.Frame(self, bg=BG)
        bf.grid(row=0, column=1, sticky="w", **PAD)
        for val, lbl in [("left","좌클릭"), ("right","우클릭"), ("double","더블클릭")]:
            tk.Radiobutton(bf, text=lbl, variable=self.btn_type, value=val,
                           bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                           activeforeground=FG, font=("Malgun Gothic", 10)
                           ).pack(side="left", padx=6)

        # ── 클릭 속도 ──
        ttk.Label(self, text="클릭 속도", style="IC.TLabel").grid(row=1, column=0, sticky="e", **PAD)
        spd_frame = tk.Frame(self, bg=BG)
        spd_frame.grid(row=1, column=1, sticky="w", **PAD)
        self.cps_var = tk.DoubleVar(value=10.0)
        tk.Scale(spd_frame, from_=1, to=50, resolution=1, orient="horizontal",
                 variable=self.cps_var, length=160,
                 bg=BG, fg=FG, troughcolor=ENT, highlightthickness=0,
                 activebackground=ACC, font=("Malgun Gothic", 9)
                 ).pack(side="left")
        self.cps_label = tk.Label(spd_frame, textvariable=self.cps_var,
                                   bg=BG, fg=ACC, font=("Malgun Gothic", 11, "bold"), width=4)
        self.cps_label.pack(side="left", padx=4)
        tk.Label(spd_frame, text="CPS (초당 클릭)", bg=BG, fg="#6c7086",
                 font=("Malgun Gothic", 9)).pack(side="left")

        # ── 위치 모드 ──
        ttk.Label(self, text="클릭 위치", style="IC.TLabel").grid(row=2, column=0, sticky="e", **PAD)
        self.pos_mode = tk.StringVar(value="current")
        pf = tk.Frame(self, bg=BG)
        pf.grid(row=2, column=1, sticky="w", **PAD)
        tk.Radiobutton(pf, text="현재 마우스 위치", variable=self.pos_mode, value="current",
                       bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                       activeforeground=FG, font=("Malgun Gothic", 10),
                       command=self._on_pos_mode).pack(side="left", padx=6)
        tk.Radiobutton(pf, text="고정 위치", variable=self.pos_mode, value="fixed",
                       bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                       activeforeground=FG, font=("Malgun Gothic", 10),
                       command=self._on_pos_mode).pack(side="left", padx=6)

        # ── 고정 좌표 입력 ──
        self.fixed_frame = tk.Frame(self, bg=BG)
        self.fixed_frame.grid(row=3, column=0, columnspan=2, padx=14, pady=4, sticky="w")
        tk.Label(self.fixed_frame, text="X:", bg=BG, fg=FG, font=("Malgun Gothic", 10)).pack(side="left")
        self.fx_var = tk.StringVar(value="0")
        tk.Entry(self.fixed_frame, textvariable=self.fx_var, width=6,
                 bg=ENT, fg=FG, insertbackground=FG, relief="flat",
                 font=("Malgun Gothic", 10)).pack(side="left", padx=4)
        tk.Label(self.fixed_frame, text="Y:", bg=BG, fg=FG, font=("Malgun Gothic", 10)).pack(side="left")
        self.fy_var = tk.StringVar(value="0")
        tk.Entry(self.fixed_frame, textvariable=self.fy_var, width=6,
                 bg=ENT, fg=FG, insertbackground=FG, relief="flat",
                 font=("Malgun Gothic", 10)).pack(side="left", padx=4)
        tk.Button(self.fixed_frame, text="현재 좌표 캡처", bg=ENT, fg=FG, relief="flat",
                  font=("Malgun Gothic", 9), padx=6,
                  command=self._capture_pos).pack(side="left", padx=8)
        self.fixed_frame.grid_remove()

        # ── 클릭 횟수 ──
        ttk.Label(self, text="반복 횟수", style="IC.TLabel").grid(row=4, column=0, sticky="e", **PAD)
        cnt_frame = tk.Frame(self, bg=BG)
        cnt_frame.grid(row=4, column=1, sticky="w", **PAD)
        self.repeat_mode = tk.StringVar(value="infinite")
        tk.Radiobutton(cnt_frame, text="무한 반복", variable=self.repeat_mode, value="infinite",
                       bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                       activeforeground=FG, font=("Malgun Gothic", 10)).pack(side="left", padx=6)
        tk.Radiobutton(cnt_frame, text="횟수 지정:", variable=self.repeat_mode, value="count",
                       bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                       activeforeground=FG, font=("Malgun Gothic", 10)).pack(side="left", padx=6)
        self.cnt_var = tk.StringVar(value="100")
        tk.Entry(cnt_frame, textvariable=self.cnt_var, width=6,
                 bg=ENT, fg=FG, insertbackground=FG, relief="flat",
                 font=("Malgun Gothic", 10)).pack(side="left")
        tk.Label(cnt_frame, text="회", bg=BG, fg=FG, font=("Malgun Gothic", 10)).pack(side="left", padx=4)

        # ── 핫키 안내 ──
        hk_frame = tk.Frame(self, bg="#11111b")
        hk_frame.grid(row=5, column=0, columnspan=2, padx=14, pady=(12,4), sticky="ew")
        for key, desc in [("F5","시작"), ("F6","중단"), ("ESC","긴급 중단")]:
            tk.Label(hk_frame, text=f"  {key} = {desc}  ", bg="#11111b", fg="#89dceb",
                     font=("Consolas", 10)).pack(side="left", padx=4, pady=6)

        # ── 실행/중단 버튼 ──
        btn_frame = tk.Frame(self, bg=BG)
        btn_frame.grid(row=6, column=0, columnspan=2, padx=14, pady=10, sticky="w")
        self.run_btn = tk.Button(btn_frame, text="▶  시작 (F5)", bg=ACC, fg="white",
                                  font=("Malgun Gothic", 11, "bold"), relief="flat",
                                  padx=24, pady=8, command=self.start)
        self.run_btn.pack(side="left", padx=(0,8))
        tk.Button(btn_frame, text="⛔  중단 (F6)", bg="#45475a", fg=FG,
                  font=("Malgun Gothic", 10), relief="flat",
                  padx=16, pady=8, command=self.stop).pack(side="left")

        # ── 카운터 ──
        self.click_count = tk.IntVar(value=0)
        cnt_label_frame = tk.Frame(self, bg=BG)
        cnt_label_frame.grid(row=7, column=0, columnspan=2, padx=14, pady=4, sticky="w")
        tk.Label(cnt_label_frame, text="클릭 횟수:", bg=BG, fg="#6c7086",
                 font=("Malgun Gothic", 10)).pack(side="left")
        tk.Label(cnt_label_frame, textvariable=self.click_count, bg=BG, fg=ACC,
                 font=("Malgun Gothic", 13, "bold")).pack(side="left", padx=6)

    def _on_pos_mode(self):
        if self.pos_mode.get() == "fixed":
            self.fixed_frame.grid()
        else:
            self.fixed_frame.grid_remove()

    def _capture_pos(self):
        self.winfo_toplevel().withdraw()
        time.sleep(0.8)
        x, y = pyautogui.position()
        self.fx_var.set(str(x))
        self.fy_var.set(str(y))
        self.winfo_toplevel().deiconify()

    def start(self):
        global _running
        if _running:
            return
        _running = True
        self.click_count.set(0)
        self.run_btn.config(state="disabled")
        self._status("무한 클릭 실행 중...")

        cps       = max(1, float(self.cps_var.get()))
        interval  = 1.0 / cps
        btn       = self.btn_type.get()
        mode      = self.pos_mode.get()
        infinite  = self.repeat_mode.get() == "infinite"
        max_cnt   = int(self.cnt_var.get()) if not infinite else 0
        fx = int(self.fx_var.get()) if mode == "fixed" else None
        fy = int(self.fy_var.get()) if mode == "fixed" else None

        def worker():
            global _running
            n = 0
            while _running:
                if not infinite and n >= max_cnt:
                    break
                try:
                    if mode == "fixed":
                        if btn == "double":
                            pyautogui.doubleClick(fx, fy)
                        else:
                            pyautogui.click(fx, fy, button=btn)
                    else:
                        if btn == "double":
                            pyautogui.doubleClick()
                        else:
                            pyautogui.click(button=btn)
                    n += 1
                    self.after(0, self.click_count.set, n)
                except Exception:
                    break
                time.sleep(interval)
            _running = False
            self.after(0, self.run_btn.config, {"state": "normal"})
            self.after(0, self._status, f"완료 — 총 {n}회 클릭")

        threading.Thread(target=worker, daemon=True).start()

    def stop(self):
        stop_all()
        self.run_btn.config(state="normal")
        self._status("⛔ 중단됨")


# ══════════════════════════════════════════════════════════
# 탭 2 : 시퀀스 매크로 (티켓팅 전용)
# ══════════════════════════════════════════════════════════
class EventDialog(tk.Toplevel):
    def __init__(self, parent, event=None):
        super().__init__(parent)
        self.title("이벤트 편집")
        self.resizable(False, False)
        self.configure(bg="#1e1e2e")
        self.result = None
        self._ev = event or {"x":0,"y":0,"button":"left","delay":0,"memo":""}
        self._build()
        self.grab_set()

    def _build(self):
        BG="#1e1e2e"; FG="#cdd6f4"; ENT="#313244"
        PAD={"padx":12,"pady":5}

        def lbl(text, r):
            tk.Label(self, text=text, bg=BG, fg=FG,
                     font=("Malgun Gothic",10)).grid(row=r, column=0, sticky="e", **PAD)

        def ent(var, r, w=12, show=""):
            e = tk.Entry(self, textvariable=var, width=w, bg=ENT, fg=FG,
                         insertbackground=FG, relief="flat", font=("Malgun Gothic",10), show=show)
            e.grid(row=r, column=1, sticky="w", **PAD)
            return e

        self.vx     = tk.StringVar(value=str(self._ev.get("x",0)))
        self.vy     = tk.StringVar(value=str(self._ev.get("y",0)))
        self.vdelay = tk.StringVar(value=str(self._ev.get("delay",0)))
        self.vmemo  = tk.StringVar(value=self._ev.get("memo",""))
        self.vbtn   = tk.StringVar(value=self._ev.get("button","left"))

        lbl("X 좌표",    0); ent(self.vx,     0)
        lbl("Y 좌표",    1); ent(self.vy,     1)
        lbl("딜레이(초)", 2); ent(self.vdelay, 2, w=8)

        lbl("버튼", 3)
        bf = tk.Frame(self, bg=BG)
        bf.grid(row=3, column=1, sticky="w", **PAD)
        for val, txt in [("left","좌클릭"),("right","우클릭"),("double","더블클릭")]:
            tk.Radiobutton(bf, text=txt, variable=self.vbtn, value=val,
                           bg=BG, fg=FG, selectcolor=ENT, activebackground=BG,
                           activeforeground=FG, font=("Malgun Gothic",9)
                           ).pack(side="left", padx=4)

        lbl("메모", 4); ent(self.vmemo, 4, w=22)

        # 캡처 버튼
        tk.Button(self, text="🖱  좌표 캡처 모드  (휠클릭으로 저장 / ESC 취소)",
                  bg="#313244", fg="#89dceb", relief="flat",
                  font=("Malgun Gothic", 9, "bold"), padx=8, pady=5,
                  command=self._start_capture).grid(row=5, column=0, columnspan=2, pady=6, padx=8, sticky="ew")

        tk.Button(self, text="저장", bg="#e61e2b", fg="white",
                  font=("Malgun Gothic",10,"bold"), relief="flat",
                  padx=24, pady=6, command=self._save
                  ).grid(row=6, column=0, columnspan=2, pady=10)

    def _start_capture(self):
        """오버레이 띄우고 휠클릭 시 좌표 저장"""
        from pynput import mouse as pm, keyboard as pkb

        self.withdraw()

        # ── 오버레이 창 ──
        overlay = tk.Toplevel()
        overlay.overrideredirect(True)
        overlay.attributes("-topmost", True)
        overlay.attributes("-alpha", 0.88)
        overlay.configure(bg="#1e1e2e")

        lbl_coord = tk.Label(overlay, text="", bg="#1e1e2e", fg="#89dceb",
                             font=("Consolas", 13, "bold"), padx=12, pady=6)
        lbl_coord.pack()
        lbl_hint = tk.Label(overlay, text="휠클릭 = 저장   ESC = 취소",
                            bg="#1e1e2e", fg="#6c7086", font=("Malgun Gothic", 9), padx=8, pady=2)
        lbl_hint.pack()

        done = threading.Event()
        captured = {}

        def update_pos():
            if done.is_set():
                return
            x, y = pyautogui.position()
            lbl_coord.config(text=f"X: {x}   Y: {y}")
            overlay.geometry(f"+{x+16}+{y+16}")
            overlay.after(30, update_pos)

        update_pos()

        # ── 마우스 리스너 ──
        m_listener = None
        k_listener = None

        def on_click(x, y, button, pressed):
            if pressed and button == pm.Button.middle:
                captured["x"] = x
                captured["y"] = y
                done.set()
                return False   # 리스너 종료

        def on_key(key):
            try:
                if key == pkb.Key.esc:
                    done.set()
                    return False
            except: pass

        def start_listeners():
            nonlocal m_listener, k_listener
            m_listener = pm.Listener(on_click=on_click)
            k_listener = pkb.Listener(on_press=on_key)
            m_listener.start()
            k_listener.start()
            done.wait()
            m_listener.stop()
            k_listener.stop()
            overlay.after(0, finish)

        def finish():
            overlay.destroy()
            self.deiconify()
            if "x" in captured:
                self.vx.set(str(captured["x"]))
                self.vy.set(str(captured["y"]))

        threading.Thread(target=start_listeners, daemon=True).start()

    def _save(self):
        try:
            self.result = {
                "x":      int(self.vx.get()),
                "y":      int(self.vy.get()),
                "delay":  float(self.vdelay.get()),
                "button": self.vbtn.get(),
                "memo":   self.vmemo.get(),
            }
            self.destroy()
        except ValueError:
            messagebox.showwarning("입력 오류", "X, Y는 정수 / 딜레이는 숫자", parent=self)


class MacroTab(tk.Frame):
    def __init__(self, parent, data, status_cb):
        super().__init__(parent, bg="#1e1e2e")
        self.data     = data
        self._status  = status_cb
        self._build()
        self._load_macro_list()

    def _build(self):
        BG="#1e1e2e"; FG="#cdd6f4"; ENT="#313244"; ACC="#e61e2b"
        PAD={"padx":10,"pady":4}

        style = ttk.Style()
        style.configure("M.TLabel", background=BG, foreground=FG, font=("Malgun Gothic",10))
        style.configure("M.TCombobox", fieldbackground=ENT, foreground=FG, font=("Malgun Gothic",10))
        style.configure("MSub.TLabel", background=BG, foreground="#6c7086", font=("Malgun Gothic",9))

        # ── 슬롯 선택 ──
        ttk.Label(self, text="매크로 슬롯", style="M.TLabel").grid(row=0, column=0, sticky="e", **PAD)
        self.macro_var = tk.StringVar()
        self.macro_cb  = ttk.Combobox(self, textvariable=self.macro_var, width=22, state="readonly")
        self.macro_cb.grid(row=0, column=1, columnspan=2, sticky="w", **PAD)
        self.macro_cb.bind("<<ComboboxSelected>>", self._on_select)

        sf = tk.Frame(self, bg=BG)
        sf.grid(row=0, column=3, sticky="w", padx=4)
        for txt, cmd in [("추가",self._add_slot),("이름변경",self._rename_slot),("삭제",self._del_slot)]:
            tk.Button(sf, text=txt, bg=ENT, fg=FG, relief="flat",
                      font=("Malgun Gothic",9), padx=6, command=cmd
                      ).pack(side="left", padx=2)

        # ── 핫키 ──
        ttk.Label(self, text="실행 핫키", style="M.TLabel").grid(row=1, column=0, sticky="e", **PAD)
        self.hk_var = tk.StringVar(value="f1")
        hk_cb = ttk.Combobox(self, textvariable=self.hk_var, width=10, state="readonly",
                   values=["f1","f2","f3","f4","f7","f8","f9","f10","f11"])
        hk_cb.grid(row=1, column=1, sticky="w", **PAD)
        hk_cb.bind("<<ComboboxSelected>>", self._on_hk_change)
        ttk.Label(self, text="(F5=무한클릭 시작  F6=중단  ESC=긴급중단)", style="MSub.TLabel"
                  ).grid(row=1, column=2, columnspan=2, sticky="w")

        # ── 이벤트 리스트 ──
        cols = ("순서","X","Y","버튼","딜레이(초)","메모")
        self.tree = ttk.Treeview(self, columns=cols, show="headings", height=9, selectmode="browse")
        widths    = [40, 65, 65, 70, 80, 150]
        for col, w in zip(cols, widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=w, anchor="center")
        style.configure("Treeview", background=ENT, foreground=FG,
                         fieldbackground=ENT, rowheight=24, font=("Malgun Gothic",9))
        style.configure("Treeview.Heading", background="#313244", foreground=FG,
                         font=("Malgun Gothic",9,"bold"))
        style.map("Treeview", background=[("selected","#45475a")])
        sb = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.grid(row=2, column=0, columnspan=4, padx=14, pady=6, sticky="ew")
        sb.grid(row=2, column=4, sticky="ns", pady=6)
        self.tree.bind("<Double-Button-1>", lambda _: self._edit_event())

        # ── 편집 버튼 ──
        ef = tk.Frame(self, bg=BG)
        ef.grid(row=3, column=0, columnspan=5, padx=14, pady=2, sticky="w")
        for txt, cmd in [("➕ 추가",self._add_event),("✏ 편집",self._edit_event),
                         ("🗑 삭제",self._del_event),("⬆ 위로",self._move_up),("⬇ 아래로",self._move_down)]:
            tk.Button(ef, text=txt, bg=ENT, fg=FG, relief="flat",
                      font=("Malgun Gothic",9), padx=8, pady=4, command=cmd
                      ).pack(side="left", padx=3)

        # ── 실행 버튼 ──
        bf = tk.Frame(self, bg=BG)
        bf.grid(row=4, column=0, columnspan=5, padx=14, pady=10, sticky="w")
        self.run_btn = tk.Button(bf, text="▶  매크로 실행", bg="#e61e2b", fg="white",
                                  font=("Malgun Gothic",11,"bold"), relief="flat",
                                  padx=24, pady=8, command=self._run)
        self.run_btn.pack(side="left", padx=(0,8))
        tk.Button(bf, text="⛔  중단 (ESC)", bg="#45475a", fg=FG,
                  font=("Malgun Gothic",10), relief="flat",
                  padx=16, pady=8, command=stop_all).pack(side="left")

    # ── 슬롯 관리 ──────────────────────────────────────
    def _load_macro_list(self):
        names = [m["name"] for m in self.data["macros"]]
        self.macro_cb["values"] = names
        if names:
            self.macro_cb.current(0)
            self._on_select()

    def _cur_idx(self):
        return self.macro_cb.current()

    def _on_select(self, _=None):
        idx = self._cur_idx()
        if idx < 0: return
        self.hk_var.set(self.data["macros"][idx].get("hotkey","f1"))
        self._refresh()

    def _on_hk_change(self, _=None):
        idx = self._cur_idx()
        if idx < 0: return
        self.data["macros"][idx]["hotkey"] = self.hk_var.get()
        save_data(self.data)

    def _add_slot(self):
        name = tkinter.simpledialog.askstring("추가","매크로 이름:", parent=self)
        if not name: return
        self.data["macros"].append({"name":name,"hotkey":"f4","events":[]})
        save_data(self.data)
        self._load_macro_list()
        self.macro_cb.current(len(self.data["macros"])-1)
        self._on_select()

    def _rename_slot(self):
        idx = self._cur_idx()
        if idx < 0: return
        name = tkinter.simpledialog.askstring("이름 변경","새 이름:",
               initialvalue=self.data["macros"][idx]["name"], parent=self)
        if not name: return
        self.data["macros"][idx]["name"] = name
        save_data(self.data)
        self._load_macro_list()
        self.macro_cb.current(idx)

    def _del_slot(self):
        idx = self._cur_idx()
        if idx < 0: return
        if messagebox.askyesno("삭제",f'"{self.data["macros"][idx]["name"]}" 삭제?'):
            self.data["macros"].pop(idx)
            save_data(self.data)
            self._load_macro_list()

    # ── 이벤트 관리 ────────────────────────────────────
    def _refresh(self):
        self.tree.delete(*self.tree.get_children())
        idx = self._cur_idx()
        if idx < 0: return
        for i, ev in enumerate(self.data["macros"][idx]["events"]):
            self.tree.insert("","end",iid=str(i),values=(
                i+1, ev["x"], ev["y"],
                ev.get("button","left"), ev.get("delay",0), ev.get("memo","")
            ))

    def _sel_idx(self):
        s = self.tree.selection()
        return int(s[0]) if s else None

    def _add_event(self):
        idx = self._cur_idx()
        if idx < 0: return
        dlg = EventDialog(self)
        self.wait_window(dlg)
        if dlg.result:
            self.data["macros"][idx]["events"].append(dlg.result)
            save_data(self.data)
            self._refresh()

    def _edit_event(self):
        idx = self._cur_idx(); ev_idx = self._sel_idx()
        if idx < 0 or ev_idx is None: return
        dlg = EventDialog(self, event=self.data["macros"][idx]["events"][ev_idx])
        self.wait_window(dlg)
        if dlg.result:
            self.data["macros"][idx]["events"][ev_idx] = dlg.result
            save_data(self.data)
            self._refresh()

    def _del_event(self):
        idx = self._cur_idx(); ev_idx = self._sel_idx()
        if idx < 0 or ev_idx is None: return
        self.data["macros"][idx]["events"].pop(ev_idx)
        save_data(self.data)
        self._refresh()

    def _move_up(self):
        idx = self._cur_idx(); ev_idx = self._sel_idx()
        if idx < 0 or ev_idx is None or ev_idx == 0: return
        evs = self.data["macros"][idx]["events"]
        evs[ev_idx-1], evs[ev_idx] = evs[ev_idx], evs[ev_idx-1]
        save_data(self.data); self._refresh()
        self.tree.selection_set(str(ev_idx-1))

    def _move_down(self):
        idx = self._cur_idx(); ev_idx = self._sel_idx()
        if idx < 0 or ev_idx is None: return
        evs = self.data["macros"][idx]["events"]
        if ev_idx >= len(evs)-1: return
        evs[ev_idx], evs[ev_idx+1] = evs[ev_idx+1], evs[ev_idx]
        save_data(self.data); self._refresh()
        self.tree.selection_set(str(ev_idx+1))

    # ── 실행 ───────────────────────────────────────────
    def run_by_index(self, idx):
        events = self.data["macros"][idx]["events"]
        if not events: return
        self.macro_cb.current(idx); self._on_select()
        self._status(f"🔑 핫키 실행: {self.data['macros'][idx]['name']}")
        self._exec(events)

    def _run(self):
        idx = self._cur_idx()
        if idx < 0: return
        events = self.data["macros"][idx]["events"]
        if not events:
            messagebox.showwarning("이벤트 없음","이벤트를 먼저 추가하세요.")
            return
        self._exec(events)

    def _exec(self, events):
        global _running
        if _running: return
        _running = True
        self.run_btn.config(state="disabled")

        def worker():
            global _running
            try:
                for i, ev in enumerate(events):
                    if not _running: break
                    delay = float(ev.get("delay",0))
                    if delay > 0:
                        t0 = time.time()
                        while time.time()-t0 < delay:
                            if not _running: break
                            time.sleep(0.05)
                    if not _running: break
                    x, y, btn = int(ev["x"]), int(ev["y"]), ev.get("button","left")
                    self.after(0, self._status, f"▶ [{i+1}/{len(events)}] ({x},{y}) {ev.get('memo','')}")
                    if btn == "double":
                        pyautogui.doubleClick(x, y)
                    else:
                        pyautogui.click(x, y, button=btn)
                self.after(0, self._status, "✅ 매크로 완료!")
            except Exception as e:
                self.after(0, self._status, f"❌ {e}")
            finally:
                _running = False
                self.after(0, self.run_btn.config, {"state":"normal"})

        threading.Thread(target=worker, daemon=True).start()


# ══════════════════════════════════════════════════════════
# 메인 앱
# ══════════════════════════════════════════════════════════
class AutoMouseApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("오토마우스 v1.7")
        self.resizable(False, False)
        self.configure(bg="#1e1e2e")
        self.data = load_data()
        self._build()
        self._start_listener()
        self.protocol("WM_DELETE_WINDOW", self._quit)

    def _build(self):
        BG="#1e1e2e"; FG="#cdd6f4"; ACC="#e61e2b"

        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TNotebook",           background=BG, borderwidth=0)
        style.configure("TNotebook.Tab",       background="#313244", foreground=FG,
                         font=("Malgun Gothic",10,"bold"), padding=[16,6])
        style.map("TNotebook.Tab",             background=[("selected", ACC)],
                                               foreground=[("selected","white")])

        # 타이틀
        tk.Label(self, text="🖱  오토마우스  v1.7", bg=BG, fg=ACC,
                 font=("Malgun Gothic",14,"bold")).pack(pady=(12,4))

        # 실시간 좌표
        coord_frame = tk.Frame(self, bg="#11111b")
        coord_frame.pack(fill="x", padx=14, pady=(0,6))
        tk.Label(coord_frame, text=" 현재 좌표 ", bg="#11111b", fg="#6c7086",
                 font=("Malgun Gothic",9)).pack(side="left", pady=4)
        self.coord_lbl = tk.Label(coord_frame, text="X: 0   Y: 0",
                                   bg="#11111b", fg="#89dceb",
                                   font=("Consolas",11,"bold"))
        self.coord_lbl.pack(side="left", pady=4)

        # 탭
        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=14, pady=4)

        self.tab_click = InfiniteClickTab(self.nb, self._set_status)
        self.tab_macro = MacroTab(self.nb, self.data, self._set_status)
        self.nb.add(self.tab_click, text="  무한 클릭  ")
        self.nb.add(self.tab_macro, text="  시퀀스 매크로  ")

        # 상태바
        self.status_var = tk.StringVar(value="대기 중")
        tk.Label(self, textvariable=self.status_var,
                 bg="#11111b", fg="#a6e3a1",
                 font=("Consolas",10), anchor="w", padx=10
                 ).pack(fill="x", padx=14, pady=(4,12))

        self._update_coord()

    def _update_coord(self):
        try:
            x, y = pyautogui.position()
            self.coord_lbl.config(text=f"X: {x}   Y: {y}")
        except: pass
        self.after(100, self._update_coord)

    def _set_status(self, msg):
        self.status_var.set(msg)

    # ── 전역 핫키 ────────────────────────────────────
    def _start_listener(self):
        def on_press(key):
            try: k = key.name.lower()
            except: return

            if k == "esc":
                stop_all()
                self.after(0, self._set_status, "⛔ ESC — 긴급 중단")
                return
            if k == "f5":
                self.after(0, self.tab_click.start)
                return
            if k == "f6":
                self.after(0, self.tab_click.stop)
                return
            for i, macro in enumerate(self.data["macros"]):
                if macro.get("hotkey","").lower() == k:
                    if not _running:
                        self.after(0, self.tab_macro.run_by_index, i)
                    break

        self._listener = kb.Listener(on_press=on_press)
        self._listener.daemon = True
        self._listener.start()

    def _quit(self):
        self._listener.stop()
        self.destroy()


if __name__ == "__main__":
    app = AutoMouseApp()
    app.mainloop()
