---
title: 七. Lua
description: Lua是一种轻量小巧的脚本语言，用标准C语言编写并以源代码形式开放，其设计目的是为了嵌入应用程序中，从而为应用程序提供灵活的扩展和定制功能。官网：https://www.lua.org/
pubDate: 2026-08-23
tags: [Redis]
source: Java后端/数据库/Redis/1.基础/6. Redis分布式锁.md
---

# 一. Lua

Lua 是一种轻量小巧的脚本语言，用标准C语言编写并以源代码形式开放， 其设计目的是为了嵌入应用程序中，从而为应用程序提供灵活的扩展和定制功能。官网：https://www.lua.org/

## 1. 基础知识

### 1. Lua的数据类型

Lua中支持的常见数据类型包括：

![image-20210821091835406](/covers/java--redis-1--6-redis-izxszg/image-20210821091835406.png)

另外，Lua提供了type()函数来判断一个变量的数据类型：

![image-20210821091904332](/covers/java--redis-1--6-redis-izxszg/image-20210821091904332.png)

### 2. 声明变量

Lua声明变量的时候无需指定数据类型，而是用local来声明变量为局部变量：

```lua
-- 声明字符串，可以用单引号或双引号，
local str = 'hello'
-- 字符串拼接可以使用 ..
local str2 = 'hello' .. 'world'
-- 声明数字
local num = 21
-- 声明布尔类型
local flag = true
```

Lua中的table类型既可以作为数组，又可以作为Java中的map来使用。数组就是特殊的table，key是数组角标而已：

```lua
-- 声明数组 ，key为角标的 table
local arr = {'java', 'python', 'lua'}
-- 声明table，类似java的map
local map =  {name='Jack', age=21}
```

Lua中的数组角标是从1开始，访问的时候与Java中类似：

```lua
-- 访问数组，lua数组的角标从1开始
print(arr[1])
```

Lua中的table可以用key来访问：

```lua
-- 访问table
print(map['name'])
print(map.name)
```



### 3. 循环

对于table，我们可以利用for循环来遍历。不过数组和普通table遍历略有差异。

遍历数组：

```lua
-- 声明数组 key为索引的 table
local arr = {'java', 'python', 'lua'}
-- 遍历数组
for index,value in ipairs(arr) do
    print(index, value) 
end
```

遍历普通table

```lua
-- 声明map，也就是table
local map = {name='Jack', age=21}
-- 遍历table
for key,value in pairs(map) do
   print(key, value) 
end
```



### 4. 函数

定义函数的语法：

```lua
function 函数名( argument1, argument2..., argumentn)
    -- 函数体
    return 返回值
end
```

例如，定义一个函数，用来打印数组：

```lua
function printArr(arr)
    for index, value in ipairs(arr) do
        print(value)
    end
end
```



### 5. 条件控制

类似Java的条件控制，例如if、else语法：

```lua
if(布尔表达式)
then
   --[ 布尔表达式为 true 时执行该语句块 --]
else
   --[ 布尔表达式为 false 时执行该语句块 --]
end

```

与java不同，布尔表达式中的逻辑运算是基于英文单词：

![image-20210821092657918](/covers/java--redis-1--6-redis-izxszg/image-20210821092657918.png)





## 2. Redis 中使用 Lua 

Redis 引入 Lua 脚本的主要目的是 为了实现**原子性操作**和**减少网络开销**。一段 Lua 脚本在 Redis 中执行时，会被当作一个整体，期间不会被其他客户端发送的命令打断。在 Redis 中调用 Lua 脚本，最核心的命令是 **`EVAL`**。

### 1. EVAL

**1）EVAL 命令的基础语法**

```
EVAL script numkeys key [key ...] arg [arg ...]
```

- **`script`**: 你的 Lua 脚本代码字符串。
- **`numkeys`**: 这是一个整数，表示后面跟着的参数中有几个是 **key (键)**。这个参数非常重要，它告诉 Redis 应该如何区分后面的参数。
- **`key [key ...]`**: 传递给脚本的 Redis 键名。在 Lua 脚本内部，可以通过全局变量 **`KEYS`** 数组来获取这些键。
- **`arg [arg ...]`**: 传递给脚本的附加参数（非键名，通常是具体的 value）。在 Lua 脚本内部，可以通过全局变量 **`ARGV`** 数组来获取。

**2）基础调用：写死 Key 和 Value (不传参)**

```
EVAL "return redis.call('set', 'name', 'jack')" 0
```

- **脚本内容**：`"return redis.call('set', 'name', 'jack')"`
  - `redis.call()` 是 Lua 脚本中用来执行 Redis 原生命令的函数。这里相当于执行了 Redis 的 `SET name jack` 命令。
  - `return` 表示将执行结果返回给客户端。
- **参数个数 (`numkeys`)**：**`0`**。因为脚本里的 key (`'name'`) 和 value (`'jack'`) 都是写死的字符串，不需要从外部传入，所以 key 的数量是 0。

**3）进阶调用：动态传参 (推荐用法)**

在实际开发中，把 key 和 value 写死在脚本里是非常不合理的，因为这会导致脚本无法复用，并且会填满 Redis 的脚本缓存。正确的方式是将它们作为参数传递。

```
EVAL "return redis.call('set', KEYS[1], ARGV[1])" 1 name Rose
```

