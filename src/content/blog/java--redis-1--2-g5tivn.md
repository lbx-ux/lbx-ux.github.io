---
title: 二. BitMap
description: 一.BitMap1.BitMap介绍我们按月来统计用户签到信息，签到记录为1，未签到则记录为0.把每一个bit位对应当月的每一天，形成了映射关系。用0和1标示业务状态，这种思路就称为位图（BitMap
pubDate: 2026-08-23
series: Redis
order: 2
sort: 25
source: Java后端/数据库/Redis/1.基础/2. 特殊类型.md
---

# 一. BitMap

## 1. BitMap介绍

我们按月来统计用户签到信息，签到记录为1，未签到则记录为0.

把每一个bit位对应当月的每一天，形成了映射关系。用0和1标示业务状态，这种思路就称为位图（BitMap）。这样我们就用极小的空间，来实现了大量数据的表示

Redis中是利用string类型数据结构实现BitMap，因此最大上限是512M，转换为bit则是 2^32个bit位。

![1653824498278](/covers/java--redis-1--2-g5tivn/1653824498278.webp)



在 Redis 中，**Bitmap（位图）** 并不是一种独立的数据结构，而是基于 **String（字符串）** 类型实现的一组面向位（Bit）的操作。

你可以把 Bitmap 想象成一个以 `0` 开始的超大数组，数组里面的每个元素只能存储 `0` 或 `1`。因为 Redis 的 String 类型最大可以达到 512 MB，所以一个 Bitmap 最多可以容纳 2^32（约 42.9 亿）个位。

这种数据结构的魅力在于**极高的空间利用率**和**超快的计算速度**，尤其适合处理大量的布尔值（是/否）状态。

**常用命令**：

Bitmap 的操作非常精简，主要围绕各位的读写和统计：

| **命令**          | **作用**                                                     | **示例与说明**                                               |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`SETBIT`**      | 设置某一位的值（0或1）                                       | `SETBIT key offset value`。返回该位原来的值。                |
| **`GETBIT`**      | 获取某一位的值                                               | `GETBIT key offset`。如果 offset 超出范围，返回 0。          |
| **`BITCOUNT`**    | 统计被设置为 1 的位数量                                      | `BITCOUNT key [start end]`。注意：start 和 end 是**字节**索引，不是位索引。（加上bit 就是位索引了） |
| **`BITOP`**       | 对多个 Bitmap 进行位运算                                     | `bitop operation destkey key [key...]` 支持 `AND` (交集)、`OR` (并集)、`XOR` (异或)、`NOT` (非)。结果存入新 key。 |
| **`BITPOS`**      | 查找第一个为 0 或 1 的位                                     | `BITPOS key bit [start end]`。                               |
| **`BITFIELD`**    | 操作（查询，修改，自增）BitMap中bit数组中的指定位置（offset）的值 |                                                              |
| **`BITFIELD_PO`** | 获取BitMap中bit数组，并以十进制返回                          |                                                              |



**经典应用场景**：

Bitmap 最适合的场景通常包含两个特点：**数据量巨大**且**状态仅有两种（0/1）**。

**1. 用户签到打卡**

如果用传统数据库记录用户的签到状态，几千万用户每天打卡会产生海量数据。使用 Bitmap，可以用**一个用户对应一个 key**。

- **设计**：`key` 为 `sign:user:{user_id}:2026`，`offset` 为当年的第几天（0-365）。
- **操作**：用户今天打卡，执行 `SETBIT key 209 1`（假设今天是第209天）。
- **空间消耗**：记录一个用户一整年的签到状态，只需 365 bit，大约 **46 字节**。100 万用户也才占用不到 50 MB 内存。

**2. 统计日活 (DAU) 与留存率**

与签到场景反过来，这里是**每一天对应一个 key**。

- **设计**：`key` 为 `active:20260729`，`offset` 为用户的 ID（整数）。
- **操作**：用户 ID 为 10086 的用户登录，执行 `SETBIT active:20260729 10086 1`。
- **统计日活**：执行 `BITCOUNT active:20260729` 即可瞬间得出今天有多少用户登录。
- **计算留存率 / 连续活跃**：使用 `BITOP`。例如，想要知道昨天和今天都登录的用户数，只需要对两天的 key 执行 `BITOP AND result_key day1 day2`，然后再对 `result_key` 做 `BITCOUNT`。

**3.用户行为属性标签**

可以用 Bitmap 来记录某个用户是否拥有某个属性（例如：是否是 VIP、是否点赞过某篇文章、是否已读某条公告）。



**Bitmap 的优缺点分析**

**优势**

- **极限节省内存**：对于连续且密集的数据，1 亿个布尔值只占用约 12 MB 内存。
- **效率极高**：位运算直接在内存中执行，速度极快。
- **支持集合操作**：通过 `BITOP` 可以非常方便地实现交集、并集运算。

**劣势（数据稀疏问题）**

Bitmap 最大的敌人是**数据稀疏**。

因为 Bitmap 的内存分配是根据最大 `offset` 来的。假设你初始化了一个全新的 Bitmap，然后只执行了一条命令：`SETBIT key 1000000000 1`（将第 10 亿位设为 1）。

为了这**1个比特**的 1，Redis 需要在内存中开辟近 **120 MB** 的空间（前面的位自动补 0）。如果你的用户 ID 分布极不连续（比如使用 UUID 或者雪花算法生成的长整型 ID），直接当做 offset 会造成巨大的内存浪费。



