# D01 詳細画面設計書

作成日: 2026-06-07

---

## 1. 共通仕様

### ローディング表示

| 場面 | 手段 | UI挙動 |
|------|------|-------|
| ルート遷移中（loader 実行中） | `useNavigation().state === 'loading'` | 画面全体またはコンテンツ領域にスピナー表示 |
| コンポーネント内の非同期処理（投票送信等） | useState で管理 | 実行中のボタンを無効化・スピナー表示 |

### エラー表示位置
- フォームバリデーション: 各入力フィールドの直下に赤文字で表示
- API/通信エラー: 画面上部にトーストまたはインラインバナーで表示

### ブラウザ対応
| ブラウザ | バージョン | 備考 |
|---------|-----------|------|
| iOS Safari | 16以上 | input[type=datetime-local] の表示差異に注意 |
| Android Chrome | 110以上 | - |
| デスクトップ Chrome | 110以上 | レイアウト崩壊のみ防止 |

### フォントサイズ
最小 16px。iOS Safari の自動ズームを防ぐため、input 要素も font-size: 16px 以上とする。

### タップターゲット
最小 44×44px（Apple Human Interface Guidelines 準拠）。

---

## 2. P01 ルーム作成画面（`/`）

### 項目定義

| フィールドID | ラベル | 入力タイプ | 必須 | 初期値 |
|------------|--------|-----------|------|--------|
| name | 飲み会名 | text | ✅ | 空 |
| event_at | 開催日時 | datetime-local | ✅ | 空 |
| location | 開催場所 | text | - | 空 |
| nearest_station | 最寄駅 | text | - | 空 |

### バリデーション

| フィールド | ルール | エラーメッセージ |
|----------|--------|----------------|
| name | 1〜50文字 | 「飲み会名を入力してください」／「50文字以内で入力してください」 |
| event_at | 必須・現在時刻より未来 | 「開催日時を入力してください」／「開催日時は現在以降を指定してください」 |
| location | 0〜100文字 | 「100文字以内で入力してください」 |
| nearest_station | 0〜50文字 | 「50文字以内で入力してください」 |

バリデーションタイミング: submit 時。個別フィールドは onBlur 後に検証。

### 状態定義

| 状態 | UI挙動 |
|------|-------|
| 初期 | フォーム表示 |
| 送信中 | ボタン無効化・スピナー表示 |
| 送信失敗 | エラーバナー表示・ボタン再有効化 |
| 送信成功 | sessionStorageにトークン保存 → `/complete` にリダイレクト |

### sessionStorage 保存内容（送信成功時）
```json
{
  "participantToken": "UUID",
  "adminToken": "UUID",
  "expiresAt": "ISO8601",
  "roomName": "飲み会名",
  "eventAt": "ISO8601"
}
```
キー名: `createdRoom`

- `participantToken`・`adminToken`・`expiresAt` は Edge Function レスポンスから取得する
- `roomName`・`eventAt` は P01 フォームの入力値から補完する（Edge Function レスポンスには含まれない）

---

## 3. P02 ルーム作成完了画面（`/complete`）

### 表示内容

sessionStorage の `createdRoom` から値を取得して表示する。

| 要素 | 内容 |
|------|------|
| 飲み会名 | createdRoom.roomName |
| 開催日時 | createdRoom.eventAt（`YYYY/MM/DD HH:mm` 形式） |
| 有効期限 | createdRoom.expiresAt（`YYYY/MM/DD HH:mm まで` 形式） |
| 参加者向けURL | `{origin}/room/{createdRoom.participantToken}` |
| 幹事向けURL | `{origin}/admin/{createdRoom.adminToken}` |

### アクション

| ボタン | 動作 |
|--------|------|
| コピー（参加者URL） | Clipboard API でコピー → ボタンラベルを「コピーしました！」に2秒変更 |
| LINEでシェア | `https://social-plugins.line.me/lineit/share?url={encodeURIComponent(participantURL)}` を新しいタブで開く |
| コピー（幹事URL） | Clipboard API でコピー → ボタンラベルを「コピーしました！」に2秒変更 |

### エラーハンドリング

| ケース | 挙動 |
|--------|------|
| sessionStorage に `createdRoom` が存在しない | `/` にリダイレクト |

---

## 4. P03 参加者投票画面（`/room/:participantToken`）

### 初期表示フロー

```
1. [loader] participantToken でルーム情報取得
2. ルームが見つからない → errorElement でエラー表示「このURLは無効です」
3. expires_at < 現在時刻 → P07 表示（コンポーネント側で判定）
4. localStorage に voted_{roomId} === 'true' → P05 にリダイレクト
5. 投票フォーム表示
```

### 表示内容

| 要素 | 内容 |
|------|------|
| 飲み会名 | rooms.name |
| 開催日時 | rooms.event_at（`YYYY/MM/DD HH:mm` 形式） |
| 開催場所 | rooms.location（設定されている場合のみ表示） |

### 項目定義

#### F03 帰宅希望時間（ラジオボタン）

| 選択肢 | 値 |
|--------|-----|
| 21:00 | `21:00` |
| 21:30 | `21:30` |
| 22:00 | `22:00` |
| 22:30 | `22:30` |
| 23:00 | `23:00` |
| 終電まで | `終電まで` |
| 未定 | `未定` |

