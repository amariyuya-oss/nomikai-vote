# I01 コーディング規約

作成日: 2026-06-07

---

## 1. ディレクトリ構成

```
src/
  pages/                    # ページコンポーネント（loader・action を含む）
    CreateRoomPage.tsx       # P01 ルーム作成
    CreateCompletePage.tsx   # P02 作成完了
    VotePage.tsx             # P03 投票
    VoteDonePage.tsx         # P04 投票完了
    ResultsPage.tsx          # P05 結果表示
    AdminPage.tsx            # P06 幹事管理
  components/               # 複数ページで共通利用するコンポーネント
    ui/                     # 汎用UIパーツ
      Button.tsx
      Input.tsx
      RadioGroup.tsx
      ProgressBar.tsx
    AdBanner.tsx             # 広告枠（B07）
    VoteResults.tsx          # 投票集計表示（P05・P06 共通）
    RoomExpired.tsx          # P07 期限切れ表示
    RouteError.tsx           # errorElement 用エラー表示
  lib/
    supabase.ts              # Supabase クライアント初期化
  types/
    index.ts                 # 型定義（DB テーブル型・共通型）
  router.tsx                 # createBrowserRouter 定義
  main.tsx                   # エントリーポイント
  index.css                  # Tailwind CSS の @tailwind ディレクティブ
```

### 配置ルール

- 1ページにしか使わないコンポーネントは対応する pages ファイル内に直接定義する
- 2ページ以上で使うものは `components/` に切り出す
- Supabase への問い合わせは `pages/` 内の loader 関数または非同期ハンドラに集約し、コンポーネントに直接書かない

---

## 2. 命名規則

### ファイル名

| 種別 | 規則 | 例 |
|------|------|----|
| ページコンポーネント | PascalCase + `Page.tsx` | `VotePage.tsx` |
| 共通コンポーネント | PascalCase + `.tsx` | `VoteResults.tsx` |
| ユーティリティ・lib | camelCase + `.ts` | `supabase.ts` |
| 型定義 | `index.ts` | `types/index.ts` |

### コンポーネント・関数・変数

| 種別 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `VoteResults` |
| loader 関数 | camelCase + `Loader` | `votePageLoader` |
| イベントハンドラ | camelCase + `handle` プレフィックス | `handleSubmit` |
| 通常の関数・変数 | camelCase | `participantToken`, `fetchVotes` |
| 型・インターフェース | PascalCase | `Room`, `VoteChoice` |
| 定数 | UPPER_SNAKE_CASE | `VOTE_CHOICES` |

### CSS クラス

Tailwind CSS のユーティリティクラスのみ使用する。カスタムクラス名は原則作成しない。

---

## 3. React Router v7 利用方針

### 利用モード

**ライブラリモード**（SPA）を使用する。`createBrowserRouter` でルートを定義する。

```tsx
// router.tsx
import { createBrowserRouter } from 'react-router-dom'

export const router = createBrowserRouter([
  { path: '/', element: <CreateRoomPage /> },
  { path: '/complete', element: <CreateCompletePage /> },
  {
    path: '/room/:participantToken',
    element: <VotePage />,
    loader: votePageLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/room/:participantToken/done',
    element: <VoteDonePage />,
    loader: voteDoneLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/room/:participantToken/results',
    element: <ResultsPage />,
    loader: resultsPageLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/admin/:adminToken',
    element: <AdminPage />,
    loader: adminPageLoader,
    errorElement: <RouteError />,
  },
])
```

```tsx
// main.tsx
import { RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </React.StrictMode>
)
```

### loader の書き方

- loader はページファイル内に `export function loader` として定義し、`router.tsx` でインポートする
- ルーム情報が見つからない場合は `throw new Response('Not Found', { status: 404 })` でエラーを投げ、`errorElement` に委ねる
- loader の戻り値は `useLoaderData()` で取得する

