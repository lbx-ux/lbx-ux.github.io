---
title: 2.Mybatis-Plus
description: MyBatisPlus（简称MP）是MyBatis的增强工具，在MyBatis基础上只做增强不做改变，核心目标是简化开发、提高效率。下面从入门到进阶详细讲解。
pubDate: 2026-08-26
series: Mybatis
order: 2
source: Java后端/SSM/Mybatis/2.mybatis-plus.md
---

MyBatis-Plus（简称 MP）是 MyBatis 的增强工具，在 MyBatis 基础上**只做增强不做改变**，核心目标是**简化开发、提高效率**。下面从入门到进阶详细讲解。

## 一、快速开始

### 1. 引入依赖

```xml
    <!-- 1. Spring Boot Web 核心依赖 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- 2. MyBatis-Plus 依赖 (注意 artifactId 的 boot3 后缀，替换掉原有的普通 mybatis) -->
    <dependency>
        <groupId>com.baomidou</groupId>
        <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
        <version>3.5.7</version>
    </dependency>

    <!-- 3. MySQL 驱动 (无需版本号，Spring Boot 3.2.10 自动管理 Jakarta 规范下的最新驱动) -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
```

### 2. 配置文件

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 开启 SQL 日志
    map-underscore-to-camel-case: true                      # 下划线转驼峰
  global-config:
    db-config:
      id-type: auto          # 主键策略：auto 表示数据库自增
      logic-delete-field: deleted  # 逻辑删除字段
      logic-delete-value: 1        # 删除标记值
      logic-not-delete-value: 0    # 未删除标记值
  mapper-locations: classpath*:/mapper/**/*.xml  # Mapper XML 位置
```

### 3. 启动类添加扫描

```java
@SpringBootApplication
@MapperScan("com.example.mapper")  // 扫描 Mapper包下的接口
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

在启动类上已经添加了 `@MapperScan("com.example.mapper")` 注解，MyBatis 会自动去扫描这个包路径下的所有接口，并将它们动态代理实例化注入到 Spring 容器中，**所以我们就不用再在mapper接口上加@Mapper注解了**，不仅mp可以这样做，mybatis也可以使用这样的方法



## 二、核心功能详解

### 1.常用注解

MyBatis-Plus 的核心魔法之一就是**通过注解来实现 Java 实体类和数据库表之间的无缝映射**。底下的这些注解都不是必须需要的,按情况使用，但建议使用前两个

**1. `@TableName` (作用于类：指定表名)**

默认情况下，MP 会将实体类的名字（驼峰命名）转成下划线作为表名去找数据库（比如 `UserInfo` 会去匹配 `user_info` 表）。但如果你的实体类名和数据库表名不一致，就需要用到它。

- **常见场景**：数据库表有统一的前缀（如 `t_user`、`sys_user`），但 Java 类不想带前缀。

```java
@TableName("sys_user") // 告诉 MP，这个 User 类对应数据库的 sys_user 表
public class User {
    // ...
}
```

**2. `@TableId` (作用于字段：指定主键)**

用于告诉框架哪个字段是主键，以及主键的值是如何生成的。

- **常用策略 (`IdType`)**：
  - `IdType.AUTO`：数据库自增（依赖 MySQL 的自增主键，我们之前在 yml 里配置过全局 auto，这里可以局部覆盖）。
  - `IdType.ASSIGN_ID`：雪花算法生成唯一 ID（**这是 MP 的默认策略**，适用于分布式系统，生成的是 19 位长的数字，数据库字段建议用 `BIGINT`）。

```java
public class User {
    @TableId(type = IdType.AUTO) // 明确指定为数据库自增
    private Long id;
}
```

**3. `@TableField` (作用于字段：普通字段映射**)

这是功能最强大、最常用的一个注解，专门用来解决 Java 字段和数据库字段“不匹配”或者“有特殊需求”的情况。

- **用法 A：字段名不一致**

  ```java
  @TableField("db_user_name") // 数据库里叫 db_user_name，Java 里叫 username
  private String username;
  ```
  
- **用法 B：排除非表字段（极常用！）**

  有时候你在实体类里写了一个字段（比如用于接收前端传来的确认密码，或者多表查询关联的额外信息），但数据库表里**压根没有这个字段**。为了防止 MP 在插入或查询时报错（Unknown column），需要把它排除掉。

  ```java
  @TableField(exist = false) // 告诉 MP：数据库里没这玩意，写 SQL 时忽略它！
  private String confirmPassword; 
  ```
  
- **用法 C：字段自动填充**

  像“创建时间 (create_time)”和“更新时间 (update_time)”这种字段，每次插入或更新都要手动 `set` 太麻烦。可以通过它来指定填充策略。

  ```java
  @TableField(fill = FieldFill.INSERT) // 仅在插入时自动填充
  private LocalDateTime createTime;
  
  @TableField(fill = FieldFill.INSERT_UPDATE) // 插入和更新时都会自动填充
  private LocalDateTime updateTime;
  ```

