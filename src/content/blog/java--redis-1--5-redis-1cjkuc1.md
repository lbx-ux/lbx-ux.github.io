---
title: 六. Redis缓存
description: 一.Redis缓存Redis作为缓存（Cache）是它在实际项目中最核心、最常见的应用场景。它的主要作用是挡在关系型数据库（如MySQL）前面，替数据库抵挡高并发的读请求。因为Redis是基于内存的，
pubDate: 2026-08-23
tags: [Redis]
series: Redis
order: 6
source: Java后端/数据库/Redis/1.基础/5. Redis缓存.md
---

## 一. Redis缓存

Redis 作为缓存（Cache）是它在实际项目中最核心、最常见的应用场景。它的主要作用是**挡在关系型数据库（如 MySQL）前面，替数据库抵挡高并发的读请求**。因为 Redis 是基于内存的，读写速度极快，能够成百上千倍地提升系统的响应性 能。

在引入缓存后，系统处理数据的最经典策略是 **旁路缓存模式（Cache Aside Pattern）**。

- **读流程：** 先读 Redis。如果命中（Cache Hit），直接返回数据；如果未命中（Cache Miss），则去读数据库，拿到数据后写入 Redis，最后返回给用户。
- **写流程：** 先更新数据库，然后再**删除** Redis 中的对应缓存。注意这里是*删除*而不是*更新*，这样可以有效避免并发时的脏数据问题。



## 二.  缓存的三大经典

在实际高并发场景下，如果仅仅是简单地读写缓存，会遇到三个致命问题：**缓存穿透、缓存击穿、缓存雪崩**。

| **异常类型** | **核心现象**                                                | **根本原因**                                                 | **主流解决方案**                                             |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 缓存穿透     | 查询**根本不存在**的数据                                    | 遭遇恶意攻击、爬虫扫描                                       | 1. **缓存空对象** (设置较短 TTL) 2. **布隆过滤器** 在访问缓存前拦截，若判断不存在则直接返回。 |
| 缓存击穿     | 某个**热点key**突然过期，导致**瞬间**大量并发请求打到数据库 | 某个承受极高并发请求的“热点 Key”，在访问高峰期刚好物理过期。 | 1. **互斥锁** (仅允许抢到锁的一个线程去查库重建缓存，其余线程重试等待，Double Check) 2. **逻辑过期** (Value 中存储过期时间字段，物理上不设 TTL，后台异步线程更新，其他线程返回旧数据) |
| 缓存雪崩     | 缓存层大面积失效，或者Redis宕机                             | 1. 大量的 Key 设置了相同的 TTL，导致**同一时间集中过期**。 2. Redis 节点突发宕机。 | 1. **随机 TTL** (给基础过期时间加上随机抖动值) 2. 搭建高可用架构 (Redis 哨兵/集群模式) 3. 业务服务层进行**限流与降级** |

- **穿透**是“**无中生有**”：数据哪儿都没有，必须用**布隆过滤器**或者**存空值**来堵住漏洞。
- **击穿**是“**单点突破**”：爆款商品突然没缓存了，必须用**分布式锁**选个代表去查库，其他人排队等。
- **雪崩**是“**全面崩盘**”：大量缓存集体阵亡或服务挂了，必须用**随机 TTL 打散**，并保证 Redis **高可用集群**。



### 1. 缓存穿透

**现象：** 用户频繁查询一个**在数据库和缓存中都不存在的数据**（比如恶意伪造的用户 ID：-1）。由于缓存不命中，每次请求都会打到数据库上，导致数据库压力剧增甚至宕机。

![image-20260812163550318](/covers/java--redis-1--5-redis-1cjkuc1/image-20260812163550318.png)

**解决方案：**

- **缓存空对象：** 即使数据库查不到，也把这个“空结果”缓存到 Redis 中，并设置一个较短的过期时间。
- **布隆过滤器 (Bloom Filter)：** 在请求到达 Redis 之前，先用布隆过滤器快速判断该 Key 是否存在。如果布隆过滤器判定不存在，直接拦截请求；判定存在，再放行查库（可能会有极小概率误判，但能挡住绝大部分恶意请求）。
  - **优点：** 占用内存极小（底层是位数组 BitMap），过滤性能极高。非常适合数据量巨大且防恶意攻击的场景。
  - **缺点：** 实现相对复杂，存在一定的误判率；而且布隆过滤器**很难删除数据**（只能加，不能删），如果数据库里删除了某条记录，布隆过滤器里很难同步清除。



#### 布隆过滤器

**布隆过滤器** 是一种高空间效率的概率型数据结构，专门用于快速判断一个元素**是否一定不存在**或**可能存在**于集合中。

**核心特性与判断准则**

- **判定不存在（Not in Set）：** 结果 **100% 确定不存在**（无假阴性 / False Negative）。
- **判定存在（In Set）：** 结果为 **大概率存在，但存在误判**（有假阳性 / False Positive）。
- **空间极低且高效：** 不存储原始数据本身，仅利用二进制位（Bit）标记状态，插入与查询时间复杂度均为 $O(k)$（$k$ 为哈希函数个数）。

