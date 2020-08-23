---
title: Design Patterns
date: 2020-08-23 22:42:24
tags: Design Patterns
---

# Design Patterns

设计模式可以帮助我们更好地组织代码结构。模式是针对软件设计中常见问题的解决方案工具箱，它们定义了一种让团队更高效沟通的通用语言。每个模式就像一张蓝图，我们可以通过对其进行定制来解决代码中的特定设计问题。

## Catalog

### Creational Patterns 创建型模式

提供创建对象的机制，提升已有代码的灵活性和可复用性。

### Structural Patterns 结构型模式

如何将类和对象组织成更大的结构，同时保持结构的灵活和高效。

### Behavioural Patterns 行为模式

这类模式负责对象之间的算法和职责委派。

## Creational Patterns

### Factory Method 工厂方法

在父类中创建一个方法，在子类中决定实例对象的类型。调用工厂函数的代码无需关心不同子类之间对象的具体实现方式，只知道一组统一的接口定义就好。

举例：一个 UI 框架需要对不同的平台提供不同风格的按钮，比如 Material Design 或 Cupertino Flavor。那么就可以在定义一个 Creator，提供一个 `object<Button> createButton()` 的方法。然后两个具体的 Creator 继承自该类，并在实现中创建不同的按钮实例。当然所有的按钮实例都要实现统一的 `Button` 接口，从而对外屏蔽具体的实现细节。

还有一种情况，就是在资源密集型程序中，可以在工厂方法中使用重用池，可以避免污染外界代码。

### Abstract Factory 抽象工厂

抽象工厂与工厂方法很类似，只不过可以生产一组产品。例如一个 GUI 框架要提供 Button、CheckBox、ProgressBar 等等组件，每个组件又有多种风格，以适应不同的平台。

总的来说，抽象工厂生产抽象产品，背后是具体工厂实现具体产品。

### Builder 生成器模式

当构建一个对象需要非常多的参数时，可以把冗长的构造函数拆成多个步骤，例如：

```swift
buildWalls()
buildDoors()
buildWindows()
...
```

外界（客户端代码）可以直接调用这些步骤，也可以抽象出一个主管类，来管理这些顺序。

首先需要一个 Builder 接口，来定义所有通用步骤：

```swift
reset()
buildStepA()
buildStepB()
getResult()
```

然后由具体生成器来实现这个接口，从而生产具体的产品。

主管类的使用：

```swift
director = new Director()

CarBuilder builder = new CarBuilder()
director.constructSportsCar(builder)
Car car = builder.getProduct()

CarManualBuilder builder = new CarManualBuilder()
director.constructSportsCar(builder)
```

使用构造器，可以避免出现构造方法需要几十个参数，而不得不提供一系列便利构造方法的情况。

### Prototype / Clone 原型模式 / 克隆

当对象需要能被复制时，可以使用原型模式。否则，外界就只能遍历每个成员变量，而当存在私有变量时，就无能为力了。而且，这种遍历会依赖到该对象所属的类。如果只知道对象实现了某种接口，就无法手动复制了。

原型模式是指把复制的指责交给对象本身。一般来说提供一个 clone 的方法接口就可以了。

### Singleton 单例模式

单利模式保证每个类只有一个实例对象，同时提供一个全局的访问节点。由于它同时实现了两个功能，因此违反了单一职责原则。

使用单例模式应特别注意多线程的情况，避免在多个线程创建出多个对象。

## Structural Patterns

### Adapter 适配器模式

适配器是一个特殊的对象，能够转化对象的接口，使之能和其他对象进行交互。被封装的对象甚至察觉不到适配器的存在。

### Bridge 桥接模式

桥接模式把一个复杂的类抽离成“抽象”和“实现”两个独立的层次，从而简化代码的复杂度。

假如我们要编写遥控器的代码，遥控器本身有不同的形态，比如触控式的或按键式的，而被遥控的家电有电视、空调等等。如果我们为每一种 case 都写一个类的话，就会有 `TvTouchRemote` ，`TvButtonRemote`，`AcTouchRemote`，`AcButtonRemote` 等等继承自 `Remote` 的类。类的数量会根据变化以几何级数的速度增长，而其中又会有很多类似的代码。而如果把所有代码编写在一个类来避免数量的指数爆炸，代码里就又会充斥 if-else ，造成维护的困难。

桥接模式通过拆分层次的方式，把**继承改为组合**来解决这一问题。抽象部分（Abstraction）是一个高阶的控制层，本身不完成实际工作，而把工作委派给具体的实现（Implementations）——抽象持有实现。客户端代码只关心如何与抽象交互，但是需要对抽象指定一个实现。实现部分提供通用的接口，由具体实现（Concrete Implementation）来完成不同的平台操作。精确抽象（Refined Abstraction）来提供抽象的变体。

回到遥控器的例子，遥控操作可以看作抽象，而针对不同电器编写的特定代码为实现。

```swift
class RemoteControl {
	var device: Device // 抽象持有实现
	func togglePower()
}

class AdvancedRemoteControl: RemoteControl
{
  //....
}

protocol Device {
  func enable()
  func disable()
}

class TV: Device {
  //....
}

// client code
tv = new TV()
remote = new RemoteControl(tv)
remote.togglePower()
```

