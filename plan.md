# Firebase 댓글 기능 구현 플랜

## 아키텍처

- **Firebase Firestore** (무료 Spark 플랜) — 댓글 저장
- **Firebase Auth** (Google 로그인) — 스팸 방지, 작성자 식별
- **Astro React Island** — 댓글 컴포넌트 (클라이언트 사이드)
- SSG 빌드에 영향 없음. 댓글은 100% 클라이언트에서 로드/작성

## Firestore 구조

```
comments/{commentId}
├── postSlug: string     (글 식별자, 예: "2026.03.23")
├── author: string       (Google 표시 이름)
├── authorUid: string    (Firebase Auth UID)
├── authorPhoto: string  (Google 프로필 사진 URL)
├── content: string      (댓글 내용)
├── createdAt: Timestamp
└── updatedAt: Timestamp (수정 시)
```

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /comments/{commentId} {
      // 누구나 읽기 가능
      allow read: if true;
      // 로그인한 사용자만 작성
      allow create: if request.auth != null
        && request.resource.data.authorUid == request.auth.uid;
      // 본인 댓글만 수정/삭제
      allow update, delete: if request.auth != null
        && resource.data.authorUid == request.auth.uid;
    }
  }
}
```

## Sprint 구성

### Sprint 1: Firebase 설정 + Astro React 통합

**작업:**
1. `npm install firebase @astrojs/react react react-dom`
2. `astro.config.mjs`에 `@astrojs/react` 통합 추가
3. `src/lib/firebase.ts` — Firebase 초기화 (config는 환경변수 또는 하드코딩. 공개 프로젝트이므로 Firebase 클라이언트 키는 노출돼도 OK, Security Rules가 보호함)
4. Firebase 프로젝트는 이미 생성되어 있다고 가정. config 값은 placeholder로 두고 `src/lib/firebase.ts`에 주석으로 설정 방법 안내

**완료 조건:**
- `npx astro build` 성공
- `src/lib/firebase.ts`가 존재하고 `getFirestore()`, `getAuth()` export

**검증:**
- `npx astro build 2>&1 | tail -5` → "Complete!" 확인

### Sprint 2: 댓글 React 컴포넌트

**작업:**
1. `src/components/Comments.tsx` 생성
   - props: `postSlug: string`
   - 기능: 댓글 목록 조회 (postSlug로 필터), 댓글 작성, Google 로그인/로그아웃
   - UI: 기존 블로그 스타일과 일관되게 (Pretendard, stone 색상 계열)
   - 로그인 안 한 상태: "Google로 로그인하여 댓글을 남기세요" 버튼
   - 로그인 상태: 텍스트 입력 + 작성 버튼 + 본인 댓글 삭제 버튼
2. `src/layouts/BlogPost.astro`에 댓글 컴포넌트 삽입
   - tags 영역 아래에 배치
   - `client:visible` 디렉티브 사용 (뷰포트 진입 시 로드 → 초기 번들 최소화)
   - postSlug는 `post.id`를 전달

**UI 스타일 규칙 (반드시 준수):**
- 인라인 style 또는 CSS Module 사용 (Tailwind 클래스 사용 가능하지만 컴포넌트 내에서 font 직접 지정하지 말 것 — body에서 상속)
- 색상: `#1c1917` (텍스트), `#78716c` (muted), `#e7e5e4` (border), `#f5f5f4` (surface)
- 댓글 간 구분선: `border-bottom: 1px solid #e7e5e4`
- 프로필 이미지: 32px 원형
- 작성 시간: 상대 시간 ("3분 전", "1시간 전", "어제")

**완료 조건:**
- `npx astro build` 성공
- 블로그 글 페이지 하단에 댓글 영역 렌더링
- Firebase 미설정 상태에서도 에러 없이 "댓글을 불러오는 중..." 또는 빈 상태 표시

**검증:**
- `npx astro build 2>&1 | tail -5` → "Complete!"
- 브라우저에서 글 페이지 열고 스크롤 → 댓글 영역 존재 확인

### Sprint 3: (수동) Firebase 프로젝트 설정

> 이건 주인님이 Firebase Console에서 직접 수행. Claude Code가 할 수 없음.

1. https://console.firebase.google.com/ → 프로젝트 생성
2. Firestore Database 활성화 (test mode로 시작)
3. Authentication → Google 로그인 활성화
4. 프로젝트 설정 → 웹 앱 추가 → config 값 복사
5. `src/lib/firebase.ts`에 config 값 채움
6. Firestore Rules에 위의 Security Rules 적용

## 디렉토리 변경 요약

```
src/
├── lib/
│   └── firebase.ts          ← NEW (Firebase 초기화)
├── components/
│   └── Comments.tsx          ← NEW (React 댓글 컴포넌트)
├── layouts/
│   └── BlogPost.astro        ← MODIFIED (Comments 컴포넌트 삽입)
astro.config.mjs              ← MODIFIED (@astrojs/react 추가)
```
