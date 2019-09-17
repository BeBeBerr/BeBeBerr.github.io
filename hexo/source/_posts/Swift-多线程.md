---
title: Swift 多线程初步
date: 2017-06-23 11:04:07
tags: MultiThreading
---

# Swift 多线程初步

### 多线程简介

在 iOS 中，每个进程（应用程序）启动后，都拥有一个主线程（UI 线程）。这个线程是其他所有线程的父线程。其他线程都是独立于 CocoaTouch 框架的，因此只能在主线程更新 UI。在其他线程中虽然也可以更新 UI，但由于 UIKit 不是线程安全的，可能会导致出现问题，因此不推荐。当用户做网络操作、更新数据库等比较耗时的操作时，如果不使用多线程，而直接在主线程进行的话，就会导致整个应用卡住，用户体验很差。多线程就是在多个处理器中（或者单个处理器分时间片）同步地执行一些操作，从而提高效率。

### 线程和进程

一个应用程序可以看作是一个进程。线程是进程的基本执行单元，进程的所有任务都在线程中执行。一个进程一般可分为新建、就绪、运行、阻塞、终止等 5 个状态。

### iOS 多线程程序开发

在 iOS 中，我们有以下几种方式去开发多线程的程序，分别是：

- pThread
- NSThread
- GCD
- NSOperation

### pThread

pThread 是一个 C 语言的跨平台多线程框架，可以运行在 Unix 、Linux 、macOS 等多种操作系统上，Windows 也有相应的移植版本，当然也可以运行在 iOS 上。在 obj-C 中，可以引入 pthread.h 头文件来使用。由于过于底层，不仅需要与 C 语言交互，还要手动管理线程的生命周期等事务，因此在开发中基本不会使用。

### NSThread

NSThread 是经过苹果封装的框架，完全面向对象，但线程的生命周期仍然需要手动管理。

```swift
import UIKit
import PlaygroundSupport

class ViewController: UIViewController {
    
    override func viewDidLoad() {
        //点击按钮，创建子线程
        view.backgroundColor = UIColor.white
        let button = UIButton(frame: CGRect(x: 100, y: 100, width: 100, height: 30))
        button.backgroundColor = UIColor.red
        button.addTarget(self, action: #selector(ViewController.onClick), for: .touchUpInside)
        
        view.addSubview(button)
    }
    
   
    func onClick() {
        NSLog("Main Thread\n")
        let thread = Thread(target: self, selector: #selector(ViewController.runThread), object: nil) //创建线程
        thread.start() //启动线程
    }
    
    func runThread() {
        for i in 0..<10 {
            NSLog("%d\n", i)
            sleep(1)
        }
    }
    
}

PlaygroundPage.current.liveView = ViewController()
```

这个程序会创建一个新的线程。在这个线程中，每隔 1 秒钟输出一个数字。

点击按钮后，控制台输出如下信息：

```
2017-06-22 22:53:43.704 test[7391:1122296] Main Thread
2017-06-22 22:53:43.715 test[7391:1122434] 0
2017-06-22 22:53:44.727 test[7391:1122434] 1
2017-06-22 22:53:45.732 test[7391:1122434] 2
2017-06-22 22:53:46.737 test[7391:1122434] 3
2017-06-22 22:53:47.743 test[7391:1122434] 4
2017-06-22 22:53:48.747 test[7391:1122434] 5
2017-06-22 22:53:49.752 test[7391:1122434] 6
2017-06-22 22:53:50.756 test[7391:1122434] 7
2017-06-22 22:53:51.762 test[7391:1122434] 8
2017-06-22 22:53:52.764 test[7391:1122434] 9
```

可以看到在主线程中，线程号是 1122296 ，而输出数字的线程号是 1122434 。可见确实新建了一个子线程。

也可以使用其他的方法创建新的线程：

```swift
Thread.detachNewThreadSelector(#selector(ViewController.runThread), toTarget: self, with: nil)
```

或者：

```swift
self.performSelector(inBackground: #selector(ViewController.runThread), with: nil)
```

但是这两种方法无法获得线程对象。⚠️注意第二个方法中是 self 的方法，而不是 Thread 的静态方法。

### GCD

GCD 全称 Grand Central Dispatch，是苹果为并发代码在多核心处理器上执行提供支持的一套 API，底层用 C 语言编写。GCD 管理着一个线程池（队列），根据系统资源自动对多线程进行管理，而不用程序员直接和线程打交道。

GCD 有三种队列形式：

|         名称          |                    简介                    |
| :-----------------: | :--------------------------------------: |
|       Serial        | 串行队列，队列和队列之间是并行执行的，但是队列里面的各个子线程是顺序执行的。事实上，队列里面是一个线程，而不是多个线程。唯一的一个线程保证了严格的串行执行。 |
|     Concurrent      |   并发队列可以同步地执行多个任务，会由系统根据负载来选择并发执行的任务。    |
| Main Dispatch Queue |   提交到此线程的任务会被放到主线程执行，可以在此进行更新 UI 的操作。    |

**基本用法**

async 是异步；sync 是同步。

