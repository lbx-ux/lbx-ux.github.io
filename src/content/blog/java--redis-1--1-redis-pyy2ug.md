---
title: 一. Spring Data Redis
description: 一.SpringDataRedis
pubDate: 2026-08-23
tags: [Redis]
source: Java后端/数据库/Redis/1.基础/1. Redis.md
---

## 一. Spring Data Redis

Spring Data Redis 是 Spring 的一部分，提供了在 Spring 应用中通过简单的配置就可以访问 Redis 服务，对 Redis 底层开发包进行了高度封装。在 Spring 项目中，可以使用Spring Data Redis来简化 Redis 操作。

* 提供了对不同Redis客户端的整合（Lettuce和Jedis）
* 提供了RedisTemplate统一API来操作Redis
* 支持Redis的发布订阅模型
* 支持Redis哨兵和Redis集群
* 支持基于Lettuce的响应式编程
* 支持基于JDK.JSON.字符串.Spring对象的数据序列化及反序列化
* 支持基于Redis的JDKCollection实现

Spring Boot提供了对应的Starter，maven坐标：

```xml
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Spring Data Redis中提供了一个高度封装的类：**RedisTemplate**，对相关api进行了归类封装,将同一类型操作封装为operation接口，具体分类如下：

- opsForValue():   String数据操作
- opsForList():       List数据操作
- opsForHash():    Hash数据操作
- opsForSet():       Set数据操作
- opsForZSet():     ZSet数据操作



**环境搭建**

**1). 导入Spring Data Redis的maven坐标**

```xml
<dependency>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
     <groupId>org.apache.commons</groupId>
     <artifactId>commons-pool2</artifactId>
</dependency>
```

在 Spring Boot 中，使用`commons-pool2` 依赖的方式非常简单：**你不需要写任何 Java 代码去显式调用它。** 只要引入了这个依赖，并在配置文件中加上对应的连接池参数，Spring Boot 的自动配置机制就会在底层自动把它组装进 Redis 的连接工厂中。



**2). 配置Redis数据源**

```yml
spring:
  data:
    redis:
      host: 192.168.146.130
      port: 6379
      password: 123456
      database: 0
      lettuce:
        pool:
          max-active: 8   # 【核心】连接池中的最大活跃连接数（负值表示没有限制），默认 8
          max-idle: 8     # 连接池中的最大空闲连接数，默认 8
          min-idle: 0     # 连接池中的最小空闲连接数，默认 0
          max-wait: 100ms # 连接池最大阻塞等待时间（使用负值表示没有限制），默认 -1（无限等待)