**底层原理与工作流程**

布隆过滤器由一个长度为 $m$ 的**二进制位数组**（Bit Array）和 **$k$ 个相互独立的哈希函数**组成：

- **添加元素：**

  将待存数据分别经过 $k$ 个哈希函数计算，得到 $k$ 个数组下标，并将 Bit 数组中这 $k$ 个位置的值全部置为 `1`。

- **查询元素：**

  将待查数据同样计算 $k$ 个下标并检查对应位：

  - 只要有 **任意一个位置为 `0`** $\rightarrow$ 该数据**必定从未添加过**。
  - 若 **所有位置均为 `1`** $\rightarrow$ 该数据**大概率存在**（可能是多个其他数据哈希碰撞凑巧将这几位置成了 1）。

- **为什么通常不支持删除：**

  直接将对应位置置为 `0` 会破坏其他共享该 Bit 位的元素判断。若必须支持删除，需使用每个槽位记录计数的变种——**计数布隆过滤器**。

**经典业务应用场景**

- **防止缓存穿透：** 在查询 Redis 和 MySQL 之前，先经布隆过滤器拦截。若过滤器判定数据不存在，直接返回空，避免恶意随机 ID 请求击穿数据库。
- **海量数据去重与黑名单：** 垃圾邮件过滤、网页爬虫 URL 去重、黑名单 IP/用户校验。
- **底层存储引擎读优化：** LSM-Tree 架构（如 RocksDB、HBase、Cassandra）在读取 SSTable 磁盘文件前，用布隆过滤器过滤掉不包含目标 Key 的文件，大幅降低磁盘 I/O。



>- **“为什么布隆过滤器能判定‘一定不存在’，却只能判定‘可能存在’？”**
>  - **考核点：** 哈希碰撞本质。
>  - **答题核心：** 只要有 1 个对应 Bit 位为 `0`，说明没有任何一个添加操作触碰过该位，因此必然不存在；全部为 `1` 则可能是多个不同数据的哈希散列凑巧命中了这些位（即哈希碰撞产生假阳性）。
>- **“为什么默认不支持删除？如果要删除有什么解决方案？”**
>  - **考核点：** 位共享与数据结构变种。
>  - **答题核心：** 直接置 `0` 会误伤其他共享该位置的数据。解决方案是**计数布隆过滤器（Counting Bloom Filter）**，用多位计数器替代单 bit，但会大幅增加内存占用（通常 3~4 倍）；或者采用“定时全量重建”。
>
>- **“解决缓存穿透时，‘布隆过滤器’和‘缓存空对象’分别适用的场景是什么？”**
>  - **缓存空对象：** 实现简单，强一致性好维护；缺点是如果攻击者使用海量随机 Key，会占用大量 Redis 内存。
>  - **布隆过滤器：** 极致节省内存，适合 Key 范围巨大且不可预测的场景；缺点是存在误判，且需维护过滤器与 DB 的同步。
>  - **高分回答：** 实际工程常采用“布隆过滤器前置拦截 + 穿透后缓存短过期时间空值”的组合策略。
>- **“布隆过滤器和普通 BitMap 有什么区别？”**
>  - **答题核心：** BitMap 适用于**连续数字型 ID**（如用户连续签到、自增 ID 状态），空间极致且无误判；布隆过滤器通过多重哈希将任意类型（如 UUID、URL、字符串）映射到位数组中，支持非数值但牺牲了 100% 的准确度。





**业务实例：**

<img src="/covers/java--redis-1--5-redis-1cjkuc1/image-20260812164203904.png" alt="image-20260812164203904" style="zoom:67%;" />

```java
	    // 1. 从 Redis 中获取缓存
        String shopJson = stringRedisTemplate.opsForValue().get(key);
        
        // 2. 判断缓存是否命中（非空且非特殊空白字符）
        if (StrUtil.isNotBlank(json)) {
            //如果存在，直接返回
            return Result.success(JsoNUtil.toBean(shopJson,Shop.class));
        }
        //---------------------------缓存穿透重点---------------------------------------------- 
        // 3. 判断是否命中空对象（防穿透，例如缓存中存的值为 ""）
        if (json != null) {
            // 说明命中为了防止缓存穿透而缓存的空对象，直接返回
            return Result.error("店铺不存在");
        }

        // 4. 缓存未命中，查询数据库
        Shop shop=this.getByid(id);
        
        // 5. 数据库也不存在该数据，向 Redis 中写入一个空值（有效期较短），防止缓存穿透
        if (shop == null) {
            stringRedisTemplate.opsForValue().set(key, "", 2L, TimeUnit.MINUTES);
            return Result.error("店铺不存在");
        }
        
        // 6. 数据库存在，写入缓存并设置物理过期时间
        stringRedisTemplate.opsForValue（).set(key,JSoNUtil.toJsonStr(shop),30L,TimeUnit.MINUTES);
	    retun Result.success(shop);
```



### 2. 缓存击穿

**现象：** 针对某个**非常热点的 Key**（比如秒杀商品），在它**缓存过期的那一瞬间**，海量的并发请求同时涌入。因为缓存刚好失效，这些请求会瞬间全部穿透到数据库，把数据库“击穿”。

