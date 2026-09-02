---
title: 十. SQL性能分析
description: 在MySQL中，分析SQL的执行频率（即各类语句的调用次数与占比）是进行容量规划、架构设计（如读写分离、缓存设计）以及定位系统瓶颈的重要手段。
pubDate: 2026-08-20
tags: [MySQL]
series: MySQL
order: 10
source: Java后端/数据库/Mysql/2. 进阶/3.SQL优化.md
---

# 一. SQL性能分析

## 1. SQL执行频率

在 MySQL 中，分析 SQL 的执行频率（即各类语句的调用次数与占比）是进行容量规划、架构设计（如读写分离、缓存设计）以及定位系统瓶颈的重要手段。

SQL 执行频率的分析通常分为两个维度：宏观层（整体读写比例与 QPS/TPS） 和 微观层（具体单条 SQL 的调用频次）。

### 1. 全局SQL

通过查看 MySQL 服务端的全局状态计数器，可以了解数据库是**读多写少**还是**写多读少**。

**查询各类命令的累计执行次数**

```sql
-- 查看所有以 Com_ 开头的命令计数（统计自 MySQL 启动以来的累计值）
SHOW GLOBAL STATUS LIKE 'Com_%';
```

常用关注指标如下：

| **状态参数**       | **含义**                   | **作用 / 调优参考**          |
| ------------------ | -------------------------- | ---------------------------- |
| **`Com_select`**   | `SELECT` 查询累计执行次数  | 判断读请求总量               |
| **`Com_insert`**   | `INSERT` 插入累计执行次数  | 判断写请求总量               |
| **`Com_update`**   | `UPDATE` 更新累计执行次数  | 判断修改请求总量             |
| **`Com_delete`**   | `DELETE` 删除累计执行次数  | 判断删除请求总量             |
| **`Com_commit`**   | 提交事务次数               | 计算 TPS（每秒事务数）       |
| **`Com_rollback`** | 回滚事务次数               | 评估异常/锁冲突频率          |
| **`Questions`**    | 发送到服务器的所有语句总数 | 客户端发来的请求数（含缓存） |



**核心指标计算公式**

- **读写比率 (Read/Write Ratio)**:

  $$\text{读写比} = \frac{\text{Com\_select}}{\text{Com\_insert} + \text{Com\_update} + \text{Com\_delete}}$$

  - 若读写比大于 **5:1** 或更高，属于典型的**读密集型系统**，优先考虑 **Redis 缓存、读写分离、二级索引覆盖**。
  - 若写入比重很大，应重点关注 **批量插入、写入队列、分库分表** 以及 Redo Log/Binlog 刷盘瓶颈。

- **实时 QPS（每秒查询数）采样计算**:

  在间隔 $\Delta t$ 秒（如 10 秒）前后分别执行并计算差值：

  $$\text{QPS} = \frac{\Delta\text{Questions}}{\Delta t}$$

- **实时 TPS（每秒事务数）采样计算**:

  $$\text{TPS} = \frac{\Delta\text{Com\_commit} + \Delta\text{Com\_rollback}}{\Delta t}$$



### 2. 单条SQL

**通过 sys 库定位执行频次最高的具体 SQL**

MySQL 5.7+ 默认自带的 `sys` 库对底层 `performance_schema` 进行了结构化封装，可直接按频次排序：

```sql
-- 查询执行频次最高的前 10 条 SQL 模板及耗时统计
SELECT 
    query,                     -- 归一化后的 SQL 语句模板
    exec_count,                -- 累计执行频次
    total_latency,             -- 累计总耗时
    avg_latency,               -- 单次平均耗时
    rows_sent,                 -- 累计返回行数
    rows_examined              -- 累计扫描行数
FROM 
    sys.statement_analysis
ORDER BY 
    exec_count DESC 
LIMIT 10;
```



### 3. 优化决策

| **场景特点**                 | **典型表现**                             | **针对性优化方案**                                           |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| **高频查询 (Hot Read)**      | `exec_count` 极高，`avg_latency` 较低    | • 引入本地缓存（Caffeine）或分布式缓存（Redis）  • 使用**覆盖索引**消除回表  • 避免 `SELECT *`，减少网络带宽与反序列化开销 |
| **高频单行写入**             | `Com_insert` 极高                        | • 改为批量插入（`INSERT INTO ... VALUES (...), (...)`）  • 采用消息队列异步削峰 |
| **低频但高扫描 (Fat Query)** | `exec_count` 低，但 `rows_examined` 巨大 | • 补建复合索引  • 优化分页逻辑（消除大 Offset）              |





## 2. 慢查询日志

**MySQL 慢查询日志（Slow Query Log）** 是 MySQL 提供的一种用于记录执行耗时超过指定阈值或未使用有效索引的 SQL 语句的日志机制，是排查数据库性能瓶颈、定位慢 SQL 的核心手段。

### 1. 核心参数与配置

慢查询日志在 MySQL 中默认是**关闭**的（部分云数据库默认开启）。可以通过动态修改全局变量（即时生效，重启失效）或修改配置文件 `my.cnf`（永久生效）。

**关键参数一览**

| **参数名**                                   | **默认值**        | **推荐配置**     | **作用说明**                                                 |
| -------------------------------------------- | ----------------- | ---------------- | ------------------------------------------------------------ |
| **`slow_query_log`**                         | `OFF`             | `ON`             | 是否开启慢查询日志。                                         |
| **`slow_query_log_file`**                    | `主机名-slow.log` | 自定义路径       | 慢查询日志的存储路径及文件名。                               |
| **`long_query_time`**                        | `10`（秒）        | `1` 或 `0.1`     | 慢查询判定阈值（单位：秒，**支持小数**，如 `0.1` 表示 100ms）。 |
| **`log_queries_not_using_indexes`**          | `OFF`             | `ON`（调优阶段） | 是否记录未使用索引或没有有效使用索引的查询。                 |
| **`log_throttle_queries_not_using_indexes`** | `0`（不限）       | `10`~`60`        | 每分钟最多记录无索引查询的条数，防止无索引高频语句打爆日志。 |
| **`min_examined_row_limit`**                 | `0`               | `100`            | 扫描行数少于该值的查询不记录（避免单行微小查询被无索引规则捕获）。 |
| **`log_output`**                             | `FILE`            | `FILE`           | 日志输出格式：`FILE`（写文件）或 `TABLE`（写入 `mysql.slow_log` 表）。 |

存储路径：`C:\ProgramData\MySQL\MySQL Server 8.0\Data\`



### 2. 开启与配置方式

**方式一：临时在线开启（无需重启，即时生效）**

```sql
-- 1. 查看当前慢查询配置状态
SHOW VARIABLES LIKE '%slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';

