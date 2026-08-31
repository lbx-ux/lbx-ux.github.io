---
title: 五.StringRedisTemple
description: 1.StringRedisTemple
pubDate: 2026-08-23
tags: [Redis]
source: Java后端/数据库/Redis/1.基础/4. RedisTemplate.md
---

## 1.StringRedisTemple

在 Spring Boot 中直接使用自带的 `StringRedisTemplate` 而不自己封装 `RedisConfig`，**这其实是一个非常推荐且在企业级开发中非常主流的做法**。

Spring Boot 的自动配置（`RedisAutoConfiguration`）默认会为你注入 `StringRedisTemplate` 实例。它底层的所有序列化器（Key、Value、HashKey、HashValue）都默认使用了 `StringRedisSerializer`。这样最大的好处是**存入 Redis 的数据是纯净的字符串，不仅肉眼可读（方便在可视化工具里查看），也没有 Java 默认序列化带来的乱码（比如 `\xac\xed\x00\x05t\x00` 前缀）和跨语言兼容性问题。**

不过，只使用它也意味着你需要注意以下几个核心点：

**1. 存取 Java 对象需要“手动”转换 JSON**

因为 `StringRedisTemplate` 只能存取字符串，当你需要缓存复杂的 Java 对象（如 `User`、`Order`）时，不能像自定义的 `RedisTemplate<String, Object>` 那样直接丢进去。

**你需要自己完成 JSON 的序列化和反序列化：**

```java
// 存对象
User user = new User(1, "Alice");
stringRedisTemplate.opsForValue().set("user:1", JSONUtil.toJsonStr(user));

// 取对象
String cachedJson = stringRedisTemplate.opsForValue().get("user:1");
if (cachedJson != null) {
    User cachedUser = objectMapper.readValue(cachedJson, User.class);
}
```

*提示：虽然多写了两行代码，但这种方式最稳定，且避免了反序列化漏洞。你也可以自己写一个简单的 Util 工具类把这两行代码包起来。*



**2. 默认不支持事务（Transaction）**

自带的 `StringRedisTemplate` 默认是**关闭**事务支持的（`enableTransactionSupport = false`）。

如果你在代码中使用了 `@Transactional` 注解，期望数据库和 Redis 的操作同时回滚，直接用自带的 `StringRedisTemplate` 是做不到的。

如果确实需要 Redis 事务支持，通常还是需要通过写一个简易的 `@Configuration` 来开启，或者使用 `execute` 方法配合 `SessionCallback` 来手动控制事务。