- 用法D:成员变量是以`isXXX`命名，按照`JavaBean`的规范，`MybatisPlus`识别字段时会把`is`去除，这就导致与数据库不符。

**4.`@TableLogic` (作用于字段：逻辑删除)**

这个就是我们刚才详细讨论过的逻辑删除标志。虽然在 `application.yml` 中配置了全局逻辑删除，但官方推荐在实体类的对应字段上也加上这个注解，能让代码的业务意图一目了然。

```java
public class User {
    @TableLogic
    private Integer deleted; // 0代表未删除，1代表已删除
}
```

**5. `@Version` (作用于字段：乐观锁)**

在高并发场景下（比如秒杀、扣减库存），为了防止多个请求同时修改同一条数据导致数据错乱，我们通常会在表里加一个 `version` 字段。加上这个注解，MP 就能帮你自动实现乐观锁的机制（更新时自动对比并累加版本号）。

```java
public class User {
    @Version
    private Integer version; // 乐观锁版本号
}
```



### 2.通用 CRUD（BaseMapper）

通用 CRUD（BaseMapper）可以说是 MyBatis-Plus 里面**最核心、最能帮你“偷懒”的底层魔法**。

简单来说，`BaseMapper<T>` 是 MyBatis-Plus 官方提供的一个 Java 泛型接口。它里面已经提前为你写好了单表操作所需的**所有**基础增删改查方法。

只要你自己的 Mapper 接口继承了它，并把实体类作为泛型 `<T>` 传进去，你的 Mapper 就瞬间拥有了这几十个超级实用的方法，**一行 SQL 和 XML 都不用写**。

怎么使用？:

就像我们之前提到的，只需要一个 `extends` 关键字：

```java
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

// 泛型传入 User，MP 就知道你要对 user 表进行 CRUD 操作了
public interface UserMapper extends BaseMapper<User> {
}
```

我们可以按照 CRUD（增删改查）把这些现成的方法分类盘点一下：

1. **C - Create（新增）**

- **`insert(T entity)`**：将实体类对象插入数据库。
  - *魔法细节*：如果你配置了主键雪花算法（`ASSIGN_ID`）或者自动填充（`fill = FieldFill.INSERT`），调用这个方法时，MP 会在底层自动帮你把这些值填好再插入。

2. **R - Read（查询）**

这是最丰富的一组方法，满足你的各种查询姿势：

- **`selectById(Serializable id)`**：根据主键 ID 查询一条数据。
- **`selectBatchIds(Collection idList)`**：根据 ID 批量查询（底层生成 `IN (id1, id2...)` 的 SQL）。
- **`selectByMap(Map columnMap)`**：根据 Map 里的字段名和值进行精准匹配查询。
- **`selectList(Wrapper queryWrapper)`**：根据条件构造器（Wrapper）查询多条数据返回 List集合。
- **`selectPage(Page page, Wrapper queryWrapper)`**：极其方便的分页查询！

3. **U - Update（更新）**

- **`updateById(T entity)`**：根据实体类里的 ID 去更新其他有值的字段。
  - *保护机制*：默认情况下，实体类里为 `null` 的字段，**不会**去覆盖数据库里的原有数据。
- **`update(T entity, Wrapper updateWrapper)`**：根据条件构造器去批量更新（比如：把所有状态为“待审核”的单子，全部更新为“已驳回”）。

4. **D - Delete（删除）**

- **`deleteById(Serializable id)`**：根据 ID 删除（如果配置了 `@TableLogic`，这里会自动变成 `UPDATE ... SET deleted = 1`）。
- **`deleteBatchIds(Collection idList)`**：根据 ID 批量删除。
- **`delete(Wrapper queryWrapper)`**：根据条件构造器删除（比如：删除所有注册时间大于 3 年且未登录过的用户）。



### 3.条件构造器（Wrapper）

条件构造器是 MyBatis-Plus 最强大的功能，它用 Java 代码替代手写 SQL 的 `WHERE` 条件。

#### 1).四大 Wrapper 类型

| 类名                     | 用途     | 特点                     |
| ------------------------ | -------- | ------------------------ |
| `QueryWrapper<T>`        | 查询条件 | 字段名用字符串           |
| `UpdateWrapper<T>`       | 更新条件 | 字段名用字符串           |
| `LambdaQueryWrapper<T>`  | 查询条件 | 字段名用方法引用（推荐） |
| `LambdaUpdateWrapper<T>` | 更新条件 | 字段名用方法引用（推荐） |

**Lambda 版本的优势**：编译时检查字段名，不会出现拼写错误。



#### 2).常用条件方法：

##### **比较运算符**

|    方法    |    说明     |       示例SQL       |
| :--------: | :---------: | :-----------------: |
|     eq     |    等于     |         =？         |
|     ne     |   不等于    |         <>?         |
|     gt     |    大于     |         >?          |
|     ge     |  大于等于   |         >=?         |
|     lt     |    小于     |         <?          |
|     le     |  小于等于   |         <=?         |
|  between   |  在...之间  |   between ? and ?   |
| notBetween | 不在...之间 | not between ? and ? |

