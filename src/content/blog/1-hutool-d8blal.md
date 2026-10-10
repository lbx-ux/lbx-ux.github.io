---
title: 1.hutool工具类
description: HuTool工具类使用手册
pubDate: 2026-10-10
series: 工具
order: 1
source: 工具/1.hutool工具类
---

# HuTool 工具类使用手册

Hutool 的设计非常优秀，它采用了**模块化**的设计理念。你可以选择引入包含所有功能的“全家桶”，也可以为了精简项目体积，按需引入具体的单一模块。

**1.引入“全家桶”（最省事）**

如果你不想去记各个功能在哪个模块里，或者项目对依赖包大小没有极度苛刻的要求，直接引入 `hutool-all` 是最方便的。

```xml
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>5.8.26</version>
</dependency>
```

**2.按需引入单一模块（推荐对体积敏感的项目）**

Hutool 被拆分成了十几个子项目，按需引入可以有效避免引入多余的依赖。比如，你只需要用到字符串处理、日期操作和 ID 生成，这部分都集中在核心包 `hutool-core` 中，你只需要引入这一个：

```xml
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-core</artifactId>
    <version>5.8.26</version>
</dependency>
```

**常用核心模块速查表**：

为了方便你按需引入，这里列出 Hutool 拆分出来的几个最常用的独立模块，你可以根据需要将 `artifactId` 替换成对应的名称：

| **模块名称 (artifactId)** | **包含的主要功能**                                           |
| ------------------------- | ------------------------------------------------------------ |
| **`hutool-core`**         | 核心基础模块（包含 `StrUtil`, `DateUtil`, `IdUtil`, `Convert`, `BeanUtil` 等绝大多数常用工具） |
| **`hutool-crypto`**       | 加密解密模块（包含 `SecureUtil`，支持 MD5、AES、RSA 等加解密） |
| **`hutool-http`**         | HTTP 客户端模块（包含 `HttpUtil`，用于网络请求下载文件等）   |
| **`hutool-poi`**          | 办公文档处理模块（包含 `ExcelUtil` 等。**注意**：使用此模块通常还需要你在项目中额外引入 Apache POI 依赖） |
| **`hutool-json`**         | JSON 处理模块（包含 `JSONUtil`，可以优雅地操作 JSON 树）     |
| **`hutool-captcha`**      | 图片验证码生成模块（生成图形验证码、线段干扰验证码等）       |



## 一. StrUtil - 字符串工具

核心价值：**所有方法都做了 null 安全处理**，不会抛 NPE。

### 判空

| 方法 | 说明 |
|---|---|
| `isEmpty(str)` | 是否为 null 或 `""`（不包含空格） |
| `isBlank(str)` | 是否为 null、`""` 或纯空白字符 |
| `hasBlank(str1, str2, ...)` | **任一**字符串是空白即返回 true，多参数校验常用 |

```java
StrUtil.isEmpty(null);        // true
StrUtil.isEmpty(" ");         // false，空格不算 empty
StrUtil.isBlank(" ");         // true
StrUtil.hasBlank(name, phone, address);  // 批量校验，任一为空返回 true
```



### 格式化

```java
// {} 占位符，比 String.format 的 %s 好读
String msg = StrUtil.format("运单号：{}，当前状态：{}", "SL123456", "运输中");
// "运单号：SL123456，当前状态：运输中"
```



### 比较

```java
// null 安全的 equals：StrUtil.equals(null, null) 返回 true，不抛异常
StrUtil.equals(str1, str2);
StrUtil.equalsIgnoreCase("ABC", "abc");   // true

// 前后缀判断，Any 版本支持多值
StrUtil.startWithAny(organName, "北京", "上海");  // 任一前缀匹配即 true
StrUtil.endWith("xxx分拣中心", "分拣中心");         // true
StrUtil.contains("顺丰速运", "速运");               // true
```



### 拆分与拼接

```java
// split 返回 List<String>（JDK 的 split 返回数组，还要自己处理空元素）
List<String> parts = StrUtil.split("a,b,c", ',');          // [a, b, c]
List<String> nums = StrUtil.split("1, 2, ,3", ',');        // 自动忽略空元素

// 拼接集合
String joined = StrUtil.join(",", "a", "b", "c");          // "a,b,c"

// 截取：支持负数索引（-1 表示倒数第一个）
StrUtil.sub("abcdef", 2, 4);       // "cd"
StrUtil.sub("abcdef", 0, -2);      // "abcd"
StrUtil.subBefore("a.jpg", ".", true);   // 取最后一个 . 之前 → "a"
StrUtil.subAfter("a.b.jpg", ".", true);  // 取最后一个 . 之后 → "jpg"
StrUtil.subBetween("《Java》", "《", "》"); // "Java"
```



### 其他常用

```java
StrUtil.upperFirst("name");              // "Name" 首字母大写
StrUtil.fillBefore("5", '0', 3);         // "005" 左填充（生成编号常用）
StrUtil.fillAfter("5", '0', 3);          // "500"
StrUtil.repeat("ab", 3);                 // "ababab"
StrUtil.removeAll("a-b-c", '-');         // "abc" 移除指定字符
StrUtil.toUnderlineCase("orderNo");      // "order_no" 驼峰转下划线
StrUtil.toCamelCase("order_no");         // "orderNo" 下划线转驼峰
StrUtil.nullToDefault(null, "默认值");    // null 时返回默认值
StrUtil.isNumeric("12345");              // true，纯数字校验
int len = StrUtil.byteLength("中文", CharsetUtil.CHARSET_UTF_8);  // 6，按字节算长度
```



## 二. ObjectUtil - 对象工具

