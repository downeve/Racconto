# 작업 지시서
## Racconto — CF Images 해상도 3200px 전환 + 화면별 variant 최적화

---

## 배경 및 목적

현재 모든 업로드 이미지가 장변 2400px Jpeg로 리사이즈되어 CF Images에 저장되며,
`/public` variant 하나만 사용 중이다.

이를 장변 3200px로 상향하고, 화면별로 적정 해상도의 variant를 서빙하여
고해상도 디스플레이(5K 등) 대응과 썸네일 로딩 성능을 동시에 개선한다.

---

## 현재 구조 파악

### 업로드 경로

| 경로 | 처리 주체 | 리사이즈 방식 |
|------|---------|------------|
| 웹 업로드 (`POST /photos/upload`) | Linode 백엔드 PIL | 장변 2400px → JPEG quality 88 → CF 업로드 |
| Electron 업로드 (`main.js > uploadFile()`) | Electron 메인 프로세스 (`nativeImage`) | 장변 2400px → JPEG quality 88 → CF Direct Upload |
| 회전 (`POST /photos/{id}/rotate`) | Linode 백엔드 PIL | CF에서 다운로드 → 회전 → 재업로드 **(리사이즈 없음 — 버그)** |

### Electron 업로드 흐름 (`main.js`)

```
1. FastAPI GET /photos/cf-upload-url → 일회성 CF Direct Upload URL 발급
2. nativeImage.createFromPath() → img.resize() → img.toJPEG(88)
3. FormData로 CF에 직접 POST (서버 경유 없음)
4. FastAPI POST /photos/ 로 메타데이터(imageUrl, EXIF 등) 저장
```

Electron은 `nativeImage`(Electron 내장)로 리사이즈하며, 백엔드 PIL과 독립적으로 동작한다.
두 경로의 `MAX_SIZE` 값이 각각 별도로 관리되므로 **반드시 동시에 변경**해야 한다.

### DB 저장 URL 형식

```
https://imagedelivery.net/{account_hash}/{image_id}/public
```

Named variants 방식. 현재 `public` variant 하나만 사용.

---

## 작업 범위

### 1. CF Images 대시보드 — Variant 추가

CF 대시보드 → Images → Variants에서 아래 variant를 추가한다.
`public` variant는 해상도만 변경한다.

| Variant 이름 | 장변(px) | fit | 용도 |
|-------------|---------|-----|------|
| `public` | **3200** (기존 2400 → 변경) | scale-down | 라이트박스 전체화면, 기본값 |
| `grid` | 800 | scale-down | 그리드 썸네일, 포트폴리오 행 이미지 |
| `thumb` | 400 | scale-down | 커버 이미지, 카드 썸네일, 블록 미리보기 |

> `scale-down`: 원본보다 크게 업스케일하지 않음. 기존 2400px 사진에
> `public`(3200px)을 요청해도 2400px 그대로 서빙됨 — 안전.

---

### 2. Electron 수정 (`electron/main.js`)

#### 2-1. 리사이즈 상한 변경

`uploadFile()` 함수 내 `MAX_SIZE` 값을 변경한다.

```js
// 변경 전
const MAX_SIZE = 2400

// 변경 후
const MAX_SIZE = 3200
```

#### 2-2. 참고: TIFF 처리

현재 `IMAGE_EXTENSIONS`에 `.tif`, `.tiff`가 포함되어 있으나,
`nativeImage`의 TIFF 지원 여부는 플랫폼에 따라 다를 수 있다.
이번 작업 범위는 TIFF 대응이 아니므로 기존 동작 그대로 유지한다.

---

### 3. 백엔드 수정 (`backend/app/routers/photos.py`)

#### 3-1. 웹 업로드 리사이즈 상한 변경

`upload_to_cloudflare()` 함수 내 값을 변경한다.

```python
# 변경 전
max_size = 2400

# 변경 후
max_size = 3200
```

#### 3-2. 회전 재업로드 리사이즈 추가 (버그 수정)

`rotate_and_upload_to_cloudflare()`는 현재 리사이즈 로직이 없어,
원본이 3200px를 초과하는 경우 그대로 CF에 재업로드된다.
회전 후에도 장변 3200px 상한을 적용한다.

```python
def rotate_and_upload_to_cloudflare(image_bytes: bytes, filename: str, direction: str) -> str:
    img = PilImage.open(io.BytesIO(image_bytes))
    if direction == "left":
        img = img.rotate(90, expand=True)
    elif direction == "right":
        img = img.rotate(-90, expand=True)
    else:
        raise ValueError(f"Invalid direction: {direction}")

    # ← 추가: 회전 후 장변 3200px 상한 적용
    max_size = 3200
    w, h = img.size
    if max(w, h) > max_size:
        if w >= h:
            new_w, new_h = max_size, int(h * max_size / w)
        else:
            new_w, new_h = int(w * max_size / h), max_size
        img = img.resize((new_w, new_h), PilImage.LANCZOS)

    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=88, optimize=True)
    buf.seek(0)
    # ... 이하 기존 코드 동일
```

#### 3-3. 저장 포맷 유지

현재 JPEG quality 88로 저장 중. WebP 전환은 이번 작업 범위 외.
CF Images가 서빙 시 Accept 헤더 기반으로 WebP 자동 변환하므로 별도 처리 불필요.

---

### 4. 프론트엔드 — cfUrl 유틸 함수 추가

**파일:** `src/utils/cfImage.ts` (신규)