```java
wrapper.eq(User::getId, 1);       // id = 1
wrapper.ne(User::getId, 1);       // id <> 1
wrapper.gt(User::getAge, 18);     // age > 18
wrapper.ge(User::getAge, 18);     // age >= 18
wrapper.lt(User::getAge, 18);     // age < 18
wrapper.le(User::getAge, 18);     // age <= 18
// BETWEEN
wrapper.between(User::getAge, 18, 30);    // age BETWEEN 18 AND 30
wrapper.notBetween(User::getAge, 18, 30); // age NOT BETWEEN 18 AND 30
```

##### 模糊查询

|   方法    |   说明   |      示例SQL      |
| :-------: | :------: | :---------------: |
|   like    | 模糊查询 |  LIKE '%value%'   |
|  notlike  | 模糊查询 | NOT LIKE '%value' |
| likeLeft  |  左模糊  |   LIKE '%value'   |
| likeRight |  右模糊  |   LIKE 'value%'   |

```java
wrapper.like(User::getName, "张");      // name LIKE '%张%'
wrapper.notLike(User::getName, "张");   // name NOT LIKE '%张%'
wrapper.likeLeft(User::getName, "张");  // name LIKE '%张'   （以"张"结尾）
wrapper.likeRight(User::getName, "张"); // name LIKE '张%'   （以"张"开头）
```

##### IN / NOT IN

| 方法  |  说明  |    示例SQL     |
| :---: | :----: | :------------: |
|  in   | IN查询 |   IN (?,?,?)   |
| notIn |        | NOT IN (?,?,?) |

```java
List<Long> ids = Arrays.asList(1L, 2L, 3L);
wrapper.in(User::getId, ids);           // id IN (1, 2, 3)
wrapper.notIn(User::getId, 1, 2, 3);    // id NOT IN (1, 2, 3)
```

##### NULL 判断

|   方法    |   说明   |   示例SQL   |
| :-------: | :------: | :---------: |
|  isNUll   |   null   |   IS NULL   |
| isNotNUll | not null | IS NOT NULL |

```java
wrapper.isNull(User::getDeleteTime);    // delete_time IS NULL
wrapper.isNotNull(User::getEmail);      // email IS NOT NULL
```

##### OrderBy

|    方法     |   说明   |
| :---------: | :------: |
| orderByAsc  | 升序排序 |
| orderByDesc | 降序排序 |



#### 3).AND / OR 嵌套条件

##### 默认行为（全是 AND）

```java
wrapper.eq(User::getStatus, 1)
       .gt(User::getAge, 18)
       .like(User::getName, "张");
// SQL: WHERE status = 1 AND age > 18 AND name LIKE '%张%'
```

##### 使用 or() 连接

```java
wrapper.eq(User::getStatus, 1)
       .or()
       .gt(User::getAge, 50);
// SQL: WHERE status = 1 OR age > 50
```

##### 嵌套条件（and / or 嵌套）

```java
// 需求：status = 1 并且（age < 18 或 age > 60）
wrapper.eq(User::getStatus, 1)
       .and(w -> w.lt(User::getAge, 18).or().gt(User::getAge, 60));

// SQL: WHERE status = 1 AND (age < 18 OR age > 60)
```

```java
// 需求：（name = "张三" 且 age = 20）或（name = "李四" 且 age = 25）
wrapper.and(w -> w.eq(User::getName, "张三").eq(User::getAge, 20))
       .or(w -> w.eq(User::getName, "李四").eq(User::getAge, 25));

// SQL: WHERE (name = '张三' AND age = 20) OR (name = '李四' AND age = 25)
```



#### 4).LambdaQueryWrapper

##### 基础查询

```java
@Autowired
private UserMapper userMapper;

// 查询 age = 18 的用户
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
wrapper.eq(User::getAge, 18);

List<User> list = userMapper.selectList(wrapper);
// SQL: SELECT * FROM user WHERE age = 18
```

##### 多条件组合

```java
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

wrapper.eq(User::getStatus, 1)           // status = 1
       .gt(User::getAge, 18)              // AND age > 18
       .like(User::getName, "张")          // AND name LIKE '%张%'
       .orderByDesc(User::getCreateTime);  // ORDER BY create_time DESC

List<User> list = userMapper.selectList(wrapper);
// SQL: SELECT * FROM user 
//      WHERE status = 1 AND age > 18 AND name LIKE '%张%'
//      ORDER BY create_time DESC
```

##### 动态条件

```java
// 假设这是 Controller 接收的参数
String name = request.getName();      // 可能为 null
Integer minAge = request.getMinAge(); // 可能为 null
Integer maxAge = request.getMaxAge(); // 可能为 null
Integer status = request.getStatus(); // 可能为 null

LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

// 第1个参数为 true 时才添加该条件
wrapper.like(StringUtils.hasText(name), User::getName, name)
       .ge(minAge != null, User::getAge, minAge)
       .le(maxAge != null, User::getAge, maxAge)
       .eq(status != null, User::getStatus, status);

List<User> list = userMapper.selectList(wrapper);
```

