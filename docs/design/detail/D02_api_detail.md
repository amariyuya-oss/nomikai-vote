# D02 API詳細設計書

作成日: 2026-06-07

---

## 1. 方針

- カスタムバックエンドサーバーは持たない
- フロントエンドは Supabase JS Client（`@supabase/supabase-js`）を経由してアクセスする
- トークン生成が必要なルーム作成は Edge Function 経由とし、anon キーからの直接 INSERT は行わない
- RLS により anon キーでアクセスできるデータを最小化する

---

## 1.5 Supabase JS Client のエラーハンドリング方針

Supabase JS Client v2 は例外を throw しない。すべての操作が `{ data, error }` を返す。実装者はこの特性を前提としてエラー処理を記述する。

| 場面 | 対応 |
|------|------|
| loader 内でのデータ取得失敗 | `error` または `!data` の場合に `throw new Response(...)` し `errorElement` に委ねる |
| コンポーネント内の INSERT 失敗（投票送信等） | `error` がある場合に state でエラーフラグを立て D05 のメッセージを表示する |

```ts
// loader 内の例（ルーム取得）
const { data, error } = await supabase
  .from('rooms')
  .select('id, name, event_at, location, expires_at')
  .eq('participant_token', params.participantToken)
  .single()
if (error || !data) throw new Response('Not Found', { status: 404 })
```

```ts
// コンポーネント内の例（投票 INSERT）
const { error } = await supabase
  .from('votes_return_time').insert({ room_id, choice })
if (error) {
  setSubmitError('投票に失敗しました。もう一度お試しください')
  return
}
```

---

## 2. Supabase REST API（自動生成）

### 2-1. rooms テーブル

#### SELECT by participant_token

| 項目 | 内容 |
|------|------|
| 用途 | P03・P05 でのルーム情報取得 |
| Supabase JS | `supabase.from('rooms').select('id, name, event_at, location, expires_at').eq('participant_token', token).single()` |

レスポンス（200 OK）:
```json
{
  "id": "uuid",
  "name": "営業部歓迎会",
  "event_at": "2026-06-10T19:00:00+09:00",
  "location": "渋谷 〇〇居酒屋",
  "expires_at": "2026-06-11T19:00:00+09:00"
}
```

エラー:
| ケース | エラー | 対処 |
|--------|--------|------|
| トークンに一致するルームなし | `PGRST116`（0行） | 「URLが無効です」表示 |
| DB接続エラー | `PGRST*` | 「通信エラー」表示 |

#### SELECT by admin_token

| 項目 | 内容 |
|------|------|
| 用途 | P06 でのルーム情報取得 |
| Supabase JS | `supabase.from('rooms').select('id, name, event_at, location, expires_at').eq('admin_token', token).single()` |

レスポンス・エラー仕様は participant_token 版と同一。

---

### 2-2. votes_return_time テーブル

#### SELECT（集計用）

| 項目 | 内容 |
|------|------|
| 用途 | P05・P06 での帰宅希望時間集計 |
| Supabase JS | `supabase.from('votes_return_time').select('choice').eq('room_id', roomId)` |

レスポンス（200 OK）:
```json
[
  { "choice": "22:00" },
  { "choice": "22:00" },
  { "choice": "23:00" }
]
```

集計はクライアントサイドで実施する。

#### INSERT（投票）

| 項目 | 内容 |
|------|------|
| 用途 | P03 での帰宅希望時間投票 |
| Supabase JS | `supabase.from('votes_return_time').insert({ room_id: roomId, choice })` |

リクエストボディ:
```json
{
  "room_id": "uuid",
  "choice": "22:00"
}
```

エラー:
| ケース | エラーコード | 対処 |
|--------|------------|------|
| 期限切れルームへの投票（RLSで拒否） | `42501` | 「このルームの投票受付は終了しました」表示 |
| choice が不正値 | `23514`（CHECK違反） | クライアントバリデーションで事前防止済み |
| DB接続エラー | `PGRST*` | 「投票に失敗しました」表示 |

---

### 2-3. votes_afterparty テーブル

votes_return_time と同一仕様。

#### SELECT

```js
supabase.from('votes_afterparty').select('choice').eq('room_id', roomId)
```

#### INSERT

```js
supabase.from('votes_afterparty').insert({ room_id: roomId, choice })
```

choice: `'行く'` / `'行かない'` / `'未定'`

---

## 3. Edge Function: `create-room`

### 概要

| 項目 | 内容 |
|------|------|
| URL | `{SUPABASE_URL}/functions/v1/create-room` |
| メソッド | POST |
| 認証 | `Authorization: Bearer {SUPABASE_ANON_KEY}` |
| Content-Type | application/json |

### リクエスト

```json
{
  "name": "営業部歓迎会",
  "event_at": "2026-06-10T19:00:00+09:00",
  "location": "渋谷 〇〇居酒屋",
  "nearest_station": "渋谷駅"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ✅ | 飲み会名（1〜50文字） |
| event_at | string（ISO8601） | ✅ | 開催日時 |
| location | string | - | 開催場所（0〜100文字） |
| nearest_station | string | - | 最寄駅（0〜50文字・Phase2用） |

### Edge Function 内処理フロー

```
1. リクエストボディのバリデーション
   - name が空・51文字以上 → 400 エラー
   - event_at が不正な日時形式 → 400 エラー