```tsx
// pages/VotePage.tsx（例）
import { useLoaderData, LoaderFunctionArgs } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Room } from '../types'

export async function loader({ params }: LoaderFunctionArgs): Promise<Room> {
  const { data } = await supabase
    .from('rooms')
    .select('id, name, event_at, location, expires_at')
    .eq('participant_token', params.participantToken)
    .single()
  if (!data) throw new Response('Not Found', { status: 404 })
  return data
}

export default function VotePage() {
  const room = useLoaderData() as Room
  // ...
}
```

### ローディング状態

loader 実行中のローディング表示は `useNavigation()` で取得する。

```tsx
const navigation = useNavigation()
const isLoading = navigation.state === 'loading'
```

---

## 4. TypeScript 方針

### 型定義

- オブジェクト型は `type` を使用する（`interface` は使わない）
- `any` は使用しない。型が不明な場合は `unknown` を使用する
- `as` キャストは `useLoaderData()` の戻り値など最小限に抑える

### DB テーブル型（`types/index.ts` に定義）

```ts
export type Room = {
  id: string
  name: string
  event_at: string
  location: string | null
  nearest_station: string | null
  expires_at: string
}

export type VoteReturnTimeChoice =
  | '21:00' | '21:30' | '22:00' | '22:30' | '23:00' | '終電まで' | '未定'

export type VoteAfterpartyChoice = '行く' | '行かない' | '未定'

export type VoteReturnTime = {
  id: string
  room_id: string
  choice: VoteReturnTimeChoice
  created_at: string
}

export type VoteAfterparty = {
  id: string
  room_id: string
  choice: VoteAfterpartyChoice
  created_at: string
}
```

### 関数の型注釈

引数と戻り値には型を明示する。React コンポーネントの props 型はインライン `type` で定義する。

```tsx
type VoteResultsProps = {
  returnTimeVotes: VoteReturnTime[]
  afterpartyVotes: VoteAfterparty[]
}

export function VoteResults({ returnTimeVotes, afterpartyVotes }: VoteResultsProps) {
  // ...
}
```

---

## 5. スタイリング方針（Tailwind CSS）

### 基本ルール

- スタイルは Tailwind CSS のユーティリティクラスのみで記述する
- `index.css` には `@tailwind base; @tailwind components; @tailwind utilities;` のみ記述する
- カスタム CSS は書かない。ただし Tailwind で対応できない場合（アニメーション等）は `tailwind.config.ts` に追記する

### モバイルファースト

- デフォルト（プレフィックスなし）でモバイル向けスタイルを記述する
- デスクトップ向けは `md:` プレフィックスで上書きする
- 基準幅は 375px（B01）

### 条件付きクラス

条件付きクラスは三項演算子またはテンプレートリテラルで記述する。

```tsx
// OK
<button className={`w-full py-3 rounded-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}>

// NG（複雑になる場合は変数に切り出す）
```

---

## 6. コメント規則

- コメントは「なぜそうするか（WHY）」が自明でない箇所にのみ記述する
- JSDoc（`/** */`）は書かない
- TODO コメントは残さない（設計書を更新してから実装する）

```tsx
// OK: 非自明な仕様の説明
// localStorage をクリアすると再投票可能になる仕様を許容している（要件定義 F03 参照）
localStorage.setItem(`voted_${room.id}`, 'true')

// NG: コードを読めば分かること
// ルームIDをローカルストレージに保存する
localStorage.setItem(`voted_${room.id}`, 'true')
```

---

## 7. インポート順序

以下の順序でグループ化し、グループ間に空行を入れる。

```tsx
// 1. React 本体
import { useState, useEffect } from 'react'

// 2. 外部ライブラリ
import { useLoaderData, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

// 3. 内部モジュール（lib・types）
import { supabase } from '../lib/supabase'
import type { Room, VoteReturnTimeChoice } from '../types'

// 4. 内部コンポーネント
import { VoteResults } from '../components/VoteResults'
import { AdBanner } from '../components/AdBanner'
```
