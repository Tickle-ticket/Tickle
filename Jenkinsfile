// Jenkinsfile
pipeline {
    agent any

    environment {
        BUILD_BE   = 'false'
        BUILD_AUTH = 'false'
        MATTERMOST_WEBHOOK = 'https://meeting.ssafy.com/hooks/riktjr5mz78g5xfot3p4pz4nnr'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '===== [1/4] 코드 체크아웃 시작 ====='
                checkout scm
                echo "브랜치: ${env.GIT_BRANCH}"
                echo "커밋: ${env.GIT_COMMIT}"
            }
        }

        stage('Detect Changes') {
            steps {
                echo '===== [2/4] 변경된 서비스 감지 시작 ====='
                script {
                    def changes = sh(
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

        stage('Build & Deploy') {
            parallel {

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
            script {
                def shortCommit = env.GIT_COMMIT?.take(7) ?: '???????'
                def branch = env.GIT_BRANCH ?: '?'
                def jobUrl = env.BUILD_URL ?: '#'
                def author = env.GIT_AUTHOR_NAME ?: '누군가'
                def msg = """{"text": "", "attachments": [{"color": "#00c851", "title": "🚀 CD 배포 성공!", "fields": [{"short": true, "title": "👤 작업자", "value": "${author}"}, {"short": true, "title": "🌲 브랜치", "value": "${branch}"}, {"short": true, "title": "📋 커밋", "value": "${shortCommit}"}, {"short": true, "title": "⏱️ 소요", "value": "${currentBuild.durationString.replace(' and counting', '')}"}, {"short": false, "title": "🔗 빌드", "value": "[Jenkins 확인하러 가기](${jobUrl})"}], "footer": "Tickle Jenkins"}]}"""
                sh "curl -s -X POST -H 'Content-Type: application/json' -d '${msg}' ${env.MATTERMOST_WEBHOOK}"
            }
        }
        failure {
            script {
                def shortCommit = env.GIT_COMMIT?.take(7) ?: '???????'
                def branch = env.GIT_BRANCH ?: '?'
                def jobUrl = env.BUILD_URL ?: '#'
                def author = env.GIT_AUTHOR_NAME ?: '누군가'
                def failMsg = ["아 ${author}야 배포 터졌어 빨리 봐 🚨", "${author} CD 나갔는데 ㅋㅋ 확인해", "${author} 서버 죽었다 살려줘 😭", "${author}!! 배포 빨간불 ㅠ 고쳐줘"][new Random().nextInt(4)]
                def msg = """{"text": "> ${failMsg}", "attachments": [{"color": "#ff4444", "title": "💥 CD 배포 실패!", "fields": [{"short": true, "title": "👤 담당자", "value": "**${author}**"}, {"short": true, "title": "🌲 브랜치", "value": "${branch}"}, {"short": true, "title": "📋 커밋", "value": "${shortCommit}"}, {"short": true, "title": "⏱️ 소요", "value": "${currentBuild.durationString.replace(' and counting', '')}"}, {"short": false, "title": "🔗 빌드", "value": "[Jenkins 확인하러 가기](${jobUrl})"}], "footer": "Tickle Jenkins"}]}"""
                sh "curl -s -X POST -H 'Content-Type: application/json' -d '${msg}' ${env.MATTERMOST_WEBHOOK}"
            }
        }
        always {
            echo '===== CD 파이프라인 종료 ====='
        }
    }
}