## 2. 整合SpringBoot

在 Spring Data Redis 中，`SETBIT` 和 `GETBIT` 可以直接通过 `opsForValue()` 调用，但 `BITCOUNT`、`BITOP` 和 `BITPOS` 属于相对底层的位操作，需要通过 `RedisCallback` 获取原生的 `RedisConnection` 来执行。

1. `SETBIT` 和 `GETBIT` 可以像普通 String 类型一样，直接使用 `stringRedisTemplate.opsForValue()` 进行操作。
2. 对于 `BITCOUNT`、`BITOP` 和 `BITPOS`，你需要通过 `stringRedisTemplate.execute()` 开启 `RedisCallback`，获取到原生的 `connection`。
3. 原生的 `connection` 在处理 key 时，需要转换成字节数组（例如 `key1.getBytes()`），这是因为底层的 Redis 驱动只认识 byte。

```java
@Service
public class BitmapExampleService {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    public void bitmapOperationsDemo() {
        String key1 = "active:20260728";
        String key2 = "active:20260729";
        String destKey = "active:both_days";

        // 1. SETBIT (设置某一位的值)
        // 对应命令：SETBIT key offset value
        stringRedisTemplate.opsForValue().setBit(key1, 1001, true); // 用户1001在28日活跃
        stringRedisTemplate.opsForValue().setBit(key1, 1002, true); // 用户1002在28日活跃
        stringRedisTemplate.opsForValue().setBit(key2, 1001, true); // 用户1001在29日活跃

        // 2. GETBIT (获取某一位的值)
        // 对应命令：GETBIT key offset
        Boolean isUser1001Active = stringRedisTemplate.opsForValue().getBit(key2, 1001);
        Boolean isUser1003Active = stringRedisTemplate.opsForValue().getBit(key2, 1003);
        System.out.println("   用户1001是否活跃: " + isUser1001Active);
        System.out.println("   用户1003是否活跃: " + isUser1003Active);
        // 输出示例: 
        //    用户1001是否活跃: true
        //    用户1003是否活跃: false


        // 3. BITCOUNT (统计被设置为 1 的位数量)
        // 对应命令：BITCOUNT key
        Long activeCount = stringRedisTemplate.execute((RedisCallback<Long>) connection -> 
            connection.stringCommands().bitCount(key1.getBytes())
        );
        System.out.println("\n3. BITCOUNT统计的活跃总人数: " + activeCount);
        // 输出示例: 3. BITCOUNT统计的活跃总人数: 2


        // 4. BITOP (对多个 Bitmap 进行位运算)
        // 对应命令：BITOP AND destkey key [key ...]
        stringRedisTemplate.execute((RedisCallback<Long>) connection -> 
            connection.bitOp(
                RedisStringCommands.BitOperation.AND, // 运算操作 (AND/OR/XOR/NOT)
                destKey.getBytes(),                   // 目标key
                key1.getBytes(),                      // 源key1
                key2.getBytes()                       // 源key2
            )
        );
        Long bothDaysActiveCount = stringRedisTemplate.execute((RedisCallback<Long>) connection -> 
            connection.bitCount(destKey.getBytes())
        );
        System.out.println("\n4. BITOP计算连续两天活跃的人数(求交集): " + bothDaysActiveCount);
        // 输出示例: 4. BITOP计算连续两天活跃的人数(求交集): 1


        // 5. BITPOS (查找第一个为 0 或 1 的位)
        // 对应命令：BITPOS key bit
        Long firstActiveUserOffset = stringRedisTemplate.execute((RedisCallback<Long>) connection -> 
            connection.bitPos(key1.getBytes(), true) // true代表查找 1，false代表查找 0
        );
        System.out.println("\n5. BITPOS查找第一个活跃的用户的偏移量: " + firstActiveUserOffset);
        // 输出示例: 5. BITPOS查找第一个活跃的用户的偏移量: 1001
    }
}
```





## 3. 实现签到功能

需求：实现签到接口，将当前用户当天签到信息保存到Redis中

思路：我们可以把年和月作为bitMap的key，然后保存到一个bitMap中，每次签到就到对应的位上把数字从0变成1，只要对应是1，就表明说明这一天已经签到了，反之则没有签到。

**用户今日签到**：

- **接口描述**：记录当前登录用户在今日的签到状态（基于 Redis Bitmap）。

- **请求 URL**：`/user/sign`

- **请求方式**：`POST`

- **请求头 (Request Headers)**：

  | 参数名          | 参数值                 | 是否必填 | 说明           |
  | :-------------- | :--------------------- | :------- | :------------- |
  | `authorization` | `session-token-string` | 是       | 用户登录 Token |

- **响应数据示例 (成功)**：

  ```json
  {
    "code": 200,
    "message": "操作成功",
    "data": null
  }
  ```



**UserServiceImpl**

```java
    @Override
    public void sign() {
        Long id = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        String keySuffix = now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
        String key = "sign:" + id + keySuffix;
        int day = now.getDayOfMonth();
        Boolean isSign = stringRedisTemplate.opsForValue().setBit(key, day - 1, true);
        if(BooleanUtil.isTrue(isSign)){
            throw new BusinessException("您今天已经签到过了");
        }
    }
```

- 在这个业务逻辑里面要不要判断用户是否已经签到了


结论：**不强求，取决于你的业务需求，但最好加上防重逻辑（利用 `setBit` 的返回值）。**

