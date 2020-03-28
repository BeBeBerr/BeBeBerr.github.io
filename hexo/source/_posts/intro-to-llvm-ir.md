---
title: Intro to LLVM IR
date: 2020-03-28 22:43:41
tags: LLVM
---

# Intro to LLVM IR

本文介绍 LLVM IR 的基本语法和结构。了解 LLVM IR 语法，对使用 LLVM 编译器也非常有帮助。

## 生成 IR 代码

首先我们写一个最基本的 C 文件：

```c
int sum(int a, int b) {
	return a + b;
}
```

简单的不能再简单了。然后，把它编译成 IR 代码：

```shell
clang sum.c -emit-llvm -S -c -o sum.ll
```

这样就得到了编译后的 IR 代码：

```ir
; ModuleID = 'sum.c'
source_filename = "sum.c"
target datalayout = "e-m:o-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-apple-macosx10.15.0"

; Function Attrs: noinline nounwind optnone ssp uwtable
define i32 @sum(i32, i32) #0 {
  %3 = alloca i32, align 4
  %4 = alloca i32, align 4
  store i32 %0, i32* %3, align 4
  store i32 %1, i32* %4, align 4
  %5 = load i32, i32* %3, align 4
  %6 = load i32, i32* %4, align 4
  %7 = add nsw i32 %5, %6
  ret i32 %7
}

attributes #0 = { noinline nounwind optnone ssp uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "darwin-stkchk-strong-link" "disable-tail-calls"="false" "frame-pointer"="all" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "probe-stack"="___chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="penryn" "target-features"="+cx16,+cx8,+fxsr,+mmx,+sahf,+sse,+sse2,+sse3,+sse4.1,+ssse3,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 2, !"SDK Version", [3 x i32] [i32 10, i32 15, i32 4]}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{i32 7, !"PIC Level", i32 2}
!3 = !{!"Apple clang version 11.0.3 (clang-1103.0.32.29)"}
```

## 语法简介

分号 `;` 表示注释。

整个 LLVM 文件是一个 LLVM 模块（module）。模块是 LLVM 最顶层的数据结构，每个模块包含一系列的函数，每个函数包含一系列的基本块（Basic Block，BB），每个 BB 包含一系列的指令。此外，模块还包括一系列用于支撑它的一系列外围实体，比如全局变量，外部函数，以及目标数据布局等。

### 目标数据布局

最上方的 target datalayout 和 target triple 描述了目标机器的字节序、类型大小等信息，如指针位宽、首选对齐方式等。

### 函数声明

```ir
define i32 @sum(i32, i32) #0 {
```

函数的生命和 C 语言语法类似。此函数具有一个 i32 类型的返回值。iN 表示任意大小的整数，比如 i32，i64 和 i128 。浮点数类型有 double 和 float。向量的格式如 \<4 x i32> 表示包含 4 个 i32 类型元素的向量。

全局标识符使用 @，如这里的函数名 @sum。

这个函数有两个 i32 类型的入参。

\#0 记号映射到一组函数属性，被定义在文件的末尾：

```ir
attributes #0 = { noinline nounwind optnone ssp......
```

这些函数属性类似于 C/C++ 中的属性。例如，nounwind 表示函数未抛出异常，ssp（stack smash protector）表示使用栈粉碎保护器来防止攻击，提升安全性。

### 局部变量

IR 中的局部变量和寄存器的作用类似，以 % 开头，名称任意，甚至可以用纯数字。例如：

```ir
%add = add nsw i32 %0, %1
```

与一般的汇编语言寄存器不同，LLVM 使用静态单赋值（SSA）。在这种形势下，每个变量只能被赋值一次，不可被重复赋值。因此每个变量的值都可以立刻追溯到唯一一条指令。使用 SSA 导致 use-def chain 的生成变得简单，有利于编译器的设计。

此外，LLVM 对局部变量的最大数量没有限制。我们可以理解成有无穷多个寄存器。

### 基本块

我在前面的博客中已经介绍过基本块的概念。在 LLVM 中，每个 BB 都会有一个标签。如果省略了标签，汇编器会自动添加上一个。

每个 BB 都需要一个结束符指令结尾，比如跳转到另一个 BB 或事函数返回。

第一个 BB 是入口基本块，不能作为任何分支指令的目标。

在 sum 文件中，只有一个基本块。函数中没有明确给出标签，但是以 ret 结束。

### 常见指令

下面以上述代码为例，介绍常见的几个指令。

```ir
%3 = alloca i32, align 4
%4 = alloca i32, align 4
```

`alloca` 指令在当前执行的函数栈上分配内存，函数返回到调用者时会自动释放内存。此指令的返回值是一个指针。这里，分配了 i32 类型大小的空间，按 4 字节对齐。

```ir
store i32 %0, i32* %3, align 4
store i32 %1, i32* %4, align 4
```

`store` 指令有两个参数，一个是要被存储的值，另一个是存储的地址。格式是：

```
store [volatile] <ty> <value>, <ty>* <pointer>
```

这里，%0 和 %1 的值就分别被存储到刚刚分配出来的内存上了。

```ir
%5 = load i32, i32* %3, align 4
%6 = load i32, i32* %4, align 4
```

`load` 指令可以从内存中读数据。它需要一个类型和一个地址。这里，%3 和 %4 对应的地址上的值被读出来，放进了 %5 和 %6 中。

```ir
%7 = add nsw i32 %5, %6
```

`add` 指令的结构为：

```
<result> = add <ty> <op1>, <op2>
```

nsw 是 no signed wrap 的缩写，类似的还有 nuw，no unsigned wrap，表示已知不会溢出，因此允许进行一些优化。

最后，函数返回 %7 。

我们可以看到，中间的 store，load 操作完全是多余的，我们可以直接给参数相加，返回结果。这是因为 clang 默认使用 -O0 优化，即无优化。如果使用优化器，则会得到更简洁的代码。

### Metadata

文件最后方以 exclamation point（!）开头的部分是 metadata。LLVM 通过使用 metadata 来向优化器和代码生成器传递更多的信息。



References:

http://llvm.org/docs/LangRef.html