> 💡 `StringUtils.hasText()` 是 Spring 的工具方法，判断字符串非 null 且非空。

##### 只查需要的字段（拒绝 `SELECT *`）

如果一张表有 50 个字段，但你只需要查出用户的 ID 和姓名用于渲染下拉框，全查出来不仅慢，还极其浪费内存。

```java
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
// 指定只查询这两个字段
wrapper.select(User::getId, User::getName)
       .eq(User::getStatus, 1);

// 最终生成的 SQL：SELECT id, name FROM user WHERE status = 1
```



#### 5).UpdateWrapper / LambdaUpdateWrapper

##### LambdaUpdateWrapper 更新指定字段

```java
LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();

wrapper.set(User::getName, "新名字")
       .set(User::getAge, 25)
       .eq(User::getId, 1);

userMapper.update(null, wrapper);
// SQL: UPDATE user SET name = '新名字', age = 25 WHERE id = 1
```

##### 自增/自减操作

```java
// 所有 age > 18 的用户，age 字段 +1
LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
wrapper.setSql("age = age + 1").gt(User::getAge, 18);

userMapper.update(null, wrapper);
// SQL: UPDATE user SET age = age + 1 WHERE age > 18
```

##### 条件删除

```java
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
wrapper.lt(User::getCreateTime, LocalDateTime.now().minusYears(1));

userMapper.delete(wrapper);
// SQL: DELETE FROM user WHERE create_time < '2025-07-31 15:43:00'
```



### 4.Service 层封装

MP 也提供了 Service 层的通用封装：

```java
// Service 接口
public interface UserService extends IService<User> {
    // 可添加自定义业务方法
}

// Service 实现
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    // 继承后自动拥有大量通用方法
}
```

**IService 提供的方法：**

`IService` 接口可以说是 MyBatis-Plus 为开发者准备的一座“超级兵器库”。

为了和 Mapper 层的方法（`insert`, `delete`, `update`, `select`）在语义上做区分，`IService` 层的方法名统一改成了更加偏向业务逻辑的词汇：**`save` (保存)**、**`remove` (移除)**、**`update` (更新)**、**`get/list` (获取/列表)**。

相比于底层的 `BaseMapper`，`IService` 最大的杀手锏是**批量操作 (Batch)** 和 **链式编程 (Chain)**。以下为您按照功能模块梳理的核心内置方法大全：

#### 1. 新增 / 保存 (Save)

这一组方法中最具含金量的是 `saveOrUpdate`，它极其适合用于处理前端传来的表单数据。

| **方法名**                                  | **核心功能说明**                                             | **适用场景**                            |
| ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| **`save(T entity)`**                        | 插入一条记录。                                               | 常规单条新增。                          |
| **`saveBatch(Collection<T> list)`**         | **批量插入记录**。底层会对 SQL 进行优化，分批次提交，性能极高。 | 报表导入、大数据量初始化。              |
| **`saveOrUpdate(T entity)`**                | **保存或更新**。框架会自动判断：如果传入的对象没有主键 ID，则执行 `INSERT`；如果有 ID，先去查一下，存在则 `UPDATE`，不存在依然 `INSERT`。 | 表单提交（新增/编辑复用同一个接口时）。 |
| **`saveOrUpdateBatch(Collection<T> list)`** | 批量保存或更新。对一个集合里的数据自动进行区分处理。         | 批量同步第三方接口数据。                |

#### 2. 删除 / 移除 (Remove)

注意，Mapper 层叫 `delete`，在 Service 层统一叫 `remove`。

| **方法名**                                 | **核心功能说明**                             |
| ------------------------------------------ | -------------------------------------------- |
| **`removeById(Serializable id)`**          | 根据主键 ID 删除单条记录。                   |
| **`removeByIds(Collection<?> idList)`**    | 根据主键 ID 集合，**批量删除**多条记录。     |
| **`removeByMap(Map<String, Object> map)`** | 根据 Map 里的 `(字段名, 值)` 精准匹配删除。  |
| **`remove(Wrapper<T> queryWrapper)`**      | 根据你组装的 `LambdaQueryWrapper` 条件删除。 |

#### 3. 修改 (Update)

Service 层依然保留了强大的 Wrapper 更新，并补齐了批量更新的功能。

| **方法名**                                | **核心功能说明**                                             |
| ----------------------------------------- | ------------------------------------------------------------ |
| **`updateById(T entity)`**                | 根据传入实体类的 ID 更新其他有值的属性（为 null 的属性忽略）。 |
| **`update(Wrapper<T> updateWrapper)`**    | 完全根据 `LambdaUpdateWrapper` 里的 `set` 和条件进行更新。   |
| **`updateBatchById(Collection<T> list)`** | **批量更新**。根据传入的实体类集合，挨个根据其 ID 更新对应数据。 |