1. **`numkeys = 1`**：告诉 Redis，在 `1` 后面的所有参数中，**只有第 1 个参数是 Key**。
2. **`name`**：这就是那个 Key。Redis 会把它放入 `KEYS` 数组中。
   - 在 Lua 脚本中通过 **`KEYS[1]`** 获取。*(注意：Lua 语言的数组索引是从 1 开始的，而不是 0)*。
3. **`Rose`**：因为 `numkeys` 指定了只有 1 个 key，所以剩下的 `Rose` 会被当作普通参数 (arg)。Redis 会把它放入 `ARGV` 数组中。
   - 在 Lua 脚本中通过 **`ARGV[1]`** 获取。

**最终执行效果：**

这段脚本执行时，`KEYS[1]` 被替换为 `name`，`ARGV[1]` 被替换为 `Rose`，等价于在 Redis 中原子性地执行了：

```
SET name Rose
```

总结：为什么要区分 KEYS 和 ARGV？

你可能会问，为什么不直接把所有参数都放到一个数组里，而非要拆分出 `KEYS` 和 `ARGV` 呢？

因为 Redis 是一个分布式系统（支持集群模式）。在 Redis Cluster 中，**所有的 Lua 脚本操作必须保证它们访问的 key 都落在同一个哈希槽 (hash slot) 中**。

Redis 需要通过你明确指出的 `key [key...]` (即 `KEYS` 数组里的内容) 来计算哈希槽，从而判断这个脚本是否可以安全执行。如果 Redis 不知道哪些参数是 key，它就无法保证集群环境下的数据一致性和路由正确性。



### 2. 业务逻辑

释放锁的业务流程是这样的

​	1、获取锁中的线程标示

​	2、判断是否与指定的标示（当前线程标示）一致

​	3、如果一致则释放锁（删除）

​	4、如果不一致则什么都不做

如果用Lua脚本来表示则是这样的：

```lua
-- 释放锁：先判断锁中的标识是否与当前线程一致，一致才删除
-- 用 Lua 脚本执行是为了保证"判断 + 删除"两步操作的原子性，
-- 防止锁因业务超时而过期后，误删其他线程新获取的锁
if (redis.call('get', KEYS[1]) == ARGV[1]) then
    return redis.call('del', KEYS[1])
end
return 0
```

我们的RedisTemplate中，可以利用execute方法去执行lua脚本，参数对应关系就如下图

![1653393304844](/covers/java--redis-1--6-redis-izxszg/1653393304844.png)

```java
    // Lua 解锁脚本：比较锁的归属 + 删除锁，两步原子执行，防止误删
    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT;
    static {
        UNLOCK_SCRIPT = new DefaultRedisScript<>();
        UNLOCK_SCRIPT.setLocation(new ClassPathResource("unlock.lua"));
        UNLOCK_SCRIPT.setResultType(Long.class);
    }

    // 每个 JVM 实例一个唯一前缀，防止不同实例的线程 ID 相同导致锁归属误判
    private static final String ID_PREFIX = UUID.randomUUID().toString(true) + "-";

    /**
     * 加锁：SET lockKey threadId NX EX 10，一条命令同时保证互斥与过期时间，防止死锁
     *
     * @param key 锁的 Key
     * @return 是否获取到锁
     */
    public boolean tryLock(String key){
        // 锁的值存入当前线程标识，释放锁时校验归属
        String threadId = ID_PREFIX + Thread.currentThread().getId();
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, threadId, SECKILL_LOCK_TTL, TimeUnit.SECONDS);
        return BooleanUtils.isTrue(flag);
    }

    /**
     * 解锁：通过 Lua 脚本原子地执行"判断锁归属 + 删除锁"，
     * 避免业务超时锁自动过期后，误删其他线程刚获取的锁
     *
     * @param key 锁的 Key
     */
    public void unlock(String key){
        String threadId = ID_PREFIX + Thread.currentThread().getId();
        stringRedisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(key), threadId);
    }
```



# 二. SET

在分布式系统中，当多个节点需要互斥地访问共享资源时，Redis 的 `SET` + `EXPIRE` 是最经典、最常用的分布式锁实现方案。

## 1. 加锁

在早期版本中，加锁通常分两步：先 `SETNX`（如果不存在则设置），再 `EXPIRE`（设置过期时间）。**这是错误的**，因为如果程序在第一步和第二步之间崩溃，锁将永远不会过期，导致**死锁**。

正确的做法是利用 Redis 2.6.12 之后提供的复合 `SET` 命令，将条件判断和设置过期时间合并为**一个原子操作**：

```
SET lock_key unique_value NX PX 10000
```

- **`lock_key`**: 锁的名字（即共享资源的名字）。
- **`unique_value`**: 客户端的唯一标识（通常是 UUID 或 `线程ID` + `机器IP`）。**这个值非常重要，用于解锁时验证身份。**
- **`NX`**: Not eXists。只有当 `lock_key` 不存在时，才执行 SET 操作。这保证了互斥性。
- **`PX 10000`**: 将键的过期时间设置为 10000 毫秒（10秒）。这保证了即使客户端崩溃，锁也会在 10 秒后自动释放，避免死锁。



## 2. 解锁

解锁时最常见的错误是直接调用 `DEL lock_key`。

