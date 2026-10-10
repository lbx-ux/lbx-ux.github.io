---
title: 1.java集合
description: java集合本质上分为两大阵营：
pubDate: 2026-10-10
series: Java
order: 1
source: Java/1.java集合
---

## 一、集合

### 1. 分类

java 集合本质上分为两大阵营：

1. **`Collection` 接口**：用于存储**单个**元素的集合。
   - **`List`**：有序、可重复（如 `ArrayList`, `LinkedList`）。
   - **`Set`**：部分无序、不可重复（如 `HashSet`, `TreeSet`）。
   - **`Queue` / `Deque`**：队列，先进先出或双端队列（如 `PriorityQueue`, `ArrayDeque`）。
2. **`Map` 接口**：用于存储**键值对 (Key-Value)** 的映射表。
   - 代表类：`HashMap`, `TreeMap`, `LinkedHashMap`。

各种集合的特点如下

| **集合类型** | **核心代表类**  | **底层数据结构** | **主要特点与适用场景**                                   |
| ------------ | --------------- | ---------------- | -------------------------------------------------------- |
| **List**     | `ArrayList`     | 动态数组         | **查改快，增删慢**。最常用的集合，适合随机访问多的场景。 |
| **List**     | `LinkedList`    | 双向链表         | **增删快，查改慢**。适合头尾频繁插入或删除的场景。       |
| **Set**      | `HashSet`       | 哈希表           | 数据去重首选，元素无序。（本质上是封装了 HashMap）       |
| **Set**      | `LinkedHashSet` | 哈希表           | 有序                                                     |
| **Set**      | `TreeSet`       | 红黑树           | 需要自动对存储元素进行排序的场景。                       |
| **Map**      | `HashMap`       | 数组+链表+红黑树 | 最常用的 K-V 存储，查询速度极快。                        |
| **Map**      | `LinkedHashMap` | 哈希表+双向链表  | 需要保证元素的“插入顺序”或“LRU访问顺序”时使用。          |



### 2. 常用方法

`Collection` 接口是 Java 集合框架（单列集合）的“老祖宗”，`List`、`Set` 和 `Queue` 都继承自它。这就意味着，**只要掌握了 `Collection` 的常用方法，几乎所有的单列集合（如 `ArrayList`, `HashSet` 等）都会用了。**

#### 1. 添加元素 (Add)

| **方法签名**                                | **作用说明**                                                 |
| ------------------------------------------- | ------------------------------------------------------------ |
| `boolean add(E e)`                          | 确保集合包含指定的元素。添加成功返回 `true`。（如果是 `Set` 且元素已存在，则返回 `false`） |
| `boolean addAll(Collection<? extends E> c)` | 将指定集合 `c` 中的所有元素添加到当前集合中。                |

#### 2. 删除元素 (Remove)

| **方法签名**                                    | **作用说明**                                                 |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `boolean remove(Object o)`                      | 从集合中移除**第一个**匹配的指定元素。移除成功返回 `true`。  |
| `boolean removeAll(Collection<?> c)`            | 删除当前集合中，那些也包含在集合 `c` 中的所有元素（求差集）。 |
| `void clear()`                                  | 清空集合，移除所有元素。集合变为空。                         |
| `boolean removeIf(Predicate<? super E> filter)` | **(Java 8+)** 根据条件删除元素。例如删除所有偶数。           |

#### 3. 判断与查询 (Check & Query)

| **方法签名**                           | **作用说明**                                  |
| -------------------------------------- | --------------------------------------------- |
| `int size()`                           | 返回集合中元素的个数。                        |
| `boolean isEmpty()`                    | 判断集合是否为空。为空返回 `true`。           |
| `boolean contains(Object o)`           | 判断集合是否包含指定的元素。包含返回 `true`。 |
| `boolean containsAll(Collection<?> c)` | 判断集合是否包含集合 `c` 中的**所有**元素。   |

#### 4. 转换与流操作 (Convert & Stream)

**集合**是为了让你在业务逻辑中**高效、灵活地处理数据**（增删改查）； **数组**则是为了**底层的性能、传输的通用性以及安全隔离**。

| **方法签名**             | **作用说明**                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `Object[] toArray()`     | 将集合转换成一个 `Object` 类型的数组。                       |
| `<T> T[] toArray(T[] a)` | 将集合转换成指定类型的数组（开发中最常用）。                 |
| `Stream<E> stream()`     | **(Java 8+)** 将集合转换为 Stream 流，用于函数式编程和复杂的数据处理。 |

**第一个方法**是个半成品，返回一堆 `Object`，用起来还得自己强转，容易踩坑。

**第二个方法**是完全体，**“你要什么类型的数组，就传一个什么类型的空数组给它”**（通常传 `new 类型[0]`），它就会乖乖地把集合里的数据打包成你要的数组类型还给你。日常写代码，记住用第二种就可以了！

```java
List<String> list = new ArrayList<>();
list.add("Java");
list.add("Python");

// 返回的只能是 Object[]
Object[] objArray = list.toArray(); 

// ❌ 错误示范：下面这行代码编译不报错，但运行会直接崩溃 (ClassCastException)
// String[] strArray = (String[]) list.toArray(); 

// ✅ 只能这样又笨又费事地用：
String firstElement = (String) objArray[0];
```

```java
List<String> list = new ArrayList<>();
list.add("Java");
list.add("Python");

// ✅ 正确姿势：传入一个长度为 0 的目标类型数组作为“模板”
// Java 发现长度为 0 装不下，会自动帮你创建一个长度为 2 的 String[] 并返回
String[] strArray = list.toArray(new String[0]);

// 此时你拿到的是纯正的 String 数组，可以直接使用了
System.out.println(strArray[0].toUpperCase()); // 输出: JAVA
```



**💻 核心方法代码实战**

新建一个普通的 `ArrayList`，演示上述核心方法的实际效果：

```java
public class CollectionDemo {
    public static void main(String[] args) {
        // 多态写法：左边接口，右边实现类
        Collection<String> list = new ArrayList<>();

        // 1. 增
        list.add("Java");
        list.add("Python");
        list.add("Go");
        
        Collection<String> moreLanguages = Arrays.asList("C++", "Rust");
        list.addAll(moreLanguages); 
        System.out.println(list); // 输出: [Java, Python, Go, C++, Rust]

        // 2. 查
        System.out.println("元素个数: " + list.size()); // 输出: 5
        System.out.println("是否包含Go: " + list.contains("Go")); // 输出: true

        // 3. 删
        list.remove("Python"); // 删除单个
        list.removeIf(s -> s.startsWith("C")); // Java 8: 删除以C开头的元素
        System.out.println(list); // 输出: [Java, Go, Rust]

        // 4. 转数组
        String[] arr = list.toArray(new String[0]);
        
        // 5. 清空
        list.clear();
        System.out.println("清空后是否为空: " + list.isEmpty()); // 输出: true
    }
}
```

> **新手必看的三个避坑指北：**
>
> 1. `Collection` 接口里**没有**通过索引（Index）操作元素的方法（比如 `get(int index)`）。因为 `Set` 是无序的，没有索引概念。索引相关的操作都在它的子接口 `List` 中。
> 2. `Map` 集合（如 HashMap）**不是** `Collection` 的子类！所以 Map 不能直接使用上面这些方法（Map 存的是键值对，用的是 `put`、`get`）。
> 3. 如果在循环遍历集合时需要**删除**元素，千万不要在普通 `for` 循环或 `for-each` 增强循环里直接调用 `collection.remove()`，这会触发 `ConcurrentModificationException` 异常。必须使用迭代器（Iterator）的 `remove()` 方法，或者 Java 8 的 `removeIf()`。



## 二、Collection遍历方式

在 Java 中，遍历 `Collection` 集合主要有 **3 种核心方式**（如果算上 Stream 就是 4 种）。因为 `Collection` 是所有单列集合的顶层接口，所以**下面这些方法通用于所有的 `List` 和 `Set`**。

**💡 为什么没有提到普通 `for` 循环？（新手易踩坑点）**

你可能会想，为什么不用最基础的 `for (int i = 0; i < size; i++)` 呢？

因为 **`Collection` 接口本身并没有提供 `get(int index)` 方法！**

`Collection` 旗下包含了 `Set`（如 `HashSet`），而 `Set` 的底层是哈希表，元素是**无序**的，根本就没有“索引”这个概念。只有 `List`（如 `ArrayList`）才支持通过索引获取元素。因此，传统的 `fori` 循环不属于 `Collection` 的通用遍历方式。



为了直观，我们先准备一个测试集合：

```java
Collection<String> coll = new ArrayList<>();
coll.add("Java");
coll.add("Python");
coll.add("Go");
```

### 1. 迭代器遍历 (Iterator) —— 经典且最安全

迭代器是 Java 早期就存在的基础遍历方式。它就像一个“指针”，一开始指在集合最前面，你叫它往下走一步，它就抓取一个元素出来。

