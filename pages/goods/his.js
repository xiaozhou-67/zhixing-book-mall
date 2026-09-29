const WXAPI = require('apifm-wxapi')
const TOOLS = require('../../utils/tools.js')
const dayjs = require("dayjs")

Page({
  data: {
    name: '',
    page: 1,
    pageSize: 20,
    noMore: false,
    loaded: false,           // 首次加载完成标志，防止空状态闪烁
    categoryIndex: -1,
    dayArray: ['全部', '一周内', '一月内', '半年内', '一年内'],
    dayIndex: -1,
    goods: null,
    skuCurGoods: undefined,  // 传给 goods-pop，触发 SKU 弹窗
    totalCartNum: 0,         // 购物车总数，用于浮动按钮红点
  },

  onLoad: function (options) {
    this.setData({
      name: options.name,
      categoryId: options.categoryId
    })
    this.search()
    this.categories()
  },

  onShow: function () {
    this.refreshCartNum()
  },

  // ==================== 搜索 / 筛选 ====================

  search2(e) {
    this.setData({ page: 1, noMore: false, name: e.detail })
    this.search()
  },
  search3() {
    this.setData({ page: 1, noMore: false, name: '' })
    this.search()
  },

  async search() {
    wx.showLoading({ title: '' })
    const res = await WXAPI.myBuyGoodsHisV2({
      page: this.data.page,
      pageSize: this.data.pageSize,
      nameLike: this.data.name || '',
      dateBuyBegin: this.data.dateBuyBegin || '',
      dateBuyEnd: this.data.dateBuyEnd || '',
      categoryId: this.data.categoryId || '',
      token: wx.getStorageSync('token'),
    })
    wx.hideLoading()
    if (res.code == 0) {
      const newList = res.data.result || []
      newList.forEach(ele => { ele.cartNum = 0 })
      const merged = this.data.page === 1
        ? newList
        : (this.data.goods || []).concat(newList)
      this.setData({
        goods: merged,
        loaded: true,
        noMore: newList.length < this.data.pageSize,
      })
      this.refreshCartNum()
    } else {
      if (this.data.page === 1) {
        this.setData({ goods: null, loaded: true })
      } else {
        this.setData({ noMore: true })
        wx.showToast({ title: '没有更多了', icon: 'none' })
      }
    }
  },

  onReachBottom() {
    if (this.data.noMore) return
    this.setData({ page: this.data.page + 1 })
    this.search()
  },

  // ==================== 分类 / 时间筛选 ====================

  async categories() {
    const res = await WXAPI.goodsCategory()
    if (res.code == 0) {
      const categories = res.data
      categories.forEach(p => {
        p.childs = categories.filter(ele => p.id == ele.pid)
      })
      this.setData({
        categories: [{ id: 0, name: '全部' }].concat(res.data.filter(ele => ele.level == 1))
      })
    }
  },

  categoryChange(e) {
    this.setData({
      categoryIndex: e.detail.value,
      categoryId: this.data.categories[e.detail.value].id,
      page: 1,
      noMore: false,
    })
    this.search()
  },

  dayChange(e) {
    const dayIndex = e.detail.value
    let dateBuyBegin = ''
    if (dayIndex == 1) dateBuyBegin = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    if (dayIndex == 2) dateBuyBegin = dayjs().subtract(1, 'month').format('YYYY-MM-DD')
    if (dayIndex == 3) dateBuyBegin = dayjs().subtract(6, 'month').format('YYYY-MM-DD')
    if (dayIndex == 4) dateBuyBegin = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
    this.setData({ dayIndex, dateBuyBegin, page: 1, noMore: false })
    this.search()
  },

  // ==================== 加入购物车 ====================

  async addShopCar(e) {
    const idx = e.currentTarget.dataset.idx
    const item = this.data.goods[idx]
    if (!item) return

    const token = wx.getStorageSync('token')
    if (!token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }

    // 先查商品详情，获取完整 SKU / 可选配件 / 库存信息
    wx.showLoading({ title: '加载中' })
    const detailRes = await WXAPI.goodsDetailV2({ id: item.goodsId, token })
    wx.hideLoading()

    if (detailRes.code != 0) {
      wx.showToast({ title: detailRes.msg || '商品信息获取失败', icon: 'none' })
      return
    }

    const detail = detailRes.data
    const basicInfo = detail.basicInfo

    if (basicInfo.stores <= 0) {
      wx.showToast({ title: '已售罄~', icon: 'none' })
      return
    }

    const hasProperties = detail.properties && detail.properties.length > 0
    const hasAddition = basicInfo.hasAddition

    if (hasProperties || hasAddition) {
      this.setData({
        skuCurGoods: {
          id: item.goodsId,
          stores: basicInfo.stores,
          hasAddition: hasAddition,
        }
      })
      return
    }

    // 无规格无配件，直接加购
    const res = await WXAPI.shippingCarInfoAddItem(token, item.goodsId, 1, [])
    if (res.code == 2000) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (res.code == 30002) {
      this.setData({
        skuCurGoods: {
          id: item.goodsId,
          stores: basicInfo.stores,
          hasAddition: hasAddition,
        }
      })
    } else if (res.code == 0) {
      wx.showToast({ title: '加入成功', icon: 'success' })
      this.refreshCartNum()
      TOOLS.showTabBarBadge()
    } else {
      wx.showToast({ title: res.msg, icon: 'none' })
    }
  },

  // goods-pop 组件加购成功回调
  onAddCartSuccess() {
    this.refreshCartNum()
  },

  // ==================== 购物车数量刷新 ====================

  async refreshCartNum() {
    const token = wx.getStorageSync('token')
    if (!token) return

    const totalCartNum = await TOOLS.showTabBarBadge(true)
    this.setData({ totalCartNum })

    const cartRes = await WXAPI.shippingCarInfo(token)
    if (cartRes.code != 0 || !cartRes.data || !cartRes.data.items) return

    const cartList = cartRes.data.items
    const goods = this.data.goods
    if (!goods || goods.length == 0) return

    const cartMap = {}
    cartList.forEach(cartItem => {
      const gid = cartItem.goodsId || cartItem.id
      if (!gid) return
      cartMap[gid] = (cartMap[gid] || 0) + (cartItem.number || 1)
    })

    let changed = false
    goods.forEach((item, i) => {
      const num = cartMap[item.goodsId] || 0
      if (item.cartNum !== num) {
        goods[i] = Object.assign({}, item, { cartNum: num })
        changed = true
      }
    })
    if (changed) this.setData({ goods })
  },

  // ==================== 跳转购物车 ====================

  goToCart() {
    wx.switchTab({ url: '/pages/shop-cart/index' })
  },
})
