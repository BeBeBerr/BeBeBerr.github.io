---
title: How to Print Backtrace for Debugging
date: 2020-08-14 10:29:21
tags: iOS
---

# How to Print Backtrace for Debugging

作为客户端工程师，当我们监控到线上报警需要追查原因的时候，往往需要回捞用户日志。但很多时候日志打得并不十分全面。例如我们查看日志，发现用户出错的原因是某个函数传入的参数不合法，但由于调用方太多，并不知道是哪里在调用的时候传入了错误的值。如果能像 crash report 那样，打印出当前的函数调用栈就好了！

## Call Stack

在 C 语言中，我们可以使用 `#include <execinfo.h>` 中的以下两个函数来打印调用栈：

```c
int backtrace(void** array, int size);
char** backtrace_symbols(void* const* array, int size);
```

`backtrace` 函数会把当前的调用栈地址数组通过 array 返回，而 `backtrace_symbols` 会返回符号化的调用栈。

具体原理是，当函数调用时会把参数以及 EBP、EIP 寄存器的值压入栈。EBP（Base Pointer）保存当前栈底的地址，EIP（Instruction Pointer）保存下一条要执行的指令的地址，即执行完当前函数后要返回的地址，可以近似认为是调用者的地址。结构如下：

```
          :           :
          +-----------+
          : alignment :
          +-----------+
12(%ebp)  |   arg2    |
          +-----------+
 8(%ebp)  |   arg1    |
          +-----------+
 4(%ebp)  |    ret    | -----> return address
          +-----------+
  (%ebp)  |    ebp    | -----> previous ebp
          +-----------+
-4(%ebp)  |  local1   | -----> local vars
          +-----------+
          : alignment :
          +-----------+
          :           :
```

所以，我们通过当前的 EBP 寄存器的值，就可以在栈中找到调用者的地址和调用者的 EBP。再根据调用者的 EBP 又可以找到再上一级的 EBP 和 EIP…… 这样“递归”的寻找，就可以找到所有的 EIP，也就是整个的调用栈。

在 iOS 中，我们可以直接使用 `[NSThread callStackSymbols];` 来获取当前线程符号化后的调用栈。

## Symbols & dSYM

在 Debug 模式下，我们可以很顺畅的打印出带符号的函数调用栈，看起来非常清晰。然而在 Release 模式下，携带符号表会显著增加包大小，所以没有办法做符号化。没有符号表的调用栈打印出来就只有内存的地址，因此完全不可读。如下（遮盖住的内容是项目名称）：

<img src="/img/backtrace-ios/callstack.png" alt="callstack" style="zoom:50%;" />

dSYM （debug symbols）文件会在编译时产生，其中包含了程序中符号和偏移量之前的映射关系。使用 MachOView 程序可以查看 dSYM 文件中的内容：

<img src="/img/backtrace-ios/dSYM.png" alt="dSYM" style="zoom:50%;" />

## Symbolization

我们打印出来的地址是指令在内存中的地址，然而我们还需要知道程序在内存中被加载的基地址，才能计算出偏移量，进而使用 dSYM 文件做符号化。通过 dyld 可以获得程序加载的 dylib，根据 MachO 程序的格式，header 的地址即为程序的基地址。

```objective-c
#include <mach-o/dyld.h>
NSString * getImageLoadAddress()
{
    NSString *strLoadAddress =nil;
    NSString *strAppName = @"<Your Project Name>";
    uint32_t count = _dyld_image_count();
    for(uint32_t iImg = 0; iImg < count; iImg++) {
        const char* szName = _dyld_get_image_name(iImg);
        if (strstr(szName, strAppName.UTF8String) != NULL) {
            const struct mach_header* header = _dyld_get_image_header(iImg);
            strLoadAddress = [NSString stringWithFormat:@"0x%lX",(uintptr_t)header];
            break;
        }
    }
    return strLoadAddress;
}
```

接下来，我们可以使用 atos（address 2 symbol）命令来做符号化。

```bash
cd <Your dSYM file path>
xcrun atos -o <Your Project Name>.app.dSYM/Contents/Resources/DWARF/<Your Project Name> -l <Base Address> -arch <Arch>
```

CPU 架构很容易得知，根据机型就可以判断出是 arm64 还是 armv7 。按下回车后会进入输入模式，输入函数调用栈的地址就可以得到符号了。