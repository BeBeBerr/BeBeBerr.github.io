---
title: What are Dynamic Libraries ?
date: 2019-09-18 10:35:57
tags: dyld
---

# What are Dynamic Libraries ?

Ref: [Overview of Dynamic Libraries](https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/DynamicLibraries/100-Articles/OverviewOfDynamicLibraries.html)

动态库会在使用时动态地加载到内存中。在 Linux 上，动态库以 `.so` 结尾，在 macOS 上是 `.dylib`，而在 Windows 上是 `.dll`。

## Usage

以 macOS 为例，首先新建两个文件 `lib.c` 和 `lib.h`。

```c
//lib.h
void lib_print();
```

```c
//lib.c
#include <stdio.h>
void lib_print() {
    printf("Hello World from lib!");
}
```

然后编译出 `.dylib` 文件：

`gcc -dynamiclib lib.c -o libtest.dylib`

编写 `main.c` 文件来验证一下：

```c
#include "lib.h"
int main() {
    lib_print();
    return 0;
}
```

编译的时候指定要链接的动态库：

`gcc main.c -L. -ltest -o main`

标准的动态库都以 `lib` 开头，如这里的 `libtest.dylib` 。如果不以 lib 开头，linker 就找不到它。

## Load on Runtime

在编译时制定要链接的动态库，这种用法看起来和静态库差不多。但动态库之所以动态的一个原因正是它可以在运行时动态地加载。

修改 `main.c` 文件：

```c
#include <dlfcn.h>
#include "lib.h"

typedef void(*Func)();

int main() {
    void *lib_handle = dlopen("libtest.dylib", RTLD_LAZY);
    Func lib_func = dlsym(lib_handle, "lib_print");
    lib_func();
    return 0;
}
```

其中，`dlopen` 用于装载和链接一个动态库，而 `dlsym` 会返回 symbol 的地址。

## .dylib vs .a

- 动态链接会降低包体积
- 将静态的事情放在动态来做，会拖慢程序的运行速度。但是 Apple 提供了 shared library cache 来做缓存。
- 即使有缓存，仍需要查找 Procedure Linkage Table (PLT) 表。这个表记录了之前已经调用过的函数的地址。

## Function Interposing

`dyld` 提供了一般的 loader 没有的功能：函数拦截。这样我们可以轻松地 Hook 其他动态库中的函数（比如系统调用）。而在 Linux 中，Hook 系统调用就麻烦些。

出自 *Mac OS X and iOS Internals: To the Apple's Core* 中的替换掉 `malloc` 和 `free` 的例子在互联网上已经泛滥，这里就不再赘述。在这个例子中，我们 Hook 掉之前 `lib.c` 重的 `lib_print` 函数。

新建一个 `libhook.c` 文件。

```c
//libhook.c
#include <stdio.h>
#include "lib.h"

#define DYLD_INTERPOSE(_replacment,_replacee) \
   __attribute__((used)) static struct{ const void* replacment; const void* replacee; } _interpose_##_replacee \
            __attribute__ ((section ("__DATA,__interpose"))) = { (const void*)(unsigned long)&_replacment, (const void*)(unsigned long)&_replacee };

void another_print() {
    printf("www.wangluyuan.cc");
}

DYLD_INTERPOSE(another_print, lib_print)
```

中间的宏定义来源于 `/include/mach-o/dyld-interposing.h` 中。我们把它编译成一个动态库：

`gcc -dynamiclib libhook.c -o libhook.dylib -L. -ltest`

然后，通过 dyld 的环境变量，将这个动态库强制插入已经编译好的 main 程序中：

`DYLD_INSERT_LIBRARIES=libhook.dylib ./main`

```c
//main.c
#include "lib.h"
int main() {
    lib_print();
    return 0;
}
```

我们会发现 `lib_print` 的实现已经被替换了，而 main 对此毫不知情，表示很无辜。