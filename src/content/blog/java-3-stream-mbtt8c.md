---
title: 3.Stream流
description: JavaStream是Java8引入的最重要的新特性之一。它允许你以声明式的方式处理数据集合（就像写SQL查询语句一样），而不是像以前那样写大量的for循环和if判断。
pubDate: 2026-10-10
series: Java
order: 3
source: Java/3.Stream流
---

**Java Stream** 是 Java 8 引入的最重要的新特性之一。它允许你以**声明式**的方式处理数据集合（就像写 SQL 查询语句一样），而不是像以前那样写大量的 `for` 循环和 `if` 判断。

需要特别注意的是：**Stream 不是数据结构，它不存储数据。** 它更像是一条“流水线”，数据从一端流入，经过流水线上的各种加工节点，最后从另一端输出结果。

# 一. Stream

- **声明式编程：** 你只需要告诉它“做什么”（比如：过滤出大于 18 岁的人），而不需要告诉它“怎么做”（不需要写循环和临时集合）。
- **惰性求值 (Lazy Evaluation)：** 流水线上的“中间加工”操作不会立即执行。只有当需要最终结果（触发终端操作）时，所有的加工步骤才会被一次性执行完毕。
- **只能消费一次：** 一个 Stream 实例一旦被执行了终端操作，就会失效，不能再次被使用。



**Stream 的三部曲**

数据源 → 中间操作（0到多个，惰性） → 终止操作（触发执行，只能一次）

使用 Stream 就像在工厂建立一条生产线，固定包含三个步骤：

1. **创建 Stream (数据源)：** 从集合、数组等获取一个 Stream。
2. **中间操作 (加工)：** 对数据进行过滤、转换、排序等操作。这些操作会返回一个新的 Stream，因此可以链式调用。
3. **终端操作 (出厂)：** 触发流水线执行，并产生最终结果（比如返回一个 List、打印数据或计算总和）。



**对比**

**需求：** 从一个学生列表中，找出所有**年龄大于 18 岁**的学生，并提取他们的**名字**。

**❌ 以前的写法（指令式）：**

```java
List<String> result = new ArrayList<>();
for (Student student : students) {
    if (student.getAge() > 18) {
        result.add(student.getName());
    }
}
```

**✅ 使用 Stream 的写法（声明式）：**

```java
List<String> result = students.stream()              // 1. 创建 Stream
        .filter(student -> student.getAge() > 18)    // 2. 中间操作：过滤年龄 > 18
        .map(Student::getName)                       // 2. 中间操作：提取名字
        .collect(Collectors.toList());               // 3. 终端操作：收集成一个 List
```



# 二. 常用操作

## 1. 创建 Stream

Map集合不能直接使用，必须分别得到键和值才能操作

```java
// 从 List 或 Set 创建
List<String> list = Arrays.asList("a", "b", "c");
Stream<String> stream = list.stream();

//Map集合
HashMap<String,Integer> m=new HashMap<>();
m.put("aaa",111);
m.put("bbb",222);
m.put("ccc",333);
m.put("ddd",444);

m.ketSet().stream().forEach(s->System.out.println(s));
m.entrySet().stream().forEach(s->System.out.println(s));
//结果：aaa=111 bbb=222 ccc=333 ddd=444

// 从数组创建
int[] numbers = {1, 2, 3};
IntStream arrayStream = Arrays.stream(numbers);

// 零散数据，直接创建
Stream<String> directStream = Stream.of("x", "y", "z");
```

Stream流接口中静态方法of的细节：方法的形参是一个可变参数，可以传递一堆零散的数据，也可以传递数组，但是数组必须是引用类型的，如果传递基本数据类型，是会把整个数组当作一个元素，放到Stream中



## 2. 中间操作 

*这些操作调用后会返回 `Stream`，可以继续链式调用。*

| **方法名** | **作用**                                              | **代码示例**                         |
| ---------- | ----------------------------------------------------- | ------------------------------------ |
| `filter`   | 过滤，保留符合条件的元素                              | `.filter(x -> x > 10)`               |
| `map`      | 转换，将元素映射为另一种形式                          | `.map(String::toUpperCase)`          |
| `sorted`   | 排序                                                  | `.sorted()` 或 `.sorted(Comparator)` |
| `distinct` | 去重，去除重复元素（底层依赖hasCode（）和equals（）） | `.distinct()`                        |
| `limit`    | 截断，只保留前 n 个元素                               | `.limit(5)`                          |
| `skip`     | 跳过，扔掉前 n 个元素                                 | `.skip(2)`                           |



### 字符串处理 