- **最大优势**：**这是唯一一种能在遍历过程中安全删除元素的方式。**
- **适用场景**：需要在遍历时根据条件移除元素。

**代码演示：**

```java
Iterator<String> it = coll.iterator(); // 获取该集合的迭代器对象
while (it.hasNext()) {                 // hasNext() 判断还有没有下一个元素
    String element = it.next();        // next() 获取元素，并将指针向后移动一位
    System.out.println(element);
    
    // 如果你想在遍历时删除元素，必须像下面这样用迭代器的 remove()！
    if (element.equals("Python")) {
        it.remove(); // ✅ 安全删除
    }
}
```



### 2. 增强 for 循环 (for-each) —— 最简单最常用

这是 JDK 5 引入的语法糖，底层其实就是**自动帮你封装了 Iterator（迭代器）**。它的代码极其精简，是日常开发中使用频率最高的方式。

- **最大优势**：语法简洁，可读性极强。
- **致命缺陷**：因为隐藏了迭代器，所以你拿不到迭代器对象，**绝对不能在循环内部去删除或添加元素**，否则会直接抛出 `ConcurrentModificationException`（并发修改异常）。
- **适用场景**：纯粹为了读取和打印数据，不做任何增删操作。

**代码演示：**

```java
// 语法：for (元素类型 变量名 : 集合或数组)
for (String element : coll) {
    System.out.println(element);
    
    // ❌ 错误示范：绝对不要在这里面写 coll.remove(element); 
}
```



### 3. Lambda 表达式遍历 (`forEach` 方法) —— 最优雅

JDK 8 结合函数式编程，在 `Iterable` 接口中新增了 `forEach` 默认方法。配合 Lambda 表达式，只需一行代码就能搞定遍历。

- **最大优势**：代码短到极致，非常具有现代编程语言的风格。
- **适用场景**：全量遍历并执行特定操作（如打印、存入数据库等）。

**代码演示：**

```java
// 完整 Lambda 写法
coll.forEach(element -> {
    System.out.println(element);
});

// 因为只有一行代码，可以简写为：
coll.forEach(element -> System.out.println(element));

// 终极极简版（方法引用）：
coll.forEach(System.out::println);
```



### 4. Stream API 遍历 —— 最强大 

如果你不仅想遍历，还想在遍历的过程中做一些“流水线”加工（比如：过滤掉长度小于3的字符串，然后全部转大写，最后打印），那么 Stream 是不二之选。

- **适用场景**：复杂的过滤、转换、数据处理。

**代码演示：**

```java
coll.stream()
    .filter(s -> s.length() > 2) // 过滤操作：只保留长度大于2的
    .forEach(System.out::println); // 遍历输出
```



## 三、List集合

接下来我们学习Collection下面的一个子体系List集合。如下图所示：

<img src="/covers/java-1-java-1tasiz/becb428d3e86de63c360863d65f9ca76.webp" style="zoom:67%;" />

<img src="/covers/java-1-java-1tasiz/b4584234e32136b392ebc96dce8e3faf.webp" style="zoom: 67%;" />

### 1. List集合

因为有了“索引”，`List` 扩充了一些 `Collection` 没有的操作方法：

- `void add(int index, E element)`：在指定的索引位置强行插入元素。
- `E get(int index)`：根据索引抓取元素（最常用）。
- `E set(int index, E element)`：替换指定索引位置的元素。
- `E remove(int index)`：根据索引删除元素。



List集合相比于前面的Collection多了一种可以通过索引遍历的方式，所以List集合遍历方式一共有四种：

```java
List<String> list = new ArrayList<>();
list.add("蜘蛛精");
list.add("至尊宝");
list.add("糖宝宝");
//for索引
for(int i = 0; i< list.size(); i++){
    String e = list.get(i);    
    System.out.println(e);
}
//增强for循环
for(String s : list){    
    System.out.println(s);
}
//迭代器循环
Iterator<String> it = list.iterator();
while(it.hasNext()){
    String s = it.next();    
    System.out.println(s);
}
//Lambda循环
list.forEach(s->System.out.println(s));
```



### 2. ArrayList底层原理

`ArrayList` 是 `List` 接口最著名的实现类，**你在 99% 的业务场景下直接用它就对了**。

**底层原理**：

它的底层就是一个普通的 `Object[]` 数组。但是普通数组长度是定死的，而 `ArrayList` 是“动态”的。当你不断往里面塞数据，数组快装不下的时候，它会在底层偷偷创建一个新的、容量更大的数组（通常是原来的 **1.5倍**），然后把老数据拷贝过去，这就是所谓的**扩容机制**。

1. 利用无参构造器创建的集合，会在底层创建一个默认长度为0的数组
2. 添加第一个元素的时候，底层会创建一个新的长度为10的数组
3. 存满时，会扩容1.5倍
4. 如果一次性添加多个元素，1.5倍还放不下，则新创建的数组以实际数组的长度为标准

**数组扩容，并不是在原数组上扩容（原数组是不可以扩容的），底层是创建一个新数组，然后把原数组中的元素全部复制到新数组中去。**

**优缺点分析**：

- **优点（查改极快）**：因为底层是连续的内存空间（数组），通过索引访问元素的速度极其快（时间复杂度 O(1)，查询任意数据耗时相同）
- **缺点（增删较慢）**：如果你想在数组的中间或者头部插入/删除一个元素，后面的所有元素都必须往后挪或者往前挪，非常耗费性能（时间复杂度 O(N)）。



### 3. LinkedList底层原理

**LinkedList是一个基于“双向链表（Doubly Linked List）”实现的数据结构。** 它没有连续的内存，所有的元素（节点）都是通过“指针”（对象引用）相互牵连起来的。链表结构是由一个一个的节点组成，一个节点由数据值、下一个元素的地址组成。

**优缺点分析**：

- **优点（增删极快）**：如果你想在中间插入一个元素，不需要像 `ArrayList` 那样大动干戈地挪动数据，只需要把相邻两个节点的“绳子”断开，重新绑到新节点上就可以了。
- **缺点（查询极慢）**：因为它没有连续的内存，也没有真正的索引。如果你想找第 10000 个元素，它只能从头节点开始，顺着绳子一个一个往后摸，直到摸到第 10000 个（时间复杂度 O(N)）。
- 对首尾元素进行增删改查的速度是极快的了



**注意**：

- `LinkedList` 没有大小限制，**绝对不会发生扩容操作**，只要内存够，就可以一直往里加。
- 它不仅实现了 `List` 接口，还实现了 `Deque`（双端队列）接口。所以它内置了 `addFirst()`, `addLast()`, `removeFirst()`, `removeLast()`, `push()`, `pop()` 等方法，**极其适合拿来做栈（Stack）或者队列（Queue）使用**。
- 它的每一个节点都需要额外的内存空间去存放 `prev` 和 `next` 两个指针。如果是海量数据，**`LinkedList` 的内存占用会比 `ArrayList` 大得多**，且容易产生内存碎片。



**详解**：

**① 怎么添加元素？（尾插法 `add`）**

当你调用 `list.add("Java")` 时，默认是往链表的末尾追加元素。底层会调用一个叫 `linkLast(E e)` 的方法：

1. 拿着你要存的数据 `"Java"`，造出一个新的 `Node` 车厢。
2. 把新车厢的 `prev` 挂钩，挂到当前的 `last`（老车尾）上。
3. 把老车尾的 `next` 挂钩，连到这个新车厢上。
4. 最后，把 `last` 指针指向这个新车厢（宣布它成为新的车尾）。
5. `size++`。

**性能分析：** 因为有 `last` 指针直接定位车尾，整个操作只需修改几个指针，不需要扩容，不需要移动其他元素，所以**尾部插入的性能是极快的 O(1)**。

**② 怎么查询元素？（折半查找优化 `get`）**

当你调用 `list.get(1000)` 时，因为链表没有索引，它只能顺着节点找。但 Java 的源码工程师在这里做了一个**极其经典的优化 —— 折半查找**。

底层调用的 `node(int index)` 方法原理如下：

```java
Node<E> node(int index) {
    // 假设 size 是 10000，你要找的 index 是 1000
    // 1000 < 5000 (size的一半)，说明靠近车头！
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next; // 从车头往后顺藤摸瓜
        return x;
    } else { 
        // 如果你要找的 index 是 9000，说明靠近车尾！
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev; // 从车尾往前顺藤摸瓜
        return x;
    }
}
```

**性能分析：** 虽然采用了折半查找，最多只需遍历链表一半的长度，但它的时间复杂度依然是 O(N)。这就是为什么说 `LinkedList` 根据索引查询非常慢的原因。

**③ 怎么删除元素？（断开牵连 `remove`）**

假设你要删除链表中间的某个节点 `X`，底层逻辑（`unlink` 方法）非常简单粗暴：

1. 找到节点 `X` 的前驱节点 `A` 和后继节点 `B`。
2. 让 `A` 的 `next` 越过 `X`，直接指向 `B`。
3. 让 `B` 的 `prev` 越过 `X`，直接指向 `A`。
4. 把 `X` 里面的数据和挂钩全清空（置为 `null`），交给垃圾回收器（GC）处理。
5. `size--`。

