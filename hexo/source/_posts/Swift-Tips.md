---
title: Swift Tips
date: 2018-03-18 14:54:59
tags: Swift
---

# Swift Tips

### 结构相等&引用相等

结构相等符 `==` 被用来判断两个值是否相等。而引用相等 `===` 用来检查两个引用是否具有**同一性**，即是否指向同一个对象。

```swift
class A {
    var p = 0
}

var a = A()
var b = a
print(b == a)
```

上面的代码会报错误信息 `Binary operator '==' cannot be applied to two 'A' operands`，提示你需要自己实现结构相等运算符。而如果把 == 改为 \=== 就会 print 出 true。若将 class 改为 struct，则 === 也一样会报错。因为结构体是值类型，就谈不上引用了。

### forEach

一下两段代码有什么不同？

```swift
func foo1() {
    array.forEach { num in
        print(num)
        if num > 2 {
            return
        }
    }
}

func foo2() {
    for num in array {
    	print(num)
    	if num > 2 {
        	return
    	}
	}
}

let array = [1,2,3,4,5]
foo1()
foo2()
```

使用 for each in 循环的函数会在打印出 3 之后停止，而使用 forEach 函数的函数会打印出所有的值。这是因为 forEach 的 return 语句只会将 forEach 的尾随闭包返回，而不会终止 forEach 本身的循环。这一点从刚刚**“函数的函数”**这个说法中也可以看出来。

### mutating 关键字

```swift
struct A {
    var a = 0
    mutating func change() {
        a += 1
    }
}
```

结构体中的方法若想改变自身的属性，则需要在 func 前添加 mutating 关键字，而类中不用。可以这样看待这个问题的：可以理解成 self 是函数的一个隐式参数，添加 mutating 关键字代表 self 是可变的（相当于用 var 来声明这个结构体的感觉），否则 self 就是不可变的（相当于用 let 声明，自然不可以改变结构体内属性的值）。而 class 无论是 var 还是 let 来声明，都可以改变属性的值（var 和 let 对引用类型只限制了引用本身是否可以改变，而不是引用指向的对象），故不存在这个问题。更精确地来说，可以理解为 mutating 相当于对隐式变量 self 添加了关键字 inout。

### 捕获列表

将一个对象的属性设置为弱引用是打破循环引用的重要手段。但是，weak 关键字只能运用于 class 类变量，故不适用于同样是引用类型的函数变量。以下代码通过闭包，间接的构成了循环引用：

```swift
class Child {
    var parent: Parent
    init(parent: Parent) {
        self.parent = parent
    }
    deinit {
        print("child deinit")
    }
}

class Parent {
    weak var child: Child?
    var closure: (()->())?
    deinit {
        print("parent deinit")
    }
}

var p: Parent? = Parent()
var c: Child? = Child(parent: p!)
p?.child = c
p?.closure = {
    print(c)
}
p = nil
c = nil
```

为了打破这个循环引用，可以通过闭包的捕获列表，将 c 设置为弱引用：

```swift
p?.closure = { [weak c] in
    print(c)
}
```

闭包中，self 关键字会被强制写出来，也是为了明确的提示我们可能构成的循环引用。如果构成了循环引用，一般通过将 self 设置为 unowned 无主引用来打破循环。无主引用与弱引用的区别是，在引用的对象释放掉之后，它不会被设置为 nil，因此也不用像弱引用那样，必须是可选值，每次使用时都要解包。

### &

在传递 inout 关键字时，需要在变量名前添加 &。这里的 & 不像 c/c++ 中的那样表示传递的是引用，而是把值复制，再粘贴回来。

如果函数接受的是一个 UnsafeMutablePointer 的话，我们还是需要在变量名前加上 &。但是，这里的 & 表示的确实是传递引用了，更准确地说，传递的是指针。

### @autoclosure 关键字

@autoclosure 关键字可以自动为参数创建闭包，让我们的代码更加整洁。

如果不加此关键字，我们必须手动写闭包语法 `{}`：

```swift
func foo(_ a: () -> Bool) {
    a()
}
foo( {1+1==2} )
```

有了 @autoclosure：

```swift
func foo(_ a: @autoclosure () -> Bool) {
    a()
}
foo(1+1==2)
```

### defer

defer 块会在即将离开函数作用域之前执行。如果有多个 defer 块，则逆序执行（像一个栈）。

```swift
let database = openDatabase()
defer {
    closeDatabase()
}
let connection = openConnection(to: database)
defer {
    closeConnection(to: database)
}
```

### 自定义/重载运算符

定义一个幂运算符 `**` :

```swift
precedencegroup ExponentiationPrecedence { //自定义优先级
    associativity: left //左结合性
    higherThan: MultiplicationPrecedence //优先级高于乘法优先级
}

infix operator **: ExponentiationPrecedence //使用 prefix infix 和 postfix 定义前缀、中缀、后缀

func **(lhs: Double, rhs: Double) -> Double {
    return pow(lhs, rhs)
}

2**3 // 8.0
```