#### 4. 查询单条 (Get)

Mapper 的查询叫 `selectOne`，Service 层改叫 `get`。

| **方法名**                                             | **核心功能说明**                                             |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| **`getById(Serializable id)`**                         | 根据主键 ID 查询单条记录。                                   |
| **`getOne(Wrapper<T> queryWrapper)`**                  | 根据 Wrapper 条件查询单条记录。**注意**：如果查出来多条，底层会抛出异常。 |
| **`getOne(Wrapper<T> queryWrapper, boolean throwEx)`** | 和上面一样，但第二个参数如果传 `false`，当查出多条时**不抛异常**，而是默默返回第一条数据（非常实用的容错机制）。 |

#### 5. 查询多条与分页 (List & Page)

| **方法名**                                         | **核心功能说明**                                             |
| -------------------------------------------------- | ------------------------------------------------------------ |
| one()                                              | 查询单条                                                     |
| **`list()`**                                       | 查询表里的**所有**数据（极度危险，大表慎用！）。             |
| **`list(Wrapper<T> queryWrapper)`**                | 根据 Wrapper 条件查询一个 List 集合。                        |
| **`listByIds(Collection<?> idList)`**              | 根据 ID 集合批量查询（生成 `IN` 语句）。                     |
| **`count(Wrapper<T> queryWrapper)`**               | 根据条件统计数量（生成 `SELECT COUNT(*) ...` 语句）。        |
| **`page(IPage<T> page, Wrapper<T> queryWrapper)`** | **分页查询**。传入一个 Page 对象（包含当前页码和每页条数）以及查询条件，返回包含总记录数、总页数和当前页数据的复杂分页对象。 |

#### 6. 链式调用 (Chain)

在 `IService` 中，你随时可以调用以下四个方法，开启行云流水般的链式编程，这四个方法本质上是替你自动 `new` 了一个对应的 Wrapper：

| **方法名**           | **等价行为**               | **最终执行动作示例**                                 |
| -------------------- | -------------------------- | ---------------------------------------------------- |
| **`lambdaQuery()`**  | 创建 `LambdaQueryWrapper`  | `.eq(User::getId, 1).one()`                          |
| **`lambdaUpdate()`** | 创建 `LambdaUpdateWrapper` | `.set(User::getAge, 18).eq(User::getId, 1).update()` |
| **`query()`**        | 创建传统 `QueryWrapper`    | `.eq("id", 1).list()`                                |
| **`update()`**       | 创建传统 `UpdateWrapper`   | `.set("age", 18).eq("id", 1).remove()`               |

#### 7.计数（Count）

* `count()`：统计所有数量

* `count(Wrapper<T>)`：统计符合`Wrapper`条件的数据数量

> **提示：** 在 Service 实现类（`ServiceImpl` 内部）想要调用这些方法时，直接使用 `this.list()` 或 `this.save()` 即可；在 Controller 里，则通过注入的 `userService.list()` 来调用。

```java
// 批量操作
userService.saveBatch(userList);
userService.updateBatchById(userList);
userService.removeByIds(idList);

// 链式查询
List<User> list = userService.lambdaQuery()
    .gt(User::getAge, 18)
    .like(User::getName, "张")
    .list();

// 链式更新
boolean success = userService.lambdaUpdate()
    .set(User::getEmail, "new@email.com")
    .eq(User::getId, 1)
    .update();

// 单条查询
User user = userService.getById(1);

// 自定义查询
Map<String, Object> map = userService.getMap(
    new QueryWrapper<User>().select("count(*) as count").eq("age", 18)
);
```



### 5.逻辑删除

逻辑删除不是真正删除数据，而是将 `deleted` 字段标记为已删除。

**实体类配置：**
```java
@TableLogic
private Integer deleted;
```

**或在配置文件中全局配置：**
```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

**使用：**
```java
// 这行代码实际执行的是 UPDATE 而非 DELETE
userMapper.deleteById(1);
// SQL: UPDATE user SET deleted=1 WHERE id=1 AND deleted=0

// 查询会自动过滤已删除数据
userMapper.selectById(1);
// SQL: SELECT * FROM user WHERE id=1 AND deleted=0
```



### 6.自动填充

在实际开发中，我们几乎每张数据库表都会有 `create_time`（创建时间）和 `update_time`（更新时间）这两个字段。甚至还会有 `create_by`（创建人 ID）和 `update_by`（更新人 ID）。

如果每次新增或修改数据时，都要手动去 `user.setCreateTime(LocalDateTime.now())`，代码不仅极其繁琐，还特别容易忘。

MyBatis-Plus 的**自动填充（AutoFill）\**功能就是为了彻底消灭这种重复劳动的。实现它只需要极其简单的\**两步**：

**第一步：在实体类上打注解（告诉 MP 什么时候填充）**

我们需要用到 `@TableField` 注解里的 `fill` 属性，来告诉框架：这个字段到底是在**插入**时填充，还是在**更新**时填充。

```java
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import java.time.LocalDateTime;

