---
title: func-level-ios-code-coverage
date: 2020-02-02 23:13:51
tags: [LLVM, Code Coverage]
---

# Function Level Code Coverage for iOS

在[之前的博客](http://blog.wangluyuan.cc/2020/01/29/getting-started-to-iOS-code-coverage/)中提到过，如果直接使用 Xcode 集成的代码覆盖率工具，提交 App 的时候似乎会被拒绝。这就导致如果我们想让线上的用户参与覆盖率测试就会受到困难，只能局限在公司内部进行测试。为了解决这个问题，就需要自己实现一套覆盖率检测工具。

## 思路

最简单的想法当时是 hook `msg_send` 函数，但这个思路有一些缺点：

- 只能统计 Obj-C 的方法调用，对 C/C++ 方法无效
- 统计力度只能局限在函数调用级别，而不能精确到每一行代码

所以，最佳方案仍是仿照前人的做法，通过插桩来完成。由于这一套插桩逻辑很复杂，这里为了验证思路，只讨论简化成函数级别的代码覆盖工具的实现。即，统计哪些函数被调用了，哪些函数从未调用。

仿照 GCOV 的逻辑，我们可以编写一个 LLVM Pass。主要分为以下几步：

1. 编译时，统计 iOS 程序中所有的函数名，并保存成 note 文件
2. 编译时，对 iOS 程序中每个函数的开头进行插桩
3. 运行时，由桩代码统计函数执行与否，并生成 data 文件
4. 程序运行结束，比较 data 与 note 文件，得到函数覆盖率报告

## 核心代码实现

在一个简单的 iOS 工程中，在 `ViewController.m` 中定义要插入的 C 函数：

```objc
extern void _mark_executed_func(char *funcName) {
    NSString *string = [NSString stringWithUTF8String:funcName];
    NSLog(@"%@", string);
}
```

这里为了简便起见，只打印外部传入的函数名称。

为了插桩，编写一个 FunctionPass：

```c++
#include "llvm/Pass.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/IR/LegacyPassManager.h"
#include "llvm/Transforms/IPO/PassManagerBuilder.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include "llvm/IR/DebugLoc.h"
#include "llvm/IR/DebugInfo.h"

#include <string>

using namespace llvm;

namespace {
    struct FuncCoverage : public FunctionPass {
        static char ID;
        FuncCoverage() : FunctionPass(ID) {}
        bool runOnFunction(Function &F) override {
            if (F.getName().startswith("_mark_executed_func")) {
                return false; //不能再给桩函数插桩了
            }
            LLVMContext &context = F.getParent()->getContext(); //拿到当前Module的Context
            BasicBlock &bb = F.getEntryBlock();
            
            Instruction *beginInstruction = dyn_cast<Instruction>(bb.begin());
            FunctionType *type = FunctionType::get(Type::getVoidTy(context), {Type::getInt8PtrTy(context)}, false);
            Constant *beginFun = F.getParent()->getFunction("_mark_executed_func");

            if (Function *fun = dyn_cast<Function>(beginFun)) {
                IRBuilder<> Builder(&bb);
                CallInst *inst = CallInst::Create(fun, {Builder.CreateGlobalStringPtr(F.getName())});
                auto SP = F.getSubprogram();
                DebugLoc DL = DebugLoc::get(SP->getScopeLine(), 0, SP);
                inst->setDebugLoc(DL); //设置DebugLoc，给debugger使用
                
                inst->insertBefore(beginInstruction);
            }
            return false;
        }
    };
}

char FuncCoverage::ID = 0;
static RegisterPass<FuncCoverage> X("func-coverage", "A pass that can check function coverage.", false, false);

static RegisterStandardPasses Y(
    PassManagerBuilder::EP_EarlyAsPossible,
    [](const PassManagerBuilder &Builder,
       legacy::PassManagerBase &PM) { PM.add(new FuncCoverage()); });
```

编译，并设置 Xcode 的编译选项，加载我们的 Pass。

这里需要设置 DebugLoc，否则会命中断言报错。这里我卡了比较久：

```
inlinable function call in a function with debug info must have a !dbg location
```

运行这个含有红、蓝两个按钮的程序：

```objc
//...
- (void)onClickRedButton {
    NSLog(@"red");
}

- (void)onClickBlueButton {
    NSLog(@"blue");
}
```

可以看到，每次点击按钮，都会打印出函数名称：

![console](/img/first-llvm-pass/console.png)

证明我们插桩成功了👏

## 缺陷 & 改进

由于我对 LLVM 非常不熟悉、且从未系统学习过编译原理，又找不到什么靠谱的教程，在编写 Pass 的时候可谓困难重重。因此，这个 Demo 仍存在一个重要的缺陷，但解决起来应该不会太难。

Demo 工程虽然能运行，但是比较 tricky。这是因为，在 Pass 中只能 Call 本 Module 的函数，而找不到外部的函数。想要运行，就要借助增量编译。先把整个工程编译一遍（不带 Pass），然后修改带有桩函数的文件，再加入 Pass 只编译此文件，才能完成插桩。要解决这个问题，就要让 IR 代码声明外部函数，这样 linker 才能链接到桩函数。在[这个问答](https://stackoverflow.com/questions/24331498/llvm-insert-function-call-defined-from-another-file)中提到，可以这样做函数声明：

```
You may only call a function from the same Module, and you may not use NULL as the callee.

If the function is defined in another module, you need to first declare it in the module in which you want to make the call, then make the call using the declaration.

To declare it, create an identical function in the new module (via Function::Create) and just don't assign it a body.
```

但由于精力限制，我还未做此尝试。



References:

1. https://www.jianshu.com/p/b2f9efea49c3
2. https://www.jianshu.com/p/4d392b16d831
3. [使用LLVM IR编程](https://richardustc.github.io/2013-06-19-2013-06-19-programming-with-llvm-ir.html)
4. 一个古老的 LLVM 官方教程，版本 2.6，当前最新版本 11: http://releases.llvm.org/2.6/docs/tutorial/JITTutorial1.html