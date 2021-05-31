---
title: DTCWT Lowpass Shape
date: 2021-05-31 16:36:36
tags: DSP
---

# DTCWT Lowpass Shape

双树复小波变换 (Dual-Tree Complex Wavelet Transform, DTCWT) 低频系数矩阵的尺寸一致很让人困惑，许多文献都重点讨论了高频部分（6 个方向），而对低频部分的介绍较少。对一个单通道，大小为 (N, N) 的二维图像做一次 2D DTCWT 变换，高频部分应该有 6 个，尺寸均为 (N/2, N/2) 其中每个都是复数。那么低频部分呢？

## 不同的尺寸

对低频部分的描述至少有三种说法：

- 2 个低频图像，大小和 6 个高频图像一致为 (N/2, N/2)
- 4 个低频图像，大小为 (N/2, N/2)
- 1 个高频图像，大小为高频图像的两倍。如果只做一次 DTCWT，则为 (N, N) 。做两次，则为 (N/2, N/2)

### 2 个低频图像

在论文 SAR Image segmentation based on convolutional-wavelet neural network and markov random field 中，作者使用了 DTCWT 作为 pooling layer。作者表示一次分解应产生 8 个成分，分别为 2 个低频和 6 个高频：

<img src="/img/dtcwt-lowpass-shape/2lowpass.png" alt="2lowpass" style="zoom:50%;" />

### 4 个低频图像

纽约大学的 Ivan Selesnick 教授开源了 DTCWT 的 [MATLAB 实现](https://eeweb.engineering.nyu.edu/iselesni/WaveletSoftware/dt2D.html)，且有详细的讲解。其低频部分有 4 组值：

```matlab
% OUTPUT:
%   w{j}{i}{d1}{d2} - wavelet coefficients
%       j = 1..J (scale)
%       i = 1 (real part); i = 2 (imag part)
%       d1 = 1,2; d2 = 1,2,3 (orientations)
%   w{J+1}{m}{n} - lowpass coefficients
%       d1 = 1,2; d2 = 1,2 
```

但是注释中并没有说明 m，n 的含义。如果类比高频部分，分别代表实部、虚部的话，倒是和 2 个低频图像的说法对应上了，即 2 个复数的低频和 6 个复数高频。但是可能并不能简单地这样理解。

### 1 个低频图像

1 个低频图像，尺寸为高频的 2 倍的说法其实是出现频率最高的，至少有三处来源：

- Python 的一个 DTCWT 工具包：https://pypi.org/project/dtcwt/
- 剑桥大学的一篇博士毕业论文中开源了另一个 DTCWT 的 PyTorch 实现：https://pytorch-wavelets.readthedocs.io/en/latest/dtcwt.html
- MATLAB 官方的 Wavelet ToolBox：https://www.mathworks.com/help/wavelet/ref/dualtree2.html

因此倾向于这种说法更加可信。

## 低频图像的来源

DTCWT 只有一个低频图像，且尺寸是高频图像的 2 倍 —— 做一次变换，低频图像的大小和原图一致；做两次变换，低频图像才缩小到 1/2，听起来比较反直觉。那么这个低频图像是怎么出来的呢？

在剑桥博士毕业论文中，作者给出了 DTCWT 的算法说明：

<img src="/img/dtcwt-lowpass-shape/dtcwt- algorithm.png" alt="dtcwt- algorithm" style="zoom:50%;" />

可以惊喜地看到，最终的一个低频图像是由四个低频分量构造出来的，即 yl = interleave(...) 。这样就不和纽约大学的代码矛盾了。遗憾的是作者并没有详细描述 interleave 函数的含义。但是根据字面意思理解，应该是指从 4 个低频分量中各取一个点，拼接成一张大图。这样大图的长、宽就正好是小图的两倍。

翻阅其代码，作者的实现和论文中的描述并不一致。虽然没有做交叉插值的步骤，但是其中有这样一个函数：

```python
#  def q2c(y, dim=-1):
def q2c(y, dim=-1):
    """
    Convert from quads in y to complex numbers in z.
    """

    # Arrange pixels from the corners of the quads into
    # 2 subimages of alternate real and imag pixels.
    #  a----b
    #  |    |
    #  |    |
    #  c----d
    # Combine (a,b) and (d,c) to form two complex subimages.
    y = y/np.sqrt(2)
    a, b = y[:,:, 0::2, 0::2], y[:,:, 0::2, 1::2]
    c, d = y[:,:, 1::2, 0::2], y[:,:, 1::2, 1::2]

    #  return torch.stack((a-d, b+c), dim=dim), torch.stack((a+d, b-c), dim=dim)
    return ((a-d, b+c), (a+d, b-c))
```

这里的输入和低频的尺寸是一样的，然后四个值分别拆开（再通过加减运算）构成了 2 个复数高频：

<img src="/img/dtcwt-lowpass-shape/q2c.png" alt="q2c" style="zoom:40%;" />

这和论文中描述的算法是逆操作，所以应当是等价的。

