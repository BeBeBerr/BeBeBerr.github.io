---
title: Try-Catch Segmentation Fault in C
date: 2023-01-23 23:01:37
tags: [C/C++, Operating System]
---

# Try-Catch Segmentation Fault in C

这篇文章对 C / C++ 老油条来说应该是属于基本操作了，但是对平时不怎么写 C 的我来说还是值得记录一下的。

起因是在写 OS 课的作业时（是的，历经千辛万苦，我终于选到了 OS 课 🎉，希望一切顺利 🙏），发现有时难以判断哪些指针是合法的，哪些是非法的。于是我想：与其费尽心机挨个检查地址范围，不如就让它抛出 SIGSEGV，然后捕获住做异常处理就好了。就像我们在其他的高级语言里非常自然的异常处理那样：

```swift
try {
  access_illegal_address() // do something really dangerous
} catch e {
  print("haha, I didn't crash.")
}
```

可惜 C 语言中并没有 try-catch 语句。

## 就算有呢？

等等…… 虽然 C 不支持 try-catch，但是 C++ 支持呀。如果我们小小的作弊一下，允许使用 C++ 的话，我们是不是就可以通过 catch 住 Segmentation Fault 来检查指针是否合法了呢？答案是——也不行。因为 C++ 的 try-catch 只能捕获 C++ 语言本身的异常。Segmentation Fault 作为更底层的异常，并不会被捕获，程序还是会 crash。

## 使用 Signal Handler

这个时候问题很多的小明就要问了，那我们不如用 Signal Handler 来捕获 SIGSEGV 好了！这当然是没问题的。如果我们直接在 Stack Overflow 搜索，也会看到许多回答提到使用 Signal Handler。但是，多数答案只提到了如何捕获信号，但是在 handler 里只是简单的 print 一句，就早早的 `exit(0)` 了。这并不符合我们的要求。

如果不 exit 程序呢？正常的 signal handler 返回后，操作系统会继续执行中断产生时的下一条指令，让程序继续运行。而 SIGSEGV 发生时，访问野指针的指令显然并未完成，因此会重新执行这条指令。除非我们在 signal handler 里修复好了指针地址，让其变得合法，否则重新执行一遍显然又会抛出 SIGSEGV。这样就会无限地调到 signal handler，让程序进入死循环。

破解这个死循环的方法就是，跳出循环 😊。

## 类 Try-Catch 实现

我们可以通过 `setjmp` 函数家族跳转到 catch 对应的位置。由于是在 signal handler 中，因此应当使用 `sigsetjmp` 和 `siglongjmp` 函数对。具体实现如下：

```c
#include <stdlib.h>
#include <string.h>
#include <setjmp.h>
#include <signal.h>
#include <stdio.h>

sigjmp_buf buf;

void segfault_handler(int sig) {
    siglongjmp(buf, 1);
}

int main(int argc, char **argv) {
    struct sigaction sa;
    memset(&sa, 0, sizeof(struct sigaction));
    sigemptyset(&sa.sa_mask);
    sa.sa_handler = segfault_handler;
    sa.sa_flags = SA_ONSTACK;
    sigaction(SIGSEGV, &sa, NULL);

    if (!sigsetjmp(buf, 1)) { // try
        int *p = NULL;
        *p = 6; // of course, this is illegal
    } else { // catch
        printf("caught seg fault!\n");
    }

    return 0;
}
```

注册 signal handler 的部分比较直观，这里不做赘述。`setjmp` 函数稍微有点难以理解。这个函数被调用一次后，会返回两次。第一次也就是正常设置 buffer，它会返回 0。因此会进入到所谓的 try block 中。当异常产生时，在 handler 中会调用 `longjmp` 函数。它与 `setjmp` 成对使用，表现刚好相反。调用一次时，它并不会返回。相反，它会通过修改一系列 context 寄存器，让 `setjmp` 函数返回第二次。本次的返回值可以自己定义，这里我们返回 1，于是进入到了所谓的 catch block 中。异常就被捕获了。

TL;DR：

- setjmp 调用一次，返回两次。
- longjmp 调用一次，返回零次。

综上，C 语言函数都会且只返回一次吗？答案是不一定哦。
