---
title: Intro to CocoaPods
date: 2020-10-06 23:23:33
tags: [iOS, CocoaPods]
---

# Intro to CocoaPods

就像 JavaScript 的 NPM，Python 的 pip，Java 的 Gradle，甚至 Ubuntu 的 apt-get 一样，我们在使用 Xcode 开发软件时也需要使用包管理工具。CocoaPods 就是这样的一款用 Ruby 编写第三方库依赖管理工具，每个 iOS Developer 都不会对它感到陌生。

作为一个优秀的工程师，我们除了要掌握 `pod install` ，`pod update` 这些命令的使用方法之外，对工具背后运行的原理有个简单的了解也是必要的。这样能帮助我们定位问题，以及在工具的基础上拓展出更适合我们的工具链。

## CocoaPods 基本结构

如前面所说，CocoaPods 使用 Ruby 开发的。Ruby 工程同样也有自己的包管理工具：RubyGems。其中一个叫做 Bundler 的 Gem 会解析 Gemfile 文件来管理依赖和版本。是的，作为一个包管理工具，CocoaPods 也是用包管理工具构建的。其中的几个核心的 Gem 为：

### [CocoaPods/Specs](https://github.com/CocoaPods/Specs)

用来保管第三方库的 Podspec 文件。当我们执行 `pod install` 等命令时，CocoaPods 就会去这里寻找组件指定版本的 Podspec 文件。

### [CocoaPods/CocoaPods](https://github.com/CocoaPods/CocoaPods)

这个 Gem 是面向用户的，当我们使用 pod 命令操作 CocoaPods 时，这个组件会被激活，并调用其他的 Gem 来最终完成操作。

### [CocoaPods/Core](https://github.com/CocoaPods/Core)

给 CocoaPods 提供基础支持，比如解析 Podfile、Podspec 文件等。

### [CocoaPods/Xcodeproj](https://github.com/CocoaPods/Xcodeproj)

允许我们通过 Ruby 来操作 Xcode 工程配置，例如 `.xcworkspace` 、`.xcconfig` 等。

