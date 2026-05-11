import os
import re
from typing import Optional, Tuple, List, Dict, Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance
from paddleocr import PaddleOCR


SCREENSHOT_PATH = "screen.png"
DEBUG_IMAGE_PATH = "debug_result.png"

OCR_MIN_SCORE = 0.25

Box = Tuple[int, int, int, int]

_ocr = None


def get_ocr():
    global _ocr

    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang="korean")

    return _ocr


def parse_box(value) -> Optional[Box]:
    if value is None:
        return None

    if isinstance(value, str):
        raw = value.strip()

        if not raw:
            return None

        parts = [int(float(part.strip())) for part in raw.split(",")]

        if len(parts) != 4:
            raise ValueError(f"box 형식이 잘못되었습니다: {value}")

        left, top, right, bottom = parts

    elif isinstance(value, (list, tuple)):
        if len(value) != 4:
            raise ValueError(f"box 형식이 잘못되었습니다: {value}")

        left, top, right, bottom = [int(float(v)) for v in value]

    else:
        raise ValueError(f"box 형식이 잘못되었습니다: {value}")

    if right <= left or bottom <= top:
        raise ValueError(f"box 좌표가 잘못되었습니다: {value}")

    return left, top, right, bottom


def box_to_text(box: Optional[Box]) -> Optional[str]:
    if box is None:
        return None

    return f"{box[0]},{box[1]},{box[2]},{box[3]}"


def to_python_value(value):
    if hasattr(value, "tolist"):
        return value.tolist()

    return value


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


def normalize_box(box):
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


def scale_box_down(box, scale: float):
    if scale <= 0:
        return box

    return [
        box[0] / scale,
        box[1] / scale,
        box[2] / scale,
        box[3] / scale,
    ]


def prepare_ocr_image(image_path: str, save_path: str, scale: int = 2):
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


def parse_paddle_v3_result(page_result, scale: float):
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

    rec_texts = to_python_value(rec_texts) or []
    rec_scores = to_python_value(rec_scores) or []
    boxes = to_python_value(boxes) or []

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


def parse_paddle_v2_result(page_result, scale: float):
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


def run_ocr(image_path: str, scale: int = 2):
    scale = max(1, int(scale))

    prepared_path = image_path + "_ocr.png"
    prepared_path, scale_factor = prepare_ocr_image(
        image_path,
        prepared_path,
        scale=scale,
    )

    try:
        result = get_ocr().ocr(prepared_path)

        items = []

        if result is None:
            return items

        for page_result in result:
            if isinstance(page_result, dict):
                items.extend(parse_paddle_v3_result(page_result, scale_factor))
            else:
                items.extend(parse_paddle_v2_result(page_result, scale_factor))

        return items

    finally:
        if os.path.exists(prepared_path):
            os.remove(prepared_path)


def crop_image(image_path: str, crop_box: Box, save_path: str):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    left, top, right, bottom = crop_box

    left = max(0, min(left, width))
    right = max(0, min(right, width))
    top = max(0, min(top, height))
    bottom = max(0, min(bottom, height))

    if right <= left or bottom <= top:
        raise ValueError(f"잘못된 crop 영역입니다. image_size={img.size}, crop_box={crop_box}")

    img.crop((left, top, right, bottom)).save(save_path)

    return save_path


def detect_white_modal_box(image_path: str) -> Box:
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

        if w < 200 or h < 220:
            continue

        if w > width * 0.8 or h > height * 0.9:
            continue

        aspect = w / h

        if aspect < 0.35 or aspect > 1.6:
            continue

        center_x = x + w / 2
        center_y = y + h / 2
        distance = abs(center_x - width / 2) + abs(center_y - height / 2)
        score = area - distance * 30

        candidates.append((score, x, y, w, h))

    if not candidates:
        raise ValueError("흰색 보안 인증 모달을 찾지 못했습니다.")

    candidates.sort(reverse=True)
    _, x, y, w, h = candidates[0]

    pad = 4

    return (
        max(0, x - pad),
        max(0, y - pad),
        min(width, x + w + pad),
        min(height, y + h + pad),
    )