**性能分析：** “断开并重新连接指针”这个动作本身是极快的 O(1)。**但是！** 如果你调用的是 `remove(int index)`，它必须先调用上面的 `node(index)` 方法把这个节点**找出来**（耗费 O(N)），然后再删除。所以，只有在头尾删除（`removeFirst` / `removeLast`）时，性能才是绝对的 O(1)。



**方法**：

LinkedList集合是基于双向链表实现的，所以相对于ArrayList新增了一些可以针对头尾进行操作的方法：

<img src="/covers/java-1-java-1tasiz/b1bfea4500193e51b85e7bdc49c39bc1.webp" style="zoom:67%;" />



### 4. 对比

| **对比维度**         | **ArrayList (动态数组)**      | **LinkedList (双向链表)**        |
| -------------------- | ----------------------------- | -------------------------------- |
| **内存分配**         | 连续的内存空间                | 零散的内存空间，通过指针连接     |
| **随机查询 (`get`)** | **极快** O(1)                 | **极慢** O(N)，需遍历链表        |
| **尾部插入 (`add`)** | 快 O(1) (偶尔扩容会慢)        | 快 O(1)                          |
| **中间插入/删除**    | **慢** O(N)，需大面积移动数据 | **快** O(1) (仅修改指针)         |
| **空间开销**         | 小（只需预留扩容空间）        | 大（每个节点需额外存储前后指针） |

**💡 资深开发者避坑指南：为什么现在很少用 LinkedList？**

很多教科书上说：“查询多用 ArrayList，增删多用 LinkedList”。**但在现代 Java 开发中，这句话其实并不完全准确。**

1. **CPU 缓存不友好**：现代 CPU 都有高速缓存（Cache）。`ArrayList` 的内存在物理上是连续的，CPU 会把相邻的数据顺手全加载进缓存，遍历速度快到起飞。而 `LinkedList` 的节点散落在内存各处，会导致 CPU 缓存频频失效（Cache Miss），实际遍历性能被 `ArrayList` 吊打。
2. **寻找插入点很慢**：虽然链表“修改指针”的速度是 $O(1)$，但前提是你得先找到那个节点！比如你要在第 1000 个位置插入数据，`LinkedList` 必须先花 $O(N)$ 的时间遍历到第 1000 个节点，然后再执行瞬间的插入。整体算下来，性能往往还不如 `ArrayList` 直接拷贝数组快。
3. **内存占用大**：`LinkedList` 每个节点都要额外存储两个对象引用（前驱和后继），在海量数据下会造成极大的内存浪费和垃圾回收（GC）压力。

**最终结论：** 除非你需要实现**队列（Queue）**、**双端队列（Deque）**，或者明确要在**集合的两端**进行极其频繁的插入和删除操作，否则，**请无脑选择 `ArrayList`**。



## 四、Set系列集合

Set集合是属于Collection体系下的另一个分支，它的特点如下图所示：

<img src="/covers/java-1-java-1tasiz/ccf7a132d179b03795dd9efd92dc765c.webp" style="zoom:67%;" />

<img src="/covers/java-1-java-1tasiz/b6603f1c21d40fbe971563690e59b607.webp" style="zoom:67%;" />

### 1. set集合

**特点**：

- **唯一性（不可重复）**：这是 `Set` 的灵魂。无论你往里面 `add()` 多少次相同的元素，它只会保留一个。添加重复元素时，`add()` 方法会默默返回 `false`，不会报错。
- **无索引（No Index）**：`Set` 里面没有“第几个元素”的概念。因此，它**没有** `get(int index)`、`set(int index, E e)` 这种基于索引的方法。
- **部分无序**：你存进去的顺序，和拿出来的顺序很可能是不一样的（具体取决于实现类）。



### 2. HashSet底层原理

要彻底弄懂 `HashSet` 的原理，你只需要记住一句最核心的结论：**`HashSet` 本质上就是一个披着 `Set` 外衣的 `HashMap`。**

`HashSet` 甚至懒得自己去实现数据结构，它的所有核心功能，都是直接把活儿“外包”给了底层的 `HashMap` 来干。

#### **1. 源码揭秘：HashSet 的底层结构**

如果你按住 `Ctrl` 键点进 `HashSet` 的源码，你会看到这样几行极其关键的代码：

```java
public class HashSet<E> extends AbstractSet<E> implements Set<E>, Cloneable, java.io.Serializable {
    
    // 秘密武器 1：底层真正干活的 HashMap
    private transient HashMap<E,Object> map;

    // 秘密武器 2：一个静态的、毫无意义的 Object 对象（占位符）
    private static final Object PRESENT = new Object();

    // 构造方法：当你 new HashSet() 时，它其实是 new 了一个 HashMap()
    public HashSet() {
        map = new HashMap<>();
    }
    
    // ... 其他代码 ...
}
```

**原理解析：**

1. `HashSet` 内部维护了一个 `HashMap` 成员变量。
2. 因为 `HashMap` 存的是键值对（Key-Value），而 `HashSet` 只需要存单个元素。怎么把单元素塞进键值对里呢？
3. Java 工程师极其聪明：**把你丢给 `HashSet` 的元素，当成 `HashMap` 的 Key 存进去；然后用一个常量 `PRESENT` 作为所有 Key 统一的 Value。**
4. 因为 `HashMap` 的 Key 是天生不可重复的，这就完美实现了 `HashSet` 元素的去重。

#### 2. 核心方法拆解：`add()` 是怎么工作的？

当你调用 `hashSet.add("Java")` 时，底层究竟发生了什么？看看源码：

```java
public boolean add(E e) {
    // 把你要存的元素 e 作为 Key，把固定的 PRESENT 作为 Value 塞进 map 里
    return map.put(e, PRESENT) == null;
}
```

**这行代码的逻辑简直绝妙，我们来拆解一下：**

- `map.put(key, value)` 方法是有返回值的。
  - 如果你存的是一个**全新**的 Key，`put` 方法会成功把数据放进去，并返回 `null`。
  - 如果你存的是一个**已经存在**的 Key，`put` 方法会把旧的 Value 覆盖，并返回那个**被覆盖的旧 Value**。
- 在 `HashSet` 里，Value 永远是 `PRESENT`。
- 所以，当你存入一个新元素，`map.put` 返回 `null`，`null == null` 结果为 `true`，`add()` 方法告诉你：**添加成功**。
- 当你存入一个重复元素，`map.put` 会发现 Key 已存在，返回旧值（也就是 `PRESENT`）。`PRESENT == null` 结果为 `false`，`add()` 方法告诉你：**添加失败（元素重复）**。

#### 3. 终极追问：底层 HashMap 是怎么判断 Key 重复的？

既然 `HashSet` 依赖 `HashMap` 的 Key 来去重，那 `HashMap` 又是怎么判断两个 Key 是同一个对象的呢？

这依赖于对象的 **`hashCode()`** 和 **`equals()`** 方法（这就是为什么自定义对象存入 `HashSet` 必须重写这两个方法）。具体流程如下：

1. **计算哈希值（找位置）：** 当新元素进来时，先调用它的 `hashCode()` 方法，计算出一个哈希值。经过底层位运算后，决定这个元素应该放在底层数组的哪个“桶（Bucket）”里。
2. **判断桶是否为空：**
   - 如果桶是空的，说明没有发生冲突，直接存入（去重成功）。
   - 如果桶里已经有东西了（发生哈希冲突，也就是多个元素的算出来的哈希值一样，落在了同一个位置）。
3. **调用 equals 比对（验真身）：** 接着，系统会拿着新元素，跟桶里面已存在的元素挨个调用 `equals()` 方法进行对比。
   - 如果发现有一个元素的 `equals()` 返回 `true`：确认是重复元素，拒绝存入新元素。
   - 如果全都不一样（仅仅是哈希值巧合撞了），那就把新元素挂在这个桶的链表（或红黑树）末尾，允许存入。

#### 4. HashSet 的核心特征总结

基于以上原理，我们可以顺理成章地推导出 `HashSet` 的所有外在特征：

- **无序：** 因为元素存放的位置是根据 `hashCode()` 算出来的，毫无规律可言，所以你遍历出来的顺序和你存进去的顺序是不一致的。
- **允许存 null：** 底层 `HashMap` 的 Key 允许存一个 `null`，所以 `HashSet` 也可以存且只能存一个 `null`（放在哈希表的第 0 个桶）。
- **性能极高：** 得益于哈希表的结构，如果没有发生严重的哈希冲突，它的添加、删除、查询（包含）的时间复杂度都是惊人的 **O(1)**。
- **线程不安全：** 因为底层的 `HashMap` 不是线程安全的。如果在多线程下需要去重，请使用 `Collections.synchronizedSet(new HashSet<>())` 或者 JUC 并发包下的 `CopyOnWriteArraySet` / `ConcurrentHashMap.newKeySet()`。

 

