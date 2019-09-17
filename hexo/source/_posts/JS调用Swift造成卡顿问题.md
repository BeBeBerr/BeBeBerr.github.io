---
title: JS调用Swift造成卡顿问题
date: 2019-02-15 18:33:12
tags: JSCore
---

# JS调用Swift造成卡顿问题

最近正在构思一个新的项目，是一个控制蓝牙外设的 App，主要目标用户是电子爱好者，或者是做课程设计的大学生。这部分人群往往有一定的编程能力，但学习开发一款移动应用的成本又太高了。比如，如果希望用手机控制蓝牙小车，在这个小众场景下，这款 App 就会有用武之地了。

## 背景

鉴于目标用户是有一定编程能力的（毕竟蓝牙外设端还需要自己编程），为了增加 App 控制的灵活性，我就考虑增加一个通过 JavaScript 脚本自定义蓝牙收发逻辑的功能。这个想法也是受到钟大 JSBox 的启发。但有一个问题就是，如果用户编写的脚本包含耗时很久的循环，甚至死循环，比如用户想让蓝牙小车永远沿矩形运动，就可能会编出这样的代码：

```javascript
while (true) {
    send_message("move forward"); //通过蓝牙发送前进指令，小车接收到之后前进
    //注意非浏览器环境没有setTimeOut函数
    for (var i=0; i<10000000000; i++); //通过空循环延迟一段时间
    send_message("turn left"); //左转
    for (var i=0; i<10000000000; i++); //延迟，并不断重复
}
```

一旦写出了这样的死循环，那么 App 的主线程就全部用来执行 JavaScript 代码，从而完全卡死。用户当然能达到他的需求——毕竟蓝牙消息在不断发送，但是完全卡死的 App 就再也无法使用了，用户体验极差。在当前版本的 JSBox 中，运行死循环也会造成卡死现象，只能强制退出 App。

## 开辟后台线程

既然死循环会把主线程卡死，那么我们在后台执行 JavaScript 不就解决这个问题了么？这是一个非常直观的想法，我也很快写出了这样的代码：

```swift
work = DispatchWorkItem { [unowned self] in
	self.jsvm = JSVirtualMachine()
	self.context = self.generateJSContext(vm: self.jsvm!)
	self.context?.evaluateScript(code)
}
DispatchQueue.global().async(execute: work!)
```

这里要注意的一点是，如果需要在多线程中使用 JavaScriptCore，则需要给每个线程一个自己的 JS 虚拟机。否则，JS 虚拟机永远都会执行完上一次的程序，再来执行新加入的程序。

然后，我编写了这样的 JavaScript 代码来测试效果，看是不是不会卡死主线程了：

```javascript
while (true) {
    for (var i=0; i<10000000000; i++); //延时一段时间
    toast("Hello JS!"); 
}
```

`toast` 函数会回调 Swift 代码，从而在屏幕上弹出一段消息。当然，UIKit 不是线程安全的，所以在回调函数中必须回到主线程操作 UI：

```swift
func toast(_ msg: JSValue) {
	DispatchQueue.main.async {
    	Toast.show(string: msg.toString(), type: .js)
    }
}
```

写完这段天衣无缝的程序，我就很开心的去执行上面的那段测试代码了。果然，程序运行那段耗时空循环的时候，ScrollView 还可以顺畅的滚动，看来真的不会卡顿了。“我是天才！”，我心里默想。

但是好景不长！当 App 第一次展示了那条 toast 之后，主线程瞬间变得非常卡顿——没有完全卡死，偶尔还能相应输入，但是反应速度慢到了完全不可操作的地步。这是为什么呢？

## 分析问题原因

第一个想法当然是要看看卡顿的点在哪里，我首先在主线程的代码块里加入了一些调试代码。别忘了 print 不是线程安全的，这里最好使用 NSLog，而且 NSLog 还自带线程 id 号，很适合调试多线程程序。

```swift
func toast(_ msg: JSValue) {
	DispatchQueue.main.async {
        //NSLog
    	Toast.show(string: msg.toString(), type: .js)
        //NSLog
    }
}
```

这时我发现，两次 Log 之间间隔了很久，显然是这里发生了卡顿。而第二次 Log 结束后，很快就又打印出了第一条 Log，仿佛 JS 里面那条空循环不耗时一样，问题变得蹊跷起来。

会不会是 Toast.show 函数用时太久了呢？我干脆把这个函数注释成了空函数，但完全没有影响。看来是有什么隐蔽的操作在耗时，而不是这个函数本身。而奇怪的是，当我把 JS 里空循环的循环次数增加后，两次 Log 的间隔竟然也跟着变长了，这就有点让我摸不到头脑。毕竟，JS 代码是在另一个线程里面运行的，怎么会影响到我这短短两行的主线程代码块呢？

为了找到原因，我干脆监听了 RunLoop 状态。毕竟这段代码块是给主线程这个串行队列队尾的，如果主线程在忙于处理什么事情，这段代码执行的时间就会变晚。结果发现卡顿点确实发生在 RunLoop 处理 source0 的阶段，但这并没有给我什么启发。

