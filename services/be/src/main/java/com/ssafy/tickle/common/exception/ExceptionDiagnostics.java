package com.ssafy.tickle.common.exception;

import io.micrometer.tracing.Tracer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 예외 응답에 실을 진단 정보를 만듭니다.
 *
 * <p>정의되지 않은 예외(NPE, 제약 위반 등)는 status와 code만으로는 원인을 알 수 없어
 * 결국 서버 로그를 뒤져야 합니다. 이를 줄이기 위해 두 가지를 응답에 싣습니다.</p>
 *
 * <ul>
 *   <li>{@code traceId} — 모든 환경. Tempo에서 해당 요청의 트레이스로 바로 이동한다.
 *       식별자 자체는 내부 구조를 드러내지 않으므로 운영에서도 안전하다.</li>
 *   <li>{@code debugMessage} — {@code tickle.exception.expose-debug-message=true}인
 *       환경만. 예외 원문에는 클래스명, 필드명, SQL 조각이 섞여 나오므로 외부에
 *       노출하면 정보 노출(CWE-209)이 된다.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ExceptionDiagnostics {

    /** 예외 원문이 지나치게 길어 응답을 뒤덮는 것을 막는 상한. */
    private static final int MAX_DEBUG_MESSAGE_LENGTH = 500;

    /**
     * Tracer는 tracing 설정이 없는 환경에서 빈이 없을 수 있어 지연 조회한다.
     * 진단 정보 때문에 예외 처리 자체가 실패하면 안 된다.
     */
    private final ObjectProvider<Tracer> tracerProvider;

    /**
     * debugMessage 노출 여부. 기본값 false이며 켜려면 환경변수로 명시해야 한다.
     *
     * <p>프로파일 이름으로 판단하지 않는다 — 배포 서버도 {@code SPRING_PROFILES_ACTIVE=local}로
     * 뜨고 있어(infra/docker-compose) 프로파일만으로는 로컬과 배포를 구분할 수 없다.
     * 켜는 쪽이 명시적 행위가 되도록 별도 플래그를 둔다.</p>
     */
    @Value("${tickle.exception.expose-debug-message:false}")
    private boolean exposeDebugMessage;

    /**
     * 현재 요청의 추적 식별자를 반환합니다.
     *
     * @return 트레이스 ID. 추적이 비활성이거나 활성 span이 없으면 null
     */
    public String traceId() {
        Tracer tracer = tracerProvider.getIfAvailable();
        if (tracer == null || tracer.currentSpan() == null) {
            return null;
        }
        return tracer.currentSpan().context().traceId();
    }

    /**
     * 예외 원문을 진단 메시지로 변환합니다.
     *
     * <p>{@code getMessage()}가 비어 있는 예외(NPE 등)가 있어 클래스명을 항상 앞에
     * 붙입니다. 이것만으로도 어떤 종류의 실패인지 구분됩니다.</p>
     *
     * @param exception 발생한 예외
     * @return 진단 메시지. 노출이 꺼져 있으면 null
     */
    public String debugMessage(Throwable exception) {
        if (!exposeDebugMessage) {
            return null;
        }

        String detail = exception.getMessage();
        String summary = detail == null || detail.isBlank()
                ? exception.getClass().getName()
                : exception.getClass().getName() + ": " + detail;

        return summary.length() <= MAX_DEBUG_MESSAGE_LENGTH
                ? summary
                : summary.substring(0, MAX_DEBUG_MESSAGE_LENGTH) + "...(truncated)";
    }
}
