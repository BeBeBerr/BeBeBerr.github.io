---
title: Obj-C键值编程
date: 2018-04-07 20:23:35
tags: Obj-C
---

# Objective-C 键值编程

Objective-C 键值编程包括键值编码 KVC 和键值观察 KVO 两部分。

### 键值编码

对象内部的属性由于被封装起来，无法直接访问，而要用到属性的 getter 和 setter 方法。KVC 提供了一种用于访问属性的键值对机制，其中 key 是属性的名称，而 value 是属性的值。这种机制与访问字典条目的机制相同。如：

```objective-c
[object valueForKey: @"var1"];
[object setValue: @"value" forKey: @"var1"];
```

通过 KVC，可以用能在运行时改变的字符串来访问属性，从而动态而灵活地访问和操作对象的状态。

也可以通过键路径来指明需要便利的对象属性序列，下面两行代码的功能是相同的：

```objective-c
person.name.firstName = @"Bob";
[person setValue: @"Bob" forKeyPath: @"name.firstName"];
```

还可以通过 `dictionaryWithValuesForKeys` 方法设置或获取多个属性的值。

NSObject 遵守 NSKeyValueCoding 协议，因此它的所有子类都为键值编码提供了内置支持。

你可以通过在类中重写 NSKeyValueCoding 的一些方法来控制类的行为。比如通过重写 `accessInstanceVariablesDirectly` 可以让类控制如果没有找到属性的访问方法，能不能直接让键值编码访问属性的支持变量。

### 键值搜索模式

KVC 如何来去获取和设置属性的值呢？

- KVC 首先会搜索目标类名称符合 set\<Key> 的访问方法。例如，如果调用了 `setValue:forKey:` 方法，为 key 提供了参数 name，那么 KVC 就会搜索目标类中 `setName:` 的访问方法。
- 如果没找到访问方法，且接收对象的类方法 `accessInstanceVariablesDirectly` 返回 YES（默认返回 YES，可以设置为 NO），KVC 就会搜索接收对象的类，寻找名称匹配 _key / _isKey / key / isKey 格式的实例变量。
- 如果找到了，就会设置值。
- 如果没找到，接收对象的 `setValue:forUndefinedKey:` 就会被调用。通过重写这些方法可以处理无法找到属性的情况。

由此可见，写代码时应该遵循 Cocoa 的命名规范，这样才能让 KVC 正常工作。

### 集合操作符

KVC 也可以对集合类型的元素进行操作。格式为 `集合键路径.@操作符.属性键路径` 。

```objective-c
NSNumber *totalPrice = [orderItems valueForKeyPath: @"@sum.price"]; //计算总和
NSNumber *totalItems = [orderItems valueForKeyPath: @"@count"]; //确定集合含有的对象数量
NSArray *itemTypes = [orderItems valueForKeyPath: @"@distinctUnionOfObjects.description"]; //获取每个集合元素的描述
```

### 键值观察

KVO 是一种通知机制，它使对象能够在其他对象的属性发生更改时获得通知。

通过 `addObserver:forKeyPath:options:context:` 方法，在观察对象和被观察对象之间建立联系。当被观察属性的值发生改变时，被观察对象就会调用观察对象中的 `observeValueForKeyPath:ofObject:change:context:` 方法。在该方法中，观察者类会实现用于处理被观察属性发生更改的逻辑。

NSObject 遵守 NSKeyValueObserving 协议，因此它的所有子类都对键值观察提供了内置的支持。

### 键值观察和通知

键值观察和通知都提供了对象间的传递信息机制，功能有些类似。下面对两者进行比较。

NSNotification 能够封装通用信息，可以为更广泛的系统事件提供支持。而 KVO 只能支持对象属性更改通知功能。

通知使用交互的广播模型，信息会通过集中式通知中心分发，可以向多个对象发送消息。通知支持同步传递通知，也支持通过 NSNotificationQueue 来异步传递通知。KVO 使用点对点的交互模型，被观察对象会直接向已注册的观察着发送通知，且程序会一直处于阻塞状态，直到相应的处理执行完为止。通知的非阻塞交互模式可以提高应用程序的响应性。

通知双方是分隔开的，而 KVO 会通过 addObserver 方法为观察对象建立一个强引用。因此在释放被观察对象前，应该先通过 removeObserver 删除观察对象。

### KVO 的实现

键值观察是通过 Objective-C 的 Runtime 实现的。当你为对象注册观察者时，KVO 的基础设施会动态创建一个被观察对象的子类。然后，它将被观察对象的 isa 指针指向这个新建的子类，这样向原所属类发送的消息实际上就会被发送给这个子类。正常来说，isa 指针会指向对象的所属类，而该类拥有一个列出指针与该类中方法关系的分派表。这个新建的子类会拦截向被观察者发送的消息，向观察者发送通知等。以动态方式置换 isa 指针指向的类被称为 isa-swizzling。