## 调试

现在 Swift 级别的代码调试已经看不出来问题在哪了，只好进入汇编级别调试一下，看看这段时间主线程到底在忙些什么。Xcode 用的编译器是 llvm，调试器自然就是 lldb。lldb 的命令和 gdb 很像（毕竟当时就是为了替换 gdb 才搞出来的），使用 `stepi` 命令可以 step into 到下一个指令。

![屏幕快照 2019-02-15 17.06.33](/img/JS调用Swift卡顿/screenshot.png)

很快我就发现，我调用的 `toString` 函数中，有些加锁的操作。这里就非常值得警惕了。好在，JSCore 其实是开源的，我们可以去 Github 上看一下 JSCore 的源代码：

```objective-c
id valueToString(JSGlobalContextRef context, JSValueRef value, JSValueRef* exception)
{
    ASSERT(!*exception);
    if (id wrapped = tryUnwrapObjcObject(context, value)) { 
        if ([wrapped isKindOfClass:[NSString class]])
            return wrapped;
    }
	//...
}
```

上面是 JSCore 源码中，toString 函数调用的一个函数。我们可以看到，它果然继续调用了刚刚汇编代码中 `tryUnwrapObjcObject` 函数。我们继续找到 `tryUnwrapObjcObject` 函数的源码：

```objective-c
id tryUnwrapObjcObject(JSGlobalContextRef context, JSValueRef value)
{
    //...
    JSC::JSLockHolder locker(toJS(context));
    //...
    return nil;
}
```

可以看到，这个函数中给 JS 的上下文环境加了锁。

继续阅读源码，有一段注释解释了为什么要给 context 加锁：

```
// This is fairly nasty.  We allow multiple threads to run on the same
// context, and we do not require any locking semantics in doing so -
// clients of the API may simply use the context from multiple threads
// concurently, and assume this will work.  In order to make this work,
// We lock the context when a thread enters, and unlock it when it leaves.
// However we do not only unlock when the thread returns from its
// entry point (evaluate script or call function), we also unlock the
// context if the thread leaves JSC by making a call out to an external
// function through a callback.
```

可以看到，这是为了保证线程安全而做的工作，而且，在线程切换的时候也会加锁/解锁！

## 原理（猜测）

所以对于发生卡顿的原因，我做如下猜测（不敢 100% 确定）：

最开始，JS 执行延时循环的时候，是正常在子线程里运行的，所以主线程不卡顿，一切都相安无事。

在调用 `toast` 函数的时候，发生了线程切换。这个时候，JSCore 会给 context 加锁，然后瞬间返回，解锁继续给 JS 代码使用。接着，代码块被闲下来的主线程执行了。由于 `toString` 函数在主线程运行，所以它必须要等到 JSCore 把 context 解锁才能执行。这个时候，由于代码块是异步执行的，所以子线程又开始回去执行耗时循环了。而正在执行的 JavaScript 是不会释放锁的，所以主线程只好等待——造成了卡顿现象。

终于，JS 代码跑完了耗时循环，JS 代码释放了锁，主线程终于能运行了。主线程很快执行完显示 toast 的函数，然后释放，让 JS 能继续跑。这也解释了为什么增加循环次数也会影响卡顿时间。但是，这个时候主线程执行的还是上一次的 toast 请求，而这已经是第二次 JS 完成耗时循环了。所以，JS 又会把一个代码块加到主队列中…而只有第三次的时候，主线程才能等到资源，完成第二次的请求……如此反复，主线程虽然总有一点机会执行代码而不至于被饿死，但是多数时间都处于等待资源的状态，导致异常的卡顿。

## 验证

我写了一段 JS 代码来验证我的猜测：

```javascript
var count = 0;
while (true) {
    for (var i=0; i<10000000000; i++); //延时一段时间
    if (count == 0) {
        toast("Hello JS!"); 
        count++;
    }
}
```

这样，只调用主线程一次。按照上面的分析，一直再次发生线程切换，JS 就一直持有锁而不释放，主线程就永远没有机会执行。经验证，主线程确实完全卡死，等再久也没有反应。主线程被饿死，验证成功。

我又把 Swift 代码块改成同步代码块。这样，JS 要等待主线程执行完才能继续执行，而主线程又需要 JS 线程再次调用才能完成，因此会发生死锁。经验证，主线程完全卡死，再次验证成功。

## 改正与总结

有了以上分析，改正变得非常容易：

```swift
func toast(_ msg: JSValue) {
    let str = msg.toString()
	DispatchQueue.main.async {
    	Toast.show(string: str, type: .js)
    }
}
```

只需要把 `toString` 放在子线程中执行，就不存在主线程等待资源的问题了。可见，写代码时的一念之差，就会需要我花很久来调试、分析。如果最开始随手一写就写成正确的样子，就能省下大把的时间了。但话说回来，也就规避了问题。问题暴露出来，才能让我有机会深入学习。这也正是经验的来源吧。