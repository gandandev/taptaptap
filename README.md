# TapTapTap 감정일기

교사 대시보드와 학생 코드 입력 기반 감정일기 앱입니다.

## 기능

- 학생: 2자리 코드 입력 후 오늘 감정일기 작성/수정
- 교사: 비밀번호 로그인 후 학생 등록, 오늘 제출 현황 확인, 학생별 이력 조회
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
- `TEACHER_DASHBOARD_PASSWORD` : 교사 로그인 비밀번호
- `TEACHER_SESSION_SECRET` : 긴 랜덤 문자열
- `TZ` : `Asia/Seoul`

### Build / Start

- Build command: `pnpm build`
- Start command: `pnpm start`

### 배포 후 최초 실행

Railway shell 또는 배포 파이프라인에서 마이그레이션 실행:

```bash
pnpm db:migrate
```

## 주요 라우트

- `/` : 학생 코드 입력
- `/student/[code]` : 학생 감정일기 작성
- `/teacher/login` : 교사 로그인
- `/teacher` : 교사 대시보드
- `/teacher/students/[studentId]` : 학생별 이력