**具体分析：**

1. **从底层的角度（不判断也没事）：**
   Redis 的 `setBit` 操作是**幂等**的。如果用户今天已经签到了（这一位已经是 `1`），你再执行一次 `setBit(..., true)`，依然是 `1`，不会报错，也不会影响签到天数的统计。

2. **从业务的角度（建议判断）：**
   如果你后续要加业务逻辑，比如**“签到送积分”**，如果不判断，用户疯狂发请求，就会被无限刷积分。另外，从前端交互来看，如果用户已经签到了，接口最好能返回个提示（如：“今天已经签过到了~”）。

最佳实践写法（一行代码搞定，不需要额外查一次）

你**不需要**先去 `getBit` 查一次，再 `setBit`（那样会有并发问题且多一次网络开销）。
因为 Redis 的 `setBit` 命令本身就会**返回该位原本的值（旧值）**。

你可以把你的代码改成这样：

```java
// setBit 会返回修改前的值。如果是 true，说明原来就是 1，今天已经签到过了
Boolean isSign = stringRedisTemplate.opsForValue().setBit(key, day - 1, true);

if (Boolean.TRUE.equals(isSign)) {
    // 抛出异常，或者返回错误 Result 给前端
    return Result.error("您今天已经签到过了！");
}

// 下面可以继续写送积分、发优惠券的逻辑...
```



### 日期操作

#### 1. 获取当前时间

```java
LocalDateTime now = LocalDateTime.now();
```

- 用于获取系统当前本地的精确日期和时间（包含年月日时分秒）。

#### 2. 格式化年月

```java
String key = "sign" + userId + now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
```

- 使用了 `DateTimeFormatter` 对刚才获取的 `now` 进行格式化。
  - `yyyy`：代表 4 位数的年份（如 2023、2024）。
  - `MM`：代表 2 位数的月份（如 01、08、12）。
  - `:`：仅仅是作为一个字符串分隔符，方便在 Redis 中按层级查看 Key。
  - **例如：** 如果今天是 2026 年 8 月，这部分格式化出来的结果就是 `:202608`。

#### 3. 获取当前是本月的第几天

```java
int day = now.getDayOfMonth();
```

- `getDayOfMonth()` 方法会从当前日期中提取出“日”的部分，返回一个 `1` 到 `31` 之间的整数（例如 8 月 13 日签到，`day` 的值就是 13）



## 4. 签到统计

### 1. 总共签到天数

结论：统计本月一共签到了几天，直接使用 Redis 的 `BITCOUNT` 命令即可。

在基于 Redis Bitmap（位图）的签到方案中，一个用户一个月的签到记录本质上是一串二进制数（比如 `1101001`，1 代表签到，0 代表没签到）。

- **连续签到**：需要用 `BITFIELD` 命令把二进制串拿出来，在 Java 里自己写 `while` 循环进行位运算，碰到 `0` 就停止。
- **累计签到（一共签到几天）**：非常简单，Redis 原生提供了一个 `BITCOUNT` 命令，它会直接告诉你这串二进制里**总共有多少个 `1`**。



统计当月累计签到天数

- **请求 URL**：`/user/sign/total`

- **请求方式**：`GET`

- **请求头 (Request Headers)**：

  | 参数名          | 参数值                 | 是否必填 | 说明           |
  | :-------------- | :--------------------- | :------- | :------------- |
  | `authorization` | `session-token-string` | 是       | 用户登录 Token |

- **响应数据示例 (成功)**：

  ```json
  {
    "code": 200,
    "message": "操作成功",
    "data": 12
  }
  ```

**具体实现代码 (Java)**

由于 Spring 的 `StringRedisTemplate.opsForValue()` 并没有直接封装 `BITCOUNT`，我们需要通过回调底层 Connection 来实现：

```java
   @Override
    public Integer signTotal() {
        Long id = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        String keySuffix = now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
        String key = "sign:" + id + keySuffix;
        Long res = stringRedisTemplate.execute(
                (RedisCallback<Long>) connection -> connection.stringCommands().bitCount(key.getBytes())
        );
        return res==null?0:res.intValue();
    }  
```



**总结对比**

| 需求                         | Redis 命令             | 实现逻辑                                                     | 性能      |
| :--------------------------- | :--------------------- | :----------------------------------------------------------- | :-------- |
| **累计签到**（本月共几天）   | `BITCOUNT key`         | 由 Redis 引擎直接计算该 Key 中 `1` 的总数，直接返回结果。    | 极快 O(N) |
| **连续签到**（本月连签几天） | `BITFIELD key GET ...` | 从 Redis 拿回今天的二进制数字串，在 Java 里通过 `& 1` 和 `>>> 1` 的位运算，碰到第一个 `0` 截止。 | 极快 O(1) |



### 2. 连续签到天数

**问题1：**什么叫做连续签到天数？
从最后一次签到开始向前统计，直到遇到第一次未签到为止，计算总的签到次数，就是连续签到天数。

![1653834455899](/covers/java--redis-1--2-g5tivn/1653834455899.webp)

Java逻辑代码：获得当前这个月的最后一次签到数据，定义一个计数器，然后不停的向前统计，直到获得第一个非0的数字即可，每得到一个非0的数字计数器+1，直到遍历完所有的数据，就可以获得当前月的签到总天数了

**问题2：如何从后向前遍历每个bit位？**

