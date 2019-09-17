---
title: AFNetworking设置HTTP的Header和Body
date: 2018-07-13 21:21:42
tags: AFNetworking
---

# AFNetworking 设置 HTTP Header / Body

多数情况下，我们并不需要特别设置 HTTP 的 header 和 body，使用 AFNetworking 的 paramters 参数就够了。但是有些时候，我们需要用 Header 来放置一些授权码，或者 Body 来放置二进制数据，这个时候就要自己设置 Header 和 Body 了。

## 如何设置 Header

设置 Header 较为简单，只需要：

```objc
AFHTTPSessionManager *manager = [AFHTTPSessionManager manager];
[manager.requestSerializer setValue:@"Fri, 13 Jul 2018 07:28:11 GMT" forHTTPHeaderField:@"Date"];
```

就可以了。之后，就可以按照我们熟悉的方式来发送请求，比如：

```objc
[manager GET:@"https://your.url" parameters:nil progress:nil success:^(NSURLSessionDataTask * _Nonnull task, id  _Nullable responseObject) {
        //...
    } failure:^(NSURLSessionDataTask * _Nullable task, NSError * _Nonnull error) {
        //...
    }];
```

## 如何设置 Body

如果你想故伎重演，就会发现刚刚的 `setValueForHeader` 方法并没有对应 `setValueForBody` 的方法。但是，AFNetworking 的请求函数里是提供了这样的参数的：

```objc
[self.manager POST:@"http://your.url" parameters:nil constructingBodyWithBlock:^(id<AFMultipartFormData>  _Nonnull formData) {
        [formData appendPartWithFormData:yourData name:@"yourDataName"]; //设置form-data
    } progress:nil success:^(NSURLSessionDataTask * _Nonnull task, id  _Nullable responseObject) {
        //...
    } failure:^(NSURLSessionDataTask * _Nullable task, NSError * _Nonnull error) {
        //...
    }];
```

它可以让你用一个 block 来设置 body 的 form-data，这当然是没问题的。但是，一旦你通过这种方式设置了 form-data，那么你的 HTTP Header 中 `Content-Type` 属性就会被设置为 `multipart/form-data` （否则，服务端怎么解析呢？）。而有些场景下，我们需要指定自己的 Content-Type。

比如，在腾讯云的有些接口中，需要使用 protobuf 来交互数据。那就需要我们把 Content-Type 设置为 `application/x-protobuf `，并把 protobuf 生成的二进制数据放倒 body 中。按照上述的操作，自己设置的 Content-Type 就会被覆盖，导致上传失败。有没有什么办法能干干净净地设置 body 呢？

```objc
self.manager = [[AFURLSessionManager alloc] initWithSessionConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
NSMutableURLRequest *request = [AFHTTPRequestSerializer.serializer requestWithMethod:@"POST" URLString:@"http://your.url" parameters:nil error:nil];
[request setValue:@"application/x-protobuf" forHTTPHeaderField:@"Content-Type"]; //设置Header，和之前的方法类似
[request setHTTPBody:protoBufData]; //设置Body
[[self.manager dataTaskWithRequest:request uploadProgress:nil downloadProgress:nil completionHandler:^(NSURLResponse * _Nonnull response, id  _Nullable responseObject, NSError * _Nullable error) {
        //...
    }] resume]; //发送请求，注意一定要调用 resume 方法来开始。
```

这样就可以啦！