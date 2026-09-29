/**
 * 知行书城 - 统一页面跳转工具
 * 处理后台 banner/活动下发的动态链接(linkUrl):
 *  - 小程序内部页面路径(以 / 开头):tabBar 页用 switchTab,普通页用 navigateTo
 *  - 其他小程序(appid 非空):navigateToMiniProgram
 *  - 暂不支持的链接:toast 提示
 */
const TAB_PAGES = [
  '/pages/index/index',
  '/pages/category/category',
  '/pages/coupons/index',
  '/pages/shop-cart/index',
  '/pages/my/index',
]

function go(url, appid) {
  if (!url) {
    return
  }
  // 跳转其他小程序
  if (appid) {
    wx.navigateToMiniProgram({
      appId: appid,
      complete() {}
    })
    return
  }
  if (url.indexOf('/') !== 0) {
    // 非站内路径(如 http 链接),暂不支持
    wx.showToast({
      title: '暂不支持跳转该链接',
      icon: 'none'
    })
    return
  }
  const path = url.split('?')[0]
  if (TAB_PAGES.indexOf(path) !== -1) {
    wx.switchTab({
      url: path
    })
  } else {
    wx.navigateTo({
      url: url
    })
  }
}

module.exports = {
  go: go,
}
