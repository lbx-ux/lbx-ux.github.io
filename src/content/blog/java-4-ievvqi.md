---
title: 4.基础
description: switchswitch是Java中用于处理多分支选择的控制流语句。当需要根据同一个变量的不同取值执行不同代码块时，使用switch通常比层层嵌套的if-else更直观且易于维护。Java中的swit
pubDate: 2026-10-10
series: Java
order: 4
source: Java/4.基础
---

# switch

`switch` 是 Java 中用于处理多分支选择的控制流语句。当需要根据同一个变量的不同取值执行不同代码块时，使用 `switch` 通常比层层嵌套的 `if-else` 更直观且易于维护。

Java 中的 `switch` 语法经历了重要演进，目前分为 **传统 switch 语句**（Java 7 及更早）和 **现代 switch 表达式**（Java 14+ 正式引入）。



## 1. 数据类型

在 `switch(expression)` 中，表达式的结果类型不能是任意类型，必须是以下几种之一：

| **分类**         | **支持的具体类型**                                           |
| ---------------- | ------------------------------------------------------------ |
| **基本数据类型** | `byte`, `short`, `char`, `int`（不支持 `long`, `float`, `double`, `boolean`） |
| **包装类**       | `Byte`, `Short`, `Character`, `Integer`                      |
| **引用类型**     | `Enum`（枚举，Java 5+）、`String`（字符串，Java 7+）         |



## 2. 传统 `switch` 语法

传统语法使用冒号 `:` 分隔 `case` 标签，依赖 `break` 语句来终止执行。

**语法结构**

```java
switch (expression) {
    case value1:
        // 当 expression == value1 时执行
        break; // 跳出 switch 结构
    case value2:
        // 当 expression == value2 时执行
        break;
    default:
        // 当没有任何 case 匹配时执行（可选）
        break;
    }
```

**核心规则与注意事项**

1. **常量限制**：`case` 后面的值必须是**编译期常量**（或字面量），且类型必须与 `switch` 表达式的类型兼容。
2. **Case 穿透（Fall-through）**：如果某个 `case` 分支末尾**没有写 `break`**，程序会无条件地继续执行下一个 `case` 的代码，而不去匹配该 `case` 的条件，直到遇到 `break` 或整个 `switch` 结束。
3. **`default` 分支**：位置通常在最后，但也可以放在中间。若无匹配项且没有 `default`，则 `switch` 不做任何事。



**代码示例**

```java
int day = 3;
String dayName;

switch (day) {
    case 1:
        dayName = "星期一";
        break;
    case 2:
        dayName = "星期二";
        break;
    case 3:
        dayName = "星期三";
        break;
    default:
        dayName = "无效日期";
        break;
}

System.out.println(dayName); // 输出：星期三
```



## 3. 现代 `switch` 表达式

Java 14 引入了基于箭头 `->` 的 `switch` 表达式，显著简化了语法，解决了传统语法中因漏写 `break` 导致的 Bug。

**新特性优势**

- **箭头语法（`->`）**：每个匹配分支只执行对应的单条语句或代码块，**天然禁止 case 穿透**，不再需要手动写 `break`。
- **合并多标签**：支持在单个 `case` 中使用逗号合并多个值。
- **可作为返回值**：`switch` 可以作为有返回值的表达式赋给变量。
- **`yield` 关键字**：当 `case ->` 后需要多行复杂的代码块时，用 `{}` 包裹并使用 `yield` 返回结果。

**代码示例**

```java
int day = 6;

// 1. 直接作为表达式赋值，并合并多标签
String type = switch (day) {
    case 1, 2, 3, 4, 5 -> "工作日";
    case 6, 7          -> "周末";
    default             -> "无效日期";
};

// 2. 在多行代码块中使用 yield
String description = switch (day) {
    case 6, 7 -> {
        System.out.println("检测到周末...");
        yield "休息日"; // 类似于 return，返回值给表达式
    }
    default -> "工作日";
};
```



## 4. 对比

| **特性**         | **传统 switch (分支控制)**   | **现代 switch (表达式)**     |
| ---------------- | ---------------------------- | ---------------------------- |
| **分隔符**       | `case value:`                | `case value ->`              |
| **跳出机制**     | 必须显式写 `break`           | 自动结束，防止穿透           |
| **多标签支持**   | 必须写多个 `case` 堆叠       | 支持逗号分隔：`case A, B ->` |
| **返回值**       | 只能作为控制语句，不能返回值 | 可以作为表达式返回值         |
| **代码块返回值** | 不适用                       | 使用 `yield`                 |