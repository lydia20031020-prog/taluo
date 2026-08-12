// 占卜状态管理

import {create} from 'zustand'
import type {DrawnCard, SpreadType} from '@/db/types'

interface DivinationState {
  // 当前选择的牌阵
  selectedSpread: SpreadType | null
  setSelectedSpread: (spread: SpreadType | null) => void

  // 用户问题
  question: string
  setQuestion: (question: string) => void

  // 抽取的牌
  drawnCards: DrawnCard[]
  setDrawnCards: (cards: DrawnCard[]) => void

  // 重置状态
  reset: () => void
}

export const useDivinationStore = create<DivinationState>((set) => ({
  selectedSpread: null,
  setSelectedSpread: (spread) => set({selectedSpread: spread}),

  question: '',
  setQuestion: (question) => set({question}),

  drawnCards: [],
  setDrawnCards: (cards) => set({drawnCards: cards}),

  reset: () =>
    set({
      selectedSpread: null,
      question: '',
      drawnCards: []
    })
}))
