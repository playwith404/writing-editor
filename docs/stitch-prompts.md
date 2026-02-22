# 🎨 Gleey — Google Stitch UI 생성 프롬프트 가이드

> **사용법**: 마스터 프롬프트를 복사한 뒤, 맨 아래 `→` 줄만 교체하여 Stitch에 제출.
> 메인페이지 이미지를 매번 함께 첨부하면 스타일 일관성이 좋아집니다.

---

## 📋 마스터 프롬프트 (매번 복사)

```
You are designing all screens for "Gleey" — an AI-powered web novel writing platform for Korean authors.

Design system rules (MUST follow consistently across ALL screens):
- Match the exact same style as the attached main page design
- Same color palette, typography (Pretendard or similar), spacing, border-radius
- Premium dark theme with glassmorphism cards
- Consistent navigation: top bar (logo, search, notifications, avatar), left sidebar
- Korean text for all UI labels
- Desktop web: 1920x1200 viewport
- Modern, clean, minimal aesthetic with subtle micro-animations implied

App context:
- Auth pages: login, register, forgot password, email verification
- Dashboard: project list, project detail/overview
- Planning studio: character cards, relationship graph, worldbuilding wiki, plot timeline
- Writing editor: normal mode (3-panel: sidebar tree + editor + right panel), focus/zen mode
- AI assistant: chat panel with writing suggestions
- Stats manager: RPG-style character stat tracking
- Publishing: platform export, writing statistics
- Settings: profile, editor preferences, AI config, subscription
- Version history: snapshot timeline with diff view
- Payment: pricing tiers (무료/프로/팀)

Now generate this specific screen:
→ [여기만 교체]
```

---

## 🖥️ 화면별 프롬프트 (→ 줄 교체용)

### 🔐 인증 (Auth)

**① 로그인**
```
→ Login page: centered glassmorphism card on gradient background. Email and password fields with floating labels. "로그인" primary button. Social login row (Google, Kakao, Naver icons). "비밀번호 찾기" link, "회원가입" link at bottom. Logo and tagline "AI와 함께 쓰는 웹소설 플랫폼" above the card.
```

**② 회원가입**
```
→ Register page: centered signup card matching login style. Fields: 이메일, 닉네임(필명), 비밀번호, 비밀번호 확인. Password strength indicator bar. Terms checkbox "이용약관 및 개인정보처리방침에 동의합니다". "회원가입" primary button. Social signup (Google, Kakao, Naver). "이미 계정이 있으신가요? 로그인" link.
```

**③ 비밀번호 찾기**
```
→ Forgot password page: centered minimal card with lock icon. Title "비밀번호 재설정". Description "가입 시 사용한 이메일을 입력하세요." Email input. "재설정 링크 보내기" primary button. "로그인으로 돌아가기" link.
```

**④ 이메일 인증**
```
→ Email verification page: centered card with animated mail icon. Title "이메일을 확인해주세요". Message about checking inbox. "인증 메일 재발송" secondary button. Subtle waiting animation.
```

---

### 📂 대시보드 (Dashboard)

**⑤ 프로젝트 목록 (메인 대시보드)**
```
→ Project dashboard: top nav bar (logo, search, bell icon, user avatar). Left sidebar (내 프로젝트, 공유 프로젝트, 최근 작업, 휴지통). Main area: "내 프로젝트" header + "새 프로젝트" button + grid/list toggle. Project cards showing: cover thumbnail, title (e.g. "드래곤의 후예"), genre tag (판타지), "52,340자", last edited, progress bar. 3-dot menu on each card. Quick stats bar at top: 총 프로젝트 3개, 이번 주 12,500자, 연속 5일.
```

**⑥ 프로젝트 상세 (프로젝트 홈)**
```
→ Project detail page: breadcrumb "내 프로젝트 > 드래곤의 후예". Left sidebar tabs (개요, 기획실, 집필, 스탯, 퍼블리싱, 백업, 설정). Main: project info card (title, description, genre), progress summary (전체 42%, 1부 완료, 2부 진행중 12/30장), recent activity feed, quick action buttons (이어서 쓰기, AI 어시스턴트), weekly word count bar chart.
```

---

### 📋 기획실 (Planning Studio)

**⑦ 캐릭터 카드 목록**
```
→ Character management page: header "캐릭터 관리" + "새 캐릭터" button + search bar. Filter chips (전체, 주인공, 서브, 악역, 조연). Grid of character cards: circular avatar, name "레온 하이드릭", role tag "주인공", description "츤데레 기사단장, 28세", key stats preview, relationship count badge. Sort dropdown.
```

**⑧ 캐릭터 상세/편집**
```
→ Character detail edit page or large modal: left side large portrait with upload. Right side tabbed form: "기본정보" tab (이름, 나이, 성별, 직업, 종족), "외모" tab (키, 체형, 머리색, 눈색), "성격" tab (MBTI selector, personality tags, 장단점, 말투 샘플), "배경" tab (출생, 과거사, 목표), "관계" tab (mini relationship graph). Bottom: "AI 자동생성" button, "저장" button.
```

