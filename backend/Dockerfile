# Build stage
FROM golang:1.21-alpine AS builder

# 필수 패키지 설치
RUN apk add --no-cache git

# 작업 디렉토리 설정
WORKDIR /app

# Go 모듈 파일 복사 및 다운로드
COPY go.mod go.sum ./
RUN go mod download

# 소스 코드 복사
COPY . .

# 바이너리 빌드
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime stage
FROM alpine:latest

# 필수 패키지 설치
RUN apk --no-cache add ca-certificates

# 작업 디렉토리 설정
WORKDIR /root/

# 빌드된 바이너리 복사
COPY --from=builder /app/main .

# 포트 노출
EXPOSE 8080

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 실행
CMD ["./main"]