DB에 저장된 `image_url`(`/public` suffix)을 그대로 유지하고,
표시 시점에 variant만 교체하는 유틸 함수를 추가한다.

```ts
export type CfVariant = 'public' | 'grid' | 'thumb'

/**
 * CF Images URL의 variant를 교체하여 반환.
 * CF URL이 아닌 경우(로컬 업로드 등) 원본 URL 그대로 반환.
 *
 * @param imageUrl  DB에 저장된 원본 image_url (/public suffix)
 * @param variant   서빙할 variant (기본값: 'public')
 */
export const cfUrl = (
  imageUrl: string | null | undefined,
  variant: CfVariant = 'public'
): string => {
  if (!imageUrl) return ''
  if (!imageUrl.includes('imagedelivery.net')) return imageUrl
  // URL 끝의 variant 이름(마지막 path segment)만 교체
  return imageUrl.replace(/\/[^/]+$/, `/${variant}`)
}
```

**주의:** DB의 `image_url` 값은 절대 변경하지 않는다.
항상 `/public` suffix로 저장된 원본을 유지하고, 표시할 때만 `cfUrl()`로 변환한다.

---

### 5. 프론트엔드 — 화면별 variant 적용

`cfUrl(photo.image_url, 'grid')` 형태로 적용한다.
variant 미지정 시 기본값 `'public'`(3200px)이 사용된다.

#### 적용 대상 및 variant

| 파일 | 위치 | 변경 후 |
|------|------|---------|
| `PhotoCard.tsx` | 그리드 썸네일 `<img>` | `cfUrl(photo.image_url, 'grid')` |
| `ProjectCard.tsx` | 커버 이미지 `<img>` | `cfUrl(project.cover_image_url, 'thumb')` |
| `ProjectDetailComponents.tsx` | 라이트박스 전체화면 `<img>` | `cfUrl(photo.image_url, 'public')` (명시적 표기) |
| `PortfolioChapterItems.tsx` | `renderRow` 내 `<img>` | `cfUrl(item.image_url, 'grid')` |
| `PortfolioChapterItems.tsx` | wide / single 블록 `<img>` | `cfUrl(item.image_url, 'public')` |
| `PublicPortfolio.tsx` | 프로젝트 카드 커버 | `cfUrl(project.cover_image_url, 'thumb')` |
| `StoryBlocks.tsx` | 블록 내 사진 `<img>` | `cfUrl(item.image_url, 'grid')` |
| `ElectronSidebar.tsx` | 프로젝트 목록 커버 | `cfUrl(project.cover_image_url, 'thumb')` |

#### variant 선택 기준

- **`thumb` (400px):** 카드 커버, 사이드바 썸네일처럼 표시 크기가 작은 곳
- **`grid` (800px):** 그리드 뷰 사진, 포트폴리오 행 이미지처럼 중간 크기
- **`public` (3200px):** 라이트박스 전체화면, 포트폴리오 wide/single 블록처럼 최대 크기로 표시되는 곳

---

### 6. 기존 업로드 사진 처리 방침

기존 사진들은 2400px로 저장되어 있다. CF의 `scale-down` fit 설정으로 인해:
- `grid`(800px), `thumb`(400px) 요청 → 정상 리사이즈 서빙
- `public`(3200px) 요청 → 원본 2400px 그대로 서빙 (업스케일 없음)

별도 재업로드나 마이그레이션 없이 자연스럽게 공존. 신규 업로드분부터 3200px 적용.

---

## 작업 순서

| 순서 | 작업 | 대상 |
|------|------|------|
| 1 | CF 대시보드에서 `grid`, `thumb` variant 추가, `public` 3200px 변경 | CF 대시보드 |
| 2 | `electron/main.js` — `MAX_SIZE = 3200` 변경 | Electron |
| 3 | `photos.py` — `max_size = 3200` 변경 + 회전 함수 리사이즈 추가 | 백엔드 |
| 4 | `src/utils/cfImage.ts` 신규 생성 | 프론트엔드 |
| 5 | 각 컴포넌트에 `cfUrl()` 적용 | 프론트엔드 (5절 표 기준) |
| 6 | 로컬에서 variant별 URL 확인 | 브라우저 네트워크 탭 |
| 7 | 서버 배포 | `git pull` → `systemctl restart racconto` |

---

## 검증 체크리스트

- [ ] CF 대시보드에서 `grid`, `thumb` variant가 생성되었는가
- [ ] `public` variant의 장변이 3200px로 변경되었는가
- [ ] 신규 웹 업로드 사진의 CF 원본이 3200px(장변)인가
- [ ] 신규 Electron 업로드 사진의 CF 원본이 3200px(장변)인가
- [ ] 회전된 사진이 3200px 상한을 넘지 않는가
- [ ] `cfUrl(url, 'grid')`가 `/public` → `/grid`로 올바르게 교체하는가
- [ ] `cfUrl(null)`이 빈 문자열을 반환하는가 (null 안전성)
- [ ] CF URL이 아닌 로컬 URL에서 `cfUrl()`이 원본을 그대로 반환하는가
- [ ] 그리드 뷰에서 `grid` variant(800px)로 요청되는가 (네트워크 탭 확인)
- [ ] 라이트박스에서 `public` variant(3200px)로 요청되는가
- [ ] 커버 이미지에서 `thumb` variant(400px)로 요청되는가
- [ ] 기존 2400px 사진이 라이트박스에서 정상 표시되는가 (업스케일 없이)
- [ ] 포트폴리오 wide 블록에서 `public` variant가 사용되는가