超越字符串的通用判空：支持 **String、集合、Map、数组、Optional、Iterator** 等。

```java
// 万能判空：null / "" / 空集合 / 空数组 / 空Map 都是 empty
ObjectUtil.isEmpty(obj);
ObjectUtil.isNotEmpty(list);

// 批量判断
ObjectUtil.hasEmpty(a, b, c);         // 任一为空 → true
ObjectUtil.isAllEmpty(a, b);          // 全部为空 → true

// null 安全的相等比较（内部处理了类型和 null）
ObjectUtil.equal(obj1, obj2);
ObjectUtil.notEqual(status1, status2);
ObjectUtil.equalsAny(organType, OrganTypeEnum.AGENCY, OrganTypeEnum.OLT);  // 等于其中之一

// 默认值
ObjectUtil.defaultIfNull(maybeNull, defaultValue);
ObjectUtil.defaultIfBlank(str, "未命名");   // 空白时返回默认值

// 其他
ObjectUtil.length("abc");              // 3，字符串/数组/集合的长度
ObjectUtil.isBasicType(10);            // true，是否基本类型（含包装类）
```

> ⚠️ 区别：`ObjectUtil.isEmpty(str)` 对 `" "`（带空格）返回 false；要求把空格也算空时用 `StrUtil.isBlank`。



## 三. CollUtil - 集合工具

### 判空

**（永远用它代替 `list != null && list.size() > 0`）**

```java
CollUtil.isEmpty(list);
CollUtil.isNotEmpty(list);
```



### 创建集合

```java
List<String> list1 = CollUtil.newArrayList("a", "b", "c");
List<String> list2 = CollUtil.list(true, "a", "b");   // true=ArrayList，false=LinkedList
Set<String> set = CollUtil.newLinkedHashSet("a", "b"); // 保序 Set
List<String> empty = CollUtil.empty();                 // 不可变空集合
List<String> emptyList = CollUtil.newArrayList();      // 创建可变的空 ArrayList
```



### 集合运算

```java
List<Integer> l1 = CollUtil.newArrayList(1, 2, 3, 4);
List<Integer> l2 = CollUtil.newArrayList(3, 4, 5);

CollUtil.union(l1, l2);               // [1,2,3,4,5] 并集（去重）
CollUtil.unionAll(l1, l2);            // [1,2,3,4,3,4,5] 并集（不去重）
CollUtil.intersection(l1, l2);        // [3,4] 交集
CollUtil.intersectionDistinct(l1, l2);// [3,4] 交集去重
CollUtil.subtract(l1, l2);            // [1,2] 差集（l1 有 l2 没有）
CollUtil.subtractToList(l1, l2);      // 同上，返回新 List
CollUtil.disjunction(l1, l2);         // [1,2,5] 对称差（互相没有的）
```



### 取值与判断

```java
CollUtil.getFirst(list);      // 第一个元素，null 安全（空集合返回 null）
CollUtil.getLast(list);       // 最后一个元素
CollUtil.get(list, -1);       // 支持负索引，等同 getLast
CollUtil.indexOf(list, "a");  // 索引，找不到返回 -1

CollUtil.contains(list, "a");         // null 安全的 contains
CollUtil.containsAll(list1, list2);   // list1 是否包含 list2 全部元素
CollUtil.count(list, n -> n > 2);     // 满足条件的个数
```



### 转换、过滤、分组

```java
// map：对每个元素做转换
List<String> names = CollUtil.map(organList, OrganDTO::getName, false);

// filter：过滤
List<OrganDTO> agencies = CollUtil.filter(organList,
        o -> o.getType() == OrganTypeEnum.AGENCY);

// 分组（按对象某字段）
Map<Long, List<TransportLineNode>> grouped = CollUtil.group(nodes, node -> node.getParentId());

// 提取对象某字段的值，组成新 List
List<Long> bids = CollUtil.getFieldValues(organList, "bid");

// 集合转 Map（按字段做 key）
Map<Long, OrganDTO> bidMap = CollUtil.fieldValueMap(organList, "bid");
// 或用 stream 也行，hutool 版少写一行
```



### 排序与其他

```java
CollUtil.sortByProperty(organList, "sort");   // 按字段排序（字段需实现 Comparable）
CollUtil.distinct(list);                      // 去重
CollUtil.reverse(list);                       // 反转
CollUtil.sort(list, Comparator.comparing(OrganDTO::getName));

// 分片：把大集合切成每份 size 个的小集合（分批处理场景）
List<List<Integer>> pages = CollUtil.split(bigList, 100);

// 拼接
String s = CollUtil.join(list, ",");          // 集合元素用逗号拼接
```



## 四. MapUtil - Map 工具

显式加上 `<String, Object>` 是一种**更规范、更安全**的写法，能彻底避免因类型混杂或推导失败引起的编译问题。

```java
// 创建
Map<String, Object> map = MapUtil.newHashMap();
Map<String, Object> sized = MapUtil.newHashMap(16);
Map<String, Integer> m = MapUtil.of("a", 1, "b", 2);   // k-v 对，快速构建

// builder 链式构建（key 较多时可读性好）
Map<String, Object> params = MapUtil.<String,Object>builder("orderId", 123L)
        .put("status", 1)
        .put("type", "EXPRESS")
        .build();

// 判空
MapUtil.isEmpty(map);
MapUtil.isNotEmpty(map);

// 取值带默认值 / 类型转换
MapUtil.getStr(map, "name");                 // 取 String
MapUtil.getInt(map, "age", 18);              // 取 Integer，null 时给默认值
MapUtil.getLong(map, "orderId");

// 删除多个 key，返回删除的 entry
MapUtil.removeAny(map, "k1", "k2");

// Map 转字符串 "k1=v1,k2=v2"
MapUtil.join(map, ",", "=");

// 过滤：保留满足条件的 entry
Map<String, Integer> filtered = MapUtil.filter(m, entry -> entry.getValue() > 0);
```



