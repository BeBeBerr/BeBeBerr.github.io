---
title: How to Show Percentage Diagram on Kibana
date: 2020-07-21 15:48:24
tags: Kibana
---

# How to Show Percentage Diagram on Kibana

我们经常通过 Kibana 来对一些线上监控数据做可视化。通过 Kibana 过滤、制作折线图等等都非常简单。然而有些场景下，我们并不关心数据的绝对值，而更想查看比例，例如某个 API 的失败率等。这个时候我们会希望绘制这样的一个折线图：x axis 为时间，y axis 为该接口的失败率。

计算比率很简单，做个除法就好。但是选中 Kibana 的 Visualize 就会发现，在 Y-Axis 的选项中并没有提供百分比或除法的选项。

<img src="/img/kibana-percent/visualize.png" alt="visualize" style="zoom:50%;" />

## 解决方法

由于 Kibana 并没有直接提供计算除法的方式，所以操作起来稍微繁琐一些。

Y-Axis Aggregation 仍选择 Count，Buckets X-Axis Aggregation 选择 Date Histogram。之后点击 Add sub-buckets - Split Series 中选择你需要展示的字段。比如我这里通过 Terms -  is_success 区分接口成功和失败。这样，折线图就被分成两条线，一个是 is_success = true ，另外一个是 false。

之后点击 Metrics & Axes，在 Y-Axes Mode 中选择 percentage。这样就会按百分比绘制了。把折线图改为 Area 可能会看得更清楚一些。效果如下图。

![percentage](/img/kibana-percent/percentage.png)