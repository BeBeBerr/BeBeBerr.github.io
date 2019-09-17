---
title: iOS蓝牙开发-超声波测距仪
date: 2017-07-30 20:14:14
tags: CoreBluetooth
---

# iOS 蓝牙开发——超声波测距仪

**写在前面：**本来的计划是做一个 pm2.5 测量仪的，毕竟北京的空气有时很糟糕。去网上找粉尘传感器，发现有 200 多的，有 20 多的。看了眼支付宝余额……默默选择了 20 块钱的。结果到手之后发现精度实在太低了，而且线头又短又软，适合焊接而不是插到面包板上🤦‍♂️只好先改成了超声波测距仪。 Pm2.5 测量……就以后再说吧……

### 硬件电路

这里用了 Arduino 单片机 + 蓝牙 4.0 模块 + 超声波测距模块构成硬件电路，结构比较简单。

![原理图](/img/蓝牙测距/原理图.png)

![photo](/img/蓝牙测距/photo.jpg)

蓝牙和超声波模块 Vcc 接 Arduino 5V 输出。特别要注意超声波模块的工作电压，如果模块本身的工作电压是 5V 却只给 3.3V 的话，会工作异常。二者 GND 接 Arduino GND。

蓝牙模块的 Tx 和 Rx 分别接 Arduino 的 Rx 和 Tx。超声波模块的 Echo 和 Trig 分别接两个 Arduino 的数字输入／输出引脚。

### 超声波测距仪工作原理

超声波具有定向性好的特点，因此可以用来测距。此超声波测距模块需要给予 Trig 脚最少 10 微秒的高电平作为触发信号，之后便会自动发射超声波，并接收反射波。一旦接受到反射回来的声波，便会在 Echo 脚输出一段时间的高电平。该高电平持续时间就是声波的传播时间。因此，测量出超声波的传播时间，再结合已知的声音在空气中的传播速度，就可以算出距离。

此超声波测距模块的工作范围是 4 厘米到 4.5 米，且精度很高，达到毫米级。两次测量最好间隔 60 毫秒以上。

### Arduino 编程

```c
int trigPin = 7;
int echoPin = 8;
unsigned long startTime = 0;
unsigned long endTime = 0; //时间可能会溢出

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(15); //至少给trig引脚10us的高电平
  digitalWrite(trigPin, LOW);

  while(digitalRead(echoPin) == LOW); //等待echo引脚返回高电平

  startTime = micros();
  while(digitalRead(echoPin) == HIGH);
  endTime = micros();

  if(startTime > endTime) {
    //溢出，此次结果作废
    return;
  }

  double deltaTime = endTime - startTime;
  double distance = (deltaTime / 1000000.0 * 340.0) / 2.0; //unit: m

  Serial.println(distance * 100); //unit: cm

  delay(1000);
  
}
```

需要注意的一点是，Arduino 的时间值是从上电到当前的累积，用 long 型保存。因此上电时间过长的话，会产生溢出。虽然这种情况要等待很久才会发生，但最好还是做一个判断。

测量出高电平持续的时间，算出距离后直接写到串口上，蓝牙模块就会自动发送数据了。

### iOS 客户端

源代码已经放在了 [GitLab](https://git.bingyan.net/BeBeBerr/DistanceDetector) 上。

![screenshot1](/img/蓝牙测距/screenshot1.PNG)

上面是测量的过程中，用物体遮挡一段时间的结果。

![screenshot2](/img/蓝牙测距/screenshot2.PNG)

上面是让障碍物先远离，再靠近，最后释放的结果。

每接受到一次新的数据，就会让图标重绘一次，就形成了图表不断变化的效果。

### 附：近期总结

转眼间七月就要过去了，暑假已经过去一大半了。本来计划是 8 月前把算法什么的搞完，8 月能自在些。结果最近突然要学车，再加上又双叒叕生病了……没办法只能往后拖拖了……祝明天科目二考试顺利吧，赶紧学完车能歇歇了。