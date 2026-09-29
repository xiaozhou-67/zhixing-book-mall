const WXAPI = require('apifm-wxapi')
const TOOLS = require('../../utils/tools.js')
const NAV = require('../../utils/nav.js')

const app = getApp()

Page({
  data: {
    mallName: '知行书城',
    banners: undefined,       // 首页轮播图(后台 banner 自定义类型 index)
    notice: undefined,        // 最新一条公告
    booksNav: undefined,      // 金刚区快捷入口
    goodsRecommend: undefined, // 新书推荐
    hotGoods: undefined,      // 热销榜单
    // 金刚区:关键词直达商品列表(商品命名规范见 docs/项目报告.md)
    navItems: [
      { key: 'jiaocai',   icon: 'bookmark-o',   label: '教材同步', keyword: '教材同步' },
      { key: 'shijuan',   icon: 'notes-o',      label: '试卷真题', keyword: '试卷真题' },
      { key: 'mingzhu',   icon: 'gem-o',        label: '名著阅读', keyword: '名著阅读' },
      { key: 'gongjushu', icon: 'guide-o',      label: '工具书',   keyword: '工具书' },
      { key: 'vip',       icon: 'medal-o',      label: 'VIP会员',  url: '/pages/vip/index' },
      { key: 'coupon',    icon: 'coupon-o',     label: '领券中心', url: 'tab:/pages/coupons/index' },
      { key: 'sign',      icon: 'calendar-o',   label: '每日签到', url: '/pages/sign/index' },
      { key: 'score',     icon: 'points',       label: '积分商城', url: '/pages/score-excharge/index' },
    ],
  },

  onLoad() {
  },

  onShow() {
    this.readConfigVal()
    this.fetchBanners()
    this.fetchNotice()
    this.fetchGoodsRecommend()
    this.fetchHotGoods()
    getApp().configLoadOK = () => {
      this.readConfigVal()
    }
  },

  readConfigVal() {
    const mallName = wx.getStorageSync('mallName')
    if (mallName) {
      this.setData({ mallName })
      wx.setNavigationBarTitle({ title: mallName })
    }
    this.setData({
      show_seller_number: wx.getStorageSync('show_seller_number')
    })
    // 多门店模式:未选择门店时先去选门店
    const shopMod = wx.getStorageSync('shopMod')
    const shopInfo = wx.getStorageSync('shopInfo')
    if (shopMod == '1' && !shopInfo) {
      wx.redirectTo({
        url: '/pages/shop/select'
      })
    }
  },

  async fetchBanners() {
    // https://www.yuque.com/apifm/nu0f75/wg5t98
    const res = await WXAPI.banners({ type: 'index' })
    if (res.code == 0) {
      this.setData({ banners: res.data })
    } else {
      this.setData({ banners: null })
    }
  },

  fetchNotice() {
    WXAPI.noticeList({ pageSize: 1 }).then(res => {
      if (res.code == 0 && res.data && res.data.length > 0) {
        this.setData({ notice: res.data[0] })
      }
    })
  },

  fetchGoodsRecommend() {
    WXAPI.goodsv2({
      recommendStatus: 1,
      pageSize: 6,
    }).then(res => {
      if (res.code == 0 && res.data.result.length > 0) {
        this.setData({ goodsRecommend: res.data.result })
      } else {
        this.setData({ goodsRecommend: null })
      }
    })
  },

  fetchHotGoods() {
    WXAPI.goodsv2({
      orderBy: 'ordersDown',
      pageSize: 10,
    }).then(res => {
      if (res.code == 0 && res.data.result.length > 0) {
        this.setData({ hotGoods: res.data.result })
      } else {
        this.setData({ hotGoods: null })
      }
    })
  },

  goSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    })
  },

  // 金刚区入口
  onNavTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item) {
      return
    }
    if (item.url) {
      if (item.url.indexOf('tab:') == 0) {
        wx.switchTab({ url: item.url.substring(4) })
      } else {
        wx.navigateTo({ url: item.url })
      }
    } else if (item.keyword) {
      wx.navigateTo({
        url: '/pages/goods/list?name=' + item.keyword
      })
    }
  },

  // banner 轮播点击(链接由后台下发)
  onBannerTap(e) {
    const item = e.currentTarget.dataset.item
    NAV.go(item.linkUrl, item.appid)
  },

  goNotice() {
    if (!this.data.notice) {
      return
    }
    wx.navigateTo({
      url: '/pages/notice/show?id=' + this.data.notice.id
    })
  },

  goVip() {
    wx.navigateTo({
      url: '/pages/vip/index'
    })
  },

  goCategory() {
    wx.switchTab({
      url: '/pages/category/category'
    })
  },

  // 商品卡片点击
  toDetail(e) {
    wx.navigateTo({
      url: '/pages/goods-details/index?id=' + e.currentTarget.dataset.id
    })
  },

  onPullDownRefresh() {
    this.fetchBanners()
    this.fetchNotice()
    this.fetchGoodsRecommend()
    this.fetchHotGoods()
    wx.stopPullDownRefresh()
  },

  onShareAppMessage() {
    return {
      title: wx.getStorageSync('mallName') || '知行书城',
      path: '/pages/index/index?inviter_id=' + wx.getStorageSync('uid')
    }
  },
})