在 Stream 中处理字符串，最核心的逻辑是根据 **`String` 方法的返回值类型** 来决定使用哪个 Stream 中间操作：

- 如果 String 方法返回 **`boolean` (真/假)**，就配合 **`filter`** 用来**过滤**。
- 如果 String 方法返回 **新的 `String`**，就配合 **`map`** 用来**转换**。

**1. 配合 `filter`：过滤不需要的字符串**

这类操作通常结合 Lambda 表达式，用于挑选出符合特定规则的字符串。

- **包含/匹配特定内容：**

  - `startsWith(String prefix)`: 是否以特定前缀开头。
  - `endsWith(String suffix)`: 是否以特定后缀结尾。
  - `contains(CharSequence s)`: 是否包含特定子串。
  - `matches(String regex)`: 是否匹配正则表达式。

  ```java
  List<String> logs = Arrays.asList("ERROR: timeout", "INFO: start", "ERROR: crash");
  // 找出所有以 "ERROR" 开头的日志
  logs.stream()
      .filter(log -> log.startsWith("ERROR"))
      .collect(Collectors.toList());
  ```

- **判空与清理空白：**

  - `isEmpty()`: 长度是否为 0（如 `""`）。
  - `isBlank()`: (Java 11+) 是否为空白字符（如 `""`, `"   "`, `\t`, `\n`）。非常推荐用来过滤纯空格字符串！

  ```java
  List<String> inputs = Arrays.asList("apple", "", "   ", "banana");
  // 过滤掉空字符串和纯空格字符串
  inputs.stream()
      .filter(s -> !s.isBlank()) 
      .collect(Collectors.toList());
  ```



**2. 配合 `map`：转换和修改字符串**

这类操作用来对保留下来的字符串“动刀子”，你可以直接使用**方法引用**（如 `String::trim`）让代码更简洁。

- **大小写转换：**

  - `toUpperCase()`: 转大写。
  - `toLowerCase()`: 转小写。

  ```java
  // 全部转为小写
  list.stream().map(String::toLowerCase)...
  ```

- **去除首尾空格：**

  - `trim()`: 去除首尾空格（老方法）。
  - `strip()`: (Java 11+) 更加智能地去除首尾空白字符（支持更多语言字符集，推荐代替 trim）。

  ```java
  // 清理用户输入的非法首尾空格
  list.stream().map(String::strip)...
  ```

- **替换与截取 (只能用 Lambda 写法)：**

  - `replace(target, replacement)`: 替换字符或字符串。
  - `substring(beginIndex, endIndex)`: 截取子串。

  ```java
  List<String> phones = Arrays.asList("138-1234-5678", "139-8765-4321");
  // 移除手机号中的横杠
  phones.stream()
        .map(phone -> phone.replace("-", ""))
        .collect(Collectors.toList());
  ```

- **对象类型转换**

  ```java
  blogPage.getRecords().stream()
                  .map(blog -> BeanUtil.copyProperties(blog, BlogOfMe.class))
                  .collect(Collectors.toList());
  ```

- **提取对象列表中的某个字段**

  实际开发中最常见的场景。例如：从 `List<User>` 中提取出所有用户的姓名生成 `List<String>`。

  ```java
  List<User> users = List.of(
      new User(1L, "Alice", 25),
      new User(2L, "Bob", 30),
      new User(3L, "Charlie", 28)
  );
  
  // 提取所有用户的名字（使用方法引用）
  List<String> names = users.stream()
      .map(User::getName)
      .toList(); // Java 16+ 可直接使用 .toList()，旧版本用 .collect(Collectors.toList())
  
  // 输出: ["Alice", "Bob", "Charlie"]
  ```





## 3. 终端操作

*一旦调用这些方法，Stream 就会开始执行，并返回最终结果。*

| **方法名** | **作用**                       | **返回值类型**          |
| ---------- | ------------------------------ | ----------------------- |
| `collect`  | 将结果收集到集合中（最常用）   | `List`, `Set`, `Map` 等 |
| `toArray`  | 讲结果收集到数组中去           |                         |
| `forEach`  | 遍历并执行操作（如打印）       | `void`                  |
| `count`    | 计算 Stream 中的元素总数       | `long`                  |
| `anyMatch` | 是否**有任意一个**元素匹配条件 | `boolean`               |
| `allMatch` | 是否**所有**元素都匹配条件     | `boolean`               |
| `reduce`   | 归约计算（如求和、求最大值）   | `Optional`              |



### reduce

`reduce` 的核心参数是一个 `BinaryOperator<T>`（二元运算符），你可以把它理解为一个 Lambda 表达式 `(a, b) -> ...`，它会把前一次计算的结果 `a` 和当前流中的元素 `b` 进行运算，得出新的结果再继续往下算。

