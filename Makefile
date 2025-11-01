.PHONY: help build up down restart logs clean test backend-logs kafka-logs

# 기본 목표
.DEFAULT_GOAL := help

# 도움말
help:
	@echo "Kafka Monitoring Dashboard - Make Commands"
	@echo "=========================================="
	@echo "  make build         - 모든 Docker 이미지 빌드"
	@echo "  make up            - 모든 서비스 시작"
	@echo "  make down          - 모든 서비스 중지"
	@echo "  make restart       - 모든 서비스 재시작"
	@echo "  make logs          - 모든 서비스 로그 확인"
	@echo "  make backend-logs  - 백엔드 로그만 확인"
	@echo "  make kafka-logs    - Kafka 로그만 확인"
	@echo "  make clean         - 모든 컨테이너, 볼륨, 이미지 삭제"
	@echo "  make test          - 백엔드 테스트 실행"
	@echo "  make dev           - 개발 모드로 실행 (로그 출력)"

# Docker 이미지 빌드
build:
	@echo "Building Docker images..."
	docker-compose build

# 모든 서비스 시작
up:
	@echo "Starting all services..."
	docker-compose up -d
	@echo ""
	@echo "Services are starting..."
	@echo "Backend API: http://localhost:8080"
	@echo "Kafka UI: http://localhost:8090"
	@echo "Kafka Broker: localhost:9092"

# 개발 모드 (로그 출력과 함께 시작)
dev:
	@echo "Starting services in development mode..."
	docker-compose up

# 모든 서비스 중지
down:
	@echo "Stopping all services..."
	docker-compose down

# 모든 서비스 재시작
restart:
	@echo "Restarting all services..."
	docker-compose restart

# 모든 로그 확인
logs:
	docker-compose logs -f

# 백엔드 로그만 확인
backend-logs:
	docker-compose logs -f backend

# Kafka 로그만 확인
kafka-logs:
	docker-compose logs -f kafka

# Zookeeper 로그 확인
zookeeper-logs:
	docker-compose logs -f zookeeper

# 전체 클린업 (컨테이너, 볼륨, 네트워크 삭제)
clean:
	@echo "Cleaning up containers, volumes, and networks..."
	docker-compose down -v
	docker system prune -f

# 백엔드 테스트 실행
test:
	@echo "Running backend tests..."
	cd backend && go test -v ./...

# 백엔드만 재시작
restart-backend:
	@echo "Restarting backend service..."
	docker-compose restart backend

# Kafka만 재시작
restart-kafka:
	@echo "Restarting Kafka service..."
	docker-compose restart kafka

# 헬스체크
health:
	@echo "Checking service health..."
	@echo ""
	@echo "Backend Health:"
	@curl -s http://localhost:8080/health | jq . || echo "Backend not responding"
	@echo ""
	@echo "Kafka UI: http://localhost:8090"

# 백엔드 빌드만
build-backend:
	@echo "Building backend..."
	docker-compose build backend

# 프로젝트 초기 설정
setup:
	@echo "Setting up project..."
	@cp .env.example .env || true
	@echo "Environment file created (.env)"
	@echo "Run 'make up' to start services"