### Composite / Object Tree 组合模式 / 对象树

只有在应用的核心模型可以用树来表示时，此模式才有意义。

对象树模式的好处在于，客户端代码无需关心元素的具体类型，而是可以通过统一的方式来操作他们。Component 接口描述了树中简单项目和复杂项目的所有共同项目，直接与客户端交互。Leaf 是不包含子项目的节点，完成大部分实际工作。Container 包含 Leaf 或其他 Container，它也不关心子节点的具体类型，同样通过通用的接口通知子节点工作。

例如，一个图形编辑器可能有圆形、方形等基础形状（Leaf），也会有组合形状（Container）。而他们都有一组通用的接口，例如移动、绘制等。

### Decorator 装饰器模式

装饰器通过将原始对象放入一个包含特定行为的装饰器中，从而为原对象绑定新的行为。我们甚至可以构造多个不同的装饰器，从而组合多种行为。这也是一种组合替代继承的思想。

装饰器应该提供和原对象完全一致的接口，因此从客户端视角来看，两者是完全相同的。装饰器中引用的成员变量应该是遵循同样接口的任意对象，这样就可以像栈一样，多层封装。

用真实世界类比，毛衣可以御寒，而雨衣可以避雨。在寒冷的雨夜，我们就可以同时穿上毛衣和雨衣，从而组合御寒和避雨两个功能。当其中某个功能不再需要时，也可以很容易地脱掉。

例如，在把一个数据写入磁盘时，我们要压缩并加密。这就可以构造一个  `EncryptionDecorator` 和一个 `CompressionDecorator` 。由于接口保持一致，在客户端视角来看，增加一个装饰器和直接写入原始数据的代码是可互换的。

### Facade 外观模式

外观模式对客户端提供了一个简单的接口，从而屏蔽内部的复杂子系统。就像电话购物，通过客服人员对购买者提供了简单的语音接口，屏蔽了内部复杂的仓储、物流、交付、结算等等环节。

客户端代码应该仅通过外观与复杂的子系统交互。

### Flyweight 享元模式

享元模式可以用来减轻内存压力。一般情况下，我们会把所有的数据都存储在各个对象中，比如在一个游戏中，子弹对象可能有坐标、贴图等属性。但是当子弹数量特别大的时候，程序可能会 OOM。

其实相同类型的子弹贴图是完全相同的，而贴图也恰好是占用内存的大头。这类外界不会改变、只会读取的数据被称为内在状态。相反，每个子弹的坐标都不相同，外界也会不断更改这些属性，这被称为外在状态。享元模式建议把内在状态用“享元”对象存储——假如说我们的游戏有子弹、导弹两种类型粒子，则享元对象只存在两个。外在状态可以用一个数组存储。这个数组的对象包含了每个子弹的外在状态：坐标、速度等等。这些对象共享“享元”对象的数据。

我们还可以构造一个享元工厂，来管理享元对象的缓存池。

### Proxy 代理模式

代理模式可以让我们提供一个原始对象的替代品，从而完全控制对原对象的访问，并在把请求提交前后做一些额外的处理。代理应该遵循和原始对象一样的服务接口，才能伪装成原始对象。

例如，我们的程序中可能有一个下载类，但是每次请求该下载类，都会重新下载一次视频。我们可以构造一个实现了同样接口的代理，在代理中保存下载记录。如果多次请求同一文件，可以直接返回已有的缓存文件。或者当我们需要给某些操作打日志时，就可以包装一个日志代理，用于保存访问记录。

听起来，装饰器和代理非常相似，但不同之处在于代理会自行管理服务对象的生命周期，而装饰器通常由客户端来组装。

## Behavioral Patterns

### Chain of Responsibility (CoR) 责任链模式

责任链模式允许我们将请求沿着处理者的链条传递。每个节点都可以处理请求，或是发送给下一个处理者。因此，请求的处理顺序很清晰，且每个环节的职责单一，避免了代码的混乱。它同时也满足开闭原则，可以在不更改现有代码的情况下新增处理者。

在一个订购系统中，责任链可能包括权限验证、数据缓存、安全检查等等。当其中一个环节出现异常后，该处理流程可以天然地中断，从而提升效率。另一个典型的例子是 GUI 系统。视图树上的 View 可以依次判断自己是否可以处理点击事件，如果不能，则沿着视图树向父节点发送该事件。

### Command 命令模式

命令模式把请求转换成一个包含有与请求相关所有信息的对象。这有助于我们实现请求参数化、延迟请求执行，或实现撤销操作。

假设我们要实现一个文本编辑器，那么可能有多个地方都要触发保存功能：保存按钮、保存菜单栏，以及 command+S 快捷键。一般我们可能会让这些 GUI 元素直接操作业务逻辑层，于是保存相关的逻辑可能分散在工程的各个位置。命令模式建议我们不要让 GUI 直接处理保存操作，而是建立一个新的层：SaveCommand。从此，GUI 模式只触发命令，而不再关心业务逻辑层是否接收到了请求，也无需了解其对请求进行的处理方式。命令对象会自己处理所有的细节。