public class User {
    
    private Long id;
    private String name;

    // 1. 插入时自动填充
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    // 2. 插入和更新时都要自动填充
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
    
}
```

**`FieldFill` 枚举值的含义：**

- `DEFAULT`：默认不处理。
- `INSERT`：只有在调用 `insert/save` 方法时，触发填充。
- `UPDATE`：只有在调用 `update` 方法时，触发填充。
- `INSERT_UPDATE`：无论是新增还是修改，都会触发填充。

**第二步：编写填充处理器（告诉 MP 填什么值）**

注解只是标记，框架还需要知道具体要往里面塞什么值。我们需要实现 MyBatis-Plus 提供的 `MetaObjectHandler` 接口，并把它交给 Spring 管理（加上 `@Component`）。

在你的项目中新建一个配置类：

```java
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component // 必须加这个注解，让 Spring 扫描到它！
public class MyMetaObjectHandler implements MetaObjectHandler {

    /**
     * 插入时的填充策略
     */
    @Override
    public void insertFill(MetaObject metaObject) {
        // 参数说明：(元对象, 实体类中的属性名, 属性的类型, 要填充的值)
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }

    /**
     * 更新时的填充策略
     */
    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
}
```



## 三、扩展功能

### 1.分页插件

在 MyBatis-Plus 中使用分页功能，可以说是真正的“开箱即用”。你不需要手动去写 `LIMIT ?, ?`，也不用为了查总条数（Total）去额外写一条 `COUNT(*)` 的 SQL。框架会在底层自动帮你拦截并生成这些语句。

实现物理分页（真正的数据库层分页，而不是查出全部数据再在内存里截取）只需要两步：**配置插件** 和 **调用方法**。



**第一步：配置分页插件（极其重要 ⚠️）**

```java
 import com.baomidou.mybatisplus.annotation.DbType;
 import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
 import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
 import org.springframework.context.annotation.Bean;
 import org.springframework.context.annotation.Configuration;
 
 @Configuration
 public class MyBatisPlusConfig {
 
     /**
      * 注册 MyBatis-Plus 的拦截器组件
      */
     @Bean
     public MybatisPlusInterceptor mybatisPlusInterceptor() {
         MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
         
         // 添加分页插件 (PaginationInnerInterceptor)
         // 强烈建议显式指定你的数据库类型，这里以 MySQL 为例
         PaginationInnerInterceptor paginationInnerInterceptor = new PaginationInnerInterceptor(DbType.MYSQL);
         
         // 设置请求的页面大于最大页后操作， true调回到首页，false 继续请求（默认 false）
         paginationInnerInterceptor.setOverflow(false);
         // 设置最大单页限制数量，默认 500 条，-1 不受限制
         paginationInnerInterceptor.setMaxLimit(500L);
         
         interceptor.addInnerInterceptor(paginationInnerInterceptor);
         return interceptor;
     }
 }
```

**第二步：在代码中使用**

#### Page

MyBatis-Plus 提供了一个 `Page` 对象来承载分页参数和返回结果。

MyBatis-Plus 的 `Page` 对象设计得非常巧妙，它的核心特点是“一物两用”**：它既作为**入参（你告诉框架你想怎么查），又作为**出参**（框架把查到的结果原封不动地塞回这个对象里）。

你可以把它理解为一个装载分页信息的“快递盒子”。以下是它最核心、最常用的几个属性（可以通过对应的 `get/set` 方法操作）：

**1. 控制查询的属性（入参）**

你在 `new Page<>(...)` 时，主要就是在这两个属性上做文章：

- **`current` (当前页码)**
  - 类型：`long`
  - 默认值：`1`
  - 作用：告诉数据库你要看第几页的数据。
- **`size` (每页条数)**
  - 类型：`long`
  - 默认值：`10`
  - 作用：告诉数据库你每一页想展示多少条记录。

**2. 承载结果的属性（出参）**

当 `userService.page(...)` 方法执行完毕后，MyBatis-Plus 会自动将查询结果填充到下面这几个属性中，你需要用 `get` 方法把它们取出来返回给前端：

- **`records` (当前页的数据列表)** 
  - 类型：`List<T>`（`T` 是你的实体类，比如 `List<User>`）
  - 作用：**最核心的数据！** 这就是当前这一页真实查出来的所有对象集合。
- **`total` (总记录数)**
  - 类型：`long`
  - 作用：满足你查询条件的数据在数据库里一共有多少条。前端经常用它来显示“共 108 条数据”。
- **`pages` (总页数)**
  - 类型：`long`
  - 作用：框架根据 `total` 和 `size` 自动计算出来的结果。比如总共 21 条数据，每页 10 条，这里的值就是 `3`。

**代码取值示例**

在实际开发中，当查询执行完后，我们通常是这样把装满数据的“快递盒子”拆开的：

```java
 // 1. 发起查询
 Page<User> pageInfo = new Page<>(2, 10); 
 List<User> pageInfo=userService.page(pageInfo, wrapper);
 
 // 2. 拆箱取值（准备组装给前端返回）
 List<User> userList = pageInfo.getRecords(); // 拿到真实数据集合
 long totalCount = pageInfo.getTotal();       // 拿到总条数
 long totalPages = pageInfo.getPages();       // 拿到总页数
