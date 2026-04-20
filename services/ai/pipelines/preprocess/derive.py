"""마우스 이벤트에 dt/dx/dy/speed 파생 필드 추가.

브라우저에서 수집된 이벤트(`data/raw/prototype/`)는 기본 필드만 있고
매크로 로그(`data/raw/macro/`)는 이미 dx/dy/dt/speed 가 붙어 있음.
일관성을 위해 이 함수로 브라우저 이벤트도 같은 파생 필드를 추가.
"""
from typing import List, Dict


def derive_mouse_dynamics(events: List[Dict]) -> List[Dict]:
    """mousemove 이벤트에 dx/dy/dt_ms/speed 필드 추가.

    이미 해당 필드가 있으면 건드리지 않음 (멱등성).
    click 이벤트에도 dt_ms (직전 click 간격) 부여.
    """
    out = []
    last_mouse = None
    last_click = None
    for evt in events:
        new = dict(evt)
        t = evt.get("t") if "t" in evt else evt.get("ts_ms")
        etype = evt.get("type") or evt.get("event")

        if etype in ("mousemove", "mouse_move") and "x" in evt and "y" in evt:
            if last_mouse is not None and "dx" not in new:
                lt = last_mouse.get("t") if "t" in last_mouse else last_mouse.get("ts_ms")
                dt = (t - lt) if t is not None and lt is not None else None
                if dt and dt > 0:
                    dx = evt["x"] - last_mouse["x"]
                    dy = evt["y"] - last_mouse["y"]
                    dist = (dx * dx + dy * dy) ** 0.5
                    new["dx"] = round(float(dx), 2)
                    new["dy"] = round(float(dy), 2)
                    new["dt_ms"] = round(float(dt), 3)
                    new["speed"] = round(dist / dt, 4)
            last_mouse = evt

        elif etype in ("click", "mouse_click"):
            if last_click is not None and "dt_ms" not in new:
                lt = last_click.get("t") if "t" in last_click else last_click.get("ts_ms")
                if t is not None and lt is not None:
                    new["dt_ms"] = round(float(t - lt), 3)
            last_click = evt

        out.append(new)
    return out
