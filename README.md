# TapTapTap 감정일기

교사 대시보드와 학생 선택형 감정일기 앱입니다.

## 기능

- 학생: 이름과 4자리 PIN으로 6단계 클릭형 감정일기 작성/수정
- 학생: 최초 접속 또는 교사 재설정 후 로그인 화면에서 입력한 4자리 PIN으로 새 PIN 설정
- 학생: 확인된 기기에서는 7일간 세션 유지
- 학생: OpenRouter 설정 시 AI 일기 요약과 조언 표시, 미설정 시 로컬 요약 표시
- 교사: 비밀번호 로그인 후 학생 등록, 오늘 제출 현황, SEL 역량, 위기 알림, 학생별 이력 조회
- 저장소: PostgreSQL (Drizzle ORM)

## 로컬 실행

1. 의존성 설치

```bash
pnpm install
```

2. 환경변수 설정 (`.env.example` 참고)

```bash
cp .env.example .env
```

필수 값:

- `DATABASE_URL`
- `TEACHER_DASHBOARD_PASSWORD`
- `TEACHER_SESSION_SECRET`
- `TZ=Asia/Seoul`
- `OPENROUTER_API_KEY` (선택, 없으면 로컬 요약 사용)
- `OPENROUTER_MODEL=openai/gpt-oss-120b:nitro` (선택)

3. 마이그레이션 생성/적용

```bash
pnpm db:generate
pnpm db:migrate
```

4. 개발 서버 실행

```bash
pnpm dev
```

## Railway 배포 메모

### 권장 구성

- Railway Web Service (SvelteKit app)
- Railway Postgres

### Railway Variables

- `DATABASE_URL` : Railway Postgres 연결 문자열
- `DATABASE_PRIVATE_URL` : 선택. 앱과 Postgres가 같은 Railway 프로젝트/환경에 있으면 private/internal 연결 문자열을 넣으세요. 설정되어 있으면 `DATABASE_URL`보다 우선 사용합니다.
- `TEACHER_DASHBOARD_PASSWORD` : 교사 로그인 비밀번호
- `TEACHER_SESSION_SECRET` : 긴 랜덤 문자열
- `TZ` : `Asia/Seoul`
- `OPENROUTER_API_KEY` : AI 요약/조언 생성용 OpenRouter 키
- `OPENROUTER_MODEL` : 기본값 `openai/gpt-oss-120b:nitro`
- `PG_POOL_MAX` : 기본값 `5`
- `PG_IDLE_TIMEOUT_MS` : 기본값 `60000`
- `PG_CONNECTION_TIMEOUT_MS` : 기본값 `3000`
- `PG_ALLOW_EXIT_ON_IDLE` : 기본값 `false`

### Build / Start

- `railway.json`에 Build command, Start command, healthcheck가 설정되어 있습니다.
- Start command: `node --max-old-space-size=128 build`

속도가 중요하면 Railway 서비스 설정에서 Serverless를 끄는 편이 낫습니다. Serverless는 idle 비용을 줄이는 대신 첫 요청 cold boot가 생기고, DB 커넥션도 다시 데워져서 교실에서 “눌렀는데 한참 걸림”처럼 보일 수 있습니다.

앱과 Postgres가 같은 Railway 프로젝트/환경에 있다면 TCP Proxy/public URL 대신 private networking URL을 쓰세요. public URL은 외부 접속용이라 DB 왕복 지연이 커질 수 있습니다.

### 배포 후 최초 실행

Railway shell 또는 배포 파이프라인에서 마이그레이션 실행:

```bash
pnpm db:migrate
```

## 주요 라우트

- `/` : 학생 PIN 로그인 및 PIN 최초 설정/재설정
- `/student/[code]` : 학생 감정일기 작성
- `/teacher/login` : 교사 로그인
- `/teacher` : 교사 대시보드
- `/teacher/students/[studentId]` : 학생별 이력

## 수동 테스트 체크리스트

### 환경/DB

- `.env`에 `DATABASE_URL`, `TEACHER_DASHBOARD_PASSWORD`, `TEACHER_SESSION_SECRET`, `TZ=Asia/Seoul`이 없으면 적절히 실패하는지 확인
- `OPENROUTER_API_KEY`가 없어도 학생 제출 후 로컬 요약/조언이 표시되는지 확인
- `OPENROUTER_API_KEY`가 있을 때 AI 요약/조언이 표시되고 실패 시 로컬 요약으로 fallback 되는지 확인
- `pnpm db:migrate` 후 `students.pin_hash`, `students.pin_reset_required`, `students_name_unique` 제약이 생기는지 확인
- 기존 학생의 PIN이 비어 있어도 로그인 화면에서 PIN 설정 흐름이 가능한지 확인

### 교사 인증

- `/teacher` 직접 접근 시 미로그인 사용자가 `/teacher/login`으로 이동하는지 확인
- 잘못된 교사 비밀번호는 로그인되지 않는지 확인
- 올바른 비밀번호 입력 후 `/teacher`로 이동하는지 확인
- 교사 로그아웃 후 대시보드 접근이 다시 막히는지 확인
- 교사 로그인 rate limit이 반복 실패에 동작하는지 확인

