from fastapi import FastAPI, UploadFile, File, Form
from paddleocr import PaddleOCR
from PIL import Image, ImageDraw, ImageEnhance
from typing import List, Tuple, Dict, Any, Optional
import tempfile
import os
import re
import traceback
import cv2
import numpy as np


app = FastAPI()

ocr = PaddleOCR(use_angle_cls=True, lang="korean")

Box = Tuple[int, int, int, int]


def parse_box(box_text: str) -> Box:
    values = [int(v.strip()) for v in box_text.split(",")]

    if len(values) != 4:
        raise ValueError("box는 left,top,right,bottom 형식이어야 합니다.")

    left, top, right, bottom = values

    if right <= left or bottom <= top:
        raise ValueError(f"잘못된 box 값입니다: {box_text}")

    return left, top, right, bottom


def box_to_text(box: Optional[Box]) -> Optional[str]:
    if box is None:
        return None

    return f"{box[0]},{box[1]},{box[2]},{box[3]}"


def crop_image(
    image_path: str,
    crop_box: Box,
    save_path: str,
) -> str:
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    left, top, right, bottom = crop_box

    left = max(0, min(left, width))
    right = max(0, min(right, width))
    top = max(0, min(top, height))
    bottom = max(0, min(bottom, height))

    if right <= left or bottom <= top:
        raise ValueError(
            f"crop 영역이 잘못되었습니다. image_size={img.size}, crop_box={crop_box}"
        )

    cropped = img.crop((left, top, right, bottom))
    cropped.save(save_path)

    return save_path


def prepare_ocr_image(
    image_path: str,
    save_path: str,
    scale: int = 2,
) -> Tuple[str, float]:
    """
    OCR 인식률을 높이기 위해 이미지를 확대하고 대비를 살짝 높인다.
    반환되는 scale_factor는 OCR box 좌표를 원래 crop 좌표로 되돌릴 때 사용한다.
    """
    img = Image.open(image_path).convert("RGB")

    if scale > 1:
        img = img.resize(
            (img.width * scale, img.height * scale),
            Image.Resampling.LANCZOS,
        )

    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = ImageEnhance.Sharpness(img).enhance(1.2)

    img.save(save_path)

    return save_path, float(scale)


def is_non_empty(value) -> bool:
    if value is None:
        return False

    if hasattr(value, "size"):
        return value.size > 0

    try:
        return len(value) > 0
    except TypeError:
        return True


def first_non_empty(*values):
    for value in values:
        if is_non_empty(value):
            return value
    return []


