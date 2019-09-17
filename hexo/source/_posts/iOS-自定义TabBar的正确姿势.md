---
title: iOS 自定义TabBar的正确姿势
date: 2017-09-02 13:45:10
tags:
---

# iOS 自定义TabBar的正确姿势

看默认风格的 TabBar 久了未免会觉得有些审美疲劳，于是就想自定义 TabBar，加一些小动画。自定义 TabBar 并不困难，无非就是写一个 UITabBarController 的子类，然后在 storyboard 中设置一下嘛。事实上，我之前也写过这样的一个小 demo，放在了 gitlab 上：[TabBarAnimation](https://git.bingyan.net/BeBeBerr/TabBarAnimation) 。这次想在自己的小项目上应用一下，美滋滋地直接把代码拷贝过来，却出现了不少问题。经过一番周折，终于发现了自定义 TabBar 的正确姿势。

### 在 Demo 中的实现思路

```swift
class CSTabBarController: UITabBarController {
    var imageViews = [UIImageView]()
    let mainView = UIView()

    override func viewDidLoad() {
        super.viewDidLoad()
        mainView.frame = self.tabBar.bounds
        self.view.addSubview(mainView)
        //balabal......
        self.tabBar.removeFromSuperview()
    }
 
    func onClickTabBarButton(sender:UIButton) {
        //balabala......
    }
}
```

思路很简单。既然是自定义 TabBar，而且没办法在原来的 BarItem 上修改，那我就把原来的 TabBar 移除，然后在 view 上新建一个 view 冒充 TabBar 嘛！只要把原来 Item 的位置上放上按钮，就足以以假乱真了。而且在 demo 中，这个方法的确奏效。

### 出现的问题 & 前期解决方案

在 demo 中，我只做了 TabBar 的小动画，比较简单，所以没有暴露出来这些隐藏的问题。而放在一个实际的项目中，这些问题就变得不可容忍了，主要的问题有：

- TabBar 丢失了半透明、模糊效果。
- 顶部缺少了一条浅灰色的分界线。
- 即使设置了 hideBottomBarOnPush，TabBar 也不会隐藏。

作为一个优秀的开发者（大雾），这些小小的问题怎么能难倒我呢？既然丢失了模糊效果，那我就自己加一个 blurEffect layer 上去。缺少分界线，就自己画一条上去。不能隐藏这个问题比较麻烦，那就在每一个 viewWillAppear 中自己手动设置 isHide 嘛。虽然烦琐了点，但又不是不能用。

手动做完这些之后，本以为就没什么问题了。但显然我还是太天真了。前两个问题还好，第三个手动隐藏缺暴露了更多的问题，而且难以容忍：

- 隐藏和显示是突然出现的，而系统默认的是有一个向左滑动的动画效果，显得太过突兀。
- 进入下一级页面时（添加上去的自定义 view 刚刚隐藏），默认版本的 TabBar 突然出现了一下，即使已经把默认的 TabBar 从 superView 中移除了。虽然很细节，但如果用户仔细观察还是可以发现。
- 默认状态下，右滑回到上一级的过程中，TabBar 是跟随上一级的视图一起滑动的，而在这里就直接出现了。
- 如果在上面的状态下，用户一边滑动一边突然点按 TabBar 上的按钮，切换到另外的视图，那么 TabBar 就消失了。除非关闭程序再进入，否则就没有办法切换试图。虽然可能很少有用户这么做，但这对体验的影响非常大。

### 正确的姿势

其实解决方案非常简单，就是不要直接添加到 view 中，而是添加到 TabBar 中。这样无论是模糊效果、分界线还是自动隐藏，都与默认的逻辑一样了。这里特别需要注意的是，如果添加完了没有任何效果，检查一下是不是在设置 frame 的时候，不小心设置成了 TabBar 的 frame。因为是添加到 TabBar 上面，所以应该设置为 TabBar 的 bounds（而如果项之前那样添加到 view 上，就需要用 frame）。单这样还不够，会出现和默认的 TabBar 重叠在一起的情况。所以需要在 viewWillAppear 中移除所有的子控件，再重新添加。

完整的代码（点击后有弹性放大效果、无提示文字）：

```swift
class CSTabBarController: UITabBarController {

    var imageViews = [UIImageView]()
    let mainView = UIView()
   
    override func viewDidLoad() {
        super.viewDidLoad()
        mainView.frame = self.tabBar.bounds
    
        mainView.backgroundColor = UIColor.clear
        
        let itemWidth = mainView.frame.width / CGFloat(viewControllers!.count)
        
        for i in 0..<viewControllers!.count {
            
            let button = UIButton(frame: CGRect(x: itemWidth * CGFloat(i), y: 0, width: itemWidth, height: mainView.frame.height))
            button.backgroundColor = UIColor.clear
            button.tag = i
            button.addTarget(self, action: #selector(CSTabBarController.onClickTabBarButton(sender:)), for: .touchUpInside)
            mainView.addSubview(button)
            
            var imageView = UIImageView()
            switch i {
            case 0:
                imageView = UIImageView(image: UIImage(named: "home")?.withRenderingMode(.alwaysTemplate))
            case 1:
                imageView = UIImageView(image: UIImage(named: "schedule")?.withRenderingMode(.alwaysTemplate))
            case 2:
                imageView = UIImageView(image: UIImage(named: "setting")?.withRenderingMode(.alwaysTemplate))
            default:
                break
            }
            if i > 0 {
                imageView.tintColor = UIColor.gray
            } else {
                imageView.tintColor = UIColor.flatGreen
            }
            
            imageView.frame = CGRect(x: button.frame.midX - 11, y: button.frame.midY - 11, width: 22, height: 22)
            mainView.addSubview(imageView)
            imageViews.append(imageView)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let _ = tabBar.subviews.map({$0.removeFromSuperview()})
        tabBar.addSubview(mainView)
    }
    
    func onClickTabBarButton(sender:UIButton) {
        if self.selectedIndex == sender.tag {
            return
        }
        
        for imageView in imageViews {
            imageView.tintColor = UIColor.gray
        }
        
        self.selectedIndex = sender.tag
        
        UIView.animate(withDuration: 1, animations: {
            self.imageViews[sender.tag].tintColor = UIColor.flatGreen
        })
        
        let bigger = CABasicAnimation(keyPath: "transform.scale")
        bigger.fromValue = 1
        bigger.toValue = 1.3
        bigger.duration = 0.1
        
        let zoom = CASpringAnimation(keyPath: "transform.scale")
        zoom.fromValue = 1.3
        zoom.toValue = 1
        zoom.duration = 0.5
        zoom.damping = 5
   
        imageViews[sender.tag].layer.add(bigger, forKey: nil)
        zoom.beginTime = CACurrentMediaTime() + 0.1
        imageViews[sender.tag].layer.add(zoom, forKey: nil)
        
    }
}
```