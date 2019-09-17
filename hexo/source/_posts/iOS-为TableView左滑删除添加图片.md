---
title: iOS 为 TableView 左滑删除添加图片
date: 2017-11-18 00:11:26
tags: UITableView
---

# iOS 为 TableView 左滑删除添加图片

**本文适用于 iOS11**

### 起因

最近做的项目中，PM 和设计想把 TableView 左滑删除、分享等按钮的文字替换成图片。我想既然 iOS11 自带的邮件应用中就是这样的，那实现起来应该很容易，就一口答应了。

<img src="/img/左滑删除图片/leftswipe.PNG" style="zoom:40%"/>

开始开发的时候，我信心满满地在 Xcode 中敲下了配置左滑编辑功能的代理方法：

```swift
func tableView(_ tableView: UITableView, editActionsForRowAt indexPath: IndexPath) -> [UITableViewRowAction]? {
    let stickAction = UITableViewRowAction(style: .default, title: "置顶") { (_, _) in
        //
    }
    stickAction.//???
    return [stickAction]
        
}
```

然后在自动补全中只看到了孤零零的 backgroundColor……什么！竟然没有配置图片的 API ！

### 寻找解决方案

要知道，左滑弹出的这些按钮无非也就是一些 Button，只要能拿到 Button，设置图片就很容易了。打开 Debug View Hierarchy，可以看到视图层级是这样的：

<img src="/img/左滑删除图片/hierarchy.png" style="zoom:40%"/>

我们要找的按钮不就是这个 UISwipeActionStandardButton 类型的 Button 吗！只要拿到它就可以了。它的父视图是 UISwipeActionPullView 类型的 View，再往上一层就是我们的 UITableView 了。于是我到 Documents 上查了一下，想说看有没有调用的相关 API，发现竟然没有！震惊！看来又是私有属性！

### 强行拿到 Button

我们已知视图的类型和层级关系，拿到它也不困难。只要遍历 TableView 的子视图，找到 UISwipeActionPullView 类型的视图就可以了。注意这个类型是私有的，所以只能通过名字反射（抱歉这里借用了 Java 中反射的概念）进去：

```swift
for each in self.tableView.subviews {
    if each.isKind(of: NSClassFromString("UISwipeActionPullView")!) {
        print(dump(each))
        let btn = each.subviews.first! as! UIButton
        btn.setImage(UIImage(named: "test"), for: .normal)
    }
}
```

离大功告成还剩最后一步！

### 在合适的时机调用

要想让代码成功执行，必须等待 TableView 已经配置好侧滑按钮。否则 UISwipeActionPullView 还没被实例化出来，肯定是找不到这个类型的变量的（我因为这个问题纠结了一个多小时，反应过来的时候想掐死自己）。

```swift
func tableView(_ tableView: UITableView, willBeginEditingRowAt indexPath: IndexPath) {
    for each in self.tableView.subviews {
        if each.isKind(of: NSClassFromString("UISwipeActionPullView")!) {
            print(dump(each))
            let btn = each.subviews.first! as! UIButton
            btn.setImage(UIImage(named: "test"), for: .normal)
        }
    }
}
```

大功告成！

![finish](/img/左滑删除图片/finish.png)

### 写在最后

首先，调用私有 API 是一件非常有风险的事情。有可能在审核的时候被苹果拒绝不说（这里应该还好），这些 API 和属性都是非常不稳定的。比如，在 iOS10 中表现会不一样。想兼容 iOS10 的话就要编写额外的代码，很麻烦。而且随着系统更新，这些方法可能会被苹果更改从而不再有效。

我不知道为什么这些很基本的东西苹果不愿意开放给开发者（类似的还有 UIAlertController，想自定义必须用 KVC 在运行时动态更改，而文档中明确写出不要继承它），但苹果自己却在使用。感觉很麻烦啊！唉。