#### 5. 细节

HashSet集合底层是基于哈希表实现的，哈希表根据JDK版本的不同，也是有点区别的：

JDK8以前：哈希表 = 数组+链表

JDK8以后：哈希表 = 数组+链表+红黑树

<img src="/covers/java-1-java-1tasiz/5ffcba4cfefc18cacb58d75024482377.webp" style="zoom:67%;" />

![](/covers/java-1-java-1tasiz/a0e130330330397b2d93ab4014f63b11.webp)

 我们发现往HashSet集合中存储元素时，底层调用了元素的两个方法：一个是hashCode方法获取  元素的hashCode值（哈希值）；另一个是调用了元素的equals方法，用来比较新添加的元素和集合中已有的元素是否相同。hashCode值相同，equals比较不同，则以链表的形式连接在数组的同一个索引位置。

在JDK8开始后，为了提高性能，当链表的长度超过8时，就会把链表转换为红黑树，如下图所示：

 <img src="/covers/java-1-java-1tasiz/c21536f7085797fd7960a5cb358b6e75.webp" style="zoom:67%;" />![](https://i-blog.csdnimg.cn/blog_migrate/1c2ef6df70210b01fe2771f62c7c3848.png)  



### 3. HashSet去重原理

我们在上一节刚刚讲过 `HashSet` 的“祖训”：它是依靠对象的 **`hashCode()`** 和 **`equals()`** 来判断是不是同一个人的。

如果你自己写了一个 `Student` 类，却**没有重写**这两个方法，Java 就会默认使用老祖宗 `Object` 类提供的原始方法：

1. **原始的 `hashCode()`**：根据对象的**内存地址**计算出一个数字。
2. **原始的 `equals()`**：直接用 `==` 比较两个对象的**内存地址**。

因为你的 `s2` 和 `s3` 是分别 `new` 出来的两次，它们在内存里住的地方（地址）是不一样的。所以，在 `HashSet` 眼里，它们就是**两个长得一模一样但身份证号完全不同的陌生人**，于是高高兴兴地把它们俩都存了进去。

```java
public class Student {
    private String name;
    private int age;
    private double height;

    // ... 这里的构造方法、getter/setter 省略 ...

    // 1. 重写 equals 方法：告诉 HashSet 只要名字、年龄、身高一样，就是同一个人
    @Override
    public boolean equals(Object o) {
        // 如果内存地址一样，肯定是同一个人，直接返回 true，提高效率
        if (this == o) return true;
        // 如果传入的对象是 null，或者两者根本不是同一个类型，直接返回 false
        if (o == null || getClass() != o.getClass()) return false;
        
        // 强转为 Student 类型，开始挨个比对核心属性的值
        Student student = (Student) o;
        return age == student.age && 
               Double.compare(student.height, height) == 0 && 
               Objects.equals(name, student.name);
    }

    // 2. 重写 hashCode 方法：用这三个属性的值，联合计算出一个新的数字指纹
    @Override
    public int hashCode() {
        // Objects.hash 是 Java 提供的一个工具类，能完美融合多个属性算出一个哈希值
        return Objects.hash(name, age, height);
    }
}
```



### 4. LinkedHashSet底层原理

LinkedHashSet它底层采用的是也是哈希表结构，只不过额外新增了一个双向链表来维护元素的存取顺序。如下下图所示：

<img src="/covers/java-1-java-1tasiz/e6c3fb7ef6707bf44ab4e787be8588e8.webp" style="zoom:67%;" />

前面我们扒了 `HashSet` 的老底，发现它其实是个 `HashMap`。现在到了 `LinkedHashSet`，它的套路简直如出一辙。

如果用一句话来概括 `LinkedHashSet` 的底层原理：**它本质上就是一个披着 `Set` 外衣的 `LinkedHashMap`。**

`HashSet` 虽然去重极快，但它有一个致命弱点：**无序**（存进去的顺序和拿出来的顺序不一样）。为了解决这个问题，Java 工程师设计了 `LinkedHashSet`。它的核心使命就是：**既要保证元素不重复，又要记住元素存进来的顺序。**

**1. 源码揭秘：偷偷换掉了底层的 Map**

如果你点进 `LinkedHashSet` 的源码，你会发现它的代码少得可怜，全都在调用父类 `HashSet` 的构造方法。

但它调用的，是一个对外隐藏（包级私有）的特殊构造方法：

```java
// LinkedHashSet 的构造方法
public LinkedHashSet() {
    super(16, .75f, true); // 调用父类 HashSet 的特殊构造方法
}

// -----------------------------------------------------
// 父类 HashSet 中的那个特殊构造方法（注意看里面 new 的是谁！）
HashSet(int initialCapacity, float loadFactor, boolean dummy) {
    // 💡 真相大白：它没有 new HashMap，而是 new 了一个 LinkedHashMap！
    map = new LinkedHashMap<>(initialCapacity, loadFactor);
}
```

真相大白了：**`LinkedHashSet` 维护插入顺序的秘密，全部藏在这个 `LinkedHashMap` 身上。**

**2. 核心原理：哈希表 + 双向链表**

`LinkedHashMap` 是怎么做到既能像普通哈希表一样快，又能记住顺序的呢？

它的做法非常“暴力美学”：**在原本哈希表（数组+链表/红黑树）的基础上，额外拉起了一根贯穿所有节点的“双向链表”。**

你可以把它想象成一个“串起来的珍珠项链”：

- **普通哈希表（负责去重和极速查找）**：就像一个个分好类的收纳盒，数据丢进来时，根据哈希值算出放在哪个格子里。这个过程和 `HashSet` 完全一样，保证了 O(1) 的超高性能。
- **全局双向链表（负责记录顺序）**：当你往里面放第一个元素时，系统给它绑上一条红线；放第二个元素时，把红线的另一头绑在第二个元素上……以此类推。



**底层 Node（节点）的变异**

为了拉起这根红线，`LinkedHashMap` 内部的节点（Entry）比普通的 `HashMap` 节点多长了两个“触角”：

```java
// LinkedHashMap 的内部节点类
static class Entry<K,V> extends HashMap.Node<K,V> {
    // 比普通 Node 多了 before 和 after 两个指针！
    Entry<K,V> before, after;
    
    Entry(int hash, K key, V value, Node<K,V> next) {
        super(hash, key, value, next);
    }
}
```

- `before` 指针：记录在这个元素**之前**插入的元素是谁。
- `after` 指针：记录在这个元素**之后**插入的元素是谁。



**3. 遍历时的降维打击**

因为有了这根贯穿全局的双向链表，`LinkedHashSet` 在遍历的时候，展现出了和 `HashSet` 完全不同的逻辑：

- **遍历 `HashSet` 时**：系统必须去巡视底层的整个数组。即便数组里有很多空的格子，系统也得挨个看过去，非常笨重。
- **遍历 `LinkedHashSet` 时**：系统**根本不理会那个复杂的数组**。它直接找到双向链表的“头（第一个插进来的元素）”，然后顺着 `after` 指针，像提葡萄一样，顺藤摸瓜就把所有元素按先后顺序全提出来了。



**💡 总结与面试避坑指南**

1. **核心结构**：`LinkedHashSet` 底层是 `LinkedHashMap`，数据结构是 **数组 + 单向链表/红黑树 + 额外的全局双向链表**。
2. **空间换时间**：因为它每一个元素都要额外维护 `before` 和 `after` 两个指针，所以它的**内存占用比 `HashSet` 大**。这是典型的用牺牲空间来换取“顺序”的做法。
3. **千万别和 TreeSet 搞混（新手极易踩坑！）**：
   - `LinkedHashSet` 维护的是**插入顺序**（你先 `add` 谁，谁就排在前面）。
   - `TreeSet` 维护的是**大小排序**（不管你以什么顺序存进去，它拿出来时会自动按从小到大/字母表顺序排好）。
4. **适用场景**：绝佳的业务场景是“历史搜索记录”。比如你在淘宝搜过的词，需要去重（同一个词不展示两次），且需要按照你搜索的先后顺序展示（最新搜的排在前面），用 `LinkedHashSet` 简直是量身定制。



### 5. TreeSet集合

如果说 `HashSet` 是个追求极速的“狂热分子”，`LinkedHashSet` 是个念旧的“记账员”，那么 **`TreeSet` 就是一个有着极度强迫症的“纪律委员”**。

它在保证元素**不重复**的同时，还能让集合里的元素**自动排好序**。不管你是怎么乱七八糟地塞数据进去，只要是从 `TreeSet` 里拿出来，数据永远是井然有序的。

我们来深入拆解这个“纪律委员”的底层逻辑和工作准则：

**1. 源码揭秘：老规矩，它还是个 Map**

你可能已经猜到了，Java 集合框架在 `Set` 的设计上极其“偷懒”。

打开 `TreeSet` 的源码，毫无悬念，它底层维护的是一个 **`TreeMap`**：

```java
public class TreeSet<E> extends AbstractSet<E> implements NavigableSet<E>, Cloneable, java.io.Serializable {
    // 底层干活的还是 Map
    private transient NavigableMap<E,Object> m;
    // 依然是那个毫无意义的占位符
    private static final Object PRESENT = new Object();

    public TreeSet() {
        this(new TreeMap<E,Object>());
    }
}
```

这也就意味着，`TreeSet` 的底层数据结构根本不是什么哈希表，而是一棵**红黑树（Red-Black Tree）**。它是一种自平衡的二叉查找树，左子树的节点总是小于根节点，右子树的节点总是大于根节点。因为红黑树的特性，它的增、删、查的时间复杂度都是稳定且高效的 **O(\log N)**。



**2. 核心机制：它是怎么做到自动排序的？**

因为要排序，所以 `TreeSet` **绝对不允许你存放不能比较大小的对象**。如果你往里面存的是数字（`Integer`）或字符串（`String`），它们天生就知道怎么比大小（比如 1 < 2，"a" < "b"）。

但如果你往里面存自定义的 `Student` 对象，它怎么知道谁大谁小？这就引出了 `TreeSet` 排序的两大绝招：

**绝招一：自然排序（实现 `Comparable` 接口）**

这是最常用的方式。你需要让你的自定义类“天生具备”比大小的能力。

**规则**：让你的类实现 `Comparable` 接口，并重写 `compareTo()` 方法。

```java
// 1. 实现 Comparable 接口，泛型指定为自身
class Student implements Comparable<Student> {
    String name;
    int age;

    public Student(String name, int age) { this.name = name; this.age = age; }

    // 2. 必须重写 compareTo 方法（定义排序规则）
    @Override
    public int compareTo(Student other) {
        // 比如：按年龄从小到大排
        // 返回正数说明我比他大，返回负数说明我比他小，返回 0 说明一样大
        return this.age - other.age; 
    }
}

// 使用：
TreeSet<Student> set = new TreeSet<>();
set.add(new Student("张三", 20));
set.add(new Student("李四", 18));
// 打印出来，18岁的李四一定排在20岁的张三前面！
```



**绝招二：定制排序（传入 `Comparator` 比较器）**

如果 `Student` 是别人写的类（你改不了源码），或者你今天突然想按“名字长度”排，明天想按“身高”排。这时候可以用定制排序。

**规则**：在 `new TreeSet()` 的时候，塞进去一个自定义的“裁判（Comparator）”。

```java
// 使用 Lambda 表达式，临时请一个裁判，规则：按年龄从大到小排（降序）
TreeSet<Student> set = new TreeSet<>((s1, s2) -> {
    return s2.age - s1.age; 
});
```

> **优先级**：如果既有自然排序，又有定制排序，`TreeSet` 会**优先听从定制排序（裁判）的规则**。



**3. ⚠️ 面试终极陷阱：TreeSet 是怎么去重的？**

这里是无数新手甚至老手都会翻车的地方！面试官经常会问：“`TreeSet` 也是 `Set`，那它去重依赖 `hashCode()` 和 `equals()` 吗？”

**正确答案：绝对不依赖！！！**

`TreeSet` 根本不看你的哈希值，也不调你的 `equals()`。**它判断两个对象是否重复的唯一标准，就是前面提到的排序方法（`compareTo` 或 `compare`）的返回值。**

- 只要 `compareTo()` 返回了 **`0`**，`TreeSet` 就铁定认为这俩是同一个对象，**直接触发去重，拒绝添加**。

**可怕的翻车现场：**

假设你在 `Student` 的 `compareTo` 里只比较了年龄：`return this.age - other.age;`。

如果你先存入了 `new Student("张三", 18)`，接着又存入 `new Student("李四", 18)`。

因为他们年龄都是 18，`18 - 18 = 0`。`TreeSet` 会大喊一声：“这俩是同一个人！”，然后**无情地把“李四”丢弃掉**，哪怕他们名字根本不一样！

**正确的写法：主要条件相同，必须继续比次要条件**

```java
@Override
public int compareTo(Student other) {
    int ageDiff = this.age - other.age;
    // 如果年龄相同，绝对不能直接返回0，必须继续比别的属性（比如名字）！
    if (ageDiff == 0) {
        return this.name.compareTo(other.name); 
    }
    return ageDiff;
}
```



**💡 终极总结与避坑**

1. **数据结构**：基于红黑树实现，增删查效率都是 O(\log N)。
2. **核心功能**：去重 + 排序。
3. **去重原理**：不依赖 `hashCode/equals`，只看 `compareTo / compare` 是否返回 `0`。
4. **能否存 null？**：**不能！**（因为 `null` 无法调用方法去和别的对象比大小，如果你往里加 `null`，会直接抛出 `NullPointerException` 空指针异常）。
5. **使用场景**：非常适合做**排行榜**（比如按积分从高到低排序）、**成绩单**、或者需要获取**范围数据**的场景（比如 `treeSet.subSet(60, 90)` 可以直接截取 60分到90分之间的所有数据）。



### 6. 对比

| **集合类型**        | **底层数据结构**  | **核心特性**                                                 | **适用场景**                                         | **底层套壳的 Map** |
| ------------------- | ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ------------------ |
| **`HashSet`**       | 哈希表            | **最常用！** 查询/增删极快，**绝对无序**，可以存一个 `null`。 | 绝大多数纯粹为了**数据去重**的场景。                 | `HashMap`          |
| **`LinkedHashSet`** | 哈希表 + 双向链表 | 在 `HashSet` 基础上，**保证了插入顺序**（怎么存就怎么取）。  | 需要去重，且必须**保留用户输入/插入的顺序**。        | `LinkedHashMap`    |
| **`TreeSet`**       | 红黑树            | 插入的元素会被**自动排序**（支持自然排序或自定义比较器）。   | 需要对去重后的数据进行**排序**（如排行榜、成绩单）。 | `TreeMap`          |



## 五、Collection的其他操作

### 1. 可变参数

在 Java 中，“可变参数（Varargs）”和“集合（Collection）”简直是天造地设的一对。

可变参数的语法是 `类型... 变量名`（比如 `String... args`），它在底层的本质其实就是一个**数组**。把它用在集合上，最大的好处就是：**极大地简化了集合的初始化和批量添加操作**。不用再一行一行地写 `add()` 了。

在 Java 的发展历程中，集合使用可变参数主要分为“经典老派”和“现代新派”两种核心玩法：

**1. 现代新派玩法：Java 9+ 的工厂方法（最优雅）**

如果你使用的是 JDK 9 或更高版本，Java 在 `List`、`Set` 和 `Map` 接口中直接内置了带有可变参数的静态工厂方法。这是目前最推荐、代码最优雅的写法。

**核心方法**

- `List.of(E... elements)`
- `Set.of(E... elements)`

**代码演示：**

```java
// 以前你需要写 4 行代码，现在只需 1 行
List<String> list = List.of("Java", "Python", "Go");

// Set 同理，会自动去重（注意：如果传入重复元素，Set.of 会在运行时直接报错！）
Set<Integer> set = Set.of(1, 2, 3, 4); 
```

**⚠️ 致命陷阱（必背考点）：**

通过 `List.of()` 或 `Set.of()` 创建出来的集合是**绝对不可变的（Immutable）**！

你不能调用 `add()`，也不能调用 `remove()`，甚至连 `set()` 修改都不行。只要敢动它一下，程序就会立刻抛出 `UnsupportedOperationException`（不支持的操作异常）。它只适合用来做只读的配置项或常量数据。



**2. 经典老派玩法：JDK 8 及以前的必备招式**

如果你还在用 JDK 8，你无法使用 `List.of()`，但你可以借助工具类和可变参数来达到类似的效果。

**招式一：`Arrays.asList(T... a)`**

这是 JDK 1.2 就有的老兵，专门把一堆散装的数据（可变参数）变成一个 `List`。

```java
List<String> list = Arrays.asList("张三", "李四", "王五");
```

**⚠️ 陷阱：** `Arrays.asList()` 返回的 List 是**长度固定的**。你可以用 `set()` 修改里面的值，但**不能** `add()` 或 `remove()`，否则同样会抛出 `UnsupportedOperationException`。

**招式二：`Collections.addAll(Collection c, T... elements)`**

这是一个极其好用、却经常被新手忽略的方法！如果你想创建一个**可以正常增删改查**的普通集合，并且想批量往里面塞数据，用它准没错。

```java
// 1. 先创建一个正常的、可变的 ArrayList
List<String> list = new ArrayList<>();

// 2. 利用可变参数，一次性塞入多个元素
Collections.addAll(list, "苹果", "香蕉", "橘子", "西瓜");

// 这个 list 是完全自由的，你可以随便 add 或 remove
list.add("葡萄"); 
```



**3. 实战：如何优雅地创建一个“带初始数据且可变”的集合？**

在实际业务开发中，我们往往既想要 `List.of()` 或 `Arrays.asList()` 的简洁，又想要 `ArrayList` 的“可变性”（能随时 `add` 和 `remove`）。

最标准的做法是“套娃”——把不可变的集合当作构造参数，传给 `ArrayList`：

```java
// 写法 1 (JDK 8): 将 Arrays.asList 的结果作为 ArrayList 的初始数据
List<String> list1 = new ArrayList<>(Arrays.asList("A", "B", "C"));
list1.add("D"); // ✅ 完美运行

// 写法 2 (JDK 9+): 将 List.of 的结果作为 ArrayList 的初始数据
List<String> list2 = new ArrayList<>(List.of("X", "Y", "Z"));
list2.add("W"); // ✅ 完美运行
```



### 2. 并发修改异常

遇到 `ConcurrentModificationException`（并发修改异常）可以说是每个 Java 开发者的“成人礼”。名字听起来很高大上，像是因为“多线程并发”引起的，但实际上，**在单线程开发中，极其普通的循环代码也会大概率触发它**。

**1. 它是怎么被触发的？**

最经典的触发场景就是：**在使用增强 `for` 循环（for-each）遍历集合时，直接调用了集合自身的 `add` 或 `remove` 方法。**

**❌ 经典错误代码（必报异常）：**

```java
List<String> list = new ArrayList<>();
list.add("Java");
list.add("Python");
list.add("Go");

// 案发现场：使用增强 for 循环遍历
for (String lang : list) {
    if (lang.equals("Python")) {
        // 💣 致命错误：在遍历的过程中，调用了集合的 remove 方法
        list.remove(lang); 
    }
}
```

当你运行这段代码时，程序会立刻崩溃，并在控制台甩出一个血红色的 `java.util.ConcurrentModificationException`。



**2. 底层为什么会抛出这个异常？**

这其实是 Java 集合框架自带的一种 **Fail-Fast（快速失败）保护机制**。

增强 `for` 循环底层其实是利用了 **迭代器（Iterator）**。为了防止在遍历过程中数据被别人篡改，迭代器和集合之间有一套“暗号”机制：

1. **集合的版本号（`modCount`）**：集合（如 ArrayList）内部有一个 `modCount` 变量，记录着集合被修改的次数。每次 `add` 或 `remove`，`modCount` 都会加 1。
2. **迭代器的预期版本号（`expectedModCount`）**：当迭代器刚被创建时，它会把当时集合的 `modCount` 抄写一份，记在自己的本子上，叫 `expectedModCount`。
3. **查岗比对**：迭代器每次往前走一步（调用 `next()` 方法），都会去比对一下：`我的预期版本号 == 集合现在的版本号` 吗？

**异常爆发的过程：**

你在循环里调用了 `list.remove("Python")`，集合的 `modCount` 加了 1。但是！迭代器本子上的 `expectedModCount` 并没有更新。

等下一轮循环迭代器调用 `next()` 时，发现版本号对不上了，它就会认为：“有人在我眼皮子底下偷偷修改了数据，现在的环境不安全，我没法继续遍历了！”于是直接抛出 `ConcurrentModificationException` 自爆。



**3. 怎么解决这个异常？**

根据你的使用场景（单线程还是多线程），有以下几种标准解决方案：

**方案一：单线程下的最优解 —— Java 8 的 `removeIf()`**

如果你使用的是 JDK 8 及以上版本，这是**最优雅、最推荐**的写法。只需一行代码，底层自动帮你处理好迭代器的问题。

```java
List<String> list = new ArrayList<>(Arrays.asList("Java", "Python", "Go"));

// ✅ 正确做法：移除名字叫 Python 的元素
list.removeIf(lang -> lang.equals("Python"));
```

**方案二：老版本的标准解法 —— 使用迭代器自身的 `remove()`**

如果你还在用老版本 Java，或者逻辑比较复杂不能用 Lambda，那就老老实实把隐藏的迭代器写出来，并**使用迭代器提供的 `remove` 方法**（因为它在删除元素后，会自动把新的版本号同步更新给 `expectedModCount`）。

```java
List<String> list = new ArrayList<>(Arrays.asList("Java", "Python", "Go"));

Iterator<String> iterator = list.iterator();
while (iterator.hasNext()) {
    String lang = iterator.next();
    if (lang.equals("Python")) {
        // ✅ 正确做法：必须调用迭代器（iterator）的 remove，绝对不能调 list.remove
        iterator.remove(); 
    }
}
```

**方案三：使用 Stream 流生成新集合（防御性编程）**

如果你不想在原集合上动刀子，可以利用 Stream 过滤掉不要的元素，直接生成一个新的集合，这样也彻底避开了并发修改异常。

```java
List<String> list = new ArrayList<>(Arrays.asList("Java", "Python", "Go"));

// ✅ 过滤掉 Python，保留剩下的，组装成新 List
List<String> newList = list.stream()
                           .filter(lang -> !lang.equals("Python"))
                           .collect(Collectors.toList());
```

**方案四：真正的多线程并发场景 —— 使用 JUC 并发集合**

如果你的场景真的是“线程 A 在遍历集合，此时线程 B 突然删除了集合里的元素”，即使你用了方案一和方案二，依然会报错。

这时候，普通的 `ArrayList` 已经无法胜任了，必须换成 `java.util.concurrent` (JUC) 包下专门为并发设计的集合，比如 **`CopyOnWriteArrayList`**。

```java
// ✅ 多线程环境下的正确选择
List<String> safeList = new CopyOnWriteArrayList<>();
safeList.add("Java");
safeList.add("Python");

// 线程 A 遍历（非常安全，无论其他线程怎么增删都不会报错）
for (String lang : safeList) {
    System.out.println(lang);
}
```

*`CopyOnWriteArrayList` 的原理是：当你修改集合时，它会偷偷复制一个底层数组的副本，在副本上修改，修改完再把引用指回去。这样就不会干扰正在遍历原始数组的迭代器。*



**💡 总结核心口诀**

**“遍历途中要删除，千万别用原集合；单线程用 `removeIf`，多线程换 `CopyOnWrite`。”**



### 3. Collections工具类

很多初学者极其容易把 **`Collection`** 和 **`Collections`** 搞混，甚至在面试时也会被这个问题“背刺”。

我们先来做个一句话的终极区分：

- **`Collection`（没有 s）**：是**接口（Interface）**，它是 List 和 Set 的老祖宗，定义了集合的基本规范。
- **`Collections`（有 s）**：是**工具类（Class）**，就像 `Arrays` 是操作数组的工具类一样，`Collections` 里面全是静态方法，专门用来给集合“打辅助”（排序、搜索、包装等）。

开发中极其常用的 `Collections` 工具方法，主要分为以下 **4 大绝招**：

#### 1. 排序与打乱（操作 List）

这一组方法主要针对 `List` 集合，因为 `List` 是有序的。

| **方法签名**                       | **作用说明**                             | **常见应用场景**                          |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `sort(List<T> list)`               | 按照自然顺序从小到大排序。               | 对成绩单、价格表进行升序排列。            |
| `sort(List<T> list, Comparator c)` | 根据指定的“裁判”（比较器）进行定制排序。 | 按名字长度排序，或者倒序（降序）排列。    |
| `reverse(List<?> list)`            | **反转**集合中元素的顺序（头尾颠倒）。   | 实现“最新插入的排在最前面”的效果。        |
| `shuffle(List<?> list)`            | **随机打乱**集合中元素的顺序。           | **极其好用！** 做抽奖系统、洗牌算法首选。 |

**代码实战：**

```java
List<Integer> list = new ArrayList<>(Arrays.asList(3, 1, 4, 1, 5, 9));

Collections.sort(list); 
System.out.println("从小到大排序: " + list); // 输出: [1, 1, 3, 4, 5, 9]

Collections.reverse(list);
System.out.println("彻底反转: " + list); // 输出: [9, 5, 4, 3, 1, 1]

Collections.shuffle(list);
System.out.println("随机洗牌: " + list); // 输出: [4, 9, 1, 3, 1, 5] (每次都不一样)
```



#### 2. 查找与统计

不用自己写 `for` 循环去找最大值或统计次数了，一行代码搞定。

| **方法签名**                           | **作用说明**                                                 |
| -------------------------------------- | ------------------------------------------------------------ |
| `max(Collection<?> coll)`              | 找出集合中的**最大值**（根据自然顺序）。                     |
| `min(Collection<?> coll)`              | 找出集合中的**最小值**。                                     |
| `frequency(Collection<?> c, Object o)` | **统计某个元素在集合中出现的次数**。                         |
| `binarySearch(List<?> list, T key)`    | 用二分查找法在 List 中寻找目标值的索引（**前提是集合必须已经排好序**）。 |

**代码实战：**

```java
List<String> list = Arrays.asList("Java", "Python", "Java", "Go");

int count = Collections.frequency(list, "Java");
System.out.println("Java出现的次数: " + count); // 输出: 2

String max = Collections.max(list);
System.out.println("字母表最靠后的: " + max); // 输出: Python
```



#### 3. 不可变集合

在某些业务场景下（比如返回系统配置、缓存数据），你希望把一个集合返回给别人，但**绝对不希望别人修改它**。这时候就需要给集合套上“不可变”的护盾。

| **方法签名**                                       | **作用说明**                   |
| -------------------------------------------------- | ------------------------------ |
| `unmodifiableList(List<? extends T> list)`         | 返回一个**只读**的 List 视图。 |
| `unmodifiableSet(Set<? extends T> s)`              | 返回一个**只读**的 Set 视图。  |
| `unmodifiableMap(Map<? extends K, ? extends V> m)` | 返回一个**只读**的 Map 视图。  |

**代码实战：**

```java
List<String> realList = new ArrayList<>();
realList.add("核心机密数据");

// 给真集合套上一层“防弹衣”
List<String> safeList = Collections.unmodifiableList(realList);

// 外部拿到了 safeList，只能读，一旦尝试增删改，立刻抛出 UnsupportedOperationException！
// safeList.add("黑客篡改"); ❌ 直接报错崩溃
```

> *注：在 JDK 9 以后，可以直接用 `List.of()` 来创建不可变集合，这个方法的使用频率有所下降。*



#### 4. removeIf

`removeIf` 是 JDK 8 在 `Collection` 接口中新增的一个默认方法。

它的字面意思就是：**“如果（If）满足某个条件，就把它删除（remove）”。**

你需要传给它的，是一个**判断条件（Predicate，通常用 Lambda 表达式来写）**。只要集合里的元素套进这个条件后返回 `true`，这个元素就会被无情地删掉。



假设我们有一个 List，里面存了一堆名字，现在的需求是：**删除所有姓“王”的人**。

**🚨 以前的老古董写法（JDK 8 之前）：**

为了防止触发 `ConcurrentModificationException` 异常，你必须硬着头皮写这堆又臭又长的迭代器代码：

```java
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String name = it.next();
    if (name.startsWith("王")) {
        it.remove(); 
    }
}
```

**✨ 现代的优雅写法（JDK 8 之后）：**

有了 `removeIf`，上面那一坨代码直接浓缩成了一行：

```java
// 翻译：删除 list 里的元素(name)，条件是 name 以 "王" 开头
list.removeIf(name -> name.startsWith("王"));
```

这就是它出场率极高的原因：**绝对的简洁，且绝对的安全。**



`removeIf` 存在于 `Collection` 接口中，这意味着 **List 和 Set 都可以直接使用它**。而 Map 稍微有点特殊，我们需要通过它的“集合视图”来使用。

**场景一：List / Set 集合直接使用**

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class RemoveIfDemo {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>(Arrays.asList(10, 25, 30, 45, 50));

        // 需求：删除所有奇数（除以2余数不为0的数）
        // n 代表集合里的每一个元素，-> 后面是删除的条件，只要条件为 true 就删除
        numbers.removeIf(n -> n % 2 != 0);

        System.out.println(numbers); // 输出: [10, 30, 50]
    }
}
```

**场景二：Map 集合怎么用？（非常实用）**

注意：**`Map` 接口本身并没有提供 `removeIf` 方法！**

但是，Map 能够提取出 `keySet()`（键集合）和 `entrySet()`（键值对集合），这俩货都是 `Set`，所以它们都有 `removeIf`。

```java
import java.util.HashMap;
import java.util.Map;

