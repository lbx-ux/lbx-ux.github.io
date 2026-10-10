---
title: 2.Lambda
description: Lambda表达式是Java8引入的核心特性，它本质上是一个匿名的、可传递的代码块。它允许你将行为（代码）像参数一样传递给方法，极大地消除了传统的“匿名内部类”带来的样板代码（BoilerplateC
pubDate: 2026-10-10
series: Java
order: 2
source: Java/2.Lambda
---

Lambda 表达式是 Java 8 引入的核心特性，它本质上是一个**匿名的、可传递的代码块**。它允许你将行为（代码）像参数一样传递给方法，极大地消除了传统的“匿名内部类”带来的样板代码（Boilerplate Code），让代码变得更简洁、更具可读性。

### 1. 核心语法

Lambda 表达式的基本语法由三部分组成：

```java
(参数列表) -> { 方法体 }
```

- **参数列表**：可以没有参数，也可以有一个或多个参数。类型可以显式声明，也可以由编译器自动推断。
- **箭头符号**：`->` 是 Lambda 操作符，将参数和方法体分开。
- **方法体**：如果只有一行代码，可以省略大括号 `{}` 和 `return` 关键字。

**语法变体示例：**

- **无参数**：`() -> System.out.println("Hello");`
- **一个参数**：`name -> System.out.println(name);` （单个参数可以省略括号）
- **多个参数**：`(int a, int b) -> a + b;` （多行代码需要大括号和显式 `return`）



### 2. 函数式接口

Lambda 表达式不能凭空使用，它的目标类型必须是一个**函数式接口**。

函数式接口是指**仅仅包含一个抽象方法的接口**。Java 通常用 `@FunctionalInterface` 注解来标记它们（虽然不加这个注解，只要满足条件编译器也认）。

最常见的内置函数式接口包括：

- `Runnable` (无参数，无返回值)
- `Consumer<T>` (接收一个参数，无返回值)
- `Supplier<T>` (无参数，返回一个结果)
- `Function<T, R>` (接收一个参数，返回另一个结果)
- `Predicate<T>` (接收一个参数，返回布尔值)



#### 1. `Consumer<T>` —— 消费者（有输入，无输出）

`Consumer` 的意思是“消费者”。它接收一个参数进行处理，但不会返回任何结果。就像一个无底洞，把数据“吃”进去执行一段逻辑就结束了。

- **抽象方法**：`void accept(T t);`
- **常见场景**：打印输出、修改对象状态、发送邮件等不需要返回值的操作。
- **最常用搭档**：集合的 `forEach` 方法。

**代码示例：**

```java
// 定义一个 Consumer：接收一个字符串并打印
Consumer<String> printer = str -> System.out.println("打印内容: " + str);
printer.accept("Hello World!");

// 在集合中的实际应用
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
// forEach 方法接收的就是一个 Consumer
names.forEach(name -> System.out.println("Hi, " + name));
```



#### 2. `Supplier<T>` —— 提供者（无输入，有输出）

`Supplier` 的意思是“提供者”或“供应商”。它不接收任何参数，但会返回一个结果。你可以把它当成一个“工厂”，每次调用都会“生产”或提供一个数据给你。

- **抽象方法**：`T get();`
- **常见场景**：生成随机数、延迟计算（懒加载）、提供默认值。
- **最常用搭档**：`Optional.orElseGet()`，各种工厂方法。

**代码示例：**

```java
// 定义一个 Supplier：每次调用返回一个 0-99 的随机数
Supplier<Integer> randomNumGen = () -> new Random().nextInt(100);
System.out.println("生成随机数: " + randomNumGen.get());

// 在 Optional 中的实际应用 (懒加载)
String name = null;
// 只有当 name 为空时，才会执行 Supplier 里的逻辑去获取/生成默认值
String result = Optional.ofNullable(name)
        .orElseGet(() -> "Default Name"); 
```



#### 3. `Function<T, R>` —— 转换器/函数（有输入，有输出）

`Function` 接口代表一个数学意义上的“函数”：输入一个值，经过处理后，输出另一个值。它接收类型为 `T` 的参数，返回类型为 `R` 的结果（输入和输出的类型可以相同也可以不同）。

- **抽象方法**：`R apply(T t);`
- **常见场景**：数据格式转换、提取对象属性、数学计算。
- **最常用搭档**：Stream API 的 `map` 方法。

**代码示例：**

