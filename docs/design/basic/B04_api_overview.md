# B04 API一覧設計書

作成日: 2026-06-07

---

## 1. 方針

本サービスはカスタムバックエンドサーバーを持たない。Supabaseが自動生成するREST APIおよびEdge Functionsを使用する。フロントエンドからはSupabase JS Clientを経由してアクセスする。

---

## 2. Supabase自動生成REST API

Supabaseは各テーブルに対して以下のエンドポイントを自動生成する。RLSポリシーによってアクセス制御を行う（詳細はD02参照）。

| テーブル | 操作 | 用途 |
|---------|------|------|
| `rooms` | SELECT | ルーム情報取得（トークンによる参照） |
| `rooms` | INSERT | ルーム作成 |
| `votes_return_time` | SELECT | 帰宅投票結果取得 |
| `votes_return_time` | INSERT | 帰宅希望時間投票 |
| `votes_afterparty` | SELECT | 二次会投票結果取得 |
| `votes_afterparty` | INSERT | 二次会参加投票 |

---

## 3. Supabase Edge Functions

自動生成APIでは対応できないロジックをEdge Functionsで実装する。

| 関数名 | メソッド | 用途 |
|--------|---------|------|
| `create-room` | POST | ルーム作成・トークン生成 |

### `create-room` 概要

ルーム情報を受け取り、推測困難なUUIDトークンを2種類（参加者用・幹事用）生成してDBに保存する。トークン生成をサーバーサイドで行うことでクライアント側での予測を防ぐ。

リクエスト:
```json
{
  "name": "営業部歓迎会",
  "event_at": "2026-06-10T19:00:00+09:00",
  "location": "渋谷 〇〇居酒屋",
  "nearest_station": "渋谷駅"
}
```

レスポンス:
```json
{
  "participant_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "admin_token": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "expires_at": "2026-06-11T19:00:00+09:00"
}
```

---

## 4. Supabase Realtime

投票結果のリアルタイム反映にはSupabase Realtimeを使用する。

| テーブル | イベント | 用途 |
|---------|---------|------|
| `votes_return_time` | INSERT | 帰宅希望投票の即時反映 |
| `votes_afterparty` | INSERT | 二次会投票の即時反映 |

フロントエンドはチャンネルを購読し、新しいINSERTイベントを受信するたびに集計を再取得して表示を更新する。
