---
title: Intro to Tagged Pointer
date: 2020-01-08 02:22:29
tags: Obj-C
---

# Intro to Tagged Pointer

所谓 Tagged Pointer 就是指针不再指向数据，而是用其中的一部分直接表示该数据本身。这个词借鉴于 [Tagged Architecture](https://en.wikipedia.org/wiki/Tagged_architecture) 。在 Tagged Architecture 中，每个字（word）的一部分被用来表示数据的类型（type），这部分就是所谓的 Tag。虽然本质上和 Tagged Pointer 有所区别，但该名称还是被一直沿用下来。

## 问题起因

这个问题要追溯到将近两年前我的一篇[博客](http://blog.wangluyuan.cc/2018/02/28/Obj-C内存管理/) ，当时我正在学习 Obj-C 的内存管理。为了验证使用 autoreleasepool 可以解决循环中大量创建临时变量导致内存不断上涨的问题，我写了这样的一段代码：

```objc
int main() {
    for(int i = 0; i <10000000; i++) {
        @autoreleasepool {
            NSNumber *num = [NSNumber numberWithInt:i];
            NSString *str = [NSString stringWithFormat:@"%d ", i];
            [NSString stringWithFormat:@"%@%@", num, str]; //* 为什么这行是必要的？
        }
    }
    return 0;
}
```

当时在博客中遗留了一个问题，即为什么把其中一行代码注释掉，就观察不到内存上涨的情况了。当时也提出了一些猜想，和其他人讨论后也觉得站不住脚。直到最近又把这个问题抛出，得知 Tagged Pointer 的存在后，问题才算有了答案。

## 引入 Tagged Pointer

2013 年苹果发布了第一款 64 位架构处理器的手机，iPhone5s。由于寄存器、数据总线宽度和字长都翻倍达到了 64 位，指针和其他一些较小的数据占用的空间也就变大了。而且由于字节对齐的要求，指针后 4 位将永远是 0。对于 NSNumber 等小对象来说，这就存在一种浪费。苹果因此引入了 Tagged Pointer，在 NSNumber、NSString、NSDate、NSIndexPath 等对象占用空间比较小的时候，直接把值本身存在指针里。由于无需 malloc、free、操作引用计数，号称可以在相关场景内存减半的基础上，带来 3 倍访问速度的提升和 100 倍的创建、销毁效率。

而引入 Tagged Pointer 之后，在数据大小允许的情况下，就可以直接放入指针中存储。具体来说，最后一位置 1，表示是 Tagged Pointer。60 位用来存数据，剩下的 3 位用来表示类型。

![tangqiao](/img/tagged_pointer/tangqiao.jpg)

## 代码验证

有了以上知识，我们很容易就能写出代码验证：

```objc
int main(int argc, const char * argv[]) {
    NSNumber *a = @1;
    NSLog(@"%p", a);
    return 0;
}
```

打印出来的结果是：`0xaac4045801d025e1` 。等一下，这和网上说的效果不一样呀？为什么是这样看起来毫无规律的数字呢？难道这个 NSNumber 指针并不是一个 Tagged Pointer？

![nsnumber](/img/tagged_pointer/nsnumber.png)

通过调试，我们可以看到这个对象虽然还是 `__NSCFNumber *` 类型，但是它的 isa 指针却是 0x0，也就意味着它的确是个 Tagged Pointer。那为什么指针的值这么奇怪呢？更奇怪的是，这个值每次运行还都不一样。

一开始我怀疑是因为我是在 macOS 运行的程序，后来尝试了在模拟器和真机上运行，也都没得到预期的效果。没办法，只好去查看一下 Obj-C 的开源代码。在 [objc-internal.h](https://opensource.apple.com/source/objc4/objc4-756.2/runtime/objc-internal.h.auto.html) 中，可以看到创建 Tagged Pointer 的函数：

```c
static inline void * _Nonnull
_objc_makeTaggedPointer(objc_tag_index_t tag, uintptr_t value)
{
    // PAYLOAD_LSHIFT and PAYLOAD_RSHIFT are the payload extraction shifts.
    // They are reversed here for payload insertion.

    // assert(_objc_taggedPointersEnabled());
    if (tag <= OBJC_TAG_Last60BitPayload) {
        // assert(((value << _OBJC_TAG_PAYLOAD_RSHIFT) >> _OBJC_TAG_PAYLOAD_LSHIFT) == value);
        uintptr_t result =
            (_OBJC_TAG_MASK | 
             ((uintptr_t)tag << _OBJC_TAG_INDEX_SHIFT) | 
             ((value << _OBJC_TAG_PAYLOAD_RSHIFT) >> _OBJC_TAG_PAYLOAD_LSHIFT));
        return _objc_encodeTaggedPointer(result);
    } else {
        // assert(tag >= OBJC_TAG_First52BitPayload);
        // assert(tag <= OBJC_TAG_Last52BitPayload);
        // assert(((value << _OBJC_TAG_EXT_PAYLOAD_RSHIFT) >> _OBJC_TAG_EXT_PAYLOAD_LSHIFT) == value);
        uintptr_t result =
            (_OBJC_TAG_EXT_MASK |
             ((uintptr_t)(tag - OBJC_TAG_First52BitPayload) << _OBJC_TAG_EXT_INDEX_SHIFT) |
             ((value << _OBJC_TAG_EXT_PAYLOAD_RSHIFT) >> _OBJC_TAG_EXT_PAYLOAD_LSHIFT));
        return _objc_encodeTaggedPointer(result);
    }
}
```

其中调用了 `_objc_encodeTaggedPointer` 函数给指针编码：

```c
extern uintptr_t objc_debug_taggedpointer_obfuscator;
static inline void * _Nonnull
_objc_encodeTaggedPointer(uintptr_t ptr)
{
    return (void *)(objc_debug_taggedpointer_obfuscator ^ ptr);
}
```

看到这里一口老血直接喷出来了，原来苹果在这里做了混淆！找到这个用于混淆的值初始化的文件 [objc-runtime-new.mm](https://opensource.apple.com/source/objc4/objc4-750.1/runtime/objc-runtime-new.mm.auto.html) ：

```objective-c
/***********************************************************************
* initializeTaggedPointerObfuscator
* Initialize objc_debug_taggedpointer_obfuscator with randomness.
*
* The tagged pointer obfuscator is intended to make it more difficult
* for an attacker to construct a particular object as a tagged pointer,
* in the presence of a buffer overflow or other write control over some
* memory. The obfuscator is XORed with the tagged pointers when setting
* or retrieving payload values. They are filled with randomness on first
* use.
**********************************************************************/
static void
initializeTaggedPointerObfuscator(void)
{
    if (sdkIsOlderThan(10_14, 12_0, 12_0, 5_0, 3_0) ||
        // Set the obfuscator to zero for apps linked against older SDKs,
        // in case they're relying on the tagged pointer representation.
        DisableTaggedPointerObfuscation) {
        objc_debug_taggedpointer_obfuscator = 0;
    } else {
        // Pull random data into the variable, then shift away all non-payload bits.
        arc4random_buf(&objc_debug_taggedpointer_obfuscator,
                       sizeof(objc_debug_taggedpointer_obfuscator));
        objc_debug_taggedpointer_obfuscator &= ~_OBJC_TAG_MASK;
    }
}
```

原来是苹果爸爸为了让程序更安全，故意随机混淆 Tagged Pointer 来增加攻击的难度。而老版本的操作系统上是没有这步混淆的。这也就是为什么网上古老的博客上说法完全复现不了。苹果爸爸的一片苦心坑死我了～

## 查看真实的值

好在苹果的这个混淆只是一个简单的 XOR，而且用于混淆的值是 external，且只在第一次使用的时候被初始化（天时地利人和啊！），因此我们可以很简单的把原始的值再异或回来：

```objc
extern uintptr_t objc_debug_taggedpointer_obfuscator;

NSNumber *a = @(0);
long long result = (long long)a ^ (long long)objc_debug_taggedpointer_obfuscator;
NSLog(@"%llx", result);
```

在输入 0 的时候，可以看到输出是 `0x27` ，也就是 `100111` ；输入是 1 的时候，输出是 `0x127` 即 `100100111` 。这里又有点奇怪，不是说好最后一位是 1，三位表示类型，60 位表示原始数值吗？从苹果的源码可以看到 `OBJC_TAG_NSNumber = 3`，即 `011` 。现在无法解释的就只剩前面的 `0010` 了。

如果换一种写法：

```objc
NSNumber *a = @(1.0);
```

就可以发现，最终打印出来的值是 `101010111` 。也就是说，还有 4 位在表示着这个数值的类型，是 double 还是 int。考虑到 mac 的 x64 架构是小端序，因此排布会和 iPhone 上有差异。在 mac 上，以 NSNumber 为例，应该是这样的：

![tagged](/img/tagged_pointer/tagged.jpg)

而如果是 NSString，情况将更加复杂。苹果采用了一套非常复杂的机制来对字符串进行编码，甚至会根据英文字母的词频来使用不同的对照表。也即是说，同样长度的字符串，内容不一样的话，有可能一个会被转成 Tagged Pointer，而另外一个不会。细节可以参考：[Tagged Pointer Strings](https://mikeash.com/pyblog/friday-qa-2015-07-31-tagged-pointer-strings.html)

## 面试题

发现多篇博客都提到了这道面试题，我在这里也跟个风：

**Question:** 执行以下代码会发生什么？

```objc
@interface ViewController ()
@property (nonatomic, copy) NSString *name;
@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    dispatch_queue_t queue = dispatch_get_global_queue(0, 0);
    for (int i = 0; i < 1000; i++) {
        dispatch_async(queue, ^{
            self.name = [NSString stringWithFormat:@"abcdefghijklmn"];
        });
    }
}

@end
```

**Answer：** 会崩溃在 `objc_release` 里。因为对变量赋新值，在 ARC 下编译器会帮我们添加 `[obj release]` 来给引用计数减 1 。并发情况下调用 `release` 就会导致崩溃。解决方法很简单，只需要加锁，比如改成 `atomic` 就可以了。

那如果改动一行，变成如下的代码呢？

```objc
self.name = [NSString stringWithFormat:@"abc"];
```

答案是不会崩溃，因为 Tagged Pointer 不是真正的对象，不会调用 `release` 操作。神奇！

## 回到最初

因为数据比较小，NSNumber 和 NSString 正好都成为了 Tagged Pointer，并没有实际的堆上对象内存分配，自然内存不会持续上涨。而碰巧加上关键的那行之后，字符串拼接导致长度较长，超出了 Tagged Pointer 能承载的范围，于是就开始真的给 NSString 对象分配内存了，这才能出现大量创建临时变量的前提。



参考了大量的博客和文章，其中一些写的非常深入：

1. [深入理解 Tagged Pointer](https://www.infoq.cn/article/deep-understanding-of-tagged-pointer/)
2. [Tagged Pointer Strings](https://mikeash.com/pyblog/friday-qa-2015-07-31-tagged-pointer-strings.html)
3. [聊聊伪指针 Tagged Pointer](https://www.jianshu.com/p/3176e30c040b)