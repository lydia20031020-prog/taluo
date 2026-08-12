import {supabase} from '@/client/supabase'
import type {DrawnCard, SpreadType} from './types'

export interface CardInterpretation {
  cardIndex: number
  cardName: string
  orientation: string
  position: string
  interpretation: string
}

export interface TarotInterpretationResult {
  cardInterpretations: CardInterpretation[]
  summary: string
}

/**
 * 调用AI解读塔罗牌
 */
export async function getTarotInterpretation(
  question: string,
  spreadType: SpreadType,
  drawnCards: DrawnCard[]
): Promise<TarotInterpretationResult | null> {
  try {
    // 构建请求数据
    const cards = drawnCards
      .map((drawn, index) => {
        const card = drawn.card_info
        if (!card) return null

        const positionInfo = spreadType.positions[index]
        const keywords = drawn.is_reversed ? card.keywords_reversed : card.keywords_upright
        const meaning = drawn.is_reversed ? card.meaning_reversed : card.meaning_upright
        const advice = drawn.is_reversed ? card.advice_reversed : card.advice_upright

        return {
          card: {
            name_cn: card.name_cn,
            name_en: card.name_en,
            is_reversed: drawn.is_reversed,
            keywords,
            meaning,
            advice
          },
          position: positionInfo?.meaning || `第${index + 1}张牌`,
          positionMeaning: positionInfo?.meaning || '未知位置'
        }
      })
      .filter(Boolean)

    // 调用Edge Function
    const {data, error} = await supabase.functions.invoke('tarot-interpretation', {
      body: JSON.stringify({
        question: question || '未指定问题',
        spreadName: spreadType.name,
        cards
      })
    })

    if (error) {
      const errorMsg = await error?.context?.text()
      console.error('AI解读失败:', errorMsg || error?.message)
      return null
    }

    if (data?.success && data?.data) {
      return data.data as TarotInterpretationResult
    }

    return null
  } catch (error) {
    console.error('获取AI解读时出错:', error)
    return null
  }
}

/**
 * 调用AI生成整体牌阵总结
 */
export async function getTarotSummary(
  question: string,
  spreadType: SpreadType,
  drawnCards: DrawnCard[]
): Promise<string | null> {
  try {
    // 构建请求数据
    const cards = drawnCards
      .map((drawn, index) => {
        const card = drawn.card_info
        if (!card) return null

        const positionInfo = spreadType.positions[index]
        const keywords = drawn.is_reversed ? card.keywords_reversed : card.keywords_upright

        return {
          card: {
            name_cn: card.name_cn,
            is_reversed: drawn.is_reversed,
            keywords
          },
          position: positionInfo?.meaning || `第${index + 1}张牌`
        }
      })
      .filter(Boolean)

    // 调用Edge Function
    const {data, error} = await supabase.functions.invoke('tarot-summary', {
      body: JSON.stringify({
        question: question || '未指定问题',
        spreadName: spreadType.name,
        cards
      })
    })

    if (error) {
      const errorMsg = await error?.context?.text()
      console.error('生成总结失败:', errorMsg || error?.message)
      return null
    }

    if (data?.success && data?.data?.summary) {
      return data.data.summary
    }

    return null
  } catch (error) {
    console.error('获取总结时出错:', error)
    return null
  }
}