## 2.RedisConfig

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Key 和 HashKey 使用 String 序列化
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringRedisSerializer);
        template.setHashKeySerializer(stringRedisSerializer);

        // Value 和 HashValue 使用 JSON 序列化
        GenericJackson2JsonRedisSerializer jsonRedisSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonRedisSerializer);
        template.setHashValueSerializer(jsonRedisSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

这是一个在 Spring Boot 项目中非常经典且常用的 **Redis 配置类**。

它的核心作用是**重新定义 `RedisTemplate` 的序列化方式**，从而解决 Spring Boot 默认配置带来的一些痛点。

以下是关于如何使用它以及它的具体使用场景的详细解析：

**1. 这个配置类做了什么？**

在 Spring Boot 中，默认自动注入的 `RedisTemplate` 使用的是 JDK 原生的序列化机制（`JdkSerializationRedisSerializer`）。

您图片中的代码通过 `@Bean` 覆盖了默认配置，做了以下两件事：

- **Key 和 HashKey**：使用了 `StringRedisSerializer`。这意味着存入 Redis 的键（Key）将以纯文本字符串的形式保存。
- **Value 和 HashValue**：使用了 `GenericJackson2JsonRedisSerializer`。这意味着存入 Redis 的值（无论是简单的字符串还是复杂的 Java 对象）都会被自动转换为 **JSON 格式**的字符串保存。

**2. 使用场景**

这段配置主要用于解决以下几个实际开发中的场景和痛点：

- **场景一：可视化调试与拒绝“乱码”**
  - **痛点**：如果不按图片中那样配置，直接使用默认的 `RedisTemplate` 存数据，当您使用 Redis 可视化工具（如 Another Redis Desktop Manager）查看时，Key 和 Value 都会带上一堆类似 `\xac\xed\x00\x05t\x00` 的 16 进制前缀（JDK 序列化特征），根本看不懂。
  - **解决**：配置后，存进去的是纯文本和 JSON，人类肉眼可读，极大方便了开发和排查问题。
- **场景二：跨语言的数据共享**
  - **痛点**：JDK 序列化生成的数据，只有 Java 程序能反序列化读取。如果您的架构中有 Python、Node.js 或 Go 写微服务，它们将无法读取 Java 存入 Redis 的数据。
  - **解决**：JSON 是跨语言的通用格式。使用 JSON 序列化后，任何语言的客户端都可以轻松读取和解析 Redis 中的数据。
- **场景三：便捷地缓存复杂 Java 对象**
  - **场景**：当您需要把数据库里查出来的 `User` 对象或 `Order` 列表放进 Redis 缓存时。
  - **解决**：有了这个配置，您不需要手动将对象转换成 JSON 字符串。直接调用 `redisTemplate.opsForValue().set("user:1", userObj)`，配置类中的 Jackson 序列化器会在底层自动帮您把 `userObj` 转换为 JSON 并存入 Redis；读取时也会自动转换回 Java 对象。

**3. 如何在代码中使用它？**

注入 `RedisTemplate`,然后在业务类（如 Service）中，只需要直接注入即可：

```java
@Service
public class UserService {
    // 注入在 RedisConfig 中配置好的 RedisTemplate
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public void saveUserToCache(String userId, User userObject) {
        String key = "user:" + userId;
        // 2. 直接存入，底层会自动将 userObject 转为 JSON 格式
        redisTemplate.opsForValue().set(key, userObject);
    }

    public User getUserFromCache(String userId) {
        String key = "user:" + userId;
        // 3. 直接读取，底层会自动将 JSON 转回 User 对象
        return (User) redisTemplate.opsForValue().get(key);
    }
}
```



## 3.对比

使用StingRedisTemple的时候只要自己手动把java对象转换为JSON字符串，也就和自定义RedisConfig中的RedisTemple没什么区别了：

您的理解非常到位！从最终存在 Redis 里的数据表现来看，您说的这种做法和自定义 `RedisConfig` **在功能上是高度一致的**，都是把 Java 对象变成 JSON 存进去。

但在实际的工程应用中，它们两者还是有**两个非常关键的区别**。用大白话说，一个是“全自动带有副作用”，另一个是“纯手动但更干净”。

以下是详细的对比差异：

1. **代码的便捷度（全自动 vs 纯手动）**

- **自定义 `RedisTemplate`（图片中的配置）**：

  这是“全自动”模式。您只需要配置一次，之后在代码里直接扔 Java 对象进去，直接拿 Java 对象出来。底层的序列化器会静默帮您完成转换，业务代码非常干净。

- **`StringRedisTemplate` + 手动转换**：

  这是“纯手动”模式。您每次存数据，都要写一遍 `JSON.toJSONString(obj)`；每次取数据，都要写一遍 `JSON.parseObject(jsonStr, User.class)`。如果项目中频繁使用 Redis，会产生大量的冗余（样板）代码。

2. **Redis 内存占用与 JSON 的“纯净度”（核心区别）**

这是两者在底层数据结构上最大的不同，往往也是决定公司团队选用哪种方案的关键所在。

- **图片中的配置（使用 `GenericJackson2JsonRedisSerializer`）**：

  为了能实现“全自动”反序列化（也就是取出数据时，它知道该把这段 JSON 转成什么 Java 对象），这个序列化器会在生成的 JSON 中**自动追加一个特殊的属性（通常是 `@class`）来记录全类名**。

  - 存入 Redis 的实际内容会类似这样：

    `{"@class":"com.example.project.entity.User", "id":1, "name":"张三"}`

  - **缺点**：如果您的数据量非常大，每条数据都带上一长串包名和类名，会**严重浪费 Redis 的内存空间**。

- **`StringRedisTemplate` + 手动转换**：

  因为是您手动调用的 JSON 工具（比如 Jackson, Fastjson, Gson），生成的 JSON 是**最纯粹**的。

  - 存入 Redis 的实际内容会是这样：

    `{"id":1, "name":"张三"}`

  - **优点**：极其节省内存，跨语言读取最友好（没有针对 Java 的额外类名信息）。

  - **代价**：因为 JSON 里没有类名，所以在取数据反序列化时，您必须**手动显式地告诉 JSON 工具类**把它转成什么对象（即传入 `User.class`）。

**总结与建议**

用一张表来直观对比：

| **特性**         | **自定义 RedisTemplate 配置**                            | **StringRedisTemplate + 手动 JSON 转换** |
| ---------------- | -------------------------------------------------------- | ---------------------------------------- |
| **业务代码量**   | 极少，无脑 `set` 和 `get`                                | 较多，需要每次手动转 JSON / 解析 JSON    |
| **内存占用**     | 较大（自带 `@class` 记录包名类名）                       | **最小**（纯净 JSON，没有多余字符）      |
| **跨语言友好度** | 一般（其他语言拿到带有 `@class` 的数据可能需要特殊处理） | **最高**（完全标准的 JSON 数据）         |
