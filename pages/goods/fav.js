const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const TOOLS = require('../../utils/tools.js')

Page({
  data: {
    goods: null,
    loaded: false,           // 收藏列表是否已完成首次加载，用于控制空状态显示时机
    page: 1,                 // 当前页码
    pageSize: 20,            // 每页数量
    noMore: false,           // 是否已无更多数据
    skuCurGoods: undefined,  // 传给 goods-pop 组件，触发 SKU 弹窗
    totalCartNum: 0,         // 购物车总数量，用于浮动按钮红点
  },

  onLoad: function (options) {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.goodsFavList()
      } else {
        getApp().loginOK = () => {
          this.goodsFavList()
        }
      }
    })
  },

  onShow: function () {
    // 每次页面显示时刷新购物车数量（从购物车页返回时也能更新）
    this.refreshCartNum()
  },

  // ==================== 收藏列表 ====================

  async goodsFavList() {
    wx.showLoading({ title: '加载中' })
    const _data = {
      token: wx.getStorageSync('token'),
      page: this.data.page,
      pageSize: this.data.pageSize,
    }
    const res = await WXAPI.goodsFavList(_data)
    wx.hideLoading()
    if (res.code == 0) {
      const newList = res.data || []
      newList.forEach(ele => {
        if (ele.type == 1 && ele.json) {
          ele.json = JSON.parse(ele.json)
        }
        ele.cartNum = 0
      })
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

  // 触底加载下一页
  onReachBottom() {
    if (this.data.noMore) return
    this.setData({ page: this.data.page + 1 })
    this.goodsFavList()
  },

  // ==================== 删除收藏 ====================

  async removeFav(e) {
    const idx = e.currentTarget.dataset.idx
    const fav = this.data.goods[idx]
    const res = await WXAPI.goodsFavDeleteV2({
      token: wx.getStorageSync('token'),
      goodsId: fav.goodsId,
      type: fav.type
    })
    if (res.code == 0) {
      wx.showToast({ title: '取消收藏', icon: 'success' })
      // 重置分页，从第一页重新加载
      this.setData({ page: 1, noMore: false })
      this.goodsFavList()
    } else {
      wx.showToast({ title: res.msg, icon: 'none' })
    }
  },

  // ==================== 加入购物车 ====================

  async addShopCar(e) {
    const idx = e.currentTarget.dataset.idx
    const fav = this.data.goods[idx]
    if (!fav || fav.type != 0) return

    const token = wx.getStorageSync('token')
    if (!token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }

    // 先读取商品详情，获取完整的 SKU / 可选配件 / 库存信息
    wx.showLoading({ title: '加载中' })
    const detailRes = await WXAPI.goodsDetailV2({
      id: fav.goodsId,
      token,
    })
    wx.hideLoading()

    if (detailRes.code != 0) {
      wx.showToast({ title: detailRes.msg || '商品信息获取失败', icon: 'none' })
      return
    }

    const detail = detailRes.data
    const basicInfo = detail.basicInfo

    // 库存检查
    if (basicInfo.stores <= 0) {
      wx.showToast({ title: '已售罄~', icon: 'none' })
      return
    }

    // 有 SKU（properties 有内容）或有可选配件 → 触发 goods-pop 弹窗
    const hasProperties = detail.properties && detail.properties.length > 0
    const hasAddition = basicInfo.hasAddition

    if (hasProperties || hasAddition) {
      // goods-pop 组件的 observer 接收到 skuCurGoodsBaseInfo 后会自己再调 goodsDetailV2
      // 所以这里只需传收藏列表里的基础对象（包含 id / stores / hasAddition）
      this.setData({
        skuCurGoods: {
          id: fav.goodsId,
          stores: basicInfo.stores,
          hasAddition: hasAddition,
        }
      })
      return
    }

    // 无规格无配件，直接加购
    const res = await WXAPI.shippingCarInfoAddItem(token, fav.goodsId, 1, [])
    if (res.code == 2000) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (res.code == 30002) {
      // 服务端仍然要求选规格，兜底走弹窗
      this.setData({
        skuCurGoods: {
          id: fav.goodsId,
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

  // ==================== 购物车数量刷新 ====================

  /**
   * 刷新购物车总数量 + 各商品在购物车中的数量（用于小红点展示）
   */
  async refreshCartNum() {
    const token = wx.getStorageSync('token')
    if (!token) return

    // 获取购物车总数（同时更新 TabBar badge）
    const totalCartNum = await TOOLS.showTabBarBadge(true)
    this.setData({ totalCartNum })

    // 获取购物车详细列表，统计各商品的数量
    const cartRes = await WXAPI.shippingCarInfo(token)
    if (cartRes.code != 0 || !cartRes.data || !cartRes.data.items) return

    const cartList = cartRes.data.items
    const goods = this.data.goods
    if (!goods || goods.length == 0) return

    // 按 goodsId 汇总购物车中的数量（兼容 goodsId / id 两种字段名）
    const cartMap = {}
    cartList.forEach(cartItem => {
      const gid = cartItem.goodsId || cartItem.id
      if (!gid) return
      cartMap[gid] = (cartMap[gid] || 0) + (cartItem.number || 1)
    })

    // 更新每个收藏商品的 cartNum
    let changed = false
    goods.forEach((fav, i) => {
      const num = cartMap[fav.goodsId] || 0
      if (fav.cartNum !== num) {
        goods[i] = Object.assign({}, fav, { cartNum: num })
        changed = true
      }
    })
    if (changed) {
      this.setData({ goods })
    }
  },

  // ==================== 跳转购物车 ====================

  goToCart() {
    wx.switchTab({ url: '/pages/shop-cart/index' })
  },

  // ==================== goods-pop 加购成功回调 ====================

  // goods-pop 组件在 SKU/配件弹窗加购成功后触发此事件
  onAddCartSuccess() {
    this.refreshCartNum()
  },
})
