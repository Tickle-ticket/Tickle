from datetime import datetime
from typing import Literal

from fastapi import FastAPI, Response
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.requests import Request
from pydantic import BaseModel, ConfigDict, Field

from serving.repository import (
    get_db_connection,
    mark_record_revalidated,
)


app = FastAPI(title="Tickle AI Internal API")


@app.exception_handler(RequestValidationError)
def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> Response:
    return Response(status_code=400)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version="0.1.0",
        routes=app.routes,
    )

    for path in openapi_schema.get("paths", {}).values():
        for operation in path.values():
            operation.get("responses", {}).pop("422", None)

    openapi_schema.get("components", {}).get("schemas", {}).pop(
        "HTTPValidationError",
        None,
    )
    openapi_schema.get("components", {}).get("schemas", {}).pop(
        "ValidationError",
        None,
    )

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


class CaptchaRetryResultRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    result: Literal["ALLOW", "BLOCK"]
    record_id: str = Field(alias="recordId", min_length=1)
    type: Literal["CAPTCHA_RETRY"]
    created_at: datetime = Field(alias="createdAt")


@app.post(
    "/api/captcha-retry-result",
    status_code=200,
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
    },
)
def receive_captcha_retry_result(
    request: CaptchaRetryResultRequest,
) -> Response:
    if request.result == "BLOCK":
        return Response(status_code=200)

    conn = get_db_connection()

    try:
        updated = mark_record_revalidated(
            conn,
            record_id=request.record_id,
        )
    finally:
        conn.close()

    if not updated:
        return Response(status_code=404)

    return Response(status_code=200)
