# ProjectStory 블록 정렬 & 사진 이동 버그 수정 지시서

> 대상 파일: `ProjectStory.tsx`, `StoryBlocks.tsx`
> 참고 파일: `chapters.py` (API 스키마 확인용)

---

## 작업 전 필수 확인 사항

1. 각 수정은 **독립적으로 커밋** 가능하도록 분리할 것
2. 수정 후 반드시 해당 기능을 수동으로 검증할 것 (아래 각 항목에 검증 시나리오 포함)
3. `chapterPhotos` state 구조(`Record<string, ChapterItem[]>`)는 변경하지 말 것
4. API 엔드포인트 경로 및 페이로드 구조는 변경하지 말 것

---

## FIX-1 🔴 `handleCrossBlockDragEnd` — 낙관적 업데이트 + `fetchChapterPhotos` 중복 호출

### 문제
낙관적 업데이트로 UI를 먼저 반영한 뒤 `axios.put` 완료 후 무조건 `fetchChapterPhotos(chapterId)` 를 호출하고 있다. API 응답 지연 시 낙관적 상태 → 서버 응답 덮어쓰기 사이에 화면 깜빡임이 발생한다.

```ts
// 현재 코드 (문제 있음)
await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, { ... })
  .catch(err => console.error('블록 간 이동 실패:', err))

fetchChapterPhotos(chapterId)  // ← 성공/실패 무관하게 항상 호출
```

### 수정 방법

`targetBlockId === 'new'` 분기와 기존 블록 이동 분기 **모두**에서 아래 패턴으로 변경한다.

- **성공 시**: `fetchChapterPhotos` 호출하지 않음 (낙관적 업데이트 유지)
- **실패 시**: 낙관적 업데이트를 롤백하고 `fetchChapterPhotos` 로 서버 상태 복구

```ts
// 수정 후 패턴 (새 블록 이동 분기)
try {
  await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, {
    item_id: itemId,
    target_block_id: newBlockId,
  })
  // 성공: 낙관적 업데이트 유지, 재조회 없음
} catch (err) {
  console.error('새 블록 이동 실패:', err)
  fetchChapterPhotos(chapterId)  // 실패 시에만 서버 상태로 롤백
}
```

```ts
// 수정 후 패턴 (기존 블록 이동 분기)
try {
  await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, {
    item_id: itemId,
    target_block_id: targetBlockId,
  })
  // 성공: 낙관적 업데이트 유지, 재조회 없음
} catch (err) {
  console.error('블록 간 이동 실패:', err)
  fetchChapterPhotos(chapterId)  // 실패 시에만 서버 상태로 롤백
}
```

### `useCallback` deps 정리

`chapterPhotos`는 함수형 업데이트(`setChapterPhotos(prev => ...)`) 만으로 처리되므로 deps에서 제거한다.

```ts
// 변경 전
}, [chapterPhotos, fetchChapterPhotos])

// 변경 후
}, [fetchChapterPhotos])
```

### 검증 시나리오
1. PHOTO 블록 A에서 사진을 드래그해 블록 B로 이동 → 깜빡임 없이 즉시 반영되는지 확인
2. 네트워크 탭에서 API를 강제 실패(오프라인)시킨 후 이동 → 원래 블록으로 롤백되는지 확인
3. 새 블록으로 이동 후 원본 블록이 비었을 때 TEXT 블록이 독립 처리되는지 확인

---

## FIX-2 🔴 `handleInnerDragEnd` — 낙관적 업데이트 `insertIdx` 오류

### 문제
`order_num`이 `0`인 블록이 있을 때 `insertIdx = 0` 이 되어 해당 블록 아이템들이 전체 목록 맨 앞에 삽입된다. TEXT 블록 등 다른 아이템의 순서가 뒤집힐 수 있다.

```ts
// 현재 코드 (문제 있음)
const blockOrderNum = reorderedItems[0].order_num ?? 0
const insertIdx = nonBlockItems.filter(i => i.order_num < blockOrderNum).length
// → blockOrderNum이 0이면 insertIdx = 0, 모든 아이템 앞에 삽입
```

### 수정 방법

`blockOrderNum` 비교 기준을 `<` 에서 `<=` 로 바꾸면 더 악화되므로, **대신 블록 경계를 `block_id` 기준으로 찾는 방식**으로 변경한다.

```ts
// 수정 후
setChapterPhotos(prev => {
  const items = prev[chapterId] || []
  const intendedOrderSet = new Set(intendedOrder)

  // block_id 기준으로 해당 블록의 첫 번째 아이템 인덱스를 찾아 삽입 위치 결정
  const firstBlockItemIdx = items.findIndex(i => intendedOrderSet.has(i.id))

  const nonBlockItems = items.filter(i => !intendedOrderSet.has(i.id))
  const reorderedItems = intendedOrder
    .flatMap(id => {
      const item = items.find(i => i.id === id)
      return item ? [item] : []
    })
    .map((item, idx) => ({ ...item, order_in_block: idx }))

  if (reorderedItems.length === 0) return prev

  // 원래 위치(index) 기반으로 삽입 — order_num 값이 아닌 배열 위치 기준
  const insertIdx = nonBlockItems.filter((_, i) => {
    const originalIdx = items.findIndex(item => item.id === nonBlockItems[i].id)
    return originalIdx < firstBlockItemIdx
  }).length

  const result = [...nonBlockItems]
  result.splice(insertIdx, 0, ...reorderedItems)
  return { ...prev, [chapterId]: result }
})
```

