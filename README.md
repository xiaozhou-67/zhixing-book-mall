<div align="center">

# 📚 知行书城

> 专用于**图书零售 + 中学生教辅资料**的微信小程序商城
> 完整商城闭环 · VIP 会员 · 优惠券 · 积分签到 · 配合 api工厂后端开箱即用

</div>

## 项目简介

知行书城是一个面向中学生与家长的网络书店小程序:

- **找书高效**:搜索页/分类页内置"年级 + 学科 + 教材版本"筛选,商品详情页自动展示作者、出版社、ISBN 等图书信息卡;
- **交易完整**:商品展示 → 购物车 → 订单管理 → 微信支付,全链路可用;
- **营销齐备**:VIP 会员等级、优惠券中心、每日签到积分、积分商城;
- **开箱即用**:后端直接使用 [api工厂](https://www.it120.cc)(SaaS 电商后台),无需自建服务器与数据库,改一行配置即可联通;
- **长期维护**:原生小程序语法、结构清晰,附带静态审查脚本 `tools/static_check.py`。

## 完成人

**Changqing Zhou** · [zcq@njfu.edu.cn](mailto:zcq@njfu.edu.cn)

## 快速开始(5 步)

1. 注册微信小程序账号([mp.weixin.qq.com](https://mp.weixin.qq.com/))与 [api工厂](https://www.it120.cc/) 账号;
2. 微信开发者工具导入本项目;
3. 把 [`config.js`](config.js) 里的 `subDomain` 改成你在 api工厂的专属域名;
4. `project.config.json` 里把 `appid` 换成自己的(默认 `touristappid` 为游客模式);
5. 编译运行,在 api工厂后台录入商品即可体验完整流程。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/项目报告.md](docs/项目报告.md) | 技术栈、系统架构、一个月从零搭建计划、领域约定、代码导读、二次开发指南、FAQ、维护规范 |
| [docs/用户手册.md](docs/用户手册.md) | 买家端使用说明 + 商家端后台操作手册 |

## 核心功能

- 🏠 书城首页:banner 轮播、金刚区直达、新书推荐、热销榜单
- 🔍 教辅检索:年级/学科/版本组合筛选,按命名规范录入即可精准命中
- 📖 图书信息卡:详情页结构化展示作者/出版社/ISBN/适合年级
- 🛒 交易闭环:购物车、确认订单、微信支付、物流、退款售后、发票
- 🎫 会员营销:VIP 等级购买、优惠券(可叠加)、签到积分、积分商城
- 🧰 运营支撑:多门店自提、余额/充值/提现、公告/CMS 文章、订阅消息

## 静态审查

提交代码前请运行(需要 Python 3,可选 Node):

```bash
python tools/static_check.py
```

覆盖 JSON 校验、页面注册一致性、JS 语法、WXML 配平、路由一致性、API 方法存在性等 7 类检查。

## 目录速览

```
├── app.js / app.json / config.js   # 入口与全局配置(subDomain 在 config.js)
├── pages/                          # 全部页面(首页/分类/搜索/详情/购物车/订单/会员/积分…)
├── components/                     # 登录、SKU 弹窗、收银台、协议弹窗等组件
├── utils/book-dict.js              # 图书领域词库与信息卡解析器(项目特色)
├── tools/static_check.py           # 静态审查脚本
├── miniprogram_npm/                # 已构建依赖(Vant Weapp、apifm-wxapi 等),无需 npm install
└── docs/                           # 项目报告 + 用户手册
```

## License

[MIT](LICENSE) © Changqing Zhou
