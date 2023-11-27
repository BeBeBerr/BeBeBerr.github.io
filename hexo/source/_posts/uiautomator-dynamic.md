---
title: A crazy way to dump dynamic views with UIAutomator
date: 2023-11-27 22:47:47
tags:
---
# A crazy way to dump dynamic views with UIAutomator
Disclaimer: I'm not an expert in Android. This method is not stable. DO NOT use it for production.

UIAutomator 是 Android 内置的自动化工具，我们可以用 `uiautomator dump` 命令来 dump 当前 activity 的 view。
## 为什么不用其他工具？
UIAutomator 似乎会利用 Accessibility 的 view 信息，比起其他工具，dump 出来的 view 会更简洁（一些无关的 view 好像不会被 dump 出来）。其他的工具会事无巨细地把所有 view 都 dump 出来。
## 缺点
如果当前界面有动态试图（视频、动画、甚至是时钟），UIAutomator 就无法工作。这是因为它会先等待主线程进入 idle 状态。如果有持续的动态试图，主线程永远不会进入 idle，那么最终会导致超时报错 (Could not get idle state)。

如果我们去看 Android [源码](https://android.googlesource.com/platform/frameworks/testing/+/refs/heads/main/uiautomator/cmds/uiautomator/src/com/android/commands/uiautomator/DumpCommand.java)，可以看到这行代码是导致问题的关键：
```java
uiAutomation.waitForIdle(1000, 1000 * 10);
```
超时导致抛出异常。
## 解决思路
如果能把这行代码去掉，那么就不会抛出异常了。缺点是 UIAutomator 可能拿到错误的 UI 状态，但是这里我并不在意 UI 状态 100% 准确。

我们固然可以重新编译 AOSP，但是这个工作量太大了。有没有更简单的方式去掉这行代码呢？

可以发现，`uiautomator` 命令在 `/system/bin` 路径下，它本身是一个 shell 脚本，实际调用的是 `/system/framework/uiautomator.jar`。首先通过 `adb pull` 命令把这个 jar 文件拷贝到宿主机。之后，通过 ByteCode Viewer 工具，我们可以反汇编 Jar 的字节码并找到函数调用的汇编代码。
```asm
const-wide/16 v6, 1000
const-wide/16 v8, 10000
invoke-virtual { v3, v6, v7, v8, v9 }, Landroid/app/UiAutomation;->waitForIdle(JJ)V
```
点击 View->Panel->Smali，选中 Edit 功能，我们可以手动删掉函数调用的汇编，并重新编译成可执行文件。在我的电脑上，直接编译成 Android dex 可执行文件会 crash。因此我们先编译成 jar 文件，之后再用 Android Studio 的 d8 命令（原来 dx 命令的升级版）手动将 jar 文件转换成 dex 文件，再手动和其他文件一起打包成 `uiautomator.jar`。

我们可以通过 `adb push` 命令将 jar 拷贝回 `/system` 路径下。然而 system 默认是只读的，需要 remount 成读写权限。

启动模拟器时增加参数，表示 system 可写，并强制冷启动。不是冷启动的话 系统可能无法正常 boot：
```bash
/Users/luyuan/Library/Android/sdk/emulator/emulator -writable-system @Pixel_3a_API_34_extension_level_7_arm64-v8a -no-snapshot-load

adb root
adb remount
```

这样，我们可以强制绕过等待 idle 的逻辑，UIAutomator 有一定概率可以 dump 出 view。但是也有一定概率会报错 root node 为空，非常不稳定。不建议再生产环境中使用。
