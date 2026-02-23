# 🎨 Gleey 프론트엔드 설계

> 웹, 데스크톱, 모바일 클라이언트의 기술 설계를 정의합니다.

---

## 1. 기술 스택

### 1.1 핵심 기술

| 영역 | 기술 | 버전 |
|------|------|------|
| **Framework** | Next.js (App Router) | 14.x |
| **Language** | TypeScript | 5.x |
| **Styling** | TailwindCSS + shadcn/ui | 3.x |
| **State** | Zustand + TanStack Query | - |
| **Editor** | TipTap (ProseMirror) | 2.x |
| **Realtime** | Socket.io-client | 4.x |
| **Desktop** | Electron | 28.x |
| **Mobile** | React Native + Expo | 50.x |

### 1.2 개발 도구

| 도구 | 용도 |
|------|------|
| Vite | 빌드 (데스크톱) |
| ESLint + Prettier | 코드 품질 |
| Vitest | 유닛 테스트 |
| Playwright | E2E 테스트 |
| Storybook | 컴포넌트 문서화 |

---

## 2. 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # 대시보드
│   │   ├── projects/
│   │   └── settings/
│   ├── (editor)/          # 에디터 (별도 레이아웃)
│   │   └── [projectId]/
│   └── api/               # API Routes
│
├── components/
│   ├── ui/                # 기본 UI (shadcn)
│   ├── editor/            # 에디터 컴포넌트
│   ├── planning/          # 기획실 컴포넌트
│   ├── ai/                # AI 어시스턴트
│   └── common/            # 공통 컴포넌트
│
├── hooks/                 # 커스텀 훅
├── stores/                # Zustand 스토어
├── services/              # API 클라이언트
├── types/                 # TypeScript 타입
├── utils/                 # 유틸리티
└── styles/                # 글로벌 스타일
```

---

## 3. 컴포넌트 아키텍처

### 3.1 에디터 구조

```
EditorPage
├── EditorLayout
│   ├── Sidebar (프로젝트 트리)
│   │   ├── ProjectTree
│   │   ├── ChapterList
│   │   └── SceneList
│   │
│   ├── MainEditor
│   │   ├── EditorToolbar
│   │   ├── TipTapEditor
│   │   │   ├── FloatingMenu
│   │   │   └── BubbleMenu
│   │   └── StatusBar
│   │
│   └── RightPanel (토글)
│       ├── CharacterPanel
│       ├── WorldPanel
│       ├── AIAssistant
│       └── StatsPanel
```

### 3.2 핵심 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `TipTapEditor` | 리치 텍스트 에디터 |
| `CharacterCard` | 캐릭터 정보 표시/편집 |
| `RelationshipGraph` | 관계도 시각화 (D3.js) |
| `PlotTimeline` | 플롯 타임라인 |
| `AIChat` | AI 어시스턴트 채팅 |
| `StatsManager` | 스탯/상태창 관리 |

---

## 4. 상태 관리

### 4.1 Zustand 스토어

```typescript
// stores/editorStore.ts
interface EditorStore {
  // 현재 문서
  currentDocument: Document | null;
  setCurrentDocument: (doc: Document) => void;
  
  // 변경 추적
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  
  // 사이드패널
  rightPanel: 'character' | 'world' | 'ai' | null;
  setRightPanel: (panel: string | null) => void;
  
  // 집중 모드
  focusMode: boolean;
  toggleFocusMode: () => void;
}
```

### 4.2 서버 상태 (TanStack Query)

```typescript
// hooks/useProject.ts
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.get(id),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

export function useSaveDocument() {
  return useMutation({
    mutationFn: documentService.save,
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });
}
```

---

## 5. 에디터 설계

### 5.1 TipTap 확장

| 확장 | 기능 |
|------|------|
| `CharacterMention` | @캐릭터명 멘션 |
| `SettingLink` | [[설정명]] 링크 |
| `SceneBreak` | 씬 구분선 |
| `DialogueFormat` | 대사 자동 포맷 |
| `WordCount` | 실시간 글자 수 |

### 5.2 자동 저장

```typescript
// hooks/useAutoSave.ts
export function useAutoSave(content: string, docId: string) {
  const saveMutation = useSaveDocument();
  
  // 디바운스: 500ms 후 저장
  const debouncedSave = useDebouncedCallback(
    (content) => {
      saveMutation.mutate({ id: docId, content });
    },
    500
  );
  
  // 오프라인 저장 (IndexedDB)
  useEffect(() => {
    localDB.save(docId, content);
  }, [content, docId]);
  
  return { isSaving: saveMutation.isPending };
}
```

---

## 6. 실시간 협업

### 6.1 WebSocket 연결

```typescript
// services/realtimeService.ts
class RealtimeService {
  private socket: Socket;
  
  connect(projectId: string) {
    this.socket = io(WS_URL, {
      query: { projectId },
      auth: { token: getAccessToken() },
    });
    
    this.socket.on('cursor:update', this.handleCursor);
    this.socket.on('content:update', this.handleContent);
  }
  
  sendCursor(position: Position) {
    this.socket.emit('cursor:move', position);
  }
}
```

---

## 7. 성능 최적화

| 기법 | 적용 |
|------|------|
| **Code Splitting** | 페이지별 lazy loading |
| **Virtual List** | 긴 목록 가상화 (react-window) |
| **Memoization** | React.memo, useMemo |
| **Image Opt** | next/image, WebP/AVIF |
| **Prefetch** | 라우트 프리페치 |

---

## 8. 오프라인 지원

- Service Worker (PWA)
- 정적 자산: Cache First
- API: Network First
- IndexedDB: 문서 데이터 로컬 저장

---

## 9. 테스트 전략

| 유형 | 도구 | 커버리지 목표 |
|------|------|--------------|
| **Unit** | Vitest | 80%+ |
| **Component** | Testing Library | 70%+ |
| **E2E** | Playwright | 핵심 플로우 |

---

*버전: 1.0 | 작성일: 2026년 1월*
