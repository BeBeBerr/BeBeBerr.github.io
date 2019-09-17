---
title: iOS-Layout学习笔记
date: 2018-05-02 14:48:50
tags: Layout
---

# iOS Layout 学习笔记

关于 iOS 布局系统的一些知识在我之前的博客中已经写过了，这里再补充一些。

### 优先级

每个约束都有优先级，范围从 1 到 1000。优先级为 1000 的约束是必须的，小于 1000 的约束是可选的。Auto Layout 会优先满足高优先级的约束，如果一个可选的约束得不到满足，Auto Layout 会跳过它。

**应用：**左右两个 View A 和 B，当我们让 view A 消失时，view B 向左平移。

这是京东的一道面试题。面试官举出的应用场景是：左边是一个 loading indicator，在网络请求时一致播放加载动画，右边是一个 label。当请求完成后，需要把 indicator 移除，让 label 平移过来。

我们当然有很多种方法来实现这个需求，但显然通过合理设置约束的优先级能够更优雅地解决这个问题。只需要给 View B 添加一个到 A 一段距离的必须的约束，再给 B 添加一个到屏幕边缘的可选约束就好了。当 A 还在画面中时，可选的约束和必须的约束产生冲突得不到满足，因此 B 距离 A 一段距离。当我们把 A remove 掉之后，与 A 相关的约束也就不在了，那么可选的约束就可以满足，B 因此变为距离屏幕边缘一段距离。

通过设置优先级，我们不再需要更新约束，而只要简单的调用 removeFromSuperview 把 A 移除就可以了。

![twoViews](/img/layoutStudy/twoViews.gif)

```objective-c
_leftView.backgroundColor = UIColor.blueColor;
[_leftView mas_makeConstraints:^(MASConstraintMaker *make) {
    make.left.equalTo(self.view).with.mas_offset(20);
    make.top.equalTo(self.rightView);
    make.width.mas_equalTo(50);
    make.height.mas_equalTo(50);
}];
    
_rightView.backgroundColor = UIColor.greenColor;
[_rightView mas_makeConstraints:^(MASConstraintMaker *make) {
    make.left.equalTo(self.leftView.mas_right).with.mas_offset(40); //required
    make.left.equalTo(self.view).with.mas_offset(20).priority(800); //optional
    make.top.equalTo(self.view).with.mas_offset(100);
    make.width.mas_equalTo(50);
    make.height.mas_equalTo(50);
}];
```

### Autoresizing

Autoresizing 是苹果在 iOS2 时引入的技术，用于描述父控件的 Frame 变化时，子控件应如何跟随变化。但它不能描述同级的 view 之间的关系。因此在 iOS6 之后有了 AutoLayout 技术，一般情况下就没必要再使用 AutoResizing 了。

查看一下 Autoresizing 的定义，发现是一些枚举值：

```objective-c
typedef NS_OPTIONS(NSUInteger, UIViewAutoresizing) {
    UIViewAutoresizingNone                 = 0,
    UIViewAutoresizingFlexibleLeftMargin   = 1 << 0,
    UIViewAutoresizingFlexibleWidth        = 1 << 1,
    UIViewAutoresizingFlexibleRightMargin  = 1 << 2,
    UIViewAutoresizingFlexibleTopMargin    = 1 << 3,
    UIViewAutoresizingFlexibleHeight       = 1 << 4,
    UIViewAutoresizingFlexibleBottomMargin = 1 << 5
};
```

我们可以发现，苹果通过把 1 左移不同的位数，构造出了掩码（mask）。在使用时，不同的 Autoresizing 类型只要按位或一下，就可以表示多个值的叠加。如 0010 与 0001 按位或，可以得到 0011，这样使用起来非常方便。

还有一点需要了解的就是，有时 Autoresizing 会和 AutoLayout 发生冲突而导致程序崩溃。这是因为 view 中有一个 Bool 类型的属性是 `translatesAutoresizingMaskIntoConstraints` ，顾名思义，它表示是否要把 Autoresizing 的设置翻译成等价的 AutoLayout。如果值为 true，又含有 Autoresizing 的信息，翻译过来的约束就可能和我们自己添加的约束产生冲突。这个时候只要把它设置为 false 就可以了。

### sizeToFit VS sizeThatFits

想要根据 label 文字长度改变 frame 时，还有在设置 toolBar 的一些设置中，都可以使用 sizeToFit 来让系统自动计算合理的 frame。事实上，sizeToFit 是 UIView 的方法，很多 view 都可以让系统来帮我们布局。

这两个方法的区别其实通过名字就很容易区分。sizeToFit 就是算出合理的尺寸后，改变自己的 size。而 sizeThatFits 就是算出合理的尺寸后，返回这个值，但不修改自己的 size，把决定权交给程序员。

### Size Classes

苹果为各种不同的设备、以及各个设备横屏、竖屏时的长宽分了三个等级：Compact，Regular，Any。我们在 Story Board 中可以看到 `(w C h R)` 的字样，改变设备和朝向后，这个值会跟着变化。Size Classes 可以说是对不同屏幕尺寸的一种抽象，让我们脱离开具体的尺寸数值。不过它只是对屏幕的分类，而不是布局方法，布局本身还是要通过 AutoLayout 来做。

使用 Size Classes 的好处是显而易见的：iPhone 横屏竖屏、iPad 各种 MultiTasking 状态、plus 机型横屏……众多情况都可以轻松解决。

在 Xcode9 的 Story Board 中怎么设置呢？首先我们要点击屏幕下方的 Vary For Traits 按钮，选中相应的 width 或 height。这个时候会进入 Size Classes 的编辑模式（底部变蓝）。选中之前 Any 状态设置的约束，把 installed 选项框取消选中。这个时候再添加约束，就是当前的 Size Classes 的约束了。之前的约束并没有被删掉，只是在当前状态下不加载了而已。完成后点击 Done 即可。可见通过 Story Board 拖动控件进行布局还是非常方便的。

