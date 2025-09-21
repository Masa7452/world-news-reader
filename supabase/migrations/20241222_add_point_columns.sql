-- articlesテーブルに個別のポイントカラムと要約テキストを追加
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS summary_text TEXT,  -- カード表示用の要約文
  ADD COLUMN IF NOT EXISTS point1 TEXT,         -- 要点1（50文字以内）
  ADD COLUMN IF NOT EXISTS point2 TEXT,         -- 要点2（50文字以内）
  ADD COLUMN IF NOT EXISTS point3 TEXT;         -- 要点3（50文字以内）

-- 既存のsummary配列データをpoint1/2/3に移行
UPDATE articles 
SET 
  point1 = CASE WHEN array_length(summary, 1) >= 1 THEN summary[1] ELSE NULL END,
  point2 = CASE WHEN array_length(summary, 1) >= 2 THEN summary[2] ELSE NULL END,
  point3 = CASE WHEN array_length(summary, 1) >= 3 THEN summary[3] ELSE NULL END,
  summary_text = COALESCE(
    substring(body_mdx from 1 for 200),
    title
  )
WHERE point1 IS NULL;

-- topicsテーブルのgenre制約を更新（politicsを含む10カテゴリー）
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_genre_check;
ALTER TABLE topics ADD CONSTRAINT topics_genre_check 
CHECK (genre IN (
  'technology',
  'business',
  'science',
  'health',
  'sports',
  'entertainment',
  'culture',
  'lifestyle',
  'politics',
  'other'
));

-- articlesテーブルのcategory制約も更新
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_check;
ALTER TABLE articles ADD CONSTRAINT articles_category_check 
CHECK (category IN (
  'technology',
  'business',
  'science',
  'health',
  'sports',
  'entertainment',
  'culture',
  'lifestyle',
  'politics',
  'other'
));