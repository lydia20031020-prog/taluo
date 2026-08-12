// 塔罗牌数据库类型定义

export interface TarotCard {
  id: number
  name_cn: string
  name_en: string
  card_type: 'major' | 'minor'
  suit: 'wands' | 'cups' | 'swords' | 'pentacles' | null
  number: number
  image_url: string
  keywords_upright: string[]
  keywords_reversed: string[]
  meaning_upright: string
  meaning_reversed: string
  advice_upright: string
  advice_reversed: string
  element: string | null
  created_at: string
}

export interface SpreadType {
  id: number
  name: string
  description: string
  card_count: number
  positions: Array<{position: number; meaning: string}>
  category: 'basic' | 'classic' | 'theme'
  theme: string | null
  sort_order: number
  created_at: string
}

export interface DivinationRecord {
  id: string
  user_id: string
  question: string | null
  spread_type_id: number
  cards_drawn: Array<{
    card_id: number
    position: number
    is_reversed: boolean
    card_info?: TarotCard
  }>
  created_at: string
}

export interface DrawnCard {
  card_id: number
  position: number
  is_reversed: boolean
  card_info?: TarotCard
}
