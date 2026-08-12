import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {drawRandomCards, getAllTarotCards} from '@/db/api'
import type {TarotCard} from '@/db/types'
import {useDivinationStore} from '@/store/divination'

export default function Shuffle() {
  const {selectedSpread, setDrawnCards} = useDivinationStore()
  const [shuffling, setShuffling] = useState(false)
  const [guideText, setGuideText] = useState('请深呼吸,集中意念')
  const [allCards, setAllCards] = useState<TarotCard[]>([])

  const loadCards = useCallback(async () => {
    const cards = await getAllTarotCards()
    setAllCards(cards)
    if (cards.length === 0) {
      Taro.showToast({title: '塔罗牌数据加载中,请稍后', icon: 'none', duration: 2000})
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // 开始洗牌
  const handleShuffle = async () => {
    if (allCards.length === 0) {
      Taro.showToast({title: '塔罗牌数据未加载完成', icon: 'none'})
      return
    }

    // 如果没有选择牌阵（快速抽牌路径），使用单张牌阵或第一个牌阵
    const spread = selectedSpread
    if (!spread) {
      Taro.showToast({title: '请先选择牌阵', icon: 'none'})
      setTimeout(() => Taro.redirectTo({url: '/pages/index/index'}), 1500)
      return
    }

    setShuffling(true)
    setGuideText('正在洗牌...')

    setTimeout(() => setGuideText('感受牌面能量...'), 1000)
    setTimeout(() => setGuideText('抽取中...'), 2000)

    setTimeout(() => {
      const drawn = drawRandomCards(allCards, spread?.card_count)
      setDrawnCards(drawn)
      Taro.redirectTo({url: '/pages/result/index'})
    }, 3000)
  }

  return (
    <View className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center px-6">
      {/* 粒子效果背景 */}
      <View className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full particle-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`
            }}
          />
        ))}
      </View>

      {/* 主内容 */}
      <View className="relative z-10 flex flex-col items-center">
        {/* 塔罗牌背面 */}
        <View className={`mb-8 ${shuffling ? 'shuffle-animation' : ''}`}>
          <View className="w-48 h-72 bg-gradient-card rounded-2xl border-2 border-primary glow-primary flex flex-col items-center justify-center">
            <View className="i-mdi-star-four-points text-6xl text-primary mb-4" />
            <Text className="text-xl font-bold gradient-text break-keep">塔罗之光</Text>
            <View className="mt-6 flex flex-col items-center">
              <View className="i-mdi-cards text-4xl text-accent" />
            </View>
          </View>
        </View>

        {/* 引导文字 */}
        <View className="text-center mb-8">
          <Text className="text-2xl font-bold text-foreground break-keep mb-2">{guideText}</Text>
          {!shuffling && <Text className="text-sm text-muted-foreground break-keep">默念您的问题,点击下方开始</Text>}
        </View>

        {/* 开始按钮 */}
        {!shuffling && (
          <View className="bg-gradient-primary px-12 py-4 rounded-full glow-primary" onClick={handleShuffle}>
            <Text className="text-lg font-bold text-white break-keep">开始洗牌</Text>
          </View>
        )}

        {/* 洗牌中的加载提示 */}
        {shuffling && (
          <View className="flex flex-col items-center">
            <View className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <Text className="text-sm text-muted-foreground break-keep">请保持专注...</Text>
          </View>
        )}
      </View>

      {/* 底部提示 */}
      <View className="absolute bottom-8 left-0 right-0 px-6">
        <View className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <Text className="text-xs text-muted-foreground text-center break-keep">
            塔罗牌是映照内心的工具,真正的力量源于您的选择
          </Text>
        </View>
      </View>
    </View>
  )
}
