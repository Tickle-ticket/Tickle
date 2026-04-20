# Browser Automation

사람/매크로 행동 데이터를 수집하고 분석하기 위한 실험용 워크스페이스입니다.  
UI, 수집 API, 매크로 실행기, 분석 노트북을 분리해서 나중에 실제 서비스로 이식하기 쉽게 구성했습니다.

## 폴더 구조

```text
browser_automation/
├── simulator/
│   ├── package.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── api/
│       ├── pages/
│       ├── styles/
│       ├── tracking/
│       ├── App.jsx
│       └── main.jsx
├── collector_api/
│   ├── app/
│   ├── data/
│   ├── static/
│   └── README.md
├── macro_runner/
│   ├── __init__.py
│   └── cli.py
├── analysis/
│   ├── README.md
│   └── notebooks/
│       └── trial_analysis.ipynb
├── requirements-windows.txt
└── playwright_macro.py
```

## 모듈 설명

- `simulator`: 예매 흐름을 흉내 내는 React UI입니다.
- `collector_api`: trial 저장, raw event 저장, 매크로 제어 UI 제공을 담당합니다.
- `macro_runner`: Playwright 기반 자동 실행 로직입니다.
- `analysis`: 저장된 데이터를 노트북에서 분석하는 영역입니다.

## Windows 환경 준비

```bash
cd services/ai/macro/browser_automation
python -m pip install -r requirements-windows.txt
python -m playwright install chromium
```

## 실행 순서

1. `collector_api`를 실행합니다.
2. `simulator`를 실행합니다.
3. 매크로 제어 UI를 열거나, 터미널에서 매크로를 직접 실행합니다.
4. 수집된 데이터는 노트북에서 분석합니다.

## 터미널 명령어

`collector_api` 실행:

```bash
cd services/ai/macro/browser_automation/collector_api
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`simulator` 실행:

```bash
cd services/ai/macro/browser_automation/simulator
npm run dev
```

매크로 제어 UI:

```text
http://127.0.0.1:8000/macro-control
```



분석 노트북:

```text
services/ai/macro/browser_automation/analysis/notebooks/trial_analysis.ipynb
```

## 참고

- simulator의 captcha 정답은 고정값 `capcha`입니다.
- trial 데이터는 `collector_api/data/` 아래에 저장됩니다.
- `playwright_macro.py`는 기존 실행 습관을 유지하기 위한 얇은 호환 래퍼입니다.
