const WXAPI = require('apifm-wxapi')
const app = getApp()
Page({
  data: {
    packageGoods: [] // 当前包裹内的商品列表
  },
  onLoad: function (e) {
    this.data.orderId = e.id
    this.data.trackingNumber = e.trackingNumber
    this.orderDetail()
  },
  onShow: function () {
  },
  async orderDetail() {
    // https://www.yuque.com/apifm/nu0f75/oamel8
    const res = await WXAPI.orderDetail(wx.getStorageSync('token'), this.data.orderId)
    if (res.code != 0) {
      wx.showModal({
        title: '错误',
        content: res.msg,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return;
    }
    const orderLogisticsShippers = res.data.orderLogisticsShippers
    let trackingNumber = this.data.trackingNumber
    if (!trackingNumber) {
      trackingNumber = res.data.logistics.trackingNumber
    }
    let shipperName = ''
    if (this.data.trackingNumber && orderLogisticsShippers) {
      const matchedShipper = orderLogisticsShippers.find(ele => ele.trackingNumber == this.data.trackingNumber)
      if (matchedShipper) {
        shipperName = matchedShipper.shipperName
      }
    }
    if (!shipperName && res.data.logistics) {
      shipperName = res.data.logistics.shipperName
    }
    let logisticsTraces = null
    let packageGoods = []
    const orderLogisticsShipperLogs = res.data.orderLogisticsShipperLogs || []
    if (this.data.trackingNumber && orderLogisticsShippers) {
      // 查看子快递单
      const entity = orderLogisticsShippers.find(ele => { return ele.trackingNumber == this.data.trackingNumber })
      if (entity && entity.traces) {
        entity.tracesArray = JSON.parse(entity.traces)
        logisticsTraces = entity.tracesArray.reverse()
      }
      // 通过 trackingNumber 找到所有匹配的 shipper ids
      const matchedShipperIds = orderLogisticsShippers
        .filter(ele => ele.trackingNumber == this.data.trackingNumber)
        .map(ele => ele.id)
      // 从 orderLogisticsShipperLogs 中筛选当前包裹的商品
      packageGoods = orderLogisticsShipperLogs.filter(log => {
        return matchedShipperIds.indexOf(log.logisticsShipperId) !== -1
      })
    } else {
      if (res.data.logisticsTraces) {
        logisticsTraces = res.data.logisticsTraces.reverse()
      }
      // 主物流单：如果有shipperLogs就用，否则展示订单全部商品
      if (orderLogisticsShipperLogs.length > 0) {
        // 找出不属于任何子包裹的商品（属于主物流单）
        const subShipperIds = (orderLogisticsShippers || []).map(ele => ele.id)
        const mainLogs = orderLogisticsShipperLogs.filter(log => {
          return subShipperIds.indexOf(log.logisticsShipperId) === -1
        })
        packageGoods = mainLogs.length > 0 ? mainLogs : (res.data.goods || []).map(g => {
          return {
            goodsName: g.goodsName,
            pic: g.pic,
            property: g.property,
            number: g.number
          }
        })
      } else {
        packageGoods = (res.data.goods || []).map(g => {
          return {
            goodsName: g.goodsName,
            pic: g.pic,
            property: g.property,
            number: g.number
          }
        })
      }
    }
    this.setData({
      trackingNumber,
      shipperName,
      orderDetail: res.data,
      logisticsTraces,
      packageGoods
    });
  },
})