public class MapRemoveIfDemo {
    public static void main(String[] args) {
        Map<String, Integer> scores = new HashMap<>();
        scores.put("张三", 90);
        scores.put("李四", 55);  // 不及格
        scores.put("王五", 100);
        scores.put("赵六", 45);  // 不及格

        // 需求 1：开除“张三”（根据 Key 删除）
        scores.keySet().removeIf(key -> key.equals("张三"));

        // 需求 2：淘汰所有分数低于 60 的人（根据 Value 删除）
        // entry 代表每一个键值对，如果 entry 的 Value 小于 60，就删掉这整个键值对
        scores.entrySet().removeIf(entry -> entry.getValue() < 60);

        System.out.println(scores); // 最终只剩下: {王五=100}
    }
}
```

*💡 隐藏彩蛋：当你对 `map.entrySet()` 或 `map.keySet()` 调用 `removeIf` 时，底层原本的 `Map` 里面的数据也会跟着被真实删除！*



#### 5. 创建空集合

```java
Collections.emptyList()
```



## 六、Map集合

所谓双列集合，就是说集合中的元素是一对一对的。Map集合中的每一个元素是以`key=value`的形式存在的，一个`key=value`就称之为一个 键值对 ，而且在Java中有一个类叫Entry类，Entry的对象用来表示键值对对象。

所有的Map集合有如下的特点：**键不能重复，值可以重复，每一个键只能找到自己对应的值。**

<img src="/covers/java-1-java-1tasiz/668b94afba03d6a8862ebb79ec5c2e43.webp" style="zoom:67%;" />

### 1. Map集合的常用方法

如果说 `Collection` 家族（List、Set）是用来存放“单身汉”的，那么 **`Map` 家族就是专门用来存放“情侣（键值对 Key-Value）”的**。

需要特别牢记的第一点是：**`Map` 并没有继承 `Collection` 接口！** 它是 Java 集合框架中另一座独立的山头。因此，它有着自己完全独立的一套方法体系。

为了方便记忆，我们可以将 `Map` 的常用方法按 **“增改、删除、查询、获取视图（遍历大招）”** 分为 4 大类：

#### 1. 增与改 (Add & Update)

在 `Map` 中，添加和修改用的是同一个方法。因为 `Map` 的 **Key（键）是绝对唯一的**，如果你存入了一个已经存在的 Key，新的 Value（值）就会直接覆盖掉老的 Value。

| **方法签名**                    | **作用说明**                                                 | **面试必考细节**                                             |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `V put(K key, V value)`         | 将指定的键值对存入 Map。                                     | **有返回值！** 如果 Key 是全新的，返回 `null`；如果 Key 已存在，**返回被覆盖的那个旧 Value**。 |
| `void putAll(Map m)`            | 将另一个 Map 中的所有键值对，全部拷贝到当前 Map 中。         | 相当于 List 的 `addAll`。                                    |
| `V putIfAbsent(K key, V value)` | **(Java 8+)** 只有当这个 Key 不存在（或值为 null）时，才把键值对存进去。 | 防止不小心把已有的重要数据覆盖掉，极其好用。                 |

#### 2. 删除 (Delete)

| **方法签名**                               | **作用说明**                                                 |
| ------------------------------------------ | ------------------------------------------------------------ |
| `V remove(Object key)`                     | 根据 Key 删除整个键值对。**返回被删除的 Value**（如果没有这个 Key，返回 `null`）。 |
| `boolean remove(Object key, Object value)` | **(Java 8+)** 精准狙击：只有当 Key 和 Value **同时匹配**时，才执行删除。 |
| `void clear()`                             | 清空 Map 中的所有键值对。                                    |

#### 3. 判断与查询 (Check & Query)

这是日常业务代码中调用频率最高的一组方法。

| **方法签名**                                 | **作用说明**                                                 |
| -------------------------------------------- | ------------------------------------------------------------ |
| `V get(Object key)`                          | 根据 Key 提取对应的 Value。如果找不到，返回 `null`。         |
| `V getOrDefault(Object key, V defaultValue)` | **(Java 8+)** 根据 Key 找 Value。如果找不到，**不返回 null，而是返回你指定的默认值**（防空指针神器）。 |
| `boolean containsKey(Object key)`            | 判断 Map 中是否包含指定的 **Key**（底层查找极快 O(1)）。     |
| `boolean containsValue(Object value)`        | 判断 Map 中是否包含指定的 **Value**（底层需要挨个遍历，比较慢 O(N)）。 |
| `int size()`                                 | 返回 Map 中键值对的个数。                                    |
| `boolean isEmpty()`                          | 判断 Map 是否为空。                                          |

#### 4. 获取集合视图 (Views) 

`Map` 本身是不能直接用 `for-each` 循环遍历的。你要想遍历 `Map`，必须先用下面这三个方法，把它转换成 `Collection` 家族的集合（Set 或 List）。

| **方法签名**                     | **作用说明**                                                 | **遍历场景**                                            |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| `Set<K> keySet()`                | 把 Map 里**所有的 Key** 提取出来，装进一个 `Set` 集合返回。  | 只需要用到 Key 时使用。                                 |
| `Collection<V> values()`         | 把 Map 里**所有的 Value** 提取出来，装进一个 `Collection` 返回。 | 只需要用到 Value 时使用（很少用）。                     |
| `Set<Map.Entry<K,V>> entrySet()` | 把 Map 里的**每一个键值对（Entry 对象）** 提取出来，装进一个 `Set` 集合返回。 | **开发中最常用！** 同时需要 Key 和 Value 时，效率最高。 |

> **新手必看的避坑指北：**
>
> 如果你在遍历时既需要 Key 又需要 Value，**千万不要用 `keySet()` 遍历！** 因为用 `keySet()` 拿到 Key 之后，你还得调用一次 `map.get(key)` 去底层哈希表里查一次 Value，相当于多跑了一趟冤枉路。直接使用 **`entrySet()`**，它在遍历时直接把 Key 和 Value 绑在一起交给了你，性能完胜！



### 2. Map集合遍历方式

在 Java 中，遍历 `Map` 集合是一个极其高频的操作。但要牢记一个大前提：**`Map` 并没有继承 `Iterable` 接口**，所以你不能直接用 `for (Object obj : map)` 这样去循环它本身。

想要遍历 `Map`，我们必须先把它转换成单列集合（Set 或 Collection），或者使用 Java 8 提供的函数式接口。日常开发中，主要有以下 **5 种标准遍历方式**：

#### 1. 最经典：`entrySet()` 遍历

这是在需要同时使用 Key 和 Value 时，**性能最高、最标准**的遍历方式。

`entrySet()` 会把 Map 里的每一个键值对打包成一个 `Map.Entry` 对象，放进一个 Set 集合里。你只需要遍历这个 Set，就能一次性拿到键和值。

- **优点**：一步到位，效率极高。
- **适用场景**：绝大多数需要同时用到键和值的业务场景。

```java
Map<String, Integer> map = new HashMap<>();
map.put("Java", 100);
map.put("Python", 90);