```java
// 定义一个 Function：输入 String，输出 Integer (计算字符串长度)
Function<String, Integer> stringLength = str -> str.length();
System.out.println("长度为: " + stringLength.apply("Java 8"));

// 在 Stream 中的实际应用
List<String> words = Arrays.asList("apple", "banana", "cat");
// map 方法接收一个 Function，将字符串列表转换成了长度列表
List<Integer> lengths = words.stream()
        .map(word -> word.length())
        .collect(Collectors.toList());
```



#### 4. `Predicate<T>` —— 断言/判断（有输入，返回布尔值）

`Predicate` 的意思是“断言”或“谓词”。它接收一个参数，进行某种条件判断，然后返回一个 `boolean` 值（`true` 或 `false`）。本质上，它就是一个返回布尔值的特殊 `Function`。

- **抽象方法**：`boolean test(T t);`
- **常见场景**：数据过滤、条件校验。
- **最常用搭档**：Stream API 的 `filter` 方法。

**代码示例：**

```java
// 定义一个 Predicate：判断一个数字是否大于 10
Predicate<Integer> isGreaterThanTen = num -> num > 10;
System.out.println("15大于10吗? " + isGreaterThanTen.test(15)); // true

// 在 Stream 中的实际应用
List<Integer> numbers = Arrays.asList(5, 12, 8, 20);
// filter 方法接收一个 Predicate，只保留返回 true 的元素
List<Integer> filtered = numbers.stream()
        .filter(n -> n > 10)
        .collect(Collectors.toList());
```

**总结与速查表**

为了方便记忆，你可以用下面这张表来对比它们的核心差异：

| **接口名称**         | **寓意**         | **输入参数** | **返回值** | **核心方法** | **典型 Stream 操作**     |
| -------------------- | ---------------- | ------------ | ---------- | ------------ | ------------------------ |
| **`Consumer<T>`**    | 只进不出（消费） | `T`          | `void`     | `accept(T)`  | `forEach()`              |
| **`Supplier<T>`**    | 只出不进（生产） | 无           | `T`        | `get()`      | `无（常用于生成Stream）` |
| **`Function<T, R>`** | 进出转换（加工） | `T`          | `R`        | `apply(T)`   | `map()`                  |
| **`Predicate<T>`**   | 查验真伪（安检） | `T`          | `boolean`  | `test(T)`    | `filter()`               |



### 3.常见应用场景

#### 1. 替代匿名内部类 (如开启线程)

在 Java 8 之前，你需要写一堆废话来实例化一个接口。Lambda 让这变成了一行代码。

**传统写法：**

```java
Thread thread = new Thread(new Runnable() {
    @Override
    public void run() {
        System.out.println("线程启动了！");
    }
});
thread.start();
```

**Lambda 写法：**

```java
Thread thread = new Thread(() -> System.out.println("线程启动了！"));
thread.start();
```



#### 2. 集合排序 (Comparator)

对集合进行自定义排序时，Lambda 表达式优势极为明显。

**传统写法：**

```java
List<String> list = Arrays.asList("Apple", "Banana", "Orange");
Collections.sort(list, new Comparator<String>() {
    @Override
    public int compare(String s1, String s2) {
        return s1.length() - s2.length();
    }
});
```

''**Lambda 写法：**

```java
List<String> list = Arrays.asList("Apple", "Banana", "Orange");
// 编译器自动推断 s1 和 s2 是 String 类型
list.sort((s1, s2) -> s1.length() - s2.length());
```



#### 3. 遍历集合 (forEach)

结合 `Iterable.forEach` 方法，遍历列表不再需要写 `for` 循环。

```java
List<String> list = Arrays.asList("Java", "Python", "C++");

// 传统 for-each
for (String lang : list) {
    System.out.println(lang);
}

// Lambda
list.forEach(lang -> System.out.println(lang));
```



#### 4. 结合 Stream API 过滤和转换数据

这是 Lambda 最强大、最常用的场景。你可以用极少的代码完成复杂的数据处理。

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6);

// 需求：找出所有偶数，将其平方，并收集到新的列表中
List<Integer> evenSquares = numbers.stream()
    .filter(n -> n % 2 == 0)      // Predicate: 过滤偶数
    .map(n -> n * n)              // Function: 转换为平方
    .collect(Collectors.toList());

