---
title: ORB Feature Extraction with OpenCV
date: 2021-11-05 22:33:18
tags: [Computer Vision, SLAM]
---

# ORB Feature Extraction with OpenCV

Oriented FAST and rotated BRIEF (ORB) 特征是 SLAM 中比较常用的一种图像特征。它的准确率并没有 SIFT 高，但是其计算速度更快，可以满足实时特征提取的需求。ORB 特征还具有旋转、尺度不变性的特点，因此很适合应用在 SLAM 场景中。

ORB 特征由 Key Point 和 Descriptor 两部分组成，其 key point 为改进的 FAST 角点，被称为 Oriented FAST 角点 -- 它计算了角点的主方向，可以为后续的 BRIEF descriptor 增加旋转不变性。Descriptor 为改进的 BRIEF 描述子，克服了原始 BRIEF descriptor 在图像旋转时容易丢失的缺点。

## FAST Corner Detector

Features from Accelerated Segment Test (FAST) 是一种角点检测算法，它检测相邻的像素亮度差异，如果差异较大，则认为该点可能是一个角点。该算法比较简单，因此速度很快。其检测过程如下：

- 在图像中选择像素点 p，记其亮度为 Ip。
- 选定阈值 t。
- 选取其周围半径为 3 的 16 个临近像素点。
- 若有连续 N 个像素点的亮度与 Ip 的差异大于 t，则认为 p 为特征点。

<img src="/img/orb-opencv/FAST.jpg" alt="FAST" style="zoom:80%;" />

FAST 没有尺度不变性，可以通过构建图像金字塔的方式来弥补。Oriented FAST 还计算了特征点附近图像的灰度质心，连接图像块的几何中心和质心，将其定义为角点的方向。

## BRIEF Descriptor

得到角点之后，我们需要“描述”角点的信息，这样才能对不同的角点进行区分，以便于后续做特征点的匹配。Binary Robust Independent Elementary Features (BRIEF) 是一种二进制的描述子，其描述向量由一组 0 / 1 表示，其计算效率很高。

BRIEF 首先对图片做平滑处理以抑制噪声。接着，以关键点为中心，选取一个 patch。在 patch 中选择一对点，如果点 p 的亮度高于点 q，则标记为 1；否则为 0。以这样的方式选取出 128 个像素对，构成了描述向量。像素对的选取是随机的，可以服从 Uniform，Gaussian 等分布。

由于 BRIEF 本身没有旋转不变性，Rotated BRIEF 利用之间计算的关键点方向信息，计算旋转后的 BRIEF 特征来弥补这一缺点。

## ORB Feature with OpenCV

利用 OpenCV 检测 ORB 特征点并做匹配的代码（C++）如下。特征点匹配选用了最简单的暴力匹配方法，即分别计算两张图中所有的关键点描述向量的距离，选出其中距离最小的一对，认为是一个匹配。由于这里是二进制的描述向量，因此可以采用 Hamming 距离，即不同位的个数。

```c++
// orb.cpp
#include <iostream>

#include <opencv2/core/core.hpp>
#include <opencv2/features2d/features2d.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

int main() {
    Mat img1 = imread("./1.jpg", CV_LOAD_IMAGE_COLOR);
    Mat img2 = imread("./2.jpg", CV_LOAD_IMAGE_COLOR);

    cv::resize(img1, img1, Size(), 0.2, 0.2); // make the image smaller
    cv::resize(img2, img2, Size(), 0.2, 0.2);

    vector<KeyPoint> kp1, kp2;

    Mat descriptors1, descriptors2;

    Ptr<FeatureDetector> detector = ORB::create();
    Ptr<DescriptorExtractor> descriptor = ORB::create();

    Ptr<DescriptorMatcher> matcher = DescriptorMatcher::create("BruteForce-Hamming");

    detector->detect(img1, kp1);
    detector->detect(img2, kp2);
    
    Mat out1;
    drawKeypoints(img1, kp1, out1, Scalar::all(-1), DrawMatchesFlags::DEFAULT);

    namedWindow("ORB 1", WindowFlags::WINDOW_KEEPRATIO);
    imshow("ORB 1", out1);
    resizeWindow("ORB 1", 800, 600);
    

    Mat out2;
    drawKeypoints(img2, kp2, out2, Scalar::all(-1), DrawMatchesFlags::DEFAULT);

    namedWindow("ORB 2", WindowFlags::WINDOW_KEEPRATIO);
    imshow("ORB 2", out2);
    resizeWindow("ORB 2", 800, 600);

    descriptor->compute(img1, kp1, descriptors1);
    descriptor->compute(img2, kp2, descriptors2);

    vector<DMatch> matches;
    matcher->match(descriptors1, descriptors2, matches);

    auto min_max = minmax_element(matches.begin(), matches.end(), 
        [](const DMatch &m1, const DMatch &m2) 
            {return m1.distance < m2.distance;}
        );
    
    double min_dist = min_max.first->distance;
    double max_dist = min_max.second->distance;

    vector<DMatch> good_matches;
    for (int i=0; i<descriptors1.rows; i++) {
        if (matches[i].distance <= max(2 * min_dist, 40.0)) {
            good_matches.push_back(matches[i]);
        }
    }

    Mat img_match;
    Mat img_good;
    drawMatches(img1, kp1, img2, kp2, matches, img_match);
    drawMatches(img1, kp1, img2, kp2, good_matches, img_good);
    imshow("all", img_match);
    imshow("good", img_good);

    waitKey(0);
    return 0;
}
```

Makefile 如下：

```makefile
CC = g++
CFLAGS = -g -Wall
SRCS = orb.cpp
PROG = a.out

OPENCV = `pkg-config opencv --cflags --libs`
LIBS = $(OPENCV)

$(PROG):$(SRCS)
	$(CC) $(CFLAGS) -o $(PROG) $(SRCS) $(LIBS)
```

## Results

随手拍了两张照片，相机视角有一个微小的移动。ORB 特征点本身如下：

<img src="/img/orb-opencv/orb-feature.png" alt="orb-feature" style="zoom:30%;" />

所有的特征点匹配如下：

![orb-all](/img/orb-opencv/orb-all.png)

手动筛选出一些匹配得较好的特征点如下：

![orb-good](/img/orb-opencv/orb-good.png)

可以看到匹配结果还比较满意。有了特征点的匹配，下一步就可以计算相机的 pose 了。

## Reference

[1] 视觉 SLAM 十四讲

[2] https://medium.com/data-breach/introduction-to-brief-binary-robust-independent-elementary-features-436f4a31a0e6

[3] https://medium.com/data-breach/introduction-to-fast-features-from-accelerated-segment-test-4ed33dde6d65