def derive_security_boxes(modal_box: Box):
    left, top, right, bottom = modal_box

    w = right - left
    h = bottom - top

    order_box = (
        int(left + w * 0.10),
        int(top + h * 0.22),
        int(right - w * 0.10),
        int(top + h * 0.38),
    )

    keypad_box = (
        int(left + w * 0.10),
        int(top + h * 0.38),
        int(right - w * 0.10),
        int(top + h * 0.88),
    )

    return order_box, keypad_box


def extract_digits_from_text(text: str):
    return re.findall(r"\d", text or "")


def choose_best_digit_from_items(items: List[Dict[str, Any]]) -> Optional[str]:
    candidates = []

    for item in items:
        score = float(item.get("score", 0.0))
        text = str(item.get("text", "")).strip()
        digits = extract_digits_from_text(text)

        if not digits:
            continue

        if score < OCR_MIN_SCORE:
            continue

        for digit in digits:
            candidates.append((score, digit, text))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def split_order_box_into_slots(order_box: Box) -> List[Box]:
    left, top, right, bottom = order_box

    width = right - left
    height = bottom - top

    # order_box가 넓게 잡혀 있어도 안내 문구와 아래 라인을 줄이기 위해 내부 여백을 둠
    inner_left = int(left + width * 0.03)
    inner_right = int(right - width * 0.03)
    inner_top = int(top + height * 0.08)
    inner_bottom = int(bottom - height * 0.08)

    inner_width = inner_right - inner_left
    slot_width = inner_width / 3.0

    slots = []

    for idx in range(3):
        slot_left = int(inner_left + slot_width * idx)
        slot_right = int(inner_left + slot_width * (idx + 1))

        # 화살표가 칸 사이에 있으면 OCR을 방해하므로 각 슬롯 좌우를 살짝 줄임
        pad_x = int(slot_width * 0.12)

        crop_left = slot_left + pad_x
        crop_right = slot_right - pad_x

        slots.append((
            crop_left,
            inner_top,
            crop_right,
            inner_bottom,
        ))

    return slots


def extract_sequence_by_slots(
    image_path: str,
    order_box: Box,
    ocr_scale: int,
):
    sequence = []
    slot_boxes = split_order_box_into_slots(order_box)

    temp_paths = []

    try:
        for idx, slot_box in enumerate(slot_boxes):
            slot_path = f"{image_path}_order_slot_{idx}.png"
            temp_paths.append(slot_path)

            crop_image(image_path, slot_box, slot_path)

            # scale이 1이면 작은 숫자가 흔들릴 수 있으니 order 슬롯은 최소 2로 보정
            slot_scale = max(2, int(ocr_scale))
            items = run_ocr(slot_path, scale=slot_scale)

            digit = choose_best_digit_from_items(items)

            if digit is None:
                # 한 번 더 큰 scale로 재시도
                retry_scale = max(3, slot_scale + 1)
                items = run_ocr(slot_path, scale=retry_scale)
                digit = choose_best_digit_from_items(items)

            if digit is not None:
                sequence.append(digit)

        return sequence, slot_boxes

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


def extract_sequence_fallback(order_items):
    filtered = []

    for item in order_items:
        if item.get("score", 0) < OCR_MIN_SCORE:
            continue

        digits = extract_digits_from_text(item.get("text", ""))

        if not digits:
            continue

        filtered.append(item)

    filtered.sort(key=lambda item: item["box"][0])

    sequence = []

    for item in filtered:
        sequence.extend(extract_digits_from_text(item.get("text", "")))

    return sequence


def extract_keypad_buttons(keypad_items, offset_x: int, offset_y: int):
    buttons = {}

    for item in keypad_items:
        if item.get("score", 0) < OCR_MIN_SCORE:
            continue

        digits = extract_digits_from_text(item.get("text", ""))

        if len(digits) != 1:
            continue

        digit = digits[0]
        x1, y1, x2, y2 = item["box"]

        if x2 <= x1 or y2 <= y1:
            continue

        cx = (x1 + x2) / 2 + offset_x
        cy = (y1 + y2) / 2 + offset_y

        buttons[digit] = [float(cx), float(cy)]

    return buttons