## 五. BeanUtil - 转换工具

### toBean

**Map → Bean、Bean → Bean（最常用）**

```java
// Map 转 Bean（字段名相同自动映射）
Map<String, Object> map = MapUtil.of("bid", 1L, "name", "北京营业部");
AgencyDTO dto = BeanUtil.toBean(map, AgencyDTO.class);

// Bean 转 Bean（如 Entity → DTO）
OrganEntity entity = organService.queryByBid(bid);
OrganDTO dto = BeanUtil.toBean(entity, OrganDTO.class);

// 支持自定义拷贝选项
OrganDTO dto2 = BeanUtil.toBean(entity, () -> new OrganDTO(),
        CopyOptions.create().setIgnoreError(true));

// 嵌套对象/集合也能转（内部走类型转换器）
```

```java
BeanUtil.toBeanIgnoreError(orderMsg, CourierTaskMsg.class);
```

创建一个 `CourierTaskMsg` 的新实例，并将 `orderMsg` 中的同名属性值复制过去；如果在赋值或类型转换过程中出错，直接忽略错误继续处理，不会抛出异常。



### copyProperties

**把属性拷贝到已有对象（更新场景）**

```java
// 把前端提交的修改数据拷贝到查库得到的 entity 上
BeanUtil.copyProperties(updateData, entity,
        CopyOptions.create()
                .ignoreNullValue()                       // 忽略 null 字段（部分更新）
                .setIgnoreProperties("id", "bid"));      // id/bid 不允许被改
```



### 其他

```java
BeanUtil.beanToMap(dto);                    // Bean → Map
BeanUtil.beanToMap(dto, new LinkedHashMap<>(), false, "id");  // 排除 id 字段

BeanUtil.getProperty(dto, "name");          // 反射读属性，支持 "a.b.c" 嵌套
BeanUtil.setProperty(dto, "name", "新值");   // 反射写属性

List<OrganDTO> dtoList = BeanUtil.copyToList(entityList, OrganDTO.class);  // 集合批量转换
```



## 六. Convert - 类型转换工具

安全转换的统一入口：**转换失败返回 null（或默认值），不抛异常**。

```java
// 数字族
Long orderId = Convert.toLong("123456");            // String → Long
Long safe = Convert.toLong(request.getParam(), 0L); // 失败/为 null 时返回默认值 0
Integer num = Convert.toInt("123");
Double price = Convert.toDouble("3.14");
Float f = Convert.toFloat("1.5");
BigDecimal bd = Convert.toBigDecimal("3.1415926");
Number n = Convert.toNumber("123");

// 字符串
String s = Convert.toStr(12345);                     // "12345"
String def = Convert.toStr(maybeNull, "默认");        // null 时给默认

// 布尔（比 Boolean.parseBoolean 宽容："是/y/yes/on/1/true" 都算 true）
Boolean b = Convert.toBool("yes");                   // true

// 字符
char c = Convert.toChar("abc");                      // 'a' 取首字符

// 集合转换：字符串自动按逗号拆分后逐个转换
List<Long> ids = Convert.toList(Long.class, "1,2,3");   // [1, 2, 3]

// Bean 转换：Map → Bean（等价 BeanUtil.toBean）
AgencyDTO dto = Convert.convert(AgencyDTO.class, map);

// 字节数组（如序列化场景）
byte[] bytes = Convert.toPrimitiveByteArray(obj);
```



## 七. NumberUtil - 数字工具

核心价值：**基于 BigDecimal 计算，避免 float/double 精度丢失**——金额计算必用。

```java
// 四则运算（参数可以是 Number、String、BigDecimal，返回 BigDecimal）
BigDecimal total = NumberUtil.add("0.1", "0.2");       // 0.3（double 直接算是 0.30000000000000004）
BigDecimal diff  = NumberUtil.sub(a, b);
BigDecimal area  = NumberUtil.mul(weight, price);      // 运费 = 重量 × 单价
BigDecimal avg   = NumberUtil.div(total, count, 2);    // 保留 2 位
BigDecimal div   = NumberUtil.div(a, b, 2, RoundingMode.DOWN);  // 指定舍入模式

// 四舍五入
BigDecimal round = NumberUtil.round(3.1415926, 2);     // 3.14（默认 HALF_UP）
String rs = NumberUtil.roundStr(3.1415926, 2);         // "3.14"

// 格式化（ DecimalFormat 风格）
String fmt = NumberUtil.decimalFormat("#,##0.00", 1234567.891);  // "1,234,567.89"

// 大小比较
NumberUtil.isGreater(a, b);            // a > b
NumberUtil.isGreaterOrEqual(a, b);     // a >= b
NumberUtil.equals(bd1, bd2);           // BigDecimal 的值相等比较（不能用 ==）

// 校验
NumberUtil.isNumber("3.14");           // true，数字校验
NumberUtil.isInteger("123");           // true
NumberUtil.isLong("123456789012");     // true
NumberUtil.isDouble("1.5");            // true

// 其他
BigDecimal bd = NumberUtil.toBigDecimal("123");   // 转 BigDecimal
String s = NumberUtil.toStr(new BigDecimal("3.10")); // "3.1" 去尾零
NumberUtil.max(list);  NumberUtil.min(list);      // 集合最大最小值
```