**⑨ 관계도 에디터**
```
→ Relationship graph editor: large canvas with character nodes connected by colored labeled lines. Line styles: solid (우호), dashed (적대). Colors: red (사랑), blue (우정), purple (가족), orange (적대). Right panel: selected relationship details (from, to, type dropdown, description). Toolbar: zoom, add node, auto-layout, export. Mini-map in corner.
```

**⑩ 세계관 설정집**
```
→ Worldbuilding wiki page: left sidebar tree (📍 지리 > 아크란디아 왕국, 📜 역사 > 대마전쟁, ⚔️ 마법체계 > 원소마법, 📖 용어집). Right: selected entry with rich text, title, category breadcrumb, cross-reference links [[용어]], related entries. Search bar at sidebar top. "AI 일관성 체크" button.
```

**⑪ 플롯 타임라인**
```
→ Plot timeline page (timeline view): horizontal timeline with event cards. Each card: title, description, character avatar chips, chapter ref. Color-coded by arc (1부 blue, 2부 green, 3부 purple). View toggle tabs (리스트/타임라인/3막구조/스노우플레이크). Foreshadowing tracker panel: threads with 미회수/회수완료 status. "새 이벤트" FAB.
```

---

### ✍️ 집필실 (Writing Editor)

**⑫ 에디터 (기본 모드)**
```
→ Writing editor normal mode: 3-panel layout. Left sidebar: project tree (1부 > 1장 > 씬1, 씬2, 씬3) with status icons (초안/수정중/완료), "새 챕터" button. Center: clean rich text editor, floating toolbar (bold, italic, heading, quote), word count at bottom "1,247자 / 목표 3,000자". Right panel: tabs (캐릭터/세계관/AI/스탯), AI tab shows chat interface. Bottom status bar: "✓ 저장됨", word count, reading time.
```

**⑬ 에디터 (집중 모드)**
```
→ Focus/zen writing mode: full-screen dark background, centered text column (max-width 700px), typewriter mode with current line highlighted and centered vertically. Minimal UI: hover-reveal top bar (exit X, word count, timer). Subtle ambient mode selector at bottom corner (빗소리, 카페, 자연). Immersive, calming, distraction-free.
```

---

### 🎮 스탯 매니저

**⑭ 스탯 관리**
```
→ Stats manager page: header "스탯 매니저" + template selector (RPG/로판/현대/커스텀). Character selector tabs. Game-style status card: name, level, class, stat bars (힘 89/100, 민첩 72/100, 지능 45/100, 체력 156/200), skills list, equipment. Right panel: stat change history per chapter ("3장: 힘+5, Lv.27→28"). "일관성 체크" button, "스탯 변경 기록" button.
```

---

### 📤 퍼블리싱 & 기타

**⑮ 퍼블리싱 대시보드**
```
→ Publishing dashboard: platform cards (카카오페이지 connected green, 노블피아, 문피아, 리디북스) with logo, status, published count. Export section: format selector (EPUB/PDF/마크다운), chapter range, "내보내기" button. Writing statistics: total word count, daily average, calendar heatmap (GitHub-style), best streak "최장 연속 23일", time-based chart.
```

**⑯ 설정 페이지**
```
→ Settings page: left menu (프로필, 계정, 에디터 설정, AI 설정, 알림, 구독/결제, 데이터 관리). Main showing "에디터 설정": font family selector with preview (나눔명조, Pretendard, D2Coding), font size slider 14-24px, line height slider, theme swatches (라이트/다크/세피아), auto-save interval, typewriter mode toggle. "저장" button.
```

**⑰ 버전 히스토리**
```
→ Version history page: left timeline of snapshots (date, auto/manual badge, word count change "+234자"). Right: diff view with side-by-side or inline, added text green, removed text red. Version selector dropdowns. Action buttons: "이 버전으로 복원", "스냅샷 만들기", "다운로드".
```

**⑱ 구독/결제**
```
→ Pricing page: 3 tier cards side by side. 무료 (프로젝트 1개, 기본 AI, 5,000자/일), 프로 ₩9,900/월 (무제한, 모든 AI, 클라우드, 베타리더), 팀 ₩19,900/월 (프로 전체 + 협업, 팀 관리). Current plan badge. Feature comparison table below. FAQ accordion. "업그레이드" CTA with glow.
```

---

## ⚡ 작업 순서 추천

| 순서 | 화면 | 이유 |
|:---:|:---|:---|
| 1 | ⑤ 프로젝트 목록 | 네비게이션/레이아웃 기준 잡기 |
| 2 | ① 로그인 | 인증 스타일 기준 |
| 3 | ② 회원가입 | 로그인과 페어 |
| 4 | ⑥ 프로젝트 상세 | 대시보드 내부 |
| 5 | ⑫ 에디터 기본 | 핵심 화면 |
| 6 | ⑬ 에디터 집중 | 에디터 변형 |
| 7 | ⑦⑧ 캐릭터 | 기획실 기준 |
| 8 | ⑨⑩⑪ 관계도/세계관/플롯 | 기획실 나머지 |
| 9 | ⑭⑮⑯⑰⑱ | 나머지 전부 |

---

*총 18개 화면. 마스터 프롬프트 복사 → 마지막 줄만 교체 → 메인페이지 이미지 첨부 → 제출*
