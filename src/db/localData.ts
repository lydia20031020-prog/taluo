import type {SpreadType, TarotCard} from './types'

const now = '2026-01-01T00:00:00.000Z'
const majorNames = [
  ['愚者', 'The Fool', 'Air'],
  ['魔术师', 'The Magician', 'Air'],
  ['女祭司', 'The High Priestess', 'Water'],
  ['皇后', 'The Empress', 'Earth'],
  ['皇帝', 'The Emperor', 'Fire'],
  ['教皇', 'The Hierophant', 'Earth'],
  ['恋人', 'The Lovers', 'Air'],
  ['战车', 'The Chariot', 'Water'],
  ['力量', 'Strength', 'Fire'],
  ['隐者', 'The Hermit', 'Earth'],
  ['命运之轮', 'Wheel of Fortune', 'Fire'],
  ['正义', 'Justice', 'Air'],
  ['倒吊人', 'The Hanged Man', 'Water'],
  ['死神', 'Death', 'Water'],
  ['节制', 'Temperance', 'Fire'],
  ['恶魔', 'The Devil', 'Earth'],
  ['塔', 'The Tower', 'Fire'],
  ['星星', 'The Star', 'Air'],
  ['月亮', 'The Moon', 'Water'],
  ['太阳', 'The Sun', 'Fire'],
  ['审判', 'Judgement', 'Fire'],
  ['世界', 'The World', 'Earth']
] as const
const ranks = [
  ['王牌', 'Ace'],
  ['二', 'Two'],
  ['三', 'Three'],
  ['四', 'Four'],
  ['五', 'Five'],
  ['六', 'Six'],
  ['七', 'Seven'],
  ['八', 'Eight'],
  ['九', 'Nine'],
  ['十', 'Ten'],
  ['侍从', 'Page'],
  ['骑士', 'Knight'],
  ['王后', 'Queen'],
  ['国王', 'King']
] as const
const suits = {
  wands: ['权杖', 'Wands', 'Fire', '行动、创造、热情'],
  cups: ['圣杯', 'Cups', 'Water', '情感、关系、直觉'],
  swords: ['宝剑', 'Swords', 'Air', '思考、沟通、判断'],
  pentacles: ['星币', 'Pentacles', 'Earth', '物质、工作、稳定']
} as const
const images = {
  major: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2d9b2201-ca50-4792-a080-c7d054f9d20d.jpg',
  wands: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4e26418b-3d55-482e-9133-5d2274d9e12d.jpg',
  cups: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_966e8cf1-7958-4769-9806-8da6d428ee36.jpg',
  swords: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4e26418b-3d55-482e-9133-5d2274d9e12d.jpg',
  pentacles: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4e26418b-3d55-482e-9133-5d2274d9e12d.jpg'
} as const

function card(
  id: number,
  nameCn: string,
  nameEn: string,
  type: TarotCard['card_type'],
  number: number,
  element: string,
  suit: TarotCard['suit'],
  topic: string
): TarotCard {
  return {
    id,
    name_cn: nameCn,
    name_en: nameEn,
    card_type: type,
    suit,
    number,
    image_url: images[suit || 'major'],
    keywords_upright: topic.split('、'),
    keywords_reversed: ['停滞', '失衡', '需要反思', '放慢脚步'],
    meaning_upright: `${nameCn}提示你关注${topic}。请结合现实处境理解其中的启发。`,
    meaning_reversed: `${nameCn}逆位提醒你留意${topic}中的失衡与阻力。先放慢脚步,厘清自己的感受和选择。`,
    advice_upright: `围绕${topic}采取一个具体而温和的行动,让想法逐步落地。`,
    advice_reversed: '给自己一些调整空间,重新检查目标与边界,再决定下一步。',
    element,
    created_at: now
  }
}

export const localTarotCards: TarotCard[] = [
  ...majorNames.map(([cn, en, element], index) =>
    card(index + 1, cn, en, 'major', index, element, null, '成长、转变、内在指引')
  ),
  ...(['wands', 'cups', 'swords', 'pentacles'] as const).flatMap((suit, suitIndex) => {
    const [suitCn, suitEn, element, topic] = suits[suit]
    return ranks.map(([rankCn, rankEn], rankIndex) =>
      card(
        23 + suitIndex * 14 + rankIndex,
        `${suitCn}${rankCn}`,
        `${rankEn} of ${suitEn}`,
        'minor',
        rankIndex + 1,
        element,
        suit,
        topic
      )
    )
  })
]

const spread = (
  id: number,
  name: string,
  description: string,
  count: number,
  category: SpreadType['category'],
  meanings: string[],
  theme: string | null = null
): SpreadType => ({
  id,
  name,
  description,
  card_count: count,
  positions: meanings.map((meaning, index) => ({position: index + 1, meaning})),
  category,
  theme,
  sort_order: id,
  created_at: now
})

export const localSpreadTypes: SpreadType[] = [
  spread(1, '单张牌', '快速占卜,适合是否类问题,获得简洁明确的指引', 1, 'basic', ['核心指引']),
  spread(2, '三张牌阵', '经典时间流分析,了解事件的发展脉络', 3, 'classic', ['过去', '现在', '未来']),
  spread(3, '凯尔特十字', '深度全面解析,适合复杂问题的多维度分析', 10, 'classic', [
    '现状',
    '挑战',
    '根源',
    '过去',
    '目标',
    '未来',
    '自我',
    '环境',
    '希望与恐惧',
    '最终结果'
  ]),
  spread(4, '爱情关系', '探索情感状态与亲密关系发展', 3, 'theme', ['你的状态', '对方的状态', '关系走向'], 'love'),
  spread(5, '职业发展', '分析事业现状与未来机遇', 3, 'theme', ['当前职业状态', '发展机遇', '行动建议'], 'career'),
  spread(6, '财务状况', '了解财务现状与投资方向', 3, 'theme', ['财务现状', '影响因素', '改善方向'], 'finance'),
  spread(7, '学业考试', '评估学习状态与考试运势', 3, 'theme', ['学习状态', '需要加强的方面', '考试运势'], 'study'),
  spread(8, '个人成长', '探索内在潜力与灵性发展', 3, 'theme', ['当前状态', '成长方向', '需要突破的限制'], 'growth'),
  spread(9, '身心健康', '了解身心状态与调整建议', 3, 'theme', ['身体状态', '心理状态', '调整建议'], 'health'),
  spread(10, '家庭人际', '分析家庭关系与人际互动', 3, 'theme', ['关系现状', '问题根源', '改善方法'], 'relationship'),
  spread(11, '重大决策', '协助重要选择与人生方向', 3, 'theme', ['选择A的结果', '选择B的结果', '核心建议'], 'decision')
]