注意：bitMap返回的数据是10进制，哪假如说返回一个数字8，那么我哪儿知道到底哪些是0，哪些是1呢？我们只需要让得到的10进制数字和1做与运算就可以了，因为1只有遇见1 才是1，其他数字都是0 ，我们把签到结果和1进行与操作，每与一次，就把签到结果向右移动一位，依次内推，我们就能完成逐个遍历的效果了。



统计**连续签到天数**（从今天往前倒推，遇到没签到的天数就中断）的经典做法是利用 Redis 的 `BITFIELD` 命令结合 Java 的**位运算**。

底层逻辑非常简单：**“取数字 -> 循环看最后一位是不是 1 -> 抛弃最后一位继续看”**。

**具体实现步骤：**

**1. 使用 `BITFIELD` 取出从本月 1 号到今天的所有签到记录** 假设今天是本月第 5 天，那么我们可以通过 `BITFIELD key GET u5 0`，拿出一个包含 5 个 bit 的无符号整数（Unsigned）。 比如你这 5 天的签到记录是：`1, 0, 1, 1, 1`，那么取出来的十进制数字就是 `23`（二进制是 `10111`，最后一位代表今天）。

**2. 在 Java 中利用位运算进行右移统计** 拿到这个十进制数字后，在 Java 中通过一个 `while` 循环不断向右移位（`>>> 1`）并判断最后一位是否为 1（`& 1`）。



需求：实现下面接口，统计当前用户截止当前时间在本月的连续签到天数

- **接口描述**：查询当前用户在本月截止到今天为止的连续签到天数。

- **请求 URL**：`/user/sign/count`

- **请求方式**：`GET`

- **请求头 (Request Headers)**：

  | 参数名          | 参数值                 | 是否必填 | 说明           |
  | :-------------- | :--------------------- | :------- | :------------- |
  | `authorization` | `session-token-string` | 是       | 用户登录 Token |

- **响应数据示例 (成功)**：

  ```json
  {
    "code": 200,
    "message": "操作成功",
    "data": 5
  }
  ```

**UserServiceImple**

```java
    @Override
    public Integer signCount() {
        Long id = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        String keySuffix = now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
        String key = "sign:" + id + keySuffix;
        int day = now.getDayOfMonth();
        List<Long> res = stringRedisTemplate.opsForValue().bitField(
                key,
                BitFieldSubCommands.create().get(BitFieldSubCommands.BitFieldType.unsigned(day)).valueAt(0)
        );
        if(res==null||res.isEmpty()){
            return 0;
        }
        // 拿到那个十进制的数字 (例如二进制 10111)
    Long num = res.get(0);
    if (num == 0) {
        return 0;
    }
    // 4. 循环遍历，进行位运算统计连签
    int count = 0;
    while (true) {
        // 让这个数字与 1 做与运算，相当于判断这个数字的二进制最后一位是不是 1
        if ((num & 1) == 0) {
            // 如果最后一位是 0，说明今天（或者往前推的某天）没签到，直接结束连续统计
            break;
        } else {
            // 如果最后一位是 1，说明签到了，计数器 +1
            count++;
        }
        // 把这个数字整体向右移动 1 位（抛弃掉刚刚统计过的最后一位），继续下一次循环
        num >>>= 1;
    }
}
```



```java
List<Long> res = stringRedisTemplate.opsForValue().bitField(
                key,
                BitFieldSubCommands.create().get(BitFieldSubCommands.BitFieldType.unsigned(day)).valueAt(0)
);
```

**1. 核心命令：`bitField`**

```java
stringRedisTemplate.opsForValue().bitField(...)
```

- **作用：** 底层调用的是 Redis 的 `BITFIELD` 命令。不同于之前用来设置单天记录的 `SETBIT` 或获取总数的 `BITCOUNT`，`BITFIELD` 允许你一次性对位图中的一段“连续的比特位”进行读取或修改。

**2. 构造查询子命令：获取无符号整数**

```java
BitFieldSubCommands.create().get(BitFieldSubCommands.BitFieldType.unsigned(day))
```

- **`create().get(...)`：** 表示我们要构造一个读取（GET）的操作。
- **`unsigned(day)`：** 这是最关键的一步。它定义了我们要读取的数据类型和长度。
  - `unsigned` 表示无符号整数。
  - `day` 代表今天所在本月的第几天（比如今天是 13 号，`day` 就是 13）。
  - 连起来的意思是：**我要读取一段长度为 `day`（比如 13）个比特位的数据，并把它当做一个无符号整数来看待。** 底层相当于 Redis 的 `GET u13`。

**3. 指定起始偏移量：从头开始**

```java
.valueAt(0)
```

- **作用：** 指定从位图的哪一个索引（Offset）开始读取。
- **解释：** `0` 代表本月的第 1 天。结合上一步，整句代码的意思变成了：**“从本月第 1 天（索引 0）开始，连续读取 `day` 个比特位。”**

**4. 返回值：`List<Long>`**

```java
List<Long> res = ...
```

- **作用：** 接收 Redis 的返回结果。
- **为什么是 List？** 因为 `BITFIELD` 命令非常强大，支持一次性执行多个 `GET`、`SET` 子命令。虽然我们这里只执行了一个 `get()`，但它的 API 规范仍然返回一个 List。
- **内容：** 我们想要的结果就是这个 List 的第一个元素（即 `res.get(0)`）。如果读取的位图全是 0（尚未初始化），可能会返回 `null` 组成的 List，实际使用中通常需要判空。



