---
title: 四.  Key 的设计规范
description: Key的设计主要围绕可读性、长度控制和生命周期展开。
pubDate: 2026-08-23
tags: [Redis]
series: Redis
order: 4
source: Java后端/数据库/Redis/1.基础/3. Redis键值设计.md
---

## 一.  Key 的设计规范

Key 的设计主要围绕**可读性、长度控制**和**生命周期**展开。

### 1. 命名空间与格式规范

采用分段设计的原则，使用冒号 `:` 作为分隔符，构建类似层级的文件目录结构。

- **推荐格式：** `[项目名/业务名]:[模块名]:[实体名]:[唯一标识]`
- **示例：** `mall:user:info:10086`（商城项目:用户模块:用户信息:用户ID）
- **优势：** 可读性强，且在主流的可视化工具（如 Another Redis Desktop Manager）中会自动折叠成树状目录，方便管理。



### 2. 长度与字符控制

- **控制长度：** Key 本身也是字符串，会占用内存。在保证语义清晰的前提下，尽量缩短长度。通常建议 Key 不要超过 **64 字节**。
  - *反例：* `mall:user:information:detail:data:for:userid:10086`
  - *正例：* `mall:user:info:10086`
- **杜绝特殊字符：** 严禁包含空格、换行、单双引号及其他转义字符，只使用字母、数字和下划线、短横线。



### 3. 生命周期管理（TTL）

- **拒绝裸奔：** 除极少数极核心的全局配置项外，**所有的 Key 都必须设置过期时间（TTL）**。
- **打散过期时间：** 批量写入数据时，务必在基础过期时间上增加一个随机值（如 `基础时间 + 1~300秒随机值`），防止同一时刻大量 Key 同时失效，引发**缓存雪崩**。



## 二. Value 的设计规范

Value 的设计核心是**数据结构选型**和**体积控制（拒绝 BigKey）**。

### 1. 数据结构（Type）的精准选型

不要万物皆 String，应根据业务场景选择最省内存、最高效的数据结构。

| **业务场景**                       | **错误选型**            | **正确选型** | **原因分析**                                                 |
| ---------------------------------- | ----------------------- | ------------ | ------------------------------------------------------------ |
| **存储对象（需频繁修改局部字段）** | String (存 JSON 字符串) | **Hash**     | String 修改单字段需全部反序列化再覆盖；Hash 可直接 `HSET` 修改单个字段，网络IO和计算更小。 |
| **海量点赞数、播放量统计**         | String                  | **Hash**     | 将同类短 Hash 聚集，利用 `ziplist/listpack` 底层编码，能极大节省内存消耗。 |
| **去重或集合运算（交/并/差）**     | List                    | **Set**      | Set 自带去重，且支持 `SINTER`（交集）等原生集合计算指令。    |
| **排行榜、延时队列**               | List                    | **ZSet**     | ZSet 自带分数权重，支持按分数范围高效拉取数据。              |



### 2. 严控 BigKey（大键）

Redis 是单线程处理命令的，如果 Value 体积过大，在执行读取、修改甚至删除操作时，会严重阻塞主线程，导致整个 Redis 实例卡顿。

- **String 类型的 BigKey：** 建议单个 String 的 Value 控制在 **10KB** 以内。最大绝对不能超过 1MB。
- **集合类型的 BigKey：** Hash、List、Set、ZSet 里的元素数量建议控制在 **5000** 个以内。
- **如何拆分 BigKey？**
  - *大 String：* 如果是巨大的 JSON，拆分成多个细粒度的 String 或使用 Hash。
  - *大集合：* 采用分桶策略（Sharding）。例如把一个包含 10 万用户的 `Set`，拆分成 100 个 `Set`，Key 后缀加上分桶号（如 `user:blacklist:00` 到 `user:blacklist:99`）。



**危害：**

- **网络阻塞**：对BigKey执行读请求时，少量的QPS就可能导致带宽使用率被占满，导致Redis实例，乃至所在物理机变慢
- **数据倾斜**：BigKey所在的Redis实例内存使用率远超其他实例，无法使数据分片的内存资源达到均衡
- **Redis阻塞**：对元素较多的hash、list、zset等做运算会耗时较I旧，使主线程被阻塞
- **CPU压力**：对BigKey的数据序列化和反序列化会导致CPU的使用率飙升，影响Redis实例和本机其它应用



### 3. 序列化与压缩

对于非结构化的数据对象存储：

- **可读性优先：** 使用 JSON 序列化，方便开发调试。
- **空间与性能优先：** 使用 Protobuf、Kryo、Hessian 等二进制序列化，体积通常比 JSON 小 30% - 50%。
- **超长文本：** 如果必须在 Redis 存长文本（如文章内容，大于 10KB），存入前在业务层使用 GZIP/Snappy 等算法进行压缩，读取时解压。



## 三. BigKey

### 1. 定位 BigKey 

根据当前环境的允许程度，可以通过以下几种方式排查：

