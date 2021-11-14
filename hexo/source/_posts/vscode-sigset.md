---
title: vscode-sigset
date: 2021-11-13 19:14:27
tags: VSCode
---

# VSCode sigset_t is Undefined

在使用 VSCode 写 signal 相关的代码时，IntelliSense 提示 `sigset_t` is undefined。

如下图所示：

![sigset_t](/Users/wangluyuan/Documents/github/BeBeBerr.github.io/hexo/source/img/vscode-sigset/sigset_t.PNG)

`sigset_t` 并不在 C99 / C11 standard 里。但是它是包含在 POSIX standard 里的。因此为了避免出现此错误提示，我们需要更改 VSCode C/C++ Extension 的配置。

`Ctrl-Shift-P` 呼出菜单，选择 C/C++ Edit Configurations (JSON)，将其中的 `cStandard` 从默认的 c11 改成 gnu99 即可。