#### F04 二次会（ラジオボタン）

| 選択肢 | 値 |
|--------|-----|
| 行く | `行く` |
| 行かない | `行かない` |
| 未定 | `未定` |

### バリデーション

| フィールド | ルール | エラーメッセージ |
|----------|--------|----------------|
| 帰宅希望時間 | 選択必須 | 「帰りたい時間を選んでください」 |
| 二次会 | 選択必須 | 「二次会の参加意向を選んでください」 |

### 投票送信フロー

```
1. バリデーション
2. votes_return_time に INSERT
3. votes_afterparty に INSERT
4. 両方成功 → localStorage.setItem(`voted_${roomId}`, 'true')
5. `/room/${participantToken}/done` にリダイレクト
6. どちらか失敗 → エラー表示・再試行可能
```

2と3の一方が失敗した場合、成功した方の取り消しは行わない（再投票は localStorage チェックで防止済みのため、孤立レコードとして残る。MVP では許容する）。

---

## 5. P04 投票完了画面（`/room/:participantToken/done`）

### 表示内容

| 要素 | 内容 |
|------|------|
| 完了メッセージ | 「投票しました！」 |
| サブメッセージ | 「みんなの回答がリアルタイムで集まっています」 |
| 広告枠 | 320×50 バナー（B07参照） |
| 結果を見るボタン | `/room/${participantToken}/results` に遷移 |

### 初期表示フロー

```
1. [loader] participantToken でルーム情報取得（roomId を得るため）
2. ルームが見つからない → errorElement でエラー表示「このURLは無効です」
3. expires_at < 現在時刻 → P07 表示（コンポーネント側で判定）
4. localStorage に voted_{roomId} が存在しない → P03 にリダイレクト
5. 投票完了画面を表示
```

P04 の URL（`/room/:participantToken/done`）に roomId は含まれないため、localStorage チェックに必要な roomId は participantToken によるルーム情報取得（手順1）で得る。直接アクセス時も同様のフローを経る。

---

## 6. P05 結果表示画面（`/room/:participantToken/results`）

### 初期表示フロー

```
1. [loader] participantToken でルーム情報・初期投票集計を取得
2. ルームが見つからない → errorElement でエラー表示「このURLは無効です」
3. expires_at < 現在時刻 → P07 表示（コンポーネント側で判定）
4. loader データを使って集計を表示
5. [useEffect] Realtime チャンネルを購読
```

### loader 戻り値型

```ts
type LoaderData = {
  room: Room
  initialReturnTimeVotes: { choice: VoteReturnTimeChoice }[]
  initialAfterpartyVotes:  { choice: VoteAfterpartyChoice }[]
}
```

コンポーネントは `useLoaderData() as LoaderData` で取得する。`room` はそのまま参照し、`initialReturnTimeVotes`・`initialAfterpartyVotes` は `useState` の初期値として使用する。

### 集計表示

#### 帰宅希望時間
各選択肢の票数と割合をプログレスバーで表示。選択肢は F03 の定義順に固定表示（票数0でも表示する）。

#### 二次会
「行く」「行かない」「未定」の票数と割合をプログレスバーで表示。

#### 総投票数
`votes_return_time` の件数を表示（帰宅・二次会いずれか一方のテーブルで集計）。

### リアルタイム更新

loader で取得した初期集計データを `useState` で管理し、Realtime イベント受信時に Supabase へ直接再クエリして state を更新する（D02 参照）。

| state | 初期値 | 更新タイミング |
|-------|--------|--------------|
| `returnTimeVotes` | `initialReturnTimeVotes`（loader データ） | `votes_return_time` INSERT イベント受信時 |
| `afterpartyVotes` | `initialAfterpartyVotes`（loader データ） | `votes_afterparty` INSERT イベント受信時 |

更新中は画面右下などに「🔄 更新中」インジケーターを表示する。接続が切断された場合は「リアルタイム更新が停止しています」のバナーを表示し、手動更新ボタンを提供する。手動更新ボタン押下時は `votes_return_time` と `votes_afterparty` を再クエリして state を更新する（Realtime イベント受信時と同じ処理）。

### 広告枠
集計結果の下部に 320×50 バナー（B07参照）。

---

## 7. P06 幹事管理画面（`/admin/:adminToken`）

### 初期表示フロー

```
1. [loader] adminToken でルーム情報・初期投票集計を取得（admin_token カラムで検索）
2. ルームが見つからない → errorElement でエラー表示「このURLは無効です」
3. expires_at < 現在時刻 → P07 表示（コンポーネント側で判定）
4. loader データを使って集計を表示（P05 と同一コンポーネント）
5. [useEffect] Realtime チャンネルを購読
```

### loader 戻り値型

P05 と同一の `LoaderData` 型を使用する（D01 P05 参照）。

P05 と同一の集計表示・Realtime 更新仕様。広告枠なし。

---

## 8. P07 期限切れ表示

独立した画面ではなく、P03・P05・P06 内で `expires_at < 現在時刻` の条件を満たした際にインライン表示する（ルーティングの変更は行わない）。

### 表示内容

| 要素 | 内容 |
|------|------|
| メッセージ | 「このルームは終了しました」 |
| サブメッセージ | 「投票受付期間が終了しています」 |
| 新しいルームを作るボタン | `/` に遷移 |
