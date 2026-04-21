// Jenkinsfile
// 목적: develop-be 브랜치에 코드가 머지되면
//       자동으로 빌드 → 이미지 push → 서버 배포까지 진행한다.

pipeline {
    agent any

    environment {
        BUILD_BE   = 'false'
        BUILD_AUTH = 'false'
    }

    stages {

        // ── 1단계: 코드 체크아웃 ───────────────────────────────
        stage('Checkout') {
            steps {
                echo '===== [1/4] 코드 체크아웃 시작 ====='
                checkout scm
                echo "브랜치: ${env.GIT_BRANCH}"
                echo "커밋: ${env.GIT_COMMIT}"
            }
        }

        // ── 2단계: 변경된 서비스 감지 ─────────────────────────
        // git diff로 변경된 파일을 확인해서
        // 변경된 서비스만 빌드/배포해 불필요한 작업을 줄인다.
        stage('Detect Changes') {
            steps {
                echo '===== [2/4] 변경된 서비스 감지 시작 ====='
                script {
                    def changes = sh(
                        // HEAD~1이 없는 첫 커밋 상황 fallback 처리
                        script: "git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD",
                        returnStdout: true
                    ).trim()

                    echo "변경된 파일 목록:\n${changes}"

                    env.BUILD_BE   = changes.contains('services/be/')   ? 'true' : 'false'
                    env.BUILD_AUTH = changes.contains('services/auth/') ? 'true' : 'false'

                    echo "BE 배포 필요: ${env.BUILD_BE}"
                    echo "Auth 배포 필요: ${env.BUILD_AUTH}"
                }
            }
        }

        // ── 3단계: 병렬 빌드 & 배포 ───────────────────────────
        // BE와 Auth가 동시에 변경된 경우 병렬로 실행해 배포 시간을 단축한다.
        // 변경되지 않은 서비스는 자동으로 스킵된다.
        stage('Build & Deploy') {
            parallel {

                // ── BE: 빌드 → push → 배포 ────────────────────
                // Jenkins 서버(arm64)에서 amd64 빌드 시 QEMU 에뮬레이션으로
                // 10~20배 느려지므로 서버 1(c6i.large, amd64)에서 네이티브 빌드한다.
                // SSH 세션을 하나로 통합해 연결 오버헤드를 줄인다.
                stage('BE') {
                    when { environment name: 'BUILD_BE', value: 'true' }
                    steps {
                        echo '===== [3/4] BE 빌드 및 배포 시작 ====='
                        withCredentials([usernamePassword(
                            credentialsId: 'gitlab-credentials',
                            usernameVariable: 'GITLAB_USER',
                            passwordVariable: 'GITLAB_PASS'
                        )]) {
                            sshagent(['tickle-deploy-key']) {
                                sh """
                                    ssh -o StrictHostKeyChecking=no ubuntu@${SERVER1_IP} '
                                        set -e

                                        echo "[BE] GitLab Registry 로그인"
                                        docker login registry.lab.ssafy.com -u ${GITLAB_USER} -p ${GITLAB_PASS}

                                        echo "[BE] 코드 최신화"
                                        cd ~/S14P31A203
                                        git fetch origin
                                        git checkout develop-be
                                        git pull origin develop-be

                                        echo "[BE] Docker 이미지 빌드"
                                        docker build -t ${REGISTRY}/be:latest ./services/be

                                        echo "[BE] GitLab Registry push"
                                        docker push ${REGISTRY}/be:latest

                                        echo "[BE] 컨테이너 재시작"
                                        docker compose --env-file .env -f infra/docker-compose/server1-main.yml pull be
                                        docker compose --env-file .env -f infra/docker-compose/server1-main.yml up -d be

                                        echo "[BE] 배포 완료"
                                    '
                                """
                            }
                        }
                        echo 'BE 배포 완료!'
                    }
                }

                // ── Auth: 빌드 → push → 배포 ──────────────────
                // 서버 4(arm64)에서 네이티브 빌드한다.
                stage('Auth') {
                    when { environment name: 'BUILD_AUTH', value: 'true' }
                    steps {
                        echo '===== [4/4] Auth 빌드 및 배포 시작 ====='
                        withCredentials([usernamePassword(
                            credentialsId: 'gitlab-credentials',
                            usernameVariable: 'GITLAB_USER',
                            passwordVariable: 'GITLAB_PASS'
                        )]) {
                            sshagent(['tickle-deploy-key']) {
                                sh """
                                    ssh -o StrictHostKeyChecking=no ubuntu@${SERVER4_IP} '
                                        set -e

                                        echo "[Auth] GitLab Registry 로그인"
                                        docker login registry.lab.ssafy.com -u ${GITLAB_USER} -p ${GITLAB_PASS}

                                        echo "[Auth] 코드 최신화"
                                        cd ~/S14P31A203
                                        git fetch origin
                                        git checkout develop-be
                                        git pull origin develop-be

                                        echo "[Auth] Docker 이미지 빌드 및 push"
                                        docker build -t ${REGISTRY}/auth:latest ./services/auth
                                        docker push ${REGISTRY}/auth:latest

                                        echo "[Auth] 컨테이너 재시작"
                                        docker compose --env-file .env -f infra/docker-compose/server4-auth.yml pull auth
                                        docker compose --env-file .env -f infra/docker-compose/server4-auth.yml up -d auth

                                        echo "[Auth] 배포 완료"
                                    '
                                """
                            }
                        }
                        echo 'Auth 배포 완료!'
                    }
                }

            }
        }

    }

    post {
        success {
            echo """
            ========================================
            ✅ CD 배포 성공!
            브랜치: ${env.GIT_BRANCH}
            커밋: ${env.GIT_COMMIT}
            ========================================
            """
        }
        failure {
            echo """
            ========================================
            ❌ CD 배포 실패!
            브랜치: ${env.GIT_BRANCH}
            커밋: ${env.GIT_COMMIT}
            빌드 로그를 확인해서 문제를 수정해주세요.
            ========================================
            """
        }
        always {
            echo '===== CD 파이프라인 종료 ====='
        }
    }
}