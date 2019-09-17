---
title: Obj-C内存管理
date: 2018-02-28 17:07:35
tags: Obj-C
---

# Obj-C 内存管理

### 手动引用计数（Manual Reference Counting, MRC)

对一个对象发送 `retain` 消息，该对象引用计数加一；反之，对它发送 `release` 消息，对象的引用计数会减一。但是，实际上释放内存的消息并不是 release，而是 `dealloc` 方法。当对象的引用计数达到 0 时，OC 会自动调用 `dealloc` 方法去释放内存，而不需要手动调用。

### 测试 MRC

首先需要关闭 Xcode 的自动引用计数功能，否则编译器会报错。

在 Building Settings 中搜索 reference counting，将 `Objective-C Automatic Reference Counting` 设置为 NO。

执行下面的代码：

```objective-c
#import <Foundation/NSObject.h>
#import <stdio.h>

int main() {
    id obj = [[NSObject alloc] init];
    printf("%d\n", (int)[obj retainCount]); //打印当前对象的引用计数
    [obj retain];
    [obj retain];
    printf("%d\n", (int)[obj retainCount]);
    [obj release];
    printf("%d\n", (int)[obj retainCount]);
    return 0;
}
```

控制台输出：

```
1
3
2
```

### 释放对象

为了彻底销毁对象，也需要给对象所持有的变量发送 release 消息。

由于真正释放内存的是 `dealloc` 方法，因此需要重写该方法，向类中所有变量发送 release 消息，放弃它们的所有权（ownership）。

```objective-c
- (void)dealloc {
    /* 发送 release 消息
    和其他的善后工作 */
    [super dealloc];
}
```

### 自动释放 (Autorelease)

许多对象使用一次后就不再使用了。Cocoa 提供了自动释放机制，可以把要发送 release 消息的对象都记录下来，再统一发送。

```objective-c
#import <Foundation/Foundation.h>
#import <stdio.h>

int main() {
    id pool = [[NSAutoreleasePool alloc] init];
    //池内
    id obj = [[NSObject alloc] init];
    [obj retain];
    printf("%d\n", (int)[obj retainCount]);
    [obj autorelease];
    printf("%d\n", (int)[obj retainCount]);
    [pool release];
    printf("%d\n", (int)[obj retainCount]);
    return 0;
}
```

控制台打印：

```
2
2
1
```

也可以用新的方式：

```objective-c
@autoreleasepool {
//池内
}
```

使用新方式更加高效、性能更好，且可以在池内使用 `break` `return` `goto` 等语句，因为只要运行到块外就会出发自动释放池释放内存，而传统方式中，如果使用跳转语句越过 `[pool release];` 将会导致内存无法释放。

一般在大量使用临时变量的循环开始前创建自己的自动释放池，并在循环结束后释放。

Cocoa 会在程序开始处理事件前，隐式的创造一个自动释放池以支持 runloop 的资源释放。因此在做 GUI 编程时，不需要手动创造自动释放池也可以使用临时对象。

在支持垃圾回收的环境中，`[pool release]` 不做任何操作(no-op)，而应该使用 `drain` 去触发 GC （抽干池子）。在 iOS 中，drain 和 release 等价，因为 iOS 不支持 GC。

### 便利构造函数

在内部调用别的构造函数的构造函数，成为便利构造函数。

OC 中的一些便利构造函数可以创建临时变量，并自动加入到自动释放池中，而无需关心如何销毁它们。这些便利构造函数不以 init 开头，而是以类型名开头，如 `+ (id) stringWithUTF8String: (const char*) bytes` 。

### 自动引用计数 (ARC)

手动引用计数需要程序员管理所有生成对象的所有权，在适当的地方插入 `retain` , `release` , `autorelease` 代码。自动引用计数会在编译时推断应在何处插入这些代码，并自动插入，不需要程序员自己管理。

使用 ARC 并不意味着完全不需要管理内存了。ARC 只能管理 OC 对象，不能管理 `malloc` 申请的内存，需要程序员自己用 `free` 函数释放。

使用 ARC，与引用计数相关的方法将被禁止使用，`NSAutoreleasePool` 也无法使用，但是仍可以使用 `@autoreleasepool{}` 。

不能随意定义 `alloc/init/new/copy/mutableCopy` 开头的，且以所有权操作无关的方法。

### 什么时候需要用 @autoreleasepool

多数情况我们不需要显示地使用 @autoreleasepool，因为 runloop 会自动创建自动释放池。

但是在以下情况下需要使用：

- 不基于 UI Framework 的程序，如控制台程序。因为没有 runloop 为我们创建自动释放池了。
- 循环中大量创建临时变量，可能在 runloop 没结束时就已经耗尽内存。

```objective-c
int main() {
    for(int i = 0; i <10000000; i++) {
        @autoreleasepool {
            NSNumber *num = [NSNumber numberWithInt:i];
            NSString *str = [NSString stringWithFormat:@"%d ", i];
            [NSString stringWithFormat:@"%@%@", num, str]; //为什么这行是必要的？
        }
    }
    return 0;
}
```

如果不使用 autoreleasepool，内存将会激增。使用之后，则一直维持在一个很低的水平。注意，如果是在循环中实例化了类，就不会出现类似的问题。在作用域之外，系统会自动帮我们释放对象。

**遗留的问题** 为什么一定要使用 num 和 str ？如果把该行注释掉，就观察不到实验现象了。

### 弱引用

为避免交叉引用导致内存泄漏，我们需要弱引用。弱引用指向对象，却不改变它的引用计数。弱引用会在它指向的对象被释放掉后自动变成 nil 从而避免出现野指针，这被称为自动 nil 化。

使用 ARC 时应该尽量让对象之间的关系成树状结构，避免循环引用。如果一定要互相引用，一方面可以使用弱引用，另一方面也可以手动给一个引用赋值为 nil 从而打破循环。