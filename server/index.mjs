import {readFileSync, renameSync, writeFileSync} from 'node:fs'
import http from 'node:http'

const port = Number(process.env.PORT || 8787)
const apiKey = process.env.DEEPSEEK_API_KEY || ''
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
const deepSeekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || 'https://lydia20031020-prog.github.io,https://www.taluo.lydiaowo.com')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)
const maxBodyBytes = 80 * 1024
const requestTimeoutMs = 85000
const rateWindowMs = 60 * 1000
const rateLimit = 12
const dailyRequestLimit = Number(process.env.DAILY_REQUEST_LIMIT || 200)
const dailyIpLimit = Number(process.env.DAILY_IP_LIMIT || 20)
const usageStateFile = process.env.USAGE_STATE_FILE || ''
const rateBuckets = new Map()
let dailyUsage = loadDailyUsage()

const tarotSystemPrompt = `你是一位专业、温和、负责任的中文塔罗牌解读师。
塔罗牌只能用于自我反思和娱乐，不做确定性预测，不替用户做医疗、法律、投资或其他高风险决定。
请尊重用户隐私，避免制造恐慌、依赖或绝对化结论。`

function sendJson(response, statusCode, payload, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  response.writeHead(statusCode, headers)
  response.end(JSON.stringify(payload))
}

function getClientIp(request) {
  const realIp = request.headers['x-real-ip']
  return (typeof realIp === 'string' ? realIp : request.socket.remoteAddress) || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.startedAt >= rateWindowMs) {
    rateBuckets.set(ip, {startedAt: now, count: 1})
    return false
  }
  bucket.count += 1
  return bucket.count > rateLimit
}

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function loadDailyUsage() {
  if (usageStateFile) {
    try {
      const saved = JSON.parse(readFileSync(usageStateFile, 'utf8'))
      if (saved?.date === currentDate() && typeof saved.total === 'number' && saved.ips) return saved
    } catch {
      // The state file is created after the first accepted request.
    }
  }
  return {date: currentDate(), total: 0, ips: {}}
}

function saveDailyUsage() {
  if (!usageStateFile) return
  const temporaryFile = `${usageStateFile}.tmp`
  writeFileSync(temporaryFile, JSON.stringify(dailyUsage), {mode: 0o600})
  renameSync(temporaryFile, usageStateFile)
}

function reserveDailyQuota(ip) {
  if (dailyUsage.date !== currentDate()) dailyUsage = {date: currentDate(), total: 0, ips: {}}
  const ipCount = Number(dailyUsage.ips[ip] || 0)
  if (dailyUsage.total >= dailyRequestLimit) throw new Error('今日AI服务额度已用完，请明天再试')
  if (ipCount >= dailyIpLimit) throw new Error('您今日的AI解读次数已用完')
  dailyUsage.total += 1
  dailyUsage.ips[ip] = ipCount + 1
  saveDailyUsage()
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(new Error('请求内容过大'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normaliseCards(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) {
    throw new Error('牌面数据无效')
  }
  return value.map((item, index) => {
    const card = item?.card
    if (!card || !asString(card.name_cn) || !asString(item.position)) {
      throw new Error(`第${index + 1}张牌数据无效`)
    }
    return {
      card: {
        name_cn: asString(card.name_cn),
        name_en: asString(card.name_en),
        is_reversed: Boolean(card.is_reversed),
        keywords: Array.isArray(card.keywords)
          ? card.keywords
              .slice(0, 12)
              .map((word) => asString(word))
              .filter(Boolean)
          : [],
        meaning: asString(card.meaning).slice(0, 1000),
        advice: asString(card.advice).slice(0, 1000)
      },
      position: asString(item.position).slice(0, 80),
      positionMeaning: asString(item.positionMeaning, asString(item.position)).slice(0, 100)
    }
  })
}

function parseModelJson(content) {
  const text = asString(content)
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(unfenced)
  } catch {
    const start = unfenced.indexOf('{')
    const end = unfenced.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1))
    throw new Error('AI返回格式无效')
  }
}

function validateInterpretation(value, cards) {
  if (!value || !Array.isArray(value.cardInterpretations) || typeof value.summary !== 'string') {
    throw new Error('AI解读结果不完整')
  }
  const cardInterpretations = value.cardInterpretations.slice(0, cards.length).map((item, index) => ({
    cardIndex: index,
    cardName: asString(item.cardName, cards[index].card.name_cn),
    orientation: item.orientation === '逆位' ? '逆位' : '正位',
    position: asString(item.position, cards[index].position),
    interpretation: asString(item.interpretation)
  }))
  if (cardInterpretations.length !== cards.length || cardInterpretations.some((item) => !item.interpretation)) {
    throw new Error('AI解读结果不完整')
  }
  return {cardInterpretations, summary: value.summary.trim()}
}

