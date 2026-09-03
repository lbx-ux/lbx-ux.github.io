---
title: 五.二叉树
description: 左神算法第5讲笔记：二叉树
pubDate: 2026-08-30
series: 左神算法笔记
order: 5
source: 算法/5.二叉树.md
---

# 左神算法 第 5 讲笔记：二叉树

> 视频来源：[【一周刷爆LeetCode】算法与数据结构基础到高级全家桶](https://www.bilibili.com/video/BV13g41157hK?p=7)（P7，时长约 2 小时 24 分）
> 讲师：左程云（左神）｜ 代码语言：Java ｜ 整理日期：2026-08-30
> 前置：第 1–4 讲笔记
>
> 本讲目标：二叉树全家桶。核心武器两个——**递归序**（一切递归遍历的祖宗）和**递归套路/信息整合**（向左子树、右子树要信息，拼出答案）。覆盖：三种递归/非递归遍历、层序与最大宽度、序列化、四大判定（搜索/完全/满/平衡）、后继节点，以及三道递归套路题（最大距离、最大快乐值、最低公共祖先）。

---

## 目录

- [一、本讲内容总览](#一本讲内容总览)
- [二、递归序与三种递归遍历](#二递归序与三种递归遍历)
- [三、非递归遍历：用栈模拟](#三非递归遍历用栈模拟)
- [四、层序遍历与最大宽度](#四层序遍历与最大宽度)
- [五、序列化与反序列化](#五序列化与反序列化)
- [六、四大判定：搜索、完全、满、平衡](#六四大判定搜索完全满平衡)
- [七、后继节点](#七后继节点)
- [八、递归套路一：二叉树的最大距离](#八递归套路一二叉树的最大距离)
- [九、递归套路二：员工最大快乐值](#九递归套路二员工最大快乐值)
- [十、最低公共祖先](#十最低公共祖先)
- [十一、易错点与面试考点速记](#十一易错点与面试考点速记)

---

## 一、本讲内容总览

```
第5讲知识地图
├── 1. 遍历
│     ├── 递归序：每个节点被访问三次，打印时机 → 先/中/后序
│     ├── 非递归：先序一栈（根、右左入栈）、后序两栈、中序左边界压栈
│     └── 层序：队列；最大宽度（层末指针法 O(1) 额外空间）
├── 2. 序列化：先序 + null 标记（#），反序列化用队列
├── 3. 四大判定
│     ├── 搜索二叉树：中序严格升序
│     ├── 完全二叉树：层序 + 两个 flag
│     ├── 满二叉树：节点数 n = 2^h − 1（递归收集高度+节点数）
│     └── 平衡二叉树：递归收集（是否平衡 + 高度）
├── 4. 后继节点：有右树取右树最左；无右树往上找"当前是父左孩"的父
└── 5. 递归套路（向左/右子树要信息）
      ├── 最大距离：信息 = (子树内最大距离, 高度)
      ├── 最大快乐值：信息 = (头来最大快乐, 头不来最大快乐)
      └── 最低公共祖先：哈希表版 + 递归版
```

左神本讲的方法论升级：**从"写递归"升级到"设计递归信息"**。前两档（遍历、判定）还在用递归序；后三题开始用"可能性分类 + 信息整合"的固定套路，这个套路是后面高级班的基石。

---

## 二、递归序与三种递归遍历

### 2.1 递归序：一个框架生出三种遍历

对任何二叉树做如下递归，每个节点都会被**到达三次**：第一次刚进入、第二次从左子树回来、第三次从右子树回来。

```java
public static void f(Node head) {
    if (head == null) {
        return;
    }
    // 第一次到达 head
    f(head.left);
    // 第二次到达 head
    f(head.right);
    // 第三次到达 head
}
```

![递归序三时刻](/covers/5-1tghh4d/recursive_order.webp)

把"打印"放在三个时刻之一，就得到三种遍历：第一次打印 = **先序**（头左右），第二次 = **中序**（左头右），第三次 = **后序**（左右头）。左神强调：不要背三种遍历的代码，**背递归序，打印位置决定遍历名**。

```java
public static void preOrderRecur(Node head) {
    if (head == null) return;
    System.out.print(head.value + " ");   // 第一次到达
    preOrderRecur(head.left);
    preOrderRecur(head.right);
}

public static void inOrderRecur(Node head) {
    if (head == null) return;
    inOrderRecur(head.left);
    System.out.print(head.value + " ");   // 第二次到达
    inOrderRecur(head.right);
}

public static void postOrderRecur(Node head) {
    if (head == null) return;
    postOrderRecur(head.left);
    postOrderRecur(head.right);
    System.out.print(head.value + " ");   // 第三次到达
}
```

时间 O(N)：每个节点三次到达，共 3N 次操作。

---

## 三、非递归遍历：用栈模拟

面试常问"不递归怎么写"，本质是**用栈手动维护"回来的路"**。

### 3.1 先序：弹-打-压右-压左

```java
public static void preOrderUnRecur(Node head) {
    if (head == null) return;
    Stack<Node> stack = new Stack<>();
    stack.push(head);
    while (!stack.isEmpty()) {
        head = stack.pop();
        System.out.print(head.value + " ");  // 弹谁打谁 = 头先
        if (head.right != null) stack.push(head.right);  // 右先压，后弹
        if (head.left != null) stack.push(head.left);    // 左后压，先弹
    }
}
```

栈是后进先出，所以"右左"入栈保证"左右"出栈，配合"弹即打印"得到 头→左→右。

### 3.2 后序：两栈版（先序的镜像）

先序是"头左右"。若改成"头右左"（入栈顺序换成左右），得到的是后序"左右头"的**逆序**，用第二个栈收集再倒出即可。

```java
public static void postOrderUnRecur(Node head) {
    if (head == null) return;
    Stack<Node> s1 = new Stack<>(), s2 = new Stack<>();
    s1.push(head);
    while (!s1.isEmpty()) {
        head = s1.pop();
        s2.push(head);                       // 收集"头右左"
        if (head.left != null) s1.push(head.left);   // 左先压 → 右先弹
        if (head.right != null) s1.push(head.right);
    }
    while (!s2.isEmpty()) {
        System.out.print(s2.pop().value + " ");      // 倒出 = 左右头
    }
}
```

### 3.3 中序：整条左边界压栈

```java
public static void inOrderUnRecur(Node head) {
    if (head == null) return;
    Stack<Node> stack = new Stack<>();
    Node cur = head;
    while (!stack.isEmpty() || cur != null) {
        if (cur != null) {
            stack.push(cur);        // 左边界一路压到底
            cur = cur.left;
        } else {
            cur = stack.pop();      // 没有左了：弹、打、转右
            System.out.print(cur.value + " ");
            cur = cur.right;
        }
    }
}
```

口诀：**左路压尽，弹打转右**。三个非递归版本都 O(N) 时间、O(h) 空间（h 为树高）。

---

## 四、层序遍历与最大宽度

### 4.1 层序：队列

```java
public static void levelOrder(Node head) {
    if (head == null) return;
    Queue<Node> queue = new LinkedList<>();
    queue.add(head);
    while (!queue.isEmpty()) {
        Node cur = queue.poll();
        System.out.print(cur.value + " ");
        if (cur.left != null) queue.add(cur.left);
        if (cur.right != null) queue.add(cur.right);
    }
}
```

### 4.2 最大宽度

**题意**：返回节点数最多的一层有几个节点。

哈希表版：`HashMap<Node, Integer>` 记录每个节点在第几层，出队时按层计数取 max。直观但费空间。

**指针版（O(1) 额外空间）**：维护 `curEnd`（当前层最右节点）和 `nextEnd`（下一层目前见到的最右节点）。出队节点带出孩子更新 `nextEnd`；当出到 `curEnd` 时，本层结束，结算本层宽度，`curEnd = nextEnd`。

```java
public static int maxWidth(Node head) {
    if (head == null) return 0;
    Queue<Node> queue = new LinkedList<>();
    queue.add(head);
    Node curEnd = head, nextEnd = null;
    int curLevelNodes = 0, max = 0;
    while (!queue.isEmpty()) {
        Node cur = queue.poll();
        if (cur.left != null) { queue.add(cur.left); nextEnd = cur.left; }
        if (cur.right != null) { queue.add(cur.right); nextEnd = cur.right; }
        curLevelNodes++;
        if (cur == curEnd) {                 // 本层出完，结算
            max = Math.max(max, curLevelNodes);
            curLevelNodes = 0;
            curEnd = nextEnd;                // 换层
        }
    }
    return max;
}
```

---

## 五、序列化与反序列化

**为什么需要**：内存里的树要存盘/传输，就得变成字符串；读回来再还原成树。左神用**先序 + null 标记**：

- 序列化：先序遍历，空节点记作 `#`，节点间用 `_` 分隔。如 `1_2_#_#_3_#_#`。
- 反序列化：按 `_` 切开入队列，递归取队头建树，遇 `#` 返回 null。

![先序序列化](/covers/5-1tghh4d/serialize.webp)

```java
// 序列化：先序，空记 #，下划线分隔
public static String serialByPre(Node head) {
    if (head == null) {
        return "#_";
    }
    String res = head.value + "_";
    res += serialByPre(head.left);
    res += serialByPre(head.right);
    return res;
}

// 反序列化：队列消费
public static Node deserialByPre(String preStr) {
    String[] values = preStr.split("_");
    Queue<String> queue = new LinkedList<>();
    Collections.addAll(queue, values);
    return recon(queue);
}

private static Node recon(Queue<String> queue) {
    String v = queue.poll();
    if (v.equals("#")) {
        return null;                 // 空节点不占孩子位但消耗一个 token
    }
    Node head = new Node(Integer.valueOf(v));
    head.left = recon(queue);        // 先序：头左右，消费顺序一致
    head.right = recon(queue);
    return head;
}
```

> 为什么必须带 `#`？没有空标记，先序串无法唯一还原树结构（`1_2` 可以是 2 在左也可以在右）。`#` 把"空"也编码进去，结构和值就都定了。按层序列化同理，把 null 也入队即可。

---

## 六、四大判定：搜索、完全、满、平衡

![四种树判定对比](/covers/5-1tghh4d/tree_types.webp)

### 6.1 搜索二叉树（BST）：中序严格升序

定义：每棵子树，左 < 头 < 右。**判定法：中序遍历，看是否严格递增**（出现相等即不是）。

```java
// 非递归中序版判定，preVal 记录上一个打印值
public static boolean isBST(Node head) {
    if (head == null) return true;   // 空树约定为是
    long preVal = Long.MIN_VALUE;    // 用 long 防 Integer.MIN_VALUE 边界
    Stack<Node> stack = new Stack<>();
    Node cur = head;
    while (!stack.isEmpty() || cur != null) {
        if (cur != null) {
            stack.push(cur);
            cur = cur.left;
        } else {
            cur = stack.pop();
            if (cur.value <= preVal) {   // 不严格升序 → 不是 BST
                return false;
            }
            preVal = cur.value;
            cur = cur.right;
        }
    }
    return true;
}
```

> 左神提醒两个坑：① 不要用"左 < 头 && 右 > 头"逐节点局部判断，那是错的（要全局中序升序）；② 递归版要传"上一个值"，用全局变量或数组传参。

### 6.2 完全二叉树：层序 + 两个 flag

定义：除了最后一层，其余层全满，且最后一层节点**靠左连续**。层序判法，两个违规条件：

1. 某节点**有右无左** → 直接不是；
2. 某节点**不满**（缺左或缺右）之后，再出队的节点**必须是叶子**，否则不是。

```java
public static boolean isCBT(Node head) {
    if (head == null) return true;
    Queue<Node> queue = new LinkedList<>();
    queue.add(head);
    boolean leafStage = false;       // 是否已进入"必须全是叶子"阶段
    while (!queue.isEmpty()) {
        Node cur = queue.poll();
        if (leafStage && (cur.left != null || cur.right != null)) {
            return false;            // 违规2：不满之后还有非叶子
        }
        if (cur.left == null && cur.right != null) {
            return false;            // 违规1：有右无左
        }
        if (cur.left != null) queue.add(cur.left);
        if (cur.right != null) queue.add(cur.right);
        if (cur.left == null || cur.right == null) {
            leafStage = true;        // 从第一个不满的节点起，后面必须全叶子
        }
    }
    return true;
}
```

### 6.3 满二叉树：节点数 = 2^h − 1

定义：高 h 的树恰好 2^h − 1 个节点。递归收集两个信息：**高度 h** 和**节点数 n**，最后验 `n == (1 << h) - 1`。

```java
public static class InfoFH {
    int height, nodes;
    InfoFH(int h, int n) { height = h; nodes = n; }
}

public static boolean isFull(Node head) {
    InfoFH info = processFull(head);
    return info.nodes == (1 << info.height) - 1;
}

private static InfoFH processFull(Node x) {
    if (x == null) return new InfoFH(0, 0);
    InfoFH l = processFull(x.left), r = processFull(x.right);
    return new InfoFH(Math.max(l.height, r.height) + 1, l.nodes + r.nodes + 1);
}
```

### 6.4 平衡二叉树：递归收集（是否平衡 + 高度）

定义：每棵子树的左右高度差 ≤ 1。递归信息：`isBal` 和 `height`。

```java
public static class InfoBal {
    boolean isBal;
    int height;
    InfoBal(boolean b, int h) { isBal = b; height = h; }
}

public static boolean isBalanced(Node head) {
    return processBal(head).isBal;
}

private static InfoBal processBal(Node x) {
    if (x == null) return new InfoBal(true, 0);
    InfoBal l = processBal(x.left), r = processBal(x.right);
    int height = Math.max(l.height, r.height) + 1;
    boolean isBal = l.isBal && r.isBal && Math.abs(l.height - r.height) <= 1;
    return new InfoBal(isBal, height);
}
```

> 6.3 和 6.4 是"递归套路"的入门形态：**列出要什么信息 → 写 base → 拼信息**。后面两题是同一套路的加强版。

---

## 七、后继节点

**后继**：中序遍历中某节点的下一个节点。节点结构带 `parent` 指针。两种情况：

1. **有右子树**：后继 = 右子树的**最左**节点；
2. **无右子树**：往上爬，直到"当前节点是父节点的左孩子"，那个父就是后继（爬到头都没有则无后继，即它是整棵树中序最后一个）。

![后继节点两种情况](/covers/5-1tghh4d/successor.webp)

```java
public static class NodeP {
    int value;
    NodeP left, right, parent;
    NodeP(int v) { value = v; }
}

public static NodeP getSuccessorNode(NodeP node) {
    if (node == null) return null;
    if (node.right != null) {              // 情况1：右树最左
        NodeP cur = node.right;
        while (cur.left != null) cur = cur.left;
        return cur;
    }
    NodeP parent = node.parent;            // 情况2：往上找
    while (parent != null && parent.left != node) {
        node = parent;
        parent = parent.parent;
    }
    return parent;                         // 找不到返回 null
}
```

时间 O(h)，h 为树高。前驱节点完全镜像（有左树取左树最右；无左树往上找"当前是父右孩"的父）。

---

## 八、递归套路一：二叉树的最大距离

**题意**：树中两节点间边数的最大值（直径）。

**可能性分类**：对任意子树 x，最大距离要么**不经过 x**（在左子树内或右子树内），要么**经过 x**（左高 + 右高）。所以向左右子树要两个信息：`maxDistance` 和 `height`。

![最大距离递归信息](/covers/5-1tghh4d/max_distance.webp)

```java
public static class InfoDist {
    int maxDistance;   // 子树内的最大距离
    int height;        // 子树高度（节点数口径或边数口径自洽即可，这里用节点数）
    InfoDist(int d, int h) { maxDistance = d; height = h; }
}

public static int maxDistance(Node head) {
    return processDist(head).maxDistance;
}

private static InfoDist processDist(Node x) {
    if (x == null) return new InfoDist(0, 0);
    InfoDist l = processDist(x.left), r = processDist(x.right);
    int height = Math.max(l.height, r.height) + 1;
    int p1 = l.maxDistance;                 // 不经过 x：左树内
    int p2 = r.maxDistance;                 // 不经过 x：右树内
    int p3 = l.height + r.height;           // 经过 x：左高 + 右高（边数口径下恰好）
    return new InfoDist(Math.max(p1, Math.max(p2, p3)), height);
}
```

> 左神套路四步曲：① 假设以 x 为头的子树要答案；② 列可能性（过 x / 不过 x）；③ 由可能性反推需要向孩子要什么信息；④ 写 Info 类 + 递归拼装。所有递归套路题都按这四步想。

---

## 九、递归套路二：员工最大快乐值

**题意**：员工关系是树，派对邀请若干人，**直接上下级不能同时来**，求最大快乐值总和。

**可能性分类**：以 x 为头的子树，x **来**或**不来**：

- x 来：x 的快乐值 + 所有直接下级**不来**的最大值；
- x 不来：所有直接下级**来或不来取较大**之和。

信息：`laiMax`（x 来时子树最大快乐）、`buMax`（x 不来时）。

![最大快乐值递归信息](/covers/5-1tghh4d/max_happy.webp)

```java
public static class Emp {
    int happy;
    List<Emp> nexts = new ArrayList<>();   // 多叉树：直接下级
    Emp(int h) { happy = h; }
}

public static class InfoHappy {
    int laiMax, buMax;
    InfoHappy(int l, int b) { laiMax = l; buMax = b; }
}

public static int maxHappy(Emp head) {
    InfoHappy info = processHappy(head);
    return Math.max(info.laiMax, info.buMax);   // 头来或不来取大
}

private static InfoHappy processHappy(Emp x) {
    int lai = x.happy, bu = 0;
    for (Emp e : x.nexts) {
        InfoHappy sub = processHappy(e);
        lai += sub.buMax;                              // x 来 → 下级必不来
        bu += Math.max(sub.laiMax, sub.buMax);         // x 不来 → 下级随便
    }
    return new InfoHappy(lai, bu);
}
```

（代码里多叉树用孩子列表；二叉树版本同理，把 nexts 换成 left/right。）

---

## 十、最低公共祖先

**题意**：给 o1、o2，返回它们的最低公共祖先（节点可以是自己的祖先）。

### 10.1 哈希表版：先建 parent 映射

先用哈希表记录每个节点的父，再把 o1 的整条祖先链入 set，最后 o2 往上爬，第一个撞进 set 的就是答案。O(N) 空间，但**多次查询可复用 parent 表**。

```java
public static Node lowestAncestor1(Node head, Node o1, Node o2) {
    Map<Node, Node> parentMap = new HashMap<>();
    parentMap.put(head, null);
    fillParent(head, parentMap);                 // 递归或层序填表
    Set<Node> set = new HashSet<>();
    Node cur = o1;
    while (cur != null) {                        // o1 的祖先链入 set
        set.add(cur);
        cur = parentMap.get(cur);
    }
    cur = o2;
    while (!set.contains(cur)) {                 // o2 上爬找第一个交点
        cur = parentMap.get(cur);
    }
    return cur;
}
```

### 10.2 递归版：O(1) 额外空间

```java
public static Node lowestAncestor2(Node head, Node o1, Node o2) {
    if (head == null || head == o1 || head == o2) {
        return head;        // 遇到 o1/o2 直接上交，它可能是答案
    }
    Node left = lowestAncestor2(head.left, o1, o2);
    Node right = lowestAncestor2(head.right, o1, o2);
    if (left != null && right != null) {
        return head;        // 左右各捞到一个 → head 就是最低公共祖先
    }
    return left != null ? left : right;   // 只捞到一个：上交（它要么是 LCA 要么是 o1/o2 之一）
}
```

> 递归版为什么对"o1 是 o2 祖先"也正确？o1 先被上交，o2 在 o1 子树里根本不会被另一侧看到，最终上交的就是 o1 本身——正好是答案。

---

## 十一、易错点与面试考点速记

| 考点 | 结论 / 提醒 |
|---|---|
| 递归序 | 每节点到三次；打印时机定先/中/后序 |
| 先序非递归 | 弹打、压右、压左 |
| 后序非递归 | 两栈：s1 出"头右左"，s2 倒出 |
| 中序非递归 | 左边界压尽，弹打转右 |
| 最大宽度 | 层末指针法：curEnd / nextEnd |
| 序列化 | 必须带 `#` 空标记，否则结构不唯一 |
| BST 判定 | 中序**严格**升序；局部"左<头<右"是错的 |
| 完全二叉树 | 有右无左 → 否；不满之后必须全叶子 |
| 满二叉树 | n == 2^h − 1 |
| 平衡二叉树 | 信息 = (isBal, height)，高度差 ≤ 1 |
| 后继 | 有右树 → 右树最左；无右树 → 上找"我是父左孩" |
| 最大距离 | 信息 = (maxDistance, height)；过 x = 左高+右高 |
| 最大快乐值 | 信息 = (lai, bu)；来→下级不来，不来→下级取大 |
| LCA 递归版 | 左右都非空 → head；否则上交非空侧 |
| 递归套路四步 | 要答案 → 列可能性 → 反推信息 → Info 类拼装 |

**下一讲预告**（P8）：图——BFS/DFS、拓扑排序、并查集、Kruskal/Prim/Dijkstra 三大最小生成树/最短路算法登场。

---

*笔记完。老规矩：三种非递归遍历、层序宽度、四大判定、最大距离，先默写再挂对数器，全绿才算会。*
