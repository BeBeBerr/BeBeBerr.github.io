---
title: iOS多线程学习笔记
date: 2018-04-14 15:44:03
tags: MultiThreading
---

# iOS 多线程学习笔记

### 线程 vs 进程

线程又被称为轻量进程，是进程中执行运算的最小单位。进程是资源费配的基本单位。一个程序至少拥有一个进程，一个进程至少拥有一个线程。线程拥有自己的堆栈和局部变量，但没有单独的地址空间，而进程的内存是独立的。一个线程崩溃，整个进程都会崩溃。但在操作系统的保护模式下，一个进程崩溃不影响其他进程，因此多进程的程序比多线程的程序及健壮。但是进程上下文切换比线程上下文切换更消耗资源。

为什么会有多线程/多进程呢？因为 CPU 的速度和内存或是其他挂在总线上的设备的速度严重不匹配，CPU 要快得多。人们想要提高资源利用率，于是可以让 CPU 轮流处理多个任务（分时间片）。由于切换速度很快，在用户看来就是并行执行了。只有在 CPU 具有多个核心时，才可能实现真正的多线程。事实上，由于线程数量要远远多于 CPU 核心数（在写这篇文章时，我的电脑运行着 356 个进程，1289 个线程，而我的处理器只有两个核心），实际上还是要轮流处理😉

在 iOS 中，一个正在运行的应用程序就是一个进程。每个程序中可以开启多个线程，以防止阻塞 UI 线程造成卡顿。

### 线程的状态 & 生命周期

当一个线程被 new 出来之后，对它发送 start 信号就会进入就绪（Runnable）状态。线程开启（start）后会被放入可调度线程池中。

当 CPU 调度当前线程时，它会进入运行（Running）状态；当 CPU 转而去调度其他线程，它就又返回就绪状态等待调度。

当调用了 sleep 方法是在等待同步锁时，就进入阻塞（Blocked）状态。阻塞状态时，线程对象会被移出线程池，不可调度。而一旦 sleep 时间到，或者得到同步锁，就又返回就绪状态。

当线程执行完毕，或是出现错误而强制退出时，就进入死亡（Dead）状态。线程对象会被销毁。

### 线程安全

当多个线程对数据进行写操作时，有可能会出现数据不一致的情况。一般来说，我们通过添加同步锁来对数据进行保护，保证每个时刻只有一个线程在操作数据。如果在多线程下，运行结果仍和单线程下一致（或者说符合预期），那么我们就说这是线程安全的。

如果加锁不当，或者是出现了循环依赖、资源竞争等情况，就会出现线程永久阻塞的死锁状态。如果没有外力作用，这些线程永远无法执行下去，在实际使用中一定要避免死锁产生。我们也可以监控死锁，不如设置时限，超时后采取措施解脱死锁状态。

iOS 中，有最基本的互斥锁，保证一个线程在访问对象时，其他线程不能访问。还有递归锁，可以解决对一个线程加两次锁时的死锁问题。此外还有根据条件来加锁的条件锁。

```swift
//对一个线程加两次互斥锁导致的死锁问题
let lock = NSLock()
DispatchQueue.global().async {
    lock.lock()
    lock.lock()
    print("deadlock")
    lock.unlock()
    lock.unlock()
}
```

这里简单解释下为什么 lock 两次就会死锁。假设这里的互斥锁是用信号量实现的，每次 lock 都会把信号量减一。如果一开始信号量是 1，那么 lock 一次信号量就降低到 0，其他线程就无法执行了。如果再 lock 一次，本线程就又把信号量减 1，同时发现信号量不再大于 0，于是自己也不能执行了。

**多线程引用计数**

由于对象可能在不同的线程被访问，所以引用计数必须是线程安全的。为了保证引用计数的读写操作是原子性的，retain / release / retainCount 都要被加锁。

**atomic**

`atomic` 是 Objective-C 中的一个修饰属性的关键字，意思是原子性的。所谓原子，就是指不可继续划分的最小操作单位。被 atomic 修饰的属性的 getter 和 setter 会被加锁，从而保证了线程安全。

