---
title: Spatial Attention (CBAM)
date: 2021-07-04 20:49:20
tags: Deep Learning
---

# Spatial Attention (CBAM)

在[之前的博客](http://blog.wangluyuan.cc/2021/05/11/cbam-channel-attention/)中介绍了 CBAM 中的通道注意力，为了保持完整性，这次介绍剩余的空间注意力（Spatial Attention）部分。

## 原理

在理解通道注意力后，CBAM 中的空间注意力就非常好理解了，两者异曲同工。其原理图如下：

<img src="/img/cbam-spatial/spatial-attention.png" alt="spatial-attention" style="zoom:50%;" />

空间注意力通过获取特征图相邻空间的信息来计算，是为了告诉神经网络“哪里”更重要，从而强化重要的部分并抑制不重要的部分。Feature map 首先被沿着通道的维度被 MaxPool 和 AveragePool 压缩。假设原来的维度是 CxWxH，就会分别被压缩成两个 1xWxH 的张量。这两个张量被拼接在一起，形成 2xWxH 的张量，如图中蓝色、橙色所示。接下来把这个拼接在一起的张量通过 7x7 的卷积，对重点区域编码。最后通过一个 Sigmoid 函数形成注意力得分 Ms。Ms 与原始数据相乘即可。其公式为：
$$
M_s(F) = \sigma (f^{7\times 7}([AvgPool(F); MaxPool(F)]))
$$

## PyTorch 实现

实现起来比较容易：

```python
class CBAMSpatialAttention(nn.Module):
    def __init__(self):
        super().__init__()
				self.conv = nn.Conv2d(in_channels=2, out_channels=1, kernel_size=3, stride=1, padding=1)

    def forward(self, x):
        max_pool = torch.max(x, axis=1, keepdim=True)[0]
        mean_pool = torch.mean(x, axis=1, keepdim=True)
        cat = torch.cat([max_pool, mean_pool], dim=1)
        out = self.conv(cat)
        out = F.sigmoid(out)
        return out * x, out
```

## Experiment

为了快速验证，简单的训练了一个 MNIST 分类器，并只把注意力模块插到了网络最前面一层，即对输入图像应用注意力机制。由于 MNIST 数据集图片尺寸比较小，因此没有严格按照 CBAM 使用 7x7 的卷积核，而是使用了 3x3 的。虽然 MNIST 是灰度图像，只有一个颜色通道，计算 MaxPooling 核 AveragePooling 没有任何意义，但这里还是为了通用性计算了一下。输入图像如下：

<img src="/img/cbam-spatial/input.png" alt="input" style="zoom:40%;" />

每张图片对应的空间注意力得分可视化如下：

<img src="/img/cbam-spatial/attention.png" alt="attention" style="zoom:40%;" />

其中越绿的地方代表数值越高，越黄的地方代表数值越低。可以看到网络确实在强调数字本身，抑制了边缘分界的地方，而对黑色的背景几乎不感兴趣。猜测这样可以让边缘差异更大，有利于后面的 CNN 捕获特征。

由于 MNIST 随便训练一下准确率就到了 99%，因此没有对比空间注意力带来的分类精度的提升。

