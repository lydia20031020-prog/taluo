import {Text, Textarea, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useState} from 'react'
import {useDivinationStore} from '@/store/divination'

export default function QuestionInput() {
  const {selectedSpread, question, setQuestion} = useDivinationStore()
  const [localQuestion, setLocalQuestion] = useState(question)

  // 开始占卜
  const handleStartDivination = () => {
    setQuestion(localQuestion.trim())
    Taro.navigateTo({url: '/pages/shuffle/index'})
  }

  // 随机抽牌(不输入问题)
  const handleRandomDraw = () => {
    setQuestion('')
    Taro.navigateTo({url: '/pages/shuffle/index'})
  }

  if (!selectedSpread) {
    Taro.showToast({
      title: '请先选择牌阵',
      icon: 'none'
    })
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
    return null
  }

  return (
    <View className="min-h-screen bg-gradient-dark px-6 py-8">
      {/* 头部 */}
      <View className="text-center mb-8">
        <View className="i-mdi-help-circle text-5xl text-primary mb-3 glow-primary" />
        <Text className="text-2xl font-bold text-foreground break-keep mb-2">提出你的问题</Text>
        <Text className="text-sm text-muted-foreground break-keep">或直接随机抽牌,让塔罗为你指引</Text>
      </View>
      {/* 牌阵信息 */}
      <View className="bg-gradient-card rounded-2xl p-5 mb-6 border border-border">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-lg font-bold text-foreground break-keep">{selectedSpread.name}</Text>
          <View className="bg-primary/20 px-3 py-1 rounded-full">
            <Text className="text-xs text-white break-keep">{selectedSpread.card_count}张牌</Text>
          </View>
        </View>
        <Text className="text-sm text-muted-foreground break-keep">{selectedSpread.description}</Text>
      </View>
      {/* 问题输入 */}
      <View className="mb-6">
        <Text className="text-base text-foreground mb-3 break-keep">你的问题(可选)</Text>
        <View className="rounded-xl border border-border/60 px-4 py-3" style={{background: 'transparent'}}>
          <Textarea
            className="w-full text-foreground"
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              minHeight: '120px',
              color: 'hsl(var(--foreground))',
              fontSize: '16px',
              lineHeight: '1.6'
            }}
            placeholder="请输入你的问题..."
            placeholderStyle="color: hsl(var(--muted-foreground)); font-size: 16px;"
            value={localQuestion}
            onInput={(e) => setLocalQuestion(e.detail.value)}
            maxlength={200}
          />
        </View>
        <Text className="text-xs text-muted-foreground mt-2 break-keep">{localQuestion.length}/200</Text>
      </View>
      {/* 引导提示 */}
      <View className="bg-accent/10 rounded-xl p-4 mb-8 border border-accent/30">
        <View className="flex items-start">
          <View className="i-mdi-lightbulb text-xl text-accent mr-2 mt-0.5" />
          <View className="flex-1">
            <Text className="text-sm break-keep border-[0px] border-solid border-[#b3abba] text-[#b3abba]">
              提示: 问题越具体,解读越精准。建议使用开放式问题,如"如何..."、"什么..."而非"是否..."
            </Text>
          </View>
        </View>
      </View>
      {/* 操作按钮 */}
      <View className="flex flex-col gap-4">
        <button
          type="button"
          className="flex items-center justify-center leading-none break-keep rounded-xl bg-gradient-primary w-full"
          onClick={handleStartDivination}>
          <div className="py-5 px-6 text-xl font-bold text-white">开始占卜</div>
        </button>
        <button
          type="button"
          className="flex items-center justify-center leading-none break-keep rounded-xl bg-card border border-border w-full"
          onClick={handleRandomDraw}>
          <div className="py-4 px-6 text-xl text-foreground">随机抽牌</div>
        </button>
      </View>
      {/* 底部提示 */}
      <View className="mt-8 text-center">
        <Text className="text-xs text-muted-foreground break-keep">请深呼吸,集中意念,感受牌面能量</Text>
      </View>
    </View>
  )
}