atomic 一定是线程安全的吗？可以这么说，但也不能这么说😜首先，atomic 是修饰属性的关键字。如果你的属性是一个指针，比如一个 `NSMutableArray *array` ，它可以保证这个指针的线程安全，但是无法保证指针指向的内存块（数组本身）的线程安全。因为你给指针指向的地址赋值，是和指针自身的 getter 和 setter 没关系的。

还有，就是 `a = a + 1` 这种情况。即使 a 是 int 类型的变量，并且也通过 atomic 关键字给它的 getter 和 setter 加锁。当你在进行 set 时，get 操作也会被阻塞（反之亦然），但是，仍会出现线程不安全的情况。比如，先安全地 get 到了 a，例如 a 的值为 1。之后进行加法运算，即运算 a + 1 = 2。如果在此时其他线程对 a 进行写操作，时不会被阻塞的。而运算完成之后，本线程又回对 a 进行一次写操作，就会出现数据不一致的情况。不过，单纯的对小于 64 位的基本类型数据做读写操作时，即使不加锁也是原子性的。因为 64 位机器的地址总线也是 64 位，读写可以在一次操作中完成。如果大于 64 位，就要分步来完成操作，有可能出现 A 线程写到一半，轮转给 B 线程操作的情况。

既然 atomic 可以一定程度上保证线程安全，那要不要把所有的属性都声明为 atomic 的呢？当然不要，要知道加锁和解锁操作是需要消耗更多资源的，在手机这样性能较弱的嵌入式设备中，除非必要，不然不要声明为 atomic 的。而在 Mac 上面就问题不大了。

**如何封装一个线程安全的字典**

这是大疆的一道面试题。首先我们要知道，字典不是线程安全的：

```swift
var dic = [String: Int]()

DispatchQueue.global().async {
    for _ in 1...10 {
        dic["\(dic.count)"] = dic.count
        NSLog(dic.description)
    }
}

DispatchQueue.global().async {
    for _ in 1...10 {
        dic["\(dic.count)"] = dic.count
        NSLog(dic.description)
    }
}
```

控制台打印的前几行：

```swift
2018-04-13 15:03:24.053788+0800 test[24651:2363511] ["0": 0]
2018-04-13 15:03:24.053790+0800 test[24651:2363512] ["0": 0] 
2018-04-13 15:03:24.054146+0800 test[24651:2363512] ["0": 0, "2": 2] //缺少1
2018-04-13 15:03:24.054184+0800 test[24651:2363512] ["2": 2, "0": 0, "3": 3]
2018-04-13 15:03:24.054245+0800 test[24651:2363512] ["4": 4, "2": 2, "0": 0, "3": 3]
2018-04-13 15:03:24.054254+0800 test[24651:2363511] ["4": 4, "2": 2, "0": 0, "3": 3] 
2018-04-13 15:03:24.054281+0800 test[24651:2363512] ["2": 2, "6": 6, "4": 4, "3": 3, "0": 0] //缺少5
```

可以看到数据是紊乱的。我们可以通过给 getter 和 setter 加锁或者利用串行队列的方式来封装一个线程安全的字典，下面是一个简单的示例：

```swift
struct SafeDictionary<Key, Element> where Key: Hashable {
    
    var dictionary = Dictionary<Key, Element>()
    var lock = NSLock()
    
    subscript(keyword: Key) -> Element? {
        get {
            lock.lock()
            let value = dictionary[keyword]
            lock.unlock()
            return value
        }
        set {
            guard let newValue = newValue else { return }
            lock.lock()
            dictionary[keyword] = newValue
            lock.unlock()
        }
    }
    
}

extension SafeDictionary {
    var count: Int {
        lock.lock()
        let value = self.dictionary.count
        lock.unlock()
        return value
    }
    
    var description: String {
        lock.lock()
        let value = self.dictionary.description
        lock.unlock()
        return value
    }
}
```

控制台打印：

