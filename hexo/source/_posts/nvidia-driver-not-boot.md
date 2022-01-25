---
title: Ubuntu Won't Boot With Nvidia Driver Installed
date: 2022-01-25 10:22:18
tags: [Linux]
---

# Ubuntu Won't Boot With Nvidia Driver Installed 

I recently got a new Alienware M15 R6 gaming laptop computer from my lab. After installing Ubuntu (dual boot with Windows), the next thing to do is to utilize its RTX 3080 GPU by installing Nvidia drivers. The problem was with Nvidia drivers installed, the whole system won't boot up. It just shows a black screen with some system prompt text and stuck.

## How to fix

By pressing `ctrl+alt+F2` I can enter TTY2 and use the command-line interface. I can also use the recovery mode to operate my computer. I have to run `sudo apt-get purge nvidia*` to remove all Nvidia drivers so that my computer can boot again. But this means I can't run PyTorch or any other software using CUDA. It's a big waste of the 3080 graphic card!

At first, I thought the driver was not installed properly. Then I realized the driver was working because I can use the `nvidia-smi` command in the command-line mode. The problem is the XServer. If I use `startx` command and try to start the XServer in the command line, the whole system will freeze. After some digging, I found there are two Nvidia config files in `/usr/shared/X11/xorg.conf.d` folder. One is `10-nvidia.conf` and the other one is `11-nvidia-prime.conf`, and the `ModulePath` is different! The ModulePath in the nvidia-prime file is definitely wrong, those files and directories do not exist.  I tried to copy files from one path to the other or change the ModulePath parameter, but none of these worked. Finally, I uninstalled `nvidia-prime`, and it worked!

## The backlight problem

Another problem is I cannot adjust the brightness of my screen. I checked the brightness number inside `/sys/class/backlight/nvidia_0`, and it was fine. It turns out Linux does not support Hybrid Graphics. I have to turn off this setting in BIOS.