# 二. HyperLogLog

**UV（Unique Visitor，独立访客）统计** 是互联网产品中最核心的数据指标之一。

简单来说，**UV 统计的就是“有多少个不同的人访问了你的网站或功能”**。

为了让你更好地理解，我们通常会把它和 **PV** 放在一起对比：

- **PV (Page View，页面浏览量)**：不管是谁，只要页面被打开/刷新了一次，PV 就 +1。如果我今天手贱按了 100 次 F5 刷新你的主页，那你的 PV 就增加了 100。
- **UV (Unique Visitor，独立访客)**：基于用户的唯一标识（比如用户 ID、IP 地址或设备号）来**去重**。哪怕我今天疯狂刷新了 100 次你的主页，对不起，我只算 1 个 UV。

在后端开发中，UV 统计为什么是个“难题”？

既然 UV 的核心是**去重**，那后端程序就必须“记住”今天到底有哪些用户来过。
如果你的网站日活只有几百人，你可以直接把来过的 UserID 塞进 Java 的 `HashSet` 或者 Redis 的 `Set` 里，通过集合天然的不可重复性来得出 UV。

**但是，如果你的产品做大了（比如百万级日活）**：
把 100 万个用户的长整型 ID 全存进 Redis 的 `Set` 里，单单为了统计今天这一个页面的 UV，可能就要耗费几十上百 MB 的内存！一个月就是几个 G！如果有 10 个页面要统计呢？内存直接被撑爆了。



为了解决这种海量数据的去重统计问题，Redis 提供了一个极其神奇的数据结构，叫做 **HyperLogLog (简称 HLL)**，它天生就是用来做 UV 统计的。

**它的核心特点是：**

1. **极致省内存**：无论你放 1 万个用户，还是 1 个亿的用户 ID 进去，它在 Redis 里**最多只占用 12 KB 的内存**！
2. **存在极小误差**：它是基于一种概率算法估算出来的，标准误差率在 `0.81%` 左右。对于 UV 这种宏观统计数据（比如报表上显示 100.2 万人访问和 100.4 万人访问），运营是根本不在乎这千分之八的误差的。

Redis HyperLogLog 的 API 设计非常极简，它的核心命令只有 3 个（所有命令都以 `PF` 开头，是为了纪念这种数据结构算法的发明者 Philippe Flajolet）。

## 1. Redis 命令

### PFADD

- **`PFADD key element [element ...]` (添加元素)**

  将一个或多个用户 ID 存入对应的 key 中。

  *执行逻辑：* 如果这是该用户今天第一次访问，Redis 内部的基数估算发生了变化，会返回 `1`；如果用户今天已经访问过（已被记录），则返回 `0`。

  ```bash
  # 添加今天的 UV 记录
  PFADD uv:2026-07-30 user_101 user_102
  ```


### PFCOUNT

- **`PFCOUNT key [key ...]` (统计数量)**

  获取一个或多个 key 的近似唯一总数（误差率约为 0.81%）。

  ```bash
  # 查看今天有多少独立访客
  PFCOUNT uv:2026-07-30
  ```


### PFMERGE

- **`PFMERGE destkey sourcekey [sourcekey ...]` (合并统计)**

  将多个 HyperLogLog 合并为一个新的 HyperLogLog。

  *核心价值：* 极度适用于统计**周活跃用户 (WAU)** 或 **月活跃用户 (MAU)**。因为你不能简单地把每天的 UV 数量相加（同一个用户可能周一和周二都访问了，直接相加算作 2 个人，但用 `PFMERGE` 合并后，底层算法会自动去重，依然算作 1 个人）。

  ```bash
  # 将周一到周日的 UV 数据，合并到一个"本周总UV"的 key 中
  PFMERGE uv:week_31 uv:2026-07-27 uv:2026-07-28 ...
  ```



## 2. Spring Boot 

在 Java 后端工程中，通常通过 Spring Data Redis 提供的 `StringRedisTemplate` 来操作 HyperLogLog

```java
public void hyperLogLogOperationsDemo() {
    String key1 = "uv:20260728";
    String key2 = "uv:20260729";
    String destKey = "uv:both_days";

    // 1. PFADD (添加元素)
    // 对应命令: PFADD key element [element ...]
    stringRedisTemplate.opsForHyperLogLog().add(key1, "user1001", "user1002"); // 用户1001和1002在28日活跃
    stringRedisTemplate.opsForHyperLogLog().add(key2, "user1001", "user1003"); // 用户1001和1003在29日活跃

    // 2. PFCOUNT (获取近似基数值)
    // 对应命令: PFCOUNT key [key ...]
    Long count1 = stringRedisTemplate.opsForHyperLogLog().size(key1);
    Long count2 = stringRedisTemplate.opsForHyperLogLog().size(key2);
    
    System.out.println("    28日UV数: " + count1);
    System.out.println("    29日UV数: " + count2);
    // 输出示例:
    //      28日UV数: 2
    //      29日UV数: 2

    // 3. PFMERGE (合并多个HyperLogLog)
    // 对应命令: PFMERGE destkey sourcekey [sourcekey ...]
    stringRedisTemplate.opsForHyperLogLog().union(destKey, key1, key2);
    
    // 再次使用 PFCOUNT 获取合并后的总人数
    Long mergedCount = stringRedisTemplate.opsForHyperLogLog().size(destKey);
    
    System.out.println("\n3. PFMERGE合并后的活跃总人数: " + mergedCount);
    // 输出示例: 3. PFMERGE合并后的活跃总人数: 3  (user1001在底层被算法自动去重)
}
```



