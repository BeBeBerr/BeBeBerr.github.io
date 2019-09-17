---
title: 解决Leak分析闪退问题
date: 2018-04-27 23:46:15
tags: Instruments
---

# 解决内存泄露分析导致的App闪退

我们在解决应用内存泄露的问题时，常常要用到 Instruments 调试工具的 Leak Check 工具。然而，有时打开 Leak Check，应用就闪退了，导致无法调试。

这似乎是 Xcode 的一个 bug。解决方法很简单：打开 Allocations 分析工具（而不是 Leaks）、点击右上角 + 按钮添加 Leaks 工具就可以了。