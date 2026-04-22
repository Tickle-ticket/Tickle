# Collector API

브라우저 행동 데이터를 저장하고, 매크로 제어 UI를 제공하는 백엔드입니다.

## 실행

```bash
cd services/ai/macro/browser_automation/collector_api
python -m pip install -r ../requirements-windows.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 매크로 제어 UI

```text
http://127.0.0.1:8000/macro-control
```

## 저장 파일

- `data/trials/trial_00001.json`
- `data/trial_summary.jsonl`
- `data/event_rows.jsonl`
- `data/window_rows.jsonl`
