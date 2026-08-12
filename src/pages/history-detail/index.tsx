import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getEnv, useShareAppMessage, useShareTimeline} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'

export default function HistoryDetail() {
  const [record, setRecord] = useState<any>(null)

  const loadRecord = useCallback(() => {
    try {
      const data = Taro.getStorageSync('current_record')
      if (data) {
        setRecord(data)
      } else {
        Taro.showToast({title: '记录不存在', icon: 'none'})
        setTimeout(() => Taro.navigateBack(), 1500)
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      Taro.navigateBack()
    }
  }, [])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  // 分享配置
  useShareAppMessage(() => ({
    title: `我在塔罗之光进行了${record?.spread_info?.name}占卜`,
    path: '/pages/index/index'
  }))

  useShareTimeline(() => ({
    title: `我在塔罗之光进行了${record?.spread_info?.name}占卜`
  }))

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

  // 格式化时间
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (!record) {
    return null
  }

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 头部 */}
        <View className="px-6 pt-8 pb-6">
          <View className="text-center mb-6">
            <View className="i-mdi-book-open text-5xl text-accent mb-3 glow-accent" />
            <Text className="text-2xl font-bold text-foreground break-keep mb-2">占卜详情</Text>
            <Text className="text-sm text-muted-foreground break-keep">{formatDateTime(record.created_at)}</Text>
          </View>

          {/* 牌阵和问题 */}
          <View className="bg-gradient-card rounded-2xl p-5 mb-6 border border-border">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-lg font-bold text-foreground break-keep">{record.spread_info?.name}</Text>
              <View className="bg-primary/20 px-3 py-1 rounded-full">
                <Text className="text-xs text-white break-keep">{record.cards_drawn.length}张牌</Text>
              </View>
            </View>
            {record.question && (
              <View className="bg-muted/30 rounded-xl p-3 border border-border/50">
                <Text className="text-sm text-muted-foreground break-keep">问题: {record.question}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 抽取的牌 */}
        <View className="px-6 mb-6">
          {record.cards_drawn.map((drawn: any, index: number) => {
            const card = drawn.card_info
            if (!card) return null

            const positionInfo = record.spread_info?.positions?.[index]

            return (
              <View key={index} className="mb-6">
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
                      {(drawn.is_reversed ? card.keywords_reversed : card.keywords_upright).map(
                        (keyword: string, i: number) => (
                          <View key={i} className="bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
                            <Text className="text-xs text-white break-keep">{keyword}</Text>
                          </View>
                        )
                      )}
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

        {/* 分享按钮 */}
        <View className="px-6 mb-8">
          {getEnv() === 'WEAPP' ? (
            <Button openType="share" className="w-full bg-secondary text-secondary-foreground rounded-xl break-keep">
              <View className="flex items-center justify-center gap-2 py-4">
                <View className="i-mdi-share-variant text-xl" />
                <Text className="text-base">分享结果</Text>
              </View>
            </Button>
          ) : (
            <button
              type="button"
              className="flex items-center justify-center leading-none break-keep rounded-xl bg-secondary w-full"
              onClick={handleShare}>
              <div className="flex items-center gap-2 py-4 px-6">
                <View className="i-mdi-share-variant text-xl text-secondary-foreground" />
                <span className="text-base text-secondary-foreground">分享结果</span>
              </div>
            </button>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