如果这个时候你说：老板！我就想纯代码布局！可不可以嘛！

当然可以！可以这样用：

```objective-c
UITraitCollection *collection = self.traitCollection;
if(collection.horizontalSizeClass == UIUserInterfaceSizeClassCompact && collection.verticalSizeClass == UIUserInterfaceSizeClassRegular) {
    //set your constrains
}
```

在屏幕旋转等情况下，还会调用代理方法：

```objective-c
- (void)willTransitionToTraitCollection:(UITraitCollection *)newCollection withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator;
```

在这个代理方法中还要实现 Size Classes 改变后的约束。

可见，使用代码来完成 Size Classes 还是有些繁琐的。如果要同时适配 iPhone 和 iPad 的各种情况，就要啰啰嗦嗦写一大堆判断各种情况的代码，这点不如直接用 sb 布局方便。

### UIStackView

UIStackView 是用于水平或垂直布局的控件，用以替换手工书写 AutoLayout。它的 subviews 的位置是根据对齐、间距、大小等属性决定的，并根据屏幕大小、方向动态进行调整。

UIStackView 的原理就是 AutoLayout，只不过是又抽象出了一层，让布局变得更加容易。我们还可以嵌套 UIStackView 来获得更精细的布局。和 Size Classes 类似，在 Story Board 中布局会比较方便，纯代码编写就显得冗长。

腾讯的一道面试题是：用 UIStackView 做布局有什么问题？答案是它是 iOS9 才引入的新控件，而大公司可能要支持的 iOS 版本比较多，就有兼容性的问题。我们平时做开发一般不必支持这么多个版本（而且随着 iOS12 即将在今年 6 月 WWDC 发布，这个问题将会进一步淡化），如果一定要支持早期版本，也有支持更多 iOS 版本的第三方的开源控件供我们使用。

关于 UIStackView 更详细的教程，可以参考[Ray Wenderlich](https://www.raywenderlich.com/160646/uistackview-tutorial-introducing-stack-views-2)。

### 性能

首先我们要谈一下**屏幕显示原理**。

![ios_screen_display](/img/layoutStudy/ios_screen_display.png)

CPU 把计算好要显示的内容提交给 GPU。GPU 会根据这些信息进行渲染，把渲染结果写入帧缓冲区。通常来讲，屏幕是一行一行刷新的，因此需要水平同步信号 HSync 和 垂直同步信号 VSync。每次刷新，屏幕都会从缓冲区取出数据进行绘制。这里的帧缓冲区（Frame Buffer）也就是我们通常所说的显存。

如果只有一个缓冲区，就会发生屏幕的闪烁。当屏幕去显存中去数据时，CPU 还没有完成全部的计算，也就是说缓存区的数据不完整，如果屏幕按照这个值来绘制，就会出现问题。下面的动图是我大二的时候利用 FPGA 制作视频小游戏时的情景，由于只使用了一个缓冲区，可以看到即使我没有完整的刷新屏幕（而是只刷新产生变化的部分），也存在明显的闪烁：

![screen](/img/layoutStudy/screen.gif)

双缓存的原理是，GPU 向缓存区 A 提交数据，而显示器从已经有数据的缓存区 B 取数据绘制。只有在缓存区 A 写入完成后，显示器才切换至 A 取数据，同时 GPU 再向 B 区写数据。上面的例子中，如果当时使用了双缓存技术，运行效果将非常平滑（我当时没有在自己的项目中运用，但是却指导了其他小组的同学=.=）。可见有时产生性能问题不是说板子或者设备的性能不够，而是使用者没有完全发挥出它们的能力。同时我们再次验证了一句名言：“很多性能问题都可以通过缓存解决”。

iOS 设备是使用了双缓存的，安卓设备采用了三缓存。当 VSync 信号到来时，iOS 会通过 CADisplayLink 来通知 App。如果计算量过大，CPU 或者 GPU 没有在规定的时间提交数据，那么此帧就得不到刷新，画面将静止不动。这也就是我们所说的掉帧、卡顿的产生根本原因。

造成性能问题的原因有很多。在布局时，如果界面很复杂，又采用了 AutoLayout 技术，那么解这个多元方程组的时间将呈指数上升，占用大量的 CPU 时间。

### ASDK (Texture)

AsyncDisplayKit，现在更名为 Texture，是由 FaceBook 开源的异步渲染框架。由于 UIKit 不是线程安全的（为什么不做成线程安全的？一个是开发成本巨大，另一个是线程安全本身又会造成性能下降），ASDK 的思路就是能放在后台的，放在后台去做；实在不行的，尽量优化性能。

在布局方面，ASDK 同样支持手动布局，但是会做一些异步预加载的优化来提高性能。ASDK 还拥有 Automatic Layout （区别于 Auto Layout）来做自动布局。Automatic Layout 其实是制定了一套布局规则，通过 ASLayoutable 来松散耦合，不关心具体是 node 还是其他什么，因此可以复用这套布局逻辑。通过组合多个 Layout Specs 如 stack / inset 等完成复杂的布局，有点类似前端的 CSS。事实上，stack 和 UIStackView 也是类似的，但是 Layout Specs 本身不是依附于 UIView 的，而是单独存在的数据结构，因此它可以进行缓存、可以在后台计算，降低耦合的同时也提高了效率。由此来看，iOS 本身的布局系统其实并不先进，有很多值得向 CSS 等其他布局技术借鉴的地方。

参考自[即刻技术团队的文章](https://juejin.im/post/58f0812a0ce463006b9fc403)





