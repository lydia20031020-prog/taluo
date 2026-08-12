// 用户状态管理

import Taro from '@tarojs/taro'
import {create} from 'zustand'

interface UserState {
  userId: string
  initUserId: () => void
}

export const useUserStore = create<UserState>((set) => ({
  userId: '',
  initUserId: () => {
    try {
      // 尝试从本地存储获取用户ID
      const storedUserId = Taro.getStorageSync('tarot_user_id')
      if (storedUserId) {
        set({userId: storedUserId})
      } else {
        // 生成新的UUID
        const newUserId = generateUUID()
        Taro.setStorageSync('tarot_user_id', newUserId)
        set({userId: newUserId})
      }
    } catch (error) {
      console.error('初始化用户ID失败:', error)
      // 如果存储失败,使用临时ID
      const tempUserId = generateUUID()
      set({userId: tempUserId})
    }
  }
}))

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