**危险场景**：客户端 A 加锁后，由于业务执行时间过长，锁自动过期了。接着客户端 B 成功加锁。此时客户端 A 业务执行完毕，直接调用 `DEL`，**就会把客户端 B 的锁给误删掉**。

线程1现在持有锁之后，在执行业务逻辑过程中，他正准备删除锁，而且已经走到了条件判断的过程中，比如他已经拿到了当前这把锁确实是属于他自己的，正准备删除锁，但是此时他的锁到期了，那么此时线程2进来，但是线程1他会接着往后执行，当他卡顿结束后，他直接就会执行删除锁那行代码，相当于条件判断并没有起到作用，这就是删锁时的原子性问题，之所以有这个问题，是因为线程1的拿锁，比锁，删锁，实际上并不是原子性的，我们要防止刚才的情况发生，

![1653387764938](/covers/java--redis-1--6-redis-izxszg/1653387764938.png)

因此，解锁必须遵循逻辑：**“判断是不是我的锁 -> 如果是，则删除”**。这两个步骤也必须是原子的。我们需要借助 Lua 脚本交给 Redis 执行：

```java
-- KEYS[1] 是 lock_key，ARGV[1] 是当初加锁时传入的 unique_value
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

通过对比 `unique_value`，可以确保**谁加的锁，就由谁来解**。



## 3. 唯一标识

- **UUID：** 代表当前的进程（或 JVM 实例）。在应用程序启动或初始化锁管理器时生成一次即可。
- **线程 ID：** 代表当前正在执行的线程。
- **组合形式：** `UUID:ThreadID`（例如 `8743b520-d3e7-4b66-8086-626a8d6e32bb:45`）。

```java
    // 1. 进程级别的唯一标识，应用启动时生成一次即可
    private static final String PROCESS_UUID = UUID.randomUUID().toString();

    // 2. 获取当前请求的唯一标识（UUID + 线程ID）
    public String getCurrentLockId() {
        long threadId = Thread.currentThread().getId();
        return PROCESS_UUID + ":" + threadId;
    }
```

# 三. 业务实例

秒杀优惠卷购买，解决一人一单和超卖问题

**SeckillVoucherServiceImpl** ：

```java
@Service
@RequiredArgsConstructor
public class SeckillVoucherServiceImpl extends ServiceImpl<SeckillVoucherMapper, SeckillVoucher> implements SeckillVoucherService {
    private final VoucherOrderMapper voucherOrderMapper;
    private final StringRedisTemplate stringRedisTemplate;

    // Lua 解锁脚本：比较锁的归属 + 删除锁，两步原子执行，防止误删
    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT;
    static {
        UNLOCK_SCRIPT = new DefaultRedisScript<>();
        UNLOCK_SCRIPT.setLocation(new ClassPathResource("unlock.lua"));
        UNLOCK_SCRIPT.setResultType(Long.class);
    }

    // 每个 JVM 实例一个唯一前缀，防止不同实例的线程 ID 相同导致锁归属误判
    private static final String ID_PREFIX = UUID.randomUUID().toString(true) + "-";

    @Override
    public Long seckill(Long id) {
        // 查询秒杀优惠卷
        SeckillVoucher seckillVoucher = this.getById(id);
        if(seckillVoucher == null){
            throw new BusinessException("秒杀优惠卷不存在");
        }
        // 判断秒杀时间
        LocalDateTime now = LocalDateTime.now();
        if (seckillVoucher.getBeginTime().isAfter(now)) {
            throw new BusinessException("秒杀还未开始");
        }
        if (seckillVoucher.getEndTime().isBefore(now)) {
            throw new BusinessException("秒杀已经结束");
        }
        //查询库存
        if(seckillVoucher.getStock()<1){
            throw new BusinessException("当前库存不足");
        }
        return createVoucherOrder(id);
    }

    public Long createVoucherOrder(Long voucherId){
        // 查询当前用户
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();

        // 以用户为粒度加锁，让同一用户的并发请求串行执行，一人一单校验才可靠
        String lockKey = SECKILL_LOCK_KEY + userId;
        if(!tryLock(lockKey)){
            throw new BusinessException("请勿重复下单");
        }
        try {
            //一人一单
            Long count = voucherOrderMapper.selectCount(new LambdaQueryWrapper<VoucherOrder>()
                    .eq(VoucherOrder::getVoucherId,voucherId)
                    .eq(VoucherOrder::getUserId, userId));

            // 如果 count > 0，说明该用户已经下过单
            if (count > 0) {
                throw new BusinessException("当前用户已购买");
            }

            boolean update = this.lambdaUpdate().
                    eq(SeckillVoucher::getVoucherId,voucherId).
                    gt(SeckillVoucher::getStock, 0).
                    setSql("stock=stock-1").
                    update();
            if(!update){
                throw new BusinessException("当前库存不足");
            }

            VoucherOrder voucherOrder = VoucherOrder.builder()
                    .voucherId(voucherId)
                    .userId(userId)
                    .build();
            voucherOrderMapper.insert(voucherOrder);
            return voucherOrder.getId();
        } finally {
            // 无论业务成功或失败，都必须释放锁
            unlock(lockKey);
        }
    }

