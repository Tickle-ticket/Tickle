import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests


BE_BOT_DETECTION_RESULT_URL = os.getenv("BE_BOT_DETECTION_RESULT_URL", "")
BE_CALLBACK_TIMEOUT_SEC = float(os.getenv("BE_CALLBACK_TIMEOUT_SEC", "2.0"))
BE_INTERNAL_SERVICE_TOKEN = os.getenv("BE_INTERNAL_SERVICE_TOKEN", "")
BE_INTERNAL_SECRET = os.getenv("BE_INTERNAL_SECRET", "")
BE_CALLBACK_USER_ID = os.getenv("BE_CALLBACK_USER_ID", "1001")


class BeCallbackClient:
    def __init__(
        self,
        result_url: str,
        timeout_sec: float,
        internal_service_token: str,
    ):
        self.result_url = result_url
        self.timeout_sec = timeout_sec
        self.internal_service_token = internal_service_token

    def enabled(self) -> bool:
        return bool(self.result_url)

    def send_result(
        self,
        *,
        access_token: str | None,
        request_id: str | None,
        payload: dict[str, Any],
        label: str,
        p_macro: float,
    ) -> bool:
        if not self.enabled():
            return False

        headers = {
            "Content-Type": "application/json",
        }

        if BE_INTERNAL_SECRET:
            headers["X-Internal-Secret"] = BE_INTERNAL_SECRET
        elif self.internal_service_token:
            headers["Authorization"] = f"Bearer {self.internal_service_token}"

        if access_token:
            headers["access-token"] = access_token

        if request_id:
            headers["X-Request-Id"] = request_id

        target_url = add_query_param(self.result_url, "userId", str(BE_CALLBACK_USER_ID))

        body = {
            "result": str(label).upper(),
            "type": str(payload.get("type") or "").upper(),
            "scheduleId": payload.get("scheduleId") or payload.get("schedule_id"),
            "eventId": payload.get("eventId") or payload.get("event_id") or payload.get("name"),
            "eventDate": payload.get("eventDate") or payload.get("event_date"),
            "pMacro": p_macro,
            "description": payload.get("description") or "1차 ML 모델 결과",
            "createdAt": payload.get("createdAt")
            or payload.get("created_at")
            or datetime.now(timezone.utc).isoformat(),
        }

        response = requests.post(
            target_url,
            headers=headers,
            json=body,
            timeout=self.timeout_sec,
        )

        if response.status_code < 200 or response.status_code >= 300:
            raise RuntimeError(
                f"BE callback failed, status={response.status_code}, body={response.text}"
            )

        return True


def create_be_callback_client() -> BeCallbackClient:
    return BeCallbackClient(
        result_url=BE_BOT_DETECTION_RESULT_URL,
        timeout_sec=BE_CALLBACK_TIMEOUT_SEC,
        internal_service_token=BE_INTERNAL_SERVICE_TOKEN,
    )


def add_query_param(url: str, key: str, value: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query[key] = value
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
