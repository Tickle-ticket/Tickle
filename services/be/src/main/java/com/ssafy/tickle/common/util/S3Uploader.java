package com.ssafy.tickle.common.util;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

/**
 * AWS S3 파일 업로드 유틸리티입니다.
 *
 * <p>MultipartFile을 S3에 업로드하고 접근 가능한 URL을 반환한다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class S3Uploader {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    /**
     * 파일을 S3에 업로드하고 URL을 반환합니다.
     *
     * @param file      업로드할 파일
     * @param directory S3 내 디렉토리 경로 (예: "profiles", "events/poster")
     * @return 업로드된 파일의 S3 URL
     */
    public String upload(MultipartFile file, String directory) {
        validateFile(file);

        String key = buildKey(directory, file.getOriginalFilename());

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("S3 업로드 완료: key={}", key);

            return buildUrl(key);
        } catch (IOException e) {
            log.error("S3 업로드 실패: key={}", key, e);
            throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * S3에서 파일을 삭제합니다.
     *
     * @param url 삭제할 파일의 S3 URL
     */
    public void delete(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String key = extractKey(url);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
            log.info("S3 삭제 완료: key={}", key);
        } catch (Exception e) {
            log.warn("S3 삭제 실패: key={}", key, e);
        }
    }

    /**
     * 파일 유효성을 검사합니다.
     *
     * @param file 검사할 파일
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BaseException(GlobalErrorCode.INVALID_INPUT_VALUE);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BaseException(GlobalErrorCode.INVALID_INPUT_VALUE);
        }
    }

    /**
     * S3 객체 키를 생성합니다.
     *
     * @param directory     디렉토리 경로
     * @param originalName  원본 파일명
     * @return S3 객체 키
     */
    private String buildKey(String directory, String originalName) {
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        return directory + "/" + UUID.randomUUID() + ext;
    }

    /**
     * S3 URL을 생성합니다.
     *
     * @param key S3 객체 키
     * @return 접근 가능한 URL
     */
    private String buildUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }

    /**
     * S3 URL에서 객체 키를 추출합니다.
     *
     * @param url S3 URL
     * @return 객체 키
     */
    private String extractKey(String url) {
        // https://{bucket}.s3.{region}.amazonaws.com/{key}
        int idx = url.indexOf(".amazonaws.com/");
        if (idx == -1) {
            return url;
        }
        return url.substring(idx + ".amazonaws.com/".length());
    }
}