**三种常见重载形式及用法**

**形式一：无初始值，返回 Optional**

**方法签名：** `Optional<T> reduce(BinaryOperator<T> accumulator)`

因为没有初始值，如果流为空，就会没有结果。为了防止空指针异常（NPE），Java 将其包装在 `Optional` 中返回。这也是你图片中列出的返回值类型。

**场景：求和**
```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

// 1. 无初始值
Optional<Integer> sumOpt = numbers.stream()
    .reduce((a, b) -> a + b); // 或者写成 Integer::sum

// 输出：Optional[15]
System.out.println(sumOpt); 
// 安全获取值
int sum = sumOpt.orElse(0); 
```



**形式二：有初始值，直接返回具体类型**

**方法签名：** `T reduce(T identity, BinaryOperator<T> accumulator)`

`identity` 是初始值。如果流为空，就直接返回这个初始值。因为不可能为空，所以直接返回具体类型 `T`，而不是 `Optional`。

**场景：求和（带初始值）与求最大值**
```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

// 2. 有初始值 (初始值为0)
int sum = numbers.stream()
    .reduce(0, (a, b) -> a + b); // 输出 15
// 也可以写成：.reduce(0, Integer::sum);

// 3. 求最大值
int max = numbers.stream()
    .reduce(0, (a, b) -> a > b ? a : b); // 输出 5
// 或者用 Math::max： .reduce(0, Math::max);
```



**其他实用场景**

字符串拼接：
```java
List<String> letters = Arrays.asList("a", "b", "c", "d");

// 无初始值
Optional<String> concat = letters.stream()
    .reduce((a, b) -> a + b); // Optional[abcd]

// 有初始值
String concatWithInit = letters.stream()
    .reduce("", (a, b) -> a + b); // "abcd"
```

**复杂对象归约（比如求对象集合中某个属性的总和）：**
```java
class Order {
    int price;
    // 构造器、getter省略
}
List<Order> orders = ...;

// 求所有订单的总价
int totalPrice = orders.stream()
    .map(Order::getPrice) // 先映射出价格
    .reduce(0, Integer::sum); // 再归约求和
```



### collect

**收集为 List**

默认情况下，`Collectors.toList()` 会返回一个 `ArrayList`。

```java
List<String> list = stream.collect(Collectors.toList());
```

> 如果你使用的是 Java 16 或更高版本，你可以直接省略 `collect`，使用 `stream.toList()`。注意，这种新写法返回的是一个**不可变（Immutable）**的 List。



**收集为 Set (顺便去重)**

如果你想要对结果进行去重，或者就是需要一个 `Set` 结构，可以使用 `Collectors.toSet()`。默认返回 `HashSet`。

```java
Set<String> set = stream.collect(Collectors.toSet());
```



**收集为指定的具体集合类型 (如 LinkedList, TreeSet)**

如果官方默认的 `ArrayList` 或 `HashSet` 不能满足你，比如你需要一个保证插入顺序的 `LinkedList`，或者需要自动排序的 `TreeSet`，你可以使用 `Collectors.toCollection()` 并传入一个**构造器引用**。

```java
// 收集为 LinkedList
LinkedList<String> linkedList = stream.collect(Collectors.toCollection(LinkedList::new));

// 收集为 TreeSet
TreeSet<String> treeSet = stream.collect(Collectors.toCollection(TreeSet::new));
```



**收集到Map集合中**

当确定 Stream 中提取出的 **Key 没有重复** 时，传入 Key 和 Value 的映射函数即可：

```java
// 1. 将 List<User> 转为 Map<Long, User> (Key 为 id，Value 为对象本身)
Map<Long, User> userMap = userList.stream()
    .collect(Collectors.toMap(User::getId, Function.identity())); 
    // Function.identity() 等价于 user -> user

// 2. 将 List<User> 转为 Map<Long, String> (Key 为 id，Value 为 name)
Map<Long, String> idToNameMap = userList.stream()
    .collect(Collectors.toMap(User::getId, User::getName));
```



**处理键冲突**

如果流中的 Key 可能会重复，直接使用两个参数的 `toMap` 会抛出 `IllegalStateException: Duplicate key`。此时需要传入第 3 个参数（合并函数 `mergeFunction`）来决定保留策略：

```java
Map<Long, User> userMap = userList.stream()
    .collect(Collectors.toMap(
        User::getId,
        Function.identity(),
        (existing, replacement) -> replacement // 遇到重复 Key 时，用新值覆盖旧值
        // (existing, replacement) -> existing  // 遇到重复 Key 时，保留旧值
    ));
```

