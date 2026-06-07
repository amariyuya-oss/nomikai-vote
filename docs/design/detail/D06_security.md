# D06 セキュリティ設計書

作成日: 2026-06-07

---

## 1. URLトークン生成方式

### 要件
- 推測困難であること
- サーバーサイドで生成すること（クライアントサイドでの予測を防ぐ）

### 方式
UUID v4 を使用する。

| 項目 | 詳細 |
|------|------|
| 形式 | UUID v4（xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx） |
| ランダム性 | 122ビット（約5.3×10^36通り） |
| 生成場所 | create-room Edge Function（Deno 環境） |
| 生成方法 | `crypto.randomUUID()`（Deno 標準 Web Crypto API） |

### 衝突確率
ルーム数が100万件の時点での衝突確率: 約 2.4×10^-25（実用上無視できる）

### トークンの種類
| トークン | 用途 | 格納カラム |
|---------|------|----------|
| participant_token | 参加者向けURL | rooms.participant_token |
| admin_token | 幹事向けURL（結果閲覧専用） | rooms.admin_token |

2つのトークンは独立した UUID として生成する。participant_token から admin_token を推測できない。

---

## 2. デバイス識別方式

### 要件
- 1デバイス1票を強制する（F03・F04 共通）
- 個人情報をサーバーに送信しない（N01・N04）

### 方式
localStorage を使用する。

| 項目 | 詳細 |
|------|------|
| ストレージ種別 | localStorage（ブラウザ・オリジン・デバイス単位） |
| キー | `voted_{roomId}` |
| 値 | `'true'` |
| 保存タイミング | 2つの投票 INSERT がともに成功した後 |
| サーバー送信 | 行わない |

### 既知の制約（要件定義 F03 に準拠し許容する）
| ケース | 挙動 |
|--------|------|
| 同一人物が別デバイスから投票 | 防止できない（仕様として許容） |
| localStorage をクリアした場合 | 再投票可能になる（仕様として許容） |
| プライベートブラウズ（シークレットモード） | 通常ブラウズと localStorage を共有しないため別デバイス扱いになる（許容） |

---

## 3. RLS（Row Level Security）

詳細な DDL は D03 参照。セキュリティ上の方針は以下の通り。

### rooms テーブル

- anon による SELECT を許可（セキュリティはトークンの推測困難性で担保）
- anon による INSERT は禁止。create-room Edge Function が service_role キーで INSERT する
- UPDATE / DELETE は全ロールで禁止

**設計上の注意**: rooms テーブルへの anon SELECT を `USING (true)` で許可しているため、理論上は全ルームが読み取れる。ただし以下の理由で実用上の問題はない。
1. フロントエンドは participant_token または admin_token を WHERE 条件に指定するため、知らないルームには到達できない
2. UUID v4 のランダム性により、有効なトークンを総当たりで発見することは現実的に不可能

より厳密にする場合（Phase2以降の検討事項）: カスタム JWT claim を使ったRLSや、tokens テーブルと暗号化ハッシュによる比較なども選択肢となる。

### votes テーブル

- 期限切れルームへの INSERT を DB レベルで拒否（D03 の RLS policy 参照）
- クライアント側のチェック（expires_at 確認）だけでなく、DB レベルでも多重防御する

---

## 4. 通信セキュリティ

| 項目 | 内容 |
|------|------|
| プロトコル | HTTPS（TLS 1.2以上）。Vercel・Supabase ともに自動対応 |
| HTTP → HTTPS リダイレクト | Vercel が自動処理 |
| HSTS | Vercel のデフォルト設定に委ねる |

---

## 5. Edge Function のセキュリティ

| 項目 | 内容 |
|------|------|
| 認証 | `Authorization: Bearer {SUPABASE_ANON_KEY}` を検証（Supabase が自動処理） |
| CORS | Vercel のデプロイドメイン（本番・プレビュー）のみ許可 |
| サーバー内のキー | service_role キーは Edge Function の環境変数に設定し、クライアントには公開しない |
| 入力バリデーション | 関数内でサーバーサイドバリデーションを実施（D02 参照） |

CORS 設定例（Edge Function 内）:
```ts
const allowedOrigins = [
  'https://nomikai-vote.vercel.app',
  // プレビューデプロイは *.vercel.app のため、開発中は緩める
]
```

---

## 6. 環境変数管理

| 変数名 | 公開範囲 | 用途 |
|--------|---------|------|
| `VITE_SUPABASE_URL` | フロントエンド（公開） | Supabase プロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | フロントエンド（公開） | Supabase 匿名キー（RLS で制御） |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function のみ（非公開） | 管理者権限キー（クライアントには渡さない） |

- ローカル開発: `.env.local`（`.gitignore` に追加済み）
- 本番: Vercel の Environment Variables に登録
- `SUPABASE_SERVICE_ROLE_KEY` は Vercel の Environment Variables でも公開設定にしない

---

## 7. 個人情報・プライバシー

調査報告書の方針に基づく。

| 項目 | 方針 |
|------|------|
| 収集する個人情報 | なし（氏名・メールアドレス・電話番号等は一切収集しない） |
| デバイス識別情報 | localStorage にのみ保存。サーバーに送信しない |
| 投票データの個人紐付け | 不可能な設計（votes テーブルにデバイス識別カラムなし） |
| データ保持期間 | ルーム expires_at から30日後に自動削除 |