**解决方案：**

- **互斥锁 (Mutex Lock)：** 发现缓存未命中时，不立刻去查数据库，而是先去尝试获取一个分布式锁。拿到锁的线程去查数据库并重建缓存；没拿到锁的线程休眠一会再重试读缓存。
  - <img src="/covers/java--redis-1--5-redis-1cjkuc1/image-20260812171123814.png" alt="image-20260812171123814" style="zoom:67%;" />

- **逻辑过期：** 热点数据在 Redis 中不设置物理过期时间，而是在 Value 内部存一个“逻辑过期时间”字段。发现逻辑过期后，异步开启一个线程去更新缓存，当前请求依然快速返回旧数据。
  - <img src="/covers/java--redis-1--5-redis-1cjkuc1/image-20260812171158600.png" alt="image-20260812171158600" style="zoom:67%;" />

| **方案**     | **数据一致性**                   | **性能**                 | **适用场景**                                         |
| ------------ | -------------------------------- | ------------------------ | ---------------------------------------------------- |
| **互斥锁**   | 强一致，保证读到的都是新数据     | 较差，大量线程需阻塞等待 | 金融、交易、订单等必须保证数据绝对准确的场景。       |
| **逻辑过期** | 最终一致，会有短暂时间读到旧数据 | 极高，立刻响应无阻塞     | 秒杀大屏、热搜榜单、首页推荐等对性能要求极高的场景。 |



#### 1> 互斥锁

核心思路：相较于原来从缓存中查询不到数据后直接查询数据库而言，现在的方案是 进行查询之后，如果从缓存没有查询到数据，则进行互斥锁的获取，获取互斥锁后，判断是否获得到了锁，如果没有获得到，则休眠，过一会再进行尝试，直到获取到锁为止，才能进行查询

如果获取到了锁的线程，再去进行查询，查询后将数据写入redis，再释放锁，返回数据，利用互斥锁就能保证只有一个线程去执行操作数据库的逻辑，防止缓存击穿

![1653357860001](/covers/java--redis-1--5-redis-1cjkuc1/1653357860001.png)

**操作锁的代码：**

核心思路就是利用redis的setnx方法来表示获取锁，该方法含义是redis中如果没有这个key，则插入成功，返回1，在stringRedisTemplate中返回true，  如果有这个key则插入失败，则返回0，在stringRedisTemplate返回false，我们可以通过true，或者是false，来表示是否有线程成功插入key，成功插入的key的线程我们认为他就是获得到锁的线程。

```java
    //尝试获取锁
    private boolean tryLock(String key){
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
        return BooleanUtil.isTrue(flag);
    }
    //释放锁
    private void unLock(String key){
        stringRedisTemplate.delete(key);
    }
```

**操作代码：**

```java
    @Override
    public Result queryById(Long id) {
        //解决缓存击穿
        Shop shop = queryWithMutex(id);
        if(shop == null){
            return Result.error("店铺不存在");
        }
        return Result.success(shop);
    }

	 //可以同时预防穿透和击穿
     public Shop queryWithMutex(Long id) {
        // 1. 从Redis中查询缓存
        String shopJson=stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY+id);
        // 2. 判断是否命中缓存
        if(StrUtil.isNotBlank(shopJson)){
            return JSONUtil.toBean(shopJson,Shop.class);
        }
        // 判断命中是否为空白缓存防穿透值
        if(shopJson!=null){
            return null;
        }
        //——————————————————————————————————————————————————————————————————————————————————
        // 3. 未命中缓存，开始尝试缓存重建
        // 3.1 定义互斥锁的Key
        String lockKey = "lock:shop:" + id;
        Shop shop = null;
        try {
            // 3.2 尝试获取锁
            boolean isLock = tryLock(lockKey);
            // 3.3 判断是否获取成功
            if(!isLock){
                // 3.4 失败则休眠片刻并重试自旋
                Thread.sleep(50);
                return queryWithMutex(id);
            }
            
            // --- 【必须补充的步骤：Double Check】 ---------------------
            // 拿到锁之后，再去缓存里看一眼，别人是不是已经把饭做好了
            String checkJson = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
            if (StrUtil.isNotBlank(checkJson)) {
                return JSONUtil.toBean(checkJson, Shop.class);
            }
            if (checkJson != null) { // 命中空字符串（防穿透）
                return null;
            }
            //————————————————————————————————————————————————————
            
            // 3.5 成功，从数据库中查询数据
            shop=shopMapper.getById(id);
            // 4. 如果数据库中数据不存在
            if(shop == null){
                // 写入空值进缓存以防缓存穿透
                stringRedisTemplate.opsForValue().set("cache:shop:" + id, "", 2, TimeUnit.MINUTES);
                return null;
            }
            // 5. 写入Redis缓存
            stringRedisTemplate.opsForValue().set("cache:shop:" + id, JSONUtil.toJsonStr(shop),30,TimeUnit.MINUTES);
        }catch (Exception e){
            throw new RuntimeException(e);
        }
        finally {
            // 6. 释放互斥锁
            unLock(lockKey);
        }
        return shop;
    }
```



