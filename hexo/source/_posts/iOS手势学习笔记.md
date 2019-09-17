---
title: iOS手势学习笔记
date: 2018-05-23 16:20:07
tags: Gesture
---

# iOS 手势学习笔记

这次的主题是手势稍微高级一点的用法。

### GestureRecognizer 的代理方法

`UIGestureRecognizerDelegate ` 中定义了以下方法：

```swift
optional public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool
```

当手势识别器的状态试图转换到 `UIGestureRecognizerStatePossible ` 状态时调用，如果 return 了 false，则手势的状态会被转换到失败。

手势识别器的状态机如下图：

![stateMachine](/img/iOS%E6%89%8B%E5%8A%BF%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0/stateMachine.png)

```swift
optional public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool
```

当两个手势可能会互相阻塞时会调用这个方法。如果返回 true，则两个手势可以同时响应。这个方法默认返回 false，即一般情况下响应了一个手势就不会响应另一个手势了。

需要注意，返回 true 会保证两个手势能被同时响应，而返回 false 不能保证两个手势不能被同时响应。因为另一个手势的代理方法可能会返回 true，即“一真即真”。

```swift
optional public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRequireFailureOf otherGestureRecognizer: UIGestureRecognizer) -> Bool
```

每次试图去识别的时候都会调用，因此失败依赖可以惰性确定，并且可以设置给跨视图层级的识别器。

与上面的方法类似，因为牵扯到两个识别器，因此还是一真即真。

```swift
optional public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer) -> Bool
```

与上面的方法对称。如果返回 true，则在自己 fail 之前，otherGestureRecognizer 不能识别手势，要等待 gestureRecognizer fail 之后才可以。

```swift
optional public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool
```

在 `touchesBegan` 之前就会调用，如果返回 false，则会阻止识别器接收 UITouch。

```swift
optional public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive press: UIPress) -> Bool
```

与上面类似，会阻止识别器接受 UIPress。

那么 UIPress 是什么？直接 Google UIPress 并没有获得什么有用的资料，说明 UIPress 其实并不常用。苹果自己的文档写得也是让人看不懂，后来是看到了微软 Xamarin 的文档才稍微明白过来……原来它代表了远程控制器或游戏手柄上物理按钮按下的事件。UITouch - 屏幕触摸；UIPress - 按钮按下，名字起得还是可以的。

### 手势冲突怎么办

手势冲突确实是比较棘手的问题，最根本的方法还是尽量避免多个手势叠加在一起。

如果真的有很多相似的手势要同时使用，我们可以使用上面的代理方法，优先识别一些手势，让另外的手势 fail 掉。

还有，如果界面上有非常非常多的 view 需要响应手势，那么与其在每个 view 上都添加手势识别器，不如把要用的几种识别器添加到最底层的 view 上。之后我们自己根据 view 的层级来分发手势，不过要多写一些判断响应者的代码。

### 自定义手势识别器

首先需要注意的是，当你编写一个 UIGestureRecognizer 的子类时，是需要 import 头文件 `UIGestureRecognizerSubclass.h` 的。这个头文件中定义了很可能需要覆写的属性和方法。如果是 Swift：

```swift
import UIKit
import UIKit.UIGestureRecognizerSubclass
```

接下来我们需要重写 touchesBegan 等方法，并设置 state 的属性，来控制状态机状态的跳转。下面是实现一个识别画圈的手势识别器的例子：

