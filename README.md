# Kafka Monitoring Dashboard

Kafka를 학습하기 위한 실시간 모니터링 대시보드 프로젝트입니다. Go 백엔드와 React 프론트엔드로 구성되어 있으며, Docker Compose를 통해 Kafka 환경을 쉽게 구축하고 테스트할 수 있습니다.

## 프로젝트 구조

```
go-kafka-monitoring-dashboard/
├── docker-compose.yml          # Kafka, Zookeeper, 백엔드 서비스 구성
├── docker-compose.dev.yml      # 개발 환경 설정
├── Makefile                    # 편의 명령어
├── .env.example                # 환경 변수 예시
├── backend/                    # Go 백엔드 서버
│   ├── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── handlers/               # API 핸들러
│       ├── producer.go         # Producer 기능
│       ├── consumer.go         # Consumer 기능
│       ├── admin.go            # Topic 관리
│       └── metrics.go          # 메트릭/모니터링
└── frontend/                   # React 프론트엔드
    ├── src/
    │   ├── components/         # React 컴포넌트
    │   ├── services/           # API 서비스
    │   └── App.jsx
    ├── Dockerfile
    └── package.json
```

## 주요 기능

### 1. Producer 기능
- 단일 메시지 전송
- 배치 메시지 전송
- Key 기반 파티션 분배
- 특정 파티션 지정 전송

### 2. Consumer 기능
- HTTP를 통한 메시지 소비
- WebSocket 실시간 메시지 스트리밍
- Consumer Group 지원
- 특정 오프셋부터 읽기

### 3. Topic 관리
- 토픽 생성/삭제
- 토픽 목록 조회
- 토픽 상세 정보 (파티션, 리더, ISR, 오프셋)

### 4. 모니터링 및 메트릭
- Consumer Lag 확인
- 클러스터 메트릭
- 브로커 정보
- 파티션별 상태 확인

## 기술 스택

- **Backend**: Go 1.21+, Gin, kafka-go, gorilla/websocket
- **Infrastructure**: Docker, Docker Compose, Kafka 7.5.0, Zookeeper
- **Frontend**: React 18, Vite, Tailwind CSS, Axios

## 필수 요구사항

- Docker Desktop 또는 Docker Engine (20.10+)
- Docker Compose (v2.0+)
- Make (선택사항)

## 빠른 시작

### 1. 환경 설정
```bash
make setup
# 또는
cp .env.example .env
```

### 2. 서비스 시작
```bash
# 모든 서비스 시작
make up

# 개발 모드 (로그 출력)
make dev

# 서비스 중지
make down
```

### 3. 서비스 접속
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Kafka UI**: http://localhost:8090
- **Kafka Broker**: localhost:9092
- **Health Check**: http://localhost:8080/health

## API 엔드포인트

### Producer API

**단일 메시지 전송**
```bash
POST /api/produce
Content-Type: application/json

{
  "topic": "test-topic",
  "key": "message-key",
  "value": "Hello Kafka!",
  "partition": 0  // 선택사항
}
```

**배치 메시지 전송**
```bash
POST /api/produce/batch
Content-Type: application/json

{
  "topic": "test-topic",
  "messages": [
    {"key": "key1", "value": "message1"},
    {"key": "key2", "value": "message2"}
  ]
}
```

### Consumer API

**HTTP 메시지 소비**
```bash
GET /api/consume?topic=test-topic&partition=0&offset=0
```

**WebSocket 실시간 소비**
```bash
WS /api/consume/ws?topic=test-topic&group=my-group
```

### Topic 관리 API

```bash
GET /api/topics                          # 토픽 목록 조회
POST /api/topics                         # 토픽 생성
GET /api/topics/:name                    # 토픽 상세 정보
DELETE /api/topics/:name                 # 토픽 삭제
```

### Metrics API

```bash
GET /api/metrics/lag?topic=test-topic&group=consumer-group  # Consumer Lag
GET /api/metrics/cluster                                     # 클러스터 메트릭
GET /api/brokers                                             # 브로커 정보
GET /api/metrics/consumer-groups                             # Consumer Group 목록
```

## Make 명령어

```bash
make help               # 모든 명령어 확인
make setup              # 초기 설정
make up                 # 모든 서비스 시작
make down               # 모든 서비스 중지
make logs               # 모든 로그 확인
make backend-logs       # 백엔드 로그만
make kafka-logs         # Kafka 로그만
make clean              # 전체 클린업
make health             # 서비스 헬스체크
```

## 사용 예제

### 토픽 생성 및 메시지 전송
```bash
# 토픽 생성
curl -X POST http://localhost:8080/api/topics \
  -H "Content-Type: application/json" \
  -d '{"name": "test-topic", "partitions": 3, "replicationFactor": 1}'

# 메시지 전송
curl -X POST http://localhost:8080/api/produce \
  -H "Content-Type: application/json" \
  -d '{"topic": "test-topic", "key": "key1", "value": "Hello Kafka!"}'

# 메시지 소비
curl "http://localhost:8080/api/consume?topic=test-topic&partition=0"
```

### WebSocket 실시간 소비 (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:8080/api/consume/ws?topic=test-topic&group=my-group');

ws.onopen = () => console.log('Connected to Kafka');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## 트러블슈팅

### Kafka 연결 실패
```bash
docker-compose logs kafka       # 로그 확인
make restart-kafka              # 재시작
```

### 백엔드 연결 실패
```bash
make backend-logs               # 로그 확인
curl http://localhost:8080/health  # 헬스체크
```

### 전체 리셋
```bash
make clean                      # 전체 클린업
make up                         # 재시작
```

## 학습 포인트

- **Kafka 핵심 개념**: Topic, Partition, Producer, Consumer, Offset
- **실시간 확인**: 메시지 라우팅, Consumer Rebalancing, Offset Commit, Consumer Lag
- **고급 개념**: 파티션 수 변경, 복제, 장애 복구, 성능 튜닝

## 참고 자료

- [Apache Kafka 공식 문서](https://kafka.apache.org/documentation/)
- [Kafka Go Client](https://github.com/segmentio/kafka-go)
- [Gin Web Framework](https://gin-gonic.com/)

## 라이선스

MIT License

---

**Happy Kafka Learning! 🚀**