> ⚠️ 金额、运费等涉及钱的计算，**全程 BigDecimal/NumberUtil，禁止 double 直接运算**。`div` 注意除零风险，必要时先校验除数。



## 八. DateUtil - 日期工具 

### 获取当前时间

```java
Date now = DateUtil.date();                 // 当前时间（返回 DateTime 对象）
DateTime now2 = DateUtil.now();             // 同上
String nowStr = DateUtil.current();         // "2026-09-26 10:30:00" 当前时间字符串
long ts = DateUtil.currentLong();           // 当前毫秒时间戳
```



### 解析

```java
Date d1 = DateUtil.parse("2026-09-26 10:30:00");       // 自动识别 yyyy-MM-dd HH:mm:ss
Date d2 = DateUtil.parse("2026/09/26", "yyyy/MM/dd");  // 指定格式
Date d3 = DateUtil.parseDate("2026-09-26");            // 只有日期
LocalDateTime ldt = DateUtil.parseLocalDateTime("2026-09-26 10:30:00");

// 与 JDK 类型互转
Instant ins = DateUtil.toInstant(date);
Calendar cal = DateUtil.calendar(date);
```



### 格式化

```java
String s1 = DateUtil.format(date);                        // "2026-09-26 10:30:00"
String s2 = DateUtil.format(date, "yyyy-MM-dd");          // "2026-09-26"
String cn = DateUtil.formatChineseDate(date, false, true);// 二〇二六年九月二十六日 10:30:00
```



### 偏移计算

```java
Date tomorrow   = DateUtil.offsetDay(now, 1);
Date yesterday  = DateUtil.offsetDay(now, -1);
Date in2Hours   = DateUtil.offsetHour(now, 2);          // 延迟队列的触发时间
Date nextMonth  = DateUtil.offsetMonth(now, 1);
Date offset     = DateUtil.offset(now, DateField.MINUTE, 30);  // 任意字段

// 链式写法（DateTime 自带方法）
String threeDaysLater = DateUtil.date().offsetDay(3).toString("yyyy-MM-dd");

// 一天的开始/结束（查询某天数据范围常用）
Date dayStart = DateUtil.beginOfDay(now);    // 2026-09-26 00:00:00
Date dayEnd   = DateUtil.endOfDay(now);      // 2026-09-26 23:59:59
Date weekStart = DateUtil.beginOfWeek(now);  // 周一 00:00:00
Date weekEnd   = DateUtil.endOfWeek(now);
Date monthStart = DateUtil.beginOfMonth(now);
Date monthEnd   = DateUtil.endOfMonth(now);
```



### 时间差

```java
long days = DateUtil.between(begin, end, DateUnit.DAY);   // 相差天数
long mins  = DateUtil.between(begin, end, DateUnit.MINUTE);
long betDays = DateUtil.betweenDay(d1, d2, true);         // true=重置时分秒
long months  = DateUtil.betweenMonth(d1, d2, true);
int age     = DateUtil.age(birthday, null);               // 年龄（第二个参数 null=当前）
```



### 取字段与判断

```java
int year  = DateUtil.year(now);
int month = DateUtil.month(now);        // ⚠️ 0-based！1月返回 0，实际用要 +1
int day   = DateUtil.dayOfMonth(now);
int hour  = DateUtil.hour(now, true);   // true=24小时制
int dow   = DateUtil.dayOfWeek(now);    // ⚠️ 周日=1 ... 周六=7

DateUtil.isWeekend(now);                // 是否周末
DateUtil.isLeapYear(2024);              // 是否闰年
DateUtil.isSameWeek(d1, d2, true);      // 是否同一周（true=周一算一周开始）
DateUtil.compare(d1, d2);               // d1 > d2 返回正数
int weekNo = DateUtil.weekOfYear(now);  // 一年中第几周
int dayNo  = DateUtil.dayOfYear(now);   // 一年中第几天
```



### 与 "HH:mm:ss" 互转

```java
int seconds = DateUtil.timeToSecond("01:30:05");   // 5405
String time = DateUtil.secondToTime(5405);          // "01:30:05"
```



## 九. JSONUtil - JSON 工具

```java
// 对象 → JSON 字符串
String json = JSONUtil.toJsonStr(organDTO);

// JSON 字符串 → 对象
JSONObject obj = JSONUtil.parseObj("{\"type\":\"ORG\",\"operation\":\"ADD\"}");
OrganDTO dto = JSONUtil.toBean(json, OrganDTO.class);           // 字符串直接转 Bean
List<OrganDTO> list = JSONUtil.parseArray(jsonArrayStr, OrganDTO.class);  // 数组转 List<Bean>

// 手动操作 JSONObject（类似 Map，类型安全的取值）
JSONObject jo = JSONUtil.createObj();          // 新建
jo.set("type", "ORG")                          // set 返回 this，可链式
  .set("content", Collections.emptyList());

String type = obj.getStr("type");
int size = obj.getInt("size", 0);              // 带默认值
Long id = obj.getLong("id");
JSONObject content = obj.getJSONObject("content");
JSONArray arr = obj.getJSONArray("content");
SmsEntity sms = obj.getBean("data", SmsEntity.class);   // 取嵌套 Bean

// 解析数组
JSONArray arr2 = JSONUtil.parseArray("[1,2,3]");
String item = arr2.getStr(0);

// 按路径取值（嵌套结构不用一层层 get）
Object v = JSONUtil.getByPath(obj, "data.order.bid");

// 解析为通用对象后 instanceof 判断
Object parsed = JSONUtil.parse(jsonStr);
```



## 十. EnumUtil - 枚举工具

