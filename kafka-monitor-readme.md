# Kafka Monitoring Dashboard

Kafka를 학습하기 위한 실시간 모니터링 대시보드 프로젝트입니다. Go 백엔드와 React 프론트엔드로 구성되어 있으며, Docker Compose를 통해 Kafka 환경을 쉽게 구축하고 테스트할 수 있습니다.

## 프로젝트 구조

```
kafka-monitor/
├── docker-compose.yml          # Kafka, Zookeeper, 백엔드 서비스 구성
├── backend/                    # Go 백엔드 서버
│   ├── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── handlers/               # API 핸들러
│       ├── producer.go
│       ├── consumer.go
│       ├── admin.go
│       └── metrics.go
├── frontend/                   # React 프론트엔드
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ProducerPanel.jsx
│   │   │   ├── ConsumerPanel.jsx
│   │   │   ├── TopicManager.jsx
│   │   │   ├── MetricsDisplay.jsx
│   │   │   └── MessageLog.jsx
│   │   └── services/
│   │       └── api.js
│   └── vite.config.js
└── README.md
```

## 기능 목록

### 1. Producer 기능

- **메시지 전송**: 특정 토픽에 메시지 전송
- **Key 지정**: 파티션 분배를 위한 메시지 키 설정
- **파티션 지정**: 특정 파티션으로 직접 전송
- **배치 전송**: 여러 메시지를 한 번에 전송

### 2. Consumer 기능

- **메시지 소비**: 토픽에서 메시지 실시간 수신
- **오프셋 관리**: 특정 오프셋부터 읽기
- **Consumer Group**: 그룹 기반 메시지 소비
- **수동 커밋**: 오프셋 수동 커밋 기능

### 3. Topic 관리

- **토픽 생성**: 파티션 수, 복제 계수 지정
- **토픽 삭제**: 기존 토픽 삭제
- **토픽 목록 조회**: 모든 토픽 리스트 확인
- **토픽 상세 정보**: 파티션, 리더, ISR 정보 확인

### 4. 모니터링 및 메트릭

- **실시간 메시지 로그**: 전송/수신된 메시지 실시간 표시
- **오프셋 현황**: 각 파티션의 현재 오프셋
- **Consumer Lag**: Consumer Group의 지연(lag) 확인
- **파티션 상태**: 리더, 복제본, ISR 상태 모니터링
- **브로커 상태**: 연결된 브로커 정보

## 기술 스택

### Backend