```swift
import UIKit
import PlaygroundSupport

class ViewController: UIViewController {
    
    override func viewDidLoad() {
        //点击按钮，创建子线程
        view.backgroundColor = UIColor.white
        let button = UIButton(frame: CGRect(x: 100, y: 100, width: 100, height: 30))
        button.backgroundColor = UIColor.red
        button.addTarget(self, action: #selector(ViewController.onClick), for: .touchUpInside)
        
        view.addSubview(button)
    }
    
   
    func onClick() {
        NSLog("Main Thread\n")
        DispatchQueue.global().async {
            self.runThread() //耗时操作
            DispatchQueue.main.async {
                NSLog("更新 UI") //回到主线程更新 UI
            }
        }
    }
    
    func runThread() {
        for i in 0..<10 {
            NSLog("%d\n", i)
            sleep(1)
        }
    }
    
}

PlaygroundPage.current.liveView = ViewController()
```

点击按钮后，控制台输出以下信息：

```
2017-06-23 09:24:47.665 test[790:34424] Main Thread
2017-06-23 09:24:47.666 test[790:34456] 0
2017-06-23 09:24:48.668 test[790:34456] 1
2017-06-23 09:24:49.671 test[790:34456] 2
2017-06-23 09:24:50.676 test[790:34456] 3
2017-06-23 09:24:51.677 test[790:34456] 4
2017-06-23 09:24:52.682 test[790:34456] 5
2017-06-23 09:24:53.688 test[790:34456] 6
2017-06-23 09:24:54.692 test[790:34456] 7
2017-06-23 09:24:55.697 test[790:34456] 8
2017-06-23 09:24:56.701 test[790:34456] 9
2017-06-23 09:24:57.706 test[790:34424] 更新 UI
```

可以看到更新 UI 时，线程标号与主线程标号一致。说明耗时操作完成之后，确实回到了主线程执行更新 UI 的操作。

**DispatchGroup**

```swift
let group = DispatchGroup()
        
let download1 = DispatchQueue(label: "d1")
download1.async(group: group) {
    self.runThread()
}
        
let download2 = DispatchQueue(label: "d2")
download2.async(group: group) {
    self.runThread()
}
        
group.notify(queue: DispatchQueue.main, execute: {
    NSLog("更新 UI")
})
```

在组里的任务都结束之后，会执行 notify。

### NSOperation

NSOperation 基于 GCD，封装了一些更为实用的功能。除了使用 BlockOperation 之外，还可以自定义子类继承 NSOperation。

**基本用法**

```swift
let queue = OperationQueue()
queue.maxConcurrentOperationCount = 2 //设置最大并发数
        
let operation = BlockOperation(block: {
    self.runThread()
})
        
queue.addOperation(operation)
```

**添加依赖**

```swift
let queue = OperationQueue()
queue.maxConcurrentOperationCount = 2
        
let operationA = BlockOperation(block: {
    self.runThread()
})
        
let operationB = BlockOperation(block: {
    self.runThread()
})
        
operationB.addDependency(operationA) //添加依赖关系
        
queue.addOperation(operationA)
queue.addOperation(operationB)
```

这里 B 依赖 A，所以 B 会等待 A 执行完之后再执行。和串行执行不同，A 和 B 是两个独立的线程。注意添加依赖的时候不要构成循环依赖，否则会导致死锁。

### 同步锁

多个线程访问同一个资源时，可能会因为“争抢”而出现数据错乱。比如经典的售票问题：

```swift
import UIKit
import PlaygroundSupport

class ViewController: UIViewController {
    
    var ticketAmount = 20
    
    override func viewDidLoad() {
        view.backgroundColor = UIColor.white
        let button = UIButton(frame: CGRect(x: 100, y: 100, width: 100, height: 30))
        button.backgroundColor = UIColor.red
        button.addTarget(self, action: #selector(ViewController.onClick), for: .touchUpInside)
        
        view.addSubview(button)
    }
    
   
    func onClick() {
        NSLog("Main Thread\n")
        let salerA = Thread(target: self, selector: #selector(ViewController.sale(name:)), object: "A")
        let salerB = Thread(target: self, selector: #selector(ViewController.sale(name:)), object: "B")
        salerA.start()
        salerB.start()
    }
    
    func sale(name: String) {
        while ticketAmount > 0 {
            ticketAmount -= 1
            print(name + "售出一张票，剩余\(ticketAmount)张")
            sleep(1)
        }
    }
    
}

PlaygroundPage.current.liveView = ViewController()
```

点击按钮后，控制台输出：

```
A售出一张票，剩余19张
B售出一张票，剩余18张
B售出一张票，剩余16张
A售出一张票，剩余16张
A售出一张票，剩余15张
B售出一张票，剩余14张
A售出一张票，剩余13张
B售出一张票，剩余12张
B售出一张票，剩余11张
A售出一张票，剩余10张
A售出一张票，剩余8张
B售出一张票，剩余9张
A售出一张票，剩余7张
B售出一张票，剩余6张
A售出一张票，剩余5张
B售出一张票，剩余4张
A售出一张票，剩余3张
B售出一张票，剩余2张
B售出一张票，剩余1张
A售出一张票，剩余0张
```

不出意外地出现了数据错乱现象。为了解决这个问题，就需要对访问资源的代码部分加锁：

```swift
func sale(name: String) {
    while ticketAmount > 0 {
        objc_sync_enter(self) //加锁
        ticketAmount -= 1
        print(name + "售出一张票，剩余\(ticketAmount)张")
        sleep(1)
        objc_sync_exit(self) //解锁
    }
}
```

再次运行，数据就正常了。