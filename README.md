# 水源千鹤汇率通告 · mzhr-index

一个纯属娱乐的实时网页：以 2017 年（《租借女友》连载开始）为基准，用日元兑人民币的实时汇率，换算「38.8 万元人民币预算折合多少年的水原千鹤专属陪伴」。

**在线访问：https://lanscortk.github.io/mzhr-index/**

## 指数公式

- 2017 基准汇率：1 CNY = 16.6667 JPY（即 1円 = 0.06元）
- 千鹤指数 = `-(当前汇率 / 16.6667 - 1) × 100`
- 陪伴年限 = `388,000 × 当前汇率 ÷ 200,000（日元/年）`
- 年限达到 50 年时，触发《终身套餐自动生效条款》

## 技术

纯静态页面（HTML/CSS/JS），无构建、无后端。

**汇率**（分钟级）：GitHub Actions 定时任务（约每 10 分钟）抓取 Yahoo Finance 盘中价，写入本仓库 `data` 分支的 `rate.json`，前端经 raw.githubusercontent.com 读取（CDN 缓存 5 分钟）。失败时依次回退：[ExchangeRate-API](https://www.exchangerate-api.com)（日更）→ [Frankfurter](https://frankfurter.dev)（日更）→ 内置存档数据。

**看板娘图池**（自动增长）：同一定时任务从 safebooru 拉取 `mizuhara_chizuru + solo + general` 分级的竖图列表（当前 150+ 张，随新同人图自动增加），写入 `data` 分支 `images.json`；每次刷新随机展示且不与上一张重复，远程不可用时回退到仓库内置图片。

所有梗常量集中在 `app.js` 顶部的 `CONFIG`。

> 注：GitHub 对公共仓库的定时 workflow 在仓库约 60 天无活动后会自动停用，届时到 Actions 页面手动 re-enable 即可。

## 免责声明

本项目为粉丝娱乐项目，不构成任何投资或租借建议。图片版权归 ©宫岛礼吏·讲谈社 及原插画作者所有，如有侵权请提 issue 即删。
