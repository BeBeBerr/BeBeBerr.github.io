---
title: 用 Python 绘制炫酷的 Icon
date: 2022-07-09 11:25:19
tags: Python
---

# 用 Python 绘制炫酷的 Icon

最近在做一个和 Swift 编码相关的项目，就想给项目做一个 logo 出来，不然光秃秃的不好看。因为是编码相关，因此就想到可以用 0 和 1 填充 Swift 的图标，再加上一个炫酷的渐变色。Swift 的 logo 在[官网](https://developer.apple.com/swift/resources/)就可以下载矢量图格式。最终实现的效果如下：

<img src="/img/draw-swift-logo/color_swift.png" alt="color_swift" style="zoom:20%;" />

感觉还是挺好看的。

## 思路

用 Pillow 和 OpenCV 库，先随机生成彩色的 0 和 1 排列，之后用 Swift 的 logo 做一下 mask 就可以了。生成彩色 0 1 图又需要先生成一张渐变图，然后用黑白的 0 和 1 图做一次 mask。整体思路比较简单。

## PIL 渐变图

我这张图是从上到下渐变，给定两个 RGB 颜色值，从上到下做线性插值。这里的实现比较简单粗暴，直接去遍历 1024x1024 的图像的每个像素，速度比较慢（又不是不能用系列）。毕竟是参考的网上其他人的实现，实际上用 `np.linspace` 会快很多…… 而且同样的值直接复制也不需要依次循环…… 偷懒了。

```python
from PIL import Image, ImageDraw, ImageFont
import random
import cv2
import numpy as np

img = Image.new(mode='RGB', size=(1024, 1024), color='white')
draw = ImageDraw.Draw(img)

color1 = (255, 0, 0)
color2 = (255, 173, 0)

step_r = (color2[0] - color1[0]) / 1024
step_g = (color2[1] - color1[1]) / 1024
step_b = (color2[2] - color1[2]) / 1024

for y in range(0, 1024): # 可以直接用 numpy 向量运算，会快很多
    r = round(color1[0] + y * step_r)
    g = round(color1[1] + y * step_g)
    b = round(color1[2] + y * step_b)
    for x in range(0, 1024):
        draw.point((x, y), fill=(r, g, b)) # 同样的值没必要写循环复制
grad = np.asarray(img) # PIL 转 numpy
grad = cv2.cvtColor(grad, cv2.COLOR_RGB2BGR) # 转到 OpenCV 默认的 BGR 排列
```

生成的渐变图如下：

<img src="/img/draw-swift-logo/gradient.png" alt="gradient" style="zoom:10%;" />

## 0-1 排列图

之后要制作一张 0 和 1 随机排列的黑白图。只要写个循环把随机数排满画布就可以了：

```python
img = Image.new(mode='RGB', size=(1024, 1024), color='white')
draw = ImageDraw.Draw(img)
font = ImageFont.truetype('Consolas.ttf', size=35)

for x in range(0, 1024, 25):
    for y in range(0, 1024, 30):
        text = random.randint(0, 1)
        draw.text(xy=(x, y), text=str(text), fill=(0, 0, 0), font=font)

numbers = np.asarray(img).copy()
numbers = cv2.cvtColor(numbers, cv2.COLOR_RGB2BGR)
```

效果如下：

<img src="/img/draw-swift-logo/numbers.png" alt="numbers" style="zoom:20%;" />

## 渐变 0-1 排列

之后就是使用黑白的 0-1 图当作蒙版去给渐变图做遮罩。那我们很容易就写出这样的代码：

```python
numbers[numbers_gray == 0, :] = grad[numbers_gray == 0, :] 
```

也就是把图片中黑色的地方（为 0）替换成渐变图的颜色。但是如果事情发展的这么顺利我就不写这篇文章了…… 直接这样做，生成的渐变数字会带有黑边：

<img src="/img/draw-swift-logo/black-border.png" alt="black-border" style="zoom:30%;" />

看起来感觉很脏。显然数字本身并不是纯黑色的，边缘位置是灰色。那如果我们把图片中不是白色的地方都替换掉呢？

```python
numbers[numbers_gray != 255, :] = grad[numbers_gray != 255, :] 
```

<img src="/img/draw-swift-logo/low-res.png" alt="low-res" style="zoom:60%;" />

这次黑边确实看不见了，但是总感觉文字很模糊，不够锐利。尤其是数字 0，边缘非常毛糙。

如果我们仔细观察黑白图片，就会发现文字的边缘的颜色是逐渐变浅的，这是因为绘图库为我们做了抗锯齿（Anti-Aliasing）操作。如果我们简单把所有非 255 的值都替换掉，文字的锯齿效果就很明显，特别是 0 这样带有弧度的字符。

<img src="/img/draw-swift-logo/anti-aliasing-bw.png" alt="anti-aliasing-bw" style="zoom:20%;" />

为了继承这种抗锯齿效果，最直接的想法就是按照黑色的深浅来调整颜色。如果某个像素的颜色比较浅，则应该把对应的渐变图的颜色也向白色的方向调整。在 RGB 色彩空间中我们不好这样操作，因此更适合转换到 HSV 空间中，调整饱和度。

```python
numbers_gray = cv2.cvtColor(numbers, cv2.COLOR_BGR2GRAY)

scale = ((255 - numbers_gray[numbers_gray != 255]) / 255) # 根据黑色的程度计算 scale
numbers[numbers_gray != 255, :] = grad[numbers_gray != 255, :] 

numbers = cv2.cvtColor(numbers, cv2.COLOR_BGR2HSV)
numbers[numbers_gray != 255, 1] = numbers[numbers_gray != 255, 1] * scale # 调整 S 通道

numbers = cv2.cvtColor(numbers, cv2.COLOR_HSV2BGR)
color_number = numbers
```

最终效果如下，还是比较满意的：

<img src="/img/draw-swift-logo/color_number.png" alt="color_number" style="zoom:20%;" />

## Logo Mask

最后就是把黑白的 Logo 图当作 mask，制作最终的图片了。

```python
swift = cv2.imread('swift.png', cv2.IMREAD_UNCHANGED)
mask = swift[..., 0:3] != 255
swift[..., 0:3][mask] = color_number[mask]

cv2.imwrite('color_swift.png', swift)
```

理论上我们也应该考虑抗锯齿，但是由于 logo 本身尺寸比较大，效果不明显，所以又偷懒了 : )

最后再来欣赏一下成果吧：

<img src="/img/draw-swift-logo/color_swift.png" alt="color_swift" style="zoom:30%;" />
