---
title: 9.枚举类
description: Java枚举（Enum）
pubDate: 2026-10-10
series: Java
order: 9
source: Java/类/2.枚举类
---

# Java 枚举（Enum）

**枚举是一种特殊的类，它限定了实例的数量：一个枚举类型的所有可能取值，在编译期就完全确定，运行期不可能多出一个。**

先看不用枚举的写法——常量类：

```java
public class CarriageConstant {
    public static final Integer SAME_CITY = 1;      // 同城寄
    public static final Integer SAME_PROVINCE = 2;  // 省内寄
    public static final Integer ECONOMIC_ZONE = 3;  // 经济区互寄
    public static final Integer TRANS_PROVINCE = 4; // 跨省
}
```

业务方法里这样用：

```java
if (templateType == CarriageConstant.ECONOMIC_ZONE) { ... }
```

它能工作，但有四个隐患：

| 隐患 | 具体场景 |
|---|---|
| **类型不安全** | 参数是 `Integer`，任何 int 都能传进来——`saveTemplate(99)` 编译器不报错，运行到深处才出现诡异的"类型不匹配" |
| **表达力为零** | 日志里打出 `templateType=3`，没人知道 3 是什么；排查问题要翻常量类 |
| **行为无处安放** | "经济区互寄要检查关联城市"这类**类型专属逻辑**只能写成散落的 if-else，逻辑和数据分家 |
| **取值集合不可枚举** | 想遍历"所有模板类型"生成下拉框？常量类做不到，只能再维护一个数组——两份数据，迟早不同步 |

枚举把这四个问题一次解决：

```java
public enum CarriageTypeEnum {
    SAME_CITY(1, "同城寄"),
    SAME_PROVINCE(2, "省内寄"),
    ECONOMIC_ZONE(3, "经济区互寄"),
    TRANS_PROVINCE(4, "跨省");

    private final Integer code;
    private final String value;

    CarriageTypeEnum(Integer code, String value) {
        this.code = code;
        this.value = value;
    }
    public Integer getCode() { return code; }
    public String getValue() { return value; }
}
```

方法签名变成 `saveTemplate(CarriageTypeEnum type)`——传 99？编译不过。这是枚举最本质的价值：**把"合法取值集合"从纪律问题（靠人遵守）变成类型问题（编译器强制）**。



## 一. 语法

**1. 最简形式**

```java
public enum Season {
    SPRING, SUMMER, AUTUMN, WINTER
}
```

四个"实例"（规范上叫**枚举常量**）默认都是 `public static final`，写法上省略了修饰符。可以直接 `Season.SPRING` 引用，也可以 `for (Season s : Season.values())` 遍历。



**2. 带属性和方法的形式**

```java
public enum TransportLineEnum {
    // ↑ 第一件事：枚举常量必须写在最前面，第一个分号之前
    TRUNK_LINE(1, "干线", "一级转运中心到一级转运中心"),
    BRANCH_LINE(2, "支线", "一级转运中心与二级转运中心之间线路"),
    CONNECT_LINE(3, "接驳路线", "二级转运中心到网点");

    // ↓ 然后才是普通类的成员：属性、构造器、方法
    private final Integer code;
    private final String value;
    private final String desc;

    // 构造器必须是 private（不写也默认 private）——外界不能 new，实例只在常量清单里产生
    TransportLineEnum(Integer code, String value, String desc) {
        this.code = code;
        this.value = value;
        this.desc = desc;
    }

    public Integer getCode() { return code; }
    public String getValue() { return value; }
    public String getDesc() { return desc; }
}
```

**四条语法铁律：**

1. **枚举常量清单永远是第一段代码**，结尾用 `;` 与后续成员分隔。常量列表为空时 `;` 可省略。
2. **构造器只能是 private**。`new TransportLineEnum(...)` 是编译错误——枚举实例的数量和取值被永久锁死，这正是"单例的天然多例版"。
3. **常量后面带括号 = 调用构造器**。`TRUNK_LINE(1, "干线", "...")` 相当于"new 一个自己并传入参数"。多个构造器可以重载，不同常量可以调不同构造器。
4. **枚举隐式继承了 `java.lang.Enum`**，所以不能再 `extends` 任何类；但可以实现多个接口。



