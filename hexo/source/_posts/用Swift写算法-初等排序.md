---
title: 用Swift写算法-初等排序
date: 2017-07-11 19:58:59
tags: Algorithm
---

# 用 Swift 写算法——初等排序

### 插入排序法

**简介：**

就像打扑克时整理牌的顺序一样，将牌一张张地抽出来，再插入到已经排列好的牌的适当位置中。重复这个动作直到插入最后一张牌。

**Swift 实现：**

```swift
func insertionSort(array: inout [Int]) {
    for i in 1..<array.count {
        let v = array[i]
        var j = i - 1
        while j >= 0 && array[j] > v {
            array[j + 1] = array[j]
            j -= 1
        }
        array[j + 1] = v
    }
}
```

**分析：**

我们从第二个元素开始，往后遍历数组。这个元素左边的序列是已排序的；右边是未排序的。我们在已排序的部分中，从大的元素向小的元素滑动，直到遇到小于当前元素的位置。也就是说，这个位置左边（含这个位置）的元素都小于当前元素；右边都大于当前元素。在滑动的过程中，所有遇到的元素都往后挪动一位以腾出插入的空间（第一次滑动当前元素就被覆盖掉了）。

在插入排序中，不相邻的元素不会交换位置，因此是稳定的。在最坏的情况下，每 i 个循环都需要移动数组元素 i 次，总共需要：
$$
1+2+3+\cdots+(N-1) = \frac{N\times(N-1)}{2}
$$
故时间复杂度是 $O(n^2)$。

如果输入已经是升序排列，那么插入排序法只需要比较而不用移动，故可以快速地完成相对有序数列的排序。

### 冒泡排序法

**简介：**

冒泡排序法让数组元素像水中的气泡一样逐渐上浮，而达到排序的目的。有些人也把冒泡排序法称为”沉底排序法“。

**Swift 实现：**

```swift
func bubbleSort(array: inout [Int]) {
    var flag = true
    while flag {
        flag = false
        var i = array.count - 1
        while i > 0 {
            if array[i - 1] > array[i] {
                let temp = array[i]
                array[i] = array[i - 1]
                array[i - 1] = temp
                flag = true
            }
            i -= 1
        }
    }
}
```

**分析：**

每次循环中，都从右往左遍历，遇到顺序相反的元素就交换二者的位置。这样，每次都把最小的泡泡推到最左边。重复这个操作知道所有的元素都符合要求为止。可以看到，这样在数组左边就形成了一个有序的子列，每次循环有序子列的元素个数就增加一个，且没有比这个子列里的元素更小的元素。因此我们可以利用这一点，去减少循环的次数（循环到有序子列尾就可以直接进行下次循环），这也被称为“改进的冒泡排序法”。

冒泡排序法只对相邻的两个反序元素进行交换，因此也是稳定的。需要注意，如果把判断条件改为“大于等于（小于等于）”，则算法会失去稳定性。

在最坏的情况下，冒泡排序法会对相邻的元素（未排序部分）进行以下次比较：
$$
(N-1)+(N-2)+\cdots+1=\frac{N^2-N}{2}
$$
因此时间复杂度是 $O(n^2)$。

### 选择排序法

**简介：**

选择排序法在每个计算步骤中，选择出最小的数放到前面，进而完成排序。

**Swift 实现：**

```swift
func selectionSort(array: inout [Int]) {
    for i in 0..<array.count {
        var minj = i
        for j in i..<array.count {
            if array[j] < array[minj] {
                minj = j
            }
        }
        let temp = array[i]
        array[i] = array[minj]
        array[minj] = temp
    }
}
```

**分析：**

在循环的过程中，minj 的值会不断地被后面的（更小时元素的下标）覆盖，这样在每次排序中，不相邻的元素会被交换，因此是不稳定的算法。

选择排序法需要经过以下次比较：
$$
(N-1)+(N-2)+\cdots+1=\frac{N^2-N}{2}
$$
因此时间复杂度是 $O(n^2)$。

### 希尔排序法

**简介：**

希尔排序法循环地调用间隔为 g 的插入排序法，每次缩小 g 的范围进而完成排序。

**Swift 实现**

```swift
func shellSort(array: inout [Int]) {
    let G = [4,3,1]
    for each in G {
        insertionSort(array: &array, g: each)
    }
}

func insertionSort(array: inout [Int], g: Int) {
    for i in g..<array.count {
        var v = array[i]
        var j = i - g
        while j >= 0 && array[j] > v {
            array[j + g] = array[j]
            j = j - g
        }
        array[j + g] = v
    }
}
```

**分析：**

前面已经分析过，插入排序法能较为快速地对比较有序的数组进行排序。希尔排序法就是发挥了插入排序法的优势，让数组一步步地变得越来越有序。不断地缩小插入排序法的间隔（间隔越大，插入排序法所需要交互的次数就越小，也就越快完成）直到间隔为 1。间隔为 1 时（退化成普通的插入排序法），数组已经基本有序了，因此效率较高。

每次的间隔 g 的取值对希尔排序法的效率至关重要。对于如何选择 G，人们已经进行了许多研究。例如：当 $g = 1,4,13,40,121\cdots$ 时，即 $g_{n+1} = 3g_n+1$ 时，算法的复杂度基本维持在 $O(n^{1.25})$。