const pages = [
  'pages/index/index',
  'pages/question-input/index',
  'pages/shuffle/index',
  'pages/result/index',
  'pages/history/index',
  'pages/history-detail/index',
  'pages/card-library/index',
  'pages/card-detail/index'
]

export default defineAppConfig({
  pages,
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a0f2e',
    navigationBarTitleText: '塔罗之光',
    navigationBarTextStyle: 'white',
    backgroundColor: '#1a0f2e'
  }
})
