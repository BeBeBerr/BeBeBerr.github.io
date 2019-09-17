---
title: iOS 蓝牙开发初步
date: 2017-07-04 13:48:45
tags: CoreBluetooth
---

# iOS 蓝牙开发初步

注意：CoreBluetooth 是基于 BLE 4.0 版本的。

官方教程：[Core Bluetooth Programming Guide](https://developer.apple.com/library/content/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/AboutCoreBluetooth/Introduction.html#//apple_ref/doc/uid/TP40013257-CH1-SW1)

### CoreBluetooth 简介

低功耗蓝牙技术是基于蓝牙 4.0 版本的，它在低功耗设备之间定义了一系列通信协议。CoreBluetooth 框架是低功耗蓝牙通信协议的一个抽象：它帮开发者隐藏了许多底层技术的细节，使得开发能与低功耗蓝牙设备交互的 App 变得更容易。

**中心设备和外围设备**是 CoreBluetooth 里最重要的两个角色。不同角色有不同的任务：外围设备拥有其他设备所需要的数据；中心设备用外围设备提供的信息去完成某些任务。举例来说：一个装备了低功耗蓝牙技术的心率探测器为一个 iOS App 提供了房间的温度，而 App 将这些数据用用户友好的方式呈现出来——就像传统的服务器-客户端结构那样。

![CBDevices1_2x](/img/CBDevices1_2x.png)

### 外围设备的数据结构

外设可能会包含多个服务（services），或者提供一些关于连接信号强度的信息。一个服务是指为了完成某种功能所需要的数据和行为的集合。

服务本身由特征（characteristics）或者包含的服务（其他服务的引用）组成。一个 characteristic 提供了外设服务的更多细节。举例来说，心率监视器的服务只描述了它可能含有一个描述身体传感器位置的特征，和一个心律测量值的特征。![CBPeripheralData_Example_2x](/img/CBPeripheralData_Example_2x.png)

当中心设备成功建立了和外设的连接之后，它就可以发现外设提供的所有服务和特征。中心设备也可以通过读或者写特征的值来与外设交互。比如你的 App 会从温度控制器中获得一个温度，也会提供一个温度值给控制器，使它调节室温。

### 中心设备、外设和外设数据的表现方式

除非特别设置，多数情况下本地设备会以中心设备的方式工作。中心设备是一个 `CBCentralManager` 对象。这个对象用来管理已发现或已连接的远程外围设备。包括扫描、发现和连接正在广播的外设。外设用 `CBPeripheral` 对象表示，外设的服务用 `CBService` 表示。类似的，服务的特征用 `CBCharacteristic` 对象表示。

![TreeOfServicesAndCharacteristics_Remote_2x](/img/TreeOfServicesAndCharacteristics_Remote_2x.png)

在 macOS 10.9 和 iOS 6 之后，Mac 和 iOS 设备也可以用作低功耗蓝牙外设，向其他设备提供数据。本地设备作为外设时，用 `CBPeripheralManager` 表示。这些对象涌来管理发布的服务。远程中心设备用 `CBCentral` 表示。Peripheral Manager 也涌来读或写中心设备发出的请求。

可以看到，本地设备作为中心设备和外围设备时，使用的类和类的作用是对偶的。

### 简单应用

#### 构建外围设备

由于模拟器上不能操作蓝牙，所以必须使用真机进行调试。因此可能需要两部 iOS 设备，一台用来做中心设备，另外一台做外设。如果不想自己写外设的代码，也可以使用 LightBlue 软件模拟外设。这里我用了 Arduino Uno 单片机，配合蓝牙 4.0 模块作为外设。

![arduinoWithBluetooth](/img/arduinoWithBluetooth.JPG)

使用时，需要给蓝牙模块 Vcc 引脚接 5V 的电压，Gnd 引脚接 Arduino 的“接地”。蓝牙模块的 Rx 接 Arduino 的Tx，Tx 接 Rx。

用 Arduino 操作蓝牙通信非常简单，因为 Arduino 屏蔽了底层的细节，将蓝牙看作普通的串口。因此直接操作串口既可以了。打开 Arduino IDE，将下面的代码下载到单片机。

```c
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

int i = 0;

void loop() {
  // put your main code here, to run repeatedly:
  Serial.println(i);
  i++;
  delay(2000);
}
```

这里波特率设为 9600 符号／秒。在 loop 中，每间隔 2 秒发送一个数字，同时数字加一。需要注意的是，由于 Arduino 下载程序也需要使用串口，所以会和蓝牙模块连接的串口冲突。下载程序时，需要暂时断开 Rx 和 Tx 引脚。

#### 构建中心设备

需要以下几个属性：

```swift
var manager: CBCentralManager!
var peripherals = [CBPeripheral]()
var connectedPeripheral: CBPeripheral?
```

peripherals 用来存放扫描到的设备，connectedPeripheral 代表需要操作的外设。

在 `viewDidLoad()` 中，对 manager 初始化：

```swift
manager = CBCentralManager(delegate: self, queue: DispatchQueue.main)
```

代理选择 self，线程选择主线程。为了设置代理，需要遵守 `CBCentralManagerDelegate` 协议，并实现该协议的 required 方法：

```swift
func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
        manager.scanForPeripherals(withServices: nil, options: nil)
    default:
        print("未开启蓝牙")
    }
}
```

用 manager 的方法，必须保证蓝牙状态处于 poweredOn。如果蓝牙已开启，则开始扫描外围设备。填 nil 表示不做过滤，扫描一切外围设备。扫描到外设会自动调用下面的方法：

```swift
func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) { 
    if peripheral.name! == "BT05" {
        peripherals.append(peripheral)
        manager.connect(peripheral, options: nil)
    }
}
```

利用外设的名字判断我要连接的设备。我的蓝牙模块名称默认是“BT05”。如果发现了该设备，进行连接。注意，必须持有该外设对象的引用，否则会报错。所以将它添加到数组中。使用数组是因为在一般的应用中，可能不止需要一个外设，这里并不是必须的。

连接到外设后，会调用下面的方法：

```swift
func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    connectedPeripheral = peripheral
    peripheral.discoverServices(nil)
        
    peripheral.delegate = self
    print(peripheral.name!)
    manager.stopScan()
}
```

去查看已连接外设的服务。参数传 nil 同样是查看所有服务，不加过滤。将连接的外设的代理设为 self，因此需要遵守 `CBPeripheralDelegate` 协议。

发现了外设的服务，会调用下面的方法：

```swift
func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    for each in peripheral.services! {
        if each.uuid.uuidString == "FFE0" {
            peripheral.discoverCharacteristics(nil, for: each)
        }
    }
}
```

遍历外设的所有服务，用 uuid 来判断感兴趣的服务。注意这里的 uuid 是服务的 uuid 而不是外设的 uuid。可以通过下载软件 LightBlue 查看服务的 uuid 码，这里是 FFE0。一旦发现，就去获取该服务的特性（characteristic）。

发现了特性会调用下面的方法：

```swift
func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    for each in service.characteristics! {
        peripheral.readValue(for: each)
        peripheral.setNotifyValue(true, for: each)
    }
}
```

遍历所有的 characteristic，读取它的值并允许接受广播。这样每次 characteristic 的值变化后，都会调用下面的方法：

```swift
func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    let str = String(data: characteristic.value!, encoding: .utf8)
    print(str!)
}
```

这里把接收到的值转换为字符串，并用 UTF-8 编码。之后把收到的字符串打印出来。

#### 测试

用面包线把单片机和蓝牙模块连接好，上电。把程序放到真机上调试，在控制台输出：

![screenshotBluetooth](/img/screenshotBluetooth.png)

每隔两秒，输出一个数字，且每次加一。这里没有从 0 开始是因为单片机一上电，就自动开始工作了，不会等到蓝牙连接好再往串口上写数据。测试成功。

今天学习了 CoreBluetooth 的基本概念，并了解了基本的操作流程。可以看到使用 CoreBluetooth 流程比较多，如果不了解基本的概念可能会比较懵。不过总体来说逻辑一层套一层非常严谨，不难理解。接下来我会尝试用蓝牙构建稍复杂的应用。