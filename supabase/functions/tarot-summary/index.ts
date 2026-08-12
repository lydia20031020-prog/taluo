import {serve} from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface TarotCard {
  name_cn: string
  is_reversed: boolean
  keywords: string[]
}

interface SummaryRequest {
  question: string
  spreadName: string
  cards: Array<{
    card: TarotCard
    position: string
  }>
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }

  try {
    const {question, spreadName, cards}: SummaryRequest = await req.json()

    // 获取API Key
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY not configured')
    }

    // 构建prompt
    const cardsInfo = cards.map((item, i) => {
      const orientation = item.card.is_reversed ? '逆位' : '正位'
      const keywords = item.card.keywords.join('、')
      return `${i + 1}. ${item.position}: ${item.card.name_cn}(${orientation}) - 关键词: ${keywords}`
    }).join('\n')

    const prompt = `你是一位专业的塔罗牌解读师。请根据以下信息为用户提供整体的牌阵解读:

用户问题: ${question || '未指定问题'}
牌阵: ${spreadName}
抽取的牌:
${cardsInfo}

请生成一段250-350字的整体解读,包括:
1. 简要说明本次占卜抽取的牌面情况
2. 分析牌面的整体能量和趋势(正位/逆位比例)
3. 说明各张牌在牌阵中的相互关联
4. 对用户问题给出综合性的解答
5. 提供实用的建议和鼓励
6. 强调塔罗牌是映照内心的工具,真正的力量源于选择和行动

语气要温和、专业,给予希望和力量,避免绝对化表述。
请直接输出解读内容,不要包含任何前缀或标题。`

    // 调用通义千问API
    const summary = await callDashScopeAPI(apiKey, prompt)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
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
        max_tokens: 800
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