### 검증 시나리오
1. PHOTO 블록 내 사진 3장을 드래그로 순서 변경 → 낙관적 업데이트 결과가 서버 저장 결과와 일치하는지 확인
2. TEXT 블록이 PHOTO 블록 앞에 있는 경우, 블록 내 사진 순서 변경 후 TEXT 블록 위치가 그대로인지 확인
3. `order_num = 0`인 블록(첫 번째 블록)에서 사진 순서 변경 테스트

---

## FIX-3 🟡 `onDragOver` — 반복 `setChapterPhotos` 호출 최적화

### 문제
`onDragOver`는 드래그 중 매 프레임마다 호출된다. 현재는 `currentDragBlockIdRef`로 중복 방지를 하고 있으나, `setChapterPhotos`를 직접 호출해 React 렌더 배치 불일치가 발생할 수 있다.

```ts
// 현재 코드 — onDragOver 내부
setChapterPhotos((prev) => {
  ...
  newItems[activeIndex] = { ...activeItem, block_id: newBlockId! }
  return { ...prev, [chapterId]: newItems }
})
```

### 수정 방법

`onDragOver`에서는 `currentDragBlockIdRef`만 업데이트하고, **실제 state 변경은 `onDragEnd`에서 한 번만** 수행하도록 분리한다.

```ts
// onDragOver 수정 후 — state 변경 제거, ref만 업데이트
onDragOver={(e) => {
  const { active, over } = e
  if (!over || active.id === over.id) return
  if (!draggingItemIdRef.current) return

  const overId = String(over.id)
  let newBlockId: string | null = null

  if (overId.startsWith('drop-')) {
    newBlockId = overId.replace('drop-', '')
  } else {
    const overItem = Object.values(chapterPhotos).flat().find(i => i.id === overId)
    if (!overItem || overItem.item_type === 'TEXT') return
    newBlockId = overItem.block_id
  }

  if (!newBlockId || newBlockId === currentDragBlockIdRef.current) return
  currentDragBlockIdRef.current = newBlockId  // ref만 업데이트
}}
```

```ts
// onDragEnd 수정 후 — currentDragBlockIdRef를 읽어 크로스 블록 여부 판단
onDragEnd={async (e) => {
  const { active, over } = e
  const itemId = draggingItemIdRef.current
  const sourceBlockId = draggingItemBlockIdRef.current
  const finalBlockId = currentDragBlockIdRef.current  // onDragOver가 마지막으로 설정한 블록

  // 상태 초기화
  setActiveBlockId(null)
  setActiveBlockItems([])
  setDraggingItemId(null)
  setDraggingItemBlockId(null)
  draggingItemIdRef.current = null
  draggingItemBlockIdRef.current = null
  currentDragBlockIdRef.current = null

  if (!itemId) {
    if (over) handleBlockDragEnd(e, targetChapterId, blocks)
    return
  }
  if (!over) {
    fetchChapterPhotos(targetChapterId)
    return
  }

  // 크로스 블록 이동 감지: finalBlockId가 sourceBlockId와 다르면 블록 간 이동
  if (finalBlockId && sourceBlockId && finalBlockId !== sourceBlockId) {
    handleCrossBlockDragEnd(targetChapterId, itemId, sourceBlockId, finalBlockId)
    return
  }

  // 같은 블록 내 이동: 기존 bulk-sync 로직 유지
  // ... (기존 setChapterPhotos + bulk-sync 코드)
}}
```

### 검증 시나리오
1. 블록 A → 블록 B로 사진 드래그 시 드롭 존 하이라이트가 정상 표시되는지 확인
2. 드래그 중 블록 B → 블록 C로 방향 전환 후 드롭 시 C에 올바르게 이동되는지 확인
3. 같은 블록 내에서 순서 변경 시 정상 동작하는지 확인

---

## FIX-4 🟡 `groupIntoBlocks` — TEXT 블록 `blockId` 구조 명확화

### 문제
TEXT 블록은 `blockId = item.id`로 등록되어 `blockId`와 `item.id`가 동일하다. 현재는 우연히 동작하지만, `handleBlockDragEnd`의 `findBlockIndex`가 두 경로(blockId 직접 비교 / items 탐색)로 나뉘어 있어 혼란을 준다.

### 수정 방법

`groupIntoBlocks` 에서 TEXT 블록도 명시적으로 `block_id`를 사용하도록 하거나, `findBlockIndex` 로직을 단일 경로로 통합한다.

**옵션 A: `findBlockIndex` 단일 경로로 통합 (권장, 변경 최소화)**

