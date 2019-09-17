---
title: WiFi监听UDP包
date: 2019-04-22 23:56:33
tags: network
---

# Wi-Fi 监听 UDP 包

最近遇到一个需求，一个被远程控制的小车需要在多个网络中无缝漫游。如果按照我们熟悉的方式，搭建一个 Wi-Fi 网络，小车上的树莓派就可能在网络切换时掉线 1 至 2 秒钟。鉴于小车是被实时远程控制的，我们需要网络切换时间极短，而不同 Wi-Fi 之间的切换速度就不符合要求。

我认为，与其想办法加快在不同网络之间切换的速度，不如干脆不接入任何一个网络了——让树莓派嗅探空气中的所有数据包，并解析出自己需要的包来获取控制信息。不接入网络，自然就不存在基站切换的耗时问题。这相当于在以广播的形式通信。

我也考虑了使用其他的通信方式，比如蓝牙、Zigbee 等，最终还是更加倾向于 Wi-Fi。

## 网络架构

多台树莓派充当 AP，通过 UDP 协议广播数据。小车车载树莓派监听所有数据包，并筛选自己需要的数据。这需要车载树莓派进入 monitor mode。普通的 managed mode 下，网卡会过滤掉目的地址不是自身的包。由于我们不希望小车接入网络，所以在这种模式下就收不到包了。monitor mode 不同于 promiscuous mode（混杂模式），它不需要和 AP 建立连接（太好了）。

## 硬件

不是所有的无线网卡都支持 monitor mode。Raspberry Pi 3 B+ 板载网卡就默认不支持，因此需要额外购买合适的网卡。但社区也提供了支持 monitor mode 的布丁 [nexmon](https://github.com/seemoo-lab/nexmon) 。

## 进入 monitor mode

```
$ sudo ifconfig <your interface> down
$ sudo iwconfig <your interface> mode monitor
$ sudo ifconfig <your interface> up
$ sudo iwconfig <your interface> channel <your channel number>
```

这里，需要指定网卡工作的频率。虽然 Wi-Fi 信道有重叠，但最好还是要和路由器的工作频率匹配。比如，我就设置路由器（或者其他作为 AP 的树莓派）的工作信道设置成了 channel 5 。当然，如果许多热点在同时工作，则最好工作在不同的频段防止干扰，再不断切换车载 Wi-Fi 频道。虽然 Wi-Fi 有载波监听、冲突避免等机制，但仍会大幅降低传输效率。

Wi-Fi 最好不要设置密码——否则数据包会被加密，如何解包又是一个问题。

如果使用 Wireshark 抓包，则要在 Wireshark 里面也勾选上 monitor mode。

## 捕捉 UDP 数据包

和 Wireshark 一样，我们要使用 libpcap 来抓包。libpcap 有一个 python 的封装 [pcapy](https://github.com/helpsystems/pcapy) ，这样编写 python 代码就更方便了。

```python
#!/usr/bin/env python

import sys
import pcapy
import socket
from struct import *

def parse_packet(packet):
    wifi_length = 0x32 //【1】

    if len(packet) < wifi_length:
        return None

    wifi_protocol = packet[0x30 : wifi_length] 
    
    wifi_protocol = unpack('!h' , wifi_protocol) //【2】
    wifi_protocol = wifi_protocol[0]
    
    # ip protocol
    if wifi_protocol == 0x0800:
        ip_header = packet[wifi_length : 20+wifi_length]
        iph = unpack('!BBHHHBBH4s4s', ip_header)
        version_ihl = iph[0]
        version = version_ihl >> 4
        ihl = version_ihl & 0xF


        iph_length = ihl * 4

        protocol = iph[6]
        s_addr = socket.inet_ntoa(iph[8])
        d_addr = socket.inet_ntoa(iph[9])

        #udp
        if protocol == 17:
            u = iph_length + wifi_length
            udph_length = 8
            udp_header = packet[u : u+8]

            udph = unpack('!HHHH' , udp_header)
            source_port = udph[0]
            dest_port = udph[1]
            length = udph[2]
            checksum = udph[3]

            h_size = wifi_length + iph_length + udph_length
            data_size = len(packet) - h_size
			
						#get data from the packet
            data = packet[h_size:]

            print("Data: ") + data

          
pcap = pcapy.open_live("wlx000f00906ff3", 65536, 1, 0) //【3】

while (1):
    (header, packet) = pcap.next()
    parse_packet(packet)
```

【1】802.11 协议比较复杂，事实上，在 IP 层外不止封装了一层。通过 Wireshark 捕捉 UDP 包可以看到格式，这里我直接把 IPv4 协议上层封装全作为一层处理了。

【2】`unpack` 函数可以把一个字符串（python 里字符数组亦被用来存储原始二进制数据，毕竟一个 char 正好对应一个字节）按照格式解析，并返回一个元组。最前面的感叹号代表网络字节序。网络字节序是大字节序，和我们  x86 上常见的小字节序相反，要特别小心。从大字节序转换成小字节序可以用 `ntohs` 函数，当然也可以自己反转。

【3】wlx000f00906ff3 是我的网卡 interface 的名字。

## 测试

编写一个 shell 脚本来测试程序是否能抓到 UDP 包：

```shell
for i in {1..1000}
do 
	echo -n "hello world!" | ncat -u 192.168.1.255 8080
done

```

使用 ncat 来向广播地址发送简单的 UDP 包。当然这里不一定是广播地址，毕竟什么包都能抓到……

我测试时，主机通过以太网连接无线路由器，主机未接入无线局域网，但是程序可以通过无线网卡抓到包。使用另一台树莓派作为 AP 发送 UDP 包，同样可以抓到。

## Alternate Choice

也可以考虑简历一个虚拟网卡，让小车同时接入两个网络。这样在发生切换时，保证另一个网络仍是畅通的。如果 Wi-Fi 网络不加密，建立连接的速度也会比较快。