```swift
class Command {
  func execute()
}

class CopyCommand: Command {
  //....
}

class PasteCommand: Command {
  //....
}

// client code
copyBotton.setCommand(new CopyCommand())
```

### Iterator 迭代器模式

一般我们会让集合本身提供多种遍历方法，但是这模糊了其“存储数据”的主要职责。迭代器模式把迭代算法抽离成一个单独的对象，从而让客户端代码与具体的集合解耦。

首先，迭代器应该有一组通用的接口，如 `getNext()` 等。之后，集合类型需要包括一个获取迭代器的接口，这样可以配置不同的迭代器。最后，为每一种集合类型，构造一个专属的迭代器类。

### Mediator 中介者模式

中介者模式思想很简单，它可以解决对象和对象之间耦合过于紧密的问题。使用中介者模式，组建之间不再直接通信，而是通过中介者简介通信。

现实生活中，飞机驾驶员通常不会直接沟通起降顺序，而是通过中介者——塔台来间接通信。

### Memento 备忘录模式

备忘录模式允许在不暴露对象实现细节的情况下，保存和恢复对象之前的状态，因此特别适合“撤销编辑”等场景。

备忘录模式建议把状态的副本存储在“备忘录”这一特殊对象中，除了创建备忘录的对象之外，其他对象都不允许访问和修改该备份的状态。但是其他对象可以访问如创建时间等基础信息。备忘录的创建由实际状态的持有者原发器（Originator）负责。

备忘录可以保存在负责人（Caretaker）中。负责人只知道“何时”、“为何”创建了备忘录，以及何时该恢复副本。需要回滚时，负责人从栈中取出栈顶的备忘录，并传给 Originator 的恢复方法中。

```swift
class Editor {
  func save() -> Memento
  func restore(m: Memento) -> BOOL
}

class Memento {
  var state: State
  func getState() -> State
}

class HistoryCaretaker {
  var stack: Memento[]
  func undo() -> BOOL
  func doSomething()
}
```

### Observer 观察者模式

观察者模式很好理解，由 Publisher 发布消息，只有之前注册过的 Subscriber 才会收到消息。

### State 状态模式

状态模式和有限状态机密切相关，它可以让一个对象的状态改变时，改变自己的行为。

首先需要定义一个 State 的接口，该接口中声明跟状态有关的方法。具体状态（Concrete State）基于某种状态来实现这些接口。上下文（Context）保存具体状态的引用，并通过状态接口与状态对象交互。上下文或具体状态都能触发状态的转移。

```swift
class AudioPlayer {
  var state: State
  
  func changeState(state: State) {
    this.state = state
  }
  
  func clickLock() {
    this.state.clickLock()
  }
  
  func clickPlay() {
    this.state.clickPlay()
  }
  
  //....
}

class State {
  var player: AudioPlayer
  
  func clickLock()
  func clickPlay()
  //....
}

class LockedState {
  func clickLock() {
    player.changeState(new PlayingState(this.player))
  }
  
  //....
}

class ReadyState {
  //....
}
```

### Strategy 策略模式

策略模式和状态模式有点类似，他是通过预先定义好接口，将一系列算法封装进不同的对象中。由 Context 来维护指向具体策略的引用。客户端代码负责创建一个特定的策略，并传递给 Context。

例如，在一个地图应用中，驾车导航、步行导航就可以作为两种不同的策略。

### Template Method 模版方法模式

模版方法模式建议在超类中定义算法的框架，让子类在不修改结构的情况下，重写算法的特定步骤。具体方式是在父类中定义一系列方法，并可以提供一些默认实现，由子类去做覆写。此外，还可以在关键步骤之间添加钩子方法，执行一些额外的步骤。

### Visitor 访问者模式

假如我们现在有 City，Industry 等等一系列的类，现在需要支持一个到处为 XML 文件的方法。最直观的想法是在每一个类中都新增一段导出逻辑。然而这样可能会影响到已有的代码，从而让整个程序都不稳定。

访问者模式建议把新的行为放在“访问者”这个单独的类中，而把需要执行操作的原始对象作为参数传给访问者。由于每个类的实现可能不同，因此要提供一系列的函数。

```swift
class ExprotXMLVisitor {
  func exportCity(city: City)
  func exportIndustry(industry: Industry)
}
```

但是当我们遍历全部对象时，面对一个具体类型未知对象，该如何确定该调用哪个方法呢？

```swift
for(node in graph) {
  if (node.isKindOf(City.class)) {
    //...
  } else (node.isKindOf(Industry.class)) {
    //...
  }
}
```

这样的类型检查太过丑陋了。一个解决方法是用 **Double Dispatch** 的方式来避开判断语句。既然每个对象清楚自己是什么类，为什么要让客户端来检查类型呢？

```swift
class City {
  func accept(v: Visitor) {
    v.exportCity(self)
  }
}

// client code
for(node in graph) {
  node.accept(visitor)
}
```



---

References:

[1] https://refactoring.guru/design-patterns/