```ts
// handleBlockDragEnd 내부 findBlockIndex 수정
const findBlockIndex = (dndId: string) => {
  return blocks.findIndex(b => {
    // 블록 자체 id 또는 블록 내 아이템 id — 두 경우 모두 포함
    return b.blockId === dndId || b.items.some(item => item.id === dndId)
  })
}
```

> 이미 두 번째 조건(`b.items.some`)이 존재하나, 순서상 `blockId` 직접 비교가 먼저이므로 TEXT 블록에서 `item.id === blockId`인 경우 첫 번째 조건으로 매칭된다. 현재 코드와 동일하지만 의도를 주석으로 명확히 할 것.

**옵션 B: TEXT 블록에도 고유 blockId 부여 (더 근본적 해결)**

```ts
// groupIntoBlocks 수정
if (item.item_type === 'TEXT' && !isSideBySide) {
  // item.block_id가 있으면 사용, 없으면 item.id 폴백
  const textBlockId = item.block_id || item.id
  blocks.push({ type: 'TEXT', blockId: textBlockId, items: [item], order_num: item.order_num })
}
```

> 서버에서 TEXT 아이템에 `block_id`를 별도로 부여하는 경우에만 적용 가능. `chapters.py`에서 TEXT 아이템의 `block_id` 할당 여부를 먼저 확인할 것.

### 검증 시나리오
1. TEXT 블록을 드래그해 다른 블록 위아래로 이동 → 순서가 올바르게 반영되는지 확인
2. TEXT 블록이 첫 번째와 마지막 위치에 있을 때 이동 테스트

---

## FIX-5 🟢 `blocksPerChapter` useMemo — 이중 정렬 제거

### 문제
`useMemo`에서 items를 `order_num → order_in_block`으로 정렬 후 `groupIntoBlocks`에 전달하는데, `groupIntoBlocks` 내부에서도 PHOTO 블록 items를 `sort(order_in_block)`으로 재정렬한다. 불필요한 연산이다.

### 수정 방법

`groupIntoBlocks` 내부의 중복 `sort` 제거.

```ts
// groupIntoBlocks 내부 — PHOTO 블록 아이템 추가 시 sort 제거
} else {
  if (blockMap.has(bid)) {
    blockMap.get(bid)!.items.push(item)
    // 아래 sort 제거 — 호출 전 이미 정렬된 상태로 전달됨
    // blockMap.get(bid)!.items.sort((a, b) => a.order_in_block - b.order_in_block)
  } else {
    ...
  }
}
```

> 단, `groupIntoBlocks`가 정렬되지 않은 데이터로도 호출될 수 있는 곳이 있다면 `sort`를 유지하고 대신 `useMemo`의 사전 정렬을 제거할 것. `groupIntoBlocks`의 호출 위치 전수 확인 필요.

### 검증 시나리오
- 변경 전후 블록 내 사진 표시 순서가 동일한지 확인

---

## FIX-6 🟢 `groupIntoBlocks` SIDE 블록 — `order_num` 안정성 개선

### 문제
SIDE 블록은 첫 번째로 추가된 아이템의 `order_num`만 블록 순서로 사용한다. `side-left`와 `side-right` 아이템의 `order_num`이 서로 다를 경우, 뒤에 추가되는 아이템은 블록 순서에 영향을 주지 않는다.

### 수정 방법

SIDE 블록 생성 시 두 아이템 중 **작은 `order_num`** 을 사용한다.

```ts
// groupIntoBlocks 내 SIDE 분기 수정
} else if (isSideBySide) {
  if (blockMap.has(bid)) {
    const existingBlock = blockMap.get(bid)!
    existingBlock.items.push(item)
    // order_num은 두 아이템 중 작은 값으로 갱신
    existingBlock.order_num = Math.min(existingBlock.order_num, item.order_num)
  } else {
    const block: ChapterBlock = { type: 'SIDE', blockId: bid, items: [item], order_num: item.order_num }
    blockMap.set(bid, block)
    blocks.push(block)
  }
}
```

### 검증 시나리오
1. side-by-side 블록을 드래그로 다른 블록과 순서 변경 → 위치가 올바르게 반영되는지 확인

---

## 수정 순서 권장

```
FIX-1 → FIX-2 → FIX-4 → FIX-3 → FIX-5 → FIX-6
```

FIX-1, FIX-2가 사용자에게 가장 직접적으로 보이는 버그이므로 먼저 처리한다.
FIX-3은 FIX-1 이후 onDragEnd 구조가 변경된 상태에서 작업해야 충돌이 없다.

---

## 변경하면 안 되는 것

- `ChapterBlock` 타입 구조 (`type`, `blockId`, `items`, `order_num`)
- `bulk-sync` API 페이로드 구조 (`{ items: { id, block_id, order_num, order_in_block }[] }`)
- `move-to-block` API 페이로드 구조 (`{ item_id, target_block_id }`)
- `SortablePhotoBlock`, `SortableTextBlock`, `SortableSideBySideBlock` 컴포넌트 Props 인터페이스
- `fetchSeqRef` 경쟁 조건 방지 로직