```swift
class CircleGestureRecognizer: UIGestureRecognizer {
    
    private var touchSamples = [CGPoint]()
    private var isCircle = false
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesBegan(touches, with: event)
        guard touches.count == 1 else {
            state = .failed
            return
        }
        state = .began
    }
    
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesMoved(touches, with: event)
        if state == .failed {
            return
        }
        
        let window = view?.window
        
        if let loc = touches.first?.location(in: window) {
            touchSamples.append(loc)
            state = .changed
        }
        
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        
        isCircle = checkCircle()
        print(isCircle)
        
        state = isCircle ? .ended : .failed
    }
    
    override func reset() {
        super.reset()
        isCircle = false
        touchSamples = []
    }
    
    private func checkCircle() -> Bool {
        guard touchSamples.count > 4 else {
            return false
        }
        let p1 = touchSamples.first!
        let p2 = touchSamples[touchSamples.count / 4]
        let p3 = touchSamples[touchSamples.count * 2 / 4]
        let p4 = touchSamples[touchSamples.count * 3 / 4]
        
        let centerX = (p1.x + p2.x + p3.x + p4.x) / 4.0
        let centerY = (p1.y + p2.y + p3.y + p4.y) / 4.0
        let center = CGPoint(x: centerX, y: centerY)
        let radius = (getDistance(from: p1, to: center) + getDistance(from: p2, to: center) + getDistance(from: p3, to: center) + getDistance(from: p4, to: center)) / 4.0
        
        var count = 0
        for point in touchSamples {
            if abs(getDistance(from: point, to: center) - radius) < 30 {
                count += 1
            }
        }

        return Double(count) / Double(touchSamples.count) > 0.8
    }
    
    private func getDistance(from point: CGPoint, to otherPoint: CGPoint) -> CGFloat {
        return sqrt((point.x - otherPoint.x) * (point.x - otherPoint.x) + (point.y - otherPoint.y) * (point.y - otherPoint.y))
    }
    
}
```

这里判定是否是一个圆圈的算法比较简单。只是取了 4 个点，求出它们的平均坐标作为圆心，再求出它们到圆心的平均距离作为半径。接着，检查是否有足够多（大于 80% ）的点到圆心的距离误差小于某个值。当然这样的判断非常粗糙，如果想要达到比较精确的识别效果，应该使用更复杂的算法来做拟合。

### 小任务1：两个ScrollView 联动

最简单的想法肯定是在一个 scrollView 的 didScroll 方法里，把另一个 scrollView 的 offset 设置为和自己一样的值。

```swift
func scrollViewDidScroll(_ scrollView: UIScrollView) {
    if scrollView == leftScrollView {
        rightScrollView.contentOffset = leftScrollView.contentOffset
    }
}
```

这当然是一种可行的方法。但是当两个 scrollView 里面的内容不一样多时，就会出现一边还没滑完，另一边已经全部滑出去呈现一片空白的情况。如果需求不允许这样，当然就不行。仅仅是在 didScroll 里面再做限制的话，就会丧失回弹效果。虽然我感觉一般没有这么变态的需求……

但接下来是开脑洞的时间：我们有没有别的方法呢？这里我想说的是，能不能把一个手势同时传递给两个 view 呢？

我的第一反应是，既然触摸事件会从 superView 传递到 subView，那么我只要把第二个 scrollView 作为第一个 scrollView 的子视图，再允许两个手势同时响应就可以了。经过确认，两个 scrollView 确实可以同时响应手势，但由于把 scrollView 添加到另一个 scrollView 上了，它就也会跟着滚动。即它一边自己滚动，一边跟着底部的 scrollView 滚动。那如果我们想把它固定住，就要在 didScroll 方法里修改它的 frame…而且，scrollView 默认是 clipsToBounds 的，如果要让两个 scrollView 平行放置，还要自己去遮挡露出来的 content。这个想法似乎不是很好。

**第二个想法**是，我们还是让两个 scrollView 处于平行层级，利用 OC 强大的动态特性把手势传递过去。

首先，我们要修改右边的 scrollView 的 hitTest 方法，让手指在左边的 scrollView 上滑动时，也能响应手势：

```swift
override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    return self
}
```

好了，现在无论在哪里滑动，右边的 scrollView 都能响应了。但是有视图响应手势，手势就不会继续派发给平行的视图了。我们就需要自己传递过去。

我们知道 ScrollView 里面是内置了一个 panGestureRecognizer 的。ScrollView 这些滑动，包括滑动的各种物理效果，肯定也是在这个内置的 panGestureRecognizer 的 target 方法实现的。那么我们把这个 recognizer dump 出来看一下：

```
- <UIScrollViewPanGestureRecognizer: 0x7ff5df417700; state = Possible; delaysTouchesEnded = NO; view = <GestureAnimation.MyView 0x7ff5e081a400>; target= <(action=handlePan:, target=<GestureAnimation.MyView 0x7ff5e081a400>)>> #0
  - super: UIPanGestureRecognizer
    - super: UIGestureRecognizer
      - super: NSObject

```