#### 2> 逻辑过期

**需求：修改根据id查询商铺的业务，基于逻辑过期方式来解决缓存击穿问题**

思路分析：当用户开始查询redis时，判断是否命中，如果没有命中则直接返回空数据，不查询数据库，而一旦命中后，将value取出，判断value中的过期时间是否满足，如果没有过期，则直接返回redis中的数据，如果过期，则在开启独立线程后直接返回之前的数据，独立线程去重构数据，重构完成后释放互斥锁。

<img src="/covers/java--redis-1--5-redis-1cjkuc1/1653360308731.png" alt="1653360308731" style="zoom:67%;" />

**步骤一**

新建一个实体类

```java
@Data
public class RedisData {
    private LocalDateTime expireTime;
    private Object data;
}
```

**步骤二**

在**ShopServiceImpl** 新增此方法，利用单元测试进行缓存预热

```java
public void saveShopRedis(Long id, Long expireSeconds){
        Shop shop=shopMapper.getById(id);
        RedisData redisData=new RedisData();
        redisData.setData(shop);
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(expireSeconds));
        stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id,JSONUtil.toJsonStr(redisData));
    }
```

它获取当前的系统时间，并在其基础上加上指定的秒数，得出一个**未来的具体时间点**，然后将这个时间点赋值给 `redisData` 对象的 `expireTime` 属性。

**步骤三**

**ShopServiceImpl**

```java
   private static final ExecutorService CACHE_REBUILD_EXECUTOR = Executors.newFixedThreadPool(10); 

    public Shop queryWithLogicalExpire(Long id){
        // 1. 从Redis查询缓存
        String shopJson=stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY+id);
        // 2. 判断是否命中缓存
        if(StrUtil.isBlank(shopJson)){
            // 逻辑过期方案默认缓存已预热，未命中则直接返回null
            return null;
        }
        // 3. 命中缓存，反序列化对象
        RedisData redisData=JSONUtil.toBean(shopJson,RedisData.class);
        Shop shop=JSONUtil.toBean((JSONObject) redisData.getData(),Shop.class);
        LocalDateTime expireTime=redisData.getExpireTime();
        // 4. 判断缓存是否已过期
        if(expireTime.isAfter(LocalDateTime.now())){
            // 4.1 未过期，直接返回商铺数据
            return shop;
        }
        
        // 4.2 已过期，开始重建缓存
        // 5. 尝试获取互斥锁
        String lockKey = LOCK_SHOP_KEY + id;
        boolean isLock = tryLock(lockKey);
        // 6. 判断锁是否获取成功
        if(isLock){
            // 6.1 获取成功，提交异步重建缓存任务给线程池
            CACHE_REBUILD_EXECUTOR.submit(() -> {
                try {
                    // 执行缓存重建，设定逻辑过期时长为20秒
                    this.saveShopRedis(id, 20L);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    // 重建完毕后释放互斥锁
                    unLock(lockKey);
                }
            });
        }
        // 7. 哪怕锁获取失败或成功（在后台异步重建时），都先返回过期数据
        return shop;
    }
```




### 3. 缓存雪崩 

**现象：** 大量的热点 Key 在**同一时间集中过期**，或者 **Redis 节点直接宕机**，导致原本由缓存承担的巨大流量像雪崩一样全部压向数据库。

<img src="/covers/java--redis-1--5-redis-1cjkuc1/image-20260812174102513.png" alt="image-20260812174102513" style="zoom:67%;" />

**解决方案：**

- **随机 TTL：** 给不同的 Key 设置过期时间时，加上一个随机值（比如原 TTL + 1到5分钟随机），避免大量 Key 同时失效。

  - ```java
    //  生成一个随机的抖动值 (例如 1 到 5 之间的随机整数)
    long randomJitter = RandomUtil.randomLong(1L, 6L);
    //  计算最终的 TTL
    long finalTtl = RedisConstants.CACHE_SHOP_TTL + randomJitter;
    ```
  
- **高可用架构：** 搭建 Redis 哨兵模式（Sentinel）或集群模式（Cluster），防止 Redis 单点故障。
- **服务降级与限流：** 在数据库压力过大时，通过限流中间件拒绝部分请求，保护核心业务和数据库不死。



## 三. 数据库和缓存的一致性

### 1. 旁路缓存模式

**场景一：常规高并发读写（如：修改商铺信息、更新外卖菜单）**

**核心策略：先更新数据库，后删除缓存（Cache Aside）**

这是最经典的旁路缓存模式。为什么要**删除**而不是更新？因为在并发修改时，更新缓存极易造成由于线程执行顺序交错导致的脏数据覆盖。直接删除缓存，让下一个读请求自己去数据库拉取最新数据，天然规避了并发写冲突。

**潜在风险与兜底：** 如果代码执行了 `update MySQL`，但在执行 `delete Redis` 时网络闪断失败了，就会出现严重的脏数据。

**企业级保障方案：**

为了保证删除动作“绝对成功”，通常会引入消息队列（如 RabbitMQ）作为兜底：

