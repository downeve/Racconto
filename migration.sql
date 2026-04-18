-- ================================================================
-- Migration: chapter_photos → chapter_items
-- 목적: 텍스트 블록 지원을 위한 스키마 확장
-- 실행 환경: PostgreSQL (Docker racconto_db)
-- 실행 순서: 반드시 순서대로 실행할 것
-- ================================================================

-- STEP 1. 새 테이블 생성
-- chapter_photos 와 동일한 구조에 item_type, text_content 추가
-- photo_id 는 TEXT 타입 아이템을 위해 nullable 로 변경
CREATE TABLE chapter_items (
    id           VARCHAR PRIMARY KEY,
    chapter_id   VARCHAR NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    order_num    INTEGER NOT NULL DEFAULT 0,
    item_type    VARCHAR NOT NULL DEFAULT 'PHOTO',   -- 'PHOTO' | 'TEXT'
    photo_id     VARCHAR REFERENCES photos(id) ON DELETE CASCADE,   -- nullable
    text_content TEXT                                                -- nullable
);

-- STEP 2. 기존 데이터 이전
-- chapter_photos 의 모든 레코드를 chapter_items 로 복사
-- item_type 은 'PHOTO' 고정, text_content 는 NULL
INSERT INTO chapter_items (id, chapter_id, order_num, item_type, photo_id, text_content)
SELECT id, chapter_id, order_num, 'PHOTO', photo_id, NULL
FROM chapter_photos;

-- STEP 3. 데이터 이전 확인 (행 수가 같아야 함)
-- 아래 두 쿼리의 결과가 동일한지 확인 후 STEP 4 진행
SELECT COUNT(*) AS old_count FROM chapter_photos;
SELECT COUNT(*) AS new_count FROM chapter_items;

-- STEP 4. 인덱스 생성 (조회 성능 최적화)
CREATE INDEX idx_chapter_items_chapter_id ON chapter_items(chapter_id);
CREATE INDEX idx_chapter_items_photo_id   ON chapter_items(photo_id) WHERE photo_id IS NOT NULL;

-- STEP 5. 기존 테이블 제거
-- !! STEP 3 에서 행 수가 일치하는 것을 확인한 후에만 실행 !!
DROP TABLE chapter_photos;

-- ================================================================
-- 롤백 스크립트 (문제 발생 시)
-- STEP 5 실행 전이라면 아래로 되돌릴 수 있음
-- ================================================================
-- DROP TABLE IF EXISTS chapter_items;
-- (chapter_photos 는 그대로 남아 있음)