```

database:指定使用Redis的哪个数据库，Redis服务启动后默认有16个数据库，编号分别是从0到15。



## 使用场景

| 数据类型        | 一句话场景                                            |
| --------------- | ----------------------------------------------------- |
| **String**      | 缓存简单值、计数器、分布式锁                          |
| **Hash**        | 缓存对象，购物车                                      |
| **List**        | 消息队列，栈和队列                                    |
| **Set**         | 数据去重、计算交集/并集（如共同好友，点赞，抽奖活动） |
| **ZSet**        | 各种排行榜、延时队列                                  |
| **Bitmap**      | 签到，用户登录状态，布隆过滤器                        |
| **HyperLogLog** | 需要去重计数但不要求100%精确（如UV）                  |
| **GEO**         | 存储地理位置信息                                      |
| **Stream**      | 消息队列                                              |



## 二. String

| **纯 Redis 原生命令** | **Spring Boot opsForValue() 对应方法**        | **返回值类型** | **作用说明**                                                 |
| --------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------ |
| **SET key value**     | `.set(key, value)`                            | `void`         | 基础写入：设置指定 key 的值，如果存在，那就是修改对应key的值 |
| **GET key**           | `.get(key)`                                   | `String`       | 基础读取：获取指定 key 的值                                  |
| **MSET k1 v1 k2 v2**  | `.multiSet(Map<K, V>)`                        | `void`         | 批量写入：一次性设置多个键值对                               |
| **MGET k1 k2**        | `.multiGet(Collection<K>)`                    | `List<String>` | 批量读取：一次性获取多个 key 的值（查不到的为 null）         |
| **SETEX**             | `.set(key, value, timeout, TimeUnit)`         | `void`         | 写入并设置过期时间（常用于缓存）                             |
| **SETNX**             | `.setIfAbsent(key, value)`                    | `Boolean`      | 仅当不存在时写入（分布式锁基础形态）                         |
| **SET k val EX t NX** | `.setIfAbsent(key, value, timeout, TimeUnit)` | `Boolean`      | **(高频)** 不存在时才设置，并原子性增加过期时间（标准的分布式锁方案） |
| **SET k val XX**      | `.setIfPresent(key, value)`                   | `Boolean`      | 仅当 key **存在**时才写入（通常用于更新已有缓存）            |
| **GETSET**            | `.getAndSet(key, value)`                      | `String`       | 设置新值，并返回被覆盖的**旧值**（不存在也会直接新建）       |
| **INCR**              | `.increment(key)`                             | `Long`         | 数值原子自增 1，返回增加后的结果                             |
| **INCRBY / DECRBY**   | `.increment(key, long delta)`                 | `Long`         | 数值原子增加指定的整数（传负数即为减法）                     |
| **INCRBYFLOAT**       | `.increment(key, double delta)`               | `Double`       | 数值原子增加指定的浮点数                                     |
| **APPEND**            | `.append(key, value)`                         | `Integer`      | 在原字符串末尾追加内容，返回**追加后的总长度**               |
| **STRLEN**            | `.size(key)`                                  | `Long`         | 获取 key 对应字符串的字节长度                                |
| **GETRANGE**          | `.get(key, start, end)`                       | `String`       | 获取字符串指定索引范围的子串（类似 substring）               |
| **SETRANGE**          | `.set(key, value, offset)`                    | `void`         | 从指定索引偏移量（offset）开始，覆写原字符串的内容           |

**TimeUnit：**

- **毫秒：** `TimeUnit.MILLISECONDS`
- **秒：** `TimeUnit.SECONDS` （最常用）
- **分钟：** `TimeUnit.MINUTES`
- **小时：** `TimeUnit.HOURS`
- **天：** `TimeUnit.DAYS`



```java
        // 1. 基础读写 (SET / GET)
        stringRedisTemplate.opsForValue().set("user:1:name", "Gemini");
        
        // 返回值: String (如果 key 不存在则返回 null)
        String name = stringRedisTemplate.opsForValue().get("user:1:name");

        // 2. 批量操作 (MSET / MGET)
        Map<String, String> multiData = new HashMap<>();
        multiData.put("config:theme", "dark");
        multiData.put("config:lang", "zh-CN");
        stringRedisTemplate.opsForValue().multiSet(multiData);

        List<String> keys = Arrays.asList("config:theme", "config:lang", "config:not_exist");
        // 返回值: List<String> (顺序与传入 keys 列表强一致，不存在的返回 null)
        List<String> values = stringRedisTemplate.opsForValue().multiGet(keys);
        System.out.println("MGET获取的值: " + values); // 输出: [dark, zh-CN, null]

        // 3. 高级设置: 存在性判断与过期时间限制
        // 3.1 带有过期时间的 SET (SETEX)
        stringRedisTemplate.opsForValue().set("code:8888", "123456", 5, TimeUnit.MINUTES);

        // 3.2 仅当不存在时设置 (SETNX)
        // 返回值: Boolean (true: 设置成功; false: 已存在设置失败)
        Boolean isSet = stringRedisTemplate.opsForValue().setIfAbsent("lock:init", "locked");

        // 3.3 ⭐ 组合拳: 不存在时才设置，并且原子的加上过期时间 (完美分布式锁雏形)
        // 返回值: Boolean
        Boolean lockAcquired = stringRedisTemplate.opsForValue()
                .setIfAbsent("lock:order:1001", "UUID-123", 10, TimeUnit.SECONDS);

        // 3.4 仅当存在时才更新 (SET XX)
        // 返回值: Boolean (true: 存在且更新成功; false: 不存在更新失败)
        Boolean isUpdated = stringRedisTemplate.opsForValue().setIfPresent("config:theme", "light");

        // 4. 数值运算 (INCR / INCRBY) - 必须是数字格式的字符串
        stringRedisTemplate.opsForValue().set("article:1:views", "100");

        // 4.1 默认自增 1 (INCR)
        // 返回值: Long (返回操作后的最新值)
        Long views1 = stringRedisTemplate.opsForValue().increment("article:1:views"); // 101

        // 4.2 增加指定长整型步长 (INCRBY)
        // 返回值: Long
        Long views2 = stringRedisTemplate.opsForValue().increment("article:1:views", 10); // 111

        // 4.3 负数步长等于自减 (DECR)
        // 返回值: Long
        Long views3 = stringRedisTemplate.opsForValue().increment("article:1:views", -5); // 106

        // 4.4 浮点数增加 (INCRBYFLOAT)
        stringRedisTemplate.opsForValue().set("wallet:1:balance", "100.50");
        // 返回值: Double
        Double balance = stringRedisTemplate.opsForValue().increment("wallet:1:balance", 10.25); // 110.75


        // 5. 字符串进阶与截取操作 (APPEND / GETSET / 截取)
        stringRedisTemplate.opsForValue().set("msg:1", "Hello");

        // 5.1 追加字符串 (APPEND)
        // 返回值: Integer (追加完毕后，整个字符串的总长度)
        Integer totalLength = stringRedisTemplate.opsForValue().append("msg:1", " World"); // 内容变为 "Hello World"，返回 11

        // 5.2 获取字符串长度 (STRLEN)
        // 返回值: Long
        Long strLen = stringRedisTemplate.opsForValue().size("msg:1");

        // 5.3 获取子串 (GETRANGE) - 注意索引从 0 开始，包含结束索引 (-1 代表截取到末尾)
        // 返回值: String
        String subStr = stringRedisTemplate.opsForValue().get("msg:1", 0, 4); // 返回 "Hello"

        // 5.4 覆写偏移量之后的内容 (SETRANGE)
        // 返回值: void (将从索引 6 开始的内容替换为 "Redis")
        stringRedisTemplate.opsForValue().set("msg:1", "Redis", 6); // 原有 "Hello World" 变为 "Hello Redis"

        // 5.5 先获取旧值再设置新值 (GETSET) - 常用来做平滑的值轮换
        // 返回值: String (返回替换前的旧值)
        String oldMsg = stringRedisTemplate.opsForValue().getAndSet("msg:1", "New Message!"); 
        System.out.println("被替换掉的旧值: " + oldMsg); // 输出: Hello Redis