1. **基于 MQ 的异步重试：** 如果程序中删除 Redis 失败，将需要清理的 Key 发送到 RabbitMQ。由专门的消费者不断重试删除操作，直到成功为止。
2. **基于 Canal 监听 Binlog（彻底解耦）：** 业务代码只管更新 MySQL，不去操作 Redis。通过部署 Canal 中间件伪装成 MySQL 从节点，监听 Binlog 的变更，一旦发现数据被修改，Canal 将变更事件推送到 RabbitMQ，再由消费者去精准清理对应的 Redis 缓存。



### 2. 延迟双删

**场景二：数据库读写分离架构（如：海量用户同时浏览店铺详情）**

**核心策略：延迟双删**

当系统体量增大，MySQL 采用了“主库写、从库读”的读写分离架构时，主从同步是存在毫秒级延迟的。

如果使用常规策略：线程 A 更新了主库并删除了缓存 -> 主库数据还没同步到从库 -> 线程 B 去读数据，未命中缓存 -> 线程 B 读了从库的**旧数据**并写回 Redis -> 此时主从同步才完成。这就导致缓存里永远是旧数据。

**解决步骤：**

1. 先删除一次 Redis 缓存。

2. 更新 MySQL 主库。

3. **休眠一小段时间（例如 500ms，具体参考主从延迟的监控数据）。**

4. **再次删除 Redis 缓存。**

   这第二次删除，就是为了把休眠期间其他线程可能写入 Redis 的脏数据给“洗掉”。

   

```java
public void update(String key, Object data) {
    redisTemplate.delete(key);
    dbMapper.update(data);
    
    // 异步或同步休眠后二次删除，清理主从同步窗口期可能回填的脏数据
    CompletableFuture.runAsync(() -> {
        try {
            Thread.sleep(500);
            redisTemplate.delete(key);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    });
}
```



**场景三：极限高并发秒杀（如：RateHub 平台抢购超低价套餐）**

**核心策略：缓存预热 + 异步落库（Redis 反客为主）**

在真正的“秒杀”环节，瞬间几万甚至十几万的 QPS 直接打过来。此时如果还按照“先更新 MySQL，再操作 Redis”的逻辑，MySQL 瞬间就会被击垮。这种场景下，一致性的保证方式必须发生反转：

1. **缓存预热：** 活动开始前，提前将秒杀商品的库存（如：`seckill:stock:1001 = 100`）写入 Redis。
2. **Redis 承担核心写操作：** 用户的抢购请求不经过 MySQL。直接利用 Redis 的 Lua 脚本进行原子性的库存校验和扣减。因为 Redis 是单线程模型且在内存中操作，完全扛得住并发且不会超卖。
3. **MQ 异步落库削峰：** Lua 脚本在 Redis 扣减成功后，证明用户抢到了。此时将“创建订单和扣减 MySQL 库存”的指令作为一条消息发给 RabbitMQ。
4. **最终一致：** MySQL 端的消费者按照数据库能承受的速度，平滑地消费 RabbitMQ 里的消息，慢慢把订单数据落盘。

在这种极端并发下，**Redis 变成了事实上的“主数据”，而 MySQL 退化成了“备份数据”**，系统依靠 RabbitMQ 的可靠性投递来保证两者最终的数据一致。



## 四. CacheClient

`CacheClient` 是一个面向企业级、高并发场景的通用缓存辅助工具。它整合了泛型与函数式编程，将复杂的缓存穿透防护、互斥锁重建、逻辑过期异步刷新等底层逻辑与具体的数据库查询逻辑解耦，实现了**一次编写，处处复用**的目标。

在开发基于 Redis 的缓存系统时，有两大经典高并发问题需要防范

| 场景 | 概念及危害 | CacheClient 解决方案 |
| :--- | :--- | :--- |
| **缓存穿透** | 查询一个**不存在**的数据，缓存和数据库都未命中，导致每次请求都直达数据库，容易被攻击。 | **缓存空对象**：数据库无此数据时，向缓存写入一个空对象（`""`），并限定 2 分钟内物理过期。再次请求会直接在 Redis 被拦截并返回 `null`。 |
| **缓存击穿** | 一个**热门 key** 突然失效，或者高并发访问瞬间该 key 不存在，导致大量并发请求直接冲垮数据库。 | 1. **互斥锁方案**：通过 Redis 的 `SETNX` 加锁，同一时刻只允许一个线程查库重建缓存，其他线程退避自旋等待。2. **逻辑过期方案**：热点 key 不过期物理时限，只设置“逻辑过期时间”。过期时仅由一个线程异步获取锁并在后台线程池中重建缓存，而其他请求直接读取旧缓存数据，**零等待，高吞吐**。 |



### 1. 核心 API 详解

```java
@Component
public class CacheClient {
    // 写入物理缓存
    public void set(String key, Object value, Long time, TimeUnit unit);

    // 写入逻辑过期缓存
    public void setWithLogicalExpire(String key, Object value, Long time, TimeUnit unit);

    // 1. 通用缓存穿透防护查询
    public <R, ID> R queryWithPassThrough(
        String keyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit
    );

    // 2. 通用缓存击穿防护查询（互斥锁模式）
    public <R, ID> R queryWithMutex(
        String keyPrefix, String lockKeyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit
    );

    // 3. 通用缓存击穿防护查询（逻辑过期模式）
    public <R, ID> R queryWithLogicalExpire(
        String keyPrefix, String lockKeyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit
    );
}
```

