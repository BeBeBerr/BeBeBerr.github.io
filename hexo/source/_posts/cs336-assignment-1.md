---
title: CS336 Study Note - Assignment1 
date: 2025-10-25 16:31:29
tags: [Deep Learning, LLM]
---

# CS336 Study Note - Assignment 1

Stanford CS336 学习笔记

作业 1 主要涵盖以下几个方面：

1. BPE tokenizer
2. 从头搭一个 Transformer LM，包括要手写 Multi-head attention，RoPE
3. 训练相关的 AdamW 优化器，top-p 采样等

总体来说工作量还是比较大的。我的精力主要放在理解原理和保证代码的正确性上，由于学习时间有限，像性能调优以及跑实验对比参数等就略过了。写完这次作业收获很大，这篇文章用来记录下我当时比较 confused 的点，以及一些 insight。

## BPE

BPE 属于一听原理都懂，但是真的动手写还是有些挑战的。我觉得 BPE 可能是作业 1 里最花时间的一部分了。这个算法整体是这样工作的：

1. 初始化 vocabulary，要把 special token 和 0-255 这种单字节的所有可能值放进去。这样任意的字符串都能编码，即使有 BPE 训练时没见过的表示。比如，用户输入了一个特殊的字符，这个字符在训练集里从未出现过。
2. 把输入的字符串用 unicode encode 成 a list of bytes。注意 unicode 是可变长的编码，一个字符可能占多个字节。
3. special token 永远不能再分割。为了方便，还会做 pre-tokenize，大概就是用一个正则尽量按单词划分。
4. 以 pre-tokenize 分割的“单词”里，每两个 byte 为一组，统计频率。例如 [32, 12, 5] 就要分别统计 (32, 12) 和 (12, 5) 出现的频率。Pre-tokenize 之后就不考虑跨“单词”的 pair 了。分割单词还有个好处，就是可以统计单词词频，然后用单词内 byte pair 的频率乘单词词频就能统计全文的 byte pair 频率，提高效率。
5. 选择频率最高的 byte pair，如果有相同的，按字典序 break tie。讲这个合并后的 byte pair 作为新的 vocab，并赋予 token id。把全文中所有出现该 pair 的地方用心的 token 替代。例如 [32, 12, 5] 中，假设 (32, 12) 被替换成了 258，那就变成 [258, 5]。
6. 重复这个过程。过程中，vocabulary 会逐渐增多，直到达到 vocab_size 的 limit 后停止。
7. 保存 vocabulary （即 bytes -> token id），以及 merge 的顺序。保存顺序是为了 encode 的时候能按照训练时同样的顺序合并。否则，假如 (32, 12) 和 (12, 5) 都在 vocab 里，[32, 12, 5] 应该先合并哪个呢？答案是，如果训练的时候 (12, 5) 先合并的，encode 的时候也应该先合并 (12, 5)。

### Byte Level Pair?

顾名思义，我一开始认为所有的 pair 都是在 byte level 操作的。这个命名有点误导性。真正操作应该是在 token (id) level 的。

假设输入的字符串转化成 byte 是 [32, 12, 5]。我们有一个 special token EOS。那么，我们可以这样初始化：

| Bytes                                  | Token ID |
| -------------------------------------- | -------- |
| EOS （special token 是不可分割的整体） | 0        |
| 0 （单 byte，value 是 0）              | 1        |
| 1                                      | 2        |
| ...                                    | ...      |

那转化成 token，就应该是 [33, 13, 6]，注意这里就是 token ID 了，也就是我们可能会看到 [1000, 5000, 2] 这样的 list。然后所有的 merge 和替换，应该都在 token level 进行。

### Bytes -> ID or ID -> Bytes？

两个方向的映射都需要，可以存一个，推断出另一个。

### 字典序（lexicographically greater pair）

我当时有个疑问，break tie 时用的字典序是应该从 bytes 之间比较，还是转换成 character 再比较？毕竟字典序听起来像是 character 之间的比较。其实应该是 byte 的，毕竟两个 byte pair 都不一定能组成合法的 unicode character。

我觉得 lexicographically order 只是形容排序方法，即先比第一个，再比第二个（像字典的排序），和字符不字符没关系，两个整型数组也能比。

### Yield

