import { ProgressBar } from './ui/ProgressBar'
import type { VoteReturnTimeChoice, VoteAfterpartyChoice } from '../types'

const RETURN_TIME_CHOICES: VoteReturnTimeChoice[] = [
  '21:00', '21:30', '22:00', '22:30', '23:00', '終電まで', '未定',
]
const AFTERPARTY_CHOICES: VoteAfterpartyChoice[] = ['行く', '行かない', '未定']

type VoteResultsProps = {
  returnTimeVotes: { choice: VoteReturnTimeChoice }[]
  afterpartyVotes: { choice: VoteAfterpartyChoice }[]
}

export default function VoteResults({ returnTimeVotes, afterpartyVotes }: VoteResultsProps) {
  const totalVotes = returnTimeVotes.length

  const returnTimeCounts = RETURN_TIME_CHOICES.reduce<Record<string, number>>((acc, choice) => {
    acc[choice] = returnTimeVotes.filter((v) => v.choice === choice).length
    return acc
  }, {})

  const afterpartyCounts = AFTERPARTY_CHOICES.reduce<Record<string, number>>((acc, choice) => {
    acc[choice] = afterpartyVotes.filter((v) => v.choice === choice).length
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">総投票数: {totalVotes}票</p>

      <section>
        <h2 className="text-base font-semibold mb-3">帰宅希望時間</h2>
        <div className="flex flex-col gap-3">
          {RETURN_TIME_CHOICES.map((choice) => (
            <ProgressBar
              key={choice}
              label={choice}
              count={returnTimeCounts[choice]}
              total={totalVotes}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">二次会</h2>
        <div className="flex flex-col gap-3">
          {AFTERPARTY_CHOICES.map((choice) => (
            <ProgressBar
              key={choice}
              label={choice}
              count={afterpartyCounts[choice]}
              total={afterpartyVotes.length}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