## 3. 业务实例

**1. 定义 Redis 常量** 

在 `RedisConstants` 中添加 UV 前缀常量：
```java
// UV 统计 key 前缀，完整 key 如: uv:daily:20260814
public static final String UV_DAILY_KEY = "uv:daily:";
```

**2. 在拦截器中收集 UV 数据**

由于 `RefreshTokenInterceptor` 会拦截所有请求，在此处收集最为合适。我们可以通过客户端 IP 或用户 ID 组合来标识唯一访客：

**只有"注册当天"才会出现重复计数**，注册后每天都正常，整体误差极小。加上 HLL 本身就有 0.81% 误差，这个额外误差在统计上完全可以接受。

```java
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 1. 获取请求头中的 token
        String token = request.getHeader("authorization");
        if (StrUtil.isBlank(token)) {
            // 游客状态：用 IP 记录 UV，再放行
            recordUv(request, null);
            return true;
        }

        // 2. 基于 token 获取 Redis 中的用户 Map
        String key = RedisConstants.LOGIN_TOKEN_KEY + token;
        String userJson = stringRedisTemplate.opsForValue().get(key);

        // 3. 判断用户是否存在
        if (StrUtil.isBlank(userJson)) {
            // token 已失效或伪造：用 IP 记录 UV，再放行
            recordUv(request, null);
            return true;
        }

        // 4. 将查询到的数据转回 UserDTO 对象
        UserDTO userDTO = JSONUtil.toBean(userJson, UserDTO.class);

        // 5. 存在，保存用户信息到 UserHolder 线程上下文中
        UserHolder.saveUser(userDTO);

        // 6. 刷新 token 有效期
        stringRedisTemplate.expire(key, RedisConstants.LOGIN_TOKEN_TTL, TimeUnit.MINUTES);
        stringRedisTemplate.expire(RedisConstants.LOGIN_USER_KEY + userDTO.getId(), RedisConstants.LOGIN_USER_TTL, TimeUnit.MINUTES);

        // 7. 已登录：用 userId 记录 UV，再放行
        recordUv(request, userDTO);
        return true;
    }

    /**
     * 记录 UV 到 Redis HyperLogLog
     * - 已登录用户：以 "usr:{userId}" 作为唯一访客标识（跨设备去重）
     * - 游客/token 失效：以 "ip:{clientIP}" 作为唯一访客标识
     *
     * @param request  HTTP 请求，用于获取客户端真实 IP
     * @param userDTO  已登录用户信息，为 null 则表示游客
     */
    private void recordUv(HttpServletRequest request, UserDTO userDTO) {
        try {
            // 确定访客标识
            String visitorId;
            if (userDTO != null) {
                visitorId = "usr:" + userDTO.getId();
            } else {
                // Hutool 会自动处理 X-Forwarded-For、X-Real-IP 等代理头，获取真实 IP
                visitorId = "ip:" + JakartaServletUtil.getClientIP(request);
            }

            // 生成今日 daily key，格式: uv:daily:20260814
            String dailyKey = RedisConstants.UV_DAILY_KEY
                    + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            // 写入 HyperLogLog，相同 visitorId 重复写入不会重复计数
            stringRedisTemplate.opsForHyperLogLog().add(dailyKey, visitorId);
        } catch (Exception e) {
            // UV 统计失败不能影响正常业务请求
            log.error("[UV] 记录 UV 失败", e);
        }
    }
```

**3. 定义返回数据结构 VO** 

在 `com.lbx.model.vo` 下新建 `UvStatsVO`，对应前端所需要的数据：

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UvStatsVO {
    private Long daily;    // 今日 UV
    private Long weekly;   // 本周 (近7天) 累计 UV
    private Long monthly;  // 本月 (近30天) 累计 UV
}
```

**4. 编写业务逻辑 Service**

在 Service 层实现 UV 聚合计算。Redis 的 `PFCOUNT` 支持传入多个 Key 进行合并计算，因此无需显式进行 `PFMERGE` 存临时键：

```java
public interface UvService {
    UvStatsVO getUvStats();
}
```

实现类：
```java
@Service
@RequiredArgsConstructor
public class UvServiceImpl implements UvService {
    private final StringRedisTemplate stringRedisTemplate;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Override
    public UvStatsVO getUvStats() {
        LocalDate today = LocalDate.now();

        // 1. 今日 UV 统计
        String todayKey = RedisConstants.UV_KEY_PREFIX + today.format(FORMATTER);
        Long daily = stringRedisTemplate.opsForHyperLogLog().size(todayKey);

        // 2. 本周 (近 7 天) UV 统计
        List<String> weeklyKeys = getPastDateKeys(today, 7);
        Long weekly = stringRedisTemplate.opsForHyperLogLog().size(weeklyKeys.toArray(new String[0]));

        // 3. 近 30 天 UV 统计
        List<String> monthlyKeys = getPastDateKeys(today, 30);
        Long monthly = stringRedisTemplate.opsForHyperLogLog().size(monthlyKeys.toArray(new String[0]));

        return new UvStatsVO(
                daily != null ? daily : 0L,
                weekly != null ? weekly : 0L,
                monthly != null ? monthly : 0L
        );
    }