```



## 三. List

| **纯 Redis 原生命令** | **Spring Boot opsForList() 对应方法**                  | **返回值类型** | **作用说明**                                                 |
| --------------------- | ------------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| **LPUSH**             | `.leftPush(key, value)`  `.leftPushAll(key, values)`   | `Long`         | 从列表**左侧**（头部）推入一个或多个元素。返回操作后列表的总长度。 |
| **RPUSH**             | `.rightPush(key, value)`  `.rightPushAll(key, values)` | `Long`         | 从列表**右侧**（尾部）推入一个或多个元素。返回操作后列表的总长度。 |
| **LPOP**              | `.leftPop(key)`                                        | `String`       | 移除并返回列表**左侧**的第一个元素。如果列表为空则返回 null。 |
| **RPOP**              | `.rightPop(key)`                                       | `String`       | 移除并返回列表**右侧**的最后一个元素。                       |
| **LRANGE**            | `.range(key, start, end)`                              | `List<String>` | 获取列表指定索引范围内的元素。（0 到 -1 表示获取全部）       |
| **LLEN**              | `.size(key)`                                           | `Long`         | 获取列表的长度。                                             |
| **LINDEX**            | `.index(key, index)`                                   | `String`       | 获取列表指定索引位置的元素（索引从 0 开始）。                |
| **LSET**              | `.set(key, index, value)`                              | `void`         | 修改列表指定索引位置的元素值。                               |
| **LREM**              | `.remove(key, count, value)`                           | `Long`         | 删除列表中与 value 相等的元素。count > 0 从左向右删；count < 0 从右向左删；count = 0 删除所有。返回实际删除的数量。 |
| **LTRIM**             | `.trim(key, start, end)`                               | `void`         | 裁剪列表，只保留指定索引范围内的元素，其余直接丢弃。         |
| **BLPOP**             | `.leftPop(key, timeout, TimeUnit)`                     | `String`       | **阻塞式**左侧弹出：如果列表为空，会阻塞等待直到有新元素或超时。 |
| **BRPOP**             | `.rightPop(key, timeout, TimeUnit)`                    | `String`       | **阻塞式**右侧弹出：如果列表为空，会阻塞等待直到有新元素或超时。 |



```java
        String key = "queue:tasks";
        // 1. 入队 / 压栈 (LPUSH / RPUSH)
        
        // 1.1 从左侧推入单个元素 (LPUSH)
        // 返回值: Long (推入后列表的总长度)
        Long leftLength = stringRedisTemplate.opsForList().leftPush(key, "task-1");
        System.out.println("左侧推入后长度: " + leftLength);

        // 1.2 从右侧推入多个元素 (RPUSH)
        // 返回值: Long (推入后列表的总长度)
        Long rightLength = stringRedisTemplate.opsForList().rightPushAll(key, "task-2", "task-3", "task-4");
        
        // 也可以直接传入一个 List 集合进行批量推入
        List<String> moreTasks = Arrays.asList("task-5", "task-6");
        stringRedisTemplate.opsForList().rightPushAll(key, moreTasks);

        // 2. 范围读取与长度查询 (LRANGE / LLEN)
        
        // 2.1 获取列表长度 (LLEN)
        // 返回值: Long
        Long size = stringRedisTemplate.opsForList().size(key);
        
        // 2.2 获取指定范围的元素 (LRANGE)
        // 返回值: List<String> (0 到 -1 代表获取列表里所有的元素)
        List<String> allTasks = stringRedisTemplate.opsForList().range(key, 0, -1);
        System.out.println("当前列表所有元素: " + allTasks); 
        
        // 2.3 获取指定索引的元素 (LINDEX)
        // 返回值: String (如果索引越界返回 null)
        String firstTask = stringRedisTemplate.opsForList().index(key, 0);


        // 3. 出队 / 弹栈 (LPOP / RPOP)
        
        // 3.1 从左侧弹出一个元素 (LPOP)
        // 返回值: String (弹出的元素值，如果列表为空则返回 null)
        String poppedTask = stringRedisTemplate.opsForList().leftPop(key);
        System.out.println("左侧弹出的任务: " + poppedTask);

        // 3.2 阻塞式获取元素 (BLPOP) - 极其适合做消费者监听
        // 返回值: String (如果在 10 秒内有数据放入则立刻返回数据，否则 10 秒后返回 null)
        String blockedTask = stringRedisTemplate.opsForList().leftPop(key, 10, TimeUnit.SECONDS);


        // 4. 修改与裁剪 (LSET / LREM / LTRIM)
        
        // 4.1 修改指定索引的值 (LSET)
        // 返回值: void (注意：如果 index 越界会抛出异常)
        stringRedisTemplate.opsForList().set(key, 0, "task-updated");

        // 4.2 删除指定元素 (LREM)
        // 参数说明：(键, 删除个数, 匹配的值)
        // count > 0 : 从左到右删除 count 个相等的元素。
        // count < 0 : 从右到左删除 |count| 个相等的元素。
        // count = 0 : 删除所有相等的元素。
        // 返回值: Long (实际被删除的元素个数)
        Long removedCount = stringRedisTemplate.opsForList().remove(key, 1, "task-3");
        
        // 4.3 裁剪列表 (LTRIM)
        // 返回值: void (只保留索引 0 到 99 的元素，通常用于限制信息流或日志列表的最大长度)
        stringRedisTemplate.opsForList().trim(key, 0, 99);
