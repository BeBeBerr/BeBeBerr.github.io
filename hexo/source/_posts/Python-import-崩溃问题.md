---
title: Python import 崩溃问题
date: 2018-12-12 21:38:50
tags: 
---

# Python import 崩溃问题

最近遇到了一个比较诡异的问题，在一个 Python 文件中，我 import 了如下几个库：

- turtle
- time
- numpy

在另一个 Python `navigation.py` 中，我 import 了另外几个库：

- numpy
- skfuzzy
- from skfuzzy import control
- matplotlib.pyplot

两个文件分别运行时，都非常正常。但是，我在第一个文件中一旦 import `navigation.py` 文件（我想使用其中定义的函数），就会收到操作系统抛出的终端异常：

```
Terminating app due to uncaught exception 'NSInvalidArgumentException', reason: '-[NSApplication _setup:]: unrecognized selector sent to instance 0x114c65a40'
```

可以看到，这个异常是 macOS 给出来的，而并不是 Python 报给我的。

经过测试，我发现如下情况可以让程序执行：不调用 turtle 的绘图语句，或者，同时注释掉 `from skfuzzy import control` 和 `import matplotlib.pyplot` 。这就让问题显得十分诡异。

最终的解决方案是，在程序的最开始添加如下代码：

```python
from sys import platform as sys_pf
if sys_pf == 'darwin':
    import matplotlib
    matplotlib.use("TkAgg")
```

这应该是 matplotlib 的一个 bug，在 macOS 环境下，要显示指明使用 TkAgg 作为界面库。崩溃的原因或许是 turtle 和 matplotlib 绘图的机制有所冲突？

## 附记

使用 `skfuzzy` （scikit-fuzzy）库的时候，直接调用 `view()` 方法画 membership function 的曲线图无效（图片不显示），必须要先 `import matplotlib.pyplot as plt` 然后调用 `plt.show()` 才可以显示。也是个很奇怪的问题呢……

本来只是想把 Python 当作一个顺手的工具，没想到越是着急写东西越是遇到大坑，由此可见把底层原理搞明白有多么重要。