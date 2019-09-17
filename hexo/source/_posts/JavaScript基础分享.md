---
title: JavaScript基础分享
date: 2018-07-26 21:59:18
tags: JavaScript
---

# JavaScript 基础分享

> Any application that can be written in JavaScript, will eventually be written in JavaScript.

## JS 简介

JavaScript 是一门动态的、弱类型的、基于原型（而不是基于类）的解释型（或 JIT 编译型）语言。它是一门多范式语言，支持命令式、面向对象，以及函数式编程。语言本身不支持 I/O 操作，而是依赖于宿主环境。现在，JS 不仅可以在浏览器中运行，也可以运行在 Node 等非浏览器环境中。

JS 是一门单线程语言，这意味着在浏览器中，JS 代码只能在 JS 引擎线程中执行。但这并不意味着耗时操作（如 HTTP 请求）会把界面卡死，因为浏览器本身是可以开启多线程的。在 HTML 5 中，可以通过 Web Workers 来在多个线程中执行 JS 代码，但这和“JS 是单线程语言”并不冲突。因为多个 worker 之间并不共享资源，而只能通过 message 来通信。

JavaScript 已由 ECMA 进行了标准化，这个标准被称为 ECMAScript。JavaScript 是 ECMAScript 的一种实现，但在绝大多数情况下，这两个词是可以互换的。每年的 6 月，ECMA 都会发布一个新标准，不过大家通常使用 ES6 来指代 ES2015 及以后的版本，泛指“下一代 JavaScript”。在《JavaScript 高级程序设计》这本书中，讲解的是 ES5。

## 基本概念

### 变量

JavaScript 的变量是松散类型的，一个变量可以用来保存任意类型的值。如果没有被初始化，那么变量就会保存一个特殊的值 `undefined`。

```javascript
var a;
console.log(a); //undefined
a = 5;
console.log(a); //5
a = 'hello world!';
console.log(a); //hello world!
```

声明变量需要使用 var 操作符，但是如果不使用，不仅不会报错，反而变量会变成全局变量，不鼓励这种行为。

### 数据类型

JavaScript 中有 5 种基本数据类型：

- Undefined
- Null
- Boolean
- Number
- String

和一种复杂类型：

- Object

之前提到，JavaScript 不是基于类的，因此它也不支持创建自定义的类型。所有值都将是上述的 6 种类型之一。虽然在 ES6 中引入了 `class`，但这只是语法糖而已。

可以使用 `typeof` 操作符来判断类型。typeof 操作符会返回一些字符串：

- "undefined"
- "boolean"
- "string"
- "number"
- "object"
- "function"

函数在 JS 中也是对象，但是 typeof 操作符还是会把函数和普通对象作出区分。

还有比较神奇的一点是，虽然 Null 类型只有一个特殊的值 null，但是 `typeof null` 返回的却是 `"object"`，这是因为 null 表示一个**空对象**指针。

```javascript
console.log(typeof "hello?"); //"string"

function foo() {}
console.log(typeof foo); //"function"

console.log(typeof(null)); //"object"
```

### 关系操作符

关系操作符遇到非数值类型时，会发生一些比较神奇的事情，比如：

```javascript
"23" < "3" //true
"23" < 3 //false
"a" < 3 //false
"a" >= 3 //false
```

首先，两个字符串比较的是字符编码值。字符"2"的编码值小于"3"，因此是 true。

但是，如果一边是数值，则另一边会被转化成数值再做比较。"23" 会被转化成 23，所以返回 false。

但是第三行和第四行中，"a" 转化成数值会变成 NaN。NaN 与任何数值比较都会返回 false，所以会出现既不大于，也不等于，还不小于的情况。

如果操作数是对象，则会先调用 `valueOf()` 方法。如果没有这个方法，则会调用 `toString()` 再根据之前的标准比较。

### 相等操作符

JavaScript 中有两种比较：`==` 和 `===`。

使用 `==`，会在比较前先做类型转换，而 `===` 直接比较。由于 JS 臭名昭著的蜜汁类型转换会带来各种各样的奇怪现象，强烈建议经常使用 === 做全等判断。

```javascript
5 == '5' //true
null == undefined //true
true == 1 //true
true == 2 //false
NaN === NaN //false
```

想彻底搞懂？

