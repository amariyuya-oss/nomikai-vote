import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '../../components/ui/ProgressBar'

describe('ProgressBar', () => {
  it('U05: count/total から割合を計算して表示する', () => {
    render(<ProgressBar label="22:00" count={3} total={10} />)
    expect(screen.getByText(/30%/)).toBeInTheDocument()
  })

  it('U06: total=0 のときゼロ除算せず 0% を表示する', () => {
    render(<ProgressBar label="未定" count={0} total={0} />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('U07: count=total のとき 100% を表示する', () => {
    render(<ProgressBar label="21:00" count={5} total={5} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('U08: label が表示される', () => {
    render(<ProgressBar label="終電まで" count={1} total={5} />)
    expect(screen.getByText('終電まで')).toBeInTheDocument()
  })
})
