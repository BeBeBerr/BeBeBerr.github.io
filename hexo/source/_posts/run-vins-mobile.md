---
title: How to: Build and Run VINS-Mobile
date: 2021-12-04 14:43:08
tags: SLAM
---

# How to: Build and Run VINS-Mobile

VINS-Mono is a SLAM framework developed by researchers at HKUST. The authors also published its mobile version, [VINS-Mobile](https://github.com/HKUST-Aerial-Robotics/VINS-Mobile), which can run on iOS devices. Although they provided a pretty good README file to guide us on how to compile and run it, beginners may still feel confused. In this article, I'm going to document all the problems I met, and hopefully, it can be helpful for others.

## The missing opencv2.framework

The authors made some modifications to opencv2, including putting a timestamp into the first 64 bits of a captured image. That's why we have to download the specific version of OpenCV. If you don't, first, you will encounter a compilation error of conflict definitions; and second, even you can fix this problem and run the program, the initialization will be stuck at 0%, as the parsed timestamp is wrong.

However, the download link provided in the README file is no longer valid. Many people ask about this in GitHub Issues. The authors did provide an alternative way to download the framework on BaiduNetDisk. You may refer to this [issue](https://github.com/HKUST-Aerial-Robotics/VINS-Mobile/issues/2). The problem is that the download speed is super slow, and I have to pay for speedup. I've uploaded it to GitHub, and you can download it from [here](https://github.com/BeBeBerr/VINS-Mobile/releases/tag/opencv2.framework). Someone else also provided a link on GitHub, but it's not working, don't use it!

## Signing

Next, we need to go to `Signing & Capabilities` and select our own developer team to sign the app. Don't forget also change the Bundle Identifier to your own domain.![signing](/img/run-vins-mobile/signing.png)

## Update Search Paths

If you installed `boost` via Homebrew as suggested, you may encounter this problem:

```
/VINS-Mobile/ThirdParty/DVision/BRIEF.h:34:10: 'boost/dynamic_bitset.hpp' file not found
```

This is because Homebrew has its own place to store all the header files, and it's not inside the default search paths of Xcode. Go to `Build Settings -> Search Paths` and add the following path into it: `/opt/homebrew/include`.

![search-path](/img/run-vins-mobile/search-path.png)

Now you should be able to install it on you iPhone.

## Unsupported Device

This project was developed in 2017, and it's a long time ago. What I have is an iPhone 12, which is much newer than the supported devices. To add a new device, we need to do the calibration -- which means you need to record the camera and IMU data, convert it to ROS bag format, and use Kalibr to do the calibration, which is a lot of work. What's worse is that you need to measure the translation between the camera and the IMU chip. The authors did this by hand on the PCB, but I don't really want to open up my iPhone. Luckily, different iPhones have very similar intrinsic and extrinsic parameters, and we can copy from the old parameters for simplicity. And it works well for me. But if we want to have a better result, doing the calibration is still necessary.

The parameters are defined in `global_param.cpp` file, inside the `setGlobalParam` function.

```objective-c
bool setGlobalParam(DeviceType device)
{
    switch (device) {
        case iPhone12Pro: // Copied from iPhone7P
            printf("Device iPhone12 Pro param\n");
            FOCUS_LENGTH_X = 526.600;
            FOCUS_LENGTH_Y = 526.678;
            PX = 243.481;
            PY = 315.280;
            
            SOLVER_TIME = 0.06;
            FREQ = 3;
            
            TIC_X = 0.0;
            TIC_Y = 0.092;
            TIC_Z = 0.01;
            return true;
            break;
        case iPhone7P:
            printf("Device iPhone7 plus param\n");
            FOCUS_LENGTH_X = 526.600;
        //....
```

We need also update the code in `deviceName` function inside `ViewController.mm` file. You need check your device name, and add a new `else-if` statement.

```objective-c
else if(([device compare:@"iPad6,7"] == NSOrderedSame)||
            ([device compare:@"iPad6,8"] == NSOrderedSame))
{
    printf("Device iPad pro 12.9\n");
    device_type = iPadPro129;
} else if ([device compare:@"iPhone13,3"] == NSOrderedSame) { // "iPhone13,3" is the device name of iPhone 12 Pro
    device_type = iPhone12Pro;
}
```



🎉



