---
title: macOS上唤起其他程序并获取实时输出
date: 2018-05-25 16:50:08
tags: macOS
---

# macOS 上唤起其他程序并获得实时输出

在开发桌面端程序时，我们偶尔需要调用其他语言写的程序。桥接或者混编当然是比较好的方法，但会比较麻烦。如果可以，让我们自己的程序直接唤起另外一个程序 / 脚本，也是一种不错的选择。这个时候我们就需要两个进程之间互相通信。

两个进程间通信，可以通过一个进程向控制台 print，另外一个从控制台 read 来完成。如果是用 Java 等语言实现，其实比较简单。这里我们谈的是使用 Swift / OC 开发原生应用时，如何实时地获取输出。

### 场景

在这个例子中，我使用 Swift 开发 macOS 的原生应用，它需要调用一个 Python 脚本来跑一些算法。Python 脚本会经常 print 一些值，我们需要时时读取它们。

### 调用 Python 脚本

在工程文件夹新建一个 Python 文件 `/Scripts/main.py` ，在这里编写算法。这样我们可以通过 Bundle 来获取到这个文件。

在 NSViewController 的 ViewDidLoad 方法中，通过 Process 类来执行其他程序：

```swift
let task = Process()
task.launchPath = "/usr/bin/python"
task.arguments = [Bundle.main.path(forResource: "main", ofType: "py")!]
task.launch()
```

注意以下几点：

- NSTask 已经被弃用，应使用 Process。
- launchPath 是你在 terminal 中调用的命令（比如，运行 main.py 需要在 terminal 中键入 `python main.py`，python 是命令，main.py 是参数）。但这里需要绝对路径，python 命令一般在 `/usr/bin/` 中，这取决于你具体的环境。
- arguments 是参数。我们通过 Bundle 来获取脚本的绝对路径。
- 调用 task.launch 启动任务。

现在运行程序，可以看到 Python 脚本启动了，且在 Xcode 的控制台中源源不断地 print 信息。

### 实时获取输出

网上的大多数教程只会提及如何获取输出。当然，多数情况我们调用的程序都会很快执行完毕，我们只要获得最后的结果就好了。但是现在，我们的 Python 脚本会一直运行，我们要实时获取输出。

通过 Pipe 来为两个 process 建立一个单工的通信信道：

```swift
let outputPipe = Pipe()
task.standardOutput = outputPipe
```

现在，Python 脚本的 print 已经被转到了 pipe 中，在控制台看不到了。

使用 FileHandle 来处理 Pipe 的输出。先在 NSViewController 类中添加一个新的变量：

```swift
var outFile = FileHandle()
```

之后：

```swift
outFile = outputPipe.fileHandleForReading
```

此时已经可以直接获取 outFile 的 data 了。但是我们要的是实时，所以每次 outFile 有数据，都要发送通知：

```swift
NotificationCenter.default.addObserver(self, selector: #selector(onScriptOutputChanged), name: NSNotification.Name.NSFileHandleDataAvailable, object: outFile)
outFile.waitForDataInBackgroundAndNotify()
```

在 onScriptOutputChanged 函数中：

```swift
@objc func onScriptOutputChanged() {
    let data = outFile.availableData
    let str = String(data: data, encoding: .utf8)
    if let str = str {
        print(str)
    }
    outFile.waitForDataInBackgroundAndNotify()
}
```

注意，每次接收到通知都要再告诉 outFile 等待并通知一次，否则将只发送一次通知就结束了。

现在运行程序，就可以实时拿到 Python 脚本的输出了。