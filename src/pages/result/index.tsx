import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getEnv, useShareAppMessage, useShareTimeline} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {createDivinationRecord} from '@/db/api'
import {
  getTarotInterpretation,
  getTarotSummary,
  TarotAIError,
  type TarotInterpretationResult
} from '@/db/interpretation'
import {useDivinationStore} from '@/store/divination'
import {useUserStore} from '@/store/user'

export default function Result() {
  const {selectedSpread, question, drawnCards, reset} = useDivinationStore()
  const {userId} = useUserStore()
  const [_saved, setSaved] = useState(false)
  const [_recordId, setRecordId] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState<TarotInterpretationResult | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showAIInterpretation, setShowAIInterpretation] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const saveRecord = useCallback(async () => {
    if (!selectedSpread || !userId) return
    const record = await createDivinationRecord(userId, selectedSpread.id, drawnCards, question || undefined)
    if (record) {
      setSaved(true)
      setRecordId(record.id)
    }
  }, [selectedSpread, userId, drawnCards, question])

  useEffect(() => {
    if (!selectedSpread || drawnCards.length === 0) {
      Taro.showToast({title: '请先进行占卜', icon: 'none'})
      setTimeout(() => Taro.redirectTo({url: '/pages/index/index'}), 1500)
      return
    }
    saveRecord()
  }, [saveRecord, selectedSpread, drawnCards.length])

  // 分享配置
  useShareAppMessage(() => ({
    title: `我在塔罗之光进行了${selectedSpread?.name}占卜`,
    path: '/pages/index/index'
  }))

  useShareTimeline(() => ({
    title: `我在塔罗之光进行了${selectedSpread?.name}占卜`
  }))

  // 再次占卜
  const handleDivineAgain = () => {
    reset()
    Taro.redirectTo({url: '/pages/index/index'})
  }

  // 查看记录
  const handleViewHistory = () => {
    Taro.redirectTo({url: '/pages/history/index'})
  }

  // 分享功能
  const handleShare = () => {
    if (getEnv() !== 'WEAPP') {
      Taro.showToast({
        title: '分享功能仅在微信小程序中可用',
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 生成整体牌阵总结
  const generateSummary = () => {
    if (!selectedSpread || drawnCards.length === 0) return ''

    const cardDescriptions = drawnCards
      .map((drawn, index) => {
        const card = drawn.card_info
        const positionInfo = selectedSpread.positions[index]
        const position = positionInfo?.meaning || `第${index + 1}张牌`
        const orientation = drawn.is_reversed ? '逆位' : '正位'
        const keywords = drawn.is_reversed ? card?.keywords_reversed : card?.keywords_upright
        return `${position}抽到了${orientation}的${card?.name_cn},关键词是${keywords?.join('、')}`
      })
      .join('。')

    return `本次${selectedSpread.name}占卜共抽取${drawnCards.length}张牌。${cardDescriptions}。\n\n综合来看,这个牌阵为您揭示了当前的状态、影响因素和未来走向。每张牌都在其特定位置上传递着独特的信息,它们相互关联,共同构成了一幅完整的画面。建议您结合自身实际情况,深入思考每张牌的含义,从中获得启发和指引。记住,塔罗牌是映照内心的工具,真正的力量源于您的选择和行动。`
  }

  // 获取AI详细解读
  const handleGetAIInterpretation = async () => {
    if (!selectedSpread || drawnCards.length === 0) return

    setLoadingAI(true)
    try {
      const result = await getTarotInterpretation(question, selectedSpread, drawnCards)
      setAiInterpretation(result)
      setShowAIInterpretation(true)
      Taro.showToast({
        title: 'AI解读生成成功',
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('获取AI解读失败:', error)
      Taro.showToast({
        title: error instanceof TarotAIError ? error.message : 'AI解读生成失败',
        icon: 'none',
        duration: 3500
      })
    } finally {
      setLoadingAI(false)
    }
  }

  // 获取AI整体总结
  const handleGetAISummary = async () => {
    if (!selectedSpread || drawnCards.length === 0) return

    setLoadingSummary(true)
    try {
      const summary = await getTarotSummary(question, selectedSpread, drawnCards)
      setAiSummary(summary)
      Taro.showToast({
        title: 'AI总结生成成功',
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('获取AI总结失败:', error)
      Taro.showToast({
        title: error instanceof TarotAIError ? error.message : 'AI总结生成失败',
        icon: 'none',
        duration: 3500
      })
    } finally {
      setLoadingSummary(false)
    }
  }

  if (!selectedSpread || drawnCards.length === 0) {
    return null
  }

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 头部 */}
        <View className="px-6 pt-8 pb-6">
          <View className="text-center mb-6">
            <View className="i-mdi-star-four-points text-5xl text-accent mb-3 glow-accent" />
            <Text className="text-2xl font-bold text-foreground break-keep mb-2">占卜结果</Text>
            {question && (
              <View className="bg-muted/30 rounded-xl p-3 mt-4 border border-border/50">
                <Text className="text-sm text-muted-foreground break-keep">问题: {question}</Text>
              </View>
            )}
          </View>

          {/* 牌阵信息 */}
          <View className="bg-gradient-card rounded-2xl p-4 mb-6 border border-border">
            <View className="flex items-center justify-between">
              <Text className="text-lg font-bold text-foreground break-keep">{selectedSpread.name}</Text>
              <View className="bg-primary/20 px-3 py-1 rounded-full">
                <Text className="text-xs text-white break-keep">{drawnCards.length}张牌</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 抽取的牌 */}
        <View className="px-6 mb-6">
          {drawnCards.map((drawn, index) => {
            const card = drawn.card_info
            if (!card) return null

            const positionInfo = selectedSpread.positions[index]

            return (
              <View key={index} className="mb-6 fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                {/* 牌位说明 */}
                <View className="flex items-center mb-3">
                  <View className="bg-accent/20 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                    <Text className="text-sm font-bold text-accent break-keep">{index + 1}</Text>
                  </View>
                  <Text className="text-base font-bold text-foreground break-keep">
                    {positionInfo?.meaning || `第${index + 1}张牌`}
                  </Text>
                </View>

                {/* 牌面卡片 */}
                <View className="bg-card rounded-2xl p-5 border border-border">
                  {/* 牌面图片 */}
                  <View className="flex justify-center mb-4">
                    <View
                      className={`w-40 h-60 bg-gradient-card rounded-xl border-2 border-primary/50 overflow-hidden ${drawn.is_reversed ? 'rotate-180' : ''}`}>
                      <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                    </View>
                  </View>

                  {/* 牌名 */}
                  <View className="text-center mb-4">
                    <Text className="text-xl font-bold text-foreground break-keep mb-1">{card.name_cn}</Text>
                    <Text className="text-sm text-muted-foreground break-keep mb-2">{card.name_en}</Text>
                    {drawn.is_reversed && (
                      <View className="inline-block bg-destructive/20 px-3 py-1 rounded-full">
                        <Text className="text-xs text-destructive break-keep">逆位</Text>
                      </View>
                    )}
                    {!drawn.is_reversed && (
                      <View className="inline-block bg-primary/20 px-3 py-1 rounded-full">
                        <Text className="text-xs text-primary break-keep">正位</Text>
                      </View>
                    )}
                  </View>

                  {/* 关键词 */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold text-white break-keep mb-2">关键词</Text>
                    <View className="flex flex-wrap gap-2">
                      {(drawn.is_reversed ? card.keywords_reversed : card.keywords_upright).map((keyword, i) => (
                        <View key={i} className="bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
                          <Text className="text-xs text-white break-keep">{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 牌义解读 */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold text-foreground break-keep mb-2">牌义解读</Text>
                    <Text className="text-sm text-muted-foreground break-keep leading-relaxed">
                      {drawn.is_reversed ? card.meaning_reversed : card.meaning_upright}
                    </Text>
                  </View>

                  {/* 行动建议 */}
                  <View className="bg-secondary/10 rounded-xl p-4 border border-secondary/30">
                    <View className="flex items-start">
                      <View className="i-mdi-lightbulb text-xl text-secondary-foreground mr-2 mt-0.5" />
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-foreground break-keep mb-1">行动建议</Text>
                        <Text className="text-sm text-muted-foreground break-keep leading-relaxed">
                          {drawn.is_reversed ? card.advice_reversed : card.advice_upright}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* AI详细解读 */}
        <View className="px-6 mb-6">
          <View className="bg-gradient-card rounded-2xl p-5 border border-border">
            <View
              className="flex items-center justify-between mb-3"
              onClick={() => setShowAIInterpretation(!showAIInterpretation)}>
              <View className="flex items-center">
                <View className="i-mdi-robot text-2xl text-primary mr-2" />
                <Text className="text-lg font-bold text-foreground break-keep">AI深度解读</Text>
              </View>
              <View
                className={`i-mdi-chevron-${showAIInterpretation ? 'up' : 'down'} text-2xl text-muted-foreground`}
              />
            </View>

            {showAIInterpretation && (
              <View className="pt-3 border-t border-border">
                {!aiInterpretation && (
                  <View className="text-center py-8">
                    <View className="i-mdi-sparkles text-5xl text-primary mb-4 glow-primary" />
                    <Text className="text-sm text-muted-foreground break-keep mb-4">
                      结合您的问题和牌面信息,AI将为您生成更深入的个性化解读
                    </Text>
                    <Button
                      className="bg-gradient-primary text-white py-4 px-8 rounded-xl break-keep text-base font-bold"
                      size="default"
                      onClick={handleGetAIInterpretation}
                      disabled={loadingAI}>
                      {loadingAI ? '生成中...' : '生成AI解读'}
                    </Button>
                  </View>
                )}

                {aiInterpretation && (
                  <View>
                    {/* 每张牌的AI解读 */}
                    {aiInterpretation.cardInterpretations.map((interp, index) => (
                      <View key={index} className="mb-6">
                        <View className="flex items-center mb-3">
                          <View className="bg-primary/20 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                            <Text className="text-sm font-bold text-primary break-keep">{index + 1}</Text>
                          </View>
                          <Text className="text-base font-bold text-foreground break-keep">
                            {interp.position} - {interp.cardName}({interp.orientation})
                          </Text>
                        </View>
                        <View className="bg-card/50 rounded-xl p-4 border border-border/50">
                          <Text className="text-sm text-muted-foreground break-keep leading-relaxed whitespace-pre-wrap">
                            {interp.interpretation}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* AI总述 */}
                    <View className="mt-6 pt-6 border-t border-border">
                      <View className="flex items-center mb-3">
                        <View className="i-mdi-chart-box text-2xl text-accent mr-2" />
                        <Text className="text-lg font-bold text-foreground break-keep">AI总述</Text>
                      </View>
                      <View className="bg-accent/10 rounded-xl p-4 border border-accent/30">
                        <Text className="text-sm text-white break-keep leading-relaxed whitespace-pre-wrap">
                          {aiInterpretation.summary}
                        </Text>
                      </View>
                    </View>

                    {/* 重新生成按钮 */}
                    <View className="mt-4 text-center">
                      <Button
                        className="bg-card text-foreground py-3 px-6 rounded-xl break-keep text-sm border border-border"
                        size="default"
                        onClick={handleGetAIInterpretation}
                        disabled={loadingAI}>
                        {loadingAI ? '生成中...' : '重新生成解读'}
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* 整体牌阵总结 */}
        <View className="px-6 mb-6">
          <View className="bg-gradient-card rounded-2xl p-5 border border-border">
            <View className="flex items-center justify-between mb-3" onClick={() => setShowSummary(!showSummary)}>
              <View className="flex items-center">
                <View className="i-mdi-chart-timeline-variant text-2xl text-accent mr-2" />
                <Text className="text-lg font-bold text-foreground break-keep">整体牌阵解读</Text>
              </View>
              <View className={`i-mdi-chevron-${showSummary ? 'up' : 'down'} text-2xl text-muted-foreground`} />
            </View>

            {showSummary && (
              <View className="pt-3 border-t border-border">
                {/* AI生成按钮 */}
                {!aiSummary && (
                  <View className="text-center py-6 mb-4">
                    <View className="i-mdi-auto-fix text-4xl text-accent mb-3 glow-accent" />
                    <Text className="text-sm text-muted-foreground break-keep mb-4">使用AI生成更深入的整体解读</Text>
                    <Button
                      className="bg-gradient-primary text-white py-3 px-6 rounded-xl break-keep text-sm font-bold"
                      size="default"
                      onClick={handleGetAISummary}
                      disabled={loadingSummary}>
                      {loadingSummary ? '生成中...' : '生成AI解读'}
                    </Button>
                  </View>
                )}

                {/* AI生成的总结 */}
                {aiSummary && (
                  <View className="mb-4">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-sparkles text-xl text-primary mr-2" />
                      <Text className="text-sm font-bold text-foreground break-keep">AI智能解读</Text>
                    </View>
                    <View className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                      <Text className="text-sm text-white break-keep leading-relaxed whitespace-pre-wrap">
                        {aiSummary}
                      </Text>
                    </View>
                    <View className="mt-3 text-center">
                      <Button
                        className="bg-card text-foreground py-2 px-4 rounded-xl break-keep text-xs border border-border"
                        size="default"
                        onClick={handleGetAISummary}
                        disabled={loadingSummary}>
                        {loadingSummary ? '生成中...' : '重新生成'}
                      </Button>
                    </View>
                  </View>
                )}

                {/* 基础总结(始终显示) */}
                <View className="mb-4">
                  <Text className="text-sm font-bold text-foreground break-keep mb-2">基础解读</Text>
                  <Text className="text-sm text-muted-foreground break-keep leading-relaxed whitespace-pre-wrap">
                    {generateSummary()}
                  </Text>
                </View>

                {/* 位置含义说明 */}
                <View className="mt-4 pt-4 border-t border-border/50">
                  <Text className="text-sm font-bold text-foreground break-keep mb-3">牌位含义说明</Text>
                  <View className="space-y-2">
                    {selectedSpread.positions.map((pos, index) => (
                      <View key={index} className="flex items-start">
                        <View className="bg-accent/20 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          <Text className="text-xs font-bold text-accent break-keep">{index + 1}</Text>
                        </View>
                        <Text className="text-sm text-muted-foreground break-keep flex-1">
                          {pos.meaning}: 代表
                          {pos.meaning === '过去'
                            ? '已经发生的事情和影响'
                            : pos.meaning === '现在'
                              ? '当前的状态和处境'
                              : pos.meaning === '未来'
                                ? '即将到来的发展趋势'
                                : '该方面的状况和建议'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 互动提示 */}
                <View className="mt-4 bg-accent/10 rounded-xl p-4 border border-accent/30">
                  <View className="flex items-start">
                    <View className="i-mdi-comment-question text-xl text-accent mr-2 mt-0.5" />
                    <View className="flex-1 border-solid border-[#000000] border-[0px] border-[#b3abba]">
                      <Text className="text-sm break-keep leading-relaxed text-[#d0d0d0]">
                        如需更深入的解读,建议您记录下这次占卜结果,结合实际情况反复思考。您也可以在占卜记录中查看历史占卜,对比不同时期的牌面变化。
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 操作按钮 */}
        <View className="px-6 mb-6">
          <View className="space-y-3">
            <Button
              className="w-full bg-gradient-primary text-white py-5 rounded-xl break-keep text-lg font-bold"
              size="default"
              onClick={handleDivineAgain}>
              再次占卜
            </Button>
            <View className="flex gap-3">
              <Button
                className="flex-1 bg-card text-foreground py-4 rounded-xl break-keep text-sm border border-border"
                size="default"
                onClick={handleViewHistory}>
                查看记录
              </Button>
              {getEnv() === 'WEAPP' ? (
                <Button
                  openType="share"
                  className="flex-1 bg-secondary text-secondary-foreground rounded-xl break-keep">
                  <View className="flex items-center justify-center gap-1 py-4">
                    <View className="i-mdi-share-variant text-lg" />
                    <Text className="text-sm">分享结果</Text>
                  </View>
                </Button>
              ) : (
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center leading-none break-keep rounded-xl bg-secondary"
                  onClick={handleShare}>
                  <div className="flex items-center gap-1 py-4 px-4">
                    <View className="i-mdi-share-variant text-lg text-secondary-foreground" />
                    <span className="text-sm text-secondary-foreground">分享结果</span>
                  </div>
                </button>
              )}
            </View>
          </View>
        </View>

        {/* 底部提示 */}
        <View className="px-6 pb-8">
          <View className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <Text className="text-xs text-muted-foreground text-center break-keep">
              塔罗牌是映照内心的工具,真正的力量源于您的选择
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