```java
enum OrganTypeEnum {
    AGENCY(1, "网点"),
    OLT(2, "一级转运中心"),
    TLT(3, "二级转运中心");

    private final int code;
    private final String desc;
    // 构造器 + getter ...
}
```

```java
// 按 code 查枚举（lambda 指定匹配字段，找不到返回 null，不抛异常）
OrganTypeEnum type = EnumUtil.getBy(OrganTypeEnum.class,
        e -> e.getCode() == 1);                        // AGENCY

// 按 code 查枚举的另一个字段：找到 code==1 的枚举，返回它的 desc
String desc = EnumUtil.getFieldBy(OrganTypeEnum::getDesc,
        OrganTypeEnum.class, 1);                       // "网点"

// 全部枚举转 Map：key=name，value=枚举实例
Map<String, OrganTypeEnum> map = EnumUtil.getEnumMap(OrganTypeEnum.class);

// 全部枚举转 List
List<OrganTypeEnum> all = EnumUtil.getEnumList(OrganTypeEnum.class);

// 按名称解析，找不到返回 null（比 Enum.valueOf 安全，不会抛异常）
OrganTypeEnum t = EnumUtil.fromStringQuietly(OrganTypeEnum.class, "OLT");
```



## 十一. IdUtil - ID 生成工具

```java
// 雪花算法（分布式 ID，项目生成运单号等场景）
Snowflake snowflake = IdUtil.getSnowflake();          // 默认 workerId/datacenterId 自动获取
long id = snowflake.nextId();                          // 1753517781235691520，趋势递增
String idStr = snowflake.nextIdStr();                  // 字符串版

// 快捷方法（5.7+）
long nextId = IdUtil.getSnowflakeNextId();

// 指定机器号、机房号（多节点部署时避免重复，一般从配置读）
Snowflake sf = IdUtil.getSnowflake(1, 1);

// UUID
String uuid = IdUtil.randomUUID();          // 带横杠："36e7f4d0-xxxx-xxxx-xxxx-xxxxxxxx"
String simple = IdUtil.simpleUUID();         // 无横杠：长度 32，做文件名/缓存 key 常用
String fast = IdUtil.fastUUID();             // 性能更好的带横杠版（使用了 ThreadLocalRandom）

```

- ID生成

  - `IdUtil.fastSimpleUUID()`：生成不带横线的高性能 UUID。
  - `IdUtil.getSnowflakeNextId()`：生成全局唯一的雪花算法 ID（返回 Long），做数据库主键的主流方案。

- **随机数**：

  - `RandomUtil.randomInt(min, max)`：生成指定范围的随机整数。

  - `RandomUtil.randomString(length)`：生成指定长度的随机字母+数字字符串（常用于生成验证码、随机盐值）。

  - `RandomUtil.randomLong(min,max)`：生成一个在指定范围内的随机Long值。方法生成的范围是左闭右开区间

    - ```java
      long randomJitter = RandomUtil.randomLong(1L, 6L);
      ```



## 十二. RandomUtil - 随机工具

```java
int i = RandomUtil.randomInt(100);            // [0, 100) 随机整数
int j = RandomUtil.randomInt(10, 20);         // [10, 20)
int[] nums = RandomUtil.randomNumbers(6, 1, 33);  // 6 个 [1,33) 的随机数（抽奖/摇号）

String str = RandomUtil.randomString(8);      // 8 位小写字母+数字随机串
String upper = RandomUtil.randomStringUpper(8);

// 从集合/数组中随机取一个
String[] names = {"A", "B", "C"};
String pick = RandomUtil.randomEle(names);

double d = RandomUtil.randomDouble(2);        // 保留 2 位小数的随机数
```



## 十三. BooleanUtil - 布尔工具

```java
// null 安全判断（Boolean 可能为 null 时必用，避免自动拆箱 NPE）
Boolean flag = queryStatus();          // 可能返回 null
if (BooleanUtil.isTrue(flag)) { }      // null → false，安全
if (BooleanUtil.isFalse(flag)) { }     // null → false，安全

// 宽容解析（类似 Convert.toBool）
BooleanUtil.toBoolean("yes");          // true，支持 y/yes/true/1/on/是
BooleanUtil.toBoolean("0");            // false
BooleanUtil.toBoolean(1);              // true

// 布尔运算（数组）
BooleanUtil.and(true, true, false);    // false，全部为 true 才 true
BooleanUtil.or(true, false);           // true，任一为 true 即 true
BooleanUtil.not(true);                 // false
```



## 十四. TreeUtil - 树结构工具

```java
// 把平铺列表按 parentId 组装成树，0L 是根节点的父 id
List<OrganDTO> organList = organService.findAll(null);
List<Tree<Long>> tree = TreeUtil.build(organList, 0L, (organDTO, node) -> {
    node.setId(organDTO.getId());
    node.setParentId(organDTO.getParentId());
    node.setName(organDTO.getName());
    node.putExtra("bid", organDTO.getBid());     // 自定义扩展字段
});

// Tree 对象常用操作
Tree<Long> root = tree.get(0);
List<Tree<Long>> children = root.getChildren();  // 子节点
String json = JSONUtil.toJsonStr(tree);          // 直接序列化给前端
```

需要自定义字段名时用 `TreeNodeConfig`（`config.setIdKey("key")` 等）。



## 十五. LocalDateTimeUtil

`LocalDateTimeUtil` 是 Hutool 工具包针对 Java 8+ 的 `java.time` API（如 `LocalDateTime`、`LocalDate`、`Instant` 等）封装的日期时间工具类。

