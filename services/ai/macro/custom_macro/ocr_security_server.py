from fastapi import FastAPI, UploadFile, File, Form
import tempfile
import os
import traceback

from ocr_security_solver import solve_security_challenge, get_ocr


app = FastAPI()


@app.on_event("startup")
def startup_event():
    print("[ocr_server] preload start")
    get_ocr()
    print("[ocr_server] preload done")


@app.get("/health")
def health():
    return {
        "ok": True,
        "message": "ocr security server is running",
    }


@app.post("/solve")
async def solve(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    order_box: str = Form(""),
    keypad_box: str = Form(""),
    ocr_scale: int = Form(2),
):
    suffix = os.path.splitext(file.filename or "")[-1] or ".png"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        image_path = tmp.name

    try:
        result = solve_security_challenge(
            image_path=image_path,
            mode=mode,
            order_box=order_box,
            keypad_box=keypad_box,
            ocr_scale=ocr_scale,
        )

        return {
            "ready": True,
            "reason": "",
            "sequence": result["sequence"],
            "buttons": result["buttons"],
            "mode": result["mode"],
            "modal_box": result["modal_box"],
            "order_box": result["order_box"],
            "keypad_box": result["keypad_box"],
            "ocr_scale": result["ocr_scale"],
        }

    except Exception as error:
        traceback.print_exc()

        return {
            "ready": False,
            "reason": str(error),
            "sequence": [],
            "buttons": {},
            "error": traceback.format_exc(),
        }

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)