---
title: Faster WarpPolar with PyTorch and GPU
date: 2022-12-23 23:03:08
tags: [Computer Vision, PyTorch, OpenCV]
---

# Faster WarpPolar with PyTorch and GPU

一般我们都会在笛卡尔坐标系下处理图像。但有的时候，将图片转换到极坐标系下会更有优势。有些研究显示极坐标系下有更好的 rotation invariance 等特性。在我最近的项目中，图像目标区域是一个圆环。直接处理会在圆环内外处理很多无用的像素，白白浪费计算性能。因此我想先把图像变换到极坐标系下，这样目标区域就从圆环变为更好处理的矩形区域。之后再把这个矩形区域交给神经网络进行运算。

## Polar Coordinate

Cartesian 到 Polar 坐标转换的核心是从 (x, y) 到距离和夹角 (rho, phi) 的映射。当然反变换就是反向的映射。如果不显示指定，OpenCV 默认的输出图像宽度为最大半径（maxRadius），高度为 PI * maxRadius。显然圆的周长应该为 2 * PI * radius，因此实际上内圈是被拉长了的，而外圈是被压缩了的。取这个高度是一个平均值。

## OpenCV warpPolar Usage

通过 OpenCV 做极坐标的变换是很容易的。可以参考[官方文档](https://docs.opencv.org/4.5.5/da/d54/group__imgproc__transform.html#ga49481ab24fdaa0ffa4d3e63d14c0d5e4)了解具体参数的含义。

Cartesian to Polar：

```python
polar_img = cv2.warpPolar(img, (0, 0), (512, 512), 512, cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR)
```

这里我的图像分辨率为 1024x1024。传入 (0, 0) 的目标图像大小表示不显示指定，使用默认值。指定坐标系原点为图像中心，半径为 512。采用线性映射。这样变换后的图像大小为 512x1608。

Polar to Cartesian：

```python
recon_img = cv2.warpPolar(polar_img, (1024, 1024), (512, 512), 512, cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
```

这里需要显示指定目标图像的尺寸为 1024x1024。通过给 flag 拼接一个 `WARP_INVERSE_MAP` 的 mask 表示这里在做反变换。

## Move to PyTorch

在我的电脑上（i7-9700K），做极坐标变换的速度大约是 200 FPS。这速度并不快。怎么样去提速呢？首先，在我的应用场景中所有的图片都在做同样的变换。但是正常调用 OpenCV 的函数，每次都在重复的计算同样的坐标系映射关系，浪费了很大的算力。我相信许多其他的 Deep Learning 应用也是映射关系不变，只有图片在变化。其次，我们可以把图片的映射用 PyTorch tensor 实现，在 GPU 上进行加速。正好后续的模型也需要 tensor。

具体思路为，预先计算映射关系，并把它转换到 GPU tensor 中缓存下来。可惜 OpenCV 并没有直接暴露出坐标映射的接口，但是我们可以参考 OpenCV 的 [C++ 源码](https://github.com/opencv/opencv/blob/8f0edf6a1c7015dd76abb7dc8a82ea36d5500a72/modules/imgproc/src/imgwarp.cpp)写出其对应的 Python 版本。注意，由于这里只计算一次，因此我们并不在意这个步骤的速度，因此无需写出 vectorized 的版本。

正变换：

```python
class CartToPolarTensor(object):
    def __init__(self, device=torch.device('cuda:0')):
        self.mapx, self.mapy = self.build_map()
        self.mapx_tensor = torch.tensor(self.mapx, device=device).unsqueeze(0)
        self.mapy_tensor = torch.tensor(self.mapy, device=device).unsqueeze(0)

    def build_map(self, center=(512, 512), max_radius=512):
        w = max_radius
        h = np.round(max_radius * np.pi).astype(int)
        dsize = (h, w)
        
        mapx = np.zeros(dsize, dtype=np.float32)
        mapy = np.zeros(dsize, dtype=np.float32)

        Kangle = (2 * np.pi) / h
        
        rhos = np.zeros((w,))
        Kmag = max_radius / w
        for rho in range(0, w):
            rhos[rho] = rho * Kmag

        for phi in range(0, h):
            KKy = Kangle * phi
            cp = np.cos(KKy)
            sp = np.sin(KKy)
            for rho in range(0, w):
                x = rhos[rho] * cp + center[1]
                y = rhos[rho] * sp + center[0]
                mapx[phi, rho] = x
                mapy[phi, rho] = y

        return mapx, mapy
```

逆变换：

```python
class PolarToCartTensor(object):
    def __init__(self, device=torch.device('cuda:0')):
        self.mapx, self.mapy = self.build_map()
        self.mapx_tensor = torch.tensor(self.mapx, device=device).unsqueeze(0)
        self.mapy_tensor = torch.tensor(self.mapy, device=device).unsqueeze(0)

    def build_map(self, dsize=(1024, 1024), max_radius=512, center=(512, 512), src_size=(1608, 512)):
        w = dsize[1]
        h = dsize[0]

        angle_border = 1

        ssize_w = src_size[1]
        ssize_h = src_size[0] - 2 * angle_border

        mapx = np.zeros(dsize, dtype=np.float32)
        mapy = np.zeros(dsize, dtype=np.float32)

        Kangle = 2 * np.pi / ssize_h
        Kmag = max_radius / ssize_w

        bufx = np.zeros(w, dtype=np.float32)
        bufy = np.zeros(w, dtype=np.float32)

        for x in range(0, w):
            bufx[x] = x - center[1]
        
        for y in range(0, h):
            for x in range(0, w):
                bufy[x] = y - center[0]
            bufp, bufa = cv2.cartToPolar(bufx, bufy, angleInDegrees=False)
            for x in range(0, w):
                rho = bufp[x] / Kmag
                phi = bufa[x] / Kangle
                mapx[y, x] = rho
                mapy[y, x] = phi + angle_border

        return mapx, mapy
```

通过类属性进行缓存，这样我们只在初始化时预先计算一次映射关系，之后可以全部复用已有的结果。映射关系的计算和 OpenCV 的 C++ 版本完全一致（这里没有考虑 semi-log 的情形，但是很容易补充）。计算完成后，OpenCV 使用了 `remap` 函数来完成映射。

虽然 PyTorch 本身没有提供 `remap` 操作，但是第三方库 [Kornia](https://kornia.readthedocs.io/en/latest/geometry.transform.html#kornia.geometry.transform.remap) 使用 `grid_sample` 做了实现。`import kornia` 之后，在每次调用时只需要执行 remap 就可以了：

```python
def __call__(self, img_tensor):
        polar = kornia.geometry.transform.remap(img_tensor, self.mapx_tensor, self.mapy_tensor)
    		return polar
```

## Speed Test

读入图像后，分别用 OpenCV 和我们自己实现的 PyTorch 版本执行 1000 次极坐标变换，耗时如下：

| Method                  | Time (s) |
| ----------------------- | -------- |
| OpenCV (CPU, i7-9700K)  | 3.513    |
| PyTorch (GPU, RTX 3090) | 0.203    |

所需时间仅为原来的 5.8%，提升很大。更重要的是，在我实际的应用场景下 CPU 的负载会很重。通过把更多的操作转移到 GPU 上，实际的提升应该会更显著。