如果想要返回一个 iterable，可以用 yield 关键字。这个我平时用的比较少，我的思维还停留在 coroutine 的时候 CPU yield :)

```python
def encode_iterable(self, iterable: Iterable[str]) -> Iterator[int]:
    for chunk in iterable:
        yield from self.encode(chunk)
```

### 性能优化

以下是一些可以用来优化性能的地方（我就没有实现了）。

第一当然是多线程。在统计词频，包括 encode，和替换 merge pair 的时候，都可以分配给多个线程处理再汇总。

在统计频率之后，每次 merge 后并不需要全量再统计一遍新的频率。可以通过 track merge 产生的位置，就可以只更新受影响的词频。其余地方就不用再算一遍了。

维护最大值可以用一个 heap，就像 leetcode 经典的 top-k problems。

Encode 的时候，因为要按照 merges 的顺序合并，而不是简单的 bytes 先后合并，一个朴素的想法是从前往后遍历 merges。但这样很慢。一个更快的实现是，建立一个 merges_rank，即从 merged pair 到它在 merges 数组里位置的映射。rank 越小，优先级越高。之后遍历所有 pair，找到 rank 最小的 pair 合并。使用了这个 trick，本来需要跑几小时的代码几秒钟就完成了。

## Transformer LM

照着公式写 PyTorch 还是比手写 BPE 容易不少的。这里记录一下一些我已经生疏了的用法。

### nn.Parameter

以前我一直不知道 nn.Param 有什么用，感觉直接用 Python 的 class property 不就行了吗，为什么要包一层。毕竟，直接使用也会参与梯度计算。其实有两方面作用：

1. 用 nn.Parameter 包裹后，就自动变成了 named param。在 load_state_dict 之类的时候，变量名就是 key。
2. 会出现在 model.parameters() 里，优化器就可以直接更新它。否则即使有 grad，优化器也不会给它更新。

### Advanced Indexing

当 index 是一个 tensor 的时候，就会触发 advanced indexing。普通的索引只能找连续的切片。

比如在实现 Embedding class 的时候就能用到。Embedding 的 weight 其实是一个 (vocab_size, embedding_dim) 的 tensor。这里 embedding_dim 也就是 d_model。说白了，就是给一个 token id，返回一个 d_model size 的 embedding vector 的字典。当输入是 batch_size 乘 seq_length 个 token id 的时候，我们不需要写循环一个一个的取 embedding，而是用 advanced indexing 就可以批量取出来。

```python
class Embedding(torch.nn.Module):
    def __init__(self, num_embeddings, embedding_dim, device=None, dtype=None):
        super().__init__()
        weight = torch.zeros((num_embeddings, embedding_dim), device=device, dtype=dtype)
        torch.nn.init.trunc_normal_(weight, mean=0, std=1, a=-3, b=3)
        self.weight = torch.nn.Parameter(weight)

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        out = self.weight[token_ids] # advanced indexing
        return out
```

### Numerical Stability

这个其实还蛮重要的。如果不用上一些 trick 保证 numerical stable，那么可能产生 NaN 或者 INF。我还在实现 temperature scaled softmax 的时候忘记使用 trick，导致 CUDA 崩溃，报错：

```
CUDA error: device-side assert triggered
```

找了半天发现是因为算 softmax 时不稳定导致的。这个还挺难 debug 的。

总结下来，这个作业里有两处要注意，一个时 softmax，一个是 sigmoid，都有一些 trick 来让数值更稳定。

### Softmax

为什么 softmax 运算要用 exp，而不是直接用线性归一化呢？有以下三个原因：

1. logits 可能有负数，出现负概率就不对了。用 exp 可以把数值都缩放到 0 至正无穷。
2. exp 的导数简单，梯度平滑，方便训练。
3. 指数能放大差距，让大的数占据主导（所以叫 soft-max）。

### RoPE

由于 attention 操作是位置无关的，所以需要引入位置编码来引入 token 的位置信息，因为显然“我爱你”和“你爱我”的含义是非常不同的。为什么 self attention 是位置无关的呢？我们看它的公式：
$$
Attention(Q, K, V) = softmax(\frac{Q^TK}{\sqrt{d_k}})V
$$
注意这里 QKV 都是 (..., seq_len, d_model) 维度的。假设输入是 [x1, x2, x3]，输出是 [y1, y2, y3]，那么如果交换 x1, x3 的位置，得到的 y1' 和 y3' 实际上是没变的，只是位置跟着做了同样的改变，即输入变为 [x3, x2, x1] 输出变为 [y3, y2, y1]。换句话说，这是 permutation equivalent 的操作。即 token 之间注意力的相对大小没有改变，这不符合直觉。