-- 2. 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';

-- 3. 设置慢查询阈值为 0.5 秒（500ms）
SET GLOBAL long_query_time = 0.5;

-- 4. 开启记录未使用索引的查询（可选）
SET GLOBAL log_queries_not_using_indexes = 'ON';
-- 配合限流：每分钟最多记录 50 条未使用索引的 SQL
SET GLOBAL log_throttle_queries_not_using_indexes = 50;
```

> **注意**：
>
> 执行 `SET GLOBAL long_query_time` 后，**当前连接会话不会立即生效**（只对新建立的连接生效）。如果要在当前会话验证，可执行 `SET SESSION long_query_time = 0.5;`。



**方式二：配置文件持久化（修改 `my.cnf` / `my.ini`）**

文件位置 `C:\ProgramData\MySQL\MySQL Server 8.0`

在配置文件的 `[mysqld]` 模块下添加：

```TOML
[mysqld]
# 开启慢查询日志
slow_query_log = ON
# 指定日志文件路径
slow_query_log_file = /var/lib/mysql/mysql-slow.log
# 慢查询时间阈值（单位：秒）
long_query_time = 0.5
# 记录未使用索引的查询
log_queries_not_using_indexes = ON
log_throttle_queries_not_using_indexes = 60
# 扫描行数小于 100 行的不记入慢日志
min_examined_row_limit = 100
# 存储方式为文件
log_output = FILE
```

配置完成后重启 MySQL 服务生效：

```bash
Restart-Service MySQL80
```



### 3. 内容解析

慢查询日志的文件内容格式如下：

```Plaintext
# Time: 2026-08-19T08:30:15.123456Z
# User@Host: root[root] @ localhost []  Id:    12
# Query_time: 2.152341  Lock_time: 0.000120 Rows_sent: 10  Rows_examined: 500000
SET timestamp=1787128215;
SELECT * FROM tb_order WHERE create_time >= '2026-01-01' ORDER BY id DESC LIMIT 10;
```

**核心指标解读**：

- **`Query_time`**：SQL 实际执行总时间（秒）。
- **`Lock_time`**：等待表锁/行锁的时间（秒）。如果 `Lock_time` 占比很高，说明存在严重**锁争用**，而非 SQL 自身计算慢。
- **`Rows_sent`**：实际返回给客户端的数据行数。
- **`Rows_examined`**：存储引擎底层实际**扫描检索的行数**。
  - **关键诊断法则**：$\text{Rows\_examined} \gg \text{Rows\_sent}$（扫描行数远大于返回行数），说明查询过滤性差，缺少合适的索引或存在全表扫描。



### 4. 分析工具

日志文件长期运行可能达数 GB，人工排查极难，通常借助以下两类工具进行聚合分析。

**工具 1：`mysqldumpslow`（MySQL 官方自带）**

MySQL 安装包自带的 Perl 脚本，可对慢查询日志进行归一化（把具体数字、字符串替换为 `N` 和 `S`）并聚合排序。

**常用参数说明**

- `-s`：排序方式：
  - `t`：按总执行时间（Total Query Time）
  - `at`：按平均执行时间（Average Time）
  - `c`：按出现次数（Count）
  - `l`：按总锁定时间（Lock Time）
  - `r`：按总返回行数
  - `ar`：按平均返回行数
- `-t <N>`：只展示前 N 条数据（Top N）。
- `-g <pattern>`：使用正则匹配特定 SQL 内容。

**常用命令范例**

```bash
# 1. 按照总耗时降序，打印前 10 条慢 SQL
mysqldumpslow -s t -t 10 /var/lib/mysql/mysql-slow.log

# 2. 按照平均耗时降序，打印前 10 条包含 'tb_order' 的慢 SQL
mysqldumpslow -s at -t 10 -g "tb_order" /var/lib/mysql/mysql-slow.log

# 3. 按照执行频次降序，打印前 5 条 SQL
mysqldumpslow -s c -t 5 /var/lib/mysql/mysql-slow.log
```



**工具 2：`pt-query-digest`（Percona Toolkit，业界推荐）**

Percona 出品的专业分析工具，能够生成详细的吞吐量、耗时分布（95% 耗时等）、响应时间直方图等统计报告。

```bash
# 分析慢日志并输出格式化报表到文件
pt-query-digest /var/lib/mysql/mysql-slow.log > slow_report.txt

# 分析最近 12 小时内的慢查询
pt-query-digest --since=12h /var/lib/mysql/mysql-slow.log > recent_slow.txt
```



### 5. 最佳实践与避坑指南

**阈值建议分阶段设置**：

- **初次上线/日常运行**：建议 `long_query_time = 1` 或 `0.5`（500ms），重点抓住明显卡顿的慢 SQL。
- **深度调优/压测阶段**：建议调至 `long_query_time = 0.05` ~ `0.1`（50ms ~ 100ms），找出长尾慢查询。

**谨慎使用 `log_queries_not_using_indexes`**：

- 如果数据库中有很多小表（如只有几十行的字典表），MySQL 优化器通常会选择全表扫描（因为全表扫描比二级索引回表更快），这会导致这些正常查询大量写入慢日志。
- 建议配合 `min_examined_row_limit = 100` 以及 `log_throttle_queries_not_using_indexes` 限制条数。

**注意日志轮转与磁盘占用**：

- 慢日志文件会持续追加写入，请配置 Linux 系统的 `logrotate` 或编写定时脚本按天压缩轮转，避免磁盘被撑满。

**慎用 `log_output = TABLE`**：

- 将日志存入 `mysql.slow_log` 表会产生额外的数据库写入事务与锁开销，高并发场景下建议始终使用 `FILE` 模式。



## 3. explain

**`EXPLAIN`** 是 MySQL 优化器提供的执行计划查看工具，用于模拟优化器执行 SQL 语句的过程，从而分析查询的访问类型、索引命中情况、预估扫描行数及潜在的性能缺陷。

### 1. 核心输出字段

在查询语句前加上 `EXPLAIN` 即可输出分析结果：

```sql
EXPLAIN SELECT o.id, o.order_no, u.name 
FROM tb_order o 
JOIN tb_user u ON o.user_id = u.id 
WHERE o.status = 'PAID';
```

| **字段**            | **含义**                   | **诊断重点**                                                 |
| ------------------- | -------------------------- | ------------------------------------------------------------ |
| **`id`**            | 查询序号与执行优先级       | • `id` 相同：从上到下顺序执行。  • `id` 不同：`id` 越大优先级越高，越先执行（如子查询）。 |
| **`select_type`**   | 查询类型                   | • `SIMPLE`：简单查询（无子查询或 `UNION`）。  • `PRIMARY`：最外层主查询。  • `DERIVED`：派生表（`FROM` 后的子查询）。  • `SUBQUERY`：`WHERE` 或 `SELECT` 中的子查询。 |
| **`table`**         | 当前访问的表/别名          | 涉及多表关联时，表示当前正在处理哪张表。                     |
| **`type`**          | **数据访问类型（核心）**   | 性能从好到差：`system` > `const` > `eq_ref` > `ref` > `range` > `index` > `ALL`。 |
| **`possible_keys`** | 可能用到的候选索引         | 评估优化器可选择的索引列表。                                 |
| **`key`**           | **实际命中的索引（核心）** | 若为 `NULL` 说明没有命中任何索引。                           |
| **`key_len`**       | **实际生效的索引字节数**   | 用于判断联合索引命中了几个字段。                             |
| **`ref`**           | 索引列匹配的参照对象       | 显示哪些列或常量（`const`）用于在索引上查找值。              |
| **`rows`**          | **预估扫描行数（核心）**   | 优化器预估找到所需记录需要读取的行数，**越小越好**。         |
| **`filtered`**      | Server 层过滤百分比        | 存储引擎返回数据后，经条件过滤剩下的有效比例（越接近 100% 越好）。 |
| **`Extra`**         | **额外执行机制（核心）**   | 重点关注是否有 `filesort`、`temporary` 或 `Using index`。    |



### 2. 核心指标精析

#### **访问类型**

```
 性能极佳 (无需调优)          日常业务合格线            必须重点优化