System.out.println(evenSquares); // 输出: [4, 16, 36]
```

> **核心总结**：不要把 Lambda 想得太复杂，它就是一个“能被当作参数传递的轻量级方法”。当你在调用某个方法，发现它需要传入一个只包含一个方法的接口时，就是使用 Lambda 的绝佳时机。



### 4. 方法引用

**方法引用（Method Reference）** 是 Java 8 引入的另一个重量级特性，使用双冒号 `::` 作为操作符。

如果说 Lambda 表达式是为了消除“匿名内部类”的样板代码，那么**方法引用就是为了进一步消除“Lambda 表达式”的样板代码**。

#### 1. 核心原理

**方法引用的本质是 Lambda 表达式的语法糖。**

当你的 Lambda 表达式里面**仅仅只是在调用一个已经存在的方法**，除此之外没有任何其他逻辑时，你连 Lambda 都可以不写了，直接把这个现成的方法“引用”过来用。

编译器会自动帮你推断参数类型和返回值，将传入的参数原封不动地传递给这个被引用的方法。



#### 2. 应用场景

方法引用主要分为四种使用形式，我们可以通过对比 Lambda 写法来直观感受它的简洁：

##### 1. 引用静态方法 (`类名::静态方法名`)

当你需要的操作已经由某个类的静态方法实现了，可以直接引用。

- **场景**：找出两个数中的最大值。
- **Lambda 写法**：`(a, b) -> Math.max(a, b)`
- **方法引用写法**：`Math::max`

```java
// 使用 Function 接口，输入一个 String，输出转换后的 Integer
Function<String, Integer> parserLambda = s -> Integer.parseInt(s);
Function<String, Integer> parserRef = Integer::parseInt;

System.out.println(parserRef.apply("100")); // 输出: 100
```

##### 2. 引用特定对象的实例方法 (`对象实例::实例方法名`)

当你有一个现成的对象，你想用这个对象里的某个普通方法来处理数据时。

- **场景**：打印输出。这里 `System.out` 就是一个现成的 `PrintStream` 对象，我们要调用它的 `println` 方法。
- **Lambda 写法**：`str -> System.out.println(str)`
- **方法引用写法**：`System.out::println`

```java
List<String> list = Arrays.asList("A", "B", "C");

// Lambda
list.forEach(s -> System.out.println(s));

// 方法引用
list.forEach(System.out::println);
```

##### 3. 引用特定类型的任意对象的实例方法 (`类名::实例方法名`)

**这是最容易让人绕晕的一种！**

虽然语法看起来像是在调用静态方法（因为前面是类名），但它引用的其实是**实例方法**。

它的工作原理是：**Lambda 表达式的第一个参数会成为调用这个实例方法的“目标对象”，其余参数会作为该方法的参数。**

- **场景 1 (无额外参数)**：计算字符串长度。
  - **Lambda 写法**：`s -> s.length()` （`s` 是被调用的目标对象）
  - **方法引用写法**：`String::length`
- **场景 2 (有额外参数)**：比较两个字符串是否相等。
  - **Lambda 写法**：`(s1, s2) -> s1.equals(s2)` （`s1` 是目标对象，`s2` 是传入 `equals` 的参数）
  - **方法引用写法**：`String::equals`

```java
List<String> words = Arrays.asList("apple", "banana", "cat");

// 需求：将所有单词转换为大写
// Lambda: word -> word.toUpperCase()
// 方法引用: String::toUpperCase
List<String> upperWords = words.stream()
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

##### 4. 引用构造方法 (`类名::new`)

当你需要创建一个对象，并且 Lambda 表达式只是单纯地 `new` 了一个对象并返回时。

- **场景**：无参构造。
  - **Lambda 写法**：`() -> new ArrayList<String>()`
  - **方法引用写法**：`ArrayList::new`
- **场景**：有参构造。
  - **Lambda 写法**：`name -> new Person(name)`
  - **方法引用写法**：`Person::new` （编译器会根据上下文自动匹配需要几个参数的构造方法）

```java
// Supplier 无输入，返回一个 ArrayList
Supplier<List<String>> listSupplierLambda = () -> new ArrayList<>();
Supplier<List<String>> listSupplierRef = ArrayList::new;

List<String> list = listSupplierRef.get();
```

**总结：什么时候该用？**:

- **用**：当你的 Lambda 表达式只是个“传话筒”（接收参数 -> 原封不动交给另一个方法 -> 返回结果）时，果断使用方法引用，代码看起来会像自然语言一样流畅。
- **不用**：如果你的 Lambda 里面除了调用方法，还需要对参数进行**加工**（比如加减乘除、拼接字符串），或者需要调用**多个方法**，那就老老实实写 Lambda 表达式。