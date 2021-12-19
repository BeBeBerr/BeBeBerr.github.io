---
title: Using python-pcl with Python3.6
date: 2021-12-19 16:57:21
tags: [Point Cloud, Python]
---

# Using python-pcl with Python3.6

PointCloud Library (PCL) 是一个用来处理点云数据的 C++ 库。`python-pcl` 是一个 Python 的桥接，让我们可以用 Python 调用 PCL 的大多数 API。然而 `python-pcl`  有些疏于维护，因此并没有办法简单得通过 `pip install` 的方式安装，会报错。

## Environment

我的本地开发环境时 Ubuntu 18.04 LTS，通过 Anaconda 使用 Python3.6。使用 Python3.6 的原因是 python-pcl 暂时还不支持更高的 Python 版本。

## Installation

直接通过 pip install 的方式安装会报错。我们可以通过 APT 进行安装。

```bash
sudo apt install python3-pcl
```

这个时候，如果直接在 conda 的环境中 `import pcl`  是会提示找不到模块的。我们需要手动将 package 拷贝到虚拟环境的路径下。

首先寻找 python3-pcl 所处的路径：

```bash
dpkg -L python3-pcl
```

在我的机器上，路径为 `/usr/lib/python3/dist-packages/pcl` 。

接下来需要将它拷贝到对应的 conda 环境中。我的环境名为 py36，需要拷贝到的路径为：

```bash
~/anaconda3/envs/py36/lib/python3.6/sites-packages
```

现在就可以在正常 import 了。

```bash
(py36) luyuan@biorobotics:~$ python -c 'import pcl'
```
