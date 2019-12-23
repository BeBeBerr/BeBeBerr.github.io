---
title: RunLoop 原理
date: 2019-12-23 22:07:50
tags: RunLoop
---

# RunLoop - 原理

RunLoop 是许多 iOS 开发者都会“假装”理解的概念。相关的概念常看常新，每次都有一番新的收获 （每次都不能彻底理解系列）～

## 一句话概括 RunLoop 是干啥的

就是一种 Event Loop。通过它来避免程序退出，同时高效地管理和相应各种事件。

## 这个循环在哪里

随着 Swift 的诞生，Apple 开源了一个跨平台的 Foundation 框架：https://github.com/apple/swift-corelibs-foundation 。我们可以在源码中找到这个循环：

```c
void CFRunLoopRun(void) {	/* DOES CALLOUT */
    int32_t result;
    do {
        result = CFRunLoopRunSpecific(CFRunLoopGetCurrent(), kCFRunLoopDefaultMode, 1.0e10, false);
        CHECK_FOR_FORK();
    } while (kCFRunLoopRunStopped != result && kCFRunLoopRunFinished != result);
}
```

可以看到就是一个简单的 do-while 循环，传入了当前的 RunLoop 作为参数。但这个循环并不是真正的 RunLoop 循环。

---

### 跑个题：啥是 check_for_fork

当我们 fork 出来一个进程的时候，必须要紧接着调用一个 `exec` 家族的函数，从而让这个进程变成一个“全新的”进程。否则，包括 CoreFoundation, CoreData 甚至 Cocoa 等基础的框架都会出现异常。这里苹果检测了进程是否是 fork 出来的，如果是，就会调用 `__THE_PROCESS_HAS_FORKED_AND_YOU_CANNOT_USE_THIS_COREFOUNDATION_FUNCTIONALITY___YOU_MUST_EXEC__` 这个断言让程序崩溃。

---

回归正题。

## RunLoop 的获取

我们看到在循环中，调用了 `CFRunLoopGetCurrent()` 函数来获取当前的 RunLoop，并作为参数传入。那么这个函数里都做了什么呢？

我们都知道苹果不允许我们自己手动创建 RunLoop，除了主线程的 RunLoop 会自动被创建之外，其他线程的 RunLoop 都是在第一次获取的时候被创建出来的。来看一下这个获取当前 RunLoop 对象的函数实现：

```c
CFRunLoopRef CFRunLoopGetCurrent(void) {
    CHECK_FOR_FORK();
    CFRunLoopRef rl = (CFRunLoopRef)_CFGetTSD(__CFTSDKeyRunLoop);
    if (rl) return rl;
    return _CFRunLoopGet0(pthread_self());
}
```

这个函数的返回值是 `CFRunLoopRef` ，也就是 `RunLoop` 结构体的指针类型。之后，先尝试调用 `_CFGetTSD` 函数获取，如果拿不到，再调用 `_CFRunLoopGet0` 函数。

---

### 跑个题：啥是 TSD

TSD 全称 Thread-Specific Data，线程特有数据，有时也叫 Thread-Local Storage, TLS。其中的数据对线程内部透明，而对其他线程屏蔽。使用的时候，可以理解成一个 KV 存储，并可以设定一个 `destructor` 析构函数指针，会在线程销毁时调用。

每一个进程都持有一个 keys 的数组，数组中，每一个元素包含一个用于指示 key 状态的 flag，和 destructor 函数指针。每一个线程的 TCB 也都含有一个指针数组，其中每个元素和 keys 数组一一对应。TCB 中这个数组的每一个元素指向该线程的 TSD。

![tsd](/img/RunLoop/tsd.png)

---

所以我们看到，其实 RunLoop 是存储在线程的 TSD 中的。这也就是为什么我们说每个 RunLoop 是和线程一一对应的。而在线程退出的时候，对应的 RunLoop 也会被销毁掉。

继续看一下 `_CFRunLoopGet0` 函数里都做了什么。这里只保留了一些关键的代码。

