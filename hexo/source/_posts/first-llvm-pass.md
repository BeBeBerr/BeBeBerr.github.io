---
title: Writing the Very First LLVM Pass
date: 2020-01-27 23:46:40
tags: LLVM
---

# Writing the Very First LLVM Pass

这篇文章记录了编写第一个 LLVM Pass 的过程，主要跟随 LLVM 官方的 [Hello Pass](http://llvm.org/docs/WritingAnLLVMPass.html) 教程。

## 编译 LLVM

虽然 Pass 最终会被 opt 动态链接，但是我们仍需要编译 LLVM 来获得开发环境。具体编译过程可以参考[之前的博客](http://blog.wangluyuan.cc/2019/04/27/LLVM循环优化/)。

## 编写第一个 Pass

由于 Hello Pass 已经内置在 LLVM 的工程中了，所以这里我换了个名字叫 MyPass。首先进入 `llvm/lib/Transforms` 新建一个文件夹 `MyPass` ，并 cd 进入。

新建 `CMakeLists.txt` 和 `MyPass.cpp` 文件。将以下内容输入 CMakeLists 文件：

```cmake
add_llvm_library( LLVMMyPass MODULE
  MyPass.cpp
  
  PLUGIN_TOOL
  opt
)
```

并在 `llvm/lib/Transforms/CMakeLists.txt` 文件最后添加 `add_subdirectory(MyPass)` 。

在 `MyPass.cpp` 中编写第一个 Pass 的代码：除了打印出函数的名称之外，什么也不做。

```c++
#include "llvm/Pass.h"
#include "llvm/IR/Function.h"
#include "llvm/Support/raw_ostream.h"

#include "llvm/IR/LegacyPassManager.h"
#include "llvm/Transforms/IPO/PassManagerBuilder.h"

using namespace llvm;

namespace {
    struct MyPass : public FunctionPass {
        static char ID; //给 LLVM 用于识别 Pass
        MyPass() : FunctionPass(ID) {} //构造函数
        bool runOnFunction(Function &F) override {
            errs() << "Hello: ";
            errs().write_escaped(F.getName()) << '\n';
            return false;
        }
    };
}

char MyPass::ID = 0;
static RegisterPass<MyPass> X("hello", "my pass", false, false);

static RegisterStandardPasses Y(
    PassManagerBuilder::EP_EarlyAsPossible,
    [](const PassManagerBuilder &Builder,
       legacy::PassManagerBase &PM) { PM.add(new MyPass()); });
```
## 编译 Pass

回到一开始编译 LLVM 的 `build` 文件夹，编译新建的 Pass。由于我之前是用的 `ninja` 来编译的 LLVM，所以这里仍然只需要 `ninja` 一下就可以了。编译会很快完成。之后进入 `build/lib` 文件夹，可以看到新编译出来的 `LLVMMyPass.dylib` 文件（如果在 Linux 下会是 `.so`）。

## 运行

找个自己喜欢的地方随便写一点代码，我在这里写了个 `hello.c` ：

```c
int main() {
        printf("Hello world!\n");
        return 0;
}
```

之后编译出 IR 代码：

```shell
clang hello.c -O0 -S -emit-llvm -o hello.ll
```

然后就可以用 `load` 命令将编译出来的 Pass 载入 opt。由于我是在自己的文件夹中安装的编译好的 LLVM，没有配置环境变量，所以使用了绝对路径：

```shell
~/Documents/LLVM/install/bin/opt -load ~/Documents/LLVM/llvm-project/build/lib/LLVMMyPass.dylib -hello hello.ll > /dev/null
```

这里的 `-hello` 即之前代码中 RegisterPass 中传入的参数。

控制台打印出：

```shell
Hello: main
```

可见，这个用于打印函数名称的 Pass 正确的运行起来了。

## 集成到 Xcode

首先到 Build Settings 中的 `User-Defined` 中，添加 `CC` 和 `CXX` ，指明是用我们自己编译的 clang 来编译程序：

```shell
/Users/wangluyuan/Documents/LLVM/install/bin/clang
```

之后在 Apple Clang - Custom Compiler Flags 中，设置 Other C Flags 和 Other C++ Flags，load 我们的 pass：

```shell
-Xclang -load -Xclang /Users/wangluyuan/Documents/LLVM/llvm-project/build/lib/LLVMMyPass.dylib
```

这是除了刚才通过 opt 运行 Pass 之外的第二种运行 Pass 的方式。

这个时候会报错 unknown argument: -index-store-path，需要将 Build Settings 中的 Enable Index-While-Building 设置为 No。

此时编译程序，就可以看到我们的输出了！

![output](/img/first-llvm-pass/output.png)

可以看到我们的 Pass 输出了 AppDelegate 中的几个方法名称 👏