// 遍历 entrySet
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    String key = entry.getKey();
    Integer value = entry.getValue();
    System.out.println("键: " + key + ", 值: " + value);
}
```

#### 2. 最现代： `forEach()`

如果你使用的是 JDK 8 及以上版本，强烈建议使用这种方式。底层其实是对 `entrySet()` 的封装，但代码极其精简，可读性拉满。

- **优点**：代码极其简洁，一行搞定。
- **适用场景**：全量遍历、打印、或者执行简单的回调逻辑。

```java
// 使用 Lambda 表达式直接遍历
map.forEach((key, value) -> {
    System.out.println("键: " + key + ", 值: " + value);
});

// 如果逻辑只有一行，可以缩写为：
map.forEach((k, v) -> System.out.println(k + " -> " + v));
```

#### 3. 键找值：`keySet()` 遍历

`keySet()` 会把 Map 里所有的 Key 提取出来变成一个 Set。你可以遍历这个 Set 拿到所有的 Key。

- **适用场景**：**只**需要用到 Key，完全不关心 Value 的时候。
- **致命性能坑**：很多新手会用 `keySet()` 拿到 Key 之后，再在循环里调用 `map.get(key)` 去获取 Value。这相当于你拿到了钥匙，还要每次重新跑一趟仓库底层去开锁查数据（相当于多做了一次哈希查找），在海量数据下性能远不如 `entrySet()`。

```java
// 正确场景：仅仅为了遍历 Key
for (String key : map.keySet()) {
    System.out.println("我只需要键: " + key);
}