```c
// should only be called by Foundation
// t==0 is a synonym for "main thread" that always works
CF_EXPORT CFRunLoopRef _CFRunLoopGet0(_CFThreadRef t) {
    //...
    __CFLock(&loopsLock);
    if (!__CFRunLoops) { //__CFRunLoops 是一个全局的字典 如果为空
				CFMutableDictionaryRef dict = CFDictionaryCreateMutable(kCFAllocatorSystemDefault, 0, NULL, &kCFTypeDictionaryValueCallBacks); //就创造一个字典
				CFRunLoopRef mainLoop = __CFRunLoopCreate(pthread_main_thread_np()); //然后创建主线程的 RunLoop
				CFDictionarySetValue(dict, pthreadPointer(pthread_main_thread_np()), mainLoop); //之后放到这个字典里
				if (!OSAtomicCompareAndSwapPtrBarrier(NULL, dict, (void * volatile *)&__CFRunLoops)) {
	    		CFRelease(dict);
				} //最后把这个字典设置为全局的 __CFRunLoops 并通过锁来保证线程安全
				CFRelease(mainLoop);
    }
    CFRunLoopRef newLoop = NULL;
  	//尝试从全局的字典里获取 RunLoop
    CFRunLoopRef loop = (CFRunLoopRef)CFDictionaryGetValue(__CFRunLoops, pthreadPointer(t));
    if (!loop) {
				newLoop = __CFRunLoopCreate(t); //没有的话就创建一个
        CFDictionarySetValue(__CFRunLoops, pthreadPointer(t), newLoop); //然后放到字典里
        loop = newLoop;
    }
    __CFUnlock(&loopsLock);
    // don't release run loops inside the loopsLock, because CFRunLoopDeallocate may end up taking it
    if (newLoop) { CFRelease(newLoop); }
    
  	// 最后设置 TSD
    if (pthread_equal(t, pthread_self())) {
        _CFSetTSD(__CFTSDKeyRunLoop, (void *)loop, NULL);
        //...
    }
    return loop;
}
```

### 困惑

既然 RunLoop 已经被存储到线程的 TSD 里了，为什么还需要用一个字典再来记录一遍线程和 RunLoop 的对应关系呢？

## RunLoop 的创建

我们看到如果取不到 RunLoop 的时候，会调用 `__CFRunLoopCreate` 来创建一个。这个函数的实现比较简单，只是创建了一个 RunLoop 的实例，并赋初值。

## 循环内部逻辑

现在，描述 RunLoop 的对象已经被创建出来了。每次循环中，它都会被传入到 `CFRunLoopRunSpecific` 函数里。现在来看一下这个函数中每次都会执行哪些逻辑。这个函数比较长，简化之后核心逻辑是这样的：

```c
SInt32 CFRunLoopRunSpecific(CFRunLoopRef rl, CFStringRef modeName, CFTimeInterval seconds, Boolean returnAfterSourceHandled) {     /* DOES CALLOUT */
    CHECK_FOR_FORK();
    if (modeName == NULL || modeName == kCFRunLoopCommonModes || CFEqual(modeName, kCFRunLoopCommonModes)) {
        //参数不合法，直接返回并退出 RunLoop
      	//...
        return kCFRunLoopRunFinished;
    }
    if (__CFRunLoopIsDeallocating(rl)) return kCFRunLoopRunFinished;
    __CFRunLoopLock(rl);
  	//根据 modeName 找 mode
    CFRunLoopModeRef currentMode = __CFRunLoopFindMode(rl, modeName, false);
    if (NULL == currentMode || __CFRunLoopModeIsEmpty(rl, currentMode, rl->_currentMode)) {
			//如果找不到，或 mode 里没有 source/timer/observer 直接返回
			return did ? kCFRunLoopRunHandledSource : kCFRunLoopRunFinished;
    }
    //...
			if (currentMode->_observerMask & kCFRunLoopEntry ) __CFRunLoopDoObservers(rl, currentMode, kCFRunLoopEntry); //通知 observers 进入 loop
     	result = __CFRunLoopRun(rl, currentMode, seconds, returnAfterSourceHandled, previousMode); //处理事件
       if (currentMode->_observerMask & kCFRunLoopExit ) __CFRunLoopDoObservers(rl, currentMode, kCFRunLoopExit); //通知 observers 离开 loop
  	//...
    return result;
}
```

核心就是根据 modeName 拿到 mode，然后传给 `__CFRunLoopRun` 函数处理。期间通知观察者循环的进入和退出。

再来看看 `__CFRunLoopRun` 里面都 run 了哪些逻辑。这里删除了不少代码，只留下核心部分。

