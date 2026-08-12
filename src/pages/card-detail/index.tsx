// @title 牌详情
import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import type {TarotCard} from '@/db/types'

export default function CardDetail() {
  const [card, setCard] = useState<TarotCard | null>(null)
  const [showReversed, setShowReversed] = useState(false)

  const loadCard = useCallback(() => {
    try {
      const data = Taro.getStorageSync('current_card')
      if (data) {
        setCard(data)
      } else {
        Taro.showToast({title: '牌信息不存在', icon: 'none'})
        setTimeout(() => Taro.navigateBack(), 1500)
      }
    } catch (error) {
      console.error('加载牌信息失败:', error)
      Taro.navigateBack()
    }
  }, [])

  useEffect(() => {
    loadCard()
  }, [loadCard])

  if (!card) return null

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 牌面图片 */}
        <View className="px-6 pt-8 pb-6">
          <View className="flex justify-center mb-6">
            <View
              className={`w-56 h-80 bg-gradient-card rounded-2xl border-2 border-primary overflow-hidden glow-primary ${showReversed ? 'rotate-180' : ''}`}>
              <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
            </View>
          </View>

          {/* 牌名 */}
          <View className="text-center mb-6">
            <Text className="text-3xl font-bold text-foreground break-keep mb-2">{card.name_cn}</Text>
            <Text className="text-base text-muted-foreground break-keep mb-3">{card.name_en}</Text>
            <View className="flex justify-center gap-2">
              <View className="bg-primary/20 px-4 py-1 rounded-full">
                <Text className="text-xs text-primary break-keep">
                  {card.card_type === 'major' ? '大阿卡纳' : '小阿卡纳'}
                </Text>
              </View>
              {card.element && (
                <View className="bg-accent/20 px-4 py-1 rounded-full">
                  <Text className="text-xs text-accent-foreground break-keep">{card.element}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 正逆位切换 */}
          <View className="flex gap-3 bg-card rounded-xl p-2 border border-border mb-6">
            <View
              className={`flex-1 py-2 rounded-lg text-center ${!showReversed ? 'bg-primary' : ''}`}
              onClick={() => setShowReversed(false)}>
              <Text
                className={`text-sm break-keep ${!showReversed ? 'text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
                正位
              </Text>
            </View>
            <View
              className={`flex-1 py-2 rounded-lg text-center ${showReversed ? 'bg-destructive' : ''}`}
              onClick={() => setShowReversed(true)}>
              <Text
                className={`text-sm break-keep ${showReversed ? 'text-destructive-foreground font-bold' : 'text-muted-foreground'}`}>
                逆位
              </Text>
            </View>
          </View>
        </View>

        {/* 牌义内容 */}
        <View className="px-6 pb-8">
          {/* 关键词 */}
          <View className="bg-card rounded-2xl p-5 border border-border mb-4">
            <Text className="text-base font-bold text-white break-keep mb-3">关键词</Text>
            <View className="flex flex-wrap gap-2">
              {(showReversed ? card.keywords_reversed : card.keywords_upright).map((keyword, i) => (
                <View key={i} className="bg-accent/10 px-4 py-2 rounded-full border border-accent/30">
                  <Text className="text-sm text-white break-keep">{keyword}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 牌义解读 */}
          <View className="bg-card rounded-2xl p-5 border border-border mb-4">
            <View className="flex items-center mb-3">
              <View className="i-mdi-book-open text-xl text-primary mr-2" />
              <Text className="text-base font-bold text-foreground break-keep">牌义解读</Text>
            </View>
            <Text className="text-sm text-muted-foreground break-keep leading-relaxed">
              {showReversed ? card.meaning_reversed : card.meaning_upright}
            </Text>
          </View>

          {/* 行动建议 */}
          <View className="bg-secondary/10 rounded-2xl p-5 border border-secondary/30">
            <View className="flex items-start">
              <View className="i-mdi-lightbulb text-2xl text-secondary-foreground mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground break-keep mb-2">行动建议</Text>
                <Text className="text-sm text-muted-foreground break-keep leading-relaxed">
                  {showReversed ? card.advice_reversed : card.advice_upright}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
