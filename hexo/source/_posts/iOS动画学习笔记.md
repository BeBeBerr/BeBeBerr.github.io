---
title: iOS动画学习笔记
date: 2018-05-28 22:51:24
tags: Animation
---

# iOS 动画学习笔记

这次的主题还有一项是关于一些高级点的动画。

### 转场动画

在这个例子中，我们实现一个通过轻扫手势控制的转场动画。呈现新界面时，会从底部滑动上来；返回时会滑动下去。

```swift
import UIKit

class TransitionAnimator: NSObject, UIViewControllerAnimatedTransitioning {
    
    let duration = 0.5
    
    var isPresenting = false
    
    func transitionDuration(using transitionContext: UIViewControllerContextTransitioning?) -> TimeInterval {
        return duration
    }
    
    func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
        let container = transitionContext.containerView
        let fromView = transitionContext.view(forKey: .from)!
        let toView = transitionContext.view(forKey: .to)!
        container.addSubview(toView)
        
        var animation = {}
       
        if isPresenting {
            toView.frame = CGRect(x: 0, y: toView.bounds.height, width: toView.bounds.width, height: toView.bounds.height)
            animation = {
                toView.frame = CGRect(x: 0, y: 0, width: toView.bounds.width, height: toView.bounds.height)
            }
        } else {
            toView.frame = CGRect(x: 0, y: -toView.bounds.height, width: toView.bounds.width, height: toView.bounds.height)
            animation = {
                toView.frame = CGRect(x: 0, y: 0, width: toView.bounds.width, height: toView.bounds.height)
            }
        }
        
        UIView.animate(withDuration: duration, animations: {
            animation()
        }) { _ in
            //⚠️注意，这里一定要通知动画完成，否则动画不结束，第二个VC将失去响应。
            transitionContext.completeTransition(true) 
        }
        
    }
}


class TransViewController: UIViewController, UIViewControllerTransitioningDelegate {
    
    let animator = TransitionAnimator()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.red
        
        
        let swipe = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(sender:)))
        swipe.direction = .up
        view.addGestureRecognizer(swipe)
        
    }

    func animationController(forDismissed dismissed: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        animator.isPresenting = false
        return animator
    }
    
    func animationController(forPresented presented: UIViewController, presenting: UIViewController, source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        animator.isPresenting = true
        return animator
    }
    
    @objc func handleSwipe(sender: UISwipeGestureRecognizer) {
        let vc = SecondVC()
        vc.transitioningDelegate = self
        present(vc, animated: true, completion: nil)
        
    }

}

class SecondVC: UIViewController {
    
    override func viewDidLoad() {
        view.backgroundColor = UIColor.yellow
        
        let swipe = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(sender:)))
        swipe.direction = .down
        view.addGestureRecognizer(swipe)
    }
    
    @objc func handleSwipe(sender: UISwipeGestureRecognizer) {
        dismiss(animated: true, completion: nil)
    }
}
```