**关键参数说明**：

- `keyPrefix`: 缓存的 Key 前缀。例如：`"cache:shop:"`。
- `lockKeyPrefix` (仅击穿方案): 分布式互斥锁的 Key 前缀。例如：`"lock:shop:"`。
- `id`: 查询对象的唯一业务 ID（支持 `Long`、`String` 等任何泛型 ID 类型）。
- `type`: 期望反序列化回的实体类 Class（例如 `Shop.class`）。
- `dbFallback`: 当缓存未命中或逻辑过期时，用于**调用数据库查询**的回调逻辑。可通过方法引用（`shopMapper::getById`）或 Lambda（`id -> selectFromDb(id)`）传入。
- `time` & `unit`: 过期时间时长及其时间单位。



### 2. 开发使用范例

下面以在其他服务类中（例如 **VoucherServiceImpl（优惠券服务）**）集成缓存为例：

**1. 注入缓存客户端**

```java
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements IVoucherService {

    private final VoucherMapper voucherMapper;
    
    // 1. 引入我们的通用 CacheClient
    private final CacheClient cacheClient;
}
```

**2. 使用“防缓存穿透”模式查询数据**

若你希望以**防穿透**为核心防护，并允许数据在缓存中到期物理自动清除：
```java
public Voucher queryVoucherById(Long id) {
    // 执行查询，自动完成 Redis 与数据库的联动
    return cacheClient.queryWithPassThrough(
        "cache:voucher:",        // 缓存前缀
        id,                     // 查询 ID
        Voucher.class,          // 反序列化的目标类型
        voucherMapper::getById, // 数据库查询逻辑 (函数式回调)
        30L,                    // 缓存有效期数值
        TimeUnit.MINUTES        // 有效期单位
    );
}
```

**3. 使用“分布式互斥锁”防击穿模**式

适合于对**数据强一致性**要求高，且即使高并发也仅允许极少数请求回打数据库的业务：
```java
public Voucher queryVoucherWithMutex(Long id) {
    return cacheClient.queryWithMutex(
        "cache:voucher:", 
        "lock:voucher:", 
        id, 
        Voucher.class, 
        voucherMapper::getById, 
        30L, 
        TimeUnit.MINUTES
    );
}
```

**4. 使用“逻辑过期”异步更新防击穿模式**

适合于**超高并发、超大访问量**的热点数据（如秒杀优惠券、爆款店铺），接受读取几秒钟之前的旧数据，但不允许请求发生任何响应卡顿：
> **注意**：逻辑过期机制依赖“缓存预热”，即必须有其他组件提前将数据以 `setWithLogicalExpire` 形式持久化写入 Redis 之后，该机制才能正常运行。
```java
public Voucher queryVoucherWithLogical(Long id) {
    return cacheClient.queryWithLogicalExpire(
        "cache:voucher:", 
        "lock:voucher:", 
        id, 
        Voucher.class, 
        voucherMapper::getById, 
        20L, 
        TimeUnit.SECONDS // 逻辑过期时间通常较短，可以根据重建频率设定
    );
}
```



### 3. 缓存预热（针对逻辑过期方案）

逻辑过期机制假设数据**在缓存中必须存在**。因为如果未命中，它直接返回 `null` 而不走同步查库。因此，在使用逻辑过期之前，**必须提前进行缓存预热**。

通常有以下三种企业级预热方式：

**1. 临时/单次预热：编写 JUnit 单元测试类**

适合在**大促上线前**，开发或运维手动运行测试类，一次性将特定爆款/热点数据写入 Redis。

```java
@SpringBootTest
class CachePreheatTest {

    @Autowired
    private CacheClient cacheClient;
    @Autowired
    private ShopMapper shopMapper;

    @Test
    void testSaveShopToRedis() {
        // 预热 ID 为 1 的商铺，逻辑过期时间设为 30 分钟
        Shop shop = shopMapper.getById(1L);
        if (shop != null) {
            cacheClient.setWithLogicalExpire(
                RedisConstants.CACHE_SHOP_KEY + 1L, 
                shop, 
                30L, 
                TimeUnit.MINUTES
            );
        }
    }
}
```

**2. 启动时自动预热：实现 CommandLineRunner 接口**

适合项目启动时需要加载的**全局热点数据**（如分类、少量固定的热点配置或大促专场商品）。项目启动成功后，会自动查库并刷入 Redis。

```java
@Component
@Slf4j
@RequiredArgsConstructor
public class CachePreheatRunner implements CommandLineRunner {

    private final ShopMapper shopMapper;
    private final CacheClient cacheClient;

    @Override
    public void run(String... args) throws Exception {
        log.info("开始进行商铺热点数据缓存预热...");
        // 模拟查出前 100 个高频访问的商铺进行预热
        List<Shop> hotShops = shopMapper.queryHotShops(100);
        for (Shop shop : hotShops) {
            cacheClient.setWithLogicalExpire(
                RedisConstants.CACHE_SHOP_KEY + shop.getId(),
                shop,
                30L,
                TimeUnit.MINUTES
            );
        }
        log.info("商铺数据缓存预热完成！");
    }
}
```

