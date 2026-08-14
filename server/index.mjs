import {readFileSync, renameSync, writeFileSync} from 'node:fs'
import http from 'node:http'

const port = Number(process.env.PORT || 8790)
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

const tarotSystemPrompt = `你是一位有经验、真诚、克制的中文塔罗解读者。请先回应用户真正关心的问题，再结合牌位、正逆位和牌面关系进行分析。区分牌面倾向、可能解释和行动建议，不把推测说成事实。表达自然具体，避免神秘套话、绝对化预测、重复牌义和空泛建议。遇到矛盾牌面时，请说明其中的拉扯或现实条件。塔罗用于自我反思和娱乐，不制造恐惧或依赖。`

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
  return `请根据用户问题和牌面资料进行自然、有逻辑的解读。

只返回有效 JSON：
{"cardInterpretations":[{"cardIndex":0,"cardName":"牌名","orientation":"正位或逆位","position":"牌位","interpretation":"解读"}],"summary":"整体解读"}

用户问题：${question}
牌阵：${spreadName}
牌面资料：
${cards.map((item, index) => `${index}. ${item.position}；${item.card.name_cn}；${item.card.is_reversed ? '逆位' : '正位'}；关键词=${item.card.keywords.join('、')}；牌义=${item.card.meaning}；建议=${item.card.advice}`).join('\n')}

要求：
- 牌面数量、顺序和字段必须对应输入。
- 每张牌用 100-160 字，结合用户问题、牌位和正逆位，说明它的具体影响和一个相关建议。
- 不要逐张重复基础牌义，也不要使用相同句式开头。
- summary 用 220-320 字：先回应问题，再说明牌面主线、关键关系和现实中的下一步。
- 不要 Markdown、绝对化预测或泛泛的“保持积极”等套话。`
}

function summaryPrompt(question, spreadName, cards) {
  return `请根据用户问题和牌阵生成整体解读。

只返回有效 JSON：
{"summary":"整体解读"}

用户问题：${question}
牌阵：${spreadName}
抽牌：
${cards.map((item, index) => `${index + 1}. ${item.position}：${item.card.name_cn}（${item.card.is_reversed ? '逆位' : '正位'}），关键词：${item.card.keywords.join('、')}`).join('\n')}

请用 220-320 字完成：
1. 开头直接回应用户的问题；
2. 说明最重要的牌面关系、主线或矛盾；
3. 给出两到三个具体、现实的建议。

不要逐张复述牌义，不要统计无关的正逆位比例，不要使用神秘套话或绝对化结论。只返回 JSON，不要 Markdown。`
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