标准 JDK 8 的 `java.time` API 性能强且线程安全，但在进行类型转换、跨类型计算或获取特定时间点（如当天的开始/结束时间）时代码较为繁琐。`LocalDateTimeUtil` 通过丰富的静态方法简化了这些日常开发操作。

**1. 格式化与解析 (Format & Parse)**

无需手动创建 `DateTimeFormatter`，即可快速进行时间与字符串的互转：

```java
// 1.1 格式化为字符串
LocalDateTime now = LocalDateTime.now();
String format1 = LocalDateTimeUtil.formatNormal(now); 
// 输出: "2026-09-28 11:30:00"

String format2 = LocalDateTimeUtil.format(now, "yyyy/MM/dd HH:mm:ss"); 
// 输出: "2026/09/28 11:30:00"

// 1.2 字符串解析为 LocalDateTime
LocalDateTime time1 = LocalDateTimeUtil.parse("2026-09-28 11:30:00");
LocalDateTime time2 = LocalDateTimeUtil.parse("2026/09/28 11:30:00", "yyyy/MM/dd HH:mm:ss");
```



**2. 类型转换 (Type Conversions)**

解决传统 `java.util.Date`、时间戳（`long`）、`Instant` 与 `LocalDateTime` 间频繁转换的痛点：

```java
// 2.1 Date / 时间戳转 LocalDateTime
Date date = new Date();
LocalDateTime dateTimeFromDate = LocalDateTimeUtil.of(date);
LocalDateTime dateTimeFromMilli = LocalDateTimeUtil.of(System.currentTimeMillis());

// 2.2 LocalDateTime 转 时间戳 / Date
long epochMilli = LocalDateTimeUtil.toEpochMilli(dateTimeFromDate);
// 或转换回 Instant
Instant instant = LocalDateTimeUtil.toInstant(dateTimeFromDate);
```



**3. 获取时间边界 (Begin / End Bounds)**

快速获取当天、当月等时间段的开始或结束时间点（如数据库按日/月查询时非常实用）：

```java
LocalDateTime now = LocalDateTime.now();

// 获取今天的开始时间 (2026-09-28T00:00:00)
LocalDateTime beginOfDay = LocalDateTimeUtil.beginOfDay(now);

// 获取今天的结束时间 (2026-09-28T23:59:59.999999999)
LocalDateTime endOfDay = LocalDateTimeUtil.endOfDay(now);

// 获取所在月的开始/结束时间
LocalDate today = LocalDate.now();
LocalDate beginOfMonth = LocalDateTimeUtil.beginOfMonth(today); // 2026-09-01
LocalDate endOfMonth = LocalDateTimeUtil.endOfMonth(today);     // 2026-09-30
```



**4. 时间差与时间偏移 (Between & Offset)**

获取两个时间点之间的差距或进行加减运算：

```java
LocalDateTime start = LocalDateTimeUtil.parse("2026-09-01 00:00:00");
LocalDateTime end = LocalDateTimeUtil.parse("2026-09-28 12:00:00");

// 4.1 计算时间差 (Duration)
Duration duration = LocalDateTimeUtil.between(start, end);
long days = duration.toDays(); // 27 天

// 指定单位计算差值
long hours = LocalDateTimeUtil.between(start, end, ChronoUnit.HOURS); // 660 小时

// 4.2 时间偏移（加减时间）
LocalDateTime futureTime = LocalDateTimeUtil.offset(start, 3, ChronoUnit.DAYS); // 增加 3 天
```



**5. 时间区间重叠判断 (Overlap Check)**

用于判断两个时间段是否存在交叉/重叠（如预约系统校验时间冲突）：

```java
LocalDateTime start1 = LocalDateTimeUtil.parse("2026-09-01 10:00:00");
LocalDateTime end1 = LocalDateTimeUtil.parse("2026-09-01 12:00:00");

LocalDateTime start2 = LocalDateTimeUtil.parse("2026-09-01 11:00:00");
LocalDateTime end2 = LocalDateTimeUtil.parse("2026-09-01 13:00:00");

// 判断 [start1, end1] 与 [start2, end2] 是否存在重叠
boolean isOverlap = LocalDateTimeUtil.isOverlap(start1, end1, start2, end2); 
// 结果: true
```





## 十六. StreamUtil

Hutool 的 **`StreamUtil`**（位于 `cn.hutool.core.stream.StreamUtil`）专为增强 Java 8+ 的原生 `java.util.stream.Stream` 而设计。

它的核心价值在于：**极大简化了各种数据源（Iterator、Iterable、文本、文件）转换为 Stream 的繁琐步骤，并扩展了多流拼接与字符串分割等实用功能。**

**快速创建 Stream (`StreamUtil.of`)**

原生 JDK 中，将 `Iterator` 或 `Iterable` 转为 `Stream` 需要调用 `StreamSupport.stream(...)`，代码非常冗长。`StreamUtil.of` 统一了各种数据源的转 Stream 入口。

```java
import cn.hutool.core.stream.StreamUtil;
import java.util.*;
import java.util.stream.Stream;

// 1. 从 Iterable / Collection 创建
List<String> list = Arrays.asList("A", "B", "C");
Stream<String> stream1 = StreamUtil.of(list);

// 2. 从 Iterator 创建（原生 JDK 极繁琐，Hutool 一行搞定）
Iterator<String> iterator = list.iterator();
Stream<String> stream2 = StreamUtil.of(iterator);

// 3. 从 Spliterator 创建
Spliterator<String> spliterator = list.spliterator();
Stream<String> stream3 = StreamUtil.of(spliterator);

// 4. 从变长参数 / 数组创建
Stream<Integer> stream4 = StreamUtil.of(1, 2, 3, 4, 5);
```



**多流合并 (`StreamUtil.concat`)**

