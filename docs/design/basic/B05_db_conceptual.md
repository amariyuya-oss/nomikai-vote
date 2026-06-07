# B05 データベース概念設計書

作成日: 2026-06-07

---

## 1. エンティティ一覧

| エンティティ | 説明 |
|------------|------|
| Room（ルーム） | 飲み会1件に対応。幹事が作成する |
| VoteReturnTime（帰宅希望投票） | 参加者1デバイスが行う帰宅希望時間の投票 |
| VoteAfterparty（二次会投票） | 参加者1デバイスが行う二次会参加意向の投票 |

---

## 2. ER図

```
┌─────────────────────────────┐
│           Room              │
├─────────────────────────────┤
│ id (PK)                     │
│ name                        │
│ event_at                    │
│ location                    │
│ nearest_station             │
│ participant_token (UNIQUE)  │
│ admin_token (UNIQUE)        │
│ expires_at                  │
│ created_at                  │
└────────────┬────────────────┘
             │ 1
             │
      ┌──────┴──────┐
      │ n           │ n
      ▼             ▼
┌───────────────┐  ┌─────────────────┐
│VoteReturnTime │  │ VoteAfterparty  │
├───────────────┤  ├─────────────────┤
│ id (PK)       │  │ id (PK)         │
│ room_id (FK)  │  │ room_id (FK)    │
│ choice        │  │ choice          │
│ created_at    │  │ created_at      │
└───────────────┘  └─────────────────┘
```

---

## 3. エンティティ定義

### Room

| 属性 | 型 | 説明 |
|------|-----|------|
| id | UUID | 主キー（内部ID・URLには使用しない） |
| name | TEXT | 飲み会名 |
| event_at | TIMESTAMPTZ | 開催日時 |
| location | TEXT | 開催場所（任意） |
| nearest_station | TEXT | 最寄駅（任意・Phase2用） |
| participant_token | UUID | 参加者向けURL用トークン |
| admin_token | UUID | 幹事向けURL用トークン |
| expires_at | TIMESTAMPTZ | 有効期限（event_atの24時間後） |
| created_at | TIMESTAMPTZ | 作成日時 |

### VoteReturnTime（帰宅希望投票）

| 属性 | 型 | 説明 |
|------|-----|------|
| id | UUID | 主キー |
| room_id | UUID | 対象ルームのID（FK） |
| choice | TEXT | 選択肢（21:00 / 21:30 / 22:00 / 22:30 / 23:00 / 終電まで / 未定） |
| created_at | TIMESTAMPTZ | 投票日時 |

### VoteAfterparty（二次会投票）

| 属性 | 型 | 説明 |
|------|-----|------|
| id | UUID | 主キー |
| room_id | UUID | 対象ルームのID（FK） |
| choice | TEXT | 選択肢（行く / 行かない / 未定） |
| created_at | TIMESTAMPTZ | 投票日時 |

---

## 4. 設計上の方針

- **個人情報の非保存**: デバイス識別情報（localStorage）はサーバーに送信・保存しない。二重投票防止はクライアントサイドのみで行う
- **匿名性の保証**: VoteReturnTime・VoteAfterpartyはデバイス識別情報を持たないため、誰が何に投票したかをDB上から特定できない
- **データ削除**: ルームの expires_at から30日後にルームおよび関連する投票データを自動削除する（Supabase pg_cronまたは定期Edge Functionで実装）
