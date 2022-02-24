---
title: Calculate Absolute Trajectory Error with ROS
date: 2022-02-23 22:13:40
tags: SLAM
---

# Calculate Absolute Trajectory Error with ROS

Absolute Trajectory Error (ATE) 是衡量 SLAM 算法的一个重要指标。它描述了 SLAM 估计出来的机器人路径和 ground truth 之间的差异大小。显然 SLAM 算法的表现越好，那么估计出来的路径误差就会越小。

ATE 是一个评估全局性能的指标，它需要让机器人走较长的一段距离。另一个衡量局部准确性的指标是 Relative Pose Error (RPE)。

## ATE 定义

Ground truth 路径和机器人估计的路径很可能不在同一个坐标系下。比如，我们可以用 total station (全站仪) 来精确的获取机器人的位置从而用作 GT，坐标系的原点默认会在全站仪所处的位置。而机器人往往用最开始的几帧定义世界坐标系的原点。即使修改全站仪的设置，使得原点的位置在机器人的初始位置，由于全站仪不能测量旋转姿态，同样无法保证两个坐标系重合。所以我们需要通过 Horn's method 寻找一个变换矩阵，将两个轨迹对齐。给定 3 对以上的匹配点，Horn's method 可以找到最优的变换矩阵来最小化误差，而且这是一个闭式解 (closed form solution)。

时刻 i 的 ATE error matrix 定义为：
$$
E_i := Q_i^{-1}SP_i
$$
其中，Q 表示 GT，P 表示估计的轨迹，S 表示找到的刚体变换矩阵。注意这里的 E 是误差矩阵，其中包括旋转误差和平移误差。

全部轨迹的 ATE 可以用 root mean square error 表示：
$$
ATE_{rmse} = \left( \frac{1}{n} \sum_{i=1}^n || trans(E_i) || ^2 \right)^{\frac{1}{2}}
$$
其中 trans 表示 matrix E 中的 translation 部分，即我们不考虑 rotation。

## 实际使用

TUM 的 researcher 开源了一组实用的 benchmarking [toolbox](https://vision.in.tum.de/data/datasets/rgbd-dataset/tools)。然而其实现使用的是 Python 2，不过只需要稍做改动就可以迁移到 Python 3，还算比较容易。但是我们需要先将轨迹点转换到它需要的格式。

首先，假设机器人的位姿是通过 ROS TF 广播的，我们可以先录制一个只包含 /tf topic 的 ROS bag：

```bash
rosbag record /tf
```

解析 ROS bag 比较费劲，但我们可以直接把它导出成 CSV 的格式，这样就很容易解析了：

```bash
rostopic echo -b <your_bag_name>.bag -p /tf > tf.txt
```

文件内容大概这样：

```
%time,field.transforms0.header.seq,field.transforms0.header.stamp,field.transforms0.header.frame_id,field.transforms0.child_frame_id,field.transforms0.transform.translation.x,field.transforms0.transform.translation.y,field.transforms0.transform.translation.z,field.transforms0.transform.rotation.x,field.transforms0.transform.rotation.y,field.transforms0.transform.rotation.z,field.transforms0.transform.rotation.w
1645564988578113729,0,1645397999136861801,world,body,-0.0237263019323,-0.183226266184,0.0574725730104,-0.0199035477786,-0.017429874818,0.0730891285439,0.996974436753
1645564988578145616,0,1645397999136861801,body,camera,-0.011094,0.00522558,-0.0394383,-0.500806957696,-0.499043786406,0.495054661047,0.505043139691
```

之后可以用一个 Python 脚本把 world - body 的位姿关系转换成所需的格式：

```python
import csv
from os import read
def process_tf_file(file_path='tf.txt'):
    with open('tf_ate.csv', 'w') as output_file:
        writer = csv.writer(output_file)
        with open(file_path) as input_file:
            reader = csv.reader(input_file)
            next(reader) # skip header
            for row in reader:
                header_frame = row[3]
                child_frame = row[4]
                if header_frame != 'world' or child_frame != 'body':
                    continue 
                ts = float(row[0]) / 1e10
                x, y, z = float(row[5]), float(row[6]), float(row[7])
                writer.writerow([ts, x, y, z])
```

转换之后的文件就只包括时间戳和 x，y，z 位置了：

```
164556498.8578114,-0.0237263019323,-0.183226266184,0.0574725730104
164556498.86749378,-0.0317886917667,-0.189064281648,0.0602023804558
164556498.8774454,-0.040280908714,-0.19915625333,0.0610245969542
164556498.88754055,-0.0510204634397,-0.206446264428,0.0607193932249
```

对 GT 进行类似操作后，就可以使用 TUM 的工具来计算 ATE 了：

```bash
evaluate_ate.py ./pos_ate.csv ./tf_ate.csv --plot result.png
```

最终结果如下（对绘图代码有改动）：

![ate](/img/ate-ros/ate.png)