```swift
2018-04-13 15:37:51.041003+0800 test[24761:2390589] ["0": 0]
2018-04-13 15:37:51.041003+0800 test[24761:2390590] ["0": 0]
2018-04-13 15:37:51.041580+0800 test[24761:2390590] ["0": 0, "1": 1]
2018-04-13 15:37:51.041620+0800 test[24761:2390590] ["0": 0, "1": 1, "2": 2]
2018-04-13 15:37:51.041748+0800 test[24761:2390589] ["4": 4, "2": 2, "1": 1, "0": 0, "3": 3]
2018-04-13 15:37:51.041791+0800 test[24761:2390589] ["4": 4, "2": 2, "1": 1, "5": 5, "0": 0, "3": 3] //不再缺少某一项
```

### 线程间通信

再使用多线程时，我们有时希望线程之间能互相传递数据，或是在一个线程中执行完毕任务后，跳到另外一个线程继续执行任务，比如在子线程完成耗时操作后，回到主线程更新 UI。

除了使用 GCD 切换到 main 队列以外，我们也可以通过函数：

```swift
func perform(_ aSelector: Selector, on thr: Thread, with arg: Any?, waitUntilDone wait: Bool, modes array: [String]?)
```

来让指定的线程执行某个方法。

或者使用 NSMachPort （Mach 音 `mak`）或是 Pipe 来传递消息。如果有更高级的需求，可以使用 socket 来通信。

### MainThreadChecker

检查主线程是否卡顿有多种方法，比如监测 RunLoop 的状态，或是定时向主线程发送 ping 消息，检查主线程是否能及时返回 pong 消息等。我采用了监测主线程 RunLoop 状态变化的方法，思路如下：

我们开启一个子线程，实时读取主线程的 RunLoop 状态。如果当前任务很轻，没有卡顿，那 RunLoop 的状态应该是频繁跳动的。如果没有触发事件，也可能长时间处于休眠状态。我们检测 RunLoop 是否长时间处于 `beforeSources` 或是 `afterWaiting` 状态，如果很长时间都处于这两个状态而得不到更新，就意味着主线程正在处理很繁重的任务，即卡顿了。

下面是一个初步的 demo，有些地方还需要进一步优化：

```swift
enum BYRunLoopState {
    case beforeSources
    case afterWaiting
    case others
}

class BYMainThreadChecker {
    
    var runLoopState = BYRunLoopState.others
    var isChecking = false
    
    var runLoopObserver: CFRunLoopObserver?
    
    func start() {
        addObserver()
        isChecking = true
        DispatchQueue.global().async {
            var lastTime = NSDate().timeIntervalSince1970 * 1000
            while self.isChecking {
                
                let currentTime = NSDate().timeIntervalSince1970 * 1000
                
                if self.runLoopState == .afterWaiting || self.runLoopState == .beforeSources {
                    lastTime = currentTime
                } else {
                    let dt = currentTime - lastTime
                    if dt > 50 {
                        NSLog("卡了一下") 
                        //可以在此时拿到调用栈信息，方便调试。当前发生卡顿会打印消息多次，后期可以做一个优化，单次卡顿只收集一次信息。
                    }
                }
                
            }
        }
    }
    
    func stop() {
        isChecking = false
        removeObserver()
    }
    
    private func addObserver() {
        let runLoop = CFRunLoopGetCurrent()
        
        let observer = CFRunLoopObserverCreateWithHandler(kCFAllocatorDefault, CFRunLoopActivity.allActivities.rawValue, true, 0) { (observer, activity) in
            if activity == CFRunLoopActivity.beforeSources {
                self.runLoopState = .beforeSources
            } else if activity == CFRunLoopActivity.afterWaiting {
                self.runLoopState = .afterWaiting
            } else {
                self.runLoopState = .others
            }
        }
        
        CFRunLoopAddObserver(runLoop, observer, .commonModes)
        
        runLoopObserver = observer
        
    }
    
    private func removeObserver() {
        let runLoop = CFRunLoopGetCurrent()
        CFRunLoopRemoveObserver(runLoop, runLoopObserver, .commonModes)
    }
    
}
```



