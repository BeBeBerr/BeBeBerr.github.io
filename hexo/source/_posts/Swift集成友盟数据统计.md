---
title: Swift集成友盟数据统计
date: 2017-12-23 20:04:36
tags:
---

# Swift 集成友盟数据统计

[友盟](umeng.com)是比较有名的数据统计服务提供商，但其 SDK 是用 OC 写的，开发文档中暂时也没有给出 Swift 的接入教程。不过其实用 Swift 集成友盟还是非常简单的。

### 获取 App Key

注册友盟账号，在 U-App 中创建新应用，就可以获取到 App Key 了。

### 安装 SDK

虽然目前在 iOS 的文档中没有写明，但友盟已经支持使用 CocoaPods 进行安装了。在 Podfile 里添加：

```swift
pod 'UMengAnalytics'
```

或

```swift
pod 'UMengAnalytics-NO-IDFA'
```

上面的是标准 SDK，下面的是无 IDFA 版本的。IDFA 是苹果的广告标识符，用于保护用户隐私的同时让商家可以最终广告效果。友盟使用 IDFA 是为了防止今后苹果可能会禁用 open-UDID 而造成数据异常。不过苹果禁止没有广告而获取 IDFA 的应用上架，因此审核期间可能会有风险。这里我选择了不采集 IDFA 的版本。

### 构建桥接文件

由于友盟的 SDK 是用 OC 编写的，因此在 Swift 项目中需要桥接文件来完成混编。好在 Swift 调用 OC 是非常方便的。

1. `Command + N` 呼出新建文件窗口，选择 `Header File`，命名为 `YourAppName-Bridging-Header.h`。（如果你已经引用过 OC 的代码，无视这一步）
2. 在其中插入你需要的组件的头文件，如 `#import "UMMobClick/MobClick.h" `。
3. 在工程的 Build Settings 中，找到 Swift Compiler - General （如果没有，记得勾选上方的 All，或者直接搜索）。在 Objective-C Bridging Header 项填入刚刚桥接文件的路径。也可以双击该项使它处于可编辑状态，把文件直接从文件树中拖过来，就会自动填充路径。

### 开始使用

桥接文件构建完成，就可以按照官方文档用 Swift 调用友盟的 api 了。在 `AppDelegate.swift`中，找到 `application(_:didFinishLaunchingWithOptions:)` 函数，开始配置。

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool { 
    let UMConfig = UMAnalyticsConfig()
    UMConfig.appKey = "Your App Key"
    UMConfig.channelId = "App Store"
    MobClick.start(withConfigure: UMConfig)
    return true
}
```

现在，在真机或模拟器中启动程序，如果你在友盟的统计页面中看到相应的信息，就说明已经配置成功了！

如果不想污染数据，可以使用友盟的集成调试功能。具体的内容可以参考开发文档。