    /**
     * 加锁：SET lockKey threadId NX EX 10，一条命令同时保证互斥与过期时间，防止死锁
     *
     * @param key 锁的 Key
     * @return 是否获取到锁
     */
    public boolean tryLock(String key){
        // 锁的值存入当前线程标识，释放锁时校验归属
        String threadId = ID_PREFIX + Thread.currentThread().getId();
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, threadId, SECKILL_LOCK_TTL, TimeUnit.SECONDS);
        return BooleanUtils.isTrue(flag);
    }

    /**
     * 解锁：通过 Lua 脚本原子地执行"判断锁归属 + 删除锁"，
     * 避免业务超时锁自动过期后，误删其他线程刚获取的锁
     *
     * @param key 锁的 Key
     */
    public void unlock(String key){
        String threadId = ID_PREFIX + Thread.currentThread().getId();
        stringRedisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(key), threadId);
    }
}
```

**resources/unlock.lua**

```lua
-- 释放锁：先判断锁中的标识是否与当前线程一致，一致才删除
-- 用 Lua 脚本执行是为了保证"判断 + 删除"两步操作的原子性，
-- 防止锁因业务超时而过期后，误删其他线程新获取的锁
if (redis.call('get', KEYS[1]) == ARGV[1]) then
    return redis.call('del', KEYS[1])
end
return 0
```



## **思路：**

**1. 为什么需要锁**

一人一单的判断流程：

```
① selectCount(该用户是否买过这张券)
② 如果 count == 0，插入订单
```

两步之间不是原子的。同一用户并发两个请求时：

```
请求A: selectCount → 0 ✓
请求B: selectCount → 0 ✓（A 还没插入）
请求A: insert → 成功
请求B: insert → 成功  ← 重复下单
```

分布式锁把 ①+② 这段临界区变成串行：同一时刻只有一个请求能进入。使用分布式锁的原因能解决集群问题



**2. 加锁：一条 SET 命令完成三件事**

```java
// SeckillVoucherServiceImpl.java tryLock()
stringRedisTemplate.opsForValue().setIfAbsent(key, threadId, SECKILL_LOCK_TTL, TimeUnit.SECONDS);
```

底层命令：

```bash
SET lock:order:1 "jvm-uuid-线程A" NX EX 10
```

| 参数               | 作用                                             |
| ------------------ | ------------------------------------------------ |
| `NX`               | Not eXist：只有 key 不存在时才写入成功，实现互斥 |
| `EX 10`            | 10 秒后自动过期，防止持锁进程宕机导致死锁        |
| `"jvm-uuid-线程A"` | 锁的值是**持有者标识**，解锁时校验归属           |

**加锁原子性**：NX 与 EX 必须一条命令完成。若拆成 `SETNX` + `EXPIRE` 两条命令，
中间宕机则锁永不过期，死锁。



**3. 锁值为什么放"线程标识"**

```java
// 每个 JVM 启动时生成一次，防止不同实例线程 ID 相同导致归属误判
private static final String ID_PREFIX = UUID.randomUUID().toString(true) + "-";
// 加锁时：JVM 唯一前缀 + 当前线程 ID
String threadId = ID_PREFIX + Thread.currentThread().getId();
```

用途：解锁时判断"这把锁是不是我的"，防止误删。误删场景：

```
T0   线程A 拿到锁，锁值="uuid-A"，TTL=10s
T0   线程A 执行业务……卡了 15 秒（GC、慢SQL、网络抖动）
T10  锁自动过期（A 还在跑业务）
T10  线程B 拿到锁，锁值="uuid-B"
T15  线程A 业务跑完，直接 delete(key) → 把 B 的锁删了！
T15  线程C 又拿到锁……A、B、C 同时进入临界区，锁失效
```

解决思路：删除前先比较锁值是否是自己的标识。但"检查"与"删除"两步仍可能被穿插：

```
线程A: get(key) → "uuid-A"，是我的 ✓
（此刻锁恰好过期，线程B SET NX 成功，锁值变成 "uuid-B"）
线程A: del(key) → 删掉的还是 B 的锁 ✗
```



**4. 解锁：Lua 脚本把"判断 + 删除"焊成一步**

```lua
-- resources/unlock.lua
if (redis.call('get', KEYS[1]) == ARGV[1]) then
    return redis.call('del', KEYS[1])
end
return 0
```

**为什么 Lua 有效**：Redis 单线程执行命令，Lua 脚本作为一个整体原子执行，
期间不会被任何其他命令插入。执行流程：

```
客户端 → EVAL unlock.lua 1 lock:order:1 "jvm-uuid-线程A"
         ↓ Redis 内部原子执行：
         ① get → 比较是否等于 "jvm-uuid-线程A"
         ② 相等 → del；不等 → 返回 0 什么都不做
```

Java 侧调用：

```java
// SeckillVoucherServiceImpl.java unlock()
stringRedisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(key), threadId);
//                    KEYS[1] = key              ARGV[1] = threadId
```

对照误删时间线，加 Lua 之后：

```
T15  线程A 执行 Lua：get → "uuid-B" ≠ "uuid-A" → 不删，B 的锁保住了 ✓
```



**5. 完整流程串讲**

200 个线程（同一用户）同时打 `POST /voucher-order/seckill/{id}`，以三个线程为例：

```
线程A: SET lock:order:1 uuid-A NX EX 10 → 成功，进入临界区
线程B: SET lock:order:1 uuid-B NX EX 10 → 失败（key 已存在）→ 抛"请勿重复下单"

