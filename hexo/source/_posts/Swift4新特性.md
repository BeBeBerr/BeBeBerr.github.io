---
title: Swift4新特性
date: 2017-10-08 12:52:08
tags: Swift
---

# Swift4 新特性

参考自：Ray Wenderlich - iOS11 by Tutorials

### One-sided ranges

我们现在可以这样表示一个范围：

```swift
let array = ["通信电子线路", "电磁场与电磁波", "数字信号处理", "通信原理", "计算机网络"]
print(array[...3])
\\打印出: ["通信电子线路", "电磁场与电磁波", "数字信号处理", "通信原理"]
```

也可以这样：

```swift
array[..<3]
array[2...]
```

单边范围也可以用来产生一个无限序列：

```swift
let uppercase = ["A", "B", "C", "D"]
let asciiCodes = zip(65..., uppercase)
print(Array(asciiCodes))
\\打印出: [(65, "A"), (66, "B"), (67, "C"), (68, "D")]
```

这里 `zip` 是函数式编程中常用的一个函数，就像 map, flatmap 那样。它表示把两个序列“齿合”成一个序列。别忘了 zip 有“拉链”的意思。

在模式匹配中也可以应用：

```swift
slet value = 2
switch value {
case ...2:
    print(2)
case 3...:
    print(3)
default:
    break
}
```

而且并不仅限于整型！Double 型也是支持的。

### Strings

String 现在回归了集合类型（就像 Swift1 中的那样）。这意味着集合可以做的事情，String 都可以做。

```swift
let str = "How are you Indian Mi fans?"
for char in str {
    print(char)
}
str.count
str.isEmpty
String(str.reversed())
```

这里注意，`str.reversed()` 返回的是一个 `ReversedCollection<String>` ，所以必须强制转换成 String。

String 虽是集合类型，但是 Int 和 Swift3 中一样不能作为其下标。下标必须是一个 `String.Index` 。

```swift
let index = str.index(str.startIndex, offsetBy: 4)
str[index...] //are you Indian Mi fans?
```

Swift4 还带来了一个新的类型：**Substring**

为什么不继续使用 String 类型，而要构造一个新的 Substring 类型呢？我们知道，为了保证高效率，Swift 大量使用了 copy-on-write 技术。在你提取出一个子串的时候，并不会真的复制出一个新的字符串出来，而是多了一个指向原有字符串其中一部分的指针。就像这样：

![substring](/img/Swift4新特性/substring.png)

这回使得该字符串的引用计数增加。当你不在使用原有的字符串而转而只用子串时，原有的字符串就无法被自动释放。而如果引入了新的类型 Substring，而大量的 api 要求传入的类型是 String，你就不得不强制将 Substring 转化为 String（Swift 是强类型语言的缘故）。这个被强制转化出来的 String 就与之前的字符串无关了（被 copy 出来），从而避免了内存泄露。

在上面的例子中就已经出现了 Substring：

```swift
let sub = str[index...]
type(of: sub) //Substring.Type
```

由于 String 和 Substring 都遵守 StringProtocol，所以大多数用法都是一致的。重点需要记住的就是内存中的关系。

Range<String.Index> 和 NSRange 之间的转化也变得更方便了：

```swift
let str = "🙈🙉🙊🐵🐒"
str.count //5
str.utf16.count //10
let nsRange = NSRange(str.startIndex..., in: str) //{0, 10}
```

（NSRange 和 UTF-16 是对应的）

Swift4 还带来了多行字符串，就像 Python 中的那样：

```swift
let str = """
大鹏一日同风起，
抟摇直上九万里。
"""
```

### Dictionary enhancements

有了新的初始化函数，现在可以使用键值序列来构造字典了：

```swift
let dic = Dictionary(uniqueKeysWithValues: zip(1..., ["1","2","3"]))
//dic: [2: "2", 3: "3", 1: "1"]
```

或者用元组的序列也可以：

```swift
let dic = Dictionary(uniqueKeysWithValues: [(1,"1"), (2,"2")])
```

并且增加了一个 merge 函数，用来合并两个字典。在闭包中定义遇到冲突时的处理方法：

```swift
let defaultStyling: [String: UIColor] = [
    "body": .black, "title": .blue, "byline": .green
]
var userStyling: [String: UIColor] = [
    "body": .purple, "title": .blue
]
userStyling.merge(defaultStyling) { (user, _) -> UIColor in
    user
}
// ["body": .purple, "title": .blue, "byline": .green]
```

新的 mapValues 函数可以不改变字典的结构（map 会返回一个数组，而不是字典）：

```swift
var dic = Dictionary(uniqueKeysWithValues: zip(1..., ["1","2","3"]))
dic = dic.mapValues{
    String(Int($0)! + 1)
}
```

字典也可以依据某一个特征来进行分组（Grouping）：

```swift
let names = ["Harry", "ron", "Hermione", "Hannah", "neville", "pansy", "Padma"].map { $0.capitalized } //大写
let nameList = Dictionary(grouping: names) { $0.prefix(1) }
//["H": ["Harry", "Hermione", "Hannah"], "R": ["Ron"], "N": ["Neville"], "P": ["Pansy", "Padma"]]
```

自定义下标可以返回范型了：

```swift
struct Grade {
    private var data: [String: Any]
    
    init(data: [String: Any]) {
        self.data = data
    }
    
    subscript<T>(key: String) -> T? {
        return data[key] as? T
    }
}

let gradebook = Grade(data: ["name": "Neil Armstrong",
                             "exam": "LEM Landing",
                             "grade": 97])
let who: String? = gradebook["name"]
let grade: Int?  = gradebook["grade"]
```

这样就不必写 as 语句把 Any 类型转化了。但是指明类型仍是必不可少的（即`:String？`不可缺少）。

### 还有一些其他的小变化

- extension 中可以访问到 private 成员变量了。
- 出于内存安全性的考虑，一个变量不能被当作两个 `inout` 参数传入同一个函数，这被称为“排他性”（exclusivity）。所以 Swift3 中的 swap 函数在 Swift4 中就非法了：

```swift
swap(&numbers[1], &numbers[3]) // illegal in Swift4
//numbers 不能被当作两个 inout 参数传入 swap 函数
```

​	现在可以用：

```swift
numbers.swapAt(1, 3)
```

​	更详细的介绍参看[这里](https://github.com/apple/swift-evolution/blob/master/proposals/0173-swap-indices.md)。

- Swift4 中对 NSNumber 的桥接做了安全性检测：

```swift
let n = NSNumber(value: 603)
let v = n as? Int8
```

​	在 Swift3 中，会出现一个不正确的值。而现在会是 nil 了。也可以用 is 语句来判断是否可以转换。

- 可以具体指明一个对象既是某个类型，又遵守某个协议了：

```swift
protocol MySpecialDelegateProtocol {}
class MySpecialView: UIView {}
class MyController {
  var delegate: (UIView & MySpecialDelegateProtocol)?
}
```

### 还有一些参考资料：

https://github.com/apple/swift-evolution

https://developer.apple.com/videos/play/wwdc2017/402/