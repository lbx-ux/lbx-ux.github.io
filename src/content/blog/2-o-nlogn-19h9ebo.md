---
title: 二.认识 O(N log N) 的排序
description: 左神算法第2讲笔记：认识O(NlogN)的排序
pubDate: 2026-08-30
tags: [算法]
source: 算法/2.O(NlogN)的排序.md
---

# 左神算法 第 2 讲笔记：认识 O(N log N) 的排序

> 视频来源：[【一周刷爆LeetCode】算法与数据结构基础到高级全家桶](https://www.bilibili.com/video/BV13g41157hK?p=4)（P4，时长约 2 小时 29 分）
> 讲师：左程云（左神）｜ 代码语言：Java ｜ 整理日期：2026-08-30
> 前置：第 1 讲笔记（复杂度、简单排序、对数器）
>
> 本讲目标：用"分治"和"堆结构"把排序从 O(N²) 打到 **O(N log N)**。三大主角：归并排序、快速排序、堆排序，外加两个归并的经典应用——小和问题、逆序对问题。

---

## 目录

- [一、本讲内容总览](#一本讲内容总览)
- [二、归并排序](#二归并排序)
- [三、归并的应用：小和问题与逆序对](#三归并的应用小和问题与逆序对)
- [四、快速排序：从 1.0 到 3.0](#四快速排序从-10-到-30)
- [五、堆排序](#五堆排序)
- [六、排序算法大总结](#六排序算法大总结)
- [七、易错点与面试考点速记](#七易错点与面试考点速记)

---

## 一、本讲内容总览

```
第2讲知识地图
├── 1. 归并排序 Merge Sort
│     ├── 递归版：process 拆半 + merge 合并，T(N)=2T(N/2)+O(N) → O(N log N)
│     ├── 非递归版：步长 1→2→4→… 直接按块 merge，避开递归
│     └── 应用：小和问题、逆序对问题（"排序顺便统计信息"的套路）
├── 2. 快速排序 Quick Sort
│     ├── 1.0：尾元素当 pivot，分两区 → 最坏 O(N²)
│     ├── 2.0：等于区一次归位 → 仍可能 O(N²)（pivot 选得偏）
│     └── 3.0：随机 pivot + 荷兰国旗三分区 → 期望 O(N log N)
├── 3. 堆排序 Heap Sort
│     ├── 堆 = 完全二叉树 + 数组下标算父子
│     ├── heapInsert 上浮 / heapify 下沉
│     └── 建堆 + 堆顶换末尾 + 缩堆 → O(N log N)，空间 O(1)
└── 4. 总结：稳定性、空间、常数项大对比
```

左神在课上的核心观点：**N² 到 N log N 是"算法结构"的胜利**。简单排序里每个元素都要和"几乎所有"其他元素比一次；而 N log N 的排序都靠某种结构（归并的有序段、快排的 partition、堆）让每次比较"一次排除一大批"。

---

## 二、归并排序

### 2.1 思想：先拆后合（分治）

把数组从中间拆成两半，**先让左右各自有序**（递归），再把两个有序数组合并成一个有序数组（merge）。递归到底（单个元素天然有序）后，merge 一路向上，整体就有序了。

![归并递归树](/covers/2-o-nlogn-19h9ebo/merge_tree.png)

merge 是整个算法的核心：两个有序数组，各拿一个指针，谁小谁先放入辅助数组，某边走完就把另一边剩余整体拷入。

![merge 双指针过程](/covers/2-o-nlogn-19h9ebo/merge_process.png)

### 2.2 递归版代码

```java
public static void mergeSort(int[] arr) {
    if (arr == null || arr.length < 2) {
        return;
    }
    process(arr, 0, arr.length - 1);
}

// 让 arr[L..R] 有序
public static void process(int[] arr, int L, int R) {
    if (L == R) {          // 只有一个数，天然有序
        return;
    }
    int mid = L + ((R - L) >> 1);
    process(arr, L, mid);       // 左半有序
    process(arr, mid + 1, R);   // 右半有序
    merge(arr, L, mid, R);      // 合并两个有序段
}

// 合并 arr[L..mid] 与 arr[mid+1..R] 两个有序段
public static void merge(int[] arr, int L, int mid, int R) {
    int[] help = new int[R - L + 1];      // 辅助数组：额外空间 O(N) 的来源
    int i = 0, p1 = L, p2 = mid + 1;
    while (p1 <= mid && p2 <= R) {
        help[i++] = arr[p1] <= arr[p2] ? arr[p1++] : arr[p2++];
        //          注意 <=：相等时先放左边，这是归并"稳定"的关键
    }
    while (p1 <= mid) {                   // 左边没走完，整体拷入
        help[i++] = arr[p1++];
    }
    while (p2 <= R) {                     // 右边没走完，整体拷入
        help[i++] = arr[p2++];
    }
    for (i = 0; i < help.length; i++) {   // 拷回原数组
        arr[L + i] = help[i];
    }
}
```

### 2.3 复杂度分析（用递归式说话）

每一层递归做三件事：左半、右半、merge。merge 是 O(N)，于是：

```
T(N) = 2·T(N/2) + O(N)
```

递归树共 log N 层，**每层的 merge 总量都是 O(N)**（第 k 层有 2^k 段，每段 N/2^k，乘起来还是 N），所以总时间 **O(N log N)**，且与数据状况无关——最好最坏平均都是。

- 空间复杂度：**O(N)**，就是 help 辅助数组（递归栈 O(log N) 被 O(N) 吸收）。
- 稳定性：**稳定**。merge 里相等时先取左边的（`<=`），左右两半的相对顺序永远不乱。

> 左神提醒：归并是"外排序"思想的祖宗——数据大到内存装不下时，把有序段放磁盘、逐块 merge，就是外部归并。面试不常问，但能体现知识面。

### 2.4 非递归版（步长法）

递归版要压栈，非递归版直接模拟"从底向上的 merge 顺序"：先每 2 个一组 merge（步长 1），再每 4 个一组（步长 2）……步长翻倍直到覆盖全数组。好处是不吃递归栈空间（栈空间降到 O(1)，help 仍 O(N)），也顺手规避了递归深度问题。

```java
public static void mergeSort2(int[] arr) {
    if (arr == null || arr.length < 2) {
        return;
    }
    int n = arr.length;
    int mergeSize = 1;                    // 当前左半的长度（步长）
    while (mergeSize < n) {
        int L = 0;
        while (L < n) {
            if (L + mergeSize >= n) {     // 右边凑不齐一段，不用 merge 了
                break;
            }
            int M = L + mergeSize - 1;    // 左半的最后一个下标
            int R = Math.min(M + mergeSize, n - 1);  // 右半可能不满一段
            merge(arr, L, M, R);
            L = R + 1;                    // 跳到下一组
        }
        if (mergeSize > n / 2) {          // 防溢出：再翻倍就超 n 了，提前退
            break;
        }
        mergeSize <<= 1;                  // 步长翻倍
    }
}
```

两个细节（左神风格，面试爱抠）：

- `if (mergeSize > n / 2) break;`：当 n 接近 `Integer.MAX_VALUE` 时，`mergeSize <<= 1` 会溢出成负数导致死循环，这一行是防溢出的保险。
- 右半不满一段时 `R = min(...)` 截断，merge 函数对任意 `L<=M<R` 都成立，不用特判。

---

## 三、归并的应用：小和问题与逆序对

左神用这两个题展示归并的另一种用法：**排序过程本身就是在"按序比较左右两半"，顺便就能统计跨半的配对信息**。这个套路后面还会反复出现。

### 3.1 小和问题

**定义**：一个数组的小和 = 每个元素**左边**所有比它小的数之和，再全部加起来。例：`[1,3,2,4]` 的小和 = 0 + 1 + 1 + (1+3+2) = **8**。

![小和问题示意](/covers/2-o-nlogn-19h9ebo/small_sum.png)

暴力是 O(N²)。归并思路：**换个角度数**——不看"谁左边有谁"，看"每个数作为较小值，被右边多少个数计入"。在 merge 时，左半的 `arr[p1]` 若小于右半的 `arr[p2]`，由于右半有序，`arr[p2..R]` 全都比 `arr[p1]` 大，即 `arr[p1]` 一次性被右边 `(R - p2 + 1)` 个数计入：

```java
public static int smallSum(int[] arr) {
    if (arr == null || arr.length < 2) {
        return 0;
    }
    return process(arr, 0, arr.length - 1);
}

private static int process(int[] arr, int l, int r) {
    if (l == r) {
        return 0;
    }
    int mid = l + ((r - l) >> 1);
    return process(arr, l, mid)
         + process(arr, mid + 1, r)
         + merge(arr, l, mid, r);          // 三部分累加
}

private static int merge(int[] arr, int l, int mid, int r) {
    int[] help = new int[r - l + 1];
    int i = 0, p1 = l, p2 = mid + 1, res = 0;
    while (p1 <= mid && p2 <= r) {
        // 关键：左边小 → 它比右半 [p2..r] 所有数都小，一次结算一批
        res += arr[p1] < arr[p2] ? arr[p1] * (r - p2 + 1) : 0;
        help[i++] = arr[p1] < arr[p2] ? arr[p1++] : arr[p2++];
        //        注意：相等时先放右边！保证"严格小于"才计数，且不重不漏
    }
    while (p1 <= mid) help[i++] = arr[p1++];
    while (p2 <= r)   help[i++] = arr[p2++];
    for (i = 0; i < help.length; i++) arr[l + i] = help[i];
    return res;
}
```

> 相等时先放**右边**（`arr[p1] < arr[p2]` 不成立就走 p2++），是为了让"左边严格小于右边"的配对恰好被数一次。这个边界是本题最容易写错的地方，用对数器一测便知。

复杂度 O(N log N)。

### 3.2 逆序对问题（LeetCode 剑指 51 / 原题"数组中的逆序对"）

**定义**：左边数比右边数**大**的配对个数。归并解法与小和对偶：merge 时若 `arr[p1] > arr[p2]`，则左半 `[p1..mid]` 全都比 `arr[p2]` 大，一次结算 `(mid - p1 + 1)` 个逆序对。代码结构和小和几乎一样，只改计数那一行。面试时两题一起记，互为镜像。

---

## 四、快速排序：从 1.0 到 3.0

快排是"partition 思想"的极致演化，左神按版本讲，每个版本修上一个版本的缺陷。

### 4.1 快排 1.0：两区 partition

选**最后一个数** `arr[R]` 当 pivot，把 `arr[L..R-1]` 分成 `<= pivot` 和 `> pivot` 两区（一个 `less` 指针维护"<= 区"右边界），pivot 换到两区中间，然后递归左右。

缺陷：pivot 固定选末尾。若数据本身有序，每次 pivot 都是最大值，partition 极度不均，退化成 **O(N²)**。

### 4.2 快排 2.0：等于区一次归位

把"等于 pivot"的所有数一次性放到最终位置（中间区），递归只处理左右。减少了相等元素的重复劳动，但 **pivot 选得偏的问题没解决**，最坏仍 O(N²)。

### 4.3 快排 3.0：随机 pivot + 荷兰国旗

两个升级一起上：

1. **随机选 pivot**：`swap(arr, L + random(R-L+1), R)`，把随机位置的数换到末尾当 pivot。pivot 偏不偏交给运气，**期望**复杂度 O(N log N)（数学上可以证明期望与数据状况无关）。
2. **荷兰国旗 partition**：一次扫描切成 `<`、`=`、`>` 三区，`=` 区直接归位。

![荷兰国旗三区](/covers/2-o-nlogn-19h9ebo/dutch_flag.png)

荷兰国旗规则（pivot = `arr[R]`，`more` 初始指向 R 保护 pivot 不被动）：

- `arr[i] == pivot`：i 右移；
- `arr[i] < pivot`：与 `< 区` 的下一个交换，`< 区` 扩一位，i 右移；
- `arr[i] > pivot`：与 `> 区` 的前一个交换，`> 区` 扩一位，**i 不动**（换过来的数还没看过）。

```java
public static void quickSort(int[] arr) {
    if (arr == null || arr.length < 2) {
        return;
    }
    process(arr, 0, arr.length - 1);
}

public static void process(int[] arr, int L, int R) {
    if (L >= R) {
        return;
    }
    // 随机选 pivot 换到末尾 —— 3.0 的灵魂，把最坏情况的概率变成 0
    swap(arr, L + (int) (Math.random() * (R - L + 1)), R);
    int[] equalArea = netherlandsFlag(arr, L, R);   // 返回 = 区的左右边界
    process(arr, L, equalArea[0] - 1);
    process(arr, equalArea[1] + 1, R);
}

// 荷兰国旗：以 arr[R] 为 pivot，把 arr[L..R] 切成 <、=、> 三区
// 返回 = 区的 [左边界, 右边界]
public static int[] netherlandsFlag(int[] arr, int L, int R) {
    if (L > R) {
        return new int[]{-1, -1};
    }
    if (L == R) {
        return new int[]{L, R};
    }
    int less = L - 1;          // < 区右边界（初始为空）
    int more = R;              // > 区左边界（初始指向 pivot，pivot 先不动）
    int index = L;
    while (index < more) {
        if (arr[index] == arr[R]) {
            index++;
        } else if (arr[index] < arr[R]) {
            swap(arr, ++less, index++);   // 换入 < 区，index 走过的数都看过
        } else {
            swap(arr, --more, index);     // 换入 > 区，换过来的数没看过，index 不动
        }
    }
    swap(arr, more, R);        // pivot 换到 = 区与 > 区之间，归位
    return new int[]{less + 1, more};
}

public static void swap(int[] arr, int i, int j) {
    int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
}
```

**复杂度**：

- 期望时间 **O(N log N)**：随机 pivot 下 partition 期望均衡，递归深度期望 O(log N)。
- 空间 **O(log N)**：递归栈深度（partition 本身 O(1)）。
- **不稳定**：partition 的远距离交换会打乱相等元素顺序（如 `[5,5,3]`，pivot=3 时第一个 5 会被甩到后面）。

> 左神名言式总结：快排 1.0/2.0 的 O(N²) 是"数据能坑你"，3.0 的随机化让"坑"变成小概率事件，**期望复杂度与数据状况无关**。工程上几乎所有语言的内置排序在快排变体上都会做随机化或"三数取中"，就是这个道理。

---

## 五、堆排序

### 5.1 堆结构：完全二叉树 + 数组

**大根堆**：完全二叉树，每个节点的值都 ≥ 其孩子。用数组存时，下标关系：

```
父 i  →  左孩子 2i+1，右孩子 2i+2
孩子 c →  父 (c-1)/2      （整数除法）
```

![堆结构](/covers/2-o-nlogn-19h9ebo/heap_structure.png)

堆只保证"父子"有序，不保证"兄弟"有序——它是"部分有序"结构，所以建堆 O(N)、取最大 O(1)、调整 O(log N)。

### 5.2 两个基本操作：上浮与下沉

**heapInsert（上浮）**：新元素加入堆尾，只要比父大就和父交换，一路向上。

**heapify（下沉）**：堆顶被换走后，新顶与两个孩子比，比**较大的孩子**小就交换，一路向下，直到不违反堆性质。

![heapInsert 与 heapify](/covers/2-o-nlogn-19h9ebo/heap_ops.png)

```java
// 新来的数在 index 位置，向上调整成大根堆
public static void heapInsert(int[] arr, int index) {
    while (arr[index] > arr[(index - 1) / 2]) {   // index=0 时 (0-1)/2=0，自己比自己自动停
        swap(arr, index, (index - 1) / 2);
        index = (index - 1) / 2;
    }
}

// index 位置的数变小了，向下调整；heapSize 是堆当前大小（index 越界即出堆）
public static void heapify(int[] arr, int index, int heapSize) {
    int left = index * 2 + 1;
    while (left < heapSize) {                     // 有孩子才需要比
        // 左右孩子里较大的那个下标
        int largest = left + 1 < heapSize && arr[left + 1] > arr[left]
                      ? left + 1 : left;
        largest = arr[largest] > arr[index] ? largest : index;
        if (largest == index) {                   // 自己最大，不用下沉了
            break;
        }
        swap(arr, largest, index);
        index = largest;
        left = index * 2 + 1;
    }
}
```

### 5.3 堆排序完整代码

思路：整个数组原地建成大根堆 → 堆顶（最大值）与堆的最后一个位置交换 → 堆大小减 1 → 新顶 heapify → 重复，最大值就一个个"沉"到数组末尾。

```java
public static void heapSort(int[] arr) {
    if (arr == null || arr.length < 2) {
        return;
    }
    int heapSize = arr.length;
    // 建堆：从最后一个非叶子往前 heapify，O(N) 建堆（比逐个 heapInsert 的 O(N log N) 快）
    for (int i = arr.length - 1; i >= 0; i--) {
        heapify(arr, i, heapSize);
    }
    // 也可以写成 O(N log N) 建堆：for (int i = 0; i < n; i++) heapInsert(arr, i);
    swap(arr, 0, --heapSize);            // 最大值换到末尾，堆缩小
    while (heapSize > 0) {
        heapify(arr, 0, heapSize);       // 新顶下沉，恢复堆
        swap(arr, 0, --heapSize);        // 当前最大值换到堆尾
    }
}
```

**复杂度**：

- 时间 **O(N log N)**：建堆 O(N) + N 次"换顶 + heapify" 各 O(log N)。
- 空间 **O(1)**：原地调整，这是堆排相对归并的最大优势。
- **不稳定**：堆顶与末尾的远距离交换会打乱相等元素。

> 左神补充：堆结构更大的用途在"动态数据流"——随时 add、随时取最大，这正是优先级队列（Java 的 `PriorityQueue` 默认小根堆）。第 2 讲先会手写堆，后面课程里堆是常客（如 Dijkstra、数据流中位数）。

---

## 六、排序算法大总结

![三大 NlogN 排序对比](/covers/2-o-nlogn-19h9ebo/nlogn_compare.png)

把第 1、2 讲合在一起的完整对比表：

| 排序 | 时间 | 空间 | 稳定性 | 备注 |
|---|---|---|---|---|
| 选择 | O(N²) | O(1) | 不稳定 | 与数据状况无关 |
| 冒泡 | O(N²)（最好 O(N)） | O(1) | 稳定 | 与数据状况有关 |
| 插入 | O(N²)（最好 O(N)） | O(1) | 稳定 | 常数小，高级排序的收尾工具 |
| 归并 | O(N log N) | O(N) | **稳定** | 唯一稳定的 N log N（本课范围内） |
| 快排 3.0 | O(N log N) 期望 | O(log N) | 不稳定 | 常数项最小，工程默认 |
| 堆排 | O(N log N) | **O(1)** | 不稳定 | 空间最优 |

左神在课上抛出的灵魂一问：**有没有时间 O(N log N)、空间 O(1)、还稳定的排序？** 答案是"有，但极复杂"（01 排序/归并的魔改，如内省归并），工程不用；面试若被问到，答"三者不可兼得是已知结论，工程上按需求取舍"即可。这个悬念在第 5 讲（桶排序与排序大总结）会正式收尾——**基于比较的排序下界就是 O(N log N)**，想再快就要放弃比较（计数/基数/桶排序）。

---

## 七、易错点与面试考点速记

| 考点 | 结论 / 提醒 |
|---|---|
| 归并稳定性来源 | merge 相等时先取**左**半（`<=`） |
| 小和相等时 | 先取**右**半，保证严格小于才计数 |
| 归并空间 | O(N)，help 数组；非递归版栈空间 O(1) |
| 非递归归并防溢出 | `if (mergeSize > n / 2) break;` |
| 快排 1.0/2.0 缺陷 | pivot 固定 → 有序数据下 O(N²) |
| 快排 3.0 | 随机 pivot + 荷兰国旗；期望 O(N log N)，空间 O(log N) |
| 荷兰国旗 i 指针 | 换入 > 区后 **i 不动**（换过来的数没检查过） |
| 快排稳定性 | 不稳定 |
| 堆下标公式 | 左 2i+1，右 2i+2，父 (c-1)/2 |
| heapInsert 边界 | index=0 时 (0-1)/2=0，自比自自动停循环 |
| 建堆复杂度 | 从下往上 heapify 是 O(N)，不是 O(N log N) |
| 堆排稳定性 | 不稳定；优势是空间 O(1) |
| 逆序对 | 与小和对偶：`arr[p1] > arr[p2]` 时结算 `mid - p1 + 1` |

**下一讲预告**（P5）：桶排序以及排序内容大总结——计数排序、基数排序，和"基于比较的排序下界 O(N log N)"的正式结论。

---

*笔记完。老规矩：三种排序 + 小和，先默写再挂对数器，全绿才算会。*