**属性要不要 final？要不要 setter？**

**推荐全部 `private final` + 只有 getter**。理由：

- 枚举的语义是"一组固定的常量"，每个常量的属性在定义时确定后就不该变；
- 如果提供 setter，任何拿到枚举引用的代码都能把 `TRUNK_LINE` 的名字改成"干線"，污染全局——枚举实例是天然全局共享的（见下文单例特性），可变枚举是并发事故温床。

记住一个原则：**枚举属性描述的是"这个常量是什么"，而不是"这个对象当前的状态"**。需要可变状态，用普通类。



## 二. Enum 继承的方法

所有枚举自动拥有这些能力，它们是遍历、查找、比较的基础：

```java
TransportLineEnum e = TransportLineEnum.TRUNK_LINE;

// 1. 遍历所有常量（按定义顺序返回数组）
TransportLineEnum[] all = TransportLineEnum.values();
// → [TRUNK_LINE, BRANCH_LINE, CONNECT_LINE]

// 2. 按名字查找（字符串 → 枚举），找不到抛 IllegalArgumentException
TransportLineEnum e1 = TransportLineEnum.valueOf("TRUNK_LINE");

// 3. 名字和序号（ordinal = 定义位置，从 0 开始）
e.name();     // "TRUNK_LINE"  —— final，不可覆盖
e.ordinal();  // 0

// 4. 比较：枚举是单例，直接 == 或 equals 都行
e == TransportLineEnum.TRUNK_LINE;      // true，推荐写法（无 NPE 风险）
e.compareTo(TransportLineEnum.BRANCH_LINE); // 按 ordinal 排序，负数表示在前

// 5. name() 和 toString()
e.name();       // 永远返回常量名，final
e.toString();   // 默认也是常量名，但【可以覆盖】（如返回中文"干线"）
```

**两个重要的实践提醒：**

- **`valueOf` 要防御**：传入不存在的名字直接抛异常。数据库里存的字符串可能被人为改坏，用 try-catch 或工具方法包裹。
- **不要持久化 `ordinal()`**：它依赖"定义顺序"，往中间插入一个新常量，后面所有常量的 ordinal 全部平移，已落库的旧数据瞬间语义错乱。持久化用自带的 code 属性，永远。



## 三. 进阶语法

### 1. 实现接口

项目里所有枚举实现同一个接口，是工程化枚举的第一步：

```java
public interface BaseEnum {
    Integer getCode();
    String getValue();
}

public enum TransportLineEnum implements BaseEnum {
    ...
    @Override
    public Integer getCode() { return code; }
    @Override
    public String getValue() { return value; }
}
```

收益立现：**所有枚举可以被同一套泛型代码处理**。比如写一个通用的"code 反查枚举"工具，接受任何实现 BaseEnum 的类型（见 4.3）。



### 2. 抽象方法 / 常量类体

**每个常量有自己的行为**

这是枚举最惊艳的语法：可以在**单个常量后面**写 `{ ... }`，覆盖父类的抽象方法：

```java
public enum Calculator {
    ADD {
        @Override
        public int apply(int a, int b) { return a + b; }
    },
    SUB {
        @Override
        public int apply(int a, int b) { return a - b; }
    };

    // 枚举里声明抽象方法后，每个常量必须实现它
    public abstract int apply(int a, int b);
}
```

本质：每个带 `{}` 的常量是匿名子类实例。适用场景是"每个常量有**一段专属逻辑**"（如不同订单类型走不同的计算分支）。逻辑复杂到几十行时，改用策略模式 + Map 分发更清爽——枚举常量体只适合短小逻辑。



### 3. 枚举实现单例

```java
public enum ConfigHolder {
    INSTANCE;

    private Map<String, String> config;

    public String get(String key) { return config.get(key); }
}
```

JVM 保证枚举实例唯一，且**天然防反射攻击和反序列化破坏**（JDK 对枚举序列化有特殊处理，反序列化不创建新实例）。写复杂单例的 double-check、防反射机制前，先想想枚举是不是更简单。