// ❌ 错误示范（性能差，不要这么写）：
// for (String key : map.keySet()) {
//     Integer value = map.get(key); // 多做了一次底层哈希查找！
// }
```

#### 4. 纯值遍历：`values()` 遍历

如果你对 Key 完全不感兴趣，只想把 Map 里所有的 Value 拿出来处理，可以用这个方法。它会返回一个包含所有 Value 的 `Collection`。

- **适用场景**：只统计或处理 Value（比如计算 Map 里所有分数的总和）。

```java
// 直接获取所有的 Value 进行遍历
for (Integer value : map.values()) {
    System.out.println("我只需要值: " + value);
}
```

#### 5. 迭代器遍历：安全删除必备

我们在讲单列集合时说过，如果在遍历的过程中需要**删除**元素，不能用普通的 `for-each` 循环，否则会报 `ConcurrentModificationException`。`Map` 也是一样的道理。

如果你想在遍历 `Map` 时根据某些条件删除键值对，**必须使用迭代器（Iterator）**，或者 Java 8 的 `removeIf()`。

- **适用场景**：边遍历边删除。

```java
// 获取 entrySet 的迭代器
Iterator<Map.Entry<String, Integer>> iterator = map.entrySet().iterator();

while (iterator.hasNext()) {
    Map.Entry<String, Integer> entry = iterator.next();
    
    // 假设我们要删除分数低于 95 的键值对
    if (entry.getValue() < 95) {
        iterator.remove(); // ✅ 安全删除
    }
}

