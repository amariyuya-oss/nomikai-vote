import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VoteResults from '../../components/VoteResults'
import type { VoteReturnTimeChoice, VoteAfterpartyChoice } from '../../types'

describe('VoteResults', () => {
  it('U09: 投票なしのとき総投票数 0票 を表示する', () => {
    render(<VoteResults returnTimeVotes={[]} afterpartyVotes={[]} />)
    expect(screen.getByText(/総投票数: 0票/)).toBeInTheDocument()
  })

  it('U10: 帰宅希望時間の票数と割合を表示する', () => {
    const rtVotes = [
      { choice: '22:00' as VoteReturnTimeChoice },
      { choice: '22:00' as VoteReturnTimeChoice },
      { choice: '未定' as VoteReturnTimeChoice },
    ]
    render(<VoteResults returnTimeVotes={rtVotes} afterpartyVotes={[]} />)
    expect(screen.getByText(/67%/)).toBeInTheDocument()
    expect(screen.getByText(/総投票数: 3票/)).toBeInTheDocument()
  })

  it('U11: 二次会の各選択肢が表示される', () => {
    const apVotes = [
      { choice: '行く' as VoteAfterpartyChoice },
      { choice: '行かない' as VoteAfterpartyChoice },
    ]
    render(<VoteResults returnTimeVotes={[]} afterpartyVotes={apVotes} />)
    expect(screen.getByText('行く')).toBeInTheDocument()
    expect(screen.getByText('行かない')).toBeInTheDocument()
    // 「未定」は帰宅・二次会の両セクションに存在するため getAllByText で確認
    expect(screen.getAllByText('未定').length).toBeGreaterThanOrEqual(1)
  })

  it('U12: 票数0の帰宅希望時間選択肢も固定表示される', () => {
    render(<VoteResults returnTimeVotes={[]} afterpartyVotes={[]} />)
    // F03 の全選択肢が表示されること（「未定」は複数箇所に存在する）
    for (const choice of ['21:00', '21:30', '22:00', '22:30', '23:00', '終電まで']) {
      expect(screen.getByText(choice)).toBeInTheDocument()
    }
    expect(screen.getAllByText('未定').length).toBeGreaterThanOrEqual(1)
  })
})