```c
static int32_t __CFRunLoopRun(CFRunLoopRef rl, CFRunLoopModeRef rlm, CFTimeInterval seconds, Boolean stopAfterHandle, CFRunLoopModeRef previousMode) {
    int32_t retVal = 0;
    do { //真正的 RunLoop 循环
        if (rlm->_observerMask & kCFRunLoopBeforeTimers) {
            __CFRunLoopDoObservers(rl, rlm, kCFRunLoopBeforeTimers); //通知观察者，即将触发 Timers 回调
        }
        
        if (rlm->_observerMask & kCFRunLoopBeforeSources) {
            __CFRunLoopDoObservers(rl, rlm, kCFRunLoopBeforeSources); //通知观察者，即将触发 Sources 回调
        }

	__CFRunLoopDoBlocks(rl, rlm); //执行被加入 RunLoop 的 blocks

        Boolean sourceHandledThisLoop = __CFRunLoopDoSources0(rl, rlm, stopAfterHandle); //触发 Sources0 回调
        if (sourceHandledThisLoop) {
            __CFRunLoopDoBlocks(rl, rlm); //执行被加入 RunLoop 的 blocks
        }

	#if TARGET_OS_MAC
        msg = (mach_msg_header_t *)msg_buffer;
       	if (__CFRunLoopServiceMachPort(dispatchPort, &msg, sizeof(msg_buffer), &livePort, 0, &voucherState, NULL, rl, rlm)) { //如果是 macOS，处理 Source1
        	goto handle_msg; //然后直接跳到 handle_msg
        }
	if (!poll && (rlm->_observerMask & kCFRunLoopBeforeWaiting)) __CFRunLoopDoObservers(rl, rlm, kCFRunLoopBeforeWaiting); //通知观察者即将休眠
	__CFRunLoopSetSleeping(rl); 

        __CFRunLoopServiceMachPort(waitSet, &msg, sizeof(msg_buffer), &livePort, poll ? 0 : TIMEOUT_INFINITY, &voucherState, &voucherCopy, rl, rlm); //休眠，直到被 Timer，基于 port 的事件，超时等事件唤醒

        rl->_sleepTime += (poll ? 0.0 : (CFAbsoluteTimeGetCurrent() - sleepStart));

	__CFRunLoopUnsetSleeping(rl);
	if (!poll && (rlm->_observerMask & kCFRunLoopAfterWaiting)) __CFRunLoopDoObservers(rl, rlm, kCFRunLoopAfterWaiting); //通知观察者结束休眠状态

        handle_msg:; //开始处理 msg

#if USE_DISPATCH_SOURCE_FOR_TIMERS
        else if (modeQueuePort != MACH_PORT_NULL && livePort == modeQueuePort) {
            CFRUNLOOP_WAKEUP_FOR_TIMER();
            cf_trace(KDEBUG_EVENT_CFRL_WAKEUP_FOR_TIMER, rl, rlm, livePort, 0);
            __CFRunLoopDoTimers(rl, rlm, mach_absolute_time()) //处理 timers 事件
        }
#endif
            __CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__(msg); //执行 dispatch 到 main queue 的 block
        }
        else {
            CFRUNLOOP_WAKEUP_FOR_SOURCE();
            CFRunLoopSourceRef rls = __CFRunLoopModeFindSourceForMachPort(rl, rlm, livePort);
            if (rls) {
#if TARGET_OS_MAC
		mach_msg_header_t *reply = NULL;
		sourceHandledThisLoop = __CFRunLoopDoSource1(rl, rlm, rls, msg, msg->msgh_size, &reply) || sourceHandledThisLoop; //处理 source1 事件
		if (NULL != reply) {
		    (void)mach_msg(reply, MACH_SEND_MSG, reply->msgh_size, 0, MACH_PORT_NULL, 0, MACH_PORT_NULL);
		    CFAllocatorDeallocate(kCFAllocatorSystemDefault, reply);
		}
            }
            
        }
	__CFRunLoopDoBlocks(rl, rlm); //处理被加入 RunLoop 的 block
        
    } while (0 == retVal); //如果没超时，mode没空，也没被停止，则继续循环
    
    return retVal;
}
```

根据苹果的文档，一次 RunLoop 中处理步骤如下：

1. 通知观察者进入 RunLoop
2. 通知观察者 ready 的计时器即将触发
3. 通知观察者不是基于 port 的 input sources 即将触发
4. 触发 ready 的非基于 port 的 sources
5. 如果有基于 port 的 sources 已经 ready，直接触发，goto 9
6. 通知观察者即将休眠
7. 让线程休眠，除非被一些事件唤醒
8. 通知观察者线程已经苏醒
9. 开始处理事件：
   1. 如果 timer ready 了，处理并继续循环，回到 2
   2. 超时等情况退出循环
10. 通知观察者 RunLoop 退出了。

**关于 source0 和 source1**：source1 是基于 port 的事件，是来自其他进程或系统内核的消息。source0 是其余的应用层事件。但有的时候，source1 事件会转交给 source0 来处理，比如触摸事件。当我们触摸屏幕时，会产生硬件中断；操作系统内核会把相关的消息通过 port 发送给应用程序，即 source1 事件；接着这些触摸事件会被丢到事件队列里，再交给 source0 处理。



不出意外的话，后面还会有一篇 RunLoop 的使用～



Ref:

1. [深入理解 RunLoop](https://blog.ibireme.com/2015/05/18/runloop/)
2. [iOS底层原理总结 - RunLoop](https://www.jianshu.com/p/de752066d0ad)
3. [重拾RunLoop原理](https://www.neroxie.com/2019/04/24/重拾RunLoop原理/)
4. [RunLoop 源码阅读](https://juejin.im/post/5aaa15d36fb9a028d82b7d83)
5. [线程特有数据](https://www.jianshu.com/p/61c2d33877f4)
6. [Run Loops](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Multithreading/RunLoopManagement/RunLoopManagement.html#//apple_ref/doc/uid/10000057i-CH16-SW23) , Apple
7. [关于RunLoop你想知道的事](https://zhuanlan.zhihu.com/p/62605958)