    private List<String> getPastDateKeys(LocalDate endDate, int days) {
        List<String> keys = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            String dateStr = endDate.minusDays(i).format(FORMATTER);
            keys.add(RedisConstants.UV_KEY_PREFIX + dateStr);
        }
        return keys;
    }
}
```

**5. 编写 Controller**

新建控制器，暴露 `/uv/stats` 接口：

```java
@RestController
@RequestMapping("/uv")
@RequiredArgsConstructor
public class UvController {

    private final UvService uvService;

    @GetMapping("/stats")
    public Result<UvStatsVO> getUvStats() {
        UvStatsVO stats = uvService.getUvStats();
        return Result.success(stats);
    }
}
```

# 三. GEO数据结构

Redis 的 GEO（地理空间）功能本质上并不是一种全新的底层数据结构，而是基于我们非常熟悉的有序集合（Sorted Set，简称 ZSET）来实现的。

当你往 Redis 中存储 GEO 数据时，Redis 会在后台自动将你输入的经纬度转换为一个分数（Score），并将其放入 ZSET 中。

以下是它运作的核心原理和机制：

**1.核心技术：Geohash 算法**

ZSET 只能存储一维的分数（Score），但地理位置是二维的（经度 + 纬度）。为了把二维数据存进一维结构中，Redis 采用了 **Geohash 算法**。

- **降维处理：** Geohash 会将地球不断地进行二分划分为无数个小区块。通过对经纬度进行二进制编码（交错合并），把一个二维坐标转化为一个 **52 位的长整型整数（52-bit integer）**。
- **空间邻近性：** Geohash 算法有一个非常重要的特性——**地理位置越接近的两个点，它们的 Geohash 值（对应的整数）就越接近**，转换成的 Base32 字符串的公共前缀也越长。

**2.在 ZSET 中的存储方式**

在 Redis 的 ZSET 中，数据是以 `(score, member)` 的键值对形式存储的：

- **Member（成员）：** 就是你存入的位置名称或 ID（例如 `"user:1001"`、`"Beijing"`）。
- **Score（分数）：** 就是经过 Geohash 算法计算出来的那个 52 位整数。

因为 ZSET 是按 Score 排序的，这意味着在真实物理空间上相近的地点，在 Redis 的 ZSET 数据结构中也是紧挨在一起的。

**3. 如何实现“搜索附近的人/店”？**

由于相近的位置在 ZSET 中的 Score 也很接近，当你想搜索“距离我 1 公里内的咖啡店”时，Redis 的大概执行步骤如下：

1. 计算你当前坐标的 Geohash 值。
2. 根据你要搜索的半径（1 公里），计算出这个半径对应的 Geohash Score 范围。
3. 利用 ZSET 底层的跳表（SkipList）结构，通过范围查询（类似于 `ZRANGEBYSCORE` 的机制）极其快速地把这个分数区间内的所有点提取出来。
4. 因为 Geohash 划分的是矩形网格，在这个范围内可能会有一些位于网格边缘但不符合实际距离要求的“误差参考点”，Redis 会在内存中对提取出的这些点进行一次精确的距离计算过滤，最后返回准确的结果。



## 1. 常见的 GEO 常用命令

### 1. 录入与基础查询

#### `GEOADD`：添加地理位置

用于将一个或多个地理位置（经度、纬度、名称）添加到指定的 key 中。

> **注意防坑：** Redis 规定的录入顺序是**先经度（longitude），后纬度（latitude）**。

```Code snippet
# 语法：GEOADD key longitude latitude member [longitude latitude member ...]

# 示例：向 "city_locations" 中添加北京和上海的坐标
GEOADD city_locations 116.405285 39.904989 "Beijing" 121.472644 31.231706 "Shanghai"
```

#### `GEOPOS`：获取地理位置

获取一个或多个成员的经纬度坐标。

```
# 语法：GEOPOS key member [member ...]

# 示例：获取北京和上海的坐标
GEOPOS city_locations "Beijing" "Shanghai"
```

#### `GEOHASH`：获取坐标的 GeoHash 字符串

返回一个或多个成员的 `GeoHash` 字符串表示（通常用于底层调试或与其他支持 GeoHash 的系统交互）。

```
# 语法：GEOHASH key member [member ...]

# 示例：
GEOHASH city_locations "Beijing" 
# 返回值类似："wx4g0b7xun0"
```



### 2. 距离与范围计算

#### `GEODIST`：计算两点间的距离

计算两个指定成员之间的距离。支持四种单位：`m`（米，默认值）、`km`（千米）、`mi`（英里）、`ft`（英尺）。  

```
# 语法：GEODIST key member1 member2 [m|km|ft|mi]

# 示例：计算北京到上海的直线距离（单位：千米）
GEODIST city_locations "Beijing" "Shanghai" km
```

#### `GEOSEARCH`：搜索范围内的成员

这是 Redis 6.2 引入的新命令，用于取代旧的 `GEORADIUS` 和 `GEORADIUSBYMEMBER`。它支持**圆形范围**和**矩形范围**搜索，功能更强大。

```
# 语法规则太长，我们直接看常用的两种搜索模式：

# 模式一：以某个指定经纬度为中心，搜索方圆 500km 内的城市，返回距离并按由近到远排序
GEOSEARCH city_locations FROMLONLAT 116.40 39.90 BYRADIUS 500 km WITHDIST ASC

