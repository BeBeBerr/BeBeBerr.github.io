---
title: Promise是什么
date: 2018-05-20 16:17:48
tags: Promise
---

# Promise 是什么

之前和前端组的同学聊天，发现他们有一个很有意思的东西叫 Promise。既然要是从前端组那里听说的 Promise，那么我们就先谈一些关于前端的东西。

### 单线程的 JavaScript

JavaScript 是单线程语言，也就是同一时间只能做一件事情。准确来说，是负责解释并执行 JS 代码的线程只有一个。为什么要把 JavaScript 设定为单线程呢？这是因为它的工作环境主要是在浏览器中与用户互动，并操作 DOM。如果它是多线程的，那么就可能会并发地操作 DOM，从而带来非常复杂的同步问题。在新标准中，JavaScript 也被允许开启子线程，但子线程完全受主线程控制，且禁止操作 DOM。因此，JavaScript 仍然是单线程语言。

既然 JS 是单线程的，那么当我们进行耗时操作，比如前端非常常见的网络请求时，不就会发生界面卡死的情况吗？但我们又可以看到，浏览网页时是非常顺滑流畅的，并没有发生这种情况。因为虽然 JS 是单线程的，但浏览器作为一个 App 是支持多线程的。JS 通过一些方法，完全可以做到异步操作。异步和单线程并不是冲突的。

### JavaScript 异步原理

首先来区分一下同步和异步。同步是指排队执行的任务，即前一个任务执行完成了，后一个任务才能开始执行，也就是我们熟悉的 sync。所有的同步任务都会在主线程执行，并形成一个执行栈。而异步任务有了运行结果后，就会把对应的事件放到任务队列中，比如鼠标点击事件、键盘事件、网络请求事件等等。当执行栈空了之后，系统就会读取任务队列，把相应的任务放入执行栈中执行。这个过程会不断的重复。

这里说的执行异步任务，指的是回调函数。异步任务在创建时必须指定回调函数，这个函数会被挂起，在主线程空闲后被拿来执行。这个重复的过程被称为 Event Loop。

清楚了回调方法后，再来谈具体是怎么实现异步的。前面提到，浏览器是多线程的，在浏览器中，会有这些线程：

- UI 线程。我们非常熟悉的线程，负责渲染 UI 界面。
- JS 引擎线程。JS 代码在这个线程上执行。但是 JS 引擎线程并不仅是一个线程，会有子线程来配合它。JS 会影响页面渲染，因此它和 UI 线程是互斥的，这也是为什么 JS 执行时会阻塞 UI 线程。
- HTTP 请求线程。
- Event Loop 轮询线程。
- ……

向网络请求这类的操作，实际上是通过浏览器的 API 委托给浏览器执行的。执行完毕，回调函数再给 JS 引擎执行。

### 回调地狱 Callback Hell

回调函数大家都很熟悉。每次异步任务，都要指定一个回调函数。那当我们想完成一步操作后，再进行下一步操作，就要在上一步的回调函数中写。如果下一步依赖上一步完成的情况多了，就会出现回调地狱：

```javascript
{
    {
        {
            {
                {
                    //很容易编写出三角形的代码
                }
            }
        }
    }
}
```

举个例子：先登录，登录之后我们可以拿到用户的信息。根据用户信息去请求用户的头像，拿到头像后再去设置图片……我们在平时编写 iOS 应用时很容易就写成这样：

```swift
login { info, error in
    if let info = info {
        fetch(avatar: info.userAvatarURL) { image, error in
            if let image = image {
                self.imageView = image
            }
        }
    }
}
```

饱受回调地狱折磨的显然不仅是前端，还有我们 iOS 啊！

### 初识 Promise

Promise 最早由开源社区提出并实现，最终被加入到了 JS ES6 标准中。Promise 代表了异步操作最终完成的或失败的对象。你可以把回调函数绑定在这个由函数返回的对象上，而不是把回调函数当作参数传进函数。

当作参数传进函数的例子：

```javascript
function successCallback(result) {
  console.log("It succeeded with " + result);
}

function failureCallback(error) {
  console.log("It failed with " + error);
}

doSomething(successCallback, failureCallback);
```

绑定 Promise 对象的例子：

```javascript
doSomething().then(successCallback, failureCallback);
```

### Promise 了什么？

Promise 到底保证了什么呢？

- 当前运行完成前，回调函数永远不会被调用。
- .then 添加的回调函数，都会被调用。
- 多次调用 .then 可以添加多个回调函数，它们会按照插入顺序独立运行。