def save_debug_image(
    image_path: str,
    sequence,
    buttons,
    modal_box: Optional[Box],
    order_box: Optional[Box],
    keypad_box: Optional[Box],
    mode: str,
    order_slot_boxes: Optional[List[Box]] = None,
):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    if modal_box is not None:
        draw.rectangle(modal_box, outline="yellow", width=4)

    if order_box is not None:
        draw.rectangle(order_box, outline="blue", width=3)

    if order_slot_boxes:
        colors = ["cyan", "cyan", "cyan"]

        for idx, slot_box in enumerate(order_slot_boxes):
            draw.rectangle(slot_box, outline=colors[idx % len(colors)], width=2)
            draw.text((slot_box[0], max(0, slot_box[1] - 16)), f"slot{idx + 1}", fill="cyan")

    if keypad_box is not None:
        draw.rectangle(keypad_box, outline="green", width=3)

    for digit, point in buttons.items():
        x, y = point
        r = 7
        draw.ellipse((x - r, y - r, x + r, y + r), outline="red", width=3)
        draw.text((x + 10, y - 10), digit, fill="red")

    draw.text((20, 20), f"mode: {mode}", fill="red")
    draw.text((20, 42), f"security sequence: {' '.join(sequence)}", fill="red")

    img.save(DEBUG_IMAGE_PATH)


def resolve_security_boxes(
    image_path: str,
    mode: str = "auto",
    order_box=None,
    keypad_box=None,
):
    mode = (mode or "auto").lower().strip()

    if mode == "manual":
        parsed_order_box = parse_box(order_box)
        parsed_keypad_box = parse_box(keypad_box)

        if parsed_order_box is None or parsed_keypad_box is None:
            raise ValueError("manual 모드에서는 order_box, keypad_box가 필요합니다.")

        return None, parsed_order_box, parsed_keypad_box

    modal_box = detect_white_modal_box(image_path)
    auto_order_box, auto_keypad_box = derive_security_boxes(modal_box)

    return modal_box, auto_order_box, auto_keypad_box


def solve_security_challenge(
    image_path: str = SCREENSHOT_PATH,
    mode: str = "auto",
    order_box=None,
    keypad_box=None,
    ocr_scale: int = 2,
):
    modal_box, resolved_order_box, resolved_keypad_box = resolve_security_boxes(
        image_path=image_path,
        mode=mode,
        order_box=order_box,
        keypad_box=keypad_box,
    )

    keypad_path = image_path + "_keypad.png"
    order_slot_boxes = []

    try:
        # order는 3개 슬롯으로 나눠서 각각 OCR
        sequence, order_slot_boxes = extract_sequence_by_slots(
            image_path=image_path,
            order_box=resolved_order_box,
            ocr_scale=ocr_scale,
        )

        # 슬롯 방식이 실패하면 기존 방식으로 한 번 더 fallback
        if len(sequence) < 3:
            order_path = image_path + "_order.png"

            try:
                crop_image(image_path, resolved_order_box, order_path)
                order_items = run_ocr(order_path, scale=max(2, int(ocr_scale)))
                fallback_sequence = extract_sequence_fallback(order_items)

                if len(fallback_sequence) > len(sequence):
                    sequence = fallback_sequence

            finally:
                if os.path.exists(order_path):
                    os.remove(order_path)

        crop_image(image_path, resolved_keypad_box, keypad_path)
        keypad_items = run_ocr(keypad_path, scale=max(1, int(ocr_scale)))

        buttons = extract_keypad_buttons(
            keypad_items,
            offset_x=resolved_keypad_box[0],
            offset_y=resolved_keypad_box[1],
        )

        save_debug_image(
            image_path=image_path,
            sequence=sequence,
            buttons=buttons,
            modal_box=modal_box,
            order_box=resolved_order_box,
            keypad_box=resolved_keypad_box,
            mode=mode,
            order_slot_boxes=order_slot_boxes,
        )

        if len(sequence) < 3:
            raise RuntimeError(f"보안 인증 숫자 순서를 충분히 찾지 못했습니다. sequence={sequence}")

        sequence = sequence[:3]

        for digit in sequence:
            if digit not in buttons:
                raise RuntimeError(f"보안 인증 숫자 {digit}의 버튼 좌표를 찾지 못했습니다. buttons={buttons}")

        return {
            "sequence": sequence,
            "buttons": buttons,
            "mode": mode,
            "modal_box": box_to_text(modal_box),
            "order_box": box_to_text(resolved_order_box),
            "keypad_box": box_to_text(resolved_keypad_box),
            "ocr_scale": int(ocr_scale),
        }

    finally:
        if os.path.exists(keypad_path):
            os.remove(keypad_path)