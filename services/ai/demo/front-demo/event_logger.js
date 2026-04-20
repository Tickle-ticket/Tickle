// Raw 이벤트 로거. 이벤트를 수집해 내부 버퍼에 저장하고, 필요 시 콘솔 시각화.
// 사용: EventLogger.record(type, data) / EventLogger.drain() / EventLogger.peek()
// 디버그 모드: URL 에 ?debug=1 붙이면 콘솔로 이벤트 echo
(function () {
    'use strict';

    const buf = [];
    const debug = new URLSearchParams(location.search).get('debug') === '1';

    function t() { return performance.now(); }

    function record(type, data) {
        const e = Object.assign({ t: t(), type: type }, data || {});
        buf.push(e);
        if (debug) console.log('[evt]', e);
        return e;
    }

    function drain() {
        return buf.splice(0, buf.length);
    }

    function peek() {
        return buf.slice();
    }

    // 경로 통계 요약 (D6 option a): 평균 속도, 속도 분산, 방향 변화 수, 총 거리
    function summarizePath(points) {
        if (points.length < 2) {
            return { n: points.length, avgSpeed: 0, speedVar: 0, dirChanges: 0, totalDist: 0 };
        }
        let totalDist = 0, totalTime = 0;
        const speeds = [];
        let changes = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const dt = points[i].t - points[i - 1].t;
            const d = Math.sqrt(dx * dx + dy * dy);
            totalDist += d;
            totalTime += dt;
            if (dt > 0) speeds.push(d / dt);
            if (i >= 2) {
                const dx0 = points[i - 1].x - points[i - 2].x;
                const dy0 = points[i - 1].y - points[i - 2].y;
                if (dx0 * dx + dy0 * dy < 0) changes++;
            }
        }
        const mean = speeds.reduce(function (a, b) { return a + b; }, 0) / (speeds.length || 1);
        const variance = speeds.length
            ? speeds.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / speeds.length
            : 0;
        return {
            n: points.length,
            avgSpeed: totalTime > 0 ? totalDist / totalTime : 0,
            speedVar: variance,
            dirChanges: changes,
            totalDist: totalDist
        };
    }

    window.EventLogger = {
        record: record,
        drain: drain,
        peek: peek,
        summarizePath: summarizePath,
        now: t,
        buffer: buf
    };
})();
