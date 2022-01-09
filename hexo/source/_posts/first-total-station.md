---
title: First Time Using a Total Station
date: 2022-01-08 20:13:36
tags: Robotics
---

# First Time Using a Total Station

全站仪（Total Station）是一种可以用来测量物体到机器角度、距离等数据的仪器。学土木工程或测绘的同学们对它都非常熟悉，但是作为一个 ECE 专业的学生，平时的确没什么机会接触到全站仪，感觉很好玩因此简单记录一下。

## 原理

全站仪通过发射红外激光照射到棱镜上，计算反射回来的光线相位差来得到距离，误差非常小，可达到 0.1mm 的级别。中间黑色的部分是一个望远镜，用来瞄准棱镜。固定之后，可以左右、上下旋转进行瞄准。也可以打出一个红色的激光点来辅助瞄准。底部的支架末端是尖的，在野外测绘时可以插入泥土方便固定。由于我们是在室内，为了防止打滑，因此额外使用了一个底座方便固定。

<img src="/img/first-total-station/total-station.png" alt="total-station" style="zoom:33%;" />

棱镜（prism）用来接收激光，并按相同的光路反射回去。它的底部有一截螺杆，用来固定。棱镜长这样：

<img src="/img/first-total-station/prism.png" alt="prism" style="zoom:50%;" />

## 操作

装上电池开机后，首先调整旋钮，让全站仪水平。之后左右转动仪器，并用旋钮上下转动仪器，通过望远镜的目镜瞄准远处的棱镜。我打开了红色激光来辅助瞄准，因此对准棱镜后能看到强烈的反射光线。

<img src="/img/first-total-station/aim.png" alt="aim" style="zoom:33%;" />

之后按照屏幕提示，点击 Go to work，进入 Total Station Setup 界面。选择 Set orientation （Station is known. Aim at a target to set the orientation）。之后输入原点坐标。这里有一个小技巧是可以把 Northing、Easting 和 Elevation 分别设置为 1000、2000 和 3000，这样后续使用数据时，就能很快反应过来是对应的哪个数据（当作 magic number）。当然设置成全 0 也是没问题的。之后选择棱镜的型号，我用的这款是 Leica Mini 360。

设置完成后，再次点击 Go to work，选择 Survey 进入测绘模式。由于已经对准棱镜，点击 Dist 按钮，机器就会测量出距离、角度等信息。

<img src="/img/first-total-station/distance.png" alt="distance" style="zoom:50%;" />

可以看到，棱镜距离机器的水平距离是 4.9 米。

## 锁定跟踪

全站仪最有意思的地方是它可以锁定并自动跟踪棱镜。左上角的🔒图标表示当前棱镜已锁定，这个时候移动棱镜，机器就会自动旋转追踪。如果离得比较远，即使棱镜的移动速度较快，也不会跟丢（感谢某清华 PhD 友情出镜）。

![tracking](/img/first-total-station/tracking.gif)

## 数据导出

测量的数据可以用 U 盘拷出。也可以将 USB 连接到电脑上实时获取数据，并通过 ROS 以 2hz 的频率发布。这样棱镜安装在机器人上，就可以实时得到机器人的准确位置信息了。