原生 JDK 的 `Stream.concat(a, b)` 每次只能合并 **2 个** Stream，若要合并 3 个以上必须层层嵌套。`StreamUtil.concat` 支持一次性合并**任意多个** Stream。

```java
Stream<String> streamA = Stream.of("A", "B");
Stream<String> streamB = Stream.of("C", "D");
Stream<String> streamC = Stream.of("E", "F");

// 一次性拼接多个 Stream
Stream<String> combined = StreamUtil.concat(streamA, streamB, streamC);

// 输出: [A, B, C, D, E, F]
List<String> result = combined.toList(); 
```



## 十七. hutool-crypto

Hutool 提供了静态工具类 `DigestUtil`，可以一行代码搞定。

**场景一：生成 32 位 MD5 字符串（最常见**）

将普通字符串转换为 32 位的十六进制 MD5 密文（默认全小写）。

```java
// 结果: 3f677fb652eb6f4bbbcbc42167de7ea0
String md5Hex = DigestUtil.md5Hex("Hello Hutool"); 
```

**场景二：生成 16 位 MD5 字符串**

在某些老系统或支付接口（如微信支付的某些验签），可能会要求 16 位的 MD5。16 位实际上就是提取了 32 位 MD5 的中间 16 位（第 9 位到第 24 位）。

```java
String md5Hex16 = DigestUtil.md5Hex16("Hello Hutool");
```

**场景三: 使用 `MD5` 对象 (加盐、多次散列)**

如果你的场景更复杂，比如为了防止黑客使用“彩虹表”破解密码，你需要对密码进行**加盐（Salt）\**或者\**多次散列**，你可以直接使用 `MD5` 类。

```java
public class Md5AdvancedDemo {
    public static void main(String[] args) {
        String password = "my_password_123";
        String salt = "random_salt_!@#";

        // 创建 MD5 对象
        // 参数1: 盐值的 byte 数组
        // 参数2: 散列的次数 (哈希次数越多，暴力破解成本越高，这里设为 2 次)
        MD5 md5 = MD5.create()
                     .setSalt(salt.getBytes())
                     .setDigestCount(2); 

        // 执行摘要并返回十六进制字符串
        String securePassword = md5.digestHex(password);
        System.out.println(securePassword);
    }
}
```



**新旧密码对比**

MD5 的特点是：**相同的明文 + 相同的盐，必定生成相同的密文。**

所以，对比逻辑是：将用户输入的新密码，用**同样的规则（加相同的盐）再 MD5 加密一次**，然后比对两个密文字符串是否相等。

```java
// 假设这是从数据库中查出来的旧密码密文和盐
String dbEncryptedOldPwd = "旧的密文字符串"; 
String dbSalt = "user_salt_123";

// 1. 用户输入了新密码，我们需要检查它是不是和旧密码一样
String userInputNewPwd = "new_password_123";

// 2. 按照数据库中旧密码的相同规则，对新密码进行加密
MD5 md5 = MD5.create().setSalt(dbSalt.getBytes());
String inputEncryptedNewPwd = md5.digestHex(userInputNewPwd);

// 3. 对比两次的密文是否相等
if (inputEncryptedNewPwd.equals(dbEncryptedOldPwd)) {
    System.out.println("修改失败：新密码与原密码相同！");
} else {
    System.out.println("验证通过：是不同的密码。");
}
```





## 十八. hutool-captcha

Hutool 的 `CaptchaUtil`（位于 `cn.hutool.captcha` 包）是用于生成图形验证码的工具类，封装了线段干扰、圆圈干扰、扭曲干扰及 GIF 动态图形等多种验证码样式，避免了手写 Java2D 绘图代码的繁琐逻辑。

**验证码核心类型**

- **LineCaptcha（线段干扰）**：生成带有随机直线干扰的静态图片验证码。
- **CircleCaptcha（圆圈干扰）**：生成带有随机空心/实心圆圈干扰的静态图片验证码。
- **ShearCaptcha（扭曲干扰）**：生成文字具有波浪扭曲特效与折线干扰的静态图片，防 OCR 识别能力较强。
- **GifCaptcha（GIF 动态）**：生成多帧平滑过渡的 GIF 动态图形验证码，能有效提升防自动化脚本破解的能力。



**Web 场景典型使用流程**

在控制器或 Servlet 中直接将验证码图片写入 HTTP 响应流，并将验证码字符串存入 Session 或 Redis：

```java
// 1. 创建扭曲干扰验证码：宽 200px、高 100px、4 位字符、干扰线粗细 10
ShearCaptcha captcha = CaptchaUtil.createShearCaptcha(200, 100, 4, 10);

// 2. 获取生成的验证码真实文本，存入 Session 或 redis 缓存供后续校验
String code = captcha.getCode();
session.setAttribute("captcha_key", code);

// 3. 将图片直接写入 HTTP 响应输出流呈现在前端
captcha.write(response.getOutputStream());
```



```java
// 输出到页面，设置页面不缓存，这样可以防止Redis保存的验证码和用户看到的验证码不是一个
response.setHeader(HttpHeaders.PRAGMA, "No-cache");
response.setHeader(HttpHeaders.CACHE_CONTROL, "No-cache");
response.setDateHeader(HttpHeaders.EXPIRES, 0L);

captcha.write(response.getOutputStream());
```



有时候标准的验证码不满足要求，比如我们希望使用纯字母的验证码、纯数字的验证码、加减乘除的验证码，此时我们就要自定义`CodeGenerator`

