import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getAllTarotCards} from '@/db/api'
import type {TarotCard} from '@/db/types'

export default function CardLibrary() {
  const [cards, setCards] = useState<TarotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'major' | 'minor'>('all')

  const loadCards = useCallback(async () => {
    setLoading(true)
    const data = await getAllTarotCards()
    setCards(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // 查看牌详情
  const handleViewCard = (card: TarotCard) => {
    Taro.setStorageSync('current_card', card)
    Taro.navigateTo({url: '/pages/card-detail/index'})
  }

  // 过滤牌
  const filteredCards = cards.filter((card) => {
    if (activeTab === 'all') return true
    return card.card_type === activeTab
  })

  // 按类型分组
  const majorCards = filteredCards.filter((c) => c.card_type === 'major')
  const wandsCards = filteredCards.filter((c) => c.suit === 'wands')
  const cupsCards = filteredCards.filter((c) => c.suit === 'cups')
  const swordsCards = filteredCards.filter((c) => c.suit === 'swords')
  const pentaclesCards = filteredCards.filter((c) => c.suit === 'pentacles')

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 头部 */}
        <View className="px-6 pt-8 pb-6">
          <View className="text-center">
            <View className="i-mdi-cards text-5xl text-secondary mb-3" />
            <Text className="text-2xl font-bold text-foreground break-keep mb-2">塔罗牌库</Text>
            <Text className="text-sm text-muted-foreground break-keep">探索78张韦特塔罗牌的奥秘</Text>
          </View>
        </View>

        {/* 标签页 */}
        <View className="px-6 mb-6">
          <View className="flex gap-3 bg-card rounded-xl p-2 border border-border">
            <View
              className={`flex-1 py-2 rounded-lg text-center ${activeTab === 'all' ? 'bg-primary' : ''}`}
              onClick={() => setActiveTab('all')}>
              <Text
                className={`text-sm break-keep ${activeTab === 'all' ? 'text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
                全部({cards.length})
              </Text>
            </View>
            <View
              className={`flex-1 py-2 rounded-lg text-center ${activeTab === 'major' ? 'bg-primary' : ''}`}
              onClick={() => setActiveTab('major')}>
              <Text
                className={`text-sm break-keep ${activeTab === 'major' ? 'text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
                大阿卡纳(22)
              </Text>
            </View>
            <View
              className={`flex-1 py-2 rounded-lg text-center ${activeTab === 'minor' ? 'bg-primary' : ''}`}
              onClick={() => setActiveTab('minor')}>
              <Text
                className={`text-sm break-keep ${activeTab === 'minor' ? 'text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
                小阿卡纳(56)
              </Text>
            </View>
          </View>
        </View>

        {/* 加载状态 */}
        {loading && (
          <View className="text-center py-12">
            <View className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <Text className="text-sm text-muted-foreground break-keep">加载中...</Text>
          </View>
        )}

        {/* 牌列表 */}
        {!loading && (
          <View className="px-6 pb-8">
            {/* 大阿卡纳 */}
            {(activeTab === 'all' || activeTab === 'major') && majorCards.length > 0 && (
              <View className="mb-8">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-star-four-points text-2xl text-accent mr-2" />
                  <Text className="text-xl font-bold text-foreground break-keep">大阿卡纳</Text>
                  <Text className="text-sm text-muted-foreground ml-2 break-keep">({majorCards.length}张)</Text>
                </View>
                <View className="grid grid-cols-3 gap-3">
                  {majorCards.map((card) => (
                    <View
                      key={card.id}
                      className="bg-card rounded-xl p-3 border border-border"
                      onClick={() => handleViewCard(card)}>
                      <View className="w-full aspect-[2/3] bg-gradient-card rounded-lg border border-primary/50 overflow-hidden mb-2">
                        <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                      </View>
                      <Text className="text-xs text-foreground text-center break-keep line-clamp-1">
                        {card.name_cn}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 权杖牌组 */}
            {(activeTab === 'all' || activeTab === 'minor') && wandsCards.length > 0 && (
              <View className="mb-8">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-fire text-2xl text-destructive mr-2" />
                  <Text className="text-xl font-bold text-foreground break-keep">权杖牌组</Text>
                  <Text className="text-sm text-muted-foreground ml-2 break-keep">(火元素)</Text>
                </View>
                <View className="grid grid-cols-3 gap-3">
                  {wandsCards.map((card) => (
                    <View
                      key={card.id}
                      className="bg-card rounded-xl p-3 border border-border"
                      onClick={() => handleViewCard(card)}>
                      <View className="w-full aspect-[2/3] bg-gradient-card rounded-lg border border-primary/50 overflow-hidden mb-2">
                        <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                      </View>
                      <Text className="text-xs text-foreground text-center break-keep line-clamp-1">
                        {card.name_cn}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 圣杯牌组 */}
            {(activeTab === 'all' || activeTab === 'minor') && cupsCards.length > 0 && (
              <View className="mb-8">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-water text-2xl text-primary mr-2" />
                  <Text className="text-xl font-bold text-foreground break-keep">圣杯牌组</Text>
                  <Text className="text-sm text-muted-foreground ml-2 break-keep">(水元素)</Text>
                </View>
                <View className="grid grid-cols-3 gap-3">
                  {cupsCards.map((card) => (
                    <View
                      key={card.id}
                      className="bg-card rounded-xl p-3 border border-border"
                      onClick={() => handleViewCard(card)}>
                      <View className="w-full aspect-[2/3] bg-gradient-card rounded-lg border border-primary/50 overflow-hidden mb-2">
                        <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                      </View>
                      <Text className="text-xs text-foreground text-center break-keep line-clamp-1">
                        {card.name_cn}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 宝剑牌组 */}
            {(activeTab === 'all' || activeTab === 'minor') && swordsCards.length > 0 && (
              <View className="mb-8">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-sword text-2xl text-secondary mr-2" />
                  <Text className="text-xl font-bold text-foreground break-keep">宝剑牌组</Text>
                  <Text className="text-sm text-muted-foreground ml-2 break-keep">(风元素)</Text>
                </View>
                <View className="grid grid-cols-3 gap-3">
                  {swordsCards.map((card) => (
                    <View
                      key={card.id}
                      className="bg-card rounded-xl p-3 border border-border"
                      onClick={() => handleViewCard(card)}>
                      <View className="w-full aspect-[2/3] bg-gradient-card rounded-lg border border-primary/50 overflow-hidden mb-2">
                        <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                      </View>
                      <Text className="text-xs text-foreground text-center break-keep line-clamp-1">
                        {card.name_cn}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 星币牌组 */}
            {(activeTab === 'all' || activeTab === 'minor') && pentaclesCards.length > 0 && (
              <View className="mb-8">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-circle-multiple text-2xl text-accent mr-2" />
                  <Text className="text-xl font-bold text-foreground break-keep">星币牌组</Text>
                  <Text className="text-sm text-muted-foreground ml-2 break-keep">(土元素)</Text>
                </View>
                <View className="grid grid-cols-3 gap-3">
                  {pentaclesCards.map((card) => (
                    <View
                      key={card.id}
                      className="bg-card rounded-xl p-3 border border-border"
                      onClick={() => handleViewCard(card)}>
                      <View className="w-full aspect-[2/3] bg-gradient-card rounded-lg border border-primary/50 overflow-hidden mb-2">
                        <Image src={card.image_url} mode="aspectFit" className="w-full h-full" />
                      </View>
                      <Text className="text-xs text-foreground text-center break-keep line-clamp-1">
                        {card.name_cn}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {filteredCards.length === 0 && !loading && (
              <View className="text-center py-12">
                <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
                <Text className="text-base text-muted-foreground break-keep">暂无数据</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