### 4. 集合工具：EnumMap / EnumSet

```java
// 以枚举为 key 的 Map：内部用数组实现，比 HashMap 快、省内存
Map<TransportLineEnum, Integer> countMap = new EnumMap<>(TransportLineEnum.class);

// 枚举集合：位向量实现
Set<Season> warm = EnumSet.of(Season.SPRING, Season.SUMMER);
EnumSet<Season> all = EnumSet.allOf(Season.class);
```

枚举做 key 时优先用 EnumMap——性能好是一方面，更重要的是它**表达了"key 必然是这几个值"的设计意图**。



## 四. code 与枚举的互转

真实项目里，枚举活在三个世界：**Java 内存（枚举实例）、数据库/HTTP（数字或字符串 code）、前端界面（中文描述）**。枚举工程化的大部分工作量，就是打理这三个世界的转换。

**标准转换三元组**

一个成熟的业务枚举，固定提供两个静态方法和一个约定：

```java
public enum TransportLineEnum implements BaseEnum {
    TRUNK_LINE(1, "干线", "..."),
    ...;

    private final Integer code;
    ...  // 属性、构造器、getter 省略

    /**
     * code → 枚举：数据库里读出的数字反查成枚举
     * 【重点】返回 null 而不是抛异常，把"不认识"当成正常业务分支处理
     */
    public static TransportLineEnum codeOf(Integer code) {
        return EnumUtil.getBy(TransportLineEnum::getCode, code);
    }
}
```

`EnumUtil.getBy` 是 hutool 的工具：遍历常量、用方法引用提取 code、比对返回枚举，找不到返回 null。不用 hutool 的话，等价手写：

```java
public static TransportLineEnum codeOf(Integer code) {
    for (TransportLineEnum e : values()) {
        if (e.getCode().equals(code)) {
            return e;
        }
    }
    return null;  // 或抛异常，看业务语义（见下）
}
```



## 五. 业务逻辑中的典型用法

### 模式 1：替代 if-else 常量判断——最基础的用法

```java
// 校验类型合法性 + 起终点业务规则
TransportLineEnum lineEnum = TransportLineEnum.codeOf(transportLine.getType());
if (ObjectUtil.isEmpty(lineEnum)) {
    throw new SLException(ExceptionEnum.TRANSPORT_LINE_TYPE_ERROR);
}
if (ObjectUtil.equals(startOrganId, endOrganId)) {
    throw new SLException(ExceptionEnum.TRANSPORT_LINE_ORGAN_CANNOT_SAME);
}
```

注意代码里没有任何 `== 2` 这样的魔法数字——**魔法数字的全部知识都封在枚举定义里**，改"支线的编码"只动一处。

### 模式 2：枚举承载"类型专属"的数据结构

当每个类型关联一组配置时，把配置收进枚举，而不是写配置类再维护 Map：

```java
public enum EconomicRegionEnum {
    // code 是经济区编码，value 是该经济区包含的省份 id 集合
    BTH("2", new Long[]{1L, 7362L, 13267L}),      // 京津冀
    JZS("3", new Long[]{167904L, 191019L, 161792L}), // 江浙沪
    SC("4", new Long[]{545532L, 533328L}),        // 川渝
    HJL("5", new Long[]{145665L, 145665L, 115224L}); // 黑吉辽

    private final String code;
    private final Long[] value;
    ...
}
```

业务判断因此变得一行流：

```java
// 收发两省是否同属一个经济区：遍历枚举即可，无需查库、无需读配置文件
for (EconomicRegionEnum region : EnumUtil.getEnumMap(EconomicRegionEnum.class).values()) {
    boolean hit = ArrayUtil.containsAll(region.getValue(), senderProvinceId, receiverProvinceId);
    if (hit) { ... }
}
```

适用边界：**少量、稳定、与代码同生命周期的配置**。经常运营调整的配置（如运费价格）必须落库，不能塞枚举——枚举改值要发版。

