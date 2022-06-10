---
title: Linear Color and sRGB
date: 2022-06-10 11:36:21
tags: iOS
---

# Linear Color and sRGB

最近在尝试序列化 SwiftUI，具体来说是把任意的 SwiftUI view 转化成一个 JSON 的模版。由于 SwiftUI 内部的属性都是不对外暴露的，所以只能在 runtime 通过反射（Mirror API）来强行获取内部的属性。例如，如果想保存 Text，就要通过这种方式来获取内部的 string。Swift Playground 和 LLDB 也是通过 Mirror 来在运行时展示对象内部的属性的。

## SwiftUI.Color.Resolved

在序列化 Color 的时候，我们当然是希望保存其 R、G、B 三个值。在反序列化的时候，把这三个值传给 Color 的构造函数：

```swift
public init(_ colorSpace: Color.RGBColorSpace = .sRGB, red: Double, green: Double, blue: Double, opacity: Double = 1)
```

但是很容易发现，通过反序列化构造回来的 UI 颜色比正常的 UI 要深一些：

![color-diff](/img/linear-srgb/color-diff.png)

左边是通过反序列化构造的 UI，右边是正常通过 Xcode Preview 显示的 UI。注意看最右边灰色部分，左边明显更深。其余颜色因为是系统颜色，因此序列化时只保存了颜色名称，所以不受影响。

如果我们查看通过 Mirror 反射得到的 RGB 值，就会发现其实它与我们构造 Color 传入的值并不一致：

<img src="/img/linear-srgb/reflected-value.png" alt="reflected-value" style="zoom:50%;" />

显然 Color 内部保存的 linear RGB 和我们常用的 RGB 并不一致。那内部是做了哪种变换呢？

## Non-linear Transformation

我们可以将输入的 R 和内部的 linearRed 的对应关系打印出来：

```swift
for i in stride(from: 0, to: 1.1, by: 0.01) {
    let color = Color(red: i, green: 0, blue: 0)
    let value:Float? = reflectValueByKeys(object: color, keys: ["provider", "base", "linearRed"])
    print("\(i),\(value!)")
}
```

这里我写了一个工具函数 `reflectValueByKeys` 来递归地调用 Mirror，这样比较方便通过一串 label 获取对象内部的属性：

```swift
func reflectValueByKeys<T>(object: Any, keys: [String]) -> T? {
    if keys.isEmpty {
        return nil
    }
    let mirror = Mirror(reflecting: object)
    for child in mirror.children {
        if child.label == keys[0] {
            if keys.count > 1 {
                return reflectValueByKeys(object:child.value, keys:Array(keys[1...]))
            } else {
                return child.value as? T
            }
        }
    }
    return nil
}
```

直接看 print 出来的对应关系，很容易发现这不是一个简单的线性变换：

```
0.0,0.0
0.01,0.0007739938
0.02,0.0015479876
0.03,0.0023219814
0.04,0.0030959751
...
0.96,0.91140765
0.97,0.933107
0.98,0.9551048
0.99,0.97740203
1.0,1.0
```

把打印出来的结果拷贝到一个文本文件中，我们可以写两行 Python 来可视化这个映射关系（对不起了 SwiftUI Charts，虽然你刚发布但是我懒得升级新系统……）

```python
import matplotlib.pyplot as plt
import numpy as np

data = []
with open('./data.txt') as file:
    for line in file:
        split = line.split(',')
        x = float(split[0])
        y = float(split[1])
        data.append([x, y])

data = np.array(data)

# plot
fig, ax = plt.subplots()
ax.plot(data[:, 0], data[:, 1], linewidth=2.0)
plt.show()
```

<img src="/img/linear-srgb/xy.png" alt="xy" style="zoom:50%;" />

## Gamma Correction

在物理世界中，如果光强增加一倍，那么亮度也会随之增加一倍。这是一个简单的线性关系。但是在上古时代的 CRT 显像管显示器中，电压增加一倍，亮度并不会等比例增加，而是存在一个 2.2 次方的非线性关系：
$$
L = U^{2.2}
$$
这个值被称为 Gamma 值。因此我们常用的 sRGB 色彩空间对它做了一个逆运算，先做 Gamma 矫正，再经过 CRT 显示器天然的变换，最终得到和物理世界一致的正确颜色。

可是现代的显示器早已摒弃了 CRT 技术，为什么还保留了这个 Gamma 值呢？这是因为人眼对较暗的颜色更加敏感（我猜是进化的原因，需要能在暗处观察到捕食者？），因此在数据位数有限的情况下我们希望给较暗的颜色分配更多的存储空间，而忽略亮色。出于编码的原因我们仍然保留了 Gamma 映射。

在 Color 内部存储的其实是线性空间中的 RGB 值，这也是为什么我们看到变量名实际为 linearRed / Green / Blue。当我们变换到 CIE XYZ 空间时，也是在线性空间的基础上做一次线性变换（所有的线性变换都可以用矩阵表示）。因此内部实际存储线性空间的值是合理的。

这个变换的定义如下：
$$
C_{linear}= \left\{ \begin{aligned} 
\frac{C_{srgb}}{12.92}, \space C_{srgb} \leq 0.04045 \\
\left(\frac{C_{srgb}+0.055}{1.055} \right)^{2.4} 
\end{aligned} \right.
$$
所以我们很容易能写出反变换的代码：

```swift
private func gammaMappingSRGB(value: Float?) -> Float {
    guard let value = value else {
        return 0
    }
    if value < 0.0031308 {
        return value * 12.92
    }
    return 1.055 * pow(value, (1/2.4)) - 0.055
}
```

## References

[1] CIE Colorimetry: https://medium.com/hipster-color-science/a-beginners-guide-to-colorimetry-401f1830b65a

[2] Wikipedia sRGB: https://en.wikipedia.org/wiki/SRGB

[3] sRGB: https://www.w3.org/Graphics/Color/sRGB

[4] Gamma / Linear / sRGB and Unity: https://zhuanlan.zhihu.com/p/66558476