在字节跳动，我们也有一些其他的 Gem 来拓展额外的能力，比如 [CocoaPods-BDTransform](https://www.rubydoc.info/gems/cocoapods-BDTransform/6.0.0)。这个工具由组件平台的同学开发，用来在无需重新 `pod install` 的情况下转换组件的源码模式、二进制模式、开发模式。

## 初探 Podfile

即使是刚刚入门 iOS 的开发者，也很容易编写出这样的 Podfile：

```ruby
source 'https://github.com/CocoaPods/Specs.git'

platform :ios, '9.0'
inhibit_all_warnings!

target 'MyApp' do
  pod 'GoogleAnalytics', '~> 3.1'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    puts target.name
  end
end
```

这样的 DSL 看起来非常简洁清晰，但其实，Podfile 就是一个标准的 Ruby 文件！能做到看起来不像是代码，而像是纯粹的描述文件，是利用了 Ruby 的一些语言特性。

## Ruby 简介

### eval

Ruby 作为一门脚本语言，提供了 `eval` 方法来直接执行字符串形式的代码。它模糊了数据与代码的边界，提供了非常强的动态化能力。这让 CocoaPods 可以直接执行 Podfile 文件，获取其中的信息。可以想像，假如 Objective-C 也能直接 eval，那客户端程序员就再也不用发版了😊。

### 方法调用

Ruby 中调用方法时，小括号是可选的。也就是说，下面的两种写法语法上都是正确的：

```ruby
puts 'hello'
puts('world')
```

也就是说，Podfile 中的 `source 'xxx.git'` 、`target xxxx` 其实都是在调用不同的方法而已。Ruby 还允许方法名以问好或感叹号结尾，`inhibit_all_warnings!` 其实也就是调用了一个普通的函数。

### Block

Ruby 通过 block 来支持函数式编程。在一切皆对象的 Ruby 中，block 自然也是一个对象，支持作为参数传递。我们可以通过 `yield` 语句来调用传入的 block。一个接收 block 作为参数的函数如下：

```ruby
def doSomeThing
  yield if block_given?
end

doSomeThing do
  puts 'hello world'
end
```

`do-end` 语句也可以替换成大括号：

```ruby
doSomeThing {
  puts 'world hello'
}
```

由于 block 也是对象（Proc 类的实例），因此也可以显式的写成函数的参数：

```ruby
def doSomeThing(&block)
  block.call
end

doSomeThing {
  puts 'hello world'
}
```

Block 也可以接收参数，用两个竖线包裹起来参数名称就可以了：

```ruby
def printSomeThing
  yield 'hello!'
end

printSomeThing do |someThing|
  puts someThing
end
```

这样看起来就更像其他的语言了。Ruby 优雅是真的优雅，奇怪也确实有点奇怪...

回头看 Podfile，我们其实是向 `target` 和 `post_install` 函数中分别传入了一个 block 作为参数。

### Symbols

Ruby 中还有一个语法现象叫做 Symbol。它很像一个字符串，也可以和字符串互相转换，但它在运行时不可改变。Symbols 还有个好处是比较是否相等的复杂度是 O(1)。使用冒号就可以创造出一个符号：

```ruby
x = :my_str
y = :my_str
```

这里两个变量将指向同一个内存区域。如果是字符串，则将会创造出两个字符串。我们经常利用 Symbols 来当作枚举值使用。

Podfile 中，我们向 `platform` 函数传递的第一个参数 `:ios`，就是一个 Symbol。

## pod install 过程

那么，在我们执行 `pod install` 命令之后，CocoaPods 都会执行些什么呢？

我们找到 `install.rb` 文件，看一下源码：

```ruby
module Pod
  class Command
    class Install < Command
      #......
      def run
        verify_podfile_exists!
        installer = installer_for_config
        installer.repo_update = repo_update?(:default => false)
        installer.update = false
        installer.deployment = @deployment
        installer.clean_install = @clean_install
        installer.install!
      end
    end
  end
end
```

可以看到，首先 CocoaPods 调用 `installer_for_config` 方法，获取到了一个 installer 实例。把 `update` 属性设置为 false 以和 `pod update` 命令区分。即，`pod update` 会无视`Podfile.lock` 文件，重新分析依赖。最后，调用了 installer 的 `install!` 方法。

先看第一个方法：

```ruby
def installer_for_config
  Installer.new(config.sandbox, config.podfile, config.lockfile)
end

def podfile
  @podfile ||= Podfile.from_file(podfile_path) if podfile_path
end
```

`config.podfile` 方法就开始分析 Podfile 了。在 CocoaPods/Core 中，可以找到 `from_file` 方法的定义：

```ruby
def self.from_file(path)
  case path.extname
  when '', '.podfile', '.rb'
    Podfile.from_ruby(path)
  when '.yaml'
    Podfile.from_yaml(path)
  else
    raise Informative, "Unsupported Podfile format `#{path}`."
  end
end
```

一般我们的 Podfile 都没有添加后缀，因此会进入到 `from_ruby` 方法中。

```ruby
 def self.from_ruby(path, contents = nil)
  contents ||= File.open(path, 'r:utf-8', &:read)
  podfile = Podfile.new(path) do
      eval(contents, nil, path.to_s)
  end
  podfile
end
```

毫不意外，CocoaPods 会直接 `eval` Podfile 的文件内容。Podfile 中的那些“配置项”，则定义在 `podfile/dsl.rb` 文件中。我们来看下最熟悉的 `pod` 方法（例如：`pod 'GoogleAnalytics', '~> 3.1'`）：

```ruby
def pod(name = nil, *requirements)
    unless name
      raise StandardError, 'A dependency requires a name.'
    end

    current_target_definition.store_pod(name, *requirements)
end

def store_pod(name, *requirements)
    get_hash_value('dependencies', []) << pod
    nil
end
```

它会把一个 pod 存入到 `dependencies` 数组中。

接下来，我们再看一下 `install!` 方法都做了什么。

```ruby
def install!
  prepare
  resolve_dependencies
  download_dependencies
  validate_targets
  if installation_options.skip_pods_project_generation?
    show_skip_pods_project_generation_message
  else
    integrate
  end
  write_lockfiles
  perform_post_install_actions
end
```

在 install 的时候，会执行以下几个核心操作：

- 依赖决议，分析 Podfile、Podfile.lock、Manifest.lock 文件。Podfile.lock 文件记录了 pod install 后的依赖信息，Manifest.lock 文件记录了当前已经安装的依赖信息。如果正确 install 成功，两个文件的内容应该是一致的。
- 下载依赖。根据决议后的依赖版本进行下载。
- 校验生成的 target 是否合法。
- 生成 Pods 工程，并把依赖集成进去。

在 `resolve_dependencies` 中，CocoaPods 使用了一个叫做 `Molinillo` 的依赖解析算法。为什么需要解析依赖关系呢？想象一下，我们的主工程可能依赖 A、B 两个 pod；其中，A 又依赖 C、D；B 依赖 C、E，而它们之间可能依赖的版本还不一样。可以看到，实际的依赖关系会非常复杂，CocoaPods 必须把依赖关系分析清楚，才能知道具体要下载哪些 pod。

这里不具体介绍 [Molinillo](https://github.com/CocoaPods/Molinillo/blob/master/ARCHITECTURE.md) 的具体实现方式，只需要知道它会输入一个依赖列表，并将它转换成依赖图（一个合法的依赖关系图应该是一个有向无环图）。这个算法本身没有什么问题，是非常高效的。然而，当出现了循环依赖，或是版本号控制不严格的时候，就会造成频繁的入栈、出栈，造成解析速度的直线飙升，使 pod install 操作变得非常缓慢，达到小时级。大型项目中通常将依赖关系拍平，统一放在壳工程的 Podfile 中，再 hook 掉这个过程，从而完全跳过依赖解析。

## References

[1] [CocoaPods 都做了什么？](https://draveness.me/cocoapods/)

[2] [美团外卖iOS多端复用的推动、支撑与思考](https://tech.meituan.com/2018/06/29/ios-multiterminal-reuse.html)