2. participant_token = crypto.randomUUID()
3. admin_token = crypto.randomUUID()
4. expires_at = new Date(event_at).getTime() + 24 * 60 * 60 * 1000
5. service_role キーで rooms テーブルに INSERT
6. 成功 → 201 レスポンス
7. DB エラー → 500 エラー
```

### レスポンス（201 Created）

```json
{
  "participant_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "admin_token": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "expires_at": "2026-06-11T19:00:00+09:00"
}
```

### エラーレスポンス

| HTTPステータス | code | message | 原因 |
|-------------|------|---------|------|
| 400 | `VALIDATION_ERROR` | 「入力値が不正です」 | 必須項目欠損・バリデーション違反 |
| 405 | `METHOD_NOT_ALLOWED` | - | POST 以外のメソッド |
| 500 | `DB_ERROR` | 「サーバーエラーが発生しました」 | Supabase INSERT 失敗 |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です"
  }
}
```

---

## 4. Edge Function: `delete-expired-rooms`（Cron）

### 概要

| 項目 | 内容 |
|------|------|
| 実行スケジュール | 毎日 02:00 UTC（pg_cron で定期実行） |
| 目的 | expires_at から30日経過したルームを自動削除 |

### 処理

```sql
DELETE FROM rooms
WHERE expires_at < NOW() - INTERVAL '30 days';
```

ON DELETE CASCADE により votes_return_time・votes_afterparty も連鎖削除される。

---

## 5. Supabase Realtime

### チャンネル設計

画面（P05・P06）はルームごとに1つのチャンネルを購読する。

Realtime イベント受信時は、loader で取得した初期データを `useState` にコピーし、イベント発生時に Supabase へ直接再クエリして state を更新する（`router.invalidate()` は使用しない）。

```ts
// useEffect 内
const channel = supabase
  .channel(`room-${roomId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'votes_return_time', filter: `room_id=eq.${roomId}` },
    async () => {
      const { data } = await supabase
        .from('votes_return_time').select('choice').eq('room_id', roomId)
      if (data) setReturnTimeVotes(data)
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'votes_afterparty', filter: `room_id=eq.${roomId}` },
    async () => {
      const { data } = await supabase
        .from('votes_afterparty').select('choice').eq('room_id', roomId)
      if (data) setAfterpartyVotes(data)
    }
  )
  .subscribe()
```

`router.invalidate()` を使わない理由: ルーム情報ごと再取得するためローディング状態が発生し、投票のたびにUIがちらつく（選定根拠は技術スタック選定の議論を参照）。

### チャンネルライフサイクル

| タイミング | 処理 |
|----------|------|
| P05・P06 マウント時 | チャンネル購読開始 |
| P05・P06 アンマウント時 | `channel.unsubscribe()` でクリーンアップ |
| 接続切断時 | 状態が `CHANNEL_ERROR` になる → UI にバナー表示 |

### Realtime テーブル設定（Supabase Dashboard 操作）

Supabase Realtime を機能させるには、Supabase Dashboard で対象テーブルの Realtime を有効化する必要がある。有効化しないと INSERT イベントが配信されない。

設定場所: Supabase Dashboard → Database → Replication → 対象テーブルを選択して有効化

| テーブル | 有効化 |
|---------|--------|
| votes_return_time | 必須 |
| votes_afterparty | 必須 |
| rooms | 不要 |

### Realtime RLS

Supabase Realtime は RLS を参照する。votes テーブルで anon の SELECT ポリシーが有効であれば Realtime イベントも受信できる（D03 参照）。

### N02 達成根拠（3秒以内の反映）

「投票 INSERT → Realtime イベント配信 → フロントエンドで全件再取得 → 表示更新」の合計レイテンシ内訳：

| ステップ | 想定レイテンシ |
|---------|--------------|
| Supabase INSERT 応答 | 〜50ms |
| Realtime イベント配信 | 〜100ms |
| 全件再取得（SELECT） | 〜100ms |
| React 再レンダリング | 〜16ms |
| **合計** | **〜270ms** |

通常のネットワーク環境下では合計レイテンシは N02 の 3秒以内を大幅に下回る。Supabase 無料プランの Realtime 同時接続上限（200接続）を超えた場合は遅延する可能性があるが、MVP の想定利用規模では問題ない。

---

## 6. RLS ポリシー一覧

詳細な DDL は D03 参照。概要は以下の通り。

| テーブル | 操作 | ロール | ポリシー |
|---------|------|--------|---------|
| rooms | SELECT | anon | すべての行を読み取り可能（トークンの推測困難性でセキュリティを確保） |
| rooms | INSERT | anon | 拒否（Edge Function の service_role のみ） |
| rooms | UPDATE / DELETE | anon | 拒否 |
| votes_return_time | SELECT | anon | すべての行を読み取り可能 |
| votes_return_time | INSERT | anon | 対象 room の expires_at が未来であること |
| votes_afterparty | SELECT | anon | すべての行を読み取り可能 |
| votes_afterparty | INSERT | anon | 対象 room の expires_at が未来であること |
