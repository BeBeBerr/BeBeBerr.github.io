---
title: Use GitHub Actions to Deploy Hexo Articles
date: 2020-03-08 12:30:59
tags: GitHub
---

# Use GitHub Actions to Deploy Hexo Articles

*This article is used to test GitHub Actions*

## 背景

GitHub 前不久推出了用于 CI/CD 的 GitHub Actions，所有公共仓库都可以免费使用。不仅提供 Window，Linux （Ubuntu），macOS 三大操作系统，每个 VM 还配有双核处理器、7 GB RAM 和 14 GB 的 SSD 硬盘。可以说是非常香了。

我的博客使用 Hexo 撰写。此前，为了方便多台设备之间同步我的博客环境，我已经将 Hexo 源文件单独放置在了 hexo 分支下的 `BeBeBerr.github.io/hexo` 目录中。这样切换编写博客的设备时，只需要 pull 下来最新的源文件就好了。编写完成之后，自然是 `clean generate deploy` 一串操作。既然有了 GitHub Actions，就可以将部署的操作自动化了。

目标是：博客撰写完成，push 到远程仓库后自动部署。

## 配置 GitHub Actions

首先修改 Hexo 的 `_config.yml` 文件，将 `deploy.repo` 改成

```shell
git@github.com:BeBeBerr/BeBeBerr.github.io.git
```

的 SSH 形式，不再使用之前的 HTTP。

之后，执行

```shell
ssh-keygen -f github-deploy-key
```

生成 SSH Key。公钥填到仓库设置的 Deploy Keys 中，记得勾选写权限。

由于 Actions 也是公开的，所以私钥绝对不能直接写到配置文件里。GitHub 在仓库的设置中提供了 secrets 项，可以将环境变量加密，只对指定的 Actions 开放。

密钥配置完成后，就可以新建 Action 的配置了。如下：

```yaml
name: Hexo-Deploy-CI

on:
  push:
    branches: [ hexo ] # 在 hexo 分支发生 push 的时候触发

jobs: # jobs 默认是并行的
  build_and_deploy:
    runs-on: ubuntu-latest

    steps: # steps 之间是串行的
    - name: Checkout
      uses: actions/checkout@v2 # actions 是 GitHub 官方仓库，提供了一些基础的 Actions。这里的作用是把仓库 checkout 出来，后面就可以访问了
      with:
        ref: hexo # 当然是 checkout hexo 分支

    - name: Setup Node.js Env
      uses: actions/setup-node@v1 # 类似的，这个 action 用于设置 node.js 环境

    - name: Config SSH Key & Git
      env:
        SSH_KEY: ${{ secrets.hexo_deploy_ssh_key }} # 通过环境变量获取私钥
      run: |
        mkdir -p ~/.ssh/
        touch "~/.ssh/known_hosts"
        echo "$SSH_KEY" | tr -d '\r' > ~/.ssh/id_rsa
        chmod 700 ~/.ssh
        chmod 600 ~/.ssh/deploy_key
        chmod 600 ~/.ssh/known_hosts
        ssh-keyscan github.com >> ~/.ssh/known_hosts
        git config --global user.name 'wangluyuan'
        git config --global user.email 'mail@luyuan.wang'
    
    - name: Setup Hexo Env
      run: |
        npm i -g hexo-cli
    
    - name: Deploy
      run: |
        cd hexo
        npm i
        hexo clean
        hexo g
        hexo d
```

配置完成，push 之后 action 就会被触发了。虽然每次都不得不重新配置一遍 node 和 Hexo 环境，但是整体速度非常让人满意：一般 30 秒内就能运行完毕。

现在，撰写博客就更加方便了。