举例来说，“我打你很痛”，和“你打我很痛”，前者应该的”你“和”痛“应该注意力很高；后者应该是”我“和”痛“注意力高。如果注意力大小一致的话，模型就感知不到是谁痛这层的信息了。

RoPE 是一种相对位置编码，[这篇文章](https://zhuanlan.zhihu.com/p/667864459)讲解的很好。对位置 i 的高维向量，两两一组做二维旋转变化来赋予位置信息。从公式来看：
$$
R_k^i = 
\begin{bmatrix}
cos(\theta_k^i) & -sin(\theta_k^i) \\
sin(\theta_k^i) & cos(\theta_k^i)
\end{bmatrix}
$$
可以看到，旋转的角度即取决于该向量在 sequence 里的位置 i，又取决于维度 k。这样可以让模型获得多尺度的位置感知能力，从而学会在不同的维度上学习不同的东西。在低维度，旋转变化慢，适合学长距离关系；在高维度，旋转快，适合学短距离关系。

为什么说是相对位置编码呢？因为考虑两个位置的向量，一个旋转了 p 度，另一个旋转了 q 度，他们相对旋转了 p - q 度。对于注意力机制来说，有如下性质（尖括号代表注意力的 dot product 运算）：
$$
\langle R_{\theta_p} q,\, R_{\theta_q} k \rangle = \langle q,\, R_{\theta_{p - q}} k \rangle
$$
在 PyTorch 实现的过程中，我遇到了以下几个有意思的点：

1. 可以利用 `register_buffer` 来把参数添加为模型的一部分，但是不参与优化（不进入 parameters）。虽然不参与优化，但是可以跟随 `.to(device)` 移动，也可以 load_state 时保存。
2. `repeat_interleave` 在构造两两重复的 cos 和 sin 值的时候很实用。
3. 用 `x_for_sin[..., 0::2] = -x[..., 1::2]` 可以间隔地给 x 加上负号。

### Attention

在看 attention 的公式的时候，我产生了一个疑问：QK 的点积是在算相似度，这很好理解，但是为什么要除以根号下 d_k？这是因为 QK 是很多个随机变量的乘积的和。虽然期望为 0，但是方差是 d_k。下面解释为什么方差是 d_k：

我们假设 Q 和 K 里每个元素都是 iid 的，期望为 0，方差为 1。内积 s = QK 的方差为：
$$
Var(s) = E(s^2) - (E(s))^2 = E(s^2)
$$
因为 E(s) 是 0。展开：
$$
E(s^2) = E((\sum q_ik_i)^2)
$$
展开这个多项式的平方，把 E 换到里面，就有：
$$
E((\sum q_ik_i)^2) = \sum_i E((q_ik_i)^2) + \sum_{i \neq j} E(q_ik_iq_jk_j)
$$
因为 iid 且期望为 0，因此第二项为 0。又因为 q 和 k 独立，因此：
$$
E((q_ik_i)^2) = E(q_i^2) \cdot E(k_i^2)
$$
由于 Var(q) = 1，因此有 Var(q) = E(q^2) - E(q)^2 = 1，所以 E(q^2) = 1。那么：
$$
E((q_ik_i)^2) = 1 \\
Var(s) = \sum_i E((q_ik_i)^2) = \sum_{i}^{d_k}1 =  d_k
$$
所以，
$$
Var(\frac{Q^TK}{\sqrt{d_k}}) = (\frac{1}{\sqrt{d_k}})^2 \cdot Var(Q^TK) = \frac{1}{d_k} \cdot d_k = 1
$$
这样，就把整体的方差从 d_k 转化成了 1，避免了数值可能过大的问题，便于优化。

## Training

### Cross Entropy Loss

在 Transformer LM 中，Cross Entropy Loss 的定义如下：
$$
l(\theta; D) = \frac{1}{|D|m} \sum_{x \in D} \sum_{i=1}^{m}-\mathrm{log} p_{\theta}(x_{i+1}|x_{1:i})
$$
其中，D 是训练集，m 是 seq_len，p 代表给定前序的 token，预测下一个 token 的概率，即模型输出的 logits 过 softmax 之后算出的概率。加和求平均值的概念比较好理解，我的疑问是，为什么这就是 cross entropy？

首先回顾下信息论中 entropy 的定义：
$$
H(P) = -\sum_xP(x)\mathrm{log}P(x)
$$
熵用来衡量一个分布的不确定度或信息量，即概率小（惊讶程度越高），熵越大。所以要用每种 x 的可能取值的概率做加权。取 -log 作为信息量的衡量，是因为 log 可以把多个随机变量的概率相乘变成相加，便于计算；而负号让大的概率变成小的信息量。

交叉熵用来衡量两个概率分布的差距：
$$
H(P, Q) = -\sum_{x}P(x)\mathrm{log}Q(x)
$$
其中 P 是真实分布（ground truth），Q 是模型的预测（softmax 概率）。

P 经常是 one-hot 编码，所以只有正确的时候是 1，其他所有 case 都是 0。换句话说，CE loss 只在意正确的分布大小。在我们这里，传入的 targets 是正确的 token id (index)，所以可以用 `torch.gather` 函数收集正确 index 上的 logits 值。

这里也有一些数值稳定性的优化，包括减去最大值，以及 cancel out log 和 exp，等。

### AdamW

AdamW 是一个有状态的优化器，它可以自适应学习率，让每个参数都能独立调节步长。同时还有 weight decay，防止参数过大。这其中涉及到估计梯度的一阶矩 (first moment) 和二阶矩 (second moment)。一阶矩是梯度的期望，即梯度的平均方向，即动量。二阶矩是梯度平方的期望，即波动大小。

在估计一二阶矩的时候，采用的是指数加权平均（EMA）的 online estimation。这是对历史梯度的加权平均，即越近的梯度权重越大，越老的梯度权重呈指数衰减。

### Next Token Prediction

平时总说 LM 就是预测下一个词，这让我之前产生了一个印象，即模型的输入应该是 tokens，如 [x1, x2, x3]，输出应该是下一个 token，即 y = x4。其实这是不对的。模型的输出，是对每一个位置的下一个词的预测。即，模型的输出应该是 [y1, y2, y3]，对应的 ground truth 应该是 [x2, x3, x4]。只不过在 test time，我们只取出最后一个 token 的预测。

那因果性（causality）怎么保证呢？训练时，如果输入输出 pair 是 ([x1, x2, x3], [x2, x3, x4])，模型不是已经提前看到了 x1 的下一个 token 是 x2 了吗？答案是，在 attention 的计算中， 我们传入了 causal mask 来过滤掉未来的 token。

具体来说，在计算 attention 的时候，我们算出来的 attention score 会在违反因果性的地方（mask）被设置成 -inf。这样通过 softmax 之后会变成 0，从而让模型无法在该位置看到后面的信息。再具体一点，每个 token 只能和左侧的 token 算出 attention，和右侧的永远会被重置成 0。

既然 attention 的因果性保证了，那网络的其他部分会不会破坏掉因果性呢？这是不会的。拆解来看，embedding 层，encoding，FFN，RMSNorm，Residual，全部都是在每个位置独立计算的，不会横跨 token；即他们都把 seq_len 维度当作 batch 维度对待。Attention 是唯一一个例外。

## Text Generation

### Decoding & Top-P Sampling

当我们有了一个能 predict next token 的模型，怎么 decode 出文本呢？我的直觉是：这还不简单吗，找到概率最大的 token id，然后查询 vocab 中对应的 bytes 不就好了。这被称为 greedy decoding，是可行的，但是让 model 失去了生成多样性回答的能力。更好的办法是根据概率采样。

Decoding 有两个 trick，第一个是 temperature scaling。其实就是算 softmax 的时候引入一个额外的温度参数。温度高，就把概率的差距改小了，那模型的输出就更随机一些。温度低，就退化成了 one-hot，接近 greedy decoding。

另外就是 top-p 了。原理很简单，就是把概率排序，找到概率最大的几个元素，使他们的概率和不超过 p。之后只在这几个大概率的 token 中采样。







