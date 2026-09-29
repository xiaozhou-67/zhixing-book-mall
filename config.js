// 知行书城 - 全局配置文件
// 文档：https://www.it120.cc/help/qr6l4m.html
module.exports = {
  version: '1.0.0',
  note: '知行书城 v1.0.0：图书零售 + 中学生教辅专用商城', // 版本描述，无需修改
  subDomain: 'bookmall', // 【必改】api工厂专属域名，注册 https://www.it120.cc 后在后台查看
  merchantId: 0, // 商户ID，0 表示不使用服务商模式；如需服务商模式，在 api工厂后台"设置--商户信息"查看
  customerServiceType: 'QW', // 客服类型：QW 企业微信（后台需配置企业ID和客服URL）；XCX 小程序默认客服
  openIdAutoRegister: true, // 用户打开小程序时自动注册新用户【用户不存在的时候】
  categorySecondPos: 0, // 分类页二级分类位置：0 显示在右侧顶部；1 左侧一级分类展开折叠展示
  couponUseMultiple: true, // 下单是否允许叠加使用多张优惠券
}