### 학생 등록/관리

- 교사 대시보드에서 학생 이름을 한 줄에 한 명씩 등록할 수 있는지 확인
- 이미 등록된 학생 이름이나 같은 요청 안의 중복 이름은 거부되는지 확인
- 등록 직후 학생 목록에 학생 이름이 표시되는지 확인
- 학생 상세 화면에서 PIN 상태 `설정 필요`가 표시되는지 확인
- 학생 상세 화면에서 PIN 재설정을 누르면 PIN 상태가 `설정 필요`로 바뀌는지 확인
- 학생 삭제 시 학생 정보와 감정일기 기록이 함께 삭제되고 목록에서 사라지는지 확인

### 학생 PIN 로그인/설정

- 최초 학생이 `/`에서 이름+PIN 4자리로 PIN을 만들고 감정일기 화면으로 이동하는지 확인
- PIN 설정 후 같은 학생이 이름+PIN만으로 감정일기 화면에 들어가는지 확인
- 틀린 PIN은 거부되는지 확인
- PIN이 4자리 숫자가 아니면 설정/로그인이 거부되는지 확인
- 교사가 PIN 재설정 후 기존 PIN 로그인이 실패하는지 확인
- 교사가 PIN 재설정 후 학생이 이름+새 PIN으로 다시 설정할 수 있는지 확인
- 같은 이름의 학생은 등록되지 않는지 확인
- 로그인 성공 후 7일 세션 쿠키가 설정되고 `/student/[code]` 새로고침이 유지되는지 확인
- 세션 없이 `/student/[code]` 직접 접근하면 `/`로 돌아가는지 확인

### 학생 감정일기 작성

- 1단계 몸의 신호 선택지가 모두 표시되는지 확인
- 2단계 12가지 감정 이름이 표시되는지 확인
- 3단계 1~5점 감정 강도가 표시되는지 확인
- 4단계 장소/대상 선택지가 표시되는지 확인
- 5단계 사건 선택지가 2단계 감정 카테고리에 맞게 즉시 바뀌는지 확인
- 6단계 자기 조절 선택지가 2단계 감정 카테고리에 맞게 즉시 바뀌는지 확인
- 6단계 선택 후 저장되고 일기 요약/오늘의 조언이 표시되는지 확인
- 저장 후 다시 쓰기를 누르면 새 답변으로 같은 날짜 기록이 갱신되는지 확인
- 텍스트 입력 없이 클릭만으로 완료되는지 확인
- 잘못된 질문 순서나 조작된 선택지를 API로 보내면 저장이 거부되는지 확인
- 학생 제출 API가 same-origin, JSON content-type, content-length, rate limit 검사를 수행하는지 확인

### AI/개인정보

- OpenRouter 요청 payload에 PIN, PIN hash가 포함되지 않는지 확인
- OpenRouter 응답이 JSON이 아니거나 timeout/오류가 나도 학생에게 로컬 요약이 표시되는지 확인
- 학생 감정 데이터 페이지와 API 응답에 `cache-control: no-store`가 적용되는지 확인
- PIN 원문이 DB나 로그에 저장/표시되지 않고 `pin_hash`만 저장되는지 확인
- 교사 화면에서 PIN 원문을 볼 수 없고 재설정만 가능한지 확인

### 교사 대시보드

- 오늘 제출한 학생은 `제출함`, 미제출 학생은 `미제출`로 표시되는지 확인
- 학생별 감정, 강도, SEL 역량, 사건 요약이 오늘 제출 현황에 표시되는지 확인
- 최근 30일 감정 트렌드가 건수 순으로 표시되는지 확인
- SEL 카드가 최근 기록 기준으로 집계되는지 확인
- 부정 감정 강도 4점 이상이 3일 연속 기록된 학생에게 위기 알림이 표시되는지 확인
- 3일 중 하루라도 미제출이거나 강도 4점 미만이면 위기 알림이 표시되지 않는지 확인
- 학생 이름 클릭 시 학생별 이력 화면으로 이동하는지 확인

### 학생별 이력

- 학생 상세 화면에서 PIN 상태가 표시되는지 확인
- 날짜별 감정, 강도, SEL 역량이 표시되는지 확인
- 각 기록의 6단계 답변이 `몸의 신호`, `감정 이름`, `감정 강도`, `장소/대상`, `구체적 사건`, `자기 조절`로 표시되는지 확인
- 기록이 없는 학생은 빈 상태 안내가 표시되는지 확인

### 배포/라우팅

- `/teacher/login`, `/teacher`, `/teacher/students/[studentId]`, `/student/[code]` 주요 라우트가 새로고침에서도 정상 동작하는지 확인
- Railway에서 `pnpm build`, `pnpm start`, `pnpm db:migrate`가 성공하는지 확인
- `TZ=Asia/Seoul` 기준으로 오늘 날짜 기록이 생성되고 같은 날 재제출 시 upsert 되는지 확인
