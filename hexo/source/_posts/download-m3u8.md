---
title: download-m3u8
date: 2021-01-09 23:01:15
tags: ffmpeg
---

# 生活小妙招：下载 m3u8 格式视频

最近想通过看美剧的方式提高下听力水平。在浏览器上播放美剧，频繁的倒带往往会出发缓存重新加载，体验很不好。而且，为了达到联系效果，往往需要将一集视频重复观看多遍。这个时候就比较希望能够把视频文件直接下载下来，一劳永逸。

## 查看源文件

因为之前没有了解过网页是怎样播放视频的，所以很天真的认为会有一个 .mp4 的资源文件，只要去请求下载这个文件就好了。通过开发者工具查看网页播放器的源代码，发现确实有 src 链接：

![screenshot](/img/download-m3u8/screenshot.png)

然而这并不是一个 .mp4 之类的视频文件。这个时候我注意到网络请求中，也确实没有一个大的资源文件在下载，而是一直有很多个小的请求。这才想到应该是某种分片加载视频资源的协议。

## 下载 m3u8

去请求上面的 src 链接，得到了一个 .m3u8 格式的文件，打开后发现里面是一串 js 文件的地址列表：

```
...
#EXTINF:3.586,
https://meiju2.zzwc120.com/20180928/f7Q8OCzP/1000kb/hls/Ln08abn2358000.js
#EXTINF:3.628,
https://meiju2.zzwc120.com/20180928/f7Q8OCzP/1000kb/hls/Ln08abn2358001.js
#EXTINF:2.085,
https://meiju2.zzwc120.com/20180928/f7Q8OCzP/1000kb/hls/Ln08abn2358002.js
#EXTINF:3.294,
https://meiju2.zzwc120.com/20180928/f7Q8OCzP/1000kb/hls/Ln08abn2358003.js
#EXTINF:4.17,
...
```

想来就是视频切片的地址了。通过 ffmpeg 就可以下载完整的视频。命令如下：

```bash
ffmpeg -protocol_whitelist file,http,https,tcp,tls,crypto -i "<path_to_m3u8>.m3u8" "<output_name>.mp4"
```

这里注意，将 https 添加到白名单是必要的，否则会报错。m3u8 格式的文件路径可以是远端的路径，但在我这个例子中，直接请求会 404，因此就先把 m3u8 文件下载到了本地，填的本地路径。

下载的过程是串行的，略慢。ffmpeg 还没有实现多线程的下载，慢慢等待吧。

**不要用来做侵犯版权的事情哦** ⚠️