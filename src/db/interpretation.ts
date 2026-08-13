import Taro from '@tarojs/taro'
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

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class TarotAIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TarotAIError'
  }
}

const aiApiUrl = (process.env.TARO_APP_AI_API_URL || '').replace(/\/$/, '')

function buildCards(spreadType: SpreadType, drawnCards: DrawnCard[]) {
  return drawnCards
    .map((drawn, index) => {
      const card = drawn.card_info
      if (!card) return null

      const position = spreadType.positions[index]?.meaning || `第${index + 1}张牌`
      return {
        card: {
          name_cn: card.name_cn,
          name_en: card.name_en,
          is_reversed: drawn.is_reversed,
          keywords: drawn.is_reversed ? card.keywords_reversed : card.keywords_upright,
          meaning: drawn.is_reversed ? card.meaning_reversed : card.meaning_upright,
          advice: drawn.is_reversed ? card.advice_reversed : card.advice_upright
        },
        position,
        positionMeaning: position
      }
    })
    .filter((card): card is NonNullable<typeof card> => card !== null)
}

async function requestAI<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!aiApiUrl) {
    throw new TarotAIError('AI服务尚未配置')
  }

  try {
    const response = await Taro.request<ApiResponse<T>>({
      url: `${aiApiUrl}${path}`,
      method: 'POST',
      header: {'Content-Type': 'application/json'},
      data: body,
      timeout: 90000
    })

    if (response.statusCode < 200 || response.statusCode >= 300 || !response.data?.success || !response.data.data) {
      throw new TarotAIError(response.data?.error || `AI服务请求失败(${response.statusCode})`)
    }

    return response.data.data
  } catch (error) {
    if (error instanceof TarotAIError) throw error
    console.error('AI服务请求出错:', error)
    throw new TarotAIError('暂时无法连接AI服务，请稍后重试')
  }
}

export async function getTarotInterpretation(
  question: string,
  spreadType: SpreadType,
  drawnCards: DrawnCard[]
): Promise<TarotInterpretationResult> {
  return requestAI<TarotInterpretationResult>('/api/tarot/interpretation', {
    question: question || '未指定问题',
    spreadName: spreadType.name,
    cards: buildCards(spreadType, drawnCards)
  })
}

export async function getTarotSummary(
  question: string,
  spreadType: SpreadType,
  drawnCards: DrawnCard[]
): Promise<string> {
  const result = await requestAI<{summary: string}>('/api/tarot/summary', {
    question: question || '未指定问题',
    spreadName: spreadType.name,
    cards: buildCards(spreadType, drawnCards)
  })

  return result.summary
}
