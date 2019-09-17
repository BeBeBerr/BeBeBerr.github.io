---
title: 让Xcode控制台打印彩色文字
date: 2018-06-15 19:53:30
tags: Xcode
---

# 让 Xcode 控制台打印彩色文字

让控制台打印彩色文字可以帮助我们更清晰地调试程序，但 Xcode 本身是不支持这一特性的。我们需要借助 XcodeColors 这款插件。

### 安装插件

去 Github 上找到 [XcodeColors](https://github.com/robbiehanson/XcodeColors) 并把项目下载下来。用 Xcode 把工程打开，run 一下 XcodeColors target，插件就会自动被安装好。这个时候重启 Xcode，把 target 切换到 TestXcodeColors，再 run 一次来测试插件是否被成功安装了。这个时候我们会发现并没有打印出来带有颜色的信息，而是打印了许多掺杂了转义字符的字符串。虽然尝试没有成功，但我们得以知道它的原理就是利用转义字符来确定字符串的颜色，所以我们后续的使用中只要向字符串中也添加上这些转义字符，就可以控制打印的颜色了。

### 让插件可用

由于之前曾经出现过有人利用 Xcode 插件添加恶意代码的行为，苹果自 Xcode8 起，就禁用了第三方插件功能。如果一定要用的话，就需要利用一些工具手动打开。这个过程较为繁琐，也可能会导致 Xcode 不安全。不过我们可以用 update_xcode_plugins 工具来简化流程。

首先要升级一下 ruby 环境：

```shell
curl -L https://get.rvm.io | bash -s stable
```

之后列出最新的 ruby 版本：

```shell
rvm list known
```

在列表中，可以看到当前最新的 ruby 版本是 2.4.1。接下来安装该版本的 ruby：

```shell
rvm install 2.4.1
```

成功后，通过 Gem 安装 update_xcode_plugins：

```shell
sudo gem install update_xcode_plugins
```

之后就可以更新已经安装过的插件了。虽然之前的插件不能运行，但其实是已经安装成功了的：

```shell
update_xcode_plugins
```

最后，解除掉 Xcode 的签名：

```shell
update_xcode_plugins --unsign
```

这可能会导致 Xcode 没有办法进行上架操作。需要上架时，应当恢复 Xcode 的签名(未尝试)：

```shell
update_xcode_plugins --restore
```

这个时候再重启 Xcode，就会询问师傅哦加载插件包，选择 Load Bundle 即可。

### 使用

先打开 XcodeColors：

```objective-c
setenv("XcodeColors", "YES", 0);
```

然后可以定义一些宏来帮助我们打印颜色信息：

```objective-c
#define XCODE_COLORS_ESCAPE @"\033["
#define XCODE_COLORS_RESET     XCODE_COLORS_ESCAPE @";"
#define LogRed(frmt, ...) NSLog((XCODE_COLORS_ESCAPE @"fg255,0,0;" frmt XCODE_COLORS_RESET), ##__VA_ARGS__)
```

就可以像 NSLog 一样使用了：

```objective-c
LogRed(@"Sprocket error: %@", error);
```

我们可以看到，控制台打印的文字颜色变为红色了。

### 最后

虽然打印带有颜色的信息会非常清晰，但我们可以看到，第一非常麻烦，尤其是上架时还需要把 Xcode 签名恢复。二是这会带来安全风险，之前正是由于 XcodeGhost 等事件才让苹果封杀第三方插件的。总体来说，并不推荐这么做。