```javascript
[{}] + [] === "[object Object]" //true 😊

25[[[+[] == +[]][0] + []][0][0] + [[{}] + []][0][1]+ [[] + []][0][([[{}] + []][0][5]) + ([[{}] + []][0][1]) + ([[][0]+[]][0][1]) + ([[[] == []][0] + []][0][3]) + ([[+[] == +[]][0] + []][0][0]) + ([[+[] == +[]][0] + []][0][1]) + ([[][0]+[]][0][0]) + ([[{}] + []][0][5]) + ([[+[] == +[]][0] + []][0][0]) + ([[{}] + []][0][1]) + ([[+[] == +[]][0] + []][0][1])][[[][0]+[]][0][1] + [[[] == []][0] + []][0][1] + [0[([[{}] + []][0][5]) + ([[{}] + []][0][1]) + ([[][0]+[]][0][1]) + ([[[] == []][0] + []][0][3]) + ([[+[] == +[]][0] + []][0][0]) + ([[+[] == +[]][0] + []][0][1]) + ([[][0]+[]][0][0]) + ([[{}] + []][0][5]) + ([[+[] == +[]][0] + []][0][0]) + ([[{}] + []][0][1]) + ([[+[] == +[]][0] + []][0][1])]+[]][0][11] +  [[[] == []][0] + []][0][4]]](30) //"p"
```

### for-in

和其他语言不一样，我们可以使用 for-in 循环来遍历对象的属性名，比如：

```javascript
var person = new Object();
person.name = "Luyuan Wang";
person.age = 20;
person.school = "Huazhong University of Science and Technology";
for (var propName in person) {
    console.log(propName);
}
//name
//age
//school
```

这个顺序是不保证的。

如果遍历的对象是数组，那么取出来的是数组下标，而不是元素，这个跟 Objective-C 或者 Swift 等语言都不一样：

```javascript
var list = ["a", "b", "c"];
for (var each in list) {
    console.log(each);
}
//0
//1
//2
```

因此，上面代码的 each 更应该被命名为 index。

### 函数

JavaScript 的函数不用定义返回值类型，甚至有没有返回值都不是确定的。

```javascript
function divide(a, b) {
    if (b === 0) {
        return;
    }
    return a / b;
}
console.log(divide(1, 0)); //undefined
```

JavaScript 函数的参数是通过数组来访问的（只是类似数组，但并不是 Array 的实例），因此它并不关心你传入多少个变量，更不关心变量的类型。你甚至可以通过 arguments + 下标来访问参数，参数名其实只是一种便利：

```javascript
function foo() {
    console.log(arguments[0]); //很像数组
}
foo('hello world!');
```

```javascript
var array = [];
console.log(Array.isArray(array)); //true

function foo() {
    console.log(Array.isArray(arguments)); //false 并不是Array的实例
}
foo();
```

这和 OC 中用函数参数名、参数类型等作为函数签名有很大区别。需要注意的是，JavaScript 的参数传递的永远是值，而不是引用（这点在后面会再次提及）。

JavaScript 中的函数不支持重载，但是可以利用 `arguments.length` 判断参数个数，从而表现出不同的行为。

## 变量、作用域和内存问题

### 基本类型和引用类型的值

尽管 JavaScript 是松散类型的，但变量的值还是分为基本类型的值和引用类型的值。前面提到的 5 种基本类型是按值访问的，而 Object 类型操作的是引用。和许多其他的语言不同，String 是基本类型值，而不是引用，这和 Swift 很像。

```javascript
var num = 5;
var num2 = num;
num2 += 1;
console.log(num); //5
console.log(num2); //6
```

```javascript
var obj = new Object();
obj.value = 5;
var obj2 = obj;
obj2.value += 1;
console.log(obj.value); //6
console.log(obj2.value); //6
```

```javascript
var str = "123";
var str2 = str;
str2 += "4";
console.log(str); //"123"
console.log(str2); //"1234" 和Swift一样，String不是引用类型
```

### 函数参数

之前提到，JavaScript 中函数的参数是以值来传递的，而永远不是引用。那么，下面这个例子应该输出什么呢？

```javascript
function changeSchool(person) {
    person.school = "Mizzou";
}
var luyuanwang = {
    school: "HUST"
}
changeSchool(luyuanwang);
console.log(luyuanwang.school);
```