线程A 临界区内：
  ① selectCount → 0，可以买
  ② 扣库存 stock-1（条件更新 gt(stock,0) 兜底超卖）
  ③ insert 订单
线程A: finally → EVAL unlock.lua → get 到 uuid-A 是本人 → del 锁

线程C（晚一步到）: SET NX 成功 → 进临界区 → selectCount → 1 → 抛"当前用户已购买"
```



**6. 设计对照表**

| 设计                    | 防什么                           |
| ----------------------- | -------------------------------- |
| SET NX EX 一条命令      | 加锁原子性，防死锁               |
| 锁值 = JVM前缀 + 线程ID | 标识锁持有者，为解锁校验提供依据 |
| Lua 脚本解锁            | "判断归属 + 删除"原子化，防误删  |
| finally 中解锁          | 业务抛异常也能释放，防锁泄漏     |



**7. 本方案的固有缺陷（Redisson 存在的意义）**

| 缺陷       | 后果                                                         |
| ---------- | ------------------------------------------------------------ |
| 不可重入   | 同一线程再次获取同一把锁会失败，A 方法持锁调用也要持锁的 B 方法会自锁 |
| 不可续期   | TTL 是固定 10 秒，业务超时锁自动过期，互斥保护被击穿         |
| 无重试机制 | 拿不到锁直接抛异常，不支持自旋等待                           |

Redisson 的补位：

- **WatchDog 看门狗**：默认每 10 秒检查并续期到 30 秒，解决"不可续期"
- **Hash 结构 + 计数器**：记录线程重入次数，解决"不可重入"
- **信号量 + 订阅机制**：拿不到锁可阻塞等待，解决"无重试"



## Redisson 改造

改造后业务代码只需换锁：

```java
// 改造前（Set+Lua）
if(!tryLock(lockKey)){ 
    throw new BusinessException("请勿重复下单"); 
}try {
    ...下单逻辑... 
} finally {
    unlock(lockKey); 
}
// 改造后（Redisson）
RLock lock = redissonClient.getLock(lockKey);
boolean isLock = lock.tryLock();   // 不指定租约 → WatchDog 自动续期i
f(!isLock){ 
    throw new BusinessException("请勿重复下单"); 
}try {
    ...下单逻辑... 
} finally {
    lock.unlock(); 
}
```

| 手写 Set+Lua 的缺陷                       | Redisson 的解法                                              |
| :---------------------------------------- | :----------------------------------------------------------- |
| TTL 固定 10 秒，业务超时锁过期 → 互斥失效 | `tryLock()` 不指定租约时间 → WatchDog 每 10 秒自动续期（默认锁 30s），业务多久锁就持有多久 |
| 不可重入，同一线程二次获取会自锁          | 底层 Hash 结构 + 计数器记录重入次数                          |
| 拿不到锁直接失败，无法等待                | `tryLock(waitTime, unit)` 可指定等待时间自旋获取             |

实现要点：

- 依赖用 `org.redisson:redisson`（core 包）而非 `redisson-spring-boot-starter`： starter 会自动接管 Spring 的 `RedisConnectionFactory`（替换 Lettuce）， 影响项目中所有 `StringRedisTemplate`；core 包 + 手动 `@Bean` 只新增 `RedissonClient`，互不干扰
- `RedissonConfig` 读取 `application.yaml` 的 host/port/password，`useSingleServer()` 单节点模式
- Redisson 锁在 Redis 中是 Hash 结构，key 为 `lock:order:{userId}`， `HGETALL` 可查看持有线程与重入次数，便于排查
- 注意：一旦显式指定租约时间 `tryLock(waitTime, leaseTime, unit)`，WatchDog 就不再生效—— 所以业务执行时间不可预估时用无租约的 `tryLock()`，可预估时用租约版（到期自动释放，省一次主动解锁）

# 四. 分布式锁-Redisson

在单体应用中，Java 自带的 `synchronized` 或 `ReentrantLock` 可以保证单 JVM 进程内多线程的互斥访问。

但在现代微服务/多实例集群架构中：
- 多个部署实例拥有各自独立的 JVM 内存和锁监视器。
- 此时本地锁无法跨 JVM 生效，同一用户的并发请求分发到不同机器上，依然会发生**超卖、重复扣款、一人多单**等并发安全问题。

**分布式锁**的核心目标：在所有微服务实例之外，借助一个**全局唯一的共享存储组件（如 Redis、ZooKeeper）**维护一把跨进程互斥的全局锁。

```text
[用户请求 1] ───> [ 实例 A (JVM 1) ] ──┐
                                     ├──> 【 Redis 全局分布式锁 】
[用户请求 2] ───> [ 实例 B (JVM 2) ] ──┘
```


先看手写 Redis 锁经历的 4 个阶段及痛点：

| 演进阶段 | 实现方式 | 存在的致命缺陷 |
| :--- | :--- | :--- |
| **V1. 基础版** | `SETNX key 1` | 拿到锁后业务崩溃或未释放，导致**永久死锁**。 |
| **V2. 加过期时间** | `SET key 1 NX EX 10` | 解决死锁，但若业务执行耗时 15s，第 10s 锁自动过期，其他线程抢到锁；当前线程执行完去 `DEL key` 会**误删其他线程的锁**。 |
| **V3. 存入唯一标识 + Lua 解锁** | `SET key uuid:threadId NX EX 10`<br>+ Lua 脚本（比对标识一致才删除） | 解决了误删，但仍存在：<br>1. **不可重入**（同一线程再次加锁会死锁）<br>2. **锁超时无法自动续期**（业务没执行完锁就失效了，丧失互斥性）<br>3. **无重试机制**（没拿到锁只能直接失败或写死循环 CPU 空转） |



## 1. 底层四大核心机制

Redisson 彻底解决了手写锁的所有痛点，其核心原理如下：

```text
               ┌────────────────────────────────────────────────────────┐
               │                  Redisson 核心架构                      │
               └────────────────────────────────────────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
