import {serve} from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface TarotCard {
  name_cn: string
  name_en: string
  is_reversed: boolean
  keywords: string[]
  meaning: string
  advice: string
}

interface InterpretationRequest {
  question: string
  spreadName: string
  cards: Array<{
    card: TarotCard
    position: string
    positionMeaning: string
  }>
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }

  try {
    const {question, spreadName, cards}: InterpretationRequest = await req.json()

    // 获取API Key
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY not configured')
    }

    // 为每张牌生成AI解读
    const cardInterpretations = []
    for (let i = 0; i < cards.length; i++) {
      const item = cards[i]
      const {card, position, positionMeaning} = item
      const orientation = card.is_reversed ? '逆位' : '正位'
      const keywords = card.keywords.join('、')

      // 构建prompt
      const prompt = `你是一位专业的塔罗牌解读师。请根据以下信息为用户提供详细的塔罗牌解读:

用户问题: ${question}
牌阵: ${spreadName}
牌位: ${position} (${positionMeaning})
抽到的牌: ${card.name_cn}(${card.name_en}) - ${orientation}
关键词: ${keywords}
基础牌义: ${card.meaning}
建议: ${card.advice}

请结合用户的问题、牌阵位置的含义、以及牌面的正逆位状态,生成一段200-300字的详细解读。解读应该:
1. 说明这张牌在这个位置的具体含义
2. 结合用户的问题进行个性化分析
3. 提供实用的建议和指引
4. 语气温和、鼓励,避免负面暗示

请直接输出解读内容,不要包含任何前缀或标题。`

      // 调用通义千问API
      const interpretation = await callDashScopeAPI(apiKey, prompt)
      
      cardInterpretations.push({
        cardIndex: i,
        cardName: card.name_cn,
        orientation,
        position,
        interpretation
      })
    }

    // 生成整体总述
    const summaryPrompt = `你是一位专业的塔罗牌解读师。请根据以下信息为用户提供整体的牌阵总述:

用户问题: ${question}
牌阵: ${spreadName}
抽取的牌:
${cards.map((item, i) => {
  const orientation = item.card.is_reversed ? '逆位' : '正位'
  return `${i + 1}. ${item.position}: ${item.card.name_cn}(${orientation}) - 关键词: ${item.card.keywords.join('、')}`
}).join('\n')}

请生成一段300-400字的整体总述,包括:
1. 分析牌面的整体能量和趋势
2. 说明各张牌之间的关联和相互影响
3. 对用户问题给出综合性的解答和建议
4. 鼓励用户积极面对,强调选择和行动的重要性
5. 语气温和、专业,给予希望和力量

请直接输出总述内容,不要包含任何前缀或标题。`

    const summary = await callDashScopeAPI(apiKey, summaryPrompt)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cardInterpretations,
          summary
        }
      }),
      {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
        status: 200
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
        status: 400
      }
    )
  }
})

async function callDashScopeAPI(apiKey: string, prompt: string): Promise<string> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DashScope API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim()
    }
    
    throw new Error('No response from DashScope API')
  } catch (error) {
    console.error('DashScope API call failed:', error)
    throw error
  }
}