可以看到，内置的这个 panGestureRecognizer 的 target 是一个签名为 `handlePan:` 的方法。但这个方法是私有的，因此我们没有办法更改它的逻辑。但是不怕，我们可以通过 method swizzling 把这个方法替换成我们自己的方法。首先由于我们必须要保证方法只被替换一次，因此在 ViewController 里面写，而不要在 ScrollView 的子类 的 init 方法里写，因为替换的是整个类的实例方法，我们的程序中有两个 scrollView，会 init 两次：

```swift
let m1 = class_getInstanceMethod(MyView.self, Selector("handlePan:"))
let m2 = class_getInstanceMethod(MyView.self, #selector(MyView.myHandlePan(gesture:)))
method_exchangeImplementations(m1!, m2!)
```

这里的 MyView 是我写的 UITextView 的子类。现在，我们已经把 MyView 的父类 UITextView 的父类 UIScrollView 的 handlePan 方法和我们自己的 myHandlePan 方法替换了。这时如果去滑动 scrollView，会发现它开始调用我们自己的方法了！

UIScrollView 的回弹效果、减速效果等等是非常完美的，我们肯定不希望自己去实现这些效果，因此我们要做的是在我们的 myHandlePan 方法里再去调用原来的 handlePan 方法。这不过，这次我们又要调用右边的 scrollView 的 handlePan，又要调用左边的 handlePan，这样两个 scrollView 就能联动了。

```swift
@objc func myHandlePan(gesture: UIPanGestureRecognizer) {
    self.myHandlePan(gesture: gesture)
    other?.myHandlePan(gesture: gesture) //other 是左边的 scrollView 的引用
}
```

诶，这里为什么调用的是 myHandlePan 呢？不应该是通过 performSelector 方法调用 handlePan 吗？这样不会递归吗？别忘了，我们可是交换了 myHandlePan 和 handlePan 的，调用 myHandlePan 其实是在调用原来的 handlePan。

但是这样写是不行的，我们会发现程序 crash 掉了，且完全没有报错信息！这是为什么呢？原来，仅仅标记了 @objc 的函数和属性并不能保证在运行时被调用，因为 swift 会做静态优化。现在，我们通过 dynamic 关键字来让它变成完全动态的：

```swift
@objc dynamic func myHandlePan(gesture: UIPanGestureRecognizer) {
    self.myHandlePan(gesture: gesture)
    other?.myHandlePan(gesture: gesture)
}
```

运行程序，我们会发现右边的 scrollView 正常的在滑动，而左边的一动不动！我们费了半天劲却又回到了原点。这是为什么呢？

是因为 other 是 nil 吗？毕竟向 nil 发送消息不会有反应。但我们 print 一下发现 other 并不是 nil。这时，我**猜测**是苹果在实现 handlePan 的时候，做了判断，检查传入的参数是不是与自己内置的 panGestureRecoginzer 一致：

```objective-c
//我瞎猜的苹果的实现
- (void)handlePan:(UIPanGestureRecognizer *)sender {
    if (sender != _panGestureRecognizer) {
        return;
    }
    //...
}
```

嗯…苹果爸爸的代码还真是严谨呢。但是没关系，我们把左边的 panGestureRecognizer 属性也换掉就好了，即使它是 get-only 的又何妨，我们有 runtime：

```swift
leftScrollView.setValue(rightScrollView.panGestureRecognizer, forKey: "panGestureRecognizer")
```

好了，现在运行程序——大功告成！两个 scrollView 完美地联动了！这也说明我上面瞎猜的应该是正确的。用这种方法也算是费尽周折，足足花了我大半天的事件各种调试。不过这波操作还比较骚，我喜欢。

由此可见，OC 的动态特性确实是一件大杀器。不过，调用私有方法确实是不推荐的，除非万不得已，一般不要这样。当未来，UIKit 全部用 Swift 重写后，我们也可能会丧失这把利器吧！看 Swift 自己的 Runtime 怎么实现了。

