"""수집된 세션 jsonl 파일을 10개 단위로 요약.

실행:
    python summarize_sessions.py
    python summarize_sessions.py --batch 20       # 20개 단위
    python summarize_sessions.py --label human    # macro / human / prototype 중 선택 (기본 prototype)

출력:
    배치별 평균 이벤트 수, 완주율, click 수, 짧은 세션 수 등
"""
import argparse
import json
from pathlib import Path


def summarize_session(path: Path) -> dict:
    """한 세션 jsonl 파일의 요약 통계."""
    events = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
    except Exception as e:
        return {"path": path.name, "error": str(e)}

    if not events:
        return {"path": path.name, "error": "empty"}

    n = len(events)

    # 이벤트 타입: 브라우저(prototype)는 "type", 매크로/사람(recorder)는 "event"
    def etype(e):
        return e.get("type") or e.get("event") or ""

    type_counts = {}
    for e in events:
        t = etype(e)
        type_counts[t] = type_counts.get(t, 0) + 1

    # click: 둘 다 포함
    clicks = type_counts.get("click", 0) + type_counts.get("mouse_click", 0)
    # mousemove: 둘 다 포함
    mousemoves = type_counts.get("mousemove", 0) + type_counts.get("mouse_move", 0)

    # duration: 브라우저 "t", 매크로 "ts_ms"
    ts = []
    for e in events:
        v = e.get("t") if e.get("t") is not None else e.get("ts_ms")
        if isinstance(v, (int, float)):
            ts.append(v)
    duration_ms = (max(ts) - min(ts)) if ts else 0

    # url 다양성 (브라우저만 URL 가짐)
    urls = set()
    for e in events:
        u = e.get("_url") or e.get("url")
        if u:
            urls.add(u)

    # 완주: 브라우저면 done.html 도달, 매크로면 기대 click 수 이상이면 완주로 간주
    reached_done = any("done.html" in str(e.get("_url", "") + e.get("url", "")) for e in events)
    # 매크로는 url 정보 없음 → click 수 기반 완주 (9개 plan 기준, 8 이상이면 완주)
    if not urls and clicks >= 8:
        reached_done = True

    return {
        "path": path.name,
        "events": n,
        "clicks": clicks,
        "mousemove": mousemoves,
        "render": type_counts.get("render", 0),
        "mouse_enter": type_counts.get("mouse_enter", 0),
        "duration_s": duration_ms / 1000,
        "pages": len(urls),
        "reached_done": reached_done,
    }


def print_batch(batch_idx: int, summaries: list[dict]):
    if not summaries:
        return
    n = len(summaries)
    valid = [s for s in summaries if "error" not in s]
    errors = [s for s in summaries if "error" in s]

    if not valid:
        print(f"\n=== Batch {batch_idx} ({n}세션) — 모두 에러 ===")
        for s in errors:
            print(f"  {s['path']}: {s['error']}")
        return

    avg_events = sum(s["events"] for s in valid) / len(valid)
    avg_clicks = sum(s["clicks"] for s in valid) / len(valid)
    avg_duration = sum(s["duration_s"] for s in valid) / len(valid)
    completed = sum(1 for s in valid if s["reached_done"])
    short_sessions = sum(1 for s in valid if s["events"] < 50)

    print(f"\n=== Batch {batch_idx} (세션 {n}개) ===")
    print(f"  평균 이벤트: {avg_events:.0f}")
    print(f"  평균 click: {avg_clicks:.1f}")
    print(f"  평균 duration: {avg_duration:.1f}s")
    print(f"  완주 (done.html 도달): {completed}/{len(valid)}")
    print(f"  짧은 세션 (이벤트<50): {short_sessions}개")
    if errors:
        print(f"  에러 파일: {len(errors)}개")

    # 의심 세션 세부 출력
    suspects = [s for s in valid if s["events"] < 50 or not s["reached_done"]]
    if suspects:
        print(f"  [의심 세션 {len(suspects)}개]:")
        for s in suspects[:5]:
            flag = "짧음" if s["events"] < 50 else "미완주"
            print(f"    {s['path'][:40]}... events={s['events']} clicks={s['clicks']} dur={s['duration_s']:.0f}s [{flag}]")


def main():
    parser = argparse.ArgumentParser(description="세션 jsonl 파일 10개 단위 요약")
    parser.add_argument("--batch", type=int, default=10, help="배치 크기 (기본 10)")
    parser.add_argument("--label", default="prototype",
                        choices=["prototype", "macro", "human"],
                        help="data/raw/{label}/ 폴더 대상")
    args = parser.parse_args()

    data_dir = Path(__file__).parent / "data" / "raw" / args.label
    if not data_dir.exists():
        print(f"폴더 없음: {data_dir}")
        return

    files = sorted(data_dir.glob("*.jsonl"))
    if not files:
        print(f"파일 없음: {data_dir}")
        return

    print(f"대상: {data_dir}")
    print(f"총 세션 파일: {len(files)}개")

    summaries = [summarize_session(f) for f in files]

    # 배치별 출력
    for batch_idx in range((len(summaries) + args.batch - 1) // args.batch):
        start = batch_idx * args.batch
        end = start + args.batch
        print_batch(batch_idx + 1, summaries[start:end])

    # 전체 요약
    valid = [s for s in summaries if "error" not in s]
    if valid:
        print(f"\n=== 전체 ({len(summaries)}세션) ===")
        print(f"  평균 이벤트: {sum(s['events'] for s in valid) / len(valid):.0f}")
        print(f"  완주율: {sum(1 for s in valid if s['reached_done'])}/{len(valid)} "
              f"({100 * sum(1 for s in valid if s['reached_done']) / len(valid):.0f}%)")
        print(f"  짧은 세션 비율: {sum(1 for s in valid if s['events'] < 50)}/{len(valid)}")


if __name__ == "__main__":
    main()
