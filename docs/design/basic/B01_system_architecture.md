# B01 システム構成設計書

作成日: 2026-06-07

---

## 1. 技術スタック

| レイヤー | 技術 | バージョン方針 |
|---------|------|--------------|
| フロントエンド | Vite + React + TypeScript | 最新安定版 |
| ルーティング・初期データ取得 | React Router v7 | 最新安定版 |
| スタイリング | Tailwind CSS | 最新安定版 |
| BaaS（DB / Realtime / API） | Supabase | 最新安定版 |
| ホスティング（フロント） | Vercel | - |
| ホスティング（DB） | Supabase（無料枠） | - |
| meta タグ管理 | react-helmet-async | 最新安定版 |

---

## 2. アーキテクチャ概要

```
[ユーザー（スマホブラウザ）]
        │
        │ HTTPS
        ▼
[Vercel] ─── Vite + React + TypeScript（SPA）
        │
        │ Supabase JS Client
        ▼
[Supabase]
  ├── PostgreSQL（データ永続化）
  ├── Realtime（投票結果のリアルタイム配信）
  └── Row Level Security（アクセス制御）
```

カスタムバックエンドサーバーは持たない。すべてのデータ操作はSupabase JS Clientを経由する。ビジネスロジックのうちサーバーサイドで実行が必要なもの（ルームトークン生成等）はSupabase Edge Functionsで実装する。

---

## 3. インフラ構成

| 項目 | 内容 |
|------|------|
| フロントエンドホスティング | Vercel（無料プラン） |
| DB・APIホスティング | Supabase（無料プラン） |
| CDN | Vercel Edge Network（自動） |
| SSL/TLS | Vercel・Supabase ともに自動発行 |
| ドメイン | 初期はVercel提供サブドメインを使用 |

---

## 4. ブラウザ対応範囲

| ブラウザ | 対応バージョン |
|---------|--------------|
| iOS Safari | 16以上 |
| Android Chrome | 110以上 |
| デスクトップ Chrome | 110以上（補助的対応） |

ターゲットは**スマートフォンブラウザ**。デスクトップは機能保証の対象外とするが、レイアウト崩壊は防ぐ。

---

## 5. デプロイフロー

```
ローカル開発
    │
    │ git push
    ▼
GitHub リポジトリ
    │
    │ Vercel 自動デプロイ（main ブランチ）
    ▼
本番環境（Vercel）
```

---

## 6. 環境変数

| 変数名 | 用途 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 公開APIキー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理者キー（Edge Function のみ使用。フロントエンドには公開しない） |

`.env.local` で管理し、Vercelのプロジェクト設定にも登録する。
