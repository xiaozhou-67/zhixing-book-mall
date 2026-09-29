/**
 * 知行书城 - 图书领域常量与工具
 *
 * 【约定】图书扩展信息(作者/出版社/ISBN等)保存在商品后台的"卖点/特性"字段中,
 * 内容为 JSON 字符串(不带该字段或解析失败时,自动降级为普通卖点文本展示):
 * {
 *   "author": "鲁迅",              // 作者/编者
 *   "publisher": "人民文学出版社",  // 出版社
 *   "isbn": "9787020024759",       // ISBN
 *   "publishDate": "2023-06",      // 出版时间
 *   "edition": "第3版",            // 版次(可选)
 *   "binding": "平装",             // 装帧(可选)
 *   "grade": "七年级",              // 适合年级
 *   "subject": "数学",             // 学科
 *   "version": "人教版",            // 教材版本
 *   "type": "同步练习"              // 图书类型
 * }
 */

// 学段/年级(用于筛选与商品命名规范)
const GRADES = ['七年级', '八年级', '九年级', '高一', '高二', '高三']

// 学科
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '道法', '历史', '地理', '全科']

// 教材版本
const VERSIONS = ['人教版', '北师大版', '苏教版', '沪教版', '外研版', '译林版', '统编版']

// 图书类型(教辅/读物场景)
const BOOK_TYPES = ['教材同步', '同步练习', '试卷真题', '总复习', '名著阅读', '工具书', '竞赛培优', '作文']

// 图书信息字段的中文名(详情页展示用)
const BOOK_INFO_LABELS = {
  author: '作者/编者',
  publisher: '出版社',
  isbn: 'ISBN',
  publishDate: '出版时间',
  edition: '版次',
  binding: '装帧',
  grade: '适合年级',
  subject: '学科',
  version: '教材版本',
  type: '图书类型',
}

/**
 * 解析商品的图书扩展信息
 * @param characteristic 商品后台"卖点/特性"字段原文
 * @returns {isBook: boolean, info: object, plainText: string}
 *          isBook=true 时 info 为图书信息对象;否则 plainText 为原文本
 */
function parseBookInfo(characteristic) {
  const text = characteristic ? (characteristic + '').trim() : ''
  if (!text || text.indexOf('{') !== 0) {
    return { isBook: false, info: null, plainText: text }
  }
  try {
    const info = JSON.parse(text)
    if (info && typeof info === 'object' && (info.publisher || info.isbn || info.author)) {
      return { isBook: true, info: info, plainText: '' }
    }
    return { isBook: false, info: null, plainText: text }
  } catch (e) {
    return { isBook: false, info: null, plainText: text }
  }
}

/**
 * 生成详情页图书信息卡的数据行
 */
function buildBookInfoRows(info) {
  if (!info) return []
  const rows = []
  Object.keys(BOOK_INFO_LABELS).forEach(key => {
    if (info[key]) {
      rows.push({ label: BOOK_INFO_LABELS[key], value: info[key] })
    }
  })
  return rows
}

/**
 * 把多个筛选词组合成搜索关键词
 * 注意:api工厂后台对关键词做"整串包含"模糊匹配,所以必须紧凑拼接(无分隔符),
 * 配套的商品命名规范为:[年级][学科][版本]书名,例如"七年级数学人教版五年中考三年模拟"
 * @param parts ['七年级', '数学', '人教版'] → '七年级数学人教版'
 */
function buildBookKeyword(parts) {
  return (parts || []).filter(p => !!p).join('')
}

module.exports = {
  GRADES,
  SUBJECTS,
  VERSIONS,
  BOOK_TYPES,
  BOOK_INFO_LABELS,
  parseBookInfo,
  buildBookInfoRows,
  buildBookKeyword,
}
