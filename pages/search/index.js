const BOOK = require('../../utils/book-dict.js')

Page({
  data: {
    // 图书教辅快速筛选(与输入关键词组合搜索)
    grades: BOOK.GRADES,
    subjects: BOOK.SUBJECTS,
    versions: BOOK.VERSIONS,
    selGrade: '',
    selSubject: '',
    selVersion: '',
    inputVal: '',
  },
  onLoad: function (options) {
    const hot_search_words = wx.getStorageSync('hot_search_words')
    this.setData({
      list: wx.getStorageSync('searchHis'),
      hot_search_words: hot_search_words ? hot_search_words.split(',') : null
    })
  },
  onShow: function () {

  },
  // 输入框实时内容(用于组合关键词)
  onInput(e) {
    this.setData({
      inputVal: e.detail
    })
  },
  // 组合筛选芯片点击
  onChipTap(e) {
    const group = e.currentTarget.dataset.group
    const val = e.currentTarget.dataset.val
    const keyMap = {
      grade: 'selGrade',
      subject: 'selSubject',
      version: 'selVersion'
    }
    const key = keyMap[group]
    if (!key) {
      return
    }
    // 再次点击取消选择
    const patch = {}
    patch[key] = (this.data[key] == val) ? '' : val
    this.setData(patch)
  },
  doSearch(kwInput) {
    const kw = BOOK.buildBookKeyword([
      this.data.selGrade,
      this.data.selSubject,
      this.data.selVersion,
      kwInput
    ])
    if (!kw) {
      wx.showToast({
        title: '输入书名或选择年级学科',
        icon: 'none'
      })
      return
    }
    let searchHis = wx.getStorageSync('searchHis')
    const hisWord = kwInput || kw
    if (!searchHis) {
      searchHis = [hisWord]
    }
    if (!searchHis.includes(hisWord)) {
      searchHis.push(hisWord)
    }
    wx.setStorageSync('searchHis', searchHis)
    this.setData({
      list: searchHis
    })
    wx.navigateTo({
      url: '/pages/goods/list?name=' + kw,
    })
  },
  // 键盘确认搜索
  search(e) {
    this.doSearch(e.detail)
  },
  // 点"搜索"按钮
  onTapSearch() {
    this.doSearch(this.data.inputVal)
  },
  onClose(e) {
    const idx = e.currentTarget.dataset.idx
    const searchHis = this.data.list
    searchHis.splice(idx, 1)
    wx.setStorageSync('searchHis', searchHis)
    this.setData({
      list: searchHis
    })
  },
  go(e) {
    const idx = e.currentTarget.dataset.idx
    const keywords = this.data.list[idx]
    wx.navigateTo({
      url: '/pages/goods/list?name=' + keywords,
    })
  },
  go2(e) {
    const idx = e.currentTarget.dataset.idx
    const keywords = this.data.hot_search_words[idx]
    wx.navigateTo({
      url: '/pages/goods/list?name=' + keywords,
    })
  },
  searchscan() {
    wx.scanCode({
      scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
      success: res => {
        wx.navigateTo({
          url: '/pages/goods/list?name=' + res.result,
        })
      }
    })
  }
})
