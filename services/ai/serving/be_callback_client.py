import os
from datetime import datetime, timezone
from typing import Any

import requests


BE_BOT_DETECTION_RESULT_URL = os.getenv("BE_BOT_DETECTION_RESULT_URL", "")
BE_CALLBACK_TIMEOUT_SEC = float(os.getenv("BE_CALLBACK_TIMEOUT_SEC", "2.0"))
BE_INTERNAL_SERVICE_TOKEN = os.getenv("BE_INTERNAL_SERVICE_TOKEN", "")


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

        if self.internal_service_token:
            headers["Authorization"] = f"Bearer {self.internal_service_token}"

        if access_token:
            headers["access-token"] = access_token

        if request_id:
            headers["X-Request-Id"] = request_id

        body = {
            "result": label,
            "type": payload.get("type"),
            "schedule_id": payload.get("schedule_id"),
            # TODO: 현재 Kafka payload의 name 필드를 임시로 event_id에 매핑한다.
            # 추후 FE, BE 스키마 확정 시 event_id 필드를 분리한다.
            "event_id": payload.get("name"),
            "event_date": payload.get("event_date"),
            "p_macro": p_macro,
            "description": "1차 ML 모델 결과",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        response = requests.post(
            self.result_url,
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