┌─────────────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐
│ system > const > eq_ref │ >│   ref  >  range  │ >│     index   >   ALL     │
└─────────────────────────┘  └──────────────────┘  └─────────────────────────┘
```

- **`const` / `system`**：通过主键或唯一索引查找，只匹配到 1 行数据（如 `WHERE id = 1`）。
- **`eq_ref`**：多表关联时，被驱动表使用主键或唯一非空索引进行关联（1 对 1 关联）。

  - ```sql
    -- tb_user 的 id 是主键
    SELECT o.*, u.username 
    FROM tb_order o 
    JOIN tb_user u ON o.user_id = u.id; 
    -- 此时 tb_user 表的访问类型就是 eq_ref
    ```

- **`ref`**：使用非唯一 二级索引进行等值查询（1 对 多 匹配，如 `WHERE user_id = 100`）。

  - 查询条件走的是**普通二级索引（非唯一）**，或者是联合索引的最左前缀等值匹配。

- **`range`**：使用索引检索指定范围的行（如 `>`, `<`, `BETWEEN`, `IN`, `LIKE 'abc%'`）。
- **`index`（全索引扫描）**：遍历了整棵二级索引树，虽然比全表扫描快，但扫描了所有索引节点。
- **`ALL`（全表扫描）**：直接从头到尾遍历聚簇索引叶子节点的所有数据，**大表出现 `ALL` 必须优化**。

| **type**    | **查字典的行为**                                     | **效率与复杂度**       |
| ----------- | ---------------------------------------------------- | ---------------------- |
| **`const`** | 根据目录上的精确页码，**翻到第 5 页看具体内容**      | 极高 ($O(1)$)          |
| **`ref`**   | 查姓「张」的人，**翻到张姓起始页，顺着往下看几个人** | 高 ($O(\log N + M)$)   |
| **`range`** | 查拼音在 **[A 到 C]** 之间的所有字                   | 较好 ($O(\log N + M)$) |
| **`index`** | **从头到尾只把整本字典的「目录页」看了一遍**         | 差 ($O(N)$)            |
| **`ALL`**   | **从第 1 页到最后一页，逐字逐页翻看整本字典**        | 最差 ($O(N)$)          |



#### 额外信息

- **`Using index`（最佳）**：命中**覆盖索引**，查询所需的列全部存在于二级索引中，**无需回表（Bookmark Lookup）**。
- **`Using index condition`（ICP，优良）**：索引条件下推。MySQL 在存储引擎层过滤索引列条件，减少回表次数。
- **`Using where`**：存储引擎检索出行后，由 MySQL Server 层进行条件过滤（通常配合全表扫描或回表使用）。
- **`Using filesort`（需优化）**：无法直接利用索引顺序获取有序数据，MySQL 必须在内存/磁盘中额外进行排序。
- **`Using temporary`（需优化）**：创建了内部临时表来保存中间结果，常见于 `GROUP BY` 或 `DISTINCT` 未走索引。
- **`Using join buffer (Block Nested Loop / Hash Join)`**：表连接字段没有有效索引，使用了连接缓冲区进行嵌套循环扫描。



#### Extra优化

针对 `Extra` 列中出现的不同状态，核心调优思路是：**消除性能损耗项（`filesort`、`temporary`、`join buffer`），并将查询向最理想项（`Using index`）推进。**

**1. 消除 `Using filesort`（避免内存/磁盘文件排序）**

当 `ORDER BY` 的字段无法直接利用索引天然的有序性时，就会产生 `filesort`。

- **建立「过滤 + 排序」的联合索引**：

  遵循最左前缀法则，将 `WHERE` 中的等值字段放在索引前面，`ORDER BY` 字段放在索引后面。

  ```sql
  -- 慢 SQL
  SELECT * FROM tb_order WHERE user_id = 100 ORDER BY create_time DESC;
  -- 优化方案：建立联合索引
  ALTER TABLE tb_order ADD INDEX idx_user_create(user_id, create_time);
  ```

- **多字段排序方向保持一致**：

  若 `ORDER BY col1 ASC, col2 DESC`，普通单向索引无法利用，需建立 MySQL 8.0 降序索引：

  ```sql
  ALTER TABLE tb_order ADD INDEX idx_a_asc_b_desc(col1 ASC, col2 DESC);
  ```

- **确保排序字段来自驱动表**：

  在多表关联（`JOIN`）时，`ORDER BY` 的字段如果属于被驱动表，必然触发 `filesort`。应尽量让排序字段属于驱动表。



**2. 消除 `Using temporary`（避免创建内存/磁盘临时表）**

常见于未走索引的 `GROUP BY`、`DISTINCT` 或多表关联聚合。

- **为 `GROUP BY` 字段建立索引**：

  ```sql
  -- 慢 SQL
  SELECT user_id, COUNT(*) FROM tb_order WHERE status = 'PAID' GROUP BY user_id;
  -- 优化方案：建立 (status, user_id) 联合索引
  ALTER TABLE tb_order ADD INDEX idx_status_user(status, user_id);
  ```

- **保证 `GROUP BY` 和 `ORDER BY` 顺序一致**：

  若包含 `GROUP BY a ORDER BY b`，优化器需要两套序列，必然产生临时表。尽量让排序字段与分组字段保持一致。

- **单表聚合替代多表混杂聚合**：

  避免 `GROUP BY` 中同时包含表 A 和表 B 的字段。



**3. 消除 `Using join buffer`（避免全表嵌套循环/Hash扫描）**

多表关联时，**被驱动表的关联条件列上没有索引**，导致 MySQL 必须在内存构建 Join Buffer（Hash Join / BNL）逐行扫描匹配。

- **给被驱动表的关联字段加索引**：

  ```sql
  -- SQL: SELECT * FROM t1 LEFT JOIN t2 ON t1.b_id = t2.id;
  -- t1 是驱动表，t2 是被驱动表。必须确保 t2.id 上有索引！
  ALTER TABLE t2 ADD INDEX idx_id(id);
  ```

- **严格统一关联字段的类型与字符集**：

  若 `t1.b_id` 是 `VARCHAR(utf8mb4)`，而 `t2.id` 是 `VARCHAR(utf8)` 或 `BIGINT`，会发生隐式类型转换，导致索引失效并强制触发 Join Buffer。



**4. 优化 `Using where`（减少 Server 层过滤消耗）**

`Using where` 意味着存储引擎返回了多余的行，由 MySQL Server 层进行二次过滤。

- **补充或扩展复合索引**：

  将 `WHERE` 中过滤效果好的列全部纳入索引，让存储引擎直接定位精确行，将访问类型从 `ALL` 提升为 `ref` 或 `range`。

- **充分利用索引条件下推（ICP）**：

  联合索引 `(a, b)` 下，查询 `WHERE a > 10 AND b = 2` 时，MySQL 会自动在引擎层利用 `b` 过滤（显示为 `Using index condition`），大幅减少回表次数。



**5. 达成 `Using index`（实现覆盖索引，彻底消除回表）**

这是查询性能的理想形态：查询所需的所有字段都在二级索引树上，无需回表查询主键聚簇索引。

- **杜绝 `SELECT \*`**：仅查询业务必需的字段。

- **将高频查询列加入联合索引末尾**：

  ```sql
  -- 需查询 id, user_id, score
  SELECT id, user_id, score FROM tb_shop WHERE type_id = 1;
  -- 建立覆盖索引（id 默认包含在二级索引叶子节点中）
  ALTER TABLE tb_shop ADD INDEX idx_type_score(type_id, score);
  -- 此时 Extra 会直接变为：Using index
  ```

**优化决策速查表**

| **当前 Extra / 现象**        | **根因诊断**           | **第一步优化动作**                        |
| ---------------------------- | ---------------------- | ----------------------------------------- |
| **`Using filesort`**         | 排序字段未走索引       | 补建 `(WHERE字段, ORDER BY字段)` 联合索引 |
| **`Using temporary`**        | 分组/去重字段未走索引  | 为 `GROUP BY` / `DISTINCT` 字段建索引     |
| **`Using join buffer`**      | 被驱动表关联字段缺索引 | 为被驱动表的 `ON` 条件列添加索引          |
| **`Using where` (全表扫描)** | 过滤条件未命中索引     | 为 `WHERE` 高选择性字段建索引             |
| **期望极致性能**             | 二级索引回表开销大     | 改造为覆盖索引，达成 **`Using index`**    |



#### 联合索引

`key_len` 表示索引实际使用的字节数，可用于确认复合索引是否发生了**部分失效**：

假设联合索引 `idx_a_b_c(a, b, c)`，表字符集为 `utf8mb4`（1 个字符最多占 4 字节）：

- `a` 为 `INT` (4 字节 + 1 NULL 标记 = **5 字节**)
- `b` 为 `VARCHAR(10)` ($10 \times 4 + 2$ 变长开销 + 1 NULL 标记 = **43 字节**)
- `c` 为 `DATETIME` (5 字节 + 1 NULL 标记 = **6 字节**)

| **查询条件**                 | **实际使用的 key_len** | **结论**                                   |
| ---------------------------- | ---------------------- | ------------------------------------------ |
| `WHERE a = 1`                | `5` 字节               | 仅命中了第 1 个字段 `a`                    |
| `WHERE a = 1 AND b = 'test'` | `48` 字节 ($5 + 43$)   | 命中了前 2 个字段 `a` 和 `b`               |
| `WHERE a = 1 AND c = NOW()`  | `5` 字节               | 违背最左前缀，跳过 `b` 导致 `c` 无法走索引 |



### 3. 进阶用法

**1. `EXPLAIN FORMAT=JSON`（查看优化器成本）**

```sql
EXPLAIN FORMAT=JSON SELECT * FROM tb_order WHERE user_id = 100;
```

输出 JSON 格式的执行计划，能展示优化器计算的 **`query_cost`（查询成本）** 和数据读取字节数，便于量化对比不同索引方案的代价。

**2. `EXPLAIN ANALYZE`（MySQL 8.0+ 真实执行树）**

```sql
EXPLAIN ANALYZE SELECT * FROM tb_order WHERE status = 'PAID' ORDER BY id DESC LIMIT 10;
```

与普通 `EXPLAIN`（仅预估）不同，`EXPLAIN ANALYZE` 会**实际运行 SQL** 并打印出每一步物理执行算子的：

- 实际总耗时（`actual time=0.045..0.123`，起始时间与结束时间）
- 实际返回行数（`rows=10`）与实际循环迭代次数（`loops=1`）



# 二. SQL优化

## 1. 插入数据

如果我们需要一次性往数据库表中插入多条记录，可以从以下三个方面进行优化。

```sql
insert into tb_test values(1,'tom');  
insert into tb_test values(2,'cat');  
insert into tb_test values(3,'jerry');  
.......
```

**优化方案一: 批量插入数据**

```sql
Insert into tb_test values(1,'Tom'), (2,'Cat'), (3,'Jerry');
```



**优化方案二: 手动控制事务**

```sql
start transaction;   
insert into tb_test values(1,'Tom'), (2,'Cat'), (3,'Jerry');   
insert into tb_test values(4,'Tom'), (5,'Cat'), (6,'Jerry');   
insert into tb_test values(7,'Tom'), (8,'Cat'), (9,'Jerry');   
commit;
```



**优化方案三: 主键顺序插入，性能要高于乱序插入。**

```txt
1 主键乱序插入：8 1 9 21 88 2 4 15 89 5 7 3  
2 主键顺序插入：1 2 3 4 5 7 8 9 15 21 88 89
```



**大批量插入数据**

如果一次性需要插入大批量数据(比如：几百万的记录)，使用insert语句插入性能较低，此时可以使用MySQL数据库提供的load指令进行插入


可以执行如下指令，将数据脚本文件中的数据加载到表结构中：

```sql
--客户端连接服务端时，加上参数 --local-infile  
mysql --local-infile -u root -p  

