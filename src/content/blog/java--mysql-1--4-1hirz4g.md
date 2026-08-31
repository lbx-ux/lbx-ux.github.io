---
title: 六. 约束
description: 一.约束数据库不仅要负责存储数据，还要保证存进来的数据是合法的、有逻辑的、不是乱写的（这就是数据库术语中常说的“数据完整性”）。如果你允许用户的年龄填个5岁，或者买东西时不填收货地址，系统迟早会崩溃。
pubDate: 2026-08-20
tags: [MySQL]
source: Java后端/数据库/Mysql/1. 基础/4.约束.md
---

# 一. 约束

数据库不仅要负责存储数据，还要保证存进来的数据是**合法的、有逻辑的、不是乱写的**（这就是数据库术语中常说的“数据完整性”）。如果你允许用户的年龄填个 `-5` 岁，或者买东西时不填收货地址，系统迟早会崩溃。

MySQL 中常用的约束有以下 6 种

|   约束   |                           描述                           |   关键字    |
| :------: | :------------------------------------------------------: | :---------: |
| 主键约束 |         主键是一行数据的唯一标识，要求非空且唯一         | primary key |
| 非空约束 |                限制该字段的数据不能为null                |  not null   |
| 唯一约束 |          保证该字段的所有数据都是唯一、不重复的          |   unique    |
| 默认约束 |      保存数据时，如果未指定该字段的值，则采用默认值      |   default   |
| 检查约束 |                 保证字段值满足某一个条件                 |    check    |
| 外键约束 | 用来让两张表的数据之间建立连接，保证数据的一致性和完整性 | foreign key |



## 1. 主键约束 (PRIMARY KEY)

这是表中最重要的约束。主键用来**唯一确定表中的每一行数据**（就像你的身份证号）。

- **特性**：**不能重复（唯一），且不能为空（NOT NULL）**。
- **最佳实践**：每张表都应该有一个主键，通常命名为 `id`，并配合 `AUTO_INCREMENT`（自动递增）使用。

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT, -- 主键，且自动加1
    -- ... 其他字段
);
```



## 2. 非空约束 (NOT NULL)

当你要求某个字段在插入数据时绝对不能留空，就加上它。就像注册账号时的“带星号必填项”。

```sql
CREATE TABLE users (
    username VARCHAR(50) NOT NULL -- 用户名必须填写，不能为 NULL
);
```



## 3. 唯一约束 (UNIQUE)：天无二日

保证这一列的所有数据互不相同。它和主键的区别在于：**一张表只能有一个主键，但可以有很多个唯一约束；且唯一约束允许存入空值（NULL）。**

```sql
CREATE TABLE users (
    phone_number VARCHAR(20) UNIQUE -- 手机号不能和别人重复
);
```



## 4. 默认值约束 (DEFAULT)

如果用户在插入数据时没有给这个字段传值，数据库会自动用默认值填补。非常适合用来记录状态或创建时间。

```sql
CREATE TABLE users (
    status VARCHAR(10) DEFAULT 'active',               -- 不传状态，默认就是 active 正常用户
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP     -- 不传时间，默认填入当前服务器时间
);
```



## 5. 检查约束 (CHECK)

用于限制列中的值的范围。在 MySQL 8.0 之前，写了也会被无视；但在 8.0 之后，它真正具备了拦截不合法数据的功能。

```sql
CREATE TABLE users (
    age INT CHECK (age >= 18 AND age <= 120) -- 强行拦截未成年人或非人类年龄的数据
);
```



## 6. 外键约束 (FOREIGN KEY)

外键用来建立**两张表之间的联系**。

假设有一张 `orders`（订单表），里面有个 `user_id`，外键可以保证：**你不能为一个不存在的用户创建订单。** 如果你要删除一个用户，而他还有订单，数据库会阻止你删除。

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    -- 规定这里的 user_id 必须在 users 表的 id 中存在
    FOREIGN KEY (user_id) REFERENCES users(id) 
);
```

