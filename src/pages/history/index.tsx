import {ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {getSpreadTypeById, getTarotCardById, getUserDivinationRecords} from '@/db/api'
import type {DivinationRecord} from '@/db/types'
import {useUserStore} from '@/store/user'

export default function History() {
  const [records, setRecords] = useState<DivinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const {userId} = useUserStore()

  const loadRecords = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const data = await getUserDivinationRecords(userId)
    setRecords(data)
    setLoading(false)
  }, [userId])

  useDidShow(() => {
    loadRecords()
  })

  // 查看记录详情
  const handleViewDetail = async (record: DivinationRecord) => {
    // 加载完整的牌信息
    const cardsWithInfo = await Promise.all(
      record.cards_drawn.map(async (drawn) => {
        const card = await getTarotCardById(drawn.card_id)
        return {...drawn, card_info: card || undefined}
      })
    )

    const spread = await getSpreadTypeById(record.spread_type_id)

    // 将数据存储到本地,供详情页使用
    Taro.setStorageSync('current_record', {
      ...record,
      cards_drawn: cardsWithInfo,
      spread_info: spread
    })

    Taro.navigateTo({url: '/pages/history-detail/index'})
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  }

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 头部 */}
        <View className="px-6 pt-8 pb-6">
          <View className="text-center">
            <View className="i-mdi-history text-5xl text-primary mb-3 glow-primary" />
            <Text className="text-2xl font-bold text-foreground break-keep mb-2">占卜记录</Text>
            <Text className="text-sm text-muted-foreground break-keep">回顾过往的神秘指引</Text>
          </View>
        </View>

        {/* 记录列表 */}
        <View className="px-6 pb-8">
          {loading && (
            <View className="text-center py-12">
              <View className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <Text className="text-sm text-muted-foreground break-keep">加载中...</Text>
            </View>
          )}

          {!loading && records.length === 0 && (
            <View className="text-center py-12">
              <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
              <Text className="text-base text-muted-foreground break-keep mb-2">暂无占卜记录</Text>
              <Text className="text-sm text-muted-foreground break-keep">开始你的第一次占卜吧</Text>
            </View>
          )}

          {!loading && records.length > 0 && (
            <View className="space-y-4">
              {records.map((record) => (
                <View
                  key={record.id}
                  className="bg-card rounded-2xl p-5 border border-border"
                  onClick={() => handleViewDetail(record)}>
                  {/* 时间 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center">
                      <View className="i-mdi-clock text-base text-muted-foreground mr-1" />
                      <Text className="text-sm text-muted-foreground break-keep">{formatTime(record.created_at)}</Text>
                    </View>
                    <View className="bg-primary/20 px-3 py-1 rounded-full">
                      <Text className="text-xs text-white break-keep">{record.cards_drawn.length}张牌</Text>
                    </View>
                  </View>

                  {/* 问题 */}
                  {record.question && (
                    <View className="mb-3">
                      <Text className="text-base text-foreground break-keep line-clamp-2">{record.question}</Text>
                    </View>
                  )}

                  {/* 牌面预览 */}
                  <View className="flex gap-2 overflow-x-auto">
                    {record.cards_drawn.slice(0, 5).map((_drawn, index) => (
                      <View
                        key={index}
                        className="flex-shrink-0 w-12 h-16 bg-gradient-card rounded border border-primary/50 flex items-center justify-center">
                        <View className="i-mdi-cards text-xl text-primary" />
                      </View>
                    ))}
                    {record.cards_drawn.length > 5 && (
                      <View className="flex-shrink-0 w-12 h-16 bg-muted/30 rounded border border-border flex items-center justify-center">
                        <Text className="text-xs text-muted-foreground break-keep">
                          +{record.cards_drawn.length - 5}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 查看详情提示 */}
                  <View className="flex items-center justify-end mt-3">
                    <Text className="text-xs text-primary break-keep mr-1">查看详情</Text>
                    <View className="i-mdi-chevron-right text-base text-primary" />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