boolean hasNext = pageInfo.hasNext();       // 是否有下一页
boolean hasPrev = pageInfo.hasPrevious();   // 是否有上一页
```



#### 基础分页

配置完成后，你可以直接在 `IService` 或 `BaseMapper` 中使用内置的分页方法。MyBatis-Plus 提供了一个 `Page` 对象来承载分页参数和结果。

**方式 A：通过 `IService` 调用**

如果你在 Service 层继承了 `IService<T>`，可以直接调用 `page()` 方法：

```java
// 查询第 1 页，每页 10 条
Page<User> pageParam = new Page<>(1, 10);

// 执行分页查询 (无条件)
Page<User> result = userService.page(pageParam);

//从返回结果中提取前端需要的数据！
 long total = result.getTotal();       // 总记录数 (MP 自动帮你执行了 count SQL)
 long pages = result.getPages();       // 总页数
 List<User> records = result.getRecords(); // 当前页的真实数据列表 (MP 自动执行了 limit SQL)

// 执行分页查询 (带查询条件：年龄大于 18)
Page<User> resultWithCondition = userService.page(
    pageParam, 
    Wrappers.<User>lambdaQuery().gt(User::getAge, 18)
);
```

**方式 B：通过 `BaseMapper` 调用**

如果你在 Mapper 层操作，可以使用 `selectPage()` 方法：

```java
Page<User> pageParam = new Page<>(1, 10);
QueryWrapper<User> queryWrapper = new QueryWrapper<>();
queryWrapper.eq("status", 1);
Page<User> result = userMapper.selectPage(pageParam, queryWrapper);
```



#### 复杂分页（配合 Wrapper）

实际开发中，我们通常是“带条件筛选”的分页（比如：查询状态为“正常”，年龄大于 18 岁的用户，并分页展示）。

只需要把 `Page` 对象和 `LambdaQueryWrapper` 一起传给方法即可：

```java
 // 假设前端传来：查第 2 页，每页 5 条
 Page<User> pageParam = new Page<>(2, 5);
 
 // 组装业务查询条件
 LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
 wrapper.eq(User::getStatus, 1)
        .gt(User::getAge, 18)
        .orderByDesc(User::getCreateTime);
 
 // 执行带条件的分页查询
 Page<User> resultPage = userService.page(pageParam, wrapper);
 
 // 获取当前页数据
 List<User> userList = resultPage.getRecords(); 
```



### 2.代码生成

在使用MybatisPlus以后，基础的`Mapper`、`Service`、`PO`代码相对固定，重复编写也比较麻烦。因此MybatisPlus官方提供了代码生成器根据数据库表结构生成`PO`、`Mapper`、`Service`等相关代码。只不过代码生成器同样要编码使用，也很麻烦。

`MybatisPlus`的插件，它可以基于图形化界面完成`MybatisPlus`的代码生成，非常简单。*

刚好数据库中还有一张address表尚未生成对应的实体和mapper等基础代码。我们利用插件生成一下。
首先需要配置数据库地址，在Idea顶部菜单中，找到`other`，选择`Config Database`：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-JKA6bOONLoojUGxiM11cFDtbnsc.webp)


在弹出的窗口中填写数据库连接的基本信息：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-YkWmbpgUEo5VppxeO84cFgaKn4f.webp)


点击OK保存。

然后再次点击Idea顶部菜单中的other，然后选择`Code Generator`:

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-O4UcbH58LoNOZSxE3Oycrma7n9c.webp)


在弹出的表单中填写信息：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-ZTjzb8HecoO4UjxJJ4ecYGiSnth.webp)


最终，代码自动生成到指定的位置了



### 3.JSON类型处理器

数据库的user表中有一个`info`字段，是JSON类型：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-QiwhbTqf3oLgKlx4kROckCtknOb.png)


格式像这样：

```json
{"age": 20, "intro": "佛系青年", "gender": "male"}
```

而目前`User`实体类中却是`String`类型：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-NFMFb11hEomDfRxntYycTQK1nWb.webp)

这样一来，我们要读取info中的属性时就非常不方便。如果要方便获取，info的类型最好是一个`Map`或者实体类。


而一旦我们把`info`改为`对象`类型，就需要在写入数据库时手动转为`String`，再读取数据库时，手动转换为`对象`，这会非常麻烦。

因此MybatisPlus提供了很多特殊类型字段的类型处理器，解决特殊字段类型与数据库类型转换的问题。例如处理JSON就可以使用`JacksonTypeHandler`处理器。



首先，我们定义一个单独实体类来与info字段的属性匹配：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-GRkfbTelBo8nbuxYGxrchLHKn1A.webp)


代码如下：

```java
@Data
public class UserInfo {
    private Integer age;
    private String intro;
    private String gender;
}
```



接下来，将User类的info字段修改为UserInfo类型，并声明类型处理器：

在实体类中，需要做两处关键配置：

1. 类注解 `@TableName(autoResultMap = true)`：**必须开启**，否则 MyBatis 在查询时不会自动使用 TypeHandler 进行结果映射。
2. 字段注解 `@TableField(typeHandler = JacksonTypeHandler.class)`：指定该字段使用 Jackson 处理器。

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-ZwkRbhrvnoTOVVx7JiwczpwKnyd.webp)

同时，在User类上添加一个注解，声明自动映射：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-image-4.webp)

测试可以发现，所有数据都正确封装到UserInfo当中了：

![](/covers/java-ssm-mybatis-2-mybatis-plu-rkd2wj/day01-MybatisPlus-WN0FbxJZxoBCUxxB171c02XMnKe.webp)



### 4. 排序

在 MyBatis-Plus (MP) 中，排序最常用的场景分为两种：**普通列表查询排序** 和 **分页查询排序**。

以下是具体的代码实现和使用场景：

**1. 使用 LambdaQueryWrapper 排序（最推荐）**

在日常业务开发中，强烈建议使用 `LambdaQueryWrapper`，因为它可以通过方法引用（`Entity::getProperty`）来避免手写数据库字段名导致的拼写错误。

```java
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