def to_python_value(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    return value


def normalize_box(box) -> List[float]:
    if box is None:
        return [0.0, 0.0, 0.0, 0.0]

    box = to_python_value(box)

    if (
        isinstance(box, (list, tuple))
        and len(box) == 4
        and not isinstance(box[0], (list, tuple))
    ):
        x1, y1, x2, y2 = box
        return [float(x1), float(y1), float(x2), float(y2)]

    if isinstance(box, (list, tuple)) and len(box) > 0:
        xs = []
        ys = []

        for point in box:
            point = to_python_value(point)

            if isinstance(point, (list, tuple)) and len(point) >= 2:
                xs.append(float(point[0]))
                ys.append(float(point[1]))

        if xs and ys:
            return [min(xs), min(ys), max(xs), max(ys)]

    return [0.0, 0.0, 0.0, 0.0]


def scale_box_down(box: List[float], scale: float) -> List[float]:
    if scale <= 0:
        return box

    return [
        box[0] / scale,
        box[1] / scale,
        box[2] / scale,
        box[3] / scale,
    ]


def parse_paddle_v3_result(page_result, scale: float = 1.0) -> List[Dict[str, Any]]:
    items = []

    if not isinstance(page_result, dict):
        return items

    rec_texts = page_result.get("rec_texts", [])
    rec_scores = page_result.get("rec_scores", [])

    boxes = first_non_empty(
        page_result.get("rec_boxes"),
        page_result.get("rec_polys"),
        page_result.get("dt_polys"),
        page_result.get("det_polys"),
    )

    rec_texts = to_python_value(rec_texts)
    rec_scores = to_python_value(rec_scores)
    boxes = to_python_value(boxes)

    if rec_texts is None:
        rec_texts = []

    if rec_scores is None:
        rec_scores = []

    if boxes is None:
        boxes = []

    for idx, text in enumerate(rec_texts):
        score = rec_scores[idx] if idx < len(rec_scores) else 1.0
        box = boxes[idx] if idx < len(boxes) else [0, 0, 0, 0]

        norm_box = normalize_box(box)
        norm_box = scale_box_down(norm_box, scale)

        items.append({
            "text": str(text).strip(),
            "score": float(score),
            "box": norm_box,
        })

    return items


def parse_paddle_v2_result(page_result, scale: float = 1.0) -> List[Dict[str, Any]]:
    items = []

    if not page_result:
        return items

    for entry in page_result:
        try:
            points = entry[0]
            text = str(entry[1][0]).strip()
            score = float(entry[1][1])

            norm_box = normalize_box(points)
            norm_box = scale_box_down(norm_box, scale)

            items.append({
                "text": text,
                "score": score,
                "box": norm_box,
            })

        except Exception:
            continue

    return items


def run_ocr(image_path: str) -> List[Dict[str, Any]]:
    """
    crop 이미지를 바로 OCR하지 않고 확대 전처리 후 OCR한다.
    """
    prepared_path = image_path + "_ocr.png"
    prepared_path, scale = prepare_ocr_image(
        image_path=image_path,
        save_path=prepared_path,
        scale=2,
    )

    try:
        result = ocr.ocr(prepared_path)

        items = []

        if result is None:
            return items

        for page_result in result:
            if isinstance(page_result, dict):
                items.extend(parse_paddle_v3_result(page_result, scale=scale))
            else:
                items.extend(parse_paddle_v2_result(page_result, scale=scale))

        return items

    finally:
        if os.path.exists(prepared_path):
            os.remove(prepared_path)


def extract_sequence(order_items: List[Dict[str, Any]]) -> List[str]:
    filtered = []

    for item in order_items:
        if item["score"] < 0.25:
            continue

        digits = re.findall(r"\d", item["text"])
        if not digits:
            continue

        filtered.append(item)

    sorted_items = sorted(filtered, key=lambda item: item["box"][0])

    sequence = []

    for item in sorted_items:
        digits = re.findall(r"\d", item["text"])
        sequence.extend(digits)

    return sequence


def extract_buttons(
    keypad_items: List[Dict[str, Any]],
    offset_x: int,
    offset_y: int,
) -> Dict[str, List[float]]:
    buttons = {}

    for item in keypad_items:
        text = item["text"]
        score = item["score"]

        if score < 0.25:
            continue

        digits = re.findall(r"\d", text)

        if len(digits) != 1:
            continue

        digit = digits[0]

        x1, y1, x2, y2 = item["box"]

        if x2 <= x1 or y2 <= y1:
            continue

        center_x = (x1 + x2) / 2 + offset_x
        center_y = (y1 + y2) / 2 + offset_y

        buttons[digit] = [float(center_x), float(center_y)]

    return buttons


def detect_modal_box(image_path: str) -> Box:
    img = cv2.imread(image_path)

    if img is None:
        raise ValueError("이미지를 읽지 못했습니다.")

    height, width = img.shape[:2]

    ignore_top = int(height * 0.10)

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    lower = np.array([220, 220, 220], dtype=np.uint8)
    upper = np.array([255, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(rgb, lower, upper)

    mask[:ignore_top, :] = 0

    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    candidates = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h

        if area < 30000:
            continue

        if w < 200 or h < 250:
            continue

        if w > width * 0.8 or h > height * 0.9:
            continue

        aspect = w / h

        if aspect < 0.35 or aspect > 1.3:
            continue

        center_x = x + w / 2
        center_y = y + h / 2
        distance_from_center = abs(center_x - width / 2) + abs(center_y - height / 2)

        score = area - distance_from_center * 30

        candidates.append((score, x, y, w, h))

    if not candidates:
        raise ValueError("흰색 보안 인증 모달을 자동 탐지하지 못했습니다.")

    candidates.sort(reverse=True)
    _, x, y, w, h = candidates[0]

    pad = 4
    left = max(0, x - pad)
    top = max(0, y - pad)
    right = min(width, x + w + pad)
    bottom = min(height, y + h + pad)

    return left, top, right, bottom


def derive_boxes_from_modal(modal_box: Box) -> Tuple[Box, Box]:
    """
    모달 박스 기준 내부 영역 자동 계산.
    기존보다 keypad_top을 위로 올려 첫 번째 줄 8, 6, 4가 빠지지 않게 했다.
    """
    left, top, right, bottom = modal_box

    w = right - left
    h = bottom - top

    order_left = int(left + w * 0.10)
    order_top = int(top + h * 0.15)
    order_right = int(right - w * 0.10)
    order_bottom = int(top + h * 0.43)

    keypad_left = int(left + w * 0.10)
    keypad_top = int(top + h * 0.38)
    keypad_right = int(right - w * 0.10)
    keypad_bottom = int(top + h * 0.88)

    return (
        (order_left, order_top, order_right, order_bottom),
        (keypad_left, keypad_top, keypad_right, keypad_bottom),
    )


def validate_result(
    sequence: List[str],
    buttons: Dict[str, List[float]],
):
    if len(sequence) < 3:
        return False, f"목표 숫자 순서를 충분히 찾지 못했습니다. sequence={sequence}"

    if len(buttons) < 9:
        return False, f"숫자 버튼을 {len(buttons)}개만 찾았습니다. buttons={list(buttons.keys())}"

    for digit in sequence:
        if digit not in buttons:
            return False, f"목표 숫자 {digit}의 버튼 좌표를 찾지 못했습니다."

    return True, ""


def save_debug_image(
    image_path: str,
    buttons: Dict[str, List[float]],
    sequence: List[str],
    modal_box: Optional[Box],
    order_box: Optional[Box],
    keypad_box: Optional[Box],
    save_path: str = "debug_result.png",
):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    if modal_box is not None:
        draw.rectangle(modal_box, outline="yellow", width=4)

    if order_box is not None:
        draw.rectangle(order_box, outline="blue", width=3)

    if keypad_box is not None:
        draw.rectangle(keypad_box, outline="green", width=3)

    for digit, point in buttons.items():
        x, y = point
        r = 7

        draw.ellipse(
            (x - r, y - r, x + r, y + r),
            outline="red",
            width=3,
        )
        draw.text((x + 10, y - 10), digit, fill="red")

    draw.text(
        (20, 20),
        f"sequence: {' '.join(sequence)}",
        fill="red",
    )

    img.save(save_path)


@app.get("/health")
def health():
    return {
        "ok": True,
        "message": "OCR server is running",
    }


@app.post("/solve")
async def solve(
    file: UploadFile = File(...),
    order_box: Optional[str] = Form(None),
    keypad_box: Optional[str] = Form(None),
):
    suffix = os.path.splitext(file.filename or "")[-1] or ".png"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        full_path = tmp.name

    order_path = full_path + "_order.png"
    keypad_path = full_path + "_keypad.png"

    modal_crop_box = None
    order_crop_box = None
    keypad_crop_box = None

    try:
        if order_box and keypad_box:
            order_crop_box = parse_box(order_box)
            keypad_crop_box = parse_box(keypad_box)
        else:
            modal_crop_box = detect_modal_box(full_path)
            order_crop_box, keypad_crop_box = derive_boxes_from_modal(modal_crop_box)

        crop_image(full_path, order_crop_box, order_path)
        crop_image(full_path, keypad_crop_box, keypad_path)

        order_items = run_ocr(order_path)
        keypad_items = run_ocr(keypad_path)

        sequence = extract_sequence(order_items)

        buttons = extract_buttons(
            keypad_items,
            offset_x=keypad_crop_box[0],
            offset_y=keypad_crop_box[1],
        )

        ready, reason = validate_result(sequence, buttons)

        save_debug_image(
            image_path=full_path,
            buttons=buttons,
            sequence=sequence,
            modal_box=modal_crop_box,
            order_box=order_crop_box,
            keypad_box=keypad_crop_box,
            save_path="debug_result.png",
        )

        return {
            "ready": ready,
            "reason": reason,
            "mode": "manual" if order_box and keypad_box else "auto",
            "modal_box": box_to_text(modal_crop_box),
            "order_box": box_to_text(order_crop_box),
            "keypad_box": box_to_text(keypad_crop_box),
            "sequence": sequence,
            "buttons": buttons,
            "order_items": order_items,
            "keypad_items": keypad_items,
            "debug_image": "debug_result.png",
        }

    except Exception as e:
        traceback.print_exc()

        try:
            save_debug_image(
                image_path=full_path,
                buttons={},
                sequence=[],
                modal_box=modal_crop_box,
                order_box=order_crop_box,
                keypad_box=keypad_crop_box,
                save_path="debug_result.png",
            )
        except Exception:
            pass

        return {
            "ready": False,
            "reason": str(e),
            "mode": "auto" if not order_box and not keypad_box else "manual",
            "modal_box": box_to_text(modal_crop_box),
            "order_box": box_to_text(order_crop_box),
            "keypad_box": box_to_text(keypad_crop_box),
            "sequence": [],
            "buttons": {},
            "order_items": [],
            "keypad_items": [],
            "error": traceback.format_exc(),
        }

    finally:
        for path in [full_path, order_path, keypad_path]:
            if os.path.exists(path):
                os.remove(path)