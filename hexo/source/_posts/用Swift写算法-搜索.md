---
title: 用Swift写算法-搜索
date: 2017-07-12 11:40:43
tags: Algorithm
---

# 用 Swift 写算法——搜索

### 线性搜索

**简介：**

线性搜索是从数组的头开始顺次访问各元素，检查该元素值是否与目标值相等。一旦相等就返回该元素位置并结束搜索。线性搜索算法的效率很低，但适用于任何形式的数据。

**Swift 实现：**

```swift
func linearSearch(array: [Int], key: Int) -> Int? {
    for (i, each) in array.enumerated() {
        if each == key {
            return i
        }
    }
    return nil
}
```

**分析：**

线性搜索的时间复杂度为 $O(n)$ 。

### 二分搜索

**简介：**

二分搜索可以利用数据的大小进行高速搜索。每执行一次，搜索的范围都会减半，因此可以在极短的时间内完成搜索，不过需要数据有序。

**Swift 实现：**

```swift
func binarySearch(array: [Int], key: Int) -> Int? {
    var leftIndex = 0
    var rightIndex = array.count - 1
    while leftIndex <= rightIndex {
        let midIndex = (rightIndex + leftIndex) / 2
        if array[midIndex] > key {
            rightIndex = midIndex - 1
        } else if array[midIndex] < key {
            leftIndex = midIndex + 1
        } else {
            return midIndex
        }
    }
    return nil
}
```

**分析：**

二分查找法每次搜索范围都会减半，在最坏的情况下大概需要 $log_2n$ 次，时间复杂度为 $O(logn)$ 。

在最坏的情况下，对比线性搜索和二分搜索：

|   元素数   | 线性搜索次数  | 二分搜索次数 |
| :-----: | :-----: | :----: |
|   100   |   100   |   7    |
|  10000  |  10000  |   14   |
| 1000000 | 1000000 |   20   |

这里默认传入的数组有序。在一般情况下，可以考虑先对数组排序，然后进行二分搜索。不过，考虑到数据的体积，一般需要使用高等排序法。

### 散列法

**简介：**

在散列法中，各元素存储的位置由散列函数决定。这种算法只需要将元素的关键字代入散列函数，就可以计算出它的位置。对特定形式的数据有极高的搜索效率。

**分析：**

散列法的要点在于散列函数的选取和冲突时的处理方法。如果忽略冲突的情况，时间复杂度仅为 $O(1)$。