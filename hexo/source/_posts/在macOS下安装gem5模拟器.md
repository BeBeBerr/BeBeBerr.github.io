---
title: 在macOS下安装gem5模拟器
date: 2019-03-03 21:51:09
tags: gem5
---

# 在 macOS 下安装 gem5 模拟器

Gem5 是一款 CPU 模拟器，一般用于计算机体系架构的研究工作。Gem5 可以用来模拟多种 CPU 架构，如 Alpha，ARM，SPARC，MIPS，当然还有x86。它同时支持 Linux / macOS 系统。

## 依赖

以下为必要的依赖：

- g++
- Python 2.7
- SCons 这是一个 build 管理工具，类似于 make
- zlib 这是一个数据压缩库。如果已经安装了 Xcode 命令行工具就已经包含了。如果没有，运行 `xcode-select --install ` 安装 Xcode 命令行工具。
- GNU m4 宏处理器

以下为推荐安装的依赖：

- protobuf
- pydot

在 Mac 下，使用 homebrew 安装这些依赖较为简单。基本上 `brew install <name>` 就可以搞定了。

## 下载源代码

Gem5 模拟器开放了源代码，且需要我们自己编译。通过 Git 把源码下载下来：

```shell
git clone https://gem5.googlesource.com/public/gem5
```

当然也可以使用其他的版本控制工具下载。

## 编译

Gem5 使用 SCons 作为 build 管理工具。用法是 `build/<config>/<binary>` 。Gem5 提供了多种版本，比如：

- debug
- opt
- prof
- perf
- fast

一般常用的是 opt 版本，这是带 debugging 和优化的版本。prof 和 perf 版本提供了性能分析支持，不过一般不常用。而且，编译 prof 版本可以成功，但是运行时会抛出 `__dyld section not supported` 异常。这是因为新版的 LLVM 已经不再支持 dyld 了。所以还是建议使用 opt 版本。如果我们需要 x86 架构的话：

```shell
scons build/X86/gem5.opt
```

编译耗时还是比较久的，需要耐心等待，可以去健个身之类的。

## 运行

最后可以跑一下自带的 hello world 程序，来验证 gem5 是否可用：

```shell
build/X86/gem5.opt configs/example/se.py -c tests/test-progs/hello/bin/x86/linux/hello
```

如果屏幕上成功打印出 `Hello world!` 就代表可以正常使用 gem5 模拟器了。