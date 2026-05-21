#!/bin/bash
# =============================================================
# Tickle k6 성능 테스트 실행 스크립트
#
# Usage:
#   ./run.sh <scenario_file_basename> [stage]
#
# Examples:
#   ./run.sh 01_queue_enter smoke
#   ./run.sh 02_queue_sse stage_200
#   ./run.sh 03_seat_hold
#   ./run.sh 04_full_flow
#
# Note:
#   - scenario_file_basename은 scenarios/ 디렉토리의 .js 파일명에서 확장자 제외.
#   - .env.perf 파일이 같은 디렉토리에 있어야 한다.
# =============================================================
set -e

cd "$(dirname "$0")"

SCENARIO=${1:-"01_queue_enter"}
STAGE=${2:-"default"}

if [ ! -f .env.perf ]; then
  echo ".env.perf 파일이 없습니다. .env.perf.example을 복사하세요."
  echo "  cp .env.perf.example .env.perf"
  exit 1
fi

# .env.perf 로드
set -a
# shellcheck disable=SC1091
source .env.perf
set +a

SCRIPT_PATH="scenarios/${SCENARIO}.js"
if [ ! -f "${SCRIPT_PATH}" ]; then
  echo "Scenario script not found: ${SCRIPT_PATH}"
  echo "Available scenarios:"
  ls scenarios/*.js | sed 's|scenarios/||; s|\.js||'
  exit 1
fi

mkdir -p results

OUT_PREFIX="results/${SCENARIO}_${STAGE}_$(date +%Y%m%d_%H%M%S)"

K6_OUT_ARGS=("--summary-export=${OUT_PREFIX}.summary.json")

if [ -n "${PROMETHEUS_REMOTE_WRITE_URL}" ] \
   && [[ "${PROMETHEUS_REMOTE_WRITE_URL}" != *"<SERVER3_PRIVATE_IP>"* ]]; then
  K6_OUT_ARGS+=("--out" "experimental-prometheus-rw")
  export K6_PROMETHEUS_RW_SERVER_URL="${PROMETHEUS_REMOTE_WRITE_URL}"
  echo "[run.sh] Prometheus Remote Write enabled → ${PROMETHEUS_REMOTE_WRITE_URL}"
else
  echo "[run.sh] PROMETHEUS_REMOTE_WRITE_URL 미설정 — 로컬 summary만 저장합니다."
fi

echo "[run.sh] Running ${SCRIPT_PATH} (stage=${STAGE})"

k6 run \
  "${K6_OUT_ARGS[@]}" \
  --tag stage="${STAGE}" \
  --env STAGE="${STAGE}" \
  --env BASE_URL="${BASE_URL}" \
  --env AUTH_BASE_URL="${AUTH_BASE_URL}" \
  --env TEST_USER_EMAIL="${TEST_USER_EMAIL}" \
  --env TEST_USER_PASSWORD="${TEST_USER_PASSWORD}" \
  --env TEST_EVENT_ID="${TEST_EVENT_ID}" \
  --env TEST_SCHEDULE_ID="${TEST_SCHEDULE_ID}" \
  --env TEST_SEAT_IDS="${TEST_SEAT_IDS}" \
  --env SEAT_HOLD_REQUIRE_ADMIT="${SEAT_HOLD_REQUIRE_ADMIT:-true}" \
  --env PRE_ADMIT_TOKEN="${PRE_ADMIT_TOKEN:-}" \
  "${SCRIPT_PATH}"

echo "[run.sh] Done. Summary: ${OUT_PREFIX}.summary.json"