```



## 四. Hash

Redis 的 **Hash（哈希）** 数据类型在结构上非常像 Java 中的 `HashMap<String, String>`。它是一个键值对（Field-Value）的集合，特别适合用来存储**对象（Object）**。

相比于把一个完整的对象序列化成 JSON 字符串存入 String 类型，使用 Hash 类型最大的优势在于：**你可以直接对对象中的某一个字段进行精准的读取、修改或递增操作**，而不需要把整个大对象取出来再放回去。这既节省了网络带宽，又避免了并发修改时的冲突问题。



⚠️ **特别说明**：由于 Spring Boot 中 `HashOperations` 的泛型设计，`opsForHash()` 返回的值类型在签名上通常是 `Object`。但在使用 `StringRedisTemplate` 时，底层的序列化器全是字符串序列化，因此这些 `Object` 实际上全都是 `String`，在日常开发中我们可以安全地进行强转（如 `(String)`）。

| **纯 Redis 原生命令** | **Spring Boot opsForHash() 对应方法**    | **返回值类型**             | **作用说明**                                       |
| --------------------- | ---------------------------------------- | -------------------------- | -------------------------------------------------- |
| **HSET**              | `.put(key, hashKey, value)`              | `void`                     | 设置 Hash 表中指定字段（hashKey）的值。            |
| **HGET**              | `.get(key, hashKey)`                     | `Object` *(通常转 String)* | 获取 Hash 表中指定字段的值。                       |
| **HMSET**             | `.putAll(key, Map<HK, HV>)`              | `void`                     | 批量设置 Hash 表中的多个字段及值。                 |
| **HMGET**             | `.multiGet(key, Collection<HK>)`         | `List<Object>`             | 批量获取 Hash 表中多个字段的值。                   |
| **HGETALL**           | `.entries(key)`                          | `Map<Object, Object>`      | **(高频)** 一次性获取 Hash 表里的所有字段和值。    |
| **HDEL**              | `.delete(key, Object... hashKeys)`       | `Long`                     | 删除 Hash 表中一个或多个字段，返回实际删除的数量。 |
| **HEXISTS**           | `.hasKey(key, hashKey)`                  | `Boolean`                  | 判断 Hash 表中是否存在指定的字段。                 |
| **HKEYS**             | `.keys(key)`                             | `Set<Object>`              | 获取 Hash 表中所有的字段名（不含值）。             |
| **HVALS**             | `.values(key)`                           | `List<Object>`             | 获取 Hash 表中所有的值（不含字段名）。             |
| **HINCRBY**           | `.increment(key, hashKey, long delta)`   | `Long`                     | 让 Hash 表中指定字段的值原子性增加指定的整数。     |
| **HINCRBYFLOAT**      | `.increment(key, hashKey, double delta)` | `Double`                   | 让 Hash 表中指定字段的值原子性增加浮点数。         |



```java
       String key = "user:1001:info";

        // 1. 基础字段读写 (HSET / HGET)
        
        // 1.1 设置单个字段 (HSET)
        // 返回值: void
        stringRedisTemplate.opsForHash().put(key, "name", "Alice");
        stringRedisTemplate.opsForHash().put(key, "age", "25");

        // 1.2 获取单个字段 (HGET)
        // 返回值: Object (强转为 String)
        String name = (String) stringRedisTemplate.opsForHash().get(key, "name");
        System.out.println("HGET 获取的 name: " + name);

        // 2. 批量操作 (HMSET / HMGET / HGETALL)
        
        // 2.1 批量设置多字段 (HMSET)
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("email", "alice@example.com");
        userInfo.put("city", "New York");
        userInfo.put("login_count", "1");
        // 返回值: void
        stringRedisTemplate.opsForHash().putAll(key, userInfo);

        // 2.2 批量获取指定的多字段 (HMGET)
        List<Object> hashKeys = Arrays.asList("name", "city", "not_exist_field");
        // 返回值: List<Object> (对应的结果列表，不存在的值所在位置为 null)
        List<Object> values = stringRedisTemplate.opsForHash().multiGet(key, hashKeys);
        System.out.println("HMGET 获取的多个值: " + values); // 输出类似: [Alice, New York, null]

        // 2.3 ⭐ 获取 Hash 表中所有键值对 (HGETALL) 
        // 极度常用：直接将 Redis 中的 Hash 转换为 Java 的 Map 结构
        // 返回值: Map<Object, Object>
        Map<Object, Object> allEntries = stringRedisTemplate.opsForHash().entries(key);
        System.out.println("HGETALL 获取的完整对象: " + allEntries);

        // 3. 字段存在性与查询属性 (HEXISTS / HKEYS / HVALS)
        
        // 3.1 判断字段是否存在 (HEXISTS)
        // 返回值: Boolean
        Boolean hasEmail = stringRedisTemplate.opsForHash().hasKey(key, "email");

        // 3.2 获取所有的字段名 (HKEYS)
        // 返回值: Set<Object>
        Set<Object> allKeys = stringRedisTemplate.opsForHash().keys(key);
        System.out.println("当前对象的所有字段名: " + allKeys);

        // 3.3 获取所有的字段值 (HVALS)
        // 返回值: List<Object>
        List<Object> allValues = stringRedisTemplate.opsForHash().values(key);

        // 4. 局部数值原子计算 (HINCRBY)
        // 适合场景：用户增加了积分、文章增加了阅读量等局部状态更新
        
        // 4.1 字段值原子性递增指定步长
        // 返回值: Long (计算后的最新值)
        Long currentLoginCount = stringRedisTemplate.opsForHash().increment(key, "login_count", 1);
        System.out.println("HINCRBY 增加后的登录次数: " + currentLoginCount); // 输出 2

        // 4.2 传入负数即可实现递减
        // 返回值: Long
        Long decreasedCount = stringRedisTemplate.opsForHash().increment(key, "login_count", -1);

        // 5. 删除操作 (HDEL)
        
        // 5.1 删除指定的字段（可以传一个或多个）
        // 返回值: Long (实际成功删除的字段数量)
        Long deletedCount = stringRedisTemplate.opsForHash().delete(key, "email", "age");
        System.out.println("HDEL 成功删除了 " + deletedCount + " 个字段");
```



### Hash存对象

要将 `UserDTO` 改为使用 **Hash (哈希)** 类型存入 Redis，你需要将对象转换成 `Map`，然后使用 `stringRedisTemplate.opsForHash().putAll()` 方法。

这里有一个**非常关键的细节**：因为你使用的是 `StringRedisTemplate`，它要求 Redis 中 Hash 的 `key` 和 `value` 都必须是 `String` 类型，而`UserDTO` 中的 `id` 是 `Long` 类型的，如果直接转成 Map 存入，会报类型转换异常（`ClassCastException`）。

因此，在将 DTO 转换为 Map 时，需要**将所有的字段值都统一转换为 String**。利用 `BeanUtil` 的自定义转换规则来完美解决这个问题。

```java
// 1. 随机生成 Token，并拼接完整的 Redis Key
String token = IdUtil.fastSimpleUUID();
String tokenKey = LOGIN_TOKEN_KEY + token;

// 2. 拷贝属性到 UserDTO
UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);

// 3. 将 UserDTO 转换为 Map<String, Object> (确保所有的 value 强制转为 String)
Map<String, Object> userMap = BeanUtil.beanToMap(userDTO, new HashMap<>(), 
        CopyOptions.create()
                .setIgnoreNullValue(true) // 忽略空值
                .setFieldValueEditor((fieldName, fieldValue) -> {
                    // 如果值为空则保持为空，如果不为空则调用 toString() 转为字符串
                    return fieldValue != null ? fieldValue.toString() : null;
                })
);

// 4. 将 Map 以 Hash 结构存入 Redis
stringRedisTemplate.opsForHash().putAll(tokenKey, userMap);

// 5. Hash 结构不能在 putAll 时直接设置过期时间，需要单独调用 expire 设置 TTL
stringRedisTemplate.expire(tokenKey, LOGIN_TOKEN_TTL, TimeUnit.MINUTES);
```

**主要解析：**

- **`opsForHash().putAll()`**：是操作 Redis Hash 结构的正确方法，可以一次性存入多个字段。
- **`CopyOptions.create().setFieldValueEditor(...)`**：这是 Hutool 提供的功能。它拦截了对象到 Map 的转换过程，把原本是 `Long` 类型的 `id` 安全地转换成了 `"String"`，防止了 `StringRedisTemplate` 序列化时报错。
- **`expire()` 单独设置过期时间**：`opsForValue().set()` 支持在存值的同时设置过期时间，但是 `opsForHash().putAll()` API 本身不支持传过期时间参数。所以必须分两步走，先存入数据，再调用 `expire` 设置 TTL。



假设你已经知道了当前用户的 Redis Key（即 `tokenKey`），你想将他的昵称修改为 `"新的昵称"`：

```java
// 假设这是你当前用户的 Redis 键
String tokenKey = LOGIN_TOKEN_KEY + token; 

// 1. (可选) 如果你需要先获取旧的 nickName 进行逻辑判断或拼接
// 注意：opsForHash().get 返回的是 Object，由于使用 StringRedisTemplate，强转为 String 即可
String oldNickName = (String) stringRedisTemplate.opsForHash().get(tokenKey, "nickName");
System.out.println("旧的昵称是：" + oldNickName);

// 2. 准备新的昵称
String newNickName = "张三的新昵称"; 

