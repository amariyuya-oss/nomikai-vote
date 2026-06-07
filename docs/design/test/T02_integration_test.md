# T02 結合テスト仕様書

作成日: 2026-06-07

---

## 1. 対象・方針

- Supabase（テスト用プロジェクトまたはローカル `supabase start`）への実接続が必要
- React Router v7 loader 関数と Supabase JS Client の連携を検証する
- 事前条件: テスト用 Supabase プロジェクトに対してマイグレーション適用済み

---

## 2. テストケース一覧

### ルーム作成（create-room Edge Function）

| # | 操作 | 期待する結果 |
|---|------|------------|
| I01 | 正常なリクエストをPOST | 201 / `participant_token`・`admin_token`・`expires_at` が返る |
| I02 | name が空 | 400 VALIDATION_ERROR |
| I03 | name が51文字 | 400 VALIDATION_ERROR |
| I04 | event_at が不正形式 | 400 VALIDATION_ERROR |
| I05 | POST 以外のメソッド | 405 |

---

### ルーム取得（rooms テーブル SELECT）

| # | 操作 | 期待する結果 |
|---|------|------------|
| I06 | 有効な participantToken で取得 | ルームデータが返る |
| I07 | 存在しない participantToken で取得 | data=null（loader が404を throw） |
| I08 | 有効な adminToken で取得 | ルームデータが返る |

---

### 投票 INSERT

| # | 操作 | 期待する結果 |
|---|------|------------|
| I09 | 有効なルームに votes_return_time INSERT | 成功・error=null |
| I10 | 有効なルームに votes_afterparty INSERT | 成功・error=null |
| I11 | expires_at が過去のルームに INSERT | RLS 違反・error.code=42501 |
| I12 | 不正な choice 値で INSERT | CHECK 制約違反 |

---

### 投票集計 SELECT

| # | 操作 | 期待する結果 |
|---|------|------------|
| I13 | votes_return_time を room_id で SELECT | 投票レコード一覧が返る |
| I14 | votes_afterparty を room_id で SELECT | 投票レコード一覧が返る |
| I15 | 投票なしのルーム | 空配列が返る |

---

## 3. 実行環境セットアップ

```sh
supabase start           # ローカル Supabase 起動
supabase db reset        # マイグレーション適用
# .env.local を supabase start の出力値に更新
npm run test:run
```
