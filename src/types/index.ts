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
