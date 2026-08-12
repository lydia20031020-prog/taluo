// 塔罗牌数据库API

import {supabase} from '@/client/supabase'
import type {DivinationRecord, DrawnCard, SpreadType, TarotCard} from './types'

/**
 * 获取所有塔罗牌
 */
export async function getAllTarotCards(): Promise<TarotCard[]> {
  const {data, error} = await supabase.from('tarot_cards').select('*').order('id', {ascending: true})

  if (error) {
    console.error('获取塔罗牌数据失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据ID获取塔罗牌
 */
export async function getTarotCardById(id: number): Promise<TarotCard | null> {
  const {data, error} = await supabase.from('tarot_cards').select('*').eq('id', id)

  if (error) {
    console.error('获取塔罗牌失败:', error)
    return null
  }

  return data && data.length > 0 ? data[0] : null
}

/**
 * 根据类型获取塔罗牌
 */
export async function getTarotCardsByType(type: 'major' | 'minor'): Promise<TarotCard[]> {
  const {data, error} = await supabase
    .from('tarot_cards')
    .select('*')
    .eq('card_type', type)
    .order('number', {ascending: true})

  if (error) {
    console.error('获取塔罗牌失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据牌组获取塔罗牌
 */
export async function getTarotCardsBySuit(suit: 'wands' | 'cups' | 'swords' | 'pentacles'): Promise<TarotCard[]> {
  const {data, error} = await supabase
    .from('tarot_cards')
    .select('*')
    .eq('suit', suit)
    .order('number', {ascending: true})

  if (error) {
    console.error('获取塔罗牌失败:', error)
    return []
  }

  return data || []
}

/**
 * 获取所有牌阵类型
 */
export async function getAllSpreadTypes(): Promise<SpreadType[]> {
  const {data, error} = await supabase.from('spread_types').select('*').order('sort_order', {ascending: true})

  if (error) {
    console.error('获取牌阵类型失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据分类获取牌阵类型
 */
export async function getSpreadTypesByCategory(category: 'basic' | 'classic' | 'theme'): Promise<SpreadType[]> {
  const {data, error} = await supabase
    .from('spread_types')
    .select('*')
    .eq('category', category)
    .order('sort_order', {ascending: true})

  if (error) {
    console.error('获取牌阵类型失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据ID获取牌阵类型
 */
export async function getSpreadTypeById(id: number): Promise<SpreadType | null> {
  const {data, error} = await supabase.from('spread_types').select('*').eq('id', id)

  if (error) {
    console.error('获取牌阵类型失败:', error)
    return null
  }

  return data && data.length > 0 ? data[0] : null
}

/**
 * 创建占卜记录
 */
export async function createDivinationRecord(
  userId: string,
  spreadTypeId: number,
  cardsDrawn: DrawnCard[],
  question?: string
): Promise<DivinationRecord | null> {
  const {data, error} = await supabase
    .from('divination_records')
    .insert({
      user_id: userId,
      spread_type_id: spreadTypeId,
      cards_drawn: cardsDrawn,
      question: question || null
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建占卜记录失败:', error)
    return null
  }

  return data
}

/**
 * 获取用户的占卜记录
 */
export async function getUserDivinationRecords(userId: string, limit = 50): Promise<DivinationRecord[]> {
  const {data, error} = await supabase
    .from('divination_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
    .limit(limit)

  if (error) {
    console.error('获取占卜记录失败:', error)
    return []
  }

  return data || []
}

/**
 * 根据ID获取占卜记录
 */
export async function getDivinationRecordById(id: string): Promise<DivinationRecord | null> {
  const {data, error} = await supabase.from('divination_records').select('*').eq('id', id)

  if (error) {
    console.error('获取占卜记录失败:', error)
    return null
  }

  return data && data.length > 0 ? data[0] : null
}

/**
 * 随机抽取塔罗牌
 */
export function drawRandomCards(allCards: TarotCard[], count: number): DrawnCard[] {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  return selected.map((card, index) => ({
    card_id: card.id,
    position: index + 1,
    is_reversed: Math.random() < 0.5, // 50%概率为逆位
    card_info: card
  }))
}
