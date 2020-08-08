---
title: iOS限制UIScrollView允许滑动角度
date: 2017-11-13 23:13:09
tags: [iOS, Gesture]
---

# iOS 限定 UIScrollView 允许滑动角度

本文主要解决 UIScrollView 中自己添加的滑动手势与它本身自带的滑动手势冲突的问题。

最近做的项目中，有一个需求是在一个 UITextView 中，把手指滑动过程中覆盖的文字标记为红色（以备后续使用）。而由于文本可能很长，上下滚动 UITextView 的功能要保留，就像下面这样：

![scroll](/img/限定ScrollView允许滑动角度/scroll.gif)

滑动把文本标记为红色比较简单。只需要在 UITextView 上添加一个 UIPanGestureRecognizer ，手指移动的时候找出坐标对应的文字就好了。要命的是，这会带来手势冲突：所有的滑动事件都被自己添加的这个手势捕获了，UITextView 没有办法上下滚动。一个直观的想法就是，我们可以给 UITextView 限定一个允许滚动的角度，比如，用户以 80～90 度的方向（非常竖直的方向）滑动时，认为是在滚动视图；而以一个较为水平的方向滑动时，认为在标记文字。

但是怎么去判定方向呢？我们固然可以在自己添加的手势中根据坐标算出来角度，但是这样没有办法限制住 UITextView 的滚动。UIScrollView 的代理方法也做不到限制它滚动。所以只能另辟蹊径了！

首先，我们要覆盖掉 UITextView 自己判断是否执行手势的方法，借此来控制手势的成功与失败：

```swift
class TextView: UITextView {
    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        if gestureRecognizer == self.panGestureRecognizer {
            let point = (gestureRecognizer as! UIPanGestureRecognizer).translation(in: self)
            if fabs(point.y) / fabs(point.x) < 1 {
                return false
            }
        }
        return super.gestureRecognizerShouldBegin(gestureRecognizer)
    }
}
```

这里我们用自己的 TextView 来继承了 UITextView。当 x 与 y 成一定比值时（这里是大于 45 度，因为 arctan(1) = 45度）返回 false 令手势失败。

然后，在自己的 ViewController 中，设置自己添加的手势必须要在 UITextView 自己的滑动手势失败后（即角度比较水平的时候）才开始识别。

```swift
func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer) -> Bool {
    if gestureRecognizer == textView.panGestureRecognizer {
        return false
    } else {
        return true
    }
}
```

大功告成！

但是程序一运行，发现不对劲了。每次滑动一段时间之后，文字才开始变红，这个体验就很不好了。仔细一想，原来是因为自己的手势必须要等待滑动手势失败之后才能开始识别。而这需要时间。所以我们只好把逻辑反过来，竖直滑动的时候让自己的手势失败；再让 UITextView 的手势等待我们自己的手势失败后再开始识别。

最终的代码：

```swift
class TextReciteViewController: UIViewController, UITextViewDelegate, UIGestureRecognizerDelegate {

    let textView = TextView() //要用自己的 TextView 而不是 UITextView 了
    
    override func viewDidLoad() {
        super.viewDidLoad()
      	//......
   		textView.delegate = self
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(TextReciteViewController.panToSelectText(gesture:)))
        panGesture.delegate = self
        textView.addGestureRecognizer(panGesture)
      	//......
    }

    @objc func panToSelectText(gesture: UIPanGestureRecognizer) {
      	//把文字标记为红色
        let location = gesture.location(in: textView)
        //......
    }
  
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        if otherGestureRecognizer == textView.panGestureRecognizer {
            return true
        } else {
            return false
        }
    }
}

class TextView: UITextView {
    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        if gestureRecognizer is UIPanGestureRecognizer && gestureRecognizer != self.panGestureRecognizer {
            let point = (gestureRecognizer as! UIPanGestureRecognizer).translation(in: self)
            if fabs(point.y) / fabs(point.x) > 0.15 {
                return false
            }
        }
        return super.gestureRecognizerShouldBegin(gestureRecognizer)
    }
}
```

最终就能实现一开始的动图啦！