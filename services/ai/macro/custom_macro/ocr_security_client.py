import requests
import json


def _box_to_text(box):
    if not box:
        return ""

    if isinstance(box, str):
        return box

    if isinstance(box, (list, tuple)) and len(box) == 4:
        return ",".join(str(int(float(v))) for v in box)

    return ""


def request_security_challenge(
    image_path: str,
    server_url: str = "http://127.0.0.1:8010",
    security_config: dict | None = None,
    timeout_sec: int = 90,
):
    security_config = security_config or {}

    mode = security_config.get("mode", "auto")
    order_box = security_config.get("order_box", "")
    keypad_box = security_config.get("keypad_box", "")
    keypad_cells = security_config.get("keypad_cells", [])
    ocr_scale = int(security_config.get("ocr_scale", 2) or 2)

    url = server_url.rstrip("/") + "/solve"

    with open(image_path, "rb") as f:
        keypad_cells_text = ""
        try:
            if isinstance(keypad_cells, list) and keypad_cells:
                keypad_cells_text = json.dumps(keypad_cells, ensure_ascii=False)
        except Exception:
            keypad_cells_text = ""

        response = requests.post(
            url,
            files={"file": ("screen.png", f, "image/png")},
            data={
                "mode": mode,
                "order_box": _box_to_text(order_box),
                "keypad_box": _box_to_text(keypad_box),
                "keypad_cells": keypad_cells_text,
                "ocr_scale": str(ocr_scale),
            },
            timeout=timeout_sec,
        )

    response.raise_for_status()
    result = response.json()

    if not result.get("ready"):
        reason = result.get("reason", "OCR 서버 처리 실패")
        raise RuntimeError(reason)

    return result


def request_cv_security_challenge(
    image_path: str,
    server_url: str = "http://127.0.0.1:8010",
    security_config: dict | None = None,
    timeout_sec: int = 30,
):
    security_config = security_config or {}

    mode = security_config.get("mode", "auto")
    order_box = security_config.get("order_box", "")
    keypad_box = security_config.get("keypad_box", "")
    keypad_cells = security_config.get("keypad_cells", [])

    url = server_url.rstrip("/") + "/solve_cv"

    with open(image_path, "rb") as f:
        keypad_cells_text = ""
        try:
            if isinstance(keypad_cells, list) and keypad_cells:
                keypad_cells_text = json.dumps(keypad_cells, ensure_ascii=False)
        except Exception:
            keypad_cells_text = ""

        response = requests.post(
            url,
            files={"file": ("screen.png", f, "image/png")},
            data={
                "mode": mode,
                "order_box": _box_to_text(order_box),
                "keypad_box": _box_to_text(keypad_box),
                "keypad_cells": keypad_cells_text,
            },
            timeout=timeout_sec,
        )

    response.raise_for_status()
    result = response.json()

    if not result.get("ready"):
        reason = result.get("reason", "CV solve not ready")
        raise RuntimeError(reason)

    return result