【 1. Hash 结构与可重入 】 【 2. WatchDog 看门狗续期 】   【 3. Pub/Sub 阻塞重试 】 【 4. 原子性 Lua 执行 】
- key: 锁名称             - 默认 30s 租约时间             - 抢不到锁订阅释放事件      - 加锁/重入/续期/解锁
- field: UUID:线程ID     - 每 10s 自动续期到 30s         - 避免 while 自旋打满 CPU   - 全由 Lua 脚本原子执行
- value: 重入计数器       - 业务执行多久锁持有多久
```





## 2. 快速入门

**引入依赖：**

```xml
<dependency>
	<groupId>org.redisson</groupId>
	<artifactId>redisson</artifactId>
	<version>3.13.6</version> 
</dependency>
```

**配置Redisson客户端：**

```java
@Configuration
public class RedissonConfig {

    @Value("${spring.data.redis.host}")
    private String host;

    @Value("${spring.data.redis.port}")
    private int port;

    @Value("${spring.data.redis.password}")
    private String password;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 单节点模式，地址格式 redis://host:port
        config.useSingleServer()
                .setAddress("redis://" + host + ":" + port)
                .setPassword(password);
        return Redisson.create(config);
    }
}
```



**如何使用Redission的分布式锁**

1. **注入客户端**

在你需要加锁的 Service 类中，直接将 `RedissonClient` 注入进来。

2. **获取锁对象**

通过 `redissonClient.getLock("锁的唯一名称")` 获取一个 `RLock` 对象。这只是获取了锁的引用，**还没有真正去 Redis 里加锁**。

3. **尝试加锁与释放锁 (核心结构)**

必须使用 `try...finally` 结构。在 `try` 之前加锁，在 `finally` 里面释放锁，这是为了保证即使业务代码抛出异常，锁也能被正确释放，防止死锁。

4. **标准代码模板**

```java
        // ... 前置的库存判断逻辑...

        Long userId = UserHolder.getUser().getId();

        // 1. 获取锁对象（可重入） (直接复用 Redisson 客户端，不再手动传入 StringRedisTemplate)  这只是获取了锁的引用，还没有真正去 Redis 里加锁。
        RLock lock = redissonClient.getLock("lock:order:" + userId);

         // 2. 尝试获取分布式锁
        // 亮点：无参 tryLock() 默认开启 WatchDog (看门狗) 机制
	   // 只要业务没执行完，后台会自动每 10s 续期到 30s，彻底告别锁提前超时释放的风险	
        // 参数1: 获取锁的最大等待时间 (如果在指定时间内没获取到，则返回 false)
        // 参数2: 锁的自动释放时间 (持有锁超过这个时间自动释放，避免死锁。如果不传，Redisson 会开启看门狗机制自动续期)
        // 参数3: 时间单位
        boolean isLock = lock.tryLock();

        // 3. 拦截重复请求
        if (!isLock) {
            // 获取锁失败，说明当前用户已有并发请求正在处理中
            // 直接返回，完美实现“一人一单”防重提交
            return Result.error("不允许重复下单！");
        }

        try {
            // 4. 获取当前类的 AOP 代理对象
            // 亮点：避免 this 调用导致的 Spring 声明式事务 (@Transactional) 失效
            ISeckillVoucherService proxy = (ISeckillVoucherService) AopContext.currentProxy();

            // 5. 调用代理对象的下单方法，执行真正的核心业务逻辑 (查单、扣库存、创单)
            return proxy.createVoucherOrder(voucherId); 

        } finally {
            // 6. 安全释放锁 (防御性编程的核心)
            // 亮点：释放前必须查验归属权，防止极端情况下误删别人的锁，或抛出 IllegalMonitorStateException 异常
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
```



## 3. 可重入锁原理

Redisson 之所以能完美实现**可重入锁**，核心秘诀在于两点：**Redis 的 Hash 数据结构** 和 **Lua 脚本的原子性操作**。

我们来像剥洋葱一样，一层层拆解它的底层逻辑。

**1.为什么不用普通的 String 结构？**

之前手写的 `SimpleRedisLock` 使用的是 Redis 的 `SETNX` 命令，对应的是 `String` 类型：

- **Key**: 锁的名称（如 `order:userId`）
- **Value**: 线程标识（如 `UUID + ThreadId`）

**String 结构的致命缺点：** 它只能记录“谁拿到了锁”，但**无法记录“拿了多少次”**。如果一个业务方法拿到了锁，它内部又调用了另一个也需要这把锁的方法，就会因为无法再次获取而导致死锁（这就叫不可重入）。

**2. Redisson 的核心结构：Hash**

为了解决这个问题，Redisson 将锁的存储结构从 `String` 换成了 `Hash`（哈希表）。

在 Redis 中，这把锁长这样：

- **KEY (锁的名称)**: 比如 `lock:order:1001`
- **FIELD (持有锁的线程)**: 比如 `UUID:ThreadId`（UUID用来区分不同的 JVM 服务器，ThreadId 用来区分同一台服务器上的不同线程）
- **VALUE (重入次数)**: 一个整数。第一次加锁是 1，再次重入就变 2，解锁一次减 1，直到减为 0 才真正删除锁。

**3. 加锁的核心逻辑（底层 Lua 脚本解析）**

为了保证“判断是否存在”、“判断是不是自己的锁”、“计数器加一”这几个动作绝对的**原子性**，Redisson 底层使用了 Lua 脚本来执行加锁。

当你调用 `lock.tryLock()` 时，底层的逻辑流如下：

1. **判断锁是否存在 (`exists key`)**
   - **不存在：** 说明没人拿锁。直接使用 `hset` 创建 Hash 结构，把 `UUID:ThreadId` 设为 1，并设置过期时间。**加锁成功，返回 null**。
   - **存在：** 说明已经有人拿锁了，进入第 2 步。
2. **判断拿锁的是不是当前线程 (`hexists key UUID:ThreadId`)**
   - **是当前线程：** 说明是同一个人再次来拿锁（**这就是可重入的体现**）。使用 `hincrby` 将对应的值加 1（比如从 1 变成 2），并重新刷新过期时间。**加锁成功，返回 null**。
   - **不是当前线程：** 锁被别人占用了。**加锁失败，返回这把锁剩余的过期时间 (pttl)**。

**4. 解锁的核心逻辑**

解锁的过程（也就是你代码里调用的 `lock.unlock()`）完全对称，同样由 Lua 脚本保证原子性：

1. **判断锁还是不是当前线程的 (`hexists key UUID:ThreadId`)**
   - **不是：** 直接返回空（或者像前面提到的，抛出 `IllegalMonitorStateException`）。这印证了我们前面加上的 `isHeldByCurrentThread()` 判断是多么重要。
   - **是：** 进入第 2 步。
2. **重入次数减 1 (`hincrby key UUID:ThreadId -1`)**
   - 将 Hash 表中的 VALUE 减去 1。
3. **判断减完之后的 VALUE 值**
   - **大于 0：** 说明业务层套娃得比较深，锁还没完全释放完毕。重新刷新锁的过期时间即可。
   - **等于 0：** 说明当前线程彻底用完这把锁了。执行 `del key` **删除这把锁**，并发布一个释放锁的订阅消息（Publish），通知其他正在阻塞等待的线程可以来抢锁了。



## 4. WatchDog机制

这是一个非常关键的底层机制！在分布式锁的实际应用中，**锁的超时时间设置**一直是个两难的问题：

- **设置太短：** 业务代码还没跑完，锁就自己过期释放了，导致其他线程趁虚而入，引发并发安全问题。
- **设置太长：** 如果拿到锁的服务器突然宕机，锁迟迟不释放，会导致其他所有请求全部卡死（死锁）。

Redisson 的**看门狗（WatchDog）机制**就是为了完美解决这个“两难”问题而诞生的。

我们可以把它拆解为以下几个核心维度来理解：

**1. 看门狗到底是什么？**

在代码层面，看门狗其实是 Redisson 底层基于 Netty 的时间轮（`HashedWheelTimer`）启动的一个**后台定时任务（守护线程）**。

只要当前线程成功拿到了分布式锁，Redisson 就会默默在后台启动这只“看门狗”来帮你盯着锁的有效期。

**2. 它是怎么工作的？（续期机制）**

如果你在加锁时没有指定锁的过期时间（例如直接使用 `lock.tryLock()` 或 `lock.lock()`），看门狗机制就会生效，执行流程如下：

- **默认租期：** 加锁成功后，Redisson 会默认给这把锁设置一个 **30秒** 的存活时间（这个时间由配置参数 `lockWatchdogTimeout` 决定，默认是 30000 毫秒）。
- **定时巡逻：** 看门狗会按照设定好的周期（默认是 `lockWatchdogTimeout / 3`，也就是 **10秒**）去执行一次定时任务。
- **无限续期：** 每隔 10 秒，看门狗就会去 Redis 里看一眼：“当前拿锁的那个线程，你的业务代码执行完了吗？”
  - 如果业务**还没执行完**（锁还在），看门狗就会执行一段 Lua 脚本，把锁的过期时间**重新重置回 30秒**。
  - 这个过程会一直无限循环下去，直到你的业务逻辑彻底执行完毕并主动调用 `unlock()`。

**通俗的比喻：**

你去网吧上网，不确定要玩多久，于是跟老板说“先开一台机，我不下机你就一直帮我留着”。

系统默认给你 30 分钟。你的“看门狗小弟”每隔 10 分钟就会跑去吧台跟老板喊一句：“我大哥还在玩，时间重新加回 30 分钟！” 这样只要你不走，机器永远不会因为到点而被系统强制下机。

**3. 触发看门狗的“隐藏条件”（极其重要）**

这是很多人踩坑的地方：**看门狗并不是只要用 Redisson 就会生效的。**

- ✅ **会触发看门狗的写法：**
  - `lock.lock();`
  - `lock.tryLock();`
  - `lock.tryLock(10, TimeUnit.SECONDS);` （注意：这里只传了最大等待时间，没有传锁的释放时间）
- ❌ **不会触发看门狗的写法：**
  - `lock.lock(10, TimeUnit.SECONDS);`
  - `lock.tryLock(100, 10, TimeUnit.SECONDS);`
  - 只要你**手动指定了锁的释放时间（leaseTime）**，Redisson 就会认为你自己心里有数，**看门狗将直接失效**。到了你指定的时间，锁会被强制无情释放。

**4. 如果服务器宕机了，会发生死锁吗？**

**绝对不会。** 这也是看门狗设计的精妙之处。

看门狗的定时续期任务是跑在你的业务服务器（JVM）里的，而不是跑在 Redis 服务端。

如果你的服务器突然断电、宕机，或者进程被意外杀死：

1. 业务逻辑中断。
2. **看门狗线程也随之彻底死亡**，无法再去 Redis 续期。
3. Redis 中那把原本有 30秒 寿命的锁，在倒计时结束后（最多等待 30秒），就会自然过期失效并被删除。
4. 其他服务器的请求就可以正常进来重新抢锁了。



## 5. MutiLock原理

在复杂的分布式业务场景中，我们经常会遇到**需要同时锁定多个资源**的情况。比如在电商系统中，下单不仅要锁定商品库存，可能还要锁定用户的优惠券；或者在银行系统中，A 给 B 转账，必须同时锁定 A 的账户和 B 的账户。

如果按照传统的方式，先获取 A 锁，再去获取 B 锁，极其容易发生**死锁**（例如：线程 1 拿了 A 锁等 B 锁，线程 2 拿了 B 锁等 A 锁）。

Redisson 提供的 **`MultiLock`（联锁）** 就是为了优雅且安全地解决这个问题而诞生的。

1. **MultiLock 的核心定义**

`RedissonMultiLock` 可以将多个独立的 `RLock` 对象绑定在一起，当成一个“大锁”来操作。

它的核心法则是：**要么同时成功获取所有锁，要么全部失败。** （这在逻辑上保证了多锁获取的原子性）。

2. **MultiLock 的底层工作原理**

当你把多个锁组合成一个 MultiLock，并调用 `tryLock()` 时，底层的运转逻辑如下：

1. **计算总等待时间：** 框架会记录你允许的最大等待时间。
2. **顺序尝试加锁：** Redisson 底层会用一个 `for` 循环，依次遍历你传入的所有 `RLock` 对象，逐个调用它们的加锁逻辑。
3. **死锁防御机制（核心亮点）：**
   - 如果在遍历过程中，某一把锁获取**失败**了（被别的线程占用了），或者获取这把锁耗费的时间超出了总的剩余等待时间。
   - Redisson 会**立即触发回滚**，主动执行 `unlock()`，把前面已经成功拿到的几把锁全部释放掉！
   - 释放完毕后，如果有剩余等待时间，它会休眠一会儿再重新从第一把锁开始尝试；如果没有剩余等待时间，则直接返回 `false`。
4. **加锁成功：** 只有当 `for` 循环顺利跑完，所有的子锁都被当前线程成功拿到了，`MultiLock` 才会对外返回 `true`。

5. **MultiLock 与 看门狗机制 (WatchDog)**

MultiLock 完美继承了看门狗的特性。

如果你在使用 MultiLock 时**没有指定确切的锁过期时间**（ leaseTime），那么当所有锁都成功获取后，Redisson 会为**每一把子锁**都挂上一个看门狗定时任务。只要你的业务没跑完，每一把子锁都会被自动续期，确保整个“联锁”在业务执行期间绝对安全。

4. **代码实战示例**

假设你要同时处理订单、扣除积分、使用优惠券，你需要同时锁定这三个资源：

```java
// 1. 分别获取独立的锁对象 (此时并未真正加锁)
RLock lock1 = redissonClient.getLock("lock:order:1001");
RLock lock2 = redissonClient.getLock("lock:points:user_123");
RLock lock3 = redissonClient.getLock("lock:coupon:coupon_456");

// 2. 将多个锁合并为一个 MultiLock
RedissonMultiLock multiLock = new RedissonMultiLock(lock1, lock2, lock3);

boolean isLock = false;
try {
    // 3. 尝试获取联锁 (无参 tryLock 会触发看门狗)
    // 只有当 order, points, coupon 三个锁同时拿到，才会返回 true
    isLock = multiLock.tryLock();
    
    if (!isLock) {
        System.out.println("系统繁忙，获取多项资源失败，请稍后再试！");
        return;
    }
    
    // 4. 执行业务逻辑 (转账、组合下单等)
    System.out.println("成功锁定所有资源，开始执行核心业务...");
    
} finally {
    // 5. 释放锁
    // MultiLock 的 unlock 会遍历释放所有的子锁
    // 注意：联锁自身没有 isHeldByCurrentThread 方法，直接 unlock 即可，
    // 底层在释放各个子锁时，Lua 脚本依然会判断线程归属。
    multiLock.unlock();
}
```

💡 总结

理解 `MultiLock` 的精髓在于四个字：**同生共死**。

它通过客户端层面的**循环尝试 + 失败立刻回滚**机制，完美破解了多资源加锁时经典的“死锁循环等待”问题。在处理复杂的、涉及多个前置条件的秒杀或交易业务时，这把锁堪称神器。