# 模式二：以 "Beijing" 这个成员为中心，搜索一个 400km * 400km 的矩形范围内的成员
GEOSEARCH city_locations FROMMEMBER "Beijing" BYBOX 400 400 km ASC
```

- **可选参数解析：**
  - `WITHDIST`：返回结果时带上与中心点的距离。
  - `WITHCOORD`：返回结果时带上成员的经纬度。
  - `ASC / DESC`：按距离由近到远（ASC）或由远到近（DESC）排序。
  - `COUNT n`：限制返回的数量，比如只返回最近的 10 个。

#### `GEORADIUS` / `GEORADIUSBYMEMBER`

在较老的 Redis 版本中，通常使用这两个命令来做“附近的人”功能。

- `GEORADIUS`：以指定的经纬度为圆心进行查找。  
- `GEORADIUSBYMEMBER`：以集合中已存在的某个成员为圆心进行查找。

```
# 示例：在旧版本中，寻找以 116.40, 39.90 为中心，500千米内的城市
GEORADIUS city_locations 116.40 39.90 500 km WITHDIST ASC
```



### 3. GEO 的隐藏操作

因为 GEO 底层本质上就是一个 Sorted Set，所以 Redis 并没有提供 `GEODEL`（删除成员）之类的专门指令。你可以直接使用 Sorted Set 的命令来操作 GEO 数据：  

- **删除地理位置：** 使用   `ZREM`

  ```
  # 示例：删除北京的位置信息
  ZREM city_locations "Beijing"
  ```

- **查看共有多少个位置：** 使用 `ZCARD`

  ```
  ZCARD city_locations
  ```

- **获取所有成员：** 使用 `ZRANGE`

  ```
  ZRANGE city_locations 0 -1
  ```

> **补充说明：**
>
> - **删除数据：** 因为底层是 ZSET，Redis 并没有提供单独的 `GEODEL` 命令，如果想删除一个位置点，直接使用 ZSET 的命令 **`ZREM key member`** 即可。
> - **精度限制：** Redis 采用 52 位的整数，这对应的 Geohash 精度误差大约在 **0.6米** 左右，对于绝大多数互联网应用（如外卖、打车、交友）已经完全足够



## 2. 整合SpringBoot

```java
        String key = "demo:geo:locations";

        // 1. GEOADD (添加地理位置的坐标)
        // 对应命令: GEOADD key longitude latitude member
        stringRedisTemplate.opsForGeo().add(key, new Point(116.48105, 39.996794), "user:A"); // 望京
        stringRedisTemplate.opsForGeo().add(key, new Point(116.489033, 40.007669), "user:B"); // 望京SOHO
        stringRedisTemplate.opsForGeo().add(key, new Point(116.514203, 39.905409), "user:C"); // 国贸
        System.out.println("1. GEOADD执行完成，数据已添加。");


        // 2. GEOPOS (获取某个成员的经纬度坐标)
        // 对应命令: GEOPOS key member [member ...]
        List<Point> positions = stringRedisTemplate.opsForGeo().position(key, "user:A", "user:not_exist");
        System.out.println("\n2. GEOPOS获取的值: " + positions); 
        // 输出示例: [Point [x=116.481049, y=39.996793], null]


        // 3. GEODIST (计算两个成员之间的距离)
        // 对应命令: GEODIST key member1 member2 [m|km|ft|mi]
        Distance distance = stringRedisTemplate.opsForGeo().distance(key, "user:A", "user:B", Metrics.KILOMETERS);
        if (distance != null) {
            System.out.println("\n3. GEODIST获取的距离: " + distance.getValue() + " " + distance.getMetric().getAbbreviation());
            // 输出示例: 1.3855 km
        }


        // 4. GEOHASH (获取成员的标准 Base32 编码的 Geohash 字符串)
        // 对应命令: GEOHASH key member [member ...]
        List<String> hashes = stringRedisTemplate.opsForGeo().hash(key, "user:A", "user:C");
        System.out.println("\n4. GEOHASH获取的哈希值: " + hashes);
        // 输出示例: [wx4g4f... , wx4g1y...]
 

        // 5. GEOSEARCH (搜索附近的成员)
        // 对应命令: GEOSEARCH key FROMMEMBER member BYRADIUS radius km WITHDIST ASC
        // 演示：以 user:A 为中心，搜索 5 公里内的成员，并返回距离，按从近到远排序
        GeoReference<String> reference = GeoReference.fromMember("user:A");
									//GeoReference.fromCoordinate(x, y),
        GeoShape shape = GeoShape.byRadius(new Distance(5, RedisGeoCommands.DistanceUnit.KILOMETERS));  //确定搜索的“范围”。即以 user:A 为圆心，画一个半径为 5 公里的圆作为搜索边界
        RedisGeoCommands.GeoSearchCommandArgs args = RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs()
                .includeDistance()  // 结果集包含距离
                .sortAscending();   // 按距离正序(由近到远)

        GeoResults<RedisGeoCommands.GeoLocation<String>> searchResults = 
                stringRedisTemplate.opsForGeo().search(key, reference, shape, args);

        System.out.println("\n5. GEOSEARCH搜索结果 (user:A 附近 5km):");
        if (searchResults != null) {
            searchResults.forEach(result -> {
                String member = result.getContent().getName();
                double dist = result.getDistance().getValue();
                System.out.println("   -> 成员: " + member + ", 距离: " + dist + " km");
            });
```

RedisGeoCommands.DistanceUnit.METERS：米

RedisGeoCommands.DistanceUnit.KILOMETERS：千米