**3. 动态/周期性预热：定时任务（如 Spring Scheduled 或 XXL-JOB）**

适合**动态变化**的热点数据（如根据访问量统计出每天变化的热点商品列表）。每天深夜或每隔数小时重新计算并刷新逻辑过期时间。

```java
@Component
@EnableScheduling
@Slf4j
@RequiredArgsConstructor
public class PreheatTask {

    private final ShopMapper shopMapper;
    private final CacheClient cacheClient;

    // 每 20 分钟执行一次，更新缓存中的逻辑过期时间以确保数据常新
    @Scheduled(cron = "0 0/20 * * * ?")
    public void preheatHotShops() {
        log.info("定时执行热点商铺缓存预热重建任务...");
        // 根据业务规则筛选热点数据（例如点击量前 50 的店铺）
        List<Shop> hotShops = shopMapper.getTop50ActiveShops();
        for (Shop shop : hotShops) {
            cacheClient.setWithLogicalExpire(
                RedisConstants.CACHE_SHOP_KEY + shop.getId(),
                shop,
                30L,
                TimeUnit.MINUTES
            );
        }
    }
}
```



### 4. 代码实现

```java
@Data
public class RedisData {
    private LocalDateTime expireTime;
    private Object data;
}
```

```java
@Slf4j
@Component
public class CacheClient {
    private final StringRedisTemplate stringRedisTemplate;

    // 缓存重建使用的固定大小为 10 的线程池
    private static final ExecutorService CACHE_REBUILD_EXECUTOR = Executors.newFixedThreadPool(10);

    public CacheClient(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    /**
     * 将对象写入 Redis，并设置物理过期时间
     *
     * @param key 缓存Key
     * @param value 缓存数据
     * @param time 过期时间数值
     * @param unit 时间单位
     */
    public void set(String key, Object value, Long time, TimeUnit unit) {
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(value), time, unit);
    }

    /**
     * 将对象写入 Redis，并封装逻辑过期时间
     *
     * @param key 缓存Key
     * @param value 缓存数据
     * @param time 逻辑过期时间数值
     * @param unit 时间单位
     */
    public void setWithLogicalExpire(String key, Object value, Long time, TimeUnit unit) {
        // 封装逻辑过期数据对象
        RedisData redisData = new RedisData();
        redisData.setData(value);
        // 将指定单位的时间转换为秒计算
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(unit.toSeconds(time)));
        // 写入 Redis，这里不设置物理过期时间，使其永久保存（物理不过期）
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(redisData));
    }

    /**
     * 根据指定的 Key 查询缓存，若未命中则通过 dbFallback 查询数据库并写入缓存（防止缓存穿透方案）
     *
     * @param keyPrefix 缓存前缀
     * @param id 业务ID
     * @param type 返回实体类型Class
     * @param dbFallback 数据库查询函数式回调
     * @param time 缓存物理过期时间
     * @param unit 时间单位
     * @return 实体对象
     */
    public <R, ID> R queryWithPassThrough(
            String keyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit) {
        String key = keyPrefix + id;
        // 1. 从 Redis 中获取缓存
        String json = stringRedisTemplate.opsForValue().get(key);
        
        // 2. 判断缓存是否命中（非空且非特殊空白字符）
        if (StrUtil.isNotBlank(json)) {
            return JSONUtil.toBean(json, type);
        }
        
        // 3. 判断是否命中空对象（防穿透，例如缓存中存的值为 ""）
        if (json != null) {
            // 说明命中为了防止缓存穿透而缓存的空对象，直接返回 null
            return null;
        }

        // 4. 缓存未命中，调用 fallback 查询数据库
        R r = dbFallback.apply(id);
        
        // 5. 数据库也不存在该数据，向 Redis 中写入一个空值（有效期较短），防止缓存穿透
        if (r == null) {
            stringRedisTemplate.opsForValue().set(key, "", 2L, TimeUnit.MINUTES);
            return null;
        }
        
        // 6. 数据库存在，写入缓存并设置物理过期时间
        this.set(key, r, time, unit);
        return r;
    }

    /**
     * 根据指定的 Key 查询缓存，若未命中直接返回 null；若命中但逻辑过期，则获取互斥锁异步重建缓存（逻辑过期防击穿方案）
     *
     * @param keyPrefix 缓存前缀
     * @param lockKeyPrefix 锁的前缀
     * @param id 业务ID
     * @param type 返回实体类型Class
     * @param dbFallback 数据库查询函数式回调
     * @param time 缓存逻辑过期时间
     * @param unit 时间单位
     * @return 实体对象
     */
    public <R, ID> R queryWithLogicalExpire(
            String keyPrefix, String lockKeyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit) {
        String key = keyPrefix + id;
        // 1. 从 Redis 中查询缓存
        String json = stringRedisTemplate.opsForValue().get(key);
        
        // 2. 逻辑过期要求先热数据，如果缓存根本不存在，直接返回 null
        if (StrUtil.isBlank(json)) {
            return null;
        }
        
        // 3. 命中缓存，反序列化为封装了过期时间的 RedisData 结构
        RedisData redisData = JSONUtil.toBean(json, RedisData.class);
        R r = JSONUtil.toBean((JSONObject) redisData.getData(), type);
        LocalDateTime expireTime = redisData.getExpireTime();
        
        // 4. 判断缓存是否已逻辑过期
        if (expireTime.isAfter(LocalDateTime.now())) {
            // 4.1. 未过期，直接返回现有实体数据
            return r;
        }
        
        // 4.2. 已逻辑过期，需要重建缓存
        // 5. 尝试获取互斥锁重建缓存
        String lockKey = lockKeyPrefix + id;
        boolean isLock = tryLock(lockKey);
        
        // 6. 如果成功获取到锁，开启异步独立线程重建缓存
        if (isLock) {
            CACHE_REBUILD_EXECUTOR.submit(() -> {
                try {
                    // 查询数据库最新数据
                    R newR = dbFallback.apply(id);
                    // 异步写入缓存并指定逻辑过期时间
                    this.setWithLogicalExpire(key, newR, time, unit);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    // 最终释放锁
                    unlock(lockKey);
                }
            });
        }
        
        // 7. 若未获取到锁，或异步在后台执行时，均先返回过期的旧数据
        return r;
    }

    /**
     * 根据指定的 Key 查询缓存，若未命中，则使用互斥锁防缓存击穿并二次校验缓存（互斥锁模式防击穿方案）
     *
     * @param keyPrefix 缓存前缀
     * @param lockKeyPrefix 锁的前缀
     * @param id 业务ID
     * @param type 返回实体类型Class
     * @param dbFallback 数据库查询函数式回调
     * @param time 缓存物理过期时间
     * @param unit 时间单位
     * @return 实体对象
     */
    public <R, ID> R queryWithMutex(
            String keyPrefix, String lockKeyPrefix, ID id, Class<R> type, Function<ID, R> dbFallback, Long time, TimeUnit unit) {
        String key = keyPrefix + id;
        // 1. 查询缓存
        String json = stringRedisTemplate.opsForValue().get(key);
        if (StrUtil.isNotBlank(json)) {
            return JSONUtil.toBean(json, type);
        }
        if (json != null) {
            return null; // 防穿透的空值
        }

        // 2. 尝试获取互斥锁
        String lockKey = lockKeyPrefix + id;
        R r = null;
        try {
            boolean isLock = tryLock(lockKey);
            if (!isLock) {
                // 没拿到锁，休眠并重试（自旋）
                Thread.sleep(50);
                return queryWithMutex(keyPrefix, lockKeyPrefix, id, type, dbFallback, time, unit);
            }
            
            // 3. Double Check：获取锁成功后再次进行缓存的双重校验
            json = stringRedisTemplate.opsForValue().get(key);
            if (StrUtil.isNotBlank(json)) {
                return JSONUtil.toBean(json, type);
            }
            if (json != null) {
                return null;
            }
            
            // 4. 双重检查依然未命中，执行 fallback 查询数据库
            r = dbFallback.apply(id);
            if (r == null) {
                // 将空值写入 Redis 防缓存穿透
                stringRedisTemplate.opsForValue().set(key, "", 2L, TimeUnit.MINUTES);
                return null;
            }
            // 5. 将查询出的最新结果存入 Redis 物理缓存
            this.set(key, r, time, unit);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            // 6. 释放互斥锁
            unlock(lockKey);
        }
        return r;
    }

    /**
     * 尝试获取锁
     */
    private boolean tryLock(String key) {
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", 10L, TimeUnit.SECONDS);
        return BooleanUtil.isTrue(flag);
    }

    /**
     * 释放锁
     */
    private void unlock(String key) {
        stringRedisTemplate.delete(key);
    }
}
```

```java
    @Override
    public Result<Shop> queryShopById(Long id) {
        // 方案一：采用通用缓存穿透防护查询
        Shop shop = cacheClient.queryWithPassThrough(
                CACHE_SHOP_KEY, id, Shop.class, shopMapper::getById, 30L, TimeUnit.MINUTES);

        // 方案二：采用通用互斥锁防击穿与防穿透查询
        // Shop shop = cacheClient.queryWithMutex(
        //         CACHE_SHOP_KEY, LOCK_SHOP_KEY, id, Shop.class, shopMapper::getById, 30L, TimeUnit.MINUTES);

        // 方案三：采用通用逻辑过期防击穿查询（适用于热点Key提前缓存预热）
        // Shop shop = cacheClient.queryWithLogicalExpire(
        //         CACHE_SHOP_KEY, LOCK_SHOP_KEY, id, Shop.class, shopMapper::getById, 20L, TimeUnit.SECONDS);

        if (shop == null) {
            return Result.error("店铺不存在");
        }
        return Result.success(shop);
    }
```

fenen
