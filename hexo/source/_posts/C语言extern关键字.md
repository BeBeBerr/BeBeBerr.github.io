---
title: C语言extern关键字
date: 2019-02-07 10:01:38
tags: C/C++
---

# C语言extern关键字

从刚上大学开始学习 C 语言的时候，就被老师告诫不要大量使用 `extern` ，自然也就没把这个关键字放在心上。结果到现在还不是很熟悉 `extern` 的用法，说来有点惭愧……

## 一个例子

先来看两个程序：

```c
#include <stdio.h>
extern int x;
int x = 10;

void foo() {
    printf("%d", x); 
}

int main() {
    int x; //⚠️
    x++;
    foo();
}
```

```c
#include <stdio.h>
extern int x;
int x = 10;

void foo() {
    printf("%d", x);
}

int main() {
    extern int x; //⚠️
    x++;
    foo();
}
```

这两段程序唯一的区别就是 main 函数的第一行，有没有 `extern` 关键字。请问，这两个程序的输出分别是多少呢？

答案是，第一个程序输出 10，第二个程序输出 11。

`extern` 关键字把一个 symbol 声明成外部的。它告诉编译器：这个符号（比如 x）你没有见过，但是不要紧，它在别的地方定义了。你只管放心地编译，链接器会找到它的。也就是说，

```c
extern int x;
```

只是一个 declaration，而不是 definition。而

```c
int x;
```

既 declare 了 x，又 define 了 x。而在链接的时候，所有标记了 `extern` 的同名变量，都会被链接到同一个变量上。在上面的两端代码中，如果没有 `extern` 修饰 x，那么就是在 main 函数中定义了一个新的局部变量 x，并对它加一。跳转到 foo 中，只有全局变量 x 才是可见的，而刚刚的局部变量对全局变量没有影响，故而打印出 10 。第二段程序，因为添加了 `extern` ，所以在 main 函数中的 `int x` 不是 **definition** ，而是 **declaration** ，被链接器链接到全局变量 x 上。所以执行加一操作，会改变全局变量的值，所以打印出 11 。在第二个程序中，所有出现的 `x` 都指向同一个变量。

## 第二个例子

我们有三个文件：

```c
// test.h
extern int x;
int x = 10;
```

```c
// test1.c
#include "test.h"
int main() {
    x = 5;
    return 0;
}
```

```c
// test2.c
#include "test.h"
void foo() { x = 6; }
```

请问，如果执行 `gcc test1.c test2.c` 编译这个程序，会发生什么？

答案是，linker 会报错：

```
ld: 1 duplicate symbol for architecture x86_64
```

`#include` 引用的文件，会被 C 预处理器 （C PreProcessor, CPP）复制过来。也就是说，在这个程序中，x 被定义了两遍，且被声明成了外部的。刚刚说过，所有外部的同名变量都会被链接器链接到一起，指向同一个变量。那么这里，链接器就会发现有两个 x 的定义，那么该指向哪个呢？只好报错说有 `duplicate symbol` 。

那么，如果我们把 test.h 文件修改成这样呢？

```c
// test.h
// extern int x;
int x = 10;
```

我们不声明 x 为外部变量。这样，当头文件被复制到 c 文件时，我们只是分别定义了两次全局变量，应该相安无事了吧？事实上，链接器还是会报同样的错误。因为，全局变量默认就是外部的，写不写 `extern` 都一样。类似的，函数默认也都是外部的，不用显示地写出 `extern` 。

那么，怎么才能让全局变量不是外部的呢？答案是 `static` 关键字。显示地把变量定义为静态的，变量的生命周期就会变成整个程序的生命周期（即使在函数里面定义也是如此），而可见性就只局限在了同一个文件中。所以，如果把 test.h 文件改成这样，就可以通过编译，生成可执行文件了：

```c
// test.h
static int x = 10;
```

现在，虽然 x 被定义了两次，但是井水不犯河水。