| **排查方案**         | **操作方式**                                               | **优点**                                            | **缺点**                                                     | **适用场景**                                     |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| **原生命令探测**     | `redis-cli --bigkeys`                                      | 官方自带，无需安装第三方工具，执行简单。            | 只能找出每种数据结构中最大的一个，耗时较长，对节点有一定访问压力。 | 快速摸底、日常巡检。                             |
| **RDB 离线分析**     | 导出 `dump.rdb` 后，使用 `rdbtools` 或可视化分析工具。     | **零侵入，完全不影响线上 Redis 性能**，分析维度全。 | 时效性较差，需要将庞大的 RDB 文件下载到本地或分析服务器。    | 深度排查、定期生成内存优化报告。                 |
| **单点精准测量**     | `MEMORY USAGE <key>`                                       | 精确字节级计算。                                    | 需要提前知道可疑的 Key，不能全局扫描。                       | 开发调试阶段排查特定业务的 Key 大小。            |
| **自定义 SCAN 脚本** | 编写 Java/Python 脚本使用 `SCAN` 结合 `STRLEN/HLEN` 遍历。 | 灵活性极高，可以结合具体的业务前缀进行针对性扫描。  | 开发成本高，控制不好休眠时间依然可能影响性能。               | 针对特定模块（如用户模块、商品模块）的精准排查。 |



**Redis宿主机**

```bash
redis-cli -h 127.0.0.1 -p 6379 -a "123456" --bigkeys
```

**容器化环境下的使用方法**

```bash
docker exec -it redis redis-cli -a "123456" --bigkeys -i 0.1
```

**第三方工具**

-  Redis-Rdb-Tools 分析RDB快照文件，全面分析内存使用情况
- https://github.com/sripathikrishnan/redis-rdb-tools



### 2. 处理方案

找到 BigKey 后，**严禁直接在生产环境使用 `DEL` 命令删除**。删除一个大键涉及底层的内存释放，单线程下这会严重阻塞后续的并发请求。

#### 1. 安全删除：使用 `UNLINK` (异步删除)

从 Redis 4.0 开始，官方引入了 `UNLINK` 命令。

- **机制：** `UNLINK` 会将该 Key 从键值字典中摘除（使得客户端立刻无法访问），然后把实际的内存回收操作交给后台的异步线程（BIO 线程）去慢慢释放。
- **落地：** 在 Spring Boot 中，如果使用的是 `StringRedisTemplate`，可以直接调用 `unlink()` 方法替代传统的 `delete()`。

#### 2. 渐进式清理：手动分批删除

如果是老版本 Redis（低于 4.0）或需要更细粒度的控制，必须采用渐进式删除。核心思想是“蚂蚁搬家”，逐步清空集合，最后再删除 Key 本身。

- **Hash：** 使用 `HSCAN` 每次获取 100 个字段，然后用 `HDEL` 删掉这 100 个，循环直到清空。
- **List：** 使用 `LTRIM` 逐步修剪，例如每次 `LTRIM key 0 -101`（保留前 100 个之外的数据，即删除尾部 100 个），直到完全清空。
- **Set：** 使用 `SSCAN` 扫描出部分元素，配合 `SREM` 移除。
- **ZSet：** 使用 `ZREMRANGEBYRANK` 命令，每次删除排名 0~99 的元素。

#### 3. 源头改造：对 BigKey 进行“打散”拆分（Sharding）

如果在业务设计上，这个数据必须存在且很大（例如高并发秒杀场景下的全量商品库存列表，或是 O2O 平台某个热门商圈的海量商户坐标集合），就必须在架构端对其进行拆分。

**拆分策略：哈希取模打散**

假设原本有一个巨大的 Hash，存储了 100 万个活跃用户的会话信息，Key 为 `app:user:session:active`。

1. **确定分片数：** 比如拆分成 1000 个桶（Bucket）。
2. **计算路由：** 当需要写入或读取 `userId = 85934` 的信息时，对 userId 进行哈希取模：`85934 % 1000 = 934`。
3. **读写新 Key：** 将数据存入/读取自 `app:user:session:active:934` 这个拆分后的 Key 中。

这样，原本体积庞大的单一 Hash 就变成了 1000 个微小且安全的 Hash。

#### 4. 数据结构降级与压缩

有时 BigKey 并非因为元素过多，而是因为单个元素体积过大。

- **清理无效字段：** Java 后端在将实体类序列化写入 Redis 时，务必通过 `@JsonIgnore` 等注解屏蔽不需要缓存的冗余字段（如创建时间、更新时间、复杂的嵌套对象）。
- **开启压缩：** 将长文本写入 Redis 前，先通过 GZIP 等算法压缩成 `byte[]` 存入，取出时再解压，通常能缩小 70% 的体积。



## 四. RedisConstants

在企业级 Java 项目开发中，建立一个 `RedisConstants` 类是非常规范的做法。它的核心目的就是**消除代码中的“魔法值”（硬编码的字符串和数字）**，从而提高代码的**可读性**、**可维护性**以及**安全性**。

```java
public class RedisConstants {
    public static final String LOGIN_CODE_KEY = "login:code:";
    public static final Long LOGIN_CODE_TTL = 2L;
    
    public static final String LOGIN_USER_KEY = "login:token:";
    public static final Long LOGIN_USER_TTL = 36000L;

    public static final Long CACHE_NULL_TTL = 2L;
    
    public static final String CACHE_SHOP_KEY = "cache:shop:";
    public static final Long CACHE_SHOP_TTL = 30L;

    public static final String LOCK_SHOP_KEY = "lock:shop:";
    public static final Long LOCK_SHOP_TTL = 10L;

    public static final String SECKILL_STOCK_KEY = "seckill:stock:";
    public static final String BLOG_LIKED_KEY = "blog:liked:";
    public static final String FEED_KEY = "feed:";
    public static final String SHOP_GEO_KEY = "shop:geo:";
    public static final String USER_SIGN_KEY = "sign:";
}
```