Promise 对象有三种状态，Pending、Resolved、Rejected。只有异步操作的结果可以决定当前是哪一种状态，其他任何操作都无法改变状态，且状态一旦改变就不会再变。这也是 Promise 名字的来源。

### Promise 使用

我们可以直接 new 一个 Promise 对象，也可以把 Promise 对象作为返回值。Promise 里的代码会立即执行。

```javascript
//1
let promise = new Promise((resolve, reject) => { //使用了箭头函数
    if(success) {
        resolve(value)
    } else {
        reject(error)
    }
})

//2
function doSomething() {
    return new Promise(function (resolve, reject) {
        if(success) {
            resolve(value)
        } else {
            reject(error)
        }
    })
}
```

Promise 接受一个函数作为参数，这个函数又有两个参数 resolve 和 reject。resolve 和 reject 又分别是两个函数。这两个函数有 JavaScript 引擎提供，不需要自己实现。resolve 的作用是把状态从 pending 变为 resolved；reject 的作用是把状态从 pending 变为 rejected，同时把错误作为参数传递出去。

生成 Promise 实例后，可以用 then 方法制定状态变为 Resolved 和 Rejected 时的回调函数：

```javascript
promise.then(function(value) {
    //success
}, function(value) {
    //failure
});
```

then 方法的第二个参数是可选的，不一定要提供。这两个函数接受 Promise 对象传出的值作为参数。

整体来看就是这样：

```javascript
function timeout(ms) {
	return new Promise((resolve, reject) => {
        setTimeout(resolve, ms, 'done'); //'done'作为参数传递给resolve函数
	});
}
timeout(100).then((value) => {
	console.log(value);
});
```

then 的返回值也是一个 Promise 对象，因此可以链式调用。而 Promise 的错误具有冒泡性质，会一直向后传递直到捕获为止，因此可以在最后用 catch 统一捕获错误。

### 看一段代码

到现在，我们终于能看懂前端组的同学写的部分代码了，一起欣赏一下：

```javascript
function createRequest(......) {
    const options = {......};
    ......
    return new Promise((resolve, reject) => {
    	request(options, (error, res, body) => {
      		if (error) {
        		reject(error);
      		} else {
        		resolve({ error, res, body });
      		}
		});
	});
}
```

首先，这是一个用于发送 HTTP 请求的函数，它传入了一些参数用来构建请求的参数 options。函数的结尾，返回了一个 Promise 对象。构造这个 Promise 对象时，传入了一个函数。这个函数体里，调用 request 函数实际发送请求，request 函数除了接受刚刚构建的 options 以外，还有一个回调函数作为参数。请求成功，resolve；失败，reject。

当然，在实际调用这个函数的时候，他是使用了 await 语法糖结合 try / catch 捕获错误。不过这里就不再讨论 await / async 这些东西了。

### 回到 iOS

讲了这么多 JavaScript 的东西，是时候回到 iOS 了。既然前端有 Promise 这么好的东西，我们当然也可以使用。

感谢开源社区，我们有了 [Promise Kit](https://github.com/mxcl/PromiseKit) 。

再来看我们已开始举的例子：登录 - 获取头像，用 Promise Kit 可以这样写：

```swift
import UIKit
import PromiseKit

struct Info {
    var url = ""
}

struct MyError: Error {
    var description: String
}

class ViewController: UIViewController {
    
    var imageView = UIImageView()

    override func viewDidLoad() {
        super.viewDidLoad()
     
        firstly {
            login()
        }.then { info in
            self.fetch(imageUrl: info.url)
        }.done { image in
            self.imageView.image = image
            print("got image")
        }.catch { error in
            print(error)
        }
        
    }
    
    func login() -> Promise<Info> {
        print("start login")
        return Promise { seal in
            DispatchQueue.global().async {
                Thread.sleep(forTimeInterval: 2)
                seal.fulfill(Info(url: "https://www.baidu.com"))
            }
        }
    }
    
    func fetch(imageUrl: String) -> Promise<UIImage> {
        print("start fetch image")
        return Promise { seal in
            DispatchQueue.global().async {
                Thread.sleep(forTimeInterval: 2)
                seal.reject(MyError(description: "获取图片出错了"))
            }
        }
    }

}
```

这里我就简单的 sleep 了两秒钟来模拟网络请求。我们可以看到，代码成功地变成了扁平的，避免了层层嵌套。在 Promise Kit 中，执行成功的函数被叫做了 fulfilll。firstly 只是语法糖，直接调用 `login().then` 是完全一样的，但是使用 firstly 将使得语义更加清晰。

