---
title: Solution to torch.save Taking Too Much Disk Space
date: 2021-03-23 10:30:45
tags: [Python, PyTorch]
---

# Solution to torch.save Taking Too Much Disk Space

最近的项目中，需要给图片先做一些预处理。这些预处理的步骤非常消耗 CPU 资源，以至于 GPU 必须要等待 CPU 完成预处理，导致模型的训练速度很慢。为了加快训练速度，就想到先将所有的图片都预处理好，保存起来。这样训练的过程中就可以节省出来预处理的时间了。

## 问题 1

图片预处理本身是按照 batch-size 进行的。但是我们希望最终保存的文件结构和 ImageNet 一致，即一张 ImageNet 的图片对应一个处理好的 tensor.pt 文件。因此需要把一个 batch 中的 tensor 分别存储。于是就写出了这样的代码：

```python
for b in range(tensors.shape[0]): # iterate a batch
	tensor = tensors[b]
  torch.save(tensor, file_path)
```

运行起来后，发现进度很慢。很快程序就报错了，提示磁盘空间不足。用 `du -h` 命令一看，仅 ImageNet 中一个类的图片，经过处理后就占用了超过 200G 的磁盘空间。我用的服务器 SSD 只有 512G，很快就撑不住了。

这个问题比较好解决。torch.save 存储的是原始的 tensor，而不是 slice 本身。如果只想存储一个 slice，就需要显式地拷贝一份：

```python
torch.save(tensor.clone(), file_path)
```

这样运行速度快了很多，且磁盘占用大幅减少。

## 问题 2

ImageNet 1000 类的图片大概占用 150G 左右的磁盘空间。解决掉问题 1 之后，前 30 类大概占用了 60G。对于试验用的 30 类图片来说是可以接受了，但是如果要拓展到完整的 1000 类，则需要占用约 2T 的空间，显然是不可行的。

经过实验，发现一张约 4kB 的图片，仅仅转换成 tensor 再保存，就会产生 101kB 的文件。这一方面是数据精度的问题，另一方面则是压缩的问题。虽然阅读 torch.save 的源码发现 PyTorch 也有压缩文件，但是并没有看到效果，也没有找到合适的参数来控制它的压缩行为。手动将 101kB 的 .pt 文件再通过 zip 压缩后，发现大小就降到了 4kB 左右。这个压缩的效果就非常令人满意了。

### zip

我们可以通过 `shutil` 压缩。shutil 默认是压缩一个文件夹。有人说它不能用来压缩单一的文件，但经过测试，按照如下的写法是可以只压缩单一文件的：

```python
import shutil
torch.save(tensor, 'test.pt')
shutil.make_archive('test.pt', 'zip', './', 'test.pt')
```

### unzip

可以直接通过 shutil 解压：

```python
shutil.unpack_archive('test.pt.zip')
tensor_read = torch.load('test.pt')
```

但是这样有个问题，就是需要一个中间的临时文件来装载。用完之后不仅要删除，在多线程处理时还要为每个线程/进程制造一个不同的临时文件，防止冲突。

另外一种方法是直接把文件读到内存中，不依赖一个真正写到磁盘的文件。torch.read 本身也可以接收一个文件当参数，而不一定是文件名：

```python
import zipfile
archive = zipfile.ZipFile('test.pt.zip')
extracted_file = archive.open('test.pt')
tensor_read = torch.load(extracted_file)
```

### 性能

引入额外的压缩/解压过程会带来额外的开销。只有当这个开销小于预处理本身的开销时才是划算的。对比了一下两种不同的解压缩方法的性能（通过循环 1000 次计时）：

|                   | Time (seconds) |
| ----------------- | -------------- |
| read .pt directly | 0.200          |
| shutil unpack     | 1.627          |
| zipfile open      | 2.615          |

发现读到内存中反而还慢一些，不确定是否是因为缓存的缘故，还需要近一步对比。

### ToDo

应该还可以通过自定义 pickle 的方式来压缩，torch.save 也支持传入一个 pickle module。不过没有尝试。

