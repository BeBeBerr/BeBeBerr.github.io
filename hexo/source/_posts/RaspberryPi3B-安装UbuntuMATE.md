---
title: Raspberry Pi 3B+ 安装 Ubuntu MATE
date: 2019-02-09 00:02:07
tags: RaspberryPi
---

# Raspberry Pi 3B+ 安装 Ubuntu MATE

在实验室当 Undergraduate Researcher，需要多个树莓派和主机之间互相通信，果断考虑使用 ROS。采购时，本着电子产品买新不买旧的原则，选择了树莓派 3B+ 型号。Ubuntu 下安装 ROS 较为方便，于是打算安装 Ubuntu MATE 作为操作系统。没想到，Ubuntu Mate 竟然还没有官方支持最新的 Pi 3B+。好在最后经过一番折腾，最终还是安装成功了。

## 第一步 烧录 Ubuntu MATE

先前往 Ubuntu MATE 官网 https://ubuntu-mate.org/download/ 下载镜像。

下载完毕后，安装 `ddrescue` 工具并拷贝镜像到 SD 卡：

```shell
sudo apt-get install gddrescue xz-utils
unxz ubuntu-mate-16.04.2-desktop-armhf-raspberry-pi.img.xz
sudo ddrescue -D --force ubuntu-mate-16.04.2-desktop-armhf-raspberry-pi.img /dev/sdx
```

注意，这里的 `sdx` 需要被替换成你的 SD 卡文件。使用 `lsblk` 命令可以看到所有块设备的信息，以及他们的依赖关系。一般根据 SD 卡的容量就可以看出那个文件是 SD 卡了。当然用 Linux 自带的设备管理程序也可以看到。比如，在我实际操作过程中，我的 SD 卡在 `/dev/sdb` 下。

经过漫长的等待，就可以看到镜像已经烧录成功了。SD 卡被分成了两个区，BOOT 和 ROOT。

## 第二步 更改 boot loader

由于 Raspberry Pi 3B+ 把处理器换成了 Cortex-A53 (ARMv8)，如果这个时候直接把 SD 卡插入树莓派，是 boot 不起来的。表现为树莓派红灯闪烁，绿灯不亮，接上显示器只有彩虹屏。

解决方法是，下载最新的树莓派固件：https://github.com/raspberrypi/firmware

把 SD 卡中 Boot 区所有文件替换成该固件 boot 文件夹的内容。把 Root 区 lib/modules 下所有文件替换成该固件 modules 文件夹的内容。GUI 界面下拖拽文件可能无效，因为是只读权限。可以命令行下在 sudo 权限下复制文件。

插入 SD 卡，树莓派已经可以运行 Ubuntu MATE 了。但是还没结束……

## 第三步 Wifi 怎么办

Ubuntu 下，似乎直接在 boot 分区里增加 `wpa_config` 文件配置 Wifi 无效。所以还是要给树莓派接上鼠标、键盘、显示器来操作。但是，内置的 Wifi 不工作，怀疑是这个版本的 Ubuntu MATE 的 Wifi 驱动不支持新的树莓派。现在我的临时解决方案是给树莓派接上了一个 USB 的无线网卡。

## 第四步 扩展存储空间

Ubuntu MATE 的默认文件系统空间很小，远远没有占满整个 SD 卡。我们需要 resize file system。

```shell
sudo fdisk /dev/mmcblk0
```

出现 fdisk 的界面后，依次输入 `d` `2` `n` `p` `2` ，然后按两次空的回车，然后输入 `w` 。然后 reboot。

重启完成后，

```shell
sudo resize2fs /dev/mmcblk0p2
```

现在，文件系统已经是整个 SD 卡的大小了。

## 第五步 设置自动登录

如果不设置自动登录，每次树莓派上电后会卡在输入密码的页面，连接不上 Wifi。在 `/usr/share/lightdm/lightdm.conf.d/60-lightdm-gtk-greeter.conf` 文件里增加一行：

```shell
autologin-user=yourUserName
```

就可以自动登录了。

现在打开 SSH 服务，就可以愉快的玩耍树莓派了。如果需要配置静态 IP 地址，去路由器的 LAN 设置中，给树莓派的 MAC 地址分配一个固定 IP 就可以了。毕竟使用 DHCP 不能保证树莓派的 IP 永远不变，这在实验室里会造成麻烦。

## 总结

可以看到给 3B+ 安装 Ubuntu MATE 还是比较麻烦的。如果没有安装 ROS 的需求，还是建议安装 Raspbian。或者如果没有特别高的性能要求，购买老款的树莓派也会省事不少。关于内置 Wifi 不可用的问题，我还在继续寻找解决方案。



## 更新

现在已经解决无法使用内置 WiFi 的问题。将 Raspbian 下面的 `/lib/firmware/brcm` 文件夹替换过来。