// 3. 将新的 nickName 覆盖存入 Redis Hash 中
// opsForHash().put(key, hashKey, value) 方法专门用于更新 Hash 中的单个字段
stringRedisTemplate.opsForHash().put(tokenKey, "nickName", newNickName);
```

**方法解析：**

- **`opsForHash().get(key, hashKey)`**：用于获取 Hash 结构中指定 `key` 下的某个具体的字段 (`hashKey`)。这里 `hashKey` 传入 `"nickName"`（和你 UserDTO 里的属性名保持一致）。
- **`opsForHash().put(key, hashKey, value)`**：用于更新或新增 Hash 结构中的单个字段。执行这行代码后，Redis 中只有 `nickName` 的值会被改变，`id` 和 `icon` 等其他字段原封不动，完美实现了**局部更新**。



**取出**

```java
// 1. 从 Redis 中获取完整的 Hash 结构数据
// entries() 方法会返回该 key 下的全部 field 和 value
Map<Object, Object> userMap = stringRedisTemplate.opsForHash().entries(tokenKey);

// 2. 判断是否为空 (非常重要)
// 注意：如果 Redis 中不存在这个 key，entries() 会返回一个空 Map，而不是 null
if (userMap.isEmpty()) {
    // 缓存未命中、或者 Token 已过期，这里可以抛出异常或返回未登录状态
    // throw new UnauthorizedException("用户未登录或Token已过期");
    return null; 
}

// 3. 将 Map 转换回 UserDTO 对象
// fillBeanWithMap 会自动忽略 Map 中没有的属性，并自动处理 String 到 Long 的类型转换
UserDTO userDTO = BeanUtil.fillBeanWithMap(userMap, new UserDTO(), false);

// 现在你就可以正常使用 userDTO 了
// System.out.println(userDTO.getId());
```



## 五. Set

Redis 的 **Set（集合）** 数据类型在结构上类似于 Java 中的 `HashSet<String>`。它是一个**无序且不允许元素重复**的字符串集合。

因为 Set 天生具备“去重”的特性，并且在底层实现了非常高效的集合运算（交集、并集、差集），它在实际开发中简直就是处理**社交关系**（如共同好友）、**标签系统**（如用户画像标签）以及**独立访客统计**（UV 去重）的超级利器。

在 Spring Boot 的 `StringRedisTemplate` 中，操作 Set 类型的核心入口是 `opsForSet()`



| **纯 Redis 原生命令** | **Spring Boot opsForSet() 对应方法**               | **返回值类型**           | **作用说明**                                                 |
| --------------------- | -------------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| **SADD**              | `.add(key, values...)`                             | `Long`                   | 向集合中添加一个或多个元素。**返回实际成功添加的元素个数**（已存在的元素会被忽略）。 |
| **SMEMBERS**          | `.members(key)`                                    | `Set<String>`            | **(高频)** 获取集合中的所有元素。                            |
| **SISMEMBER**         | `.isMember(key, value)`                            | `Boolean`                | 判断某元素是否存在于集合中（时间复杂度 O(1)，极快）。        |
| **SCARD**             | `.size(key)`                                       | `Long`                   | 获取集合中元素的总数量。                                     |
| **SREM**              | `.remove(key, values...)`                          | `Long`                   | 移除集合中的一个或多个元素。返回实际成功移除的元素个数。     |
| **SRANDMEMBER**       | `.randomMember(key)`  `.randomMembers(key, count)` | `String`  `List<String>` | 随机获取集合中的一个或多个元素（**不会**将元素从集合中删除），常用于抽奖。 |
| **SPOP**              | `.pop(key)`  `.pop(key, count)`                    | `String`  `List<String>` | 随机**弹出**集合中的一个或多个元素（弹出后该元素会**从集合中被删除**）。 |
| **SINTER**            | `.intersect(key, otherKey)`                        | `Set<String>`            | **(集合运算)** 求两个集合的**交集**（即共同拥有的元素）。    |
| **SUNION**            | `.union(key, otherKey)`                            | `Set<String>`            | **(集合运算)** 求两个集合的**并集**（合并去重）。            |
| **SDIFF**             | `.difference(key, otherKey)`                       | `Set<String>`            | **(集合运算)** 求两个集合的**差集**（在 key 中存在，但在 otherKey 中不存在的元素）。 |



```java
        String key = "article:1001:likes"; // 某篇文章的点赞用户集合

        // 1. 基础添加、查询与去重 (SADD / SMEMBERS / SISMEMBER)
        
        // 1.1 添加元素 (SADD) - 自动去重
        // 返回值: Long (成功添加的新元素数量)
        Long addedCount = stringRedisTemplate.opsForSet().add(key, "user:1", "user:2", "user:3", "user:1");
        System.out.println("成功添加的点赞人数: " + addedCount); // 输出 3 (因为 user:1 重复了，被去重)

        // 1.2 获取集合中的所有元素 (SMEMBERS)
        // 返回值: Set<String> 
        Set<String> allLikes = stringRedisTemplate.opsForSet().members(key);
        System.out.println("所有点赞用户: " + allLikes);

        // 1.3 判断元素是否存在 (SISMEMBER) - 非常适合用来判断用户是否已经点过赞
        // 返回值: Boolean
        Boolean hasLiked = stringRedisTemplate.opsForSet().isMember(key, "user:2");

        // 1.4 获取集合总数 (SCARD)
        // 返回值: Long
        Long totalLikes = stringRedisTemplate.opsForSet().size(key);

        // 1.5 删除指定元素 (SREM) - 相当于用户取消点赞
        // 返回值: Long (成功删除的数量)
        Long removedCount = stringRedisTemplate.opsForSet().remove(key, "user:3");


        // 2. 随机抽取逻辑 (SRANDMEMBER / SPOP) - 抽奖业务核心
        String raffleKey = "activity:raffle:users";
        stringRedisTemplate.opsForSet().add(raffleKey, "Alice", "Bob", "Charlie", "David", "Eve");

        // 2.1 随机获取但不删除 (SRANDMEMBER) - 适合“每日推荐”、“滚动中奖名单展示”
        // 返回值: String (单抽) / List<String> (多抽)
        String randomUser = stringRedisTemplate.opsForSet().randomMember(raffleKey);
        List<String> randomUsers = stringRedisTemplate.opsForSet().randomMembers(raffleKey, 2); // 随机取2个

        // 2.2 随机弹出并删除 (SPOP) - 适合“真实抽奖”，抽中后不允许再次中奖
        // 返回值: String (单抽) / List<String> (多抽)
        String luckyWinner = stringRedisTemplate.opsForSet().pop(raffleKey);
        System.out.println("恭喜大奖得主: " + luckyWinner); // 此时该用户已从集合中彻底移除


        // 3. 高级集合运算 (SINTER / SUNION / SDIFF) - 社交与推荐算法核心
        String userA_Follows = "user:A:follows"; // 用户 A 关注的人
        String userB_Follows = "user:B:follows"; // 用户 B 关注的人

        stringRedisTemplate.opsForSet().add(userA_Follows, "jack", "tom", "lucy");
        stringRedisTemplate.opsForSet().add(userB_Follows, "tom", "lucy", "david");

        // 3.1 交集 (SINTER) - "共同关注"、"共同好友"
        // 返回值: Set<String>
        Set<String> commonFollows = stringRedisTemplate.opsForSet().intersect(userA_Follows, userB_Follows);
        System.out.println("A和B的共同关注: " + commonFollows); // 输出 [tom, lucy]

        // 3.2 并集 (SUNION) - "两人的所有社交圈"
        // 返回值: Set<String>
        Set<String> allFollows = stringRedisTemplate.opsForSet().union(userA_Follows, userB_Follows);

        // 3.3 差集 (SDIFF) - "可能感兴趣的人" (A关注了但B没关注，可以推荐给B)
        // 含义: 以第一个 key 为基准，减去第二个 key 中存在的元素
        // 返回值: Set<String>
        Set<String> diffFollows = stringRedisTemplate.opsForSet().difference(userA_Follows, userB_Follows);
        System.out.println("A关注了但B没关注的人: " + diffFollows); // 输出 [jack]
