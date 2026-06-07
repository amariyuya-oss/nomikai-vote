# D07 OGP・SEO設計書

作成日: 2026-06-07

---

## 1. 方針

- LINEシェア時に適切なプレビューが表示されるよう OGP を設定する
- P03（参加者投票画面）はシェアされる主な画面のため、OGP の完成度を優先する
- SPA（React Router）のため、静的な meta タグは `index.html` に定義し、動的な値は React Helmet 等で画面ごとに上書きする

---

## 2. ページタイトル定義

| 画面 | `<title>` |
|------|-----------|
| P01 ルーム作成 | `飲み会タイマー - 匿名で気軽に帰宅希望を伝えよう` |
| P02 作成完了 | `ルーム作成完了 \| 飲み会タイマー` |
| P03 投票 | `{飲み会名} \| 飲み会タイマー` |
| P04 投票完了 | `投票完了 \| 飲み会タイマー` |
| P05 結果 | `{飲み会名} - 投票結果 \| 飲み会タイマー` |
| P06 幹事管理 | `{飲み会名} - 幹事管理 \| 飲み会タイマー` |
| P07 期限切れ | `このルームは終了しました \| 飲み会タイマー` |

---

## 3. meta description 定義

| 画面 | `<meta name="description">` |
|------|----------------------------|
| P01 | 「飲み会で帰宅希望時間・二次会参加を匿名で投票。幹事が全体の意向を把握できるWebサービスです。」 |
| P02 | 「ルームを作成しました。参加者にURLをシェアしましょう。」 |
| P03 | 「{飲み会名}の匿名投票に参加しましょう。帰宅希望時間と二次会参加を選んで投票できます。」 |
| P04 | 「投票が完了しました。結果はリアルタイムで更新されます。」 |
| P05 | 「{飲み会名}の投票結果です。帰宅希望時間・二次会参加意向をリアルタイムで確認できます。」 |
| P06 | P05 と同一 |
| P07 | 「この飲み会ルームの投票受付は終了しました。新しいルームを作成できます。」 |

---

## 4. OGP タグ定義

### 共通設定（index.html に記載）

```html
<meta property="og:site_name" content="飲み会タイマー" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="ja_JP" />
<meta property="og:image" content="{origin}/ogp-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### 画面別 OGP（React でレンダリング時に上書き）

| 画面 | og:title | og:description | og:url |
|------|---------|----------------|--------|
| P01 | 「飲み会タイマー - 匿名投票で帰宅希望を伝えよう」 | 「幹事・参加者が使える飲み会向け匿名投票サービス」 | `{origin}/` |
| P03 | 「{飲み会名}に参加しよう」 | 「匿名で帰宅希望時間・二次会参加を投票できます」 | `{origin}/room/{participantToken}` |
| P05 | 「{飲み会名} - 投票結果」 | 「投票結果をリアルタイムで確認できます」 | `{origin}/room/{participantToken}/results` |
| その他 | `{title}` の内容をそのまま使用 | meta description と同一 | 各ページのURL |

### OGP 画像

| 用途 | ファイル名 | サイズ | 内容 |
|------|-----------|-------|------|
| デフォルト（P01等） | `ogp-default.png` | 1200×630px | サービス名・キャッチコピーを配置した静的画像 |

動的な OGP 画像（飲み会名入り）は Phase2 以降の検討事項とする。MVP では静的画像を全画面で共通使用する。

---

## 5. Twitter Card / LINE プレビュー設定

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{og:title と同一}" />
<meta name="twitter:description" content="{og:description と同一}" />
<meta name="twitter:image" content="{og:image と同一}" />
```

LINE は OGP タグを読み取るため、追加設定は不要。

---

## 6. SEO 設計

### ターゲットキーワード

| キーワード | 検索意図 | 対応画面 |
|----------|---------|---------|
| 飲み会 投票 | 飲み会の意思決定を投票でしたい | P01 |
| 飲み会 二次会 アンケート | 二次会参加者数を事前に知りたい | P01 |
| 帰宅 匿名投票 | 帰りたい時間を匿名で伝えたい | P01 |
| 飲み会 幹事 ツール | 幹事の負担を減らしたい | P01 |

### 構造化データ（将来対応）

MVP では実装しない。Phase2 以降に WebApplication 型の JSON-LD を検討する。

### その他の SEO 対策

| 項目 | 対応 |
|------|------|
| robots.txt | 参加者URL・幹事URLはクロール除外（トークンURLをインデックスしない） |
| sitemap.xml | P01（トップページ）のみ登録 |
| canonical タグ | P01 に設定。その他は動的URLのためキャノニカル不要 |

robots.txt 例:
```
User-agent: *
Disallow: /room/
Disallow: /admin/
Disallow: /complete
Allow: /
```

---

## 7. 実装ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| `react-helmet-async` | 画面ごとの `<title>` および meta タグの動的更新 |

`index.html` にデフォルト値を記載し、各画面コンポーネントで `<Helmet>` を使って上書きする。