```java
// 自定义纯数字的验证码（随机4位数字，可重复）
RandomGenerator randomGenerator = new RandomGenerator("0123456789", 4);
LineCaptcha lineCaptcha = CaptchaUtil.createLineCaptcha(200, 100);
lineCaptcha.setGenerator(randomGenerator);
// 重新生成code
lineCaptcha.createCode();
```



```java
ShearCaptcha captcha = CaptchaUtil.createShearCaptcha(200, 45, 4, 4);
// 自定义验证码内容为四则运算方式
captcha.setGenerator(new MathGenerator(1));
// 重新生成code
captcha.createCode();
```



**常用 API**

Hutool内部有懒加载机制，当执行captcha.getCode（）时，如果检测到内部尚未生成验证码，它会自动调用createCode（）

| **方法名**                                          | **功能说明**                                           |
| --------------------------------------------------- | ------------------------------------------------------ |
| `createLineCaptcha(w, h, codeCount, lineCount)`     | 创建线段干扰验证码                                     |
| `createCircleCaptcha(w, h, codeCount, circleCount)` | 创建圆圈干扰验证码                                     |
| `createShearCaptcha(w, h, codeCount, thickness)`    | 创建扭曲干扰验证码                                     |
| `createGifCaptcha(w, h, codeCount)`                 | 创建 GIF 动态验证码                                    |
| `write(OutputStream / File)`                        | 将验证码图片写入输出流或磁盘文件                       |
| `getCode()`                                         | 获取当前验证码对应的真实字符或计算结果                 |
| `verify(userInput)`                                 | 校验用户输入的文本是否与验证码匹配（默认不区分大小写） |

```java
boolean verify = new MathGenerator().verify(value, login.getCode());
```



前后端分离项目中，标准的验证码流程是：**后端生成验证码图片和对应 UUID，将验证码文本存入 Redis 并设置过期时间，前端提交请求时带上 UUID 和用户输入的验证码进行校验**。

**1. 引入 Maven 依赖**

在 `pom.xml` 中引入 Spring Web、Spring Data Redis 和 Hutool 依赖：

```xml
<dependencies>
    <!-- Spring Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Data Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!-- Hutool 工具包 -->
    <dependency>
        <groupId>cn.hutool</groupId>
        <artifactId>hutool-all</artifactId>
        <version>5.8.26</version>
    </dependency>
</dependencies>
```

**2. 封装参数实体类**

**验证码响应实体（后端 -> 前端）**

```java
public class CaptchaVO {
    private String uuid;  // 前端标识本次验证码的唯一 Key
    private String image; // Base64 编码的验证码图片

    public CaptchaVO(String uuid, String image) {
        this.uuid = uuid;
        this.image = image;
    }

    // Getter and Setter
    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}
```

**登录/校验请求实体（前端 -> 后端）**

```java
public class LoginDTO {
    private String username;
    private String password;
    private String uuid;        // 前端传回的验证码 Key
    private String captchaCode; // 用户输入的验证码

    // Getter and Setter
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }
    public String getCaptchaCode() { return captchaCode; }
    public void setCaptchaCode(String captchaCode) { this.captchaCode = captchaCode; }
}
```

**3. 控制器实现（生成与校验）**

在此 Controller 中，提供一个获取验证码的接口和一个登录（含验证码校验）的接口：

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private StringRedisTemplate redisTemplate;

    // Redis 前缀与过期时间设置
    private static final String CAPTCHA_PREFIX = "captcha:";
    private static final long CAPTCHA_TTL_MINUTES = 2;

    /**
     * 1. 生成验证码接口
     */
    @GetMapping("/captcha")
    public ResponseEntity<CaptchaVO> getCaptcha() {
        // 创建扭曲干扰验证码（宽130，高48，4位字符，厚度4）
        ShearCaptcha captcha = CaptchaUtil.createShearCaptcha(130, 48, 4, 4);

        // 生成唯一标识 UUID (使用 Hutool 去掉横线的 UUID)
        String uuid = IdUtil.simpleUUID();
        String redisKey = CAPTCHA_PREFIX + uuid;

        // 获取生成的验证码真实字符，存入 Redis，设置 2 分钟过期时间
        String code = captcha.getCode();
        redisTemplate.opsForValue().set(redisKey, code, CAPTCHA_TTL_MINUTES, TimeUnit.MINUTES);

        // 获取 Base64 图片数据（包含 data:image/png;base64, 前缀，前端可直接放入 img src）
        String base64Image = captcha.getImageBase64Data();

        return ResponseEntity.ok(new CaptchaVO(uuid, base64Image));
    }

    /**
     * 2. 提交业务请求（带验证码校验）
     */
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginDTO loginDTO) {
        String uuid = loginDTO.getUuid();
        String userInputCode = loginDTO.getCaptchaCode();

        // 基本校验
        if (uuid == null || userInputCode == null) {
            return ResponseEntity.badRequest().body("验证码参数不能为空");
        }

        String redisKey = CAPTCHA_PREFIX + uuid;
        String savedCode = redisTemplate.opsForValue().get(redisKey);

        // 校验 1：判断是否过期或无效
        if (savedCode == null) {
            return ResponseEntity.badRequest().body("验证码已失效或不存在，请重新获取");
        }

        // 校验 2：单次有效原则（取出后立即从 Redis 中删除，防止爆破复用）
        redisTemplate.delete(redisKey);

        // 校验 3：比对验证码（使用 ignoreCase 忽略大小写差异）
        if (!savedCode.equalsIgnoreCase(userInputCode)) {
            return ResponseEntity.badRequest().body("验证码输入错误");
        }

        // --- 验证通过，执行后续登录业务逻辑 ---
        return ResponseEntity.ok("验证成功，登录成功！");
    }
}
```
