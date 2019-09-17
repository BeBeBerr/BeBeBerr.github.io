---
title: 解决Unacceptable Content-Type问题
date: 2018-07-13 21:23:09
tags: AFNetworking
---

# 解决 Unacceptable Content-Type

最近在通过 API 的形式访问腾讯云的 [COS 服务](https://cloud.tencent.com/product/cos)时，一直请求失败。通过 `po error` 命令打印出 AFNetworking 回调方法中的 NSError 对象，控制台输出如下：

```
(lldb)po error
Error Domain=com.alamofire.error.serialization.response Code=-1016 "Request failed: unacceptable content-type: application/x-www-form-urlencoded" UserInfo={NSLocalizedDescription=Request failed: unacceptable content-type: application/x-www-form-urlencoded, NSErrorFailingURLKey=https://my.url, com.alamofire.serialization.response.error.data=<mydata>, com.alamofire.serialization.response.error.response=<NSHTTPURLResponse: 0x608000037600> { URL: https://my.url } { Status Code: 200, Headers {
	//......
    "Content-Type" =     (
        "application/x-www-form-urlencoded"
    );
    Server =     (
        "tencent-cos"
    );
    //......
} }}
```

比较奇怪的一点是，可以看到腾讯云返回的 Status Code 是 200，而且如果查看 error 的 userinfo 信息 `error.userInfo[@"com.alamofire.serialization.response.error.data"] ` ，是可以看到返回的 HTTP Body 信息的。这说明我们的请求是成功了的，毕竟正确的数据已经返回了，只是 AFNetworking 认为失败了。

## 错误原因

根据报错信息，可以看到错误的原因是 `unacceptable content-type: application/x-www-form-urlencoded` 。也就是腾讯云返回给我们的 content type 并不能被 AFNetworking 解析。而事实上这个接口中，返回的 body 信息本身就是我们需要的二进制数据，并不需要解析。因此要解决这个问题，只需要让 AFNetworking 不认为这是个错误就可以了，思路就是让它认为 `application/x-www-form-urlencoded` 是可以接受的。

## 添加 Content-Type

最直接的想法，就是我们取出 AFNetworking 支持的 content-type 集合，再把腾讯云的这个值添加进去：

```objc
NSMutableSet *set = [manager.responseSerializer.acceptableContentTypes mutableCopy];
[set addObject:@"application/x-www-form-urlencoded"];
manager.responseSerializer.acceptableContentTypes = [set copy];
```

再次运行，果然不再报错说不接受 content-type 了，而是换了个新的错误：

```
Error Domain=NSCocoaErrorDomain Code=3840 "JSON text did not start with array or object and option to allow fragments not set." UserInfo={NSDebugDescription=JSON text did not start with array or object and option to allow fragments not set.}
```

新的错误信息提示我们 JSON 格式不正确。但是，腾讯云的这个接口并不会返回结构化的数据，body 里面只是二进制数据。而且，就算要返回被编码的信息，也是 XML 的，并不是 JSON。如果 AFNetworking 以 JSON 的格式去解析，当然会产生错误。

要解决这个问题，靠直觉就不够了，需要看看 AFNetworking 的源码。

## 寻找问题根源

我们跳转到 `acceptableContentTypes` 的定义中，在 `AFURLResponseSerialization.m ` 文件中，可以看到这样一个函数：

```objc
- (BOOL)validateResponse:(NSHTTPURLResponse *)response
                    data:(NSData *)data
                   error:(NSError * __autoreleasing *)error
{
    BOOL responseIsValid = YES;
    NSError *validationError = nil;
    if (response && [response isKindOfClass:[NSHTTPURLResponse class]]) {
        if (self.acceptableContentTypes && ![self.acceptableContentTypes containsObject:[response MIMEType]] &&
            !([response MIMEType] == nil && [data length] == 0)) {
            //......
            responseIsValid = NO;
        }
        //......
    }
    //......
    return responseIsValid;
}
```

可以看到它确实有在判断接收到的 MIME type 是不是被包含在 acceptableContentTypes 里面的。由于我们刚才的添加，这里是可以被验证通过的，之前的思路肯定是正确的。就需要找到哪个地方产生了新问题。

查看 `AFHTTPSessionManager ` 的实现，可以看到这两个初始化方法：

```objc
+ (instancetype)manager {
    return [[[self class] alloc] initWithBaseURL:nil];
}

- (instancetype)initWithBaseURL:(NSURL *)url
           sessionConfiguration:(NSURLSessionConfiguration *)configuration
{
    self = [super initWithSessionConfiguration:configuration];
    if (!self) {
        return nil;
    }
    //......
    self.requestSerializer = [AFHTTPRequestSerializer serializer];
    self.responseSerializer = [AFJSONResponseSerializer serializer];

    return self;
}
```

原来，在我们通过 `AFHTTPSessionManager *manager = [AFHTTPSessionManager manager]; ` 方法初始化 manager 的时候，它的 responseSerializer 就被设置成了 `AFJSONResponseSerializer` 。终于找到了问题的根源！

当然，这种错误是由于我们的接口返回的不是 JSON 数据导致的。如果你的接口返回的是 JSON，那么问题应该在上一步就已经解决了。

## 解决问题

我们只需要把 manager 的 responseSerializer 换掉就可以了：

```objc
manager.responseSerializer = [[AFHTTPResponseSerializer alloc] init];
```

使用 HTTPResponseSerializer，不需要它来解析 JSON。

再次运行程序，就可以成功拿到数据了。

------

## 附录

腾讯云的 API 在签名时需要做 md5 / SHA-1 / HMAC - SHA1 等加密算法。正确可用的实现不太好找，故将这几种算法代码附在这里：

```objc
#import <CommonCrypto/CommonDigest.h>
#import <CommonCrypto/CommonHMAC.h>

- (NSString*)sha1WithStr :(NSString*)string
{
    NSString * test =string;
    const char *cstr = [test   cStringUsingEncoding:NSUTF8StringEncoding];
    NSData *data = [NSData dataWithBytes:cstr length:test.length];
    
    uint8_t digest[CC_SHA1_DIGEST_LENGTH];
    
    CC_SHA1(data.bytes, (int)data.length, digest);
    
    NSMutableString* output = [NSMutableString stringWithCapacity:CC_SHA1_DIGEST_LENGTH * 2];
    
    for(int i = 0; i < CC_SHA1_DIGEST_LENGTH; i++)
        [output appendFormat:@"%02x", digest[i]];
    
    return output;
}

- (NSString *)hmac:(NSString *)plaintext withKey:(NSString *)key
{
    const char *cKey  = [key cStringUsingEncoding:NSASCIIStringEncoding];
    const char *cData = [plaintext cStringUsingEncoding:NSASCIIStringEncoding];
    unsigned char cHMAC[CC_SHA1_DIGEST_LENGTH];
    CCHmac(kCCHmacAlgSHA1, cKey, strlen(cKey), cData, strlen(cData), cHMAC);
    NSData *HMACData = [NSData dataWithBytes:cHMAC length:sizeof(cHMAC)];
    const unsigned char *buffer = (const unsigned char *)[HMACData bytes];
    NSMutableString *HMAC = [NSMutableString stringWithCapacity:HMACData.length * 2];
    for (int i = 0; i < HMACData.length; ++i){
        [HMAC appendFormat:@"%02x", buffer[i]];
    }
    return HMAC;
}

- (NSString*)md5WithData:(NSData *)data{
    unsigned char result[16];
    CC_MD5( data.bytes, (CC_LONG)data.length, result ); // This is the md5 call
    return [NSString stringWithFormat:
            @"%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x",
            result[0], result[1], result[2], result[3],
            result[4], result[5], result[6], result[7],
            result[8], result[9], result[10], result[11],
            result[12], result[13], result[14], result[15]
            ];
}
```