```



## 六. ZSet

Redis 的 **ZSet（Sorted Set，有序集合）** 是 Redis 中非常具有特色且极其强大的数据结构。

你可以把它看作是 Set（集合）的升级版：它同样**不允许元素重复**，但它给每个元素都强制绑定了一个**浮点数的分数（Score）**。Redis 会根据这个分数自动对集合中的元素进行从小到大（或从大到小）的排序。

因为自带“自动排序”属性，ZSet 在业务中简直是为**排行榜（游戏段位、销售榜单）**、**热搜/热度权重排序**以及延时队列（以时间戳作为分数）量身定制的。

在 Spring Boot 的 `StringRedisTemplate` 中，操作 ZSet 类型的核心入口是 `opsForZSet()`。由于涉及到分数（Score）和排名（Rank），它的返回值类型会比普通 Set 稍微复杂一点（比如会用到 `TypedTuple` 来同时返回元素和分数）。



| **纯 Redis 原生命令**   | **Spring Boot opsForZSet() 对应方法** | **返回值类型**            | **作用说明**                                                 |
| ----------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| **ZADD**                | `.add(key, value, score)`             | `Boolean`                 | 添加元素并指定分数。返回 true 表示新增，false 表示元素已存在并**更新了分数**。 |
| **ZSCORE**              | `.score(key, value)`                  | `Double`                  | 获取指定元素的分数。元素不存在返回 null。                    |
| **ZINCRBY**             | `.incrementScore(key, value, delta)`  | `Double`                  | 让指定元素的分数原子性地增加（或减少）特定的值。返回操作后的新分数。 |
| **ZRANK**               | `.rank(key, value)`                   | `Long`                    | 获取元素的排名（**按分数从小到大**，从 0 开始）。            |
| **ZREVRANK**            | `.reverseRank(key, value)`            | `Long`                    | 获取元素的排名（**按分数从大到小**，从 0 开始。做排行榜常用）。 |
| **ZRANGE**              | `.range(key, start, end)`             | `Set<String>`             | 按分数**从小到大**，获取指定索引范围内的元素（只返回元素名）。 |
| **ZREVRANGE**           | `.reverseRange(key, start, end)`      | `Set<String>`             | 按分数**从大到小**，获取指定索引范围内的元素（排行榜前 N 名常用）。 |
| **ZRANGE...WITHSCORES** | `.rangeWithScores(key, start, end)`   | `Set<TypedTuple<String>>` | 获取指定索引范围的元素，**并且同时带有对应的分数**。         |
| **ZCOUNT**              | `.count(key, minScore, maxScore)`     | `Long`                    | 统计分数在指定区间（min 到 max 之间）的元素个数。            |
| **ZREM**                | `.remove(key, values...)`             | `Long`                    | 移除集合中的一个或多个元素。返回实际移除的数量。             |
| **ZCARD**               | `.zCard(key)` 或 `.size(key)`         | `Long`                    | 获取 ZSet 集合中元素的总个数。                               |

| **纯 Redis 原生命令**               | **Spring Boot opsForZSet() 对应方法**                        | **返回值类型**            | **作用说明**                                                 |
| ----------------------------------- | ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------ |
| **ZREVRANGEBYSCORE**                | `.reverseRangeByScore(key, min, max)` 或 `.reverseRangeByScore(key, min, max, offset, count)` | `Set<String>`             | 按分数**从大到小（降序）**，获取指定分数区间（`min` 到 `max`）内的元素（只返回元素名，支持指定 `offset` 和 `count` 分页）。 |
| **ZREVRANGEBYSCORE ... WITHSCORES** | `.reverseRangeByScoreWithScores(key, min, max)` 或 `.reverseRangeByScoreWithScores(key, min, max, offset, count)` | `Set<TypedTuple<String>>` | 按分数**从大到小（降序）**获取指定分数区间内的元素，**并且同时带有对应的分数**（常用于 **Feed 流滚动分页**、按时间倒序查询动态等场景）。 |

只要看方法名，就能直接推导出它的行为：

- **`range`** -> 升序 + 按下标
- **`reverseRange`**-> 降序 + 按下标
- **`rangeByScore`**-> 升序 + 按分数
- **`reverseRangeByScore`**-> 降序 + 按分数
- 后面加上 **`WithScores`**->在上面的基础上，把元素对应的 Score 一并返回

```java
        String leaderboardKey = "game:leaderboard:season1"; // 第一赛季全服战力排行榜

        // 1. 添加与积分变动 (ZADD / ZINCRBY / ZSCORE)
        
        // 1.1 初始化玩家分数 (ZADD)
        // 返回值: Boolean (true表示新插入，false表示更新现有分数)
        stringRedisTemplate.opsForZSet().add(leaderboardKey, "PlayerA", 1500.0);
        stringRedisTemplate.opsForZSet().add(leaderboardKey, "PlayerB", 2200.0);
        stringRedisTemplate.opsForZSet().add(leaderboardKey, "PlayerC", 1850.5);
        stringRedisTemplate.opsForZSet().add(leaderboardKey, "PlayerD", 3000.0);

        // 1.2 玩家打赢了比赛，增加战力积分 (ZINCRBY)
        // 返回值: Double (增加后的最新总积分)
        Double newScore = stringRedisTemplate.opsForZSet().incrementScore(leaderboardKey, "PlayerA", 350.0);
        System.out.println("PlayerA 获胜后的最新战力: " + newScore); // 此时变成 1850.0

        // 1.3 单独查询某个玩家的分数 (ZSCORE)
        // 返回值: Double
        Double scoreC = stringRedisTemplate.opsForZSet().score(leaderboardKey, "PlayerC");

        // 2. 排名查询 (ZRANK / ZREVRANK) - 排名索引从 0 开始
        
        // 2.1 按分数从大到小排，查看我的排名 (ZREVRANK) - 排行榜最常用
        // 返回值: Long (注意：第一名返回 0，第二名返回 1。如果不存在返回 null)
        Long myRank = stringRedisTemplate.opsForZSet().reverseRank(leaderboardKey, "PlayerC");
        System.out.println("PlayerC 的排名是第: " + (myRank != null ? (myRank + 1) : "未上榜") + " 名");

        // 2.2 按分数从小到大排 (ZRANK) - 常用于“淘汰名单”、“倒数垫底查询”
        Long bottomRank = stringRedisTemplate.opsForZSet().rank(leaderboardKey, "PlayerD");

        // 3. 拉取排行榜列表 (ZREVRANGE / ZRANGE...WITHSCORES)
        
        // 3.1 获取全服战力前 3 名的玩家名字 (ZREVRANGE)
        // 返回值: Set<String> (0 是第一名，2 是第三名)
        Set<String> top3Players = stringRedisTemplate.opsForZSet().reverseRange(leaderboardKey, 0, 2);
        System.out.println("全服战力前三名: " + top3Players);

        // 3.2 ⭐ (高频) 获取前 3 名玩家及其具体分数 (WITHSCORES)
        // 返回值: Set<TypedTuple<String>> (包含了 value 和 score 的封装对象)
        Set<TypedTuple<String>> top3WithScores = stringRedisTemplate.opsForZSet().reverseRangeWithScores(leaderboardKey, 0, 2);
        
        System.out.println("--- 全服战力榜 TOP 3 ---");
        if (top3WithScores != null) {
            int rank = 1;
            for (TypedTuple<String> tuple : top3WithScores) {
                // tuple.getValue() 获取玩家名，tuple.getScore() 获取分数
                System.out.println("第 " + rank + " 名: " + tuple.getValue() + "，战力: " + tuple.getScore());
                rank++;
            }
        }


        // 4. 统计与清理 (ZCOUNT / ZCARD / ZREM)
        
        // 4.1 统计战力在 1500 到 2000 之间的玩家人数 (ZCOUNT)
        // 返回值: Long
        Long midTierCount = stringRedisTemplate.opsForZSet().count(leaderboardKey, 1500.0, 2000.0);

        // 4.2 获取整个排行榜的总人数 (ZCARD)
        // 返回值: Long
        Long totalPlayers = stringRedisTemplate.opsForZSet().zCard(leaderboardKey); // 也可以用 .size()

        // 4.3 移除违规玩家 (ZREM)
        // 返回值: Long (成功移除的数量)
        Long removedCount = stringRedisTemplate.opsForZSet().remove(leaderboardKey, "PlayerB");
