import time
import uuid

from serving.schemas import BatchItem, DetectionResult
from serving.repository import insert_behavior_feature_records


def make_record_id() -> str:
    return f"rec_{uuid.uuid4().hex[:16]}"


def should_flush(
    batch_items: list[BatchItem],
    last_flush_time: float,
    batch_size: int,
    flush_interval_sec: float,
) -> bool:
    if not batch_items:
        return False

    batch_full = len(batch_items) >= batch_size
    timeout_reached = (time.monotonic() - last_flush_time) >= flush_interval_sec

    return batch_full or timeout_reached


def build_detection_results(
    batch_items: list[BatchItem],
    predictions: list[tuple[str, float]],
) -> list[DetectionResult]:
    results = []

    for item, (label, p_macro) in zip(batch_items, predictions):
        results.append(
            DetectionResult(
                record_id=make_record_id(),
                item=item,
                label=label,
                p_macro=p_macro,
            )
        )

    return results


def send_be_callbacks(
    be_callback_client,
    detection_results: list[DetectionResult],
) -> tuple[int, int, int]:
    sent_count = 0
    skipped_count = 0
    failed_count = 0

    if not be_callback_client.enabled():
        return 0, len(detection_results), 0

    for result in detection_results:
        if result.label == "REVIEW":
            skipped_count += 1
            continue

        try:
            be_callback_client.send_result(
                access_token=result.item.access_token,
                request_id=result.item.request_id,
                payload=result.item.payload,
                label=result.label,
                p_macro=result.p_macro,
            )
            sent_count += 1

        except Exception as e:
            failed_count += 1
            print(
                f"[ai-worker] failed to send BE callback, "
                f"record_id={result.record_id}, "
                f"label={result.label}, "
                f"error={e}"
            )

    return sent_count, skipped_count, failed_count


def process_batch(
    conn,
    predictor,
    be_callback_client,
    batch_items: list[BatchItem],
) -> tuple[int, int, int, int]:
    if not batch_items:
        return 0, 0, 0, 0

    features_list = [item.payload["features"] for item in batch_items]

    predictions = predictor.predict_batch(features_list)
    detection_results = build_detection_results(batch_items, predictions)

    be_sent_count, be_skipped_count, be_failed_count = send_be_callbacks(
        be_callback_client=be_callback_client,
        detection_results=detection_results,
    )

    insert_behavior_feature_records(conn, detection_results)

    return (
        len(detection_results),
        be_sent_count,
        be_skipped_count,
        be_failed_count,
    )


def count_access_token_headers(batch_items: list[BatchItem]) -> int:
    return sum(1 for item in batch_items if item.access_token)


def count_request_id_headers(batch_items: list[BatchItem]) -> int:
    return sum(1 for item in batch_items if item.request_id)
