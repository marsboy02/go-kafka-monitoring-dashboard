# Frontend 가이드

Kafka Monitoring Dashboard의 프론트엔드는 React + Vite + Tailwind CSS로 구성되어 있습니다.

## 프론트엔드 구조

```
frontend/
├── src/
│   ├── components/           # React 컴포넌트
│   │   ├── ProducerPanel.jsx      # Producer 기능 UI
│   │   ├── ConsumerPanel.jsx      # Consumer 기능 UI
│   │   ├── TopicManager.jsx       # Topic 관리 UI
│   │   ├── MetricsDisplay.jsx     # 메트릭 대시보드
│   │   └── MessageLog.jsx         # 메시지 로그 표시
│   ├── services/
│   │   └── api.js            # API 통신 로직
│   ├── App.jsx               # 메인 애플리케이션
│   ├── main.jsx              # 엔트리 포인트
│   └── index.css             # 전역 스타일
├── public/                   # 정적 파일
├── index.html                # HTML 템플릿
├── vite.config.js            # Vite 설정
├── tailwind.config.js        # Tailwind CSS 설정
├── package.json              # NPM 의존성
├── Dockerfile                # 프로덕션 빌드용
└── .env.example              # 환경 변수 예시
```

## 주요 기능

### 1. Producer Panel
- 단일 메시지 전송
- 배치 메시지 전송 (여러 개 동시 전송)
- Key 및 Partition 지정
- 전송 성공/실패 피드백

### 2. Consumer Panel
- WebSocket을 통한 실시간 메시지 소비
- HTTP 모드로 특정 오프셋부터 읽기
- Consumer Group 설정
- 연결 상태 표시

### 3. Topic Manager
- 토픽 생성 (파티션, 복제 계수 설정)
- 토픽 삭제
- 토픽 목록 조회
- 토픽 상세 정보 (파티션, 오프셋 등)

### 4. Metrics Display
- 클러스터 메트릭 (브로커, 토픽, 파티션 수)
- 브로커 정보
- 토픽별 메트릭 (파티션 수, 메시지 수)
- Consumer Lag 조회
- 자동 새로고침 (5초마다)

### 5. Message Log
- 실시간 메시지 로그 표시
- Produced/Consumed 메시지 구분
- 타임스탬프, 토픽, 파티션, 오프셋 정보
- 로그 클리어 기능

## 로컬 개발

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버는 http://localhost:5173에서 실행됩니다.

### 3. 환경 변수 설정

`.env` 파일을 생성하고 백엔드 API URL을 설정하세요:

```bash
VITE_API_URL=http://localhost:8080
```

### 4. 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## Docker로 실행

### 프론트엔드만 빌드

```bash
docker build -t kafka-frontend ./frontend
```

### 프론트엔드 실행

```bash
docker run -p 3000:80 kafka-frontend
```

## 컴포넌트 상세 설명

### ProducerPanel.jsx

**Props:**
- `topics`: 토픽 목록 배열
- `onMessageSent`: 메시지 전송 시 콜백 함수

**주요 기능:**
- 단일/배치 모드 토글
- 토픽 선택 (드롭다운 또는 직접 입력)
- Key, Value, Partition 입력
- 전송 로딩 상태 표시
- 에러 메시지 표시

### ConsumerPanel.jsx

**Props:**
- `topics`: 토픽 목록 배열
- `onMessageReceived`: 메시지 수신 시 콜백 함수

**주요 기능:**
- WebSocket/HTTP 모드 선택
- Consumer Group 설정
- 실시간 연결 상태 표시
- 소비 시작/중지
- 수신 메시지 콜백

### TopicManager.jsx

**Props:**
- `topics`: 토픽 목록 배열
- `onTopicsChange`: 토픽 변경 시 콜백 함수

**주요 기능:**
- 토픽 생성 폼
- 토픽 목록 표시
- 토픽 상세 정보 조회
- 토픽 삭제 (확인 다이얼로그)
- 수동 새로고침

### MetricsDisplay.jsx

**Props:**
- `topics`: 토픽 목록 배열

**주요 기능:**
- 클러스터 개요 카드
- 브로커 상태 목록
- 토픽별 메트릭 테이블
- Consumer Lag 조회 폼
- 자동 새로고침 토글

### MessageLog.jsx

**Props:**
- `messages`: 메시지 배열
- `onClear`: 로그 클리어 콜백

**주요 기능:**
- 메시지 타입별 색상 구분
- 타임스탬프 포맷팅
- 스크롤 가능한 로그 영역
- 최대 100개 메시지 유지

## API 서비스 (services/api.js)

### 함수 목록

#### Producer
- `produceMessage(topic, key, value, partition)`
- `produceBatchMessages(topic, messages)`

#### Consumer
- `consumeMessages(topic, partition, offset)`
- `createConsumerWebSocket(topic, group, onMessage, onError)`

#### Topic Management
- `listTopics()`
- `createTopic(name, partitions, replicationFactor)`
- `getTopicDetails(name)`
- `deleteTopic(name)`

#### Metrics
- `getConsumerGroups()`
- `getConsumerLag(topic, group)`
- `getBrokers()`
- `getClusterMetrics()`

#### Health
- `healthCheck()`

## 스타일링

### Tailwind CSS 클래스

프로젝트에서 사용하는 주요 커스텀 클래스:

- `.btn-primary`: 기본 버튼 스타일
- `.btn-secondary`: 보조 버튼 스타일
- `.btn-danger`: 위험 버튼 스타일
- `.btn-success`: 성공 버튼 스타일
- `.input-field`: 입력 필드 스타일
- `.card`: 카드 컨테이너
- `.card-header`: 카드 헤더
- `.badge`: 배지 스타일
- `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`: 색상별 배지

### 애니메이션

- `.fade-in`: 페이드 인 애니메이션 (0.3초)

## 브라우저 지원

- Chrome (최신 2개 버전)
- Firefox (최신 2개 버전)
- Safari (최신 2개 버전)
- Edge (최신 2개 버전)

## 트러블슈팅

### CORS 에러

백엔드에서 CORS가 올바르게 설정되어 있는지 확인하세요.

```go
// backend/main.go
config := cors.DefaultConfig()
config.AllowAllOrigins = true
```

### WebSocket 연결 실패

1. 백엔드가 실행 중인지 확인
2. 방화벽 설정 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 프로덕션 빌드 실패

1. Node.js 버전 확인 (18+ 권장)
2. 의존성 재설치: `rm -rf node_modules && npm install`
3. 캐시 클리어: `npm run build -- --force`

## 개발 팁

### Hot Module Replacement (HMR)

Vite는 기본적으로 HMR을 지원합니다. 코드 변경 시 자동으로 브라우저가 업데이트됩니다.

### DevTools

React DevTools 브라우저 확장을 설치하면 컴포넌트 디버깅이 쉬워집니다.

### 성능 최적화

- `React.memo`를 사용하여 불필요한 리렌더링 방지
- `useCallback`, `useMemo` 훅 활용
- 큰 리스트는 가상 스크롤링 고려

## 다음 단계

- [ ] 다크 모드 추가
- [ ] 메시지 필터링 기능
- [ ] 메시지 검색 기능
- [ ] 차트 라이브러리 추가 (실시간 그래프)
- [ ] 토픽 설정 편집 기능
- [ ] 메시지 포맷터 (JSON, Avro 등)
- [ ] 북마크/즐겨찾기 기능
- [ ] 사용자 설정 저장 (LocalStorage)

## 참고 자료

- [React 공식 문서](https://react.dev/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)
- [Axios 문서](https://axios-http.com/)