--设置全局参数local_infile为1，开启从本地加载文件导入数据的开关  
set global local_infile = 1;  
 
--执行load指令将准备好的数据，加载到表结构中  
load data local inline '/root/sql1.log' into table tb_user fields terminated by ',' lines terminated by '\n';
```



A．创建表结构

```sql
CREATE TABLE `tb_user` (  
`id` INT(11) NOT NULL AUTO_INCREMENT,  
`username`VARCHAR(50) NOT NULL,  
`password`VARCHAR(50) NOT NULL,  
`name`VARCHAR(20) NOT NULL,  
`birthday`DATE DEFAULT NULL,  
`sex`CHAR(1) DEFAULT NULL,  
PRIMARY KEY (`id`),  
UNIQUE KEY `unique_user_username` (`username`)  
) ENGINE=INNODB DEFAULT CHARACTERSET=utf8;
```

B. 设置参数

```sql
--客户端连接服务端时加上参数 --local-infile  
mysql --local-infile -u root -p  
 
--设置全局参数local_infile为1，开启从本地加载文件导入数据的开关  
set global local_infile = 1;
```

C. load加载数据

```sql
load data local inline '/root/load_user_100w_sort.sql' into table tb_userfields terminated by ',' lines terminated by '\n';
```

```sql
mysql> load data local infile '/root/load_user_100w_sort.sql' into table tb_user fields terminated by ', lines terminated by '\n';  
Query OK, 1000000 rows affected (16.84 sec)  
Records: 1000000 Deleted: 0 Skipped: 0 Warnings: 0  
mysql> select count(*) from tb_user;  
+-----------------------------------+  
| count(*) |  
+-----------------------------------+  
| 1000000 |  
+-----------------------------------+  
1 row in set (0.03 sec)
```

我们看到，插入100w的记录，17s就完成了，性能很好。**在load时，主键顺序插入性能高于乱序插入**



## 2. 主键优化

在上一小节，我们提到，主键顺序插入的性能是要高于乱序插入的。这一小节，就来介绍一下具体的原因，然后再分析一下主键又该如何设计。

**1.数据组织方式**

在InnoDB存储引擎中，表数据都是根据主键顺序组织存放的，这种存储方式的表称为索引组织表(index organized table IOT)。

![image-20260819220115433](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220115433.png)


行数据，都是存储在聚集索引的叶子节点上的。而我们之前也讲解过InnoDB的逻辑结构图：

![image-20260819220444934](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220444934.png)


在InnoDB引擎中，数据行是记录在逻辑结构 page 页中的，而每一个页的大小是固定的，默认16K。那也就意味着，一个页中所存储的行也是有限的，如果插入的数据行row在该页存储不小，将会存储到下一个页中，页与页之间会通过指针连接。



| **特性**     | **页分裂（Page Split）**             | **页合并（Page Merge）**               |
| ------------ | ------------------------------------ | -------------------------------------- |
| **主要诱因** | 乱序插入导致满页空间不足             | 大量删除/更新导致空间利用率过低        |
| **触发阈值** | 页剩余空间 < 待插入行大小            | 页空间利用率 < `MERGE_THRESHOLD` (50%) |
| **底层操作** | 申请新页，搬移约 50% 数据            | 将相邻两页合并为一页，释放空页         |
| **直接后果** | 产生存储碎片、降低页利用率、写入变慢 | 回收磁盘空间、降低索引树深度           |

**2.页分裂**

页可以为空，也可以填充一半，也可以填充100%  。每个页包含了 2-N 行数据（如果一行数据过大，会行溢出），根据主键排列。

**A. 主键顺序插入效果**

(1) 从磁盘中申请页, 主键顺序插入

<img src="/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220717599.png" alt="image-20260819220717599" style="zoom:80%;" />

(2) 第一个页没有满，继续往第一页插入

![image-20260819220746865](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220746865.png)


(3) 当第一个也写满之后，再写入第二个页，页与页之间会通过指针连接

![image-20260819220801011](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220801011.png)


(4) 当第二页写满了, 再往第三页写入

![image-20260819220813944](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220813944.png)



B. 主键乱序插入效果

(1) 加入1, 2页都已经写满了,存放了如图所示的数据

![image-20260819220954357](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819220954357.png)


(2) 此时再插入id为50的记录，我们来看看会发生什么现象

会再次开启一个页，写入新的页中吗？

![image-20260819221015145](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221015145.png)


不会。因为，索引结构的叶子节点是有顺序的。按照顺序，应该存储在47之后。

![image-20260819221240686](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221240686.png)


但是47所在的1页，已经写满了，存储不了50对应的数据了。那么此时会开辟一个新的页3。

![image-20260819221303234](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221303234.png)


但是并不会直接将50存入3页，而是会将1页后一半的数据，移动到3页，然后在3页，插入50。

![image-20260819221320074](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221320074.png)


移动数据，并插入id为50的数据之后，那么此时，这三个页之间的数据顺序是有问题的。1的下一个页，应该是3，3的下一个页是2。所以，此时，需要重新设置链表指针。

![image-20260819221348514](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221348514.png)


上述的这种现象，称之为 "页分裂"，是比较耗费性能的操作。



**3.页合并**

目前表中已有数据的索引结构（叶子节点）如下：

![image-20260819221411669](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221411669.png)


当我们对已有数据进行删除时，具体的效果如下：

当删除一行记录时，实际上记录并没有被物理删除，只是记录被标记（flaged）为删除并且它的空间变得允许被其他记录声明使用。

![image-20260819221500066](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221500066.png)


当我们继续删除2的数据记录

![image-20260819221514143](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221514143.png)


当页中删除的记录达到MERGE_threshold（默认为页的  50% ），InnoDB会开始寻找最靠近的页（前或后）看看是否可以将两个页合并以优化空间使用。


![image-20260819221555939](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221555939.png)


删除数据，并将页合并之后，再次插入新的数据21，则直接插入3页

![image-20260819221610208](/covers/java--mysql-2--3-sql-1n4kg08/image-20260819221610208.png)


这个里面所发生的合并页的这个现象，就称之为 "页合并"。

知识小贴士：

MERGE_threshold：合并页的阈值，可以自己设置，在创建表或者创建索引时指定。





## 3. order by优化

MySQL的排序，有两种方式：

- **Using filesort**：通过表的索引或全表扫描，读取满足条件的数据行，然后在排序缓冲区sort buffer中完成排序操作，所有不是通过索引直接返回排序结果的排序都叫FileSort排序。

- **Using index** : 通过有序索引顺序扫描直接返回有序数据，这种情况即为 using index，不需要额外排序，操作效率高。

对于以上的两种排序方式，Using index的性能高，而Using filesort的性能低，我们在优化排序操作时，尽量要优化为 Using index。



接下来，我们来做一个测试：

A.执行排序SQL

```sql
explain select id,age,phone from tb_user order by age;
```

![image-20260820103236623](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103236623.png)


```sql
explain select id,age,phone from tb_user order by age, phone;
```

![image-20260820103320340](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103320340.png)


由于 age，phone 都没有索引，所以此时再排序时，出现Using filesort，排序性能较低。

C. 创建索引

```sql
create index idx_user_age_phone_aa on tb_user(age, phone);
```

D. 创建索引后, 根据age, phone进行升序排序

```sql
explain select id,age,phone from tb_user order by age;
```

![image-20260820103414815](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103414815.png)

```sql
explain select id,age,phone from tb_user order by age , phone;
```

![image-20260820103446684](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103446684.png)


建立索引之后，再次进行排序查询，就由原来的Using filesort，变为了 Using index，性能就是比较高的了。

E.创建索引后，根据age，phone进行降序排序

```sql
explain select id,age,phone from tb_user order by age desc , phone desc ;
```

![image-20260820103620818](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103620818.png)


也出现 Using index，但是此时Extra中出现了 Backward index scan，这个代表反向扫描索引，因为在MySQL中我们创建的索引，默认索引的叶子节点是从小到大排序的，而此时我们查询排序时，是从大到小，所以，在扫描时，就是反向扫描，就会出现 Backward index scan。在MySQL8版本中，支持降序索引，我们也可以创建降序索引。

F. 根据phone, age进行升序排序, phone在前, age在后。

```sql
explain select id,age,phone from tb_user order by phone, age;
```

![image-20260820103719014](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103719014.png)


排序时，也需要满足最左前缀法则，否则也会出现 filesort。因为在创建索引的时候，age是第一个字段，phone是第二个字段，所以排序时，也就该按照这个顺序来，否则就会出现 Using filesort。

F. 根据age, phone进行降序一个升序, 一个降序

```sql
explain select id,age,phone from tb_user order by age asc , phone desc ;
```

![image-20260820103807931](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103807931.png)

因为创建索引时，如果未指定顺序，默认都是按照升序排序的，而查询时，一个升序，一个降序，此时就会出现Using filesort。


为了解决上述的问题，我们可以创建一个索引，这个联合索引中 age 升序排序，phone 倒序排序。

G．创建联合索引(age升序排序，phone倒序排序)

```sql
create index idx_user_age_phone_ad on tb_user(age asc ,phone desc);
```

H. 然后再次执行如下SQL

```sql
explain select id,age,phone from tb_user order by age asc , phone desc ;
```

![image-20260820103854441](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103854441.png)


升序/降序联合索引结构图示：

age asc , phone asc

![image-20260820103945466](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820103945466.png)

![image-20260820104005164](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820104005164.png)



`ORDER BY` 优化的核心目标是**直接利用 B+ 树索引的物理有序性完成排序（Index Scan），彻底消除额外的 `Using filesort`（内存/磁盘文件排序）**。

MySQL 仅在排序字段严格契合联合索引顺序及过滤条件时，才能走索引排序。



**1. 等值过滤 + 排序字段满足最左前缀**

当查询包含 `WHERE` 与 `ORDER BY` 时，将等值查询字段置于索引最左侧，排序字段紧随其后：

- **SQL**：`SELECT id, user_id, create_time FROM orders WHERE status = 1 ORDER BY create_time DESC;`
- **推荐索引**：`(status, create_time)`
- **原理**：`status = 1` 确定索引范围后，该范围内的数据在索引树中本身已按 `create_time` 排好序，读取即有序。



**2. 保持排序方向一致（或使用降序索引）**

联合索引中多字段排序时，各字段的排序方向必须与索引定义一致：

- **全升序/全降序**：`ORDER BY a ASC, b ASC` 或 `ORDER BY a DESC, b DESC` 均可利用索引 `(a, b)`（后者进行反向索引扫描 `Backward index scan`）。
- **混合升降序**：`ORDER BY a ASC, b DESC` 无法利用普通联合索引 `(a, b)`。
  - **解决方案**：在 MySQL 8.0+ 中显式建立降序索引：`ALTER TABLE t ADD INDEX idx_a_b (a ASC, b DESC);`。



**3. 避免范围查询打断索引排序**

如果 `WHERE` 条件中存在范围查询（`>`, `<`, `BETWEEN`, `IN` 等），其后的字段将无法通过索引直接排序：

- **SQL**：`SELECT * FROM orders WHERE status > 1 ORDER BY create_time;`
- **分析**：即使建立了联合索引 `(status, create_time)`，扫描完多段 `status` 范围后，整体数据对 `create_time` 依然无序，仍会触发 `Using filesort`。



**4. 覆盖索引消除回表**

如果排序列不在聚簇索引（主键）上，且查询了索引未包含的列，当优化器计算出“回表 I/O 成本高于直接全表扫描 + filesort”时，会放弃索引：

- **优化**：将 `SELECT` 查询的高频字段一并纳入联合索引，避免回表。



当业务无法建立合适索引、必须使用 `Using filesort` 时，MySQL 会分配 `sort_buffer` 进行内存排序。

| **排序算法**               | **触发条件**                                      | **排序过程**                                                 | **优缺点**                            |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| **单路排序 (Single-pass)** | 查询单行数据长度 $\le$ `max_length_for_sort_data` | 一次性将 `SELECT` 的**所有字段**读入 `sort_buffer` 进行排序。 | 内存占用高，但无需二次回表，效率高。  |
| **双路排序 (Two-pass)**    | 查询单行数据长度 $>$ `max_length_for_sort_data`   | 仅将**排序列 + 主键 ID** 读入 `sort_buffer` 排序，排完后再回表取其余字段。 | 节省内存，但会引发大量随机 I/O 回表。 |

- **严禁 `SELECT \*`**：查询字段越多，单行长度越容易突破 `max_length_for_sort_data`，迫使 MySQL 降级为双路排序。
- **参数调优**：
  - `sort_buffer_size`：会话级排序内存。数据量超过该值时会写入磁盘临时文件（多路归并排序）。对特定大排序任务可在会话级适度调大，但全局不宜设得过高以防内存耗尽。
  - `max_length_for_sort_data`：控制单路与双路排序的临界阈值。



**执行计划关键指标（EXPLAIN）**

| **Extra / Key 表现**       | **性能评估** | **处理动作**                                                 |
| -------------------------- | ------------ | ------------------------------------------------------------ |
| `Using index` / 走预期索引 | 最优         | 纯索引排序且覆盖索引，零额外 I/O。                           |
| `Backward index scan`      | 优           | 反向索引扫描（如 ASC 索引执行 DESC 排序），性能接近正向扫描。 |
| `Using filesort`           | 中 / 差      | 未走索引排序，需评估是否需新增/调整联合索引或改写分页。      |



## 4. group by优化

分组操作，我们主要来看看索引对于分组操作的影响。

在没有索引的情况下，执行如下SQL，查询执行计划：

```sql
explain select profession, count(*) from tb_user group by profession;

