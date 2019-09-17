---
title: 用Swift写算法-高等排序
date: 2017-08-01 14:04:22
tags: Algorithm
---

# 用 Swift 写算法——高等排序

面对大量的数据，使用复杂度为 $O(n^2)$ 的初等排序法将失去实用价值，为此我们必须引入速度更快的高等排序算法。

### 归并排序

**Swift 实现：**

```swift
func mergeSort(array: inout [Int], left: Int, right: Int) {
    if left + 1 < right {
        let mid = (left + right) / 2
        mergeSort(array: &array, left: left, right: mid)
        mergeSort(array: &array, left: mid, right: right)
        merge(array: &array, left: left, mid: mid, right: right)
    }
}

func merge(array: inout [Int], left: Int, mid: Int, right: Int) {
    let n1 = mid - left
    let n2 = right - mid
    var L = [Int]()
    var R = [Int]()
    for i in 0..<n1 {
        L.append(array[left + i])
    }
    for i in 0..<n2 {
        R.append(array[mid + i])
    }
    L.append(Int.max)
    R.append(Int.max)
    var i = 0
    var j = 0
    for k in left..<right {
        if L[i] <= R[j] {
            array[k] = L[i]
            i += 1
        } else {
            array[k] = R[j]
            j += 1
        }
    }
}
```

**分析：**

借助分治法的思路，我们将解决问题的方案分为以下步骤：

- 分割：将数组对半分成两个部分
- 求解：对两个局部数组分别执行归并排序
- 整合：将排序完毕的局部数组整合成一个数组

函数 `merge()` 是算法的基础。它的作用是将两个分别有序的数组，合并成一个整体有序的数组。为了方便实现，在两个数组末端各插入一个“无穷大”的数。由于两个小数组都已经有序，所以合并只需要分别依次比较大小，然后先行往大数组中插入较小的数就可以了。复杂度为 $O(n1+n2)$ 。

在归并排序法中，我们递归地对数组进行分割，直到仅剩下一个元素。此时，只一个元素的数组是有序的。在一个元素的状态下，由于不满足条件，函数开始返回。返回时，调用了 `merge()` ，对有序的数组进行拼接。这样，经过不断的拼接，最终整体有序。

一般来讲，n 个数需要递归 $O(logn)$ 层，每层执行归并又需要线性的复杂度，因此归并排序的时间复杂度为 $O(nlogn)$。

归并排序法不会交换两个不相邻的元素位置，在合并时，只需要保证前半部分的优先级高于后半部分，就能保持稳定。

归并排序高速、稳定，但是在递归的过程中需要占用递归所需的内存空间。

tips：把控递归的过程，一个重要的方法是画出递归的层次图。画图时，牢牢记住同样层次的递归画在同样的深度下就可以了。

### 快速排序

**Swift 实现：**

```swift
func quickSort(array: inout [Int], p: Int, r: Int) {
    if p < r {
        let q = partition(array: &array, p: p, r: r)
        quickSort(array: &array, p: p, r: q-1)
        quickSort(array: &array, p: q+1, r: r)
    }
}

func partition(array: inout [Int], p: Int, r: Int) -> Int {
    let x = array[r]
    var i = p - 1
    for j in p..<r {
        if array[j] <= x {
            i += 1
            let temp = array[j]
            array[j] = array[i]
            array[i] = temp
        }
    }
    let temp = array[r]
    array[r] = array[i+1]
    array[i+1] = temp
    return i+1
}
```

**分析：**

快速排序的核心是 `partition()` 函数，它的作用是将数组 `array[p...r]` 进行分割。使得前半部分的元素均小于等于某个元素 `array[q]` ，后半部分的元素均大于 `array[q]` ，并返回下标 q。

在快速排序法中，通过分割函数讲数组一分为二，之后分别对前后两部分再次进行分割。不断地分割下去，最终数组会趋于有序。

如果快速排序在分割的过程中恰好能选择到中间值，那么效率将达到最高。一般而言快速排序的平局复杂度为 $O(nlogn)$ ，是多数情况下最高效的排序算法。在这个实现中，分割寒暑选择的基准数是一个固定的值，所以在有些情况下效率会很低（比如数组已经有序）。我们可以将其改为随机选择，或者抽样平均。

快速排序在分割的过程中会交换不相邻的元素，因此是不稳定的排序算法。但是它除了占用递归的内存，不需要开辟额外的存储空间，因此是一种内部排序（原地排序）算法。

### 计数排序（桶排序）

**Swift 实现：**

```swift
func countingSort(A: [Int], k: Int) -> [Int] {
    var C = [Int]()
    for i in 0..<k {
        C.append(0)
    }
    
    for j in 0..<A.count {
        C[A[j]] += 1
    }
    
    for i in 0..<k {
        if i > 0 {
            C[i] += C[i-1]
        }
    }
    
    var B = A
    
    var j = A.count - 1
    while j >= 0 {
        B[C[A[j]] - 1] = A[j]
        C[A[j]] -= 1
        j -= 1
    }
    
    return B
}
```

**分析：**

计数排序的特点是使用了一个计数数组 C（桶）。它统计各元素出现的次数，然后再求出各元素的累积和。因此 C[x] 的值代表 A 中小于等于 x 的元素个数，借此我们就得到了排序后各元素应出现的位置。

从末尾开始选择，计数排序就是稳定的。计数排序的时间复杂度仅为 $O(n+k)$ ，线性。但是它不仅需要额外的内存空间，也需要保证 A 中元素非负，要求比较高。