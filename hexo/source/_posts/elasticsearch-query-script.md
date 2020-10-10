---
title: Advanced Filter on Kibana
date: 2020-10-10 15:22:50
tags: Kibana
---

# Advanced Filter on Kibana

## 背景

在 Kibana 上，我们经常使用 Filter 来过滤掉无用的信息。比如，我想关注 `_id` 为 123 的用户的一些指标，只需要添加一个这样的 Filter 就可以了：

![normal_filter](/img/elasticsearch-filter/normal_filter.png)

但有的时候，我们会遇到一些更复杂的场景：比如，我现在想关注 id 尾号后两位介于 20 - 30 之间的用户。这个时候，平常用的简单的 Filter 就无法胜任了。

## 解决方法

点击 Edit Query DSL，就可以编写 ElasticSearch Query DSL。这个 DSL 的规则看起来很复杂，学习门槛比较高。但好处是，它同样支持 [Script Query](https://www.elastic.co/guide/en/elasticsearch/reference/6.7/query-dsl-script-query.html) ，编写脚本就可以指定查询规则了！

示例如下：

```json
{
  "query": {
    "bool": {
      "filter": {
        "script": {
          "script": {
            "source": "doc['_id'].value % 100 >= 20 && doc['device_id'].value % 100 <= 30",
            "lang": "painless"
          }
        }
      }
    }
  }
}
```

大功告成！😊