使用到了use temporary
```

然后，我们在针对于 profession，age，status 创建一个联合索引。

```sql
create index idx_user_pro_age_sta on tb_user(profession, age, status);
```

紧接着，再执行前面相同的SQL查看执行计划。

```sql
explain select profession, count(*) from tb_user group by profession;
```

![image-20260820111545263](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820111545263.png)

再执行如下的分组查询SQL，查看执行计划：

```sql
explain select profession, count(*) from tb_user  where profession='软件工程' group by age;
-- using index
```

```sql
explain select profession, count(*) from tb_user group by age;
```

![image-20260820111641081](/covers/java--mysql-2--3-sql-1n4kg08/image-20260820111641081.png)

我们发现，如果仅仅根据age分组，就会出现 Using temporary；而如果是根据profession, age两个字段同时分组，则不会出现 Using temporary。原因是因为对于分组操作，在联合索引中，也是符合最左前缀法则的。



`GROUP BY` 优化的核心目标是**利用 B+ 树索引的有序性，消除 `Using temporary`（临时表）与 `Using filesort`（文件排序）**。

MySQL 执行 `GROUP BY` 时主要有三种扫描模式：**紧凑索引扫描（Tight Index Scan）**、**松散索引扫描（Loose Index Scan）** 和 **临时表/文件排序**。

**1. 满足联合索引的最左前缀法则**

当 `WHERE` 条件与 `GROUP BY` 组合使用时，索引顺序必须符合最左前缀原则：

- **最佳组合**：将 `WHERE` 中的等值过滤字段放在联合索引最左侧，随后紧跟 `GROUP BY` 字段。
  - 查询：`SELECT user_id, COUNT(*) FROM orders WHERE status = 1 GROUP BY user_id;`
  - 索引：`(status, user_id)`
  - 原理：先通过 `status = 1` 定位范围，此时索引中的 `user_id` 已经自然有序，引擎直接流式分组，无需排序或建临时表。



**2. 构建覆盖索引（Covering Index）**

如果查询字段、分组字段和聚合函数参数都在同一个联合索引中，MySQL 无需回表查询主键聚簇索引：

- 查询：`SELECT category_id, COUNT(product_id), AVG(price) FROM products GROUP BY category_id;`
- 索引：`(category_id, product_id, price)`
- 效果：Extra 显示 `Using index`，彻底消除回表 I/O。



**3. 利用松散索引扫描（Loose Index Scan）**

在特定聚合场景下（如 `MIN()` / `MAX()`），MySQL 可以直接跳跃式读取索引节点，而无需扫描满足条件的所有行：

- 查询：`SELECT category_id, MIN(price) FROM products GROUP BY category_id;`
- 索引：`(category_id, price)`
- 效果：Extra 显示 `Using index for group-by`，性能达到 $O(N_{groups})$ 而非 $O(N_{rows})$。



**SQL 书写与逻辑优化**

- **过滤条件坚决前置到 `WHERE`**：
  - `HAVING` 是在分组聚合**之后**进行过滤；`WHERE` 是在分组**之前**过滤。任何行级别的条件都应写在 `WHERE` 中，尽量减少参与分组的数据集大小。
- **避免 GROUP BY 与 ORDER BY 字段冲突**：
  - 如果 SQL 中同时存在 `GROUP BY a` 和 `ORDER BY b`，MySQL 无法同时依靠索引完成两者，必然会产生 `Using filesort`。
  - 保持排序字段与分组字段一致，或直接依赖联合索引的定义顺序。
- **大表分页分组先做子查询**：
  - 聚合数据量极大时，先利用子查询通过覆盖索引计算聚合结果或获取主键/分组键，再与原表关联获取详情字段。



**执行计划关键指标（EXPLAIN）**

| **Extra 标识**                    | **性能级别** | **评估与处理**                                            |
| --------------------------------- | ------------ | --------------------------------------------------------- |
| `Using index for group-by`        | 极高         | 触发松散索引扫描，最理想状态。                            |
| `Using index`                     | 高           | 触发紧凑索引扫描且覆盖索引，无需回表。                    |
| `Using filesort`                  | 中/低        | 未能完全利用索引有序性，产生内存/磁盘排序。               |
| `Using temporary; Using filesort` | 极低         | 无法利用索引，在内存/磁盘建立临时表并排序，必须优化索引。 |





## 5. limit优化

在数据量比较大时，如果进行limit分页查询，在查询时，越往后，分页查询效率越低。

我们一起来看看执行limit分页查询耗时对比：

```sql
mysql>  
mysql> select * from tb limit 0,10;  
10 rows in set (0.00 sec)
```

```sql
mysql> select * from tb limit 1000000,10;  
10 rows in set (1:66 sec)
```

```sql
mysql> select * from tb limit 5000000,10;  
10 rows in set (10.79 sec)
```

```sql
mysql> select * from tb limit 9000000,10;  
10 rows in set (19.39 sec)
```

通过测试我们会看到，越往后，分页查询效率越低，这就是分页查询的问题所在。

因为，当在进行分页查询时，如果执行 limit 2000000,10，此时需要MySQL排序前2000010 记录，仅仅返回 2000000 - 2000010 的记录，其他记录丢弃，查询排序的代价非常大。



`LIMIT` 优化的核心目标是**消除深分页（大 Offset）场景下扫描海量无效行带来的磁盘 I/O 与高额回表开销**。

当执行 `LIMIT 1000000, 10` 时，MySQL 的底层逻辑并非直接跳到第 100 万行，而是：

1. 从存储引擎读取 **1,000,010** 行数据并载入内存（若走了二级索引且未覆盖，会产生 1,000,010 次回表随机 I/O）。
2. 在 Server 层抛弃前 1,000,000 行，仅返回最后 10 行。

 **核心优化方案**

**1. 延迟关联 —— 兼容自由跳页的最优解**

先通过**覆盖索引**快速完成大 Offset 的扫描与排序（仅扫描主键 ID，无需回表），随后通过主键与原表内联获取所需的完整列。

- **优化前**（慢查询）：

  ```sql
  SELECT * FROM orders 
  WHERE status = 1 
  ORDER BY create_time DESC 
  LIMIT 1000000, 10; -- 产生 100 万次回表
  ```

- **优化后**（延迟关联）：

  ```sql
  SELECT o.* 
  FROM orders o
  INNER JOIN (
      SELECT id FROM orders 
      WHERE status = 1 
      ORDER BY create_time DESC 
      LIMIT 1000000, 10 -- 仅在联合索引 (status, create_time, id) 上完成分页
  ) AS sub ON o.id = sub.id; -- 仅回表 10 次
  ```



**2. 游标 / 书签分页（Seek Method）—— 性能最高（$O(1)$ 复杂度）**

彻底抛弃 `OFFSET`，改用上一页最后一条记录的排序依据（如 `id` 或 `create_time`）作为查询过滤条件。

- **单列主键排序**：

  ```sql
  -- 上一页最后一条记录的 id 为 542000
  SELECT * FROM orders 
  WHERE id > 542000 
  ORDER BY id ASC 
  LIMIT 10;
  ```

- **非唯一列排序（需拼接主键防重复）**：

  ```sql
  -- 上一页最后一条记录: create_time = '2026-08-01 10:00:00', id = 8848
  SELECT * FROM orders 
  WHERE (create_time < '2026-08-01 10:00:00') 
     OR (create_time = '2026-08-01 10:00:00' AND id < 8848)
  ORDER BY create_time DESC, id DESC 
  LIMIT 10;
  ```

- **优势**：B+ 树通过索引直接 Seek 定位到第一条符合条件的节点，仅扫描 10 行数据即可返回。



**3. 严格使用覆盖索引**

如果查询的字段较少，直接将所需字段全部建立在联合索引中，杜绝任何回表操作：

```sql
-- 索引: (user_id, status, create_time, amount)
SELECT create_time, amount FROM orders 
WHERE user_id = 1000 AND status = 1 
ORDER BY create_time DESC 
LIMIT 500000, 10; -- Extra 为 Using index，纯内存扫描
```



**方案选型与对比**

| **方案**            | **适用场景**                             | **优势**                                      | **局限性**                                                   |
| ------------------- | ---------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| **延迟关联**        | 需要支持任意页码跳转的后台管理系统。     | 兼容前端分页组件，回表次数降至 `LIMIT` 大小。 | 仍需在索引树上扫描 Offset 个索引节点。                       |
| **游标分页 (Seek)** | 移动端 Feed 流、下拉刷新、日志流水查看。 | 性能极致稳定，无论多深都是 $O(1)$ 查找。      | **不支持直接跳到指定页码**（如跳到第 100 页），只能上一页/下一页。 |
| **覆盖索引**        | 查询字段极少的聚合或列表场景。           | 零回表开销，完全在索引树内存中完成。          | 字段过多时不宜建宽索引，维护成本高。                         |





## 6. count优化

`COUNT` 优化的核心在于**理解 InnoDB 的 MVCC 可见性机制与不同写法的底层开销，在索引覆盖、近似统计与架构缓存方案中做权衡**。

在 InnoDB 引擎中，不同写法的底层执行路径存在差异：

| **语法**            | **统计语义**                     | **底层执行机制**                                             | **性能排序**           |
| ------------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------- |
| **`COUNT(*)`**      | 统计总行数（包含 `NULL`）        | 优化器专属优化，自动选择**占用空间最小的索引树**进行遍历，不读取字段值，直接按行累加。 | 🥇 **最优**（官方推荐） |
| **`COUNT(1)`**      | 统计总行数（包含 `NULL`）        | 与 `COUNT(*)` 经过优化器后执行计划完全一致，性能没有区别。   | 🥇 **最优**             |
| **`COUNT(主键id)`** | 统计主键非空行数                 | 遍历索引树，取出每一行的 `id` 值返回给 Server 层，Server 层判断非空后累加（多了一次取值开销）。 | 🥈 **次之**             |
| **`COUNT(字段)`**   | 仅统计该字段**非 `NULL`** 的行数 | 从聚簇索引/二级索引中读取该字段值，传输至 Server 层过滤 `NULL` 后累加。若无独立索引还会引发回表。 | 🥉 **最慢**             |

> **结论**：统计表总行数时，统一优先使用 **`COUNT(*)`**。最好再建立一个二级索引



**为什么 InnoDB 的 `COUNT(*)` 不能像 MyISAM 一样快？**：

- **MyISAM**：将总行数直接记录在磁盘元数据中，无 `WHERE` 条件时读取复杂度为 $O(1)$。
- **InnoDB**：支持事务与 **MVCC（多版本并发控制）**。由于不同事务在同一时刻看到的可见数据行可能不同（Read View 差异），InnoDB 无法维护一个全局固定的总行数，必须通过扫描索引树并根据 Undo Log 版本链逐行判断行可见性。



**SQL 与索引级优化**

**1. 利用“最小辅助索引”减少 I/O 成本**

当执行无条件的 `COUNT(*)` 时，InnoDB 优化器会自动挑选**单行物理体积最小的二级索引**（Secondary Index）进行叶子节点扫描，而不是扫描体积庞大的主键聚簇索引树：

- **原理**：聚簇索引叶子节点存有整行数据（Data），二级索引叶子节点仅存（索引列 + 主键 ID）。页内能容纳更多索引项，大幅减少磁盘 I/O 读取的 Page 数量。
- **实践**：若单表字段极多且无二级索引，建立一个占用字节极小（如 `TINYINT`）的辅助索引，即可直接为 `COUNT(*)` 提速。



**2. 带 WHERE 条件时构建覆盖索引**

当 `COUNT(*)` 带有过滤条件时，确保 `WHERE` 字段建立了联合索引，避免全表扫描与回表：

```sql
-- 慢：全表扫描
SELECT COUNT(*) FROM orders WHERE status = 1 AND create_time >= '2026-08-01';

-- 优化：建立联合索引 idx_status_time (status, create_time)
-- 执行计划 Extra 显示 Using index，直接在索引叶子节点统计
```