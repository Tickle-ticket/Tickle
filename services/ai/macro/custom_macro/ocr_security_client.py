import requests


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
    ocr_scale = int(security_config.get("ocr_scale", 2) or 2)

    url = server_url.rstrip("/") + "/solve"

    with open(image_path, "rb") as f:
        response = requests.post(
            url,
            files={"file": ("screen.png", f, "image/png")},
            data={
                "mode": mode,
                "order_box": _box_to_text(order_box),
                "keypad_box": _box_to_text(keypad_box),
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