// 💡 补充：如果是 Java 8+，用 removeIf 更简单（不需要写迭代器）：
// map.entrySet().removeIf(entry -> entry.getValue() < 95);
```



### 3. HashMap

首先，我们学习HashMap集合的底层原理。前面我们学习过HashSet的底层原理，实际上HashMap底层原理和HashSet是一样的。为什么这么说呢？因为我们往HashSet集合中添加元素时，实际上是把元素添加到了HashMap集合中。

下面是Map集合的体系结构，HashMap集合的特点是由键决定的： **它的键是无序、不能重复，而且没有索引的**。也是各种Map集合中也是用得最多的一种集合。



刚才我们说，HashSet底层就是HashMap，我们可以看源码验证这一点，我们可以看到，创建HashSet集合时，底层帮你创建了HashMap集合；往HashSet集合中添加元素时，底层却是调用了Map集合的put方法把元素作为了键来存储。所以实际上根本没有什么HashSet集合，把HashMap的集合的值忽略不看就是HashSet集合。

HashSet的原理我们之前已经学过了，所以HashMap是一样的，底层是哈希表结构。

HashMap底层数据结构: 哈希表结构

JDK8之前的哈希表 = 数组+链表

JDK8之后的哈希表 = 数组+链表+红黑树

哈希表是一种增删改查数据，性能相对都较好的数据结构

**往HashMap集合中键值对数据时，底层步骤如下:**

    第1步：当你第一次往HashMap集合中存储键值对时，底层会创建一个长度为16的数组

    第2步：然后将键和值封装成一个对象，叫做Entry对象

    第3步：再根据Entry对象的键计算hashCode值（和值无关）

    第4步：利用hashCode值和数组的长度做一个类似求余数的算法，会得到一个索引位置

    第5步：判断这个索引的位置是否为null，如果为null,就直接将这个Entry对象存储到这个索引位置

           如果不为null，则还需要进行第6步的判断

    第6步：继续调用equals方法判断两个对象键是否相同

          如果equals返回false，则以链表的形式往下挂

          如果equals方法true,则认为键重复，此时新的键值对会替换就的键值对。

    

 **HashMap底层需要注意这几点：**

    1.底层数组默认长度为16，如果数组中有超过12个位置已经存储了元素，则会对数组进行扩容2倍

      数组扩容的加载因子是0.75，意思是：16\*0.75=12     

  2.数组的同一个索引位置有多个元素、并且在8个元素以内(包括8)，则以链表的形式存储

        JDK7版本：链表采用头插法（新元素往链表的头部添加）

        JDK8版本：链表采用尾插法（新元素往那个链表的尾部添加）

  3.数组的同一个索引位置有多个元素、并且超过了8个，则以红黑树形式存储

从HashMap底层存储键值对的过程中我们发现：决定键是否重复依赖与两个方法，一个是hashCode方法、一个是equals方法。由两个键计算得到的hashCode值相同，并且两个键使用equals比较为true，就认为键重复。



### 4. LinkedHashMap

LinkedHashMap集合的特点也是由键决定的：有序的、不重复、无索引。

LinkedHashMap的底层原理，和LinkedHashSet底层原理是一样的。底层由一个双向链表来维护键的存储顺序。



### 5. TreeMap

TreeMap集合的特点也是由键决定的，默认按照键的升序排列，键不重复，也是无索引的。

TreeMap集合的底层原理和TreeSet也是一样的，底层都是红黑树实现的。所以可以对键进行排序。

比如往TreeMap集合中存储Student对象作为键，排序方法有两种。

**排序方式1：**写一个Student类，让Student类实现Comparable接口

```java
public class Student implements Comparable<Student>{
    private String name;
    private int age;
    private double height;
    public Student(){   
    }
    public Student(String name, int age, double height){
        this.name=name;
        this.age=age;
        this.height=height;    
    }
    @Overridepublic 
    int compareTo(Student o) {
        return this.age-o.age;    
    }
}
```

**排序方式2：**在创建TreeMap集合时，直接传递Comparator比较器对象。

```java
public class Test3TreeMap {
    public static void main(String[] args) {
        Map<Student, String> map = new TreeMap<>(new Comparator<Student>() {
            @Overridepublic 
            int compare(Student o1, Student o2) {
                return Double.compare(o1.getHeight(), o2.getHeight());           
            }       
        });       
     map.put(new Student("蜘蛛精", 25, 168.5), "盘丝洞");        
     map.put(new Student("蜘蛛精", 25, 168.5), "水帘洞");        
     map.put(new Student("至尊宝", 23, 163.5), "水帘洞");        
     map.put(new Student("牛魔王", 28, 183.5), "牛头山");        
     System.out.println(map);    
    }
}
```
