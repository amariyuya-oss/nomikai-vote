# D03 データベース物理設計書

作成日: 2026-06-07

---

## 1. テーブル定義

### rooms

| カラム名 | 型 | NULL | デフォルト | 制約 | 説明 |
|---------|-----|------|-----------|------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK | 内部ID（URLには使用しない） |
| name | TEXT | NOT NULL | - | - | 飲み会名 |
| event_at | TIMESTAMPTZ | NOT NULL | - | - | 開催日時 |
| location | TEXT | NULL | NULL | - | 開催場所 |
| nearest_station | TEXT | NULL | NULL | - | 最寄駅（Phase2用） |
| participant_token | UUID | NOT NULL | - | UNIQUE | 参加者URL用トークン |
| admin_token | UUID | NOT NULL | - | UNIQUE | 幹事URL用トークン |
| expires_at | TIMESTAMPTZ | NOT NULL | - | - | 有効期限（event_at + 24時間） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | - | 作成日時 |

```sql
CREATE TABLE rooms (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  event_at          TIMESTAMPTZ NOT NULL,
  location          TEXT,
  nearest_station   TEXT,
  participant_token UUID        NOT NULL UNIQUE,
  admin_token       UUID        NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### votes_return_time

| カラム名 | 型 | NULL | デフォルト | 制約 | 説明 |
|---------|-----|------|-----------|------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK | 主キー |
| room_id | UUID | NOT NULL | - | FK → rooms.id | 対象ルーム |
| choice | TEXT | NOT NULL | - | CHECK | 帰宅希望時間 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | - | 投票日時 |

choice の許容値: `'21:00'`, `'21:30'`, `'22:00'`, `'22:30'`, `'23:00'`, `'終電まで'`, `'未定'`

```sql
CREATE TABLE votes_return_time (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  choice     TEXT        NOT NULL CHECK (
               choice IN ('21:00', '21:30', '22:00', '22:30', '23:00', '終電まで', '未定')
             ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### votes_afterparty

| カラム名 | 型 | NULL | デフォルト | 制約 | 説明 |
|---------|-----|------|-----------|------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK | 主キー |
| room_id | UUID | NOT NULL | - | FK → rooms.id | 対象ルーム |
| choice | TEXT | NOT NULL | - | CHECK | 二次会参加意向 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | - | 投票日時 |

choice の許容値: `'行く'`, `'行かない'`, `'未定'`

```sql
CREATE TABLE votes_afterparty (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  choice     TEXT        NOT NULL CHECK (choice IN ('行く', '行かない', '未定')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. インデックス設計

| テーブル | カラム | インデックス名 | 種別 | 用途 |
|---------|--------|--------------|------|------|
| rooms | participant_token | （UNIQUE制約で自動作成） | UNIQUE | 参加者URLアクセス時のルーム取得 |
| rooms | admin_token | （UNIQUE制約で自動作成） | UNIQUE | 幹事URLアクセス時のルーム取得 |
| rooms | expires_at | idx_rooms_expires_at | BTREE | 自動削除バッチでの期限切れルーム検索 |
| votes_return_time | room_id | idx_votes_return_time_room_id | BTREE | 集計クエリ・FK参照 |
| votes_afterparty | room_id | idx_votes_afterparty_room_id | BTREE | 集計クエリ・FK参照 |

```sql
CREATE INDEX idx_rooms_expires_at
  ON rooms(expires_at);

CREATE INDEX idx_votes_return_time_room_id
  ON votes_return_time(room_id);

CREATE INDEX idx_votes_afterparty_room_id
  ON votes_afterparty(room_id);
```

---

## 3. RLS（Row Level Security）設定

### 有効化

```sql
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes_return_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes_afterparty  ENABLE ROW LEVEL SECURITY;
```

### rooms ポリシー

```sql
-- 匿名ユーザーの読み取りを許可
-- セキュリティはトークン（UUID v4）の推測困難性で担保する
CREATE POLICY "anon can read rooms"
  ON rooms FOR SELECT TO anon
  USING (true);

-- anon からの INSERT は拒否（create-room Edge Function が service_role で行う）
-- UPDATE / DELETE は全ロールで拒否（ポリシー未作成 = デフォルト拒否）
```

### votes_return_time ポリシー

```sql
-- 読み取りを許可（投票結果は参加者全員に公開）
CREATE POLICY "anon can read votes_return_time"
  ON votes_return_time FOR SELECT TO anon
  USING (true);

-- 有効なルームへの投票のみ許可（期限切れルームへの投票をDB側でも防止）
CREATE POLICY "anon can insert votes_return_time"
  ON votes_return_time FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
        AND rooms.expires_at > NOW()
    )
  );
```

### votes_afterparty ポリシー

```sql
-- 読み取りを許可
CREATE POLICY "anon can read votes_afterparty"
  ON votes_afterparty FOR SELECT TO anon
  USING (true);

-- 有効なルームへの投票のみ許可
CREATE POLICY "anon can insert votes_afterparty"
  ON votes_afterparty FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_id
        AND rooms.expires_at > NOW()
    )
  );
```

---

## 4. データ削除（自動）

調査報告書の保持方針に基づき、expires_at から30日後に自動削除する。

```sql
-- delete-expired-rooms Edge Function が毎日 02:00 UTC に実行
DELETE FROM rooms
WHERE expires_at < NOW() - INTERVAL '30 days';
```

rooms を削除すると、ON DELETE CASCADE により votes_return_time・votes_afterparty の関連レコードも自動削除される。

---

## 5. マイグレーション管理

Supabase CLI の `supabase/migrations/` ディレクトリで管理する。

| ファイル名（例） | 内容 |
|---------------|------|
| `20260607000000_create_rooms.sql` | rooms テーブル作成・RLS設定 |
| `20260607000001_create_votes.sql` | votes テーブル作成・RLS設定 |
| `20260607000002_create_indexes.sql` | インデックス作成 |
