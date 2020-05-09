---
title: Debugging iOS App Crashes with Hopper Disassembler
date: 2020-05-09 21:34:58
tags: iOS
---

# Debugging iOS App Crashes with Hopper Disassembler

当线上的 App 发生 crash 的时候，我们总能收集到 crash 报告。很多时候，只看 crash 报告的崩溃堆栈信息就能帮助我们定位到问题了。但要想获得更多的信息，有时候就不得不去反编译我们的程序。

本文记录了一次通过反编译来帮助定位问题的经过，算是一种探索和尝试吧。

## 确定代码负责人

公司有自己的 crash 监控平台，上面看到了这样的一个堆栈情况（命名已脱敏）：

![stack](/img/debug-crash-hopper/stack.JPG)

由于解析失败，其实只能看到系统的堆栈。但是如果配合 dsym 文件正常解析的话，是能看到这样的解析后的日志的：

```
Thread 0 name:  com.apple.main-thread
Thread 0: Crashed
0   XXXXXXXXXXXXX                   0x0000000104c66a64 __36-[XXXManager showObject:]_block_invoke.74 (in XXXXXXXXXXXXX) (XXXManager.m:158)
1   libdispatch.dylib               0x000000018ae56610 __dispatch_call_block_and_release (in libdispatch.dylib) + 24
2   libdispatch.dylib               0x000000018ae57184 __dispatch_client_callout (in libdispatch.dylib) + 16
3   libdispatch.dylib               0x000000018ae3a34c __dispatch_main_queue_callback_4CF$VARIANT$armv81 (in libdispatch.dylib) + 996
4   CoreFoundation                  0x000000018b1085e4 ___CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__ (in CoreFoundation) + 12
5   CoreFoundation                  0x000000018b1035d8 ___CFRunLoopRun (in CoreFoundation) + 2004
......
```

看到解析后崩溃的代码，就可以实锤了。代码的作者（我本人）就不得不出来接锅了。

## 定位问题

根据 crash log 提示的行号找到对应的代码：

![code](/img/debug-crash-hopper/code.PNG)

可以看到是在调用一个 block 的时候崩溃的。作为一个典型问题，大概率也能猜出来原因，就是虽然在最外层判断了 object.showBlock 是否为空，但是执行到 dispatch_async 的时候，showBlock 可能又被释放了，需要再判断一次。

虽然是一个很简单的 crash，但是为了确定崩溃原因，可以反编译查看汇编代码。

## 反编译

第一步，是要在打包平台上找到本次发布的 ipa 包。

下载对应的 ipa 文件后，解压缩（如果没有解压缩选项可以直接把后缀改成 .zip），进入后右键选择显示包内容，找到可执行文件。

![exe](/img/debug-crash-hopper/exe.JPG)

我们使用 Hopper Disassembler 来反汇编。打开 Hopper，直接把可执行文件拖拽进去就可以了。期间 Hopper 解析会比较缓慢，要耐心等待，否则分分钟崩给你看。

可执行文件拖拽进去后，会询问解析哪种文件：

![file_option](/img/debug-crash-hopper/file_option.png)

由于我这里崩溃的设备是 64 位的 iPhoneX，所以要选择 AArch64 。如果崩溃的设备是 32 位的，则选择 ARM v7 。再下一步的对话框中保持默认选项就好。

这个时候可以下载下来原始的 crash 日志（解析前）：

```
Thread 0 Crashed:\n
0   XXXXXXXXXXXXX                   0x0000000104c66a64 0x104080000 + 12479076 ((null)) + 0)\n
1   libdispatch.dylib               0x000000018ae56610 0x18adfb000 + 374288 ((null)) + 0)\n
2   libdispatch.dylib               0x000000018ae57184 0x18adfb000 + 377220 ((null)) + 0)\n
3   libdispatch.dylib               0x000000018ae3a34c 0x18adfb000 + 258892 ((null)) + 0)\n
4   CoreFoundation                  0x000000018b1085e4 0x18b05f000 + 693732 ((null)) + 0)\n
......
```

看崩溃日志的第一行：

```
0   XXXXXXXXXXXXX                   0x0000000104c66a64 0x104080000 + 12479076 ((null)) + 0)
```

在 menu bar 中选择 Modify -> Change File Base Address ，输入 base 地址 0x104080000。之后选择 Navigate -> Go to Symbol or Address ，输入 0x0000000104c66a64，跳转到发生 crash 的指令。

![asm](/img/debug-crash-hopper/asm.png)

在 0x0000000104c66a64 这行，`LDR x0, [x0, #0x10]` 。LDR 是 Load Register 指令，把内存中的值 load 到寄存器中。第一个 x0 是目标寄存器，第二个 x0 是源寄存器，它的值会和立即数 0x10 像加，得到一个地址。该地址在内存中的值会被 load 到 x0 寄存器中。

即在 x0 寄存器 + 0x10 的地址处取值时发生了崩溃。对应我们的 fault address 是 0x10，说明 x0 的值被错误的设置成了 0 （nil）。

往上追溯，最开始 x0 的值是从 x0 + 0x20 处获得的。

由于这段指令在一个子程序（procedure，也就是 OC 代码的 block）中，x0 - x7 寄存器是参数寄存器，而 x0 寄存器就是 block 本身的 isa 地址。

根据 block 的内存布局：

<img src="/img/debug-crash-hopper/block_mem.png" alt="block_mem" style="zoom:50%;" />

从 isa 开始偏移 0x20 (-0x68 + 0x20 = -0x48) 正好是第一个 capture 到的变量，对应我们的代码中也就是 object 对象。

之后调用了 msgSend 方法，x0 此时作为 Argument Register，被 msgSend 当作参数使用。

![arm_registers](/img/debug-crash-hopper/arm_registers.png)

而 msgSend 中会查找 IMP 并调用，以下几种情况均可能造成返回值为 0（ARM64 汇编中也使用 x0 寄存器存储返回值） ：

- x0 本身就是 0，所谓的对 nil 发送消息。

- 没有找到 IMP，返回 0。

- 找到了 IMP，调用后结果为 0。

在当前的情况下，由于 block 本身 capture 到了 object，所以 object 不应该为 nil。showBlock 方法本身也存在，也不应该是没有找到 IMP。那么就只能是 showBlock == nil 了。也就是说，确实是调用一个 nil 的 block 导致的 crash。

## 解决方案

虽然只要判断一下 block 是否为空就好了，但是为了避免多线程抢占的问题，如在刚刚判断完 block 是否为空的时候，其他线程释放了 block 的情况，最好这样来写：

```
BlockType block = object.showBlock;
!block ?: block();
```