> **⚠️ 行业高频面试题 / 真实开发避坑指南：为什么大厂严禁使用外键？**
>
> 在阿里、腾讯等现代互联网公司的开发规范中，通常会有一条铁律：**禁止在数据库中使用物理外键约束**。
>
> 1. **性能极差**：每次插入或更新时，数据库都要去另一张表里查一下数据存不存在，拖慢速度。
>
> 2. **容易死锁**：高并发场景下，表与表互相牵连，极易导致锁定整个数据库。
>
> 3. **极难维护**：你想删个测试数据，它提示你被关联了删不掉，拔出萝卜带出泥。
>
>    **正确的做法是**：使用**“逻辑外键”**。也就是表结构里不加 `FOREIGN KEY` 关键字，而是**在 Java/Python 等后端代码里**去判断和保证数据的对应关系。



# 二. 语法

## 1. 添加约束 (Add)

对于已经存在的表，可以通过 `ADD` 来增加表级约束，或者通过 `MODIFY` 来增加列级约束（如非空约束）。

- **添加主键约束 (PRIMARY KEY)**

  ```sql
  ALTER TABLE 表名 ADD PRIMARY KEY (列名);
  ```

- **添加唯一约束 (UNIQUE)**

  建议养成给约束命名的习惯，方便以后维护和删除。

  ```sql
  ALTER TABLE 表名 ADD CONSTRAINT 约束名 UNIQUE (列名);
  ```

- **添加外键约束 (FOREIGN KEY)**

  ```sql
  ALTER TABLE 表名 ADD CONSTRAINT 外键约束名 FOREIGN KEY (当前表的列名) REFERENCES 主表名(主表的列名);
  ```

- **添加检查约束 (CHECK)** *(注意：MySQL 8.0 及以上版本才正式生效)*

  ```sql
  ALTER TABLE 表名 ADD CONSTRAINT 约束名 CHECK (年龄 >= 18);
  ```

- **添加非空约束 (NOT NULL) / 默认值 (DEFAULT)**

  这类约束通常属于“修改字段属性”，所以不使用 `ADD`，而是使用 `MODIFY` 或 `ALTER COLUMN`：

  ```sql
  -- 添加非空约束（需带上原有的数据类型）
  ALTER TABLE 表名 MODIFY 列名 数据类型 NOT NULL;
  
  -- 添加默认值
  ALTER TABLE 表名 ALTER COLUMN 列名 SET DEFAULT '默认内容';
  ```



## 2. 删除约束 (Drop)

删除约束时，通常需要知道约束的名称。如果在添加时没有指定名称，数据库会自动生成一个（可以通过 `SHOW CREATE TABLE 表名;` 来查看约束名）。

- **删除主键约束**

  因为一张表只能有一个主键，所以不需要指定名字。

  *(注意：如果主键列设置了 `AUTO_INCREMENT`，需要先用 `MODIFY` 取消自增，然后才能删除主键)*

  ```sql
  ALTER TABLE 表名 DROP PRIMARY KEY;
  ```

- **删除外键约束**

  ```sql
  ALTER TABLE 表名 DROP FOREIGN KEY 外键约束名;
  ```

- **删除唯一约束**

  在 MySQL 中，唯一约束底层是通过唯一索引实现的，所以删除唯一约束实际上是删除对应的索引。

  ```sql
  ALTER TABLE 表名 DROP INDEX 唯一约束名;
  ```

- **删除非空约束 / 默认值**

  同样是通过修改字段属性来实现“取消”：

  ```sql
  -- 删除非空约束（即允许为 NULL）
  ALTER TABLE 表名 MODIFY 列名 数据类型 NULL;
  
  -- 删除默认值
  ALTER TABLE 表名 ALTER COLUMN 列名 DROP DEFAULT;
  ```



## 3. 修改约束 (Modify)

在标准 SQL 和 MySQL 中，**通常不能直接“修改”一个已经存在的表级约束**（比如把外键 A 指向的表换成表 B，或者把 UNIQUE 约束的范围扩大）。

**标准的修改流程是“先删后加”：**

1. 先使用 `DROP` 删除旧的约束。
2. 再使用 `ADD` 添加新的约束。

**示例：修改某列的唯一约束，使其包含另外一列（变成联合唯一约束）**

```sql
-- 1. 删除旧的单一列唯一约束
ALTER TABLE user DROP INDEX uk_username;

-- 2. 添加新的联合唯一约束
ALTER TABLE user ADD CONSTRAINT uk_username_phone UNIQUE (username, phone);
```