```



### TypedTuple

在 Spring Data Redis 中，`TypedTuple`（全称 `org.springframework.data.redis.core.ZSetOperations.TypedTuple`）是一个专门为 **ZSet（有序集合）** 设计的接口（Tuple 意为“元组”）。

简单来说，它的核心作用就是：**把 Redis 中的“元素值（Value）”和“分数（Score）”打包捆绑在一起，作为一个整体返回给 Java 程序**。

当你在 Redis 中执行带分数的查询（例如获取排行榜前 10 名）时，Redis 返回给你的不仅是成员的名字（比如 `"PlayerA"`），还包括他们的积分（比如 `3000.0`）。

如果只用普通的 `Set<String>` 接收，你只能拿到玩家的名字，却丢掉了他们的分数。而如果使用 `Set<TypedTuple<String>>`，每个元素都是一个包含双料信息的对象，取值和查分两不误。



| **方法签名** | **返回值类型**          | **作用说明**                                                 |
| ------------ | ----------------------- | ------------------------------------------------------------ |
| `size()`     | `int`                   | 获取该元素里面的个数                                         |
| `getValue()` | `V` （通常是 `String`） | 获取 ZSet 中的**元素内容**（例如：玩家的名字、商品的 ID）。  |
| `getScore()` | `Double`                | 获取该元素对应的**分数**（例如：玩家的战力、商品的销量热度）。 |

```java
// 调用帶 WithScores 的方法，返回的是一个 TypedTuple 的集合
Set<TypedTuple<String>> top3WithScores = stringRedisTemplate.opsForZSet()
    .reverseRangeWithScores(leaderboardKey, 0, 2);