这个例子比较简单，由于是 swipe 手势，因此是不支持交互式转场的。不过苹果也为我们提供了交互式转场动画的 API，可以参见[唐巧大大的博客](https://blog.devtang.com/2016/03/13/iOS-transition-guide/)，或苹果的[官方教程](https://developer.apple.com/library/content/featuredarticles/ViewControllerPGforiPhoneOS/index.html#//apple_ref/doc/uid/TP40007457-CH2-SW1)。

### UIKit 力学

苹果在 iOS7 中将一个轻量级 2D 物理引擎引入到了 UIKit 中，因此我们在 UIKit 中也可以很方便地去实现一些物理效果，而不必使用游戏引擎。

UIDynamic 提供了几种基本的规则：重力、碰撞、锚定、链接等。可以很方便的实现一些用其他方法难以实现的特效。它同样可以和 CollectionView 配合起来，实现一些炫酷的效果。

不过我在使用 UIDynamic 的时候遇到了一点问题：我试图去实现一个弹球的小游戏——用户通过手势拖动底部的横杆，小球碰到横杆会反弹，碰到屏幕边缘同样反弹（就像打砖块那样）。小球一开始可以受到一个方向随机的瞬时推力，产生初始速度。之后，可以通过 override `collisionBoundingPath` 属性来指定小球的碰撞边界是圆形，而不是默认的方形。但是：如何让小球无损地反弹？

```swift
collision.translatesReferenceBoundsIntoBoundary = true

let itemBehavior = UIDynamicItemBehavior(items: [ball])
itemBehavior.elasticity = 1.0
animator.addBehavior(itemBehavior)
```

我们先让小球遇到 view 的四壁全部反弹，之后，指定碰撞为完全弹性碰撞。这个时候，小球不应该损失任何能量，但是我们可以看到小球还是在碰撞几次之后，速度逐渐减慢了下来。

或许是设置 boundary 的问题？毕竟我们没有给 boundary 设置 elasticity 属性。那我们转变一个思路，使用另一个物体当作边界，并把它锚定：

```swift
let floorBehavior = UIDynamicItemBehavior(items: [floor])
floorBehavior.elasticity = 1.0
floorBehavior.isAnchored = true
animator.addBehavior(floorBehavior)
```

然而效果还是一样的。

这个问题导致我的想法最终失败了。查了一圈，也没有发现解决方案或类似问题。我不知道是还有什么隐藏的 API 我没有发现，或是我的思路是错误的，还是说 UIDynamic 并不支持这样的操作。看来做游戏（哪怕是如此简单的小游戏），还是乖乖用游戏引擎吧！

### 小任务：水波纹进度条

先来看一下效果：

![screenshot](/img/iOS%E5%8A%A8%E7%94%BB%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0/screenshot.gif)

过于细节的地方无需赘述，主要讲述一下思路：

首先，我们用 sin 函数来模拟水波纹的形状。我们通过贝塞尔曲线画出几个周期的 sin 函数，这里 dx 取的 0.5，因为步长越小，结果会越精确，但是别忘了屏幕像素是有限的，太过精确只会浪费性能而没有意义：

```swift
func generateWaveLayer() -> CAShapeLayer {
    let width = self.bounds.width
    let height = self.bounds.height
        
    var currentX: CGFloat = 0.0
    let dx: CGFloat = 0.5
    let totalLength = width * 2.0
        
    let wavePath = UIBezierPath()
    wavePath.move(to: CGPoint(x: 0, y: 0))
    while currentX <= totalLength {
        let y = 5.0 * sin(currentX * (8.0 * CGFloat.pi / totalLength))
        wavePath.addLine(to: CGPoint(x: currentX, y: y))
        currentX += dx
    }
        
    wavePath.addLine(to: CGPoint(x: totalLength, y: height))
    wavePath.addLine(to: CGPoint(x: 0, y: height))
    wavePath.close()
        
    let waveLayer = CAShapeLayer()
    waveLayer.path = wavePath.cgPath
    waveLayer.fillColor = UIColor(red: 30.0/255.0, green: 144.0/255.0, blue: 255.0/255.0, alpha: 1.0).cgColor
        
    return waveLayer
        
}
```

我们可以看到，这里的 layer 是比自己的 view 要宽的。这是因为对它做一个无限循环的平移动画就可以模拟水面的波动效果了。由于 sin 是周期函数，所以动画结束瞬间回到原点重复动画在用户看来就是连续的：

```swift
func addWaveAnimation(to animateLayer: CAShapeLayer) {
    let animation = CABasicAnimation(keyPath: "position.x")
    animation.duration = 3.0
    animation.fromValue = 0.0
    animation.toValue = self.bounds.width
    animation.repeatCount = MAXFLOAT
        
    animateLayer.add(animation, forKey: nil)
}
```

修改水平面，其实就是在调节 frame.y。但是 layer 是在播放动画的，为了修改 frame 和动画本身产生冲突，我们给这个 layer 单独一个 view ：

```swift
self.addSubview(visibleView)
visibleView.frame = self.bounds
        
waveLayer = generateWaveLayer()
waveLayer.frame = CGRect(x: -self.bounds.width, y: 0, width: self.bounds.width * 2.0, height: self.bounds.height)
        
visibleView.layer.addSublayer(waveLayer)
addWaveAnimation(to: waveLayer)
```

然后调节 visibleView 的 frame：

```swift
func changeWaterLevel(to relativeLevel: CGFloat) {
    visibleView.frame = CGRect(x: 0, y: (1.0 - relativeLevel) * self.bounds.height, width: self.bounds.width, height: self.bounds.height)
}
```

