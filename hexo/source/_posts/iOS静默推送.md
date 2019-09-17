---
title: iOS静默推送
date: 2018-08-08 18:29:06
tags: Push
---

# iOS 静默推送

静默推送，更准确地说，后台更新通知（Background Update Notification）是苹果在 iOS7 开始支持的新功能。简单来说，它让我们拥有了在用户毫无察觉的情况下，唤起应用并执行代码的能力，赋予了极大的想象空间。

## 能力

苹果在设计静默推送的时候，是希望开发者可以定时唤醒应用，下载最新的内容。这样，用户隔一段时间后打开应用，也能立刻看到最新的内容（比如当天的新闻等），而不用打开应用后再等待刷新。不过我们当然可以利用这个能力来做一些奇怪的事情 : )

静默推送可以在不弹出横幅等通知的情况下（用户无感），将应用唤醒。经过测试，如果应用是处于挂起，或是被系统终止的情况下，都是可以唤醒的。也就是说，只要用户没有手动将程序从后台关闭就可以。苹果在官方文档上说，最长可以执行 30s 的代码，不过可以通过设置来讲后台执行代码的时间稍作延长。在实际使用中，我发现这并不是说每次都给你 30s 的时间随便执行代码，到时间就终止，而似乎是主线程一旦空闲，程序就会被终止掉（这点存疑）。也就是，如果你在子线程上执行诸如网络请求等代码，可能很快程序就被系统终止了，再也收不到回调。

与普通推送相比，静默推送不仅是无感，我们更关心的是它可以唤醒已经死掉的程序。

## 调试与配置

走 APNS 推送显然是需要后台来做的。但是，借助工具，iOS 程序员也可以自行调试。比如，可以在 GitHub 上下载 [Knuff](https://github.com/KnuffApp/Knuff) 应用来调试。

![knuff](/img/静默推送/knuff.png)

配置好后，只要点击 push 按钮，手机上就会收到一条推送了！

在 Knuff 界面上，可以看到需要配置的一些字段。Identity 是要选择推送证书，在应用最终上线时，服务端也是需要这个证书来进行验证的。可以在苹果开发者账号管理页面生成 p12 证书，生成证书时，记得选好类型，是 sandbox 还是 production。

![p12](/img/静默推送/p12.png)

Token 是设备的编号，否则，苹果的服务器怎么知道向哪台设备推送呢？当程序调用了 `registerForRemoteNotifications ` 向苹果注册了推送后，在

```objc
- (void)application:(UIApplication *)app didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
```

方法中可以拿到 token。注意，一定要在 Capability 中勾选上 Remote notification，并使用真机调试。这个 token 并不是一成不变的，有可能会发生变动。

Payload 中就是要传给苹果的内容，其中 `content-available` 字段设置为 1 表示静默推送。

## 接收推送

收到推送通知后，会调用 AppDelegate 中的 

```objc
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult result))completionHandler
```

方法。如果程序是被唤醒的，当然会先走启动逻辑，再来调用这个方法。在这里就可以开始书写自己的逻辑了。

## 延长执行时间

在实际测试中，我发现往往程序执行还不到 30s，就被干掉了，因此怀疑是主线程一旦空闲，系统就不管子线程的死活了（不确定）。但是可能我在后台正在执行网络请求，这个时候就需要延长执行时间。

可以通过 background task 来获得更长的执行时间：

```objc
self.backgroundTaskId = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
        NSLog(@"end"); 
}];
```

系统即将要终止应用时，会调用这个回调方法。但是建议在系统强制终止程序前，通过

```objc
[[UIApplication sharedApplication] endBackgroundTask:self.backgroundTaskId];
```

手动通知系统任务完成。

## 后台传输

很多情况下，在程序被唤醒后都要去下载/上传一个比较大的文件。即使通过上述方法延长了执行时间，可能也不足以等到文件传输完毕。好在苹果也提供了后台传输的方法，通过此方法，上传/下载任务会被交给操作系统执行，即使程序被 kill 掉，也可以继续完成传输任务。

通过 AFNetworking，可以这样开启后台传输：

```objc
NSURLSessionConfiguration *config = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:@"your.identifier"];
self.manager = [[AFURLSessionManager alloc] initWithSessionConfiguration:config];
NSMutableURLRequest *request = [AFHTTPRequestSerializer.serializer requestWithMethod:@"PUT" URLString:@"https://your.url" parameters:nil error:nil];
request.timeoutInterval = 60.0;
[[self.manager uploadTaskWithRequest:request fromData:nil progress:nil completionHandler:^(NSURLResponse * _Nonnull response, id  _Nullable responseObject, NSError * _Nullable error) {
        //
}] resume];
```

当后台传输完毕后，系统会调用

```objc
- (void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler
```

再次唤醒程序，并执行我们的代码。