if (top3WithScores != null) {
    for (TypedTuple<String> tuple : top3WithScores) {
        // 通过 getValue() 获取元素名
        String member = tuple.getValue(); 
        
        // 通过 getScore() 获取对应的分数
        Double score = tuple.getScore();  
        
        System.out.println("玩家: " + member + "，分数: " + score);
    }
}
```

总结而言，`TypedTuple` 就是 Spring 框架为了让我们在 Java 中方便地同时处理 **Redis 有序集合的“值与分值”** 而提供的一个标准数据封装载体。



## 七. 通用命令

除了针对特定数据类型的操作（如针对 String 的 `SET`，针对 List 的 `LPUSH` 等），Redis 还有一系列**通用命令**。这些命令是不区分数据类型的，无论这个 key 对应的是 String、Hash 还是 ZSet，它们都能适用。这些命令主要负责对键（Key）本身的生命周期、属性和整个数据库的状态进行管理。

在 Spring Boot 的 `StringRedisTemplate` 中，由于这些操作不针对具体的数据结构，它们并不在 `opsForValue()` 或 `opsForHash()` 下面，而是**直接由 `stringRedisTemplate` 本身提供**。



| **纯 Redis 原生命令** | **Spring Boot 对应方法**                 | **返回值类型**    | **作用说明**                                                 |
| --------------------- | ---------------------------------------- | ----------------- | ------------------------------------------------------------ |
| **KEYS pattern**      | `.keys(pattern)`                         | `Set<String>`     | 查找所有符合给定模式（pattern）的 key。**⚠️ 注意：生产环境禁用！**会导致 Redis 阻塞。 |
| **EXISTS**            | `.hasKey(key)`                           | `Boolean`         | 判断一个 key 是否存在。                                      |
| **DEL**               | `.delete(key)`  `.delete(Collection<K>)` | `Boolean`  `Long` | 删除一个或多个 key。返回成功删除的数量（如果是单个则是 true/false）。 |
| **EXPIRE**            | `.expire(key, timeout, TimeUnit)`        | `Boolean`         | 为一个存在的 key 设置过期时间。                              |
| **EXPIREAT**          | `.expireAt(key, Date)`                   | `Boolean`         | 为 key 设置一个具体的过期时间点（时间戳）。                  |
| **TTL**               | `.getExpire(key)`                        | `Long`            | 查看 key 的剩余存活时间（秒）。返回 `-1` 代表永久有效，`-2` 代表已不存在。 |
| **PTTL**              | `.getExpire(key, TimeUnit)`              | `Long`            | 作用同 TTL，但可以指定返回的时间单位（如毫秒）。             |
| **TYPE**              | `.type(key)`                             | `DataType`        | 查看 key 对应 value 的数据类型（NONE, STRING, LIST, SET, ZSET, HASH）。 |
| **RENAME**            | `.rename(oldKey, newKey)`                | `void`            | 修改 key 的名称。如果 newKey 已存在，会覆盖原有值。          |
| **RENAMENX**          | `.renameIfAbsent(oldKey, newKey)`        | `Boolean`         | 仅当 newKey 不存在时，才进行重命名操作。                     |



```java
        String key = "session:user:1001";
        stringRedisTemplate.opsForValue().set(key, "active");

        // 1. 存在性判断与类型检查 (EXISTS / TYPE)
        
        // 1.1 判断 Key 是否存在 (EXISTS)
        // 返回值: Boolean
        Boolean exists = stringRedisTemplate.hasKey(key);
        System.out.println("Key是否存在: " + exists);

        // 1.2 查看 Key 的数据类型 (TYPE)
        // 返回值: DataType (枚举类，可能的值有 NONE, STRING, LIST, SET, ZSET, HASH)
        DataType type = stringRedisTemplate.type(key);
        System.out.println("Key的数据类型: " + (type != null ? type.name() : "未知"));

        // 2. 生命周期管理：过期时间 (EXPIRE / TTL)

        // 2.1 为已存在的 Key 设置过期时间 (EXPIRE)
        // 返回值: Boolean (true 表示设置成功，如果 key 不存在则返回 false)
        Boolean expireSet = stringRedisTemplate.expire(key, 30, TimeUnit.MINUTES);

        // 2.2 也可以指定一个具体的过期日期时间点 (EXPIREAT)
        Date tomorrow = new Date(System.currentTimeMillis() + 24 * 60 * 60 * 1000);
        stringRedisTemplate.expireAt(key, tomorrow);

        // 2.3 查看 Key 的剩余存活时间 (TTL)
        // 返回值: Long 
        // 正常情况返回剩余秒数；返回 -1 表示没有设置过期时间（永久）；返回 -2 表示 Key 已经不存在
        Long ttl = stringRedisTemplate.getExpire(key);
        System.out.println("剩余存活时间(秒): " + ttl);


        // 3. 键的管理操作：重命名与删除 (RENAME / DEL)
        
        String newKeyName = "session:user:1001:v2";
        
        // 3.1 只有当新名字的 key 不存在时才重命名 (RENAMENX)
        // 返回值: Boolean
        Boolean renamed = stringRedisTemplate.renameIfAbsent(key, newKeyName);

        // 3.2 删除单个 Key (DEL)
        // 返回值: Boolean
        Boolean deleted = stringRedisTemplate.delete(newKeyName);
        System.out.println("是否删除成功: " + deleted);

        // 3.3 批量删除多个 Key
        // 返回值: Long (实际成功删除的数量)
        Long deletedCount = stringRedisTemplate.delete(Arrays.asList("key1", "key2", "key3"));


        // ==========================================
        // 4. 模糊查询 (KEYS) - ⚠️ 生产环境危险操作
        // ==========================================
        // ⚠️ 警告：KEYS * 会遍历整个 Redis，如果数据量大，会直接导致单线程的 Redis 严重阻塞！
        // 生产环境中如果要模糊查询，强烈建议使用 SCAN 命令替代。
        
        // 返回值: Set<String>
        Set<String> allSessionKeys = stringRedisTemplate.keys("session:user:*");
    }
}
```



## 八. Docker部署

在 CentOS 终端里按下回车执行这段 `docker run` 之前，**请务必确保宿主机上的 `/data/redis/conf/redis.conf` 这个文件已经真实存在，并且里面已经写好了配置！**

如果这个文件在宿主机上不存在，Docker 在执行挂载时会“自作聪明”地认为你想要挂载的是一个**文件夹**，从而在宿主机上新建一个名为 `redis.conf` 的空文件夹。这会导致容器内的 Redis 启动报错并不断重启（因为它期望读取的是一个文本文件，却读到了一个目录）。

**需要做的准备工作：**

1. 在宿主机上创建目录和文件：

   ```bash
   mkdir -p /data/redis/conf
   touch /data/redis/conf/redis.conf
   ```

2. 编辑这个 `redis.conf` 文件，**千万别忘了把你之前在命令行里的参数补进去**。至少要把下面两行加到文件里，否则你的密码就没了，新写入的数据也不会持久化了：

   ```bash
   # 开启AOF持久化
   appendonly yes
   
   # 设置你的访问密码
   requirepass 123456
   ```

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  --restart=always \
  -v /data/redis/data:/data \
  -v /data/redis/conf/redis.conf:/etc/redis/redis.conf \
  redis:7 \
  redis-server /etc/redis/redis.conf
```
