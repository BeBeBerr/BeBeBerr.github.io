---
title: FM Radio Receiver with GNU Radio
date: 2020-05-05 23:09:00
tags: SDR
---

# FM Radio Receiver with GNU Radio

GNU Radio 是用于设计、仿真、部署高可用无线电系统的框架。GNU Radio Companion（GRC）提供了一套具有图形界面的、面向 flow graph 的、模块化的信号处理方案，比较简单易用。最终，这个 flow graph 会生成一段 python 代码。

本文中就尝试了使用 GNU Radio + RTL-SDR 来实现一个 FM 接收机。

## FlowGraph 概览

信号处理中往往会有很多个阶段，每个阶段做一些不同的处理和变换，比如滤波、校验、检测等等。GRC 中，么个步骤叫做一个 block，在 flow graph 中也正好对应一个方格。GRC 本身就自带了非常多的 block，只需要配置参数就好了，很便于使用。我们当然也可以自己编程来实现自己的 block。

下图是实现 FM 接收机最终的 flow graph。

![graph](/img/fm-receiver-grc/graph.png)

GRC 里并没有内置 RTL-SDR Source Block。作为一个框架，它本身也不应该特殊支持某个特定型号的设备。我们可以自己安装：

```
sudo apt-get install gr-osmosdr
```

下面简要介绍一下这个 flow graph 的结构。第一个 Options 没有什么实际作用，只是一些基本信息。Generate Options 我选择了 QT GUI 是因为我正在使用 Linux 操作系统，就没有选用另一个 Windows 版本的 GUI 框架了。Parameter 和编程语言中的变量作用一致。所谓的 QT GUI Range 就是一个 GUI 的滑块条，运行时就可以在图形界面中滑动来选择数值了。GRC 这一点做的还是很棒的，build GUI 变得非常容易。RTL-SDR Source 是和硬件沟通的桥梁，输出分为两路，一路输入给 GUI Frequency Sink，其实就是一个 FFT 的展示。另外一路输入到 Low Pass Filter 中滤波。滤波后输入到 Wide Band FM Receive 中，最终重采样，乘以一个常数（放大），并输入到音频输出中。这样就可以听到 FM 广播了。

运行结果如下：

![ui](/img/fm-receiver-grc/ui.png)

实际收听到的声音非常的清晰锐利。

## 基本概念复习

在这里复习一些基础知识，这有助于我们明白参数的意义。

### Decimation 抽样

我们通过抽样对原始序列做下采样，这是为了减轻储存和计算的负担。概念很好理解，就是只保留 Dth 个样本。在时域中：

```
y[n] = x[nD], D = 1,2,3....
```

D 就被称为 Decimation Rate。时域上的采样会导致频域的扩展，即 `w_y = Dw_x` 。

### NBFM vs WBFM

所谓窄带调频，就是频率偏移远小于载波频率，而宽带调频相反。WBFM 可以携带更多的信息，且抗干扰能力更强，因此多用于广播。NBFM 更节约带宽，因此主要用于业余无线电和对讲机。