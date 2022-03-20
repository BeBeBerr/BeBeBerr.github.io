---
title: Install PySPQR on M1 Chip Mac
date: 2022-03-20 11:30:25
tags: [Python, macOS]
---

# Install PySPQR on M1 Chip Mac

[PySPQR](https://github.com/yig/PySPQR) 是稀疏矩阵库 [SUITESPARSEQR](https://people.engr.tamu.edu/davis/suitesparse.html) 的 Python 封装。通过 QR 矩阵分解，我们可以高效求解 Ax = b 的线性问题。由于 PySPQR 只是一层封装，因此在安装成功后，使用时会先用 cffi (C Foreign Function Interface) 库来编译 C 文件。

## SuiteSparseQR_C.h Not Found

我遇到的第一个问题是 SuiteSparseQR_C.h: No such file or directory。这个问题在 [GitHub issue](https://github.com/yig/PySPQR/issues/11) 中也有提到，但在 mac 上的解决方法可能不太一样。

首先我们要安装 Ceres-Solver，这是一个 Google 开发的最小二乘问题的求解库。通过 Homebrew 很容易安装：

```bash
brew install ceres-solver
```

由于一直在做 SLAM 问题，所以这个库我已经安装过了。因此这个头文件是在 Homebrew 的 include 目录中的：

```
/opt/homebrew/include
```

确认文件存在，就说明只是 include path 设置的不对，所以要去 Python Lib 的安装路径下更改 `sparseqr_gen.py` 的代码，新增一个 include path。由于我是用的 Anaconda 来管理 Python 环境，而 Anaconda 本身又是通过 Homebrew 安装的，因此 Python 库的文件路径如下：

```
/opt/homebrew/anaconda3/envs/<your_env_name>/lib/python3.8/site-packages/sparseqr
```

在原有基础上新增一条 include path：

```python
include_dirs = [ '/usr/include/suitesparse', join('C:', 'Program Files', 'Python', 'suitesparse'), '/opt/homebrew/include']
```

这样头文件找不到的问题就解决了。

## Linker error: -lspqr

下一个问题是，链接时报错找不到 spqr 库。同样的道理，先从 Homebrew 的 lib 目录确认库存在，再更改 `sparseqr_gen.py` 中 libraries 变量，指定绝对路径就可以解决。

## -arch x86_64

上两个问题解决后，编译仍然会失败。仔细看生成的 gcc 命令会发现它在使用 `-arch x86_64` 编译。这个时候第一反应是应该给 `arm64` 架构编译，因此我在 `sparseqr_gen.py` 中修改了环境变量：

```python
os.environ['ARCHFLAGS'] = '-arch arm64'
```

但是在编译时，架构参数变成了 `-arch arm64 -arch x86_64` 。虽然新增了 arm64 架构，但是 x86_64 并没有被消除（而且我也没找到能消除掉的方法）。这时 Linker 会报错说在给 x86_64 的目标文件链接 arm64 的库。

在思考怎样取消对 x86 编译的时候，我注意到任务管理器中 Python 在以 Intel 的模式运行。其实 Anaconda 并没有对 M1 进行适配，它一直在通过 Rosetta2 的方式进行转译。这提示了我可以考虑放弃 arm64 架构，直接通过 Rosetta2 来执行编译后的 x86 文件。

由于 spqr 库是通过 Homebrew 安装 ceres-solver 得到的，但是 ceres-solver 是支持原生运行在 M1 上的，因此要安装 x86 版本的 ceres-solver 并让两者共存。为了做到这一点，首先要安装 x86 版本的 Homebrew：

```bash
arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

arm64 架构的 Homebrew 会安装在 /opt 下，而 x86 架构的会安装在 /usr/local 下，这样两者可以共存。之后，再通过 x86 的 Homebrew 安装 ceres-solver：

```bash
arch -x86_64 /usr/local/Homebrew/bin/brew install ceres-solver
```

这里需要指定 brew 的绝对路径，否则默认仍使用 arm 的 brew 造成冲突。之后就可以更改 library，指定 /usr/local/lib 路径下的 spqr 库。

## Dynamic Module

最后一个遇到的问题是 Cython 报错：

```
Cython Compilation Error: dynamic module does not define module export function
```

既然动态模块有问题，我就直接指定了 .a 结尾的静态库：

```python
libraries = ['/usr/local/lib/spqr.a']
```

至此问题全部解决。总的来说，由于使用苹果自研的 M1 芯片，在兼容性上确实存在问题。好在 Rosetta2 足够强大，为我们提供了解决问题的途径。而且由于 Rosetta2 表现得非常好，很多时候表面上都感受不到它的存在。





