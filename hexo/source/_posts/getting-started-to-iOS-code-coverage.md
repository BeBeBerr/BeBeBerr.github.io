---
title: Getting Started to iOS Code Coverage
date: 2020-01-29 23:12:30
tags: [LLVM, Code Coverage]
---

# Getting Started to iOS Code Coverage

获得代码覆盖率报告可以让我们更精准地进行测试。LLVM 本身就通过编译插桩提供了这样的能力，因此可以很简便地实现这一功能。但根据 [Technical Q&A QA1964](https://developer.apple.com/library/archive/qa/qa1964/_index.html) 提到的内容，带有 LLVM instrumentation 的 App 在提交的时候会被以下理由拒绝。因此如果要在线上做覆盖率检测，**可能**需要我们自己来实现。

```shell
Invalid Bundle - Disallowed LLVM instrumentation. Do not submit apps with LLVM profiling instrumentation or coverage collection enabled. Turn off LLVM profiling or code coverage, rebuild your app and resubmit the app.
```

 下面先介绍如何使用 Xocde 本身集成的代码覆盖率检测工具 gcov。第三方的 [Xcode Coverage](https://github.com/jonreid/XcodeCoverage) 提供了一些便利的工具，但暂时先不使用。

## 设置 Build Settings

首先在 Build Settings 中打开以下两个设置选项：

```
Instrument Program Flow = Yes
Generate Legacy Test Coverage Files = Yes
```

这样，编译的时候会生成记录 Basic Block (BB) 和代码映射关系的 notes 文件，由编译器生成。运行时会生成记录代码执行情况的 data 文件，由实际要执行的程序生成。

## 找到 gcda 和 gcno 文件

为了找到 `.gcno` 文件所在的路径，需要在 Build Phases 中增加一个 Run Script 脚本，导出相应的环境变量。

```shell
scripts="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo $( dirname "${BASH_SOURCE[0]}" )
export | egrep '( BUILT_PRODUCTS_DIR)|(CURRENT_ARCH)|(OBJECT_FILE_DIR_normal)|(SRCROOT)|(OBJROOT)|(TARGET_DEVICE_IDENTIFIER)|(TARGET_DEVICE_MODEL)|(PRODUCT_BUNDLE_IDENTIFIER)' > "${scripts}/env.sh"
```

通过 `echo` 出来的路径可以让我们找到 `env.sh` 文件，在里面可以看到 `OBJECT_FILE_DIR_normal` 等更多的环境变量。在我的环境中，这个路径是：

```
~/Library/Developer/Xcode/DerivedData/test-eurtcozdclpemgfxnumfljldtdjk/Build/Intermediates.noindex/test.build/Debug-iphonesimulator/test.build
```

进入当前路径下的 `Objects-normal/x86_64` ，就可以看到包括 `.gcda` 文件在内的编译产物了。因为我在使用模拟器，因此架构名称是 `x86_64` 。

运行程序，以生成 `.gcda` 文件。使用模拟器的话，生成的 `.gcda` 的文件也会存放于这个路径下。而使用真机的话，`.gcda` 文件就会处于沙盒的 `Documents` 目录下。

这里注意，只有在应用正常退出（双击 Home 键 kill 掉程序）后，`.gcda` 文件才会生成。

## 解析并生成报告

我们将 `.gcno` 和 `.gcda` 文件拷贝到源代码目录下，然后 cd 进入到源代码的顶层目录下。这是因为 `.gcno` 文件记录了代码的相对路径，如：`test/ViewController.m` ，如果目录的相对位置与之不符，解析时会出现错误。

之后，需要安装用于解析这两种文件的工具 `lcov` 。之后执行命令：

```shell
lcov -c -b <base dir> -d <filename> -o <output>.info
```

生成 `.info` 文件。之后执行：

```shell
genhtml cov.info
```

打开 `index.html` 就可以直观的 html 报告了🎉🎉🎉

![report](/img/start-code-cov/report.png)

在这个例子中，我放置了红色、蓝色两个按钮，并在运行时只点击红色按钮。从报告中可以看到，蓝色按钮的回调函数从未被覆盖到。

lcov 还可以通过 `-a` 来增加其他的 `.info` 文件，从而整合多人的覆盖率。

## 原理浅析

LLVM 通过编译插桩，修改 IR 代码从而实现了代码执行情况的统计。其中，一个重要的概念是 [Basic Block](https://en.wikipedia.org/wiki/Basic_block) (BB) 。

### Basic Block Graph

一个 BB 的定义是：只有一个顺序的代码结构，只有一个入口和一个出口。这意味着中间没有 jump 指令，只有最后一行代码能让程序执行到其他的 BB。这意味着，只要当前的 BB 中第一行代码被执行，块内的代码就都会被顺序的执行一次。

如果跳转是有条件的，那么就会产生一个分支（ARC）。这种情况下，一个 BB 就会有两个可能的终点。把每一个 BB 当作节点，每一个 ARC 当作边，就会构成一个有向图。运行时，根据 ARC 的条件，就可以推算出 BB 的执行次数。根据 `.gcno` 的映射关系，就可以得到代码的覆盖率。

![arc](/img/start-code-cov/arc.jpg)

下面以一个真实的例子演示。出于简便起见，我们编写一段简单的程序 `hello.c` ：

```c
#include <stdio.h>

int main(int argc, char **argv){
    if (argc > 1) {
        printf("Hello, how are you doing?\n");
    } else {
        printf("Haha, I'm doing great!\n");
    }
    return 0;
}
```

之后，编译并得到 `.gcno` 文件：

```shell
clang -ftest-coverage -fprofile-arcs hello.c -o hello
```

运行可执行文件，得到 `.gcda` 文件。由于是二进制的文件，教难阅读（具体格式可参见 [gcov-io.h](https://opensource.apple.com/source/gcc/gcc-5370/gcc/gcov-io.h.auto.html) 中的描述）。但我们可以使用：

```shell
gcov -dump hello.gcda
```

把内容解析出来。内容如下：

```
===== main (0) @ hello.c:3
Block : 0 Counter : 1
	Destination Edges : 1 (1),
	Lines : 3,
Block : 1 Counter : 1
	Source Edges : 0 (1),
	Destination Edges : 2 (0), 3 (1),
	Lines : 4,
Block : 2 Counter : 0
	Source Edges : 1 (0),
	Destination Edges : 4 (0),
	Lines : 5,6,
Block : 3 Counter : 1
	Source Edges : 1 (1),
	Destination Edges : 4 (1),
	Lines : 7,
Block : 4 Counter : 1
	Source Edges : 2 (0), 3 (1),
	Destination Edges : 5 (1),
	Lines : 9,
Block : 5 Counter : 1
	Source Edges : 4 (1),
File 'hello.c'
Lines executed:66.67% of 6
hello.c:creating 'hello.c.gcov'
```

根据这些信息，我们可以画出这样的图，其中含有代码执行次数和行号信息：

![flow](/img/start-code-cov/flow.jpg)

### 插桩前后对比

通过生成 IR 代码，我们可以对比出插桩前后的区别：

![ir](/img/start-code-cov/ir.PNG)

左边为原始代码，右边为插桩后。用粉色标记出来的地方即插入的桩代码，可见是插在每个 BB 前面的。从 load - add - store 的结构中也能看出计数的过程。



References：

[1] iOS 覆盖率检测原理与增量代码测试覆盖率工具实现，美团技术团队 https://www.jianshu.com/p/0431b23adba3

[2] https://github.com/yanxiangyfg/gcov

[3] http://www.c-s-a.org.cn/csa/ch/reader/create_pdf.aspx?file_no=6776&flag=1&year_id=2019&quarter_id=2

[4] https://blog.csdn.net/yanxiangyfg/article/details/80989680

[5] https://github.com/llvm-mirror/llvm/blob/release_70/lib/Transforms/Instrumentation/GCOVProfiling.cpp

[6] https://github.com/llvm-mirror/compiler-rt/blob/release_70/lib/profile/GCDAProfiling.c