// 1. 单字段升序 (ORDER BY age ASC)
wrapper.orderByAsc(User::getAge);

// 2. 单字段降序 (ORDER BY create_time DESC)
wrapper.orderByDesc(User::getCreateTime);

// 3. 多字段组合排序 (ORDER BY age ASC, id DESC)
// 优先级按调用顺序决定：先按年龄升序，年龄相同的按ID降序
wrapper.orderByAsc(User::getAge)
       .orderByDesc(User::getId);

// 4. 动态条件排序 (根据前端是否传参来决定是否追加排序字段)
// boolean condition: 如果为 true 则执行排序，false 则忽略
boolean isNeedSort = true; // 模拟前端传参判断
wrapper.orderByDesc(isNeedSort, User::getCreateTime);

// 执行查询
List<User> userList = userMapper.selectList(wrapper);
```

**2. 在分页查询 (Page) 中使用排序**

当你在构建类似你那个高并发秒杀平台或本地生活探店系统时，通常需要对列表做分页。MyBatis-Plus 的 `Page` 对象本身就支持直接塞入排序规则（`OrderItem`），这样即使不写 Wrapper 也能排序。

```java
// 当前页码: 1，每页条数: 10
Page<User> page = new Page<>(1, 10);

// 添加单个排序规则：按销量(sales)降序
page.addOrder(OrderItem.desc("sales"));

// 添加多个排序规则：销量降序，相同销量的按创建时间降序
page.addOrder(
    OrderItem.desc("sales"), 
    OrderItem.desc("create_time")
);

// 执行分页查询 (如果有额外的过滤条件，可以在第二个参数传入 wrapper)
Page<User> resultPage = userMapper.selectPage(page, null);
List<User> records = resultPage.getRecords();
```

**总结建议：**

- 如果是**固定的业务排序**，直接用 `LambdaQueryWrapper`。
- 如果是**分页且前端需要灵活控制不同字段排序**，推荐在封装查询请求时，将前端的参数转换为 `OrderItem` 直接塞进 `Page` 对象中。





## 四、高级特性

### 1.多数据源

引入 `dynamic-datasource-spring-boot-starter`：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
    <version>3.6.1</version>
</dependency>
```

**配置：**
```yaml
spring:
  datasource:
    dynamic:
      primary: master  # 默认数据源
      strict: false
      datasource:
        master:
          url: jdbc:mysql://localhost:3306/db1
          username: root
          password: 123456
        slave:
          url: jdbc:mysql://localhost:3306/db2
          username: root
          password: 123456
```

**使用注解切换：**
```java
@Service
@DS("slave")  // 类级别：所有方法使用 slave 数据源
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    
    @Override
    @DS("master")  // 方法级别：覆盖类配置
    public boolean save(User user) {
        return super.save(user);
    }
}
```



### 2.自定义 SQL（与 MyBatis 兼容）

MP 完全兼容 MyBatis，你可以继续使用自定义 XML：

**Mapper 接口：**
```java
public interface UserMapper extends BaseMapper<User> {
    // 自定义方法
    List<User> selectByCustomCondition(@Param("age") Integer age);
}
```

**XML：**
```xml
<!-- resources/mapper/UserMapper.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
    
    <select id="selectByCustomCondition" resultType="com.example.entity.User">
        SELECT * FROM user 
        WHERE age > #{age}
        ORDER BY create_time DESC
    </select> 
</mapper>
```
