import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import CreateRoomPage from '../../pages/CreateRoomPage'

// Edge Function の fetch をモック（バリデーション検証のみのため呼ばれないはずだが念のため）
vi.stubGlobal('fetch', vi.fn())

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <CreateRoomPage />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('CreateRoomPage バリデーション', () => {
  it('U15: 飲み会名が空でsubmitしたときエラーメッセージを表示する', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'アンケートを作成する' }))
    expect(screen.getByText('飲み会名を入力してください')).toBeInTheDocument()
  })

  it('U16: 飲み会名が51文字でsubmitしたときエラーメッセージを表示する', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/飲み会名/), 'あ'.repeat(51))
    await userEvent.click(screen.getByRole('button', { name: 'アンケートを作成する' }))
    expect(screen.getByText('50文字以内で入力してください')).toBeInTheDocument()
  })

  it('U17: 開催日時が空でsubmitしたときエラーメッセージを表示する', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/飲み会名/), 'テスト飲み会')
    await userEvent.click(screen.getByRole('button', { name: 'アンケートを作成する' }))
    expect(screen.getByText('開催日時を入力してください')).toBeInTheDocument()
  })

  it('U19: バリデーション通過時はエラーが表示されない', async () => {
    renderPage()
    const future = new Date(Date.now() + 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const datetimeLocal = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`

    await userEvent.type(screen.getByLabelText(/飲み会名/), '忘年会')
    await userEvent.type(screen.getByLabelText(/開催日時/), datetimeLocal)
    await userEvent.click(screen.getByRole('button', { name: 'アンケートを作成する' }))

    expect(screen.queryByText('飲み会名を入力してください')).not.toBeInTheDocument()
    expect(screen.queryByText('開催日時を入力してください')).not.toBeInTheDocument()
  })
})
