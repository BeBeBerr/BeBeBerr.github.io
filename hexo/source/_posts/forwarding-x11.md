---
title: X11 Forwarding on macOS
date: 2020-12-24 15:19:57
tags: X11
---

# X11 Forwarding on macOS

通过 VSCode 的 Remote - SSH extension 直接在远程服务器上编写代码是非常方便的，体验和直接在本地开发没有什么区别。但是，当我们想使用 matplotlib 之类的库展示图片的时候，就需要额外做一些配置了。

## 安装 X11 Window System

新版的 macOS 已经不再直接集成 X11 了，需要自己手动安装。我们可以使用 [XQuartz](https://www.xquartz.org) 这一开源项目，并通过 homebrew 安装：

```bash
brew cask install xquartz
```

重启电脑，输入 `xterm` ，如果弹出 X-terminal，则安装成功了。在 mac 上 `echo $DISPLAY` 显示如下：

```
/private/tmp/com.apple.launchd.UK8U5sVjPZ/org.macosforge.xquartz:0
```

之后可以 ssh 到服务器，随便打开个 GUI 应用验证下：

```bash
ssh -X <username>@<ip> -p <port>
gedit
```

注意服务器也要允许 X11 forwarding，可以在 `/etc/ssh/sshd_config` 中增加 `X11Forwarding yes` 来启用。之后重启下 ssh 守护进程：`sudo service sshd restart` 。

在服务器上 `echo $DISPLAY` ，显示：

```
localhost:10.0
```

## 配置 VSCode

编辑 `~/.ssh/config` 文件，允许 Forward X11:

```bash
Host myHost
  HostName myHost
  ForwardX11 Yes
```

这样就不需要连接 ssh 时手动 `-X` 了。

直接打开 VSCode 的 terminal（本地），会发现 DISPLAY 环境变量是空的。这个时候要开启 VSCode 的如下 setting：

```
terminal.integrated.inheritEnv
```

通过 VSCode 的 SSH - Remote extension，连接到远程服务器。打开 VSCode 的 terminal，会发现远端的 DISPLAY 环境变量也是空的，而如果我们非 VSCode built in 的终端 ssh 到远端，就是没有问题的。因此我们需要手动给 DISPLAY 变量赋值。

编辑 `launch.json` ：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Current File",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal",
            "env": {
                "DISPLAY": "localhost:10.0"
            },
        }
    ]
}
```

这里比较 tricky 的地方在于，由于不是自动配置的，因此我们需要额外保持一个终端通过 ssh 连接着服务器，来保证 X11 forward 的进程是启用的。且这里的 DISPLAY 变量值要保证一致。否则就会得到 connection refused 错误。

## 运行

编写代码，通过 matplotlib 展示图像吧：

```python
plt.imshow(img)
plt.show()
```

注意，这里不要试图将 matplotlib 的 backend 改为 `TkAgg` 等，保持默认即可。

通过 VSCode debug&run 运行程序：

![screenshot](/img/forward-x11/screenshot.png)

成功弹出 X11 窗口🎉，大功告成！

ps：远程打开窗口感觉响应略慢，也可以考虑直接用 imsave 保存下来查看。

## References

[1] https://stackoverflow.com/questions/3453188/matplotlib-display-plot-on-a-remote-machine

[2] https://stackoverflow.com/questions/59063892/is-there-any-way-to-show-figures-in-vscode-remote-ssh-windows

[3] https://github.com/microsoft/vscode-remote-release/issues/267