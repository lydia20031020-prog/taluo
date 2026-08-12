import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {getEnv, useDidShow, useShareAppMessage, useShareTimeline} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getAllSpreadTypes} from '@/db/api'
import type {SpreadType} from '@/db/types'
import {useDivinationStore} from '@/store/divination'
import {useUserStore} from '@/store/user'

export default function Index() {
  const [spreadTypes, setSpreadTypes] = useState<SpreadType[]>([])
  const [_loading, setLoading] = useState(true)
  const {setSelectedSpread, reset} = useDivinationStore()
  const {initUserId} = useUserStore()

  // 分享配置（必须在所有 Hook 最顶部，顺序不可变）
  useShareAppMessage(() => ({
    title: '塔罗之光 - 探索内心的神秘指引',
    path: '/pages/index/index'
  }))

  useShareTimeline(() => ({
    title: '塔罗之光 - 探索内心的神秘指引'
  }))

  // 初始化用户ID
  useDidShow(() => {
    initUserId()
  })

  // 加载牌阵类型
  const loadSpreadTypes = useCallback(async () => {
    setLoading(true)
    const types = await getAllSpreadTypes()
    setSpreadTypes(types)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSpreadTypes()
  }, [loadSpreadTypes])

  // 快速抽牌：直接跳转到洗牌页，无需依赖 spreadTypes 加载完成
  const handleQuickDraw = () => {
    reset()
    // 尝试找单张牌阵，找不到则直接跳转（shuffle 页面会检查 selectedSpread）
    const singleCardSpread = spreadTypes.find((s) => s.card_count === 1)
    if (singleCardSpread) {
      setSelectedSpread(singleCardSpread)
    }
    Taro.navigateTo({url: '/pages/shuffle/index'})
  }

  // 选择牌阵
  const handleSelectSpread = (spread: SpreadType) => {
    reset()
    setSelectedSpread(spread)
    Taro.navigateTo({url: '/pages/question-input/index'})
  }

  // 查看占卜记录
  const handleViewHistory = () => {
    Taro.navigateTo({url: '/pages/history/index'})
  }

  // 查看牌库
  const handleViewLibrary = () => {
    Taro.navigateTo({url: '/pages/card-library/index'})
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

  // 按分类分组牌阵
  const basicSpreads = spreadTypes.filter((s) => s.category === 'basic')
  const classicSpreads = spreadTypes.filter((s) => s.category === 'classic')
  const themeSpreads = spreadTypes.filter((s) => s.category === 'theme')

  return (
    <View className="min-h-screen bg-gradient-dark">
      <ScrollView scrollY style={{height: '100vh', background: 'transparent'}}>
        {/* 头部 */}
        <View className="px-6 pt-12 pb-8 text-center">
          <View className="flex flex-col items-center mb-4">
            <View className="i-mdi-crystal-ball text-6xl text-accent mb-3 glow-accent" />
            <Text className="text-4xl font-bold gradient-text-accent break-keep">塔罗之光</Text>
          </View>
          <Text className="text-base text-muted-foreground break-keep">探索内心的神秘指引</Text>
        </View>

        {/* 快速操作区 */}
        <View className="px-6 mb-8">
          <View className="bg-gradient-card rounded-2xl p-6 glow-primary">
            <Button
              className="w-full bg-gradient-primary text-white py-5 rounded-xl break-keep text-lg font-bold mb-4"
              size="default"
              onClick={handleQuickDraw}>
              快速抽牌
            </Button>
            <View className="flex gap-3">
              <Button
                className="flex-1 bg-card text-foreground py-4 rounded-xl break-keep text-sm border border-border"
                size="default"
                onClick={handleViewHistory}>
                占卜记录
              </Button>
              <Button
                className="flex-1 bg-card text-foreground py-4 rounded-xl break-keep text-sm border border-border"
                size="default"
                onClick={handleViewLibrary}>
                牌库浏览
              </Button>
            </View>
          </View>
        </View>

        {/* 基础牌阵 */}
        {basicSpreads.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex items-center mb-4">
              <View className="i-mdi-cards text-2xl text-primary mr-2" />
              <Text className="text-xl font-bold text-foreground break-keep">基础牌阵</Text>
            </View>
            <View className="flex flex-col gap-3">
              {basicSpreads.map((spread) => (
                <View
                  key={spread.id}
                  className="bg-card rounded-xl p-5 border border-border"
                  onClick={() => handleSelectSpread(spread)}>
                  <View className="flex justify-between items-center mb-2">
                    <Text className="text-lg font-bold text-foreground break-keep">{spread.name}</Text>
                    <View className="bg-primary/20 px-3 py-1 rounded-full">
                      <Text className="text-xs break-keep text-[#ffffff]">{spread.card_count}张牌</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted-foreground break-keep">{spread.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 经典牌阵 */}
        {classicSpreads.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex items-center mb-4">
              <View className="i-mdi-star-four-points text-2xl text-secondary mr-2" />
              <Text className="text-xl font-bold text-foreground break-keep">经典牌阵</Text>
            </View>
            <View className="flex flex-col gap-3">
              {classicSpreads.map((spread) => (
                <View
                  key={spread.id}
                  className="bg-card rounded-xl p-5 border border-border"
                  onClick={() => handleSelectSpread(spread)}>
                  <View className="flex justify-between items-center mb-2">
                    <Text className="text-lg font-bold text-foreground break-keep">{spread.name}</Text>
                    <View className="bg-secondary/20 px-3 py-1 rounded-full">
                      <Text className="text-xs text-white break-keep">{spread.card_count}张牌</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted-foreground break-keep">{spread.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 主题牌阵 */}
        {themeSpreads.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex items-center mb-4">
              <View className="i-mdi-lightbulb text-2xl text-accent mr-2" />
              <Text className="text-xl font-bold text-foreground break-keep">主题牌阵</Text>
            </View>
            <View className="grid grid-cols-2 gap-3">
              {themeSpreads.map((spread) => (
                <View
                  key={spread.id}
                  className="bg-gradient-card rounded-xl p-5 border border-border/50"
                  onClick={() => handleSelectSpread(spread)}>
                  <View className="flex flex-col items-center text-center">
                    <View className={`i-mdi-${getThemeIcon(spread.theme)} text-4xl text-accent mb-3 glow-accent`} />
                    <Text className="text-base font-bold text-foreground break-keep mb-1">{spread.name}</Text>
                    <View className="bg-accent/20 px-2 py-1 rounded-full">
                      <Text className="text-xs text-white break-keep">{spread.card_count}张牌</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 分享按钮 */}
        <View className="px-6 mb-6">
          {getEnv() === 'WEAPP' ? (
            <Button openType="share" className="w-full bg-secondary text-secondary-foreground rounded-xl break-keep">
              <View className="flex items-center justify-center gap-2 py-4">
                <View className="i-mdi-share-variant text-xl" />
                <Text className="text-base">分享给朋友</Text>
              </View>
            </Button>
          ) : (
            <button
              type="button"
              className="flex items-center justify-center leading-none break-keep rounded-xl bg-secondary w-full"
              onClick={handleShare}>
              <div className="flex items-center gap-2 py-4 px-6">
                <View className="i-mdi-share-variant text-xl text-secondary-foreground" />
                <span className="text-base text-secondary-foreground">分享给朋友</span>
              </div>
            </button>
          )}
        </View>

        {/* 免责声明 */}
        <View className="px-6 pb-8">
          <View className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <Text className="text-xs text-muted-foreground text-center break-keep">
              本程序仅供娱乐与自我探索,不替代专业建议
            </Text>
            <Text className="text-xs text-muted-foreground text-center break-keep mt-2">
              备案号：京ICP备2026004406号-2
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// 获取主题图标 - 统一简约风格的MDI图标
function getThemeIcon(theme: string | null): string {
  const iconMap: Record<string, string> = {
    love: 'heart', // 爱情关系 - 爱心
    career: 'briefcase', // 职业发展 - 公文包
    finance: 'currency-usd', // 财务状况 - 货币符号
    study: 'school', // 学业考试 - 学校
    growth: 'sprout', // 个人成长 - 发芽
    health: 'heart-pulse', // 身心健康 - 心跳
    relationship: 'account-multiple', // 家庭人际 - 多人
    decision: 'compass' // 重大决策 - 指南针
  }
  return iconMap[theme || ''] || 'star'
}
