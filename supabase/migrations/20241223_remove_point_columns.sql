-- point1/2/3カラムを削除（summary配列を使用するため）
ALTER TABLE articles 
  DROP COLUMN IF EXISTS point1,
  DROP COLUMN IF EXISTS point2,
  DROP COLUMN IF EXISTS point3;

-- summary_textは残す（カード表示用の要約文として有用）