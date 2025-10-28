---
title: 用概率论分析娘娘们的怀孕概率
date: 2023-05-16 11:39:46
tags: Probability
---

# 用概率论分析娘娘们的怀孕概率

> AI 科普文章系列 —— 贝叶斯定律（Bayes's Theorem）
>
> B 站视频：https://www.bilibili.com/video/BV1Cz4y1b7nN/?spm_id_from=333.337.search-card.all.click

<img src="/img/bayes/chenqie.webp" alt="chenqie" style="zoom:25%;" />

## 故事

皇上坐拥后宫佳丽三千人，人人都想怀上龙裔争宠上位。但是在娘娘们使用各种麝香、药物明争暗斗的过程中，真正能怀孕的概率是较小的。我们不妨假设皇上对嫔妃们雨露均沾，且娘娘们的受孕体质一致，这样每个人的怀孕概率都是一致的，为 1%。太医院赫赫有名的温太医擅长通过号脉的方式来检查娘娘们是否真的怀孕。作为一名老中医，如果某位娘娘真的有孕在身，那么他号出是喜脉的概率为 100%（温大人真的很厉害！）。然而人有失手、马有失蹄，温太医的诊断也有 5% 的假阳率，即有 5% 的概率把没有怀孕的娘娘也错误的判断成喜脉。

今天，甄嬛觉得身体不适，遂请温太医来号脉。如果温太医说：“娘娘这是喜脉啊！”，请问甄嬛怀孕的概率有多高呢？请大家估计一下量级：

- 90% 左右
- 50% 左右
- 10% 左右

## 背景知识

我们快速复习一下概率论中的基本知识。

记 P(A) 为事件 A 发生的概率。例如 P(抛硬币正面朝上) = 50%。在我们的例子中，P(娘娘怀孕) = 1%。

记 P(A | B) 为在事件 B 发生的条件下，事件 A 发生的概率。例如 P(学生很菜｜考试成绩为 C) > P(学生很菜)。在甄嬛传的例子中，P(号出喜脉｜怀孕) = 100%。P(号出喜脉｜没有怀孕) = 5%。

最后，P(A) = P(A | B)P(B) + P(A | not B)P(not B)。这被称为全概率公式。这是因为 B 和非 B 分割了整个样本空间。当然，我们也可以把样本空间分割成更多个互不重叠的小块。

## 贝叶斯定律

在温太医号出喜脉的条件下，娘娘真的怀孕的概率可以记为 P(怀孕｜号出喜脉)。我们可以用贝叶斯定律来求这个概率。贝叶斯定律为：
$$
P(A | B) = \frac{P(B|A)P(A)}{P(B)}
$$
其中，P(A) 和 P(B) 被称为先验概率（prior probability）。可以理解为在没有任何其他信息的时候，我们就已经知道的一些知识。比如在什么都不知道的情况下，某位娘娘的怀孕概率为 1%。

P(A|B) 被称为后验概率（posterior probability）。在给定温太医号出喜脉这个信息后，我们就可以更新娘娘怀孕的概率了。显然这个概率会变得更大一些。

P(B|A) 被称为似然性（likelihood）。它用来描述在证据确凿的情况下，对观测结果的估计。如果给娘娘照了 B 超，发现真的怀孕了，像温太医这样的高手能 100% 地号出喜脉。而一些庸医却只能 50% 地号出喜脉（瞎猜）。我们就可以说温太医号脉具有更高的似然性。

<img src="/img/bayes/haomai.png" alt="haomai" style="zoom:60%;" />

## 计算

我们暂时不谈论贝叶斯定律是如何推导出来的，而是用甄嬛传这个例子来直观地理解一下它的应用。

记温太医号出喜脉这个事件为 +（阳性）。怀孕事件记为 H。没有怀孕则记为 $\bar{H}$。小横杠代表这个事件的逆。

现在我们有 $P(H) = 1\%$，$P(+|H) = 100\%$，以及$P(+|\bar{H})=5\%$。求 $P(H|+)$。

根据贝叶斯定律，我们有：
$$
P(H|+) = \frac{P(+|H)P(H)}{P(+)}
$$
现在唯一未知的部分是 P(+) ，即温太医随便号出喜脉的概率为多大。直观上我们要考虑两种情况，一个是娘娘真的怀孕了，另外一个是娘娘没有怀孕但是被误诊了。那么根据全概率公式：
$$
P(+) = P(+|H)P(H) + P(+|\bar{H})P(\bar{H})
$$
带入上式，可得：
$$
P(H|+) = \frac{P(+|H)P(H)}{P(+|H)P(H) + P(+|\bar{H})P(\bar{H})} \\
= \frac{100\%\times1\%}{100\%\times1\% + 5\% \times 99\%} \\
= \frac{1}{1 + 4.95} \approx 16.7\%
$$
我们发现，即使在温太医这样高超的检测技术下号出喜脉，娘娘真的怀孕的概率也只有不到 20%。这是否符合你之前的估计呢？

## 程序验证

养成动手实践的习惯非常有助于大家学习计算机相关的技术。我们可以编写一个简单的小程序来验证贝叶斯定律是否可靠。注意，这个程序是为了尽量符合直觉，而没有对运行效率做优化。

```python
import random

'''
妃子
属性：是否怀孕
'''
class Lady:
    def __init__(self, is_pregnant=False):
        self.is_pregnant = is_pregnant

'''
太医
属性：号脉的真阳性概率（默认 100%）、假阳性概率（默认 5%）
'''
class Doctor:
    def __init__(self, true_positive=1.0, false_positive=0.05):
        self.true_positive = true_positive
        self.false_positive = false_positive

    '''
    对某位妃子号脉。返回是否为喜脉。
    '''
    def check(self, lady):
        if lady.is_pregnant:
            return random.choices(
                [True, False],
                weights=[self.true_positive, 1 - self.true_positive]
            )[0]
        else:
            return random.choices(
                [True, False],
                weights=[self.false_positive, 1 - self.false_positive]
            )[0]


def run():
    ladies = []
    for _ in range(100000): # 后宫佳丽十万人
        is_pregnant = False
        if random.random() < 0.01: # 1% 的怀孕概率（皇上雨露均沾）
            is_pregnant = True
        ladies.append(Lady(is_pregnant=is_pregnant))

    doc = Doctor() # 温太医

    num_positive = 0 # 验为喜脉的妃子人数
    num_true_pregnant = 0 # 有喜脉的妃子中，真正怀孕的人数

    for lady in ladies:
        result = doc.check(lady) # 挨个号脉
        if result: # 恭喜小主，是喜脉
            num_positive += 1
            if lady.is_pregnant: # 真的怀孕了
                num_true_pregnant += 1

    print('P(Pregnant | Test Positive) = %f%%'
          % (num_true_pregnant / num_positive * 100))


if __name__ == '__main__':
    run()
```

这个程序随机生成十万个娘娘，请温太医来一一号脉。最终程序输出的概率为 16.6% 左右，非常接近我们的理论值。建议大家修改一些参数，亲自运行一下程序并观察实验结果。

## 结语

贝叶斯定律可以帮我们计算后验概率，它告诉我们不仅要在意检测手段的准确率，还要考虑事件本身发生的概率。我们会在接下来学习机器人的状态估计、AI 决策算法中，频繁地见到贝叶斯的身影。