### 模式 3：switch 分发——枚举与 switch 是天作之合

```java
switch (lineEnum) {          // switch 的括号里直接放枚举变量
    case TRUNK_LINE: {       // case 后直接写常量名【不带枚举前缀】，写了反而编译错
        firstNode = OLTEntity.builder().bid(startOrganId).build();
        endNode  = OLTEntity.builder().bid(endOrganId).build();
        break;
    }
    case BRANCH_LINE: { ... break; }
    case CONNECT_LINE: { ... break; }
    // 不需要 default 时可以不写——漏了哪个 case，IDE 会标黄警告
    default: throw new SLException(ExceptionEnum.TRANSPORT_LINE_TYPE_ERROR);
}
```

三个细节：

1. **case 不写枚举类名前缀**（写 `case TransportLineEnum.TRUNK_LINE` 是编译错误），编译器已知 switch 目标类型。
2. **枚举 switch 有"穷尽检查"**：不用 default 时，漏掉任何一个常量，IDE 和编译器都会提醒。这让"新增常量后找到所有该改的分支"从回忆题变成编译提示——是枚举对可维护性最大的隐性贡献。
3. 每个分支务必 `break`（或 return/throw），忘 break 的穿透是历史悠久的 bug 源。

### 模式 4：异常信息枚举——错误码的统一治理

```java
public enum ExceptionEnum implements BaseExceptionEnum {
    ORGAN_NOT_FOUND(1001, "机构不存在"),
    TRANSPORT_LINE_ALREADY_EXISTS(1003, "路线已经存在"),
    TRANSPORT_LINE_TYPE_ERROR(1005, "路线类型错误");
    ...
    public static ExceptionEnum codeOf(Integer code) {
        return EnumUtil.getBy(ExceptionEnum::getCode, code);
    }
}
```

抛错处不再写 `new SLException(1005, "路线类型错误")`——字符串散落各处迟早文案不一、错码重复。统一成 `throw new SLException(ExceptionEnum.TRANSPORT_LINE_TYPE_ERROR)` 后：

- **全局搜索枚举名 = 该错误的全部抛出点**，排查效率倍增；
- 全局异常处理器按 `getCode()/getValue()` 统一序列化成响应；
- 新人加错误码时，看看已有编号规律（1001、1002……）自然对齐，**枚举清单本身就是错误码登记表**。

### 模式 5：状态机——订单/任务流转的核心建模

```java
public enum OrderStatus {
    CREATED(1, "已创建"),
    PICKED(2, "已取件"),
    IN_TRANSIT(3, "运输中"),
    DELIVERED(4, "已签收"),
    CANCELLED(5, "已取消");

    public boolean canTransitTo(OrderStatus target) {
        switch (this) {
            case CREATED:    return target == PICKED || target == CANCELLED;
            case PICKED:     return target == IN_TRANSIT;
            case IN_TRANSIT: return target == DELIVERED;
            default:         return false;   // 终态不可再流转
        }
    }
}
```

把"什么状态能变到什么状态"封装在枚举自己的方法里，Service 里的状态更新就成了一行断言：

```java
if (!order.getStatus().canTransitTo(nextStatus)) {
    throw new SLException(ExceptionEnum.STATUS_TRANSIT_ERROR);
}
```

这是"逻辑和数据不分家"（第二节常量类问题 3）的正面示范——物流项目的运单状态、任务状态全程贯穿这套模式。

### 模式 6：枚举 + 反射/注解——框架级应用

枚举常量可以贴注解，配合反射读出来用：

```java
public enum HandlerType {
    @Mapping("/sameCity")  SAME_CITY,
    @Mapping("/province")  SAME_PROVINCE;
}

// 运行时按注解值路由
for (HandlerType t : HandlerType.values()) {
    Mapping m = t.getClass().getField(t.name()).getAnnotation(Mapping.class);
    routeTable.put(m.value(), t);
}
```

枚举自身也是反射操作的一等公民（`EnumUtil.getEnumMap` 按定义顺序返回常量 Map、`@Order` 决定注入顺序等）。这条线走深了就是注解驱动框架的原理。