- **언어**: Go 1.21+
- **Kafka 클라이언트**: [segmentio/kafka-go](https://github.com/segmentio/kafka-go)
- **웹 프레임워크**: Gin
- **WebSocket**: gorilla/websocket

### Frontend

- **프레임워크**: React 18
- **빌드 도구**: Vite
- **스타일링**: Tailwind CSS
- **상태 관리**: React Hooks
- **실시간 통신**: WebSocket

### Infrastructure

- **컨테이너**: Docker & Docker Compose
- **Kafka**: Confluent Kafka (latest)
- **Zookeeper**: 버전 3.8+

## 사전 요구사항

- Docker Desktop 또는 Docker Engine (20.10+)
- Docker Compose (v2.0+)
- Node.js 18+ (프론트엔드 개발 시)
- Go 1.21+ (백엔드 개발 시)

## 설치 및 실행

### 1. 프로젝트 클론 또는 생성

```bash
mkdir kafka-monitor
cd kafka-monitor
```

### 2. Docker Compose로 전체 환경 실행

```bash
# Kafka, Zookeeper, 백엔드 서버 모두 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

실행되는 서비스:

- **Zookeeper**: `localhost:2181`
- **Kafka Broker**: `localhost:9092`
- **Backend API**: `localhost:8080`
- **Kafka UI** (선택사항): `localhost:8081`

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:5173`에서 실행됩니다.

## API 엔드포인트

### Producer API

```bash
# 메시지 전송
POST /api/produce
Content-Type: application/json

{
  "topic": "test-topic",
  "key": "key1",
  "value": "Hello Kafka!",
  "partition": 0  // optional
}

# 배치 메시지 전송
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

```bash
# 메시지 소비 (WebSocket)
WS /api/consume/ws?topic=test-topic&group=group1

# 특정 오프셋부터 읽기
GET /api/consume?topic=test-topic&partition=0&offset=100
```

### Topic 관리 API

```bash
# 토픽 목록 조회
GET /api/topics

# 토픽 생성
POST /api/topics
Content-Type: application/json

{
  "name": "new-topic",
  "partitions": 3,
  "replicationFactor": 1
}

# 토픽 상세 정보
GET /api/topics/{topic-name}

# 토픽 삭제
DELETE /api/topics/{topic-name}
```

### Metrics API

```bash
# Consumer Group 정보
GET /api/metrics/consumer-groups

# Consumer Lag 확인
GET /api/metrics/lag?topic=test-topic&group=group1

# 브로커 정보
GET /api/brokers

# 전체 클러스터 상태
GET /api/metrics/cluster
```

## 사용 시나리오

### 시나리오 1: 기본 메시지 전송/수신 테스트

1. **토픽 생성**

   - Topic Manager에서 `test-topic` 생성 (파티션 3개)

2. **Consumer 시작**

   - Consumer Panel에서 토픽 선택, Consumer Group 입력
   - "Start Consuming" 클릭

3. **메시지 전송**
   - Producer Panel에서 메시지 입력
   - "Send Message" 클릭
   - Message Log에서 실시간 확인

### 시나리오 2: 파티션 분배 테스트

1. 동일한 Key로 여러 메시지 전송

   - Key를 지정하면 같은 파티션으로 전송됨을 확인

2. 다른 Key로 메시지 전송

   - 다른 파티션으로 분배됨을 확인

3. Metrics Display에서 각 파티션의 메시지 수 확인

### 시나리오 3: Consumer Group 테스트

1. 같은 Consumer Group으로 여러 Consumer 시작

2. 메시지 전송 후 파티션 분배 확인

   - 각 Consumer가 서로 다른 파티션을 담당

3. Consumer 하나를 중지하고 Rebalancing 확인

### 시나리오 4: Offset 관리 테스트

1. 메시지 여러 개 전송

2. Consumer를 중지했다가 다시 시작

   - 커밋된 오프셋부터 재개됨을 확인

3. 특정 오프셋으로 되돌아가기
   - Offset 지정 후 재소비

## 학습 포인트

### 1. Kafka 핵심 개념

- **Topic & Partition**: 메시지가 어떻게 분산 저장되는가
- **Producer & Consumer**: 메시지 전송/수신 패턴
- **Consumer Group**: 부하 분산과 장애 복구
- **Offset**: 메시지 위치 추적과 관리

### 2. 실시간 확인 가능한 것들

- 메시지 라우팅 (Key → Partition)
- Consumer Rebalancing
- Offset Commit
- Consumer Lag

### 3. 고급 개념 실험

- 파티션 수 변경 시 영향
- 복제(Replication) 동작
- 장애 복구 시뮬레이션
- 성능 튜닝

## 트러블슈팅

### Kafka가 시작되지 않을 때

```bash
# 컨테이너 로그 확인
docker-compose logs kafka

# Zookeeper 상태 확인
docker-compose logs zookeeper

# 포트 충돌 확인
lsof -i :9092
lsof -i :2181

# 완전히 재시작
docker-compose down -v
docker-compose up -d
```

### 백엔드 API 연결 실패

```bash
# 백엔드 컨테이너 재시작
docker-compose restart backend

# 백엔드 로그 확인
docker-compose logs -f backend

# Kafka 연결 확인
docker-compose exec backend ping kafka
```

### 프론트엔드에서 API 호출 실패

1. CORS 설정 확인 (backend/main.go)
2. API URL 확인 (frontend/src/services/api.js)
3. 브라우저 개발자 도구에서 네트워크 탭 확인

## 확장 아이디어

### 기능 추가

- [ ] Schema Registry 연동
- [ ] Avro/Protobuf 메시지 지원
- [ ] 트랜잭션 메시지 테스트
- [ ] Exactly-once 시맨틱스 구현
- [ ] 메시지 압축 옵션
- [ ] 보안 설정 (SASL, SSL)

### 모니터링 개선

- [ ] Grafana 대시보드 연동
- [ ] Prometheus 메트릭 수집
- [ ] 알림 설정
- [ ] 성능 벤치마크 도구

### 시나리오 자동화

- [ ] 부하 테스트 시나리오
- [ ] 장애 복구 시뮬레이션
- [ ] A/B 테스트 환경

## 참고 자료

- [Apache Kafka 공식 문서](https://kafka.apache.org/documentation/)
- [Kafka Go Client](https://github.com/segmentio/kafka-go)
- [Kafka 개념 정리](https://kafka.apache.org/intro)
- [Consumer Group 이해하기](https://kafka.apache.org/documentation/#consumerconfigs)

## 라이센스

MIT License

## 기여

이슈와 PR은 언제나 환영합니다!

---

**Happy Kafka Learning! 🚀**