function validateSummary(value) {
  const summary = asString(value?.summary)
  if (!summary) throw new Error('AI总结结果为空')
  return {summary}
}

async function callDeepSeek(messages, maxTokens) {
  if (!apiKey) throw new Error('服务端尚未配置 DEEPSEEK_API_KEY')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const result = await fetch(`${deepSeekBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.75,
        max_tokens: maxTokens,
        response_format: {type: 'json_object'}
      }),
      signal: controller.signal
    })
    const body = await result.json().catch(() => ({}))
    if (!result.ok) {
      const message = body?.error?.message || `DeepSeek请求失败(${result.status})`
      throw new Error(message.slice(0, 240))
    }
    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('DeepSeek未返回内容')
    return parseModelJson(content)
  } finally {
    clearTimeout(timer)
  }
}

function interpretationPrompt(question, spreadName, cards) {
  return `请解读用户的塔罗牌牌阵，并严格只返回 JSON，不要 Markdown 或额外文字。JSON 结构必须是：
{"cardInterpretations":[{"cardIndex":0,"cardName":"牌名","orientation":"正位或逆位","position":"牌位","interpretation":"约200-300字解读"}],"summary":"约300-400字整体总述"}

用户问题：${question}
牌阵：${spreadName}
牌面资料：
${cards.map((item, index) => `${index}. 牌位=${item.position}；${item.card.name_cn}(${item.card.name_en})；${item.card.is_reversed ? '逆位' : '正位'}；关键词=${item.card.keywords.join('、')}；基础牌义=${item.card.meaning}；行动建议=${item.card.advice}`).join('\n')}

逐张解读要结合问题、牌位、正逆位和基础牌义，给出可执行且温和的建议。整体总述请说明牌面之间的联系、趋势和用户可以把握的行动。不要声称结果必然发生，不要提供医疗、法律或投资结论。`
}

function summaryPrompt(question, spreadName, cards) {
  return `请为用户的塔罗牌阵生成整体解读，并严格只返回 JSON，不要 Markdown 或额外文字。JSON 结构必须是：{"summary":"约250-350字的中文整体解读"}

用户问题：${question}
牌阵：${spreadName}
抽牌：
${cards.map((item, index) => `${index + 1}. ${item.position}：${item.card.name_cn}（${item.card.is_reversed ? '逆位' : '正位'}），关键词：${item.card.keywords.join('、')}`).join('\n')}

请说明整体能量、正逆位比例、牌面关联、对问题的启发和实际建议。语气温和专业，避免绝对化预测，并提醒塔罗是自我反思工具。`
}

async function handle(request, response, origin, pathname) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {}, origin)
    return
  }
  if (request.method !== 'POST' || !['/api/tarot/interpretation', '/api/tarot/summary'].includes(pathname)) {
    sendJson(response, 404, {success: false, error: '接口不存在'}, origin)
    return
  }
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, {success: false, error: '来源不被允许'}, origin)
    return
  }
  if (isRateLimited(getClientIp(request))) {
    sendJson(response, 429, {success: false, error: '请求过于频繁，请稍后再试'}, origin)
    return
  }

  try {
    const payload = JSON.parse(await readBody(request))
    const question = asString(payload.question, '未指定问题').slice(0, 500)
    const spreadName = asString(payload.spreadName, '未命名牌阵').slice(0, 100)
    const cards = normaliseCards(payload.cards)
    reserveDailyQuota(getClientIp(request))
    const messages = [{role: 'system', content: tarotSystemPrompt}]
    const prompt = pathname.endsWith('/summary')
      ? summaryPrompt(question, spreadName, cards)
      : interpretationPrompt(question, spreadName, cards)
    messages.push({role: 'user', content: prompt})
    const result = await callDeepSeek(messages, pathname.endsWith('/summary') ? 1400 : 4200)
    const data = pathname.endsWith('/summary') ? validateSummary(result) : validateInterpretation(result, cards)
    sendJson(response, 200, {success: true, data}, origin)
  } catch (error) {
    const message =
      error?.name === 'AbortError' ? 'AI服务响应超时，请稍后重试' : asString(error?.message, 'AI服务暂时不可用')
    console.error(`[${new Date().toISOString()}] ${pathname}: ${message}`)
    const statusCode = message.includes('额度') || message.includes('次数') || message.includes('频繁') ? 429 : 502
    sendJson(response, statusCode, {success: false, error: message}, origin)
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  void handle(request, response, typeof request.headers.origin === 'string' ? request.headers.origin : '', url.pathname)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Tarot AI API listening on 127.0.0.1:${port} using ${model}`)
})
