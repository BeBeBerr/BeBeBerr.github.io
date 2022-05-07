---
title: Google Slides 图片导出为文件
date: 2022-05-06 23:10:52
tags: misc
---

# Google Slides 图片导出为文件

最近在写 report 的时候遇到一个问题：我需要从一个 gif 动图里抽帧出来制作图表，但是原始的 gif 文件在另外的电脑里，没办法直接拿到。不过在之前准备 presentation 的时候，我们通过 Google Slides 制作了幻灯片，因此可以看到这些 gif 动图。

本来以为下载 gif / 普通图片是一件很容易的事情，但是右键点击图片发现并没有提供下载 / 另存为文件的选项。点击 File 菜单，也只有对整个 slides 整体操作的选项，并不支持将其中某张图片导出。这个时候就想到如果 Google Slides 不可以，那我可以把整个文档导出为 pptx 的格式，在 Keynote 中再导出文件（我用的是 macOS，且并没有安装 Office 套件）。

尴尬的是，在 Keynote 中虽然我可以对这些动图进行编辑，但是也没有找到导出的选项。但既然我们已经有了 pptx，理论上可以直接解析文件包内容，来看到原始的图片文件。解决办法是将 .pptx 文件重命名为 .zip，再进行解压。但是在 macOS 上，如果直接右键解压，会弹出警告说文件类型不兼容，无法解压。所以需要通过命令行来解压：

```bash
mv <file_name>.pptx <file_name>.zip && unzip <file_name>.zip
```

解压之后就能看到全部的原始文件了，问题解决🎉

![unzip-pptx](/img/export-slides/unzip-pptx.png)