答案是“Mizzou”。看起来很奇怪，似乎不符合我们说传递的是值，而更像是在传递引用？其实，这里传递的值，是指把“对象”复制一遍。这里的对象是一个引用，那么就把这个指针复制了，因此这里是两个不同的、指向同一个地址的引用。所谓的传递的是值，并不是指把内存中的对象复制一遍，这里要搞清楚。

### 没有块级作用域

虽然函数会创建局部的执行环境，但是花括号封闭的代码块并没有自己的执行环境：

```javascript
var flag = true;
if (flag) {
    var num = 10;
}
console.log(num); //10 仍有定义
```

这和一般的语言都不同。如果想要“正常一点”，可以使用 ES6 中引入的关键字 let：

```javascript
var flag = true;
if (flag) {
    let num = 10;
}
console.log(num); //ReferenceError: num is not defined
```

### 垃圾收集

JavaScript 是有 GC 的，通过“标记清除“的方式，周期性地回收垃圾。有些浏览器也曾经使用过引用计数，不过发现有循环引用的问题后，后来就又放弃了。所以一般情况下，我们都不必操心内存的事情。

通过标记清除算法，GC 将会从根对象开始（根对象是一个全局对象），开始寻找根对象引用的对象，并递归地寻找下去。那些无法触达的对象，将被认为是垃圾对象，会被 GC 回收。从 2012 年开始，所有现代浏览器都使用了标记清除或其改进型算法，即使产生循环引用，照样可以被清除掉。

## 原型链

之前提到过，JavaScript 是基于原型的语言，这和我们所熟悉的其他语言都不一样。

### 构造函数

在 JS 中，可以使用**原型模式**来创建一个对象（尽管这不是唯一的方法）：

```javascript
function Employer() {

}
Employer.prototype.name = "Lei, Jun";
Employer.prototype.company = "Xiao Mi";
Employer.prototype.makeSpeech = function() {
    console.log("Are u ok?");
}

var person = new Employer();
person.makeSpeech(); //Are u ok?
```

Employer 和普通的方法没有任何区别，但是如果在调用的时候使用了 new 关键字，就会成为一个构造函数。每个函数都有一个 `prototype` 属性，这个属性指向的就是创造出来的实例的原型对象。

### 原型对象

原型最初会包含一个 constructor，指向它的构造函数。也就是 Employer.prototype.constructor 就是 Employer。每个对象也都有一个 `[[Prototype]] ` 属性来指向原型对象，但这个属性是私有的，不能通过外界访问。不过在有一些浏览器（比如 Safari 和 Chrome 中），提供了一个 `__proto__` 属性来访问原型。

如果你修改属性的值，其实只是对变量创建了一个新的属性，屏蔽掉了在对象原型中查找的操作。在多数情况下，这都没什么问题，但如果原型对象中放置了一个引用类型的属性，那么原型共享的特性就会导致问题了。为了解决这个问题，可以用普通的构造函数构造属性，而用原型构造方法。

```javascript
function Employer(name) {
    this.name = name;
}
Employer.prototype = {
    constructor: Employer,
    makeSpeech: () => {console.log('Are u ok?')}
}

var person = new Employer('Lei, Jun');
person.makeSpeech();
```

### 终于来到原型链

如果我们修改掉 prototype，把它指向一个实例，那么在搜索属性和方法的时候，就会一层一层地搜索下去，也就间接地实现了继承。每个对象都有原型对象，原型对象又有自己的原型对象，从而构成了一个原型链。原型链的最后一环是 null，null 没有原型。

```javascript
function Father() {
    this.sex = "male";
}

function Son() {
    this.job = "programmer";
}

Son.prototype = new Father();

var person = new Son();
console.log(person.sex); //male 通过查找原型的属性找到
console.log(person.job); //programmer 自己的属性
```

不过直接使用原型链是有缺陷的。首先，由于原型是共享的，那么含有引用类型属性的原型就会出问题。而且，不能在子类中向父类的构造函数中传递参数。为了解决这些问题，程序员们想出了很多方法。不过，现在我们有个 ES6，可以使用 ES6 的新关键字 `class` 来定义类了。但这只是语法糖，并没有改变 JS 基于原型的事实。

```javascript
class Father {
    constructor() {
        this.sex = "male";
    }
}

class Son extends Father {
    constructor(job) {
        super();
        this.job = job;
    }
}

var person = new Son("programmer");
console.log(person.sex); //male
console.log(person.job); //programmer
```