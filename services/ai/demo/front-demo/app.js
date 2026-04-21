// 데모 애플리케이션: DOM 이벤트 캡쳐 + API 전송. EventLogger 에 의존.
// event_logger.js 를 먼저 로드해야 함.
(function () {
    'use strict';

    if (!window.EventLogger) {
        console.error('[app] event_logger.js must be loaded before app.js');
        return;
    }
    const logger = window.EventLogger;

    // --- 세션 ID (localStorage 에 유지) ---
    const STORAGE_KEY = 'tdemo_session';
    function getSessionId() {
        let s = localStorage.getItem(STORAGE_KEY);
        if (!s) {
            s = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(STORAGE_KEY, s);
        }
        return s;
    }
    const sessionId = getSessionId();

    // --- 설정 ---
    const FLUSH_INTERVAL_MS = 1000;
    const MAX_BUFFER_FORCE_FLUSH = 200;
    const PRE_CLICK_WINDOW_MS = 500;
    const MOUSE_MOVE_THROTTLE_MS = 10;
    const API_ENDPOINT = '/log';

    // --- API 전송 ---
    function flush(useBeacon) {
        if (logger.buffer.length === 0) return;
        const events = logger.drain();
        const payload = {
            session_id: sessionId,
            url: location.pathname,
            ts: Date.now(),
            events: events
        };
        const body = JSON.stringify(payload);
        try {
            if (useBeacon && navigator.sendBeacon) {
                navigator.sendBeacon(API_ENDPOINT, new Blob([body], { type: 'application/json' }));
            } else {
                fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    keepalive: true
                }).catch(function () { /* demo: drop on error */ });
            }
        } catch (err) { /* ignore */ }
    }

    setInterval(function () { flush(false); }, FLUSH_INTERVAL_MS);
    window.addEventListener('beforeunload', function () { flush(true); });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flush(true);
    });

    // --- Pre-click 버퍼 (click 직전 500ms 구간 좌표) ---
    const preClickBuffer = [];
    function pushPreClick(x, y) {
        const now = logger.now();
        preClickBuffer.push({ t: now, x: x, y: y });
        while (preClickBuffer.length && now - preClickBuffer[0].t > PRE_CLICK_WINDOW_MS) {
            preClickBuffer.shift();
        }
    }

    // --- DOM 리스너 ---
    let lastMouseMoveT = 0;
    document.addEventListener('mousemove', function (e) {
        const now = logger.now();
        pushPreClick(e.clientX, e.clientY);
        if (now - lastMouseMoveT < MOUSE_MOVE_THROTTLE_MS) return;
        lastMouseMoveT = now;
        logger.record('mousemove', { x: e.clientX, y: e.clientY });
        if (logger.buffer.length >= MAX_BUFFER_FORCE_FLUSH) flush(false);
    }, { passive: true });

    document.addEventListener('click', function (e) {
        const target = e.target;
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const now = logger.now();
        const buf300 = preClickBuffer.filter(function (p) { return now - p.t <= 300; });
        const buf500 = preClickBuffer.slice();
        logger.record('click', {
            x: e.clientX,
            y: e.clientY,
            targetId: target.id || null,
            targetTag: target.tagName,
            targetClass: typeof target.className === 'string' ? target.className : null,
            bbox: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
            offCenterX: e.clientX - cx,
            offCenterY: e.clientY - cy,
            preClick300: logger.summarizePath(buf300),
            preClick500: logger.summarizePath(buf500),
            preClickMoveCount: buf500.length
        });
    });

    document.addEventListener('scroll', function () {
        logger.record('scroll', { scrollY: window.scrollY, scrollX: window.scrollX });
    }, { passive: true, capture: true });

    document.addEventListener('keydown', function (e) {
        logger.record('keydown', { key: e.key, code: e.code });
    });

    document.addEventListener('focusin', function (e) {
        logger.record('focus', { targetId: e.target.id || null, targetTag: e.target.tagName });
    });
    document.addEventListener('focusout', function (e) {
        logger.record('blur', { targetId: e.target.id || null, targetTag: e.target.tagName });
    });

    // --- Hover 추적 (feature A13, B11) ---
    // id 있는 요소만 기록. 요소 간 이동 시 leave + enter 쌍 발화.
    let currentHoverId = null;
    document.addEventListener('mouseover', function (e) {
        const idEl = e.target.id ? e.target : e.target.closest('[id]');
        if (!idEl) return;
        if (idEl.id === currentHoverId) return;
        if (currentHoverId) {
            logger.record('mouse_leave', { targetId: currentHoverId });
        }
        currentHoverId = idEl.id;
        logger.record('mouse_enter', { targetId: idEl.id, targetTag: idEl.tagName });
    });

    // --- IntersectionObserver — 요소 가시성 (feature 2, 13) ---
    let io = null;
    try {
        io = new IntersectionObserver(function (entries) {
            entries.forEach(function (ent) {
                logger.record('visibility', {
                    targetId: ent.target.id || null,
                    targetTag: ent.target.tagName,
                    visible: ent.isIntersecting,
                    ratio: +ent.intersectionRatio.toFixed(3)
                });
            });
        }, { threshold: [0, 0.5, 1] });
        document.querySelectorAll('[id]').forEach(function (el) { io.observe(el); });
    } catch (err) { /* IntersectionObserver not supported */ }

    // --- MutationObserver — 렌더 시점 + disabled 변경 (feature 15, D4) ---
    try {
        const mo = new MutationObserver(function (muts) {
            muts.forEach(function (mut) {
                if (mut.type === 'childList') {
                    mut.addedNodes.forEach(function (node) {
                        if (node.nodeType !== 1) return;
                        if (!node.id) return;
                        logger.record('render', {
                            targetId: node.id,
                            targetTag: node.tagName
                        });
                        if (io) io.observe(node);
                    });
                } else if (mut.type === 'attributes') {
                    if (mut.attributeName === 'disabled') {
                        logger.record('disabled_change', {
                            targetId: mut.target.id || null,
                            targetTag: mut.target.tagName,
                            disabled: mut.target.disabled === true || mut.target.hasAttribute('disabled')
                        });
                    } else if (mut.attributeName === 'class') {
                        logger.record('class_change', {
                            targetId: mut.target.id || null,
                            targetTag: mut.target.tagName,
                            className: typeof mut.target.className === 'string' ? mut.target.className : null
                        });
                    }
                }
            });
        });
        mo.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['disabled', 'class']
        });
    } catch (err) { /* MutationObserver not supported */ }

    // --- 세션 메타 ---
    logger.record('session_start', {
        url: location.href,
        userAgent: navigator.userAgent,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        dpr: window.devicePixelRatio
    });

    window.__app = { sessionId: sessionId, flush: flush, preClickBuffer: preClickBuffer };
})();
