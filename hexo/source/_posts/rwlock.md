---
title: Readers / Writers Lock
date: 2021-12-26 15:30:38
tags: [C/C++, macOS]
---

# Readers / Writers Lock

在工程实践中，客户端需要从服务端拉取一个配置列表来决定自身的功能表现。几乎所有的 feature 都需要通过 settings 来判断自身的状态，例如是否应该开启本功能（如 A/B Testing），该显示什么样的文案，或是需要打开的 H5 链接是什么。可见，读取 settings 是一个非常高频的操作。在以前的工作中，通过运行 profiling 工具，也确实发现读取 settings 是耗时最久的高频函数。

由于几乎所有的 feature 都需要读取 settings，我们就需要对 settings 加锁来确保线程安全。一个简单的 mutex 就能满足我们对线程安全的需求。然而加锁 / 解锁是比较慢的操作，这是否会有性能提升的空间呢？在实际的场景中，我们知道绝大多数对 settings 的操作都是读取，而写操作（更新 settings）是非常不频繁的。这个时候或许可以考虑使用 Readers / Writers Lock 来优化。

## RW Locks

在 Readers / Writers Problem 中，writer 必须独占资源；而多个 readers 可以同时读取资源。R / W 问题分为两类：

### favors readers

除非有 writer 得到了访问对象的权限，否则所有的 reader 都不应该等待。如果 writer 正在等待，则后来的 reader 应该插到前面。

### favors writers

当一个 writer 就绪时，应该尽可能块地给予它访问对象的权限。后来的 reader 应该等待 writer，即使这个 writer 本身也处于等待状态。

我们知道 settings 的更新本身是对时间不敏感的，所以我们只讨论第一种 favors readers 的 case。

## Using semaphores on macOS

我们在 Linux 上习惯使用 `sem_init` 函数来初始化一个 semaphore。当它的值为 1 时，就可以用作 mutex。然而 macOS 并不支持该函数。当然为了符合 POSIX 标准，`sem_init` 的接口还是存在的，可以通过编译。但是该函数的返回值永远是 -1。如果不注意，就会发现所有的锁都不起作用。

在 macOS 上，我们可以通过 `sem_open` 函数使用 named semaphore，如下：

```c
mutex = sem_open("mutex", O_CREAT, 0777, 1);
```

第一个参数是 semaphore 的名字。该函数返回的是 semaphore 的指针，这点也和 `sem_init` 不同。

另外需要注意的是，我们需要在锁使用完成后将其销毁，否则同名的锁下次就会创建失败，因为系统会认为它已经存在了。我们可以通过 `sem_unlink` 函数来销毁不需要的 semaphore：

```c
sem_unlink("mutex");
```

## Timing function

为了对比不同锁的性能，我们需要对程序运行时间计时。处于简单的考虑，我们可能会直接使用 `clock` 函数。然而需要注意的是，`clock` 返回的是 CPU time，而不是 wall time。在多线程的情况下，使用 CPU time 是错误的。

CPU time 是指 CPU 执行我们的程序所用的时间。在单线程的情况下，它与 wall time 基本一致。在多线程的情况下，假设我们有 4 颗 CPU 核心耗时 1 秒钟执行完任务，那么 CPU time 会是 4，与我们想要的真实时间不一致。

我们可以用 `gettimeofday` 来获取 wall time：

```c
long start, end;
struct timeval timecheck;
gettimeofday(&timecheck, NULL);
start = (long)timecheck.tv_sec * 1000 + (long)timecheck.tv_usec / 1000;
// do something ...
gettimeofday(&timecheck, NULL);
end = (long)timecheck.tv_sec * 1000 + (long)timecheck.tv_usec / 1000;
printf("%ld milliseconds elapsed\n", (end - start));
```

## Implementation

简单实用 mutex 的实现如下：

```c
#include <stdio.h>
#include <pthread/pthread.h>
#include <semaphore.h>
#include <unistd.h>
#include <sys/time.h>

#define NUM_THREAD 40
#define NUM_READ 1
#define NUM_LOOP 50000000

sem_t *mutex;
sem_t *w;
long settings = 0;

void *read_settings(void *arg) {
    for (int i = 0; i < NUM_READ; i++) {
        sem_wait(mutex);
        for (int j = 0; j < NUM_LOOP; j++) {
            settings;
        }
        sem_post(mutex);
    }
}

void *write_settings(void *arg) {
    sem_wait(mutex);
    settings += 1;
    sem_post(mutex);
}

int main() {
    int i;
    pthread_t tid[NUM_THREAD];

    sem_unlink("mutex");
    mutex = sem_open("mutex", O_CREAT, 0777, 1);

    sem_unlink("w");
    w = sem_open("w", O_CREAT, 0777, 1);


    long start, end;
    struct timeval timecheck;
    gettimeofday(&timecheck, NULL);
    start = (long)timecheck.tv_sec * 1000 + (long)timecheck.tv_usec / 1000;

    for (i = 0; i < NUM_THREAD; i++) {
        if (i % 5 == 0) {
            pthread_create(tid + i, NULL, write_settings, NULL);
        } else {
            pthread_create(tid + i, NULL, read_settings, NULL);
        }
    }

    for (i = 0; i < NUM_THREAD; i++) {
        pthread_join(tid[i], NULL);
    }

    gettimeofday(&timecheck, NULL);
    end = (long)timecheck.tv_sec * 1000 + (long)timecheck.tv_usec / 1000;
    printf("%ld milliseconds elapsed\n", (end - start));
  
    return 0;
}
```

我们创建了多个线程，其中读线程比写线程多。使用了一个 int 来模拟要访问的 settings，并用大循环来模拟实际访问资源耗时较久的情况。

读写锁的实现如下：

```c
int read_cnt = 0;

void *read_settings(void *arg) {
    for (int i = 0; i < NUM_READ; i++) {
        sem_wait(mutex);
        read_cnt++;
        if (read_cnt == 1) {
            sem_wait(w);
        }
        sem_post(mutex);

        for (int j = 0; j < NUM_LOOP; j++) {
            settings;
        }

        sem_wait(mutex);
        read_cnt--;
        if (read_cnt == 0) {
            sem_post(w);
        }
        sem_post(mutex);
    }
}

void *write_settings(void *arg) {
    sem_wait(w);
    settings += 1;
    sem_post(w);
}
```

这里是自己实现的读写锁，也可以通过 pthread 内置的 `pthread_rwlock_t` 直接使用。可以看到，由于需要维护 reader 的数量，在 reader 的内部也是使用了 mutex 的。因此使用读写锁只在访问资源耗时较久的情况下才有意义。否则如果访问资源本身速度就很快，读写锁和普通的 mutex 就没有区别了，甚至可能会更慢。

## Experiment results

在 M1 Max 10 核 CPU 的 MacBook Pro 上，分别运行程序多次，求出平均的运行耗时。编译时指定不优化：

```shell
gcc -lpthread -O0 lock.c
```

结果如下：

|          | No lock | Mutex  | R / W lock |
| -------- | ------- | ------ | ---------- |
| **Time** | 126 ms  | 876 ms | 130 ms     |

在这个简单的例子中，读写锁的性能优势明显，与不加锁的理论上界非常接近。

