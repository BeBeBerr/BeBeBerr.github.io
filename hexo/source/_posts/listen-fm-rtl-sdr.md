---
title: Listening to FM Radio with RTL-SDR
date: 2020-04-10 01:07:09
tags: SDR
---

# Listening to FM Radio with RTL-SDR

【RTL-SDR 上手】

上大学的时候用 Pluto-SDR 做过一个简单的小项目。那个时候刚刚听说 SDR，认识还比较模糊，也就没想到什么好的玩法，导致白白浪费了不少宝贵的资源。最近工作压力比较大，总想找个别的东西玩一玩儿，就又想起了无线电 —— 也算是重操旧业了吧。

## 设备

大三的时候玩的 Pluto-SDR 其实性能很好，而且是全双工的。但是价格较贵，要 RMB 1000+ 左右。其他类似的 SDR 平台，例如 HackRF 等也都差不多这个价位。只好退而求其次，买个 RTL-SDR 先尝试下，有意思的话再上更高端的型号。

RTL-SDR 性能差，一开始就是个电视棒而已，但是价格非常低廉（RMB 40 元左右），是入门 SDR 的不二选择。我这里买的是两个端口的型号，支持的频谱范围更广一点，价格在 100 元左右。

![rtl-sdr-device](/img/listen-fm-rtl-sdr/rtl-sdr-device.jpg)

## 上手

一些开源软件在 Linux 上的支持比 macOS 上更友好一些，因此还是在虚拟机上跑了个 Ubuntu。

首先把一些常用的工具安装上：

```shell
sudo apt-get update
sudo apt-get upgrade

sudo apt-get install git
sudo apt-get install cmake
sudo apt-get install build-essential
```

接下来要装一个用于访问 USB 设备的 C 语言库：

```shell
sudo apt-get install libusb-1.0-0-dev
```

然后安装 RTL SDR 的驱动程序：

```shell
git clone git://git.osmocom.org/rtl-sdr.git
cd rtl-sdr/
mkdir build
cd build
cmake ../ -DINSTALL_UDEV_RULES=ON
make
sudo make install
sudo ldconfig
sudo cp ../rtl-sdr.rules /etc/udev/rules.d/
```

这中间在 cmake 的时候出了一个问题，卡了一两个小时的样子。执行 cmake 的时候，报下面的错误：

```
CMake Error at CMakeLists.txt:77 (message):
  LibUSB 1.0 required to compile rtl-sdr
```

奇怪的是，我们之前已经安装了 libusb 库。如果直接去 Google 这个错误的时候，会发现大家也都是在说需要安装 libusb。最开始是怀疑安装的有问题，但是卸载重装也没用，而且是能找到 header 文件的。

这个时候我注意到安装的库对应的架构师 AMD64，一开始还怀疑是虚拟机的原因，是不是虚拟化成 AMD 系列的 CPU 了。后来用 `arch` 命令看了下是 X86 的。就去 Ubuntu 的资源站看了下，发现没有 X86 架构的 libusb，只有 i386 。但是强行指定 i386 也没用。后来发现 AMD64 这个名字比较迷惑，其实 Ubuntu 下 AMD64 只用来指代 64 位操作系统，和 CPU 架构无关，闹了个乌龙 😭。

然后又仔细看了下 cmake 输出的 log 文件，发现有这么个错：

```shell
CheckSymbolExists.c:(.text+0x1b): undefined reference to `pthread_create'
```

找不到 pthread，这就很诡异了，而且检查了本地的 pthread 库也没有问题。后来发现这是 cmake 的 bug 😓 参见 StackOverflow 上的[问答](https://stackoverflow.com/questions/24813827/cmake-failing-to-detect-pthreads-due-to-warnings/25130590#25130590) 。

之后只好再仔细看 osmocom 官网 [wiki](https://osmocom.org/projects/rtl-sdr/wiki/Rtl-sdr) ，发现还有一种用 autotools 编译的方法。想着即使编不过，也能给我个正常的错误提示吧，结果又出了奇怪的错，说有个宏找不到。

这个时候突然惊醒了我，不会是这个鬼 driver 的 master 分支不稳定吧！赶紧去 GitHub 的镜像看了下 release 的版本，发现最新的是 0.6.0。于是 checkout 到这个 tag 下，再编译，果然顺利通过了！所以是谁把 master 分支搞坏掉的，坑死我了。

之后就可以顺利的安装 gqrx 来收听 FM 广播了。调到 FM 87.6 MHz （北京文艺广播），效果还可以，虽然有一些杂音，但还是可以听清人声的。

![desktop](/img/listen-fm-rtl-sdr/desktop.jpg)

总之，业余有个东西折腾下还是挺开心的。

## 参考

有一个特别好的入门教程，在 https://ranous.wordpress.com/rtl-sdr4linux/

但是我们都知道这种小众的网站都是不太稳定的，说不定哪天就打不开了…… 但是这个教程实在太好了，所以我就在我自己的服务器上备份了一下：http://share.luyuan.wang/sdr/（当然我的服务器就更不稳定了，哈哈）

还有一些很好的系列教程，如下：

1. https://payatu.com/getting-started-radio-hacking-part-2-listening-fm-using-rtl-sdr-gqrx
2. https://charlesreid1.com/wiki/DVB-T_USB_SDR
3. https://luaradio.io/new-to-sdr.html

