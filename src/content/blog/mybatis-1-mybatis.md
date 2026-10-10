---
title: 1.Mybatis
description: MyBatis是一款优秀的持久层框架，用于简化JDBC的开发
pubDate: 2026-10-10
series: Mybatis
order: 1
source: Mybatis/1.Mybatis
---

## 一.介绍

MyBatis是一款优秀的 **持久层框架**，用于简化JDBC的开发

* 持久层：指的是就是数据访问层(dao)，是用来操作数据库的

* 框架：是一个半成品软件，是一套可重用的、通用的、软件基础代码模型。在框架的基础上进行软件开发更加高效、规范、通用、可拓展。

通过Mybatis就可以大大简化原生的JDBC程序的代码编写，比如 通过 `select * from user` 查询所有的用户数据，通过JDBC程序操作呢，需要大量的代码实现，而如果通过Mybatis实现相同的功能，只需要简单的三四行就可以搞定。

* 数据库连接四要素(驱动、链接、用户名、密码)，都配置在springboot默认的配置文件 application.yml中
* 查询结果的解析及封装，由mybatis自动完成映射封装，我们无需关注
* 在mybatis中使用了数据库连接池技术，从而避免了频繁的创建连接、销毁连接而带来的资源浪费。



## 二.Mybatis核心配置文件

application.xml 

```yml
spring:
  application:
    name: Mybatistest 
  datasource:
    url: jdbc:mysql://localhost:3306/fjq 
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: fan810523

mybatis:
  mapper-locations: classpath:mapper/*.xml
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    map-underscore-to-camel-case: true
```

**1.指定mapper.xml文件的位置**

**文件夹结构：** `src/main/resources/mapper/TaskMapper.xml`

**YAML 配置：** `mapper-locations: classpath:mapper/*.xml`

```yml
mybatis.mapper-locations: classpath:.mapper/*.xml
```

- `classpath:`代表**类路径根**，对应你项目里的`src/main/resources/`目录
- `mapper/*.xml`代表匹配`resources/mapper`目录下所有后缀为`.xml`的Mapper文件



**2.配置Mybatis日志输出**

默认情况下，在Mybatis中，SQL语句执行时，我们并看不到SQL语句的执行日志。 在`application.properties`加入如下配置，即可查看日志：

```yml
mybatis.configuration.log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

打开上述开关之后，再次运行单元测试，就可以看到控制台输出的SQL语句是什么样子的。



**3.驼峰映射**

```yml
mybatis.configuration.map-underscore-to-camel-case: true
```

作用：自动完成**数据库下划线命名字段**转化为**Java实体类驼峰命名属性**的映射

开启这个配置后，MyBatis会自动赋值，不需要你手动写<resultMap>声明映射关系



**4.xml文件配置**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<!-- 注意：namespace必须和你的Mapper接口全类名完全一致 -->
<mapper namespace="com.fjq.mapper.EmpExprMapper">
</mapper>
```



**5.简化resultType**

**resultType **  的核心作用是告诉 MyBatis：把从数据库查出来的数据，打包（封装）成什么类型的 Java 对象返回给你。

```yml
mybatis:
  mapper-locations: classpath:mapper/*.xml
  # 就是这一行，指定你的实体类（POJO/Entity）所在的包名
  type-aliases-package: com.example.mybatistest.pojo 
```

假设你在 `com.example.mybatistest.pojo` 包下面有一个实体类叫 `User`。

**❌ 没有配置这个属性之前（痛苦的原始写法）：** 你在写 XML 时，只要涉及到返回值类型或者参数类型，都必须把**全限定类名**一字不落地敲上去。如果包名很长，不仅写着累，还容易拼写错误。

```xml
<select id="selectById" resultType="com.example.mybatistest.pojo.User">
    SELECT * FROM user WHERE id = #{id}
</select>
```

**✅ 配置了这个属性之后（清爽的现代写法）：** MyBatis 在项目启动时，会自动去扫描 `com.example.mybatistest.pojo` 这个包底下的所有 Java 类，并把它们的**类名**注册为别名。 此时，你在 XML 里只需要直接写类名即可！

```xml
<select id="selectById" resultType="User">
    SELECT * FROM user WHERE id = #{id}
</select>
```

**💡 你必须知道的 3 个底层细节**

1. **大小写不敏感（但建议规范）：** 配置了包扫描后，MyBatis 注册的别名默认是**不区分大小写**的。也就是说，你在 XML 里写 `resultType="user"`、`resultType="User"` 甚至 `resultType="UsEr"`，MyBatis 都能认得出来。但是，为了代码可读性，**强烈建议首字母大写**，与你的 Java 类名保持完全一致。

2. **会自动向下扫描子包：** 假如你的 `pojo` 包下面还有子包，比如 `com.example.mybatistest.pojo.system.Role`，MyBatis 依然能扫到它，你在 XML 里依然可以直接写 `resultType="Role"`。

3. **同名类的终极冲突解决（`@Alias` 注解）：** 这是一个经典的面试题/踩坑点。既然它会自动扫子包，如果你的项目很大，在 `pojo` 包下有两个名字完全一样的类怎么办？ 例如：`pojo.admin.User` 和 `pojo.client.User`。 这时候 MyBatis 在启动时会直接报错，因为它不知道 XML 里的 `User` 到底指代哪一个。 **解决办法：** 使用 `@Alias` 注解，直接在实体类上强行指定一个专属别名。

   ```java
   package com.example.mybatistest.pojo.admin;
   import org.apache.ibatis.type.Alias;
   
   @Alias("AdminUser") // 强行指定别名为 AdminUser
   public class User { ... }
   ```

   然后你在 XML 里写 `resultType="AdminUser"` 就可以完美区分了。



## 三.注解

其直接把SQL语句使用注解的方式写在了对应的方法上面

```java
@Mapper
public interface userMapper{
    
	@Select("select * from user")
	public List<User> findAll();
    
}
```



## 四.XML映射

1.**创建user表，添加数据**

```sql
create table user(
    id int unsigned primary key auto_increment comment 'ID,主键',
    username varchar(20) comment '用户名',
    password varchar(32) comment '密码',
    name varchar(10) comment '姓名',
    age tinyint unsigned comment '年龄'
) comment '用户表';

insert into user(id, username, password, name, age) values (1, 'daqiao', '123456', '大乔', 22),
                                                           (2, 'xiaoqiao', '123456', '小乔', 18),
                                                           (3, 'diaochan', '123456', '貂蝉', 24),
                                                           (4, 'lvbu', '123456', '吕布', 28),
                                                           (5, 'zhaoyun', '12345678', '赵云', 27);
```

2.**创建项目，导入依赖**

- MyBatis Spring Boot Starter（MyBatis起步依赖）
- MySQL JDBC Driver（MySQL驱动）
- Lombok（简化实体类代码）

3.**配置数据库+MyBatis基础信息**

在`application.yml`中写连接信息和MyBatis配置

```yml
spring:
  application:
    name: Mybatistest 这个是当前项目的名字
  datasource:
    url: jdbc:mysql://localhost:3306/fjq  连接的数据库
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: fan810523

mybatis:
  # 👇 这一行是必须补充的：指定Mapper XML文件的位置
  mapper-locations: classpath:mapper/*.xml
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    map-underscore-to-camel-case: true
```

4.**创建实体类（pojo)**

```java
@Data // 自动生成getter/setter/toString等
@NoArgsConstructor // 自动生成无参构造（MyBatis反射需要）
@AllArgsConstructor // 自动生成全参构造
public class User {
    private Integer id;
    private String username;
    private String password;
    private String name;
    private Integer age;
}
```

5.**创建mapper接口**

```java
@Mapper // 标识这是MyBatis的Mapper接口，让Spring能扫描到
// 如果不想每个接口加@Mapper，可以在SpringBoot启动类上加 @MapperScan("com.example.mybatistest.mapper") 批量扫描
public interface UserMapper {
    // 查询所有用户
    List<User> selectAllUser();
    // 根据id查询用户
    User selectById(@Param("id") Integer id);
    // 新增用户
    int insertUser(User user);
    // 删除用户
    int deleteById(Integer id);
}
```

6.**创建Mapper XML映射文件（写SQL）**

在`resources`目录下新建`mapper`文件夹，新建`UserMapper.xml`，对应上面的`UserMapper`接口编写SQL：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<!-- 注意：namespace必须和你的Mapper接口全类名完全一致 -->
<mapper namespace="com.example.mybatistest.mapper.UserMapper">
    <!-- id必须和接口中定义的方法名完全一致 -->
    <select id="selectAllUser" resultType="com.example.mybatistest.pojo.User">
        SELECT * FROM user
    </select>

    <select id="selectById" resultType="User">
        SELECT * FROM user WHERE id = #{id}
    </select>

    <insert id="insertUser">
        INSERT INTO user(user_name, age) VALUES(#{userName}, #{age})
    </insert>

    <delete id="deleteById">
        DELETE FROM user WHERE id = #{id}
    </delete>
</mapper>
```

**resultType **  的核心作用是告诉 MyBatis：把从数据库查出来的数据，打包（封装）成什么类型的 Java 对象返回给你。

项目结构

<img src="/covers/mybatis-1-mybatis/image-20260313115923687.webp" alt="image-20260313115923687" style="zoom:50%;" />



## 五.获取参数值

| 符号 | 说明                                              | 场景                       | 优缺点              |
| ---- | ------------------------------------------------- | -------------------------- | ------------------- |
| #{ } | 占位符。执行时，会将#(.)替换为？，生成预编译SQL   | 参数值传递                 | 安全、性能高 (推荐) |
| ${ } | 拼接符。直接将参数拼接在SQ语句中，存在SQL注入问题 | 表名、字段名动态设置时使用 | 不安全、性能低      |

#{}会自动的加上  ' '



## 六.特殊 SQL 的执行

### 1.模糊查询

方式一：${}拼接（有SQL注入风险）

```sql
select * from t_user where username like '%${mohu}%'
```

方式二：concat函数

```sql
select * from t_user where username like concat('%', #{mohu}, '%')
```

### 2.批量删除

```xml
<delete id="batchDelete">
    DELETE FROM task_record WHERE id IN
    <foreach collection="idList" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</delete>
```



### 3.动态设置表名

在绝大多数情况下，一个实体类（比如 `User`）就固定对应一张表（`user`）。但是，有些表的数据量增长极其恐怖，比如**系统操作日志**、**用户的打卡记录**或者**支付流水**。 如果把所有数据都塞在一张表里，千万级数据会导致查询极其缓慢。这时候，架构师通常会采用“按月分表”**或**“按年分表”的策略：

- `task_record_2026_05` (5月的任务)
- `task_record_2026_06` (6月的任务)

这时候，我们在写代码时就不能把表名写死了，必须动态传入。

由于`#{}` 无法用于表名，因为加上单引号会报错。动态表名**只能且必须**使用 `${}`。

**第一步：Java 接口传参** 我们需要把表名作为一个普通的参数传给 Mapper：

```java
@Mapper
public interface TaskMapper {
    // 传入动态表名和其他查询条件
    List<TaskRecord> getTasksByMonth(@Param("tableName") String tableName, @Param("userId") Integer userId);
}
```

**第二步：XML 中使用 `${}` 拼接**

```xml
<select id="getTasksByMonth">
    SELECT * FROM ${tableName}
    WHERE user_id = #{userId}
</select>
```

**⚠️ 极其重要的安全护城河（防 SQL 注入）** 既然用了 `${}`，后端开发人员**绝对不能直接把前端传过来的字符串当成表名**！你必须在 Service 层做严格的**白名单校验**或**后端内部生成**。

```java
// Service 层的正确写法演示：
public List<TaskRecord> getTasks(String month, Integer userId) {
    // 1. 绝对不信任前端，后端自己正则校验 month 格式是否为 "2026_06"
    if (!month.matches("^\\d{4}_\\d{2}$")) {
        throw new IllegalArgumentException("月份格式错误");
    }
    
    // 2. 后端自己拼凑出最终的安全表名
    String safeTableName = "task_record_" + month; 
    
    // 3. 再传给 Mapper 执行
    return taskMapper.getTasksByMonth(safeTableName, userId);
}
```



## 七.动态SQL

### 1.where.if

```xml
<mapper namespace="com.itheima.mapper.EmpMapper">
<select id="list" resultType="com.itheima.pojo.Emp">
select e.*, d.name deptName from emp as e left join dept as d on e.dept_id = d.id
<where>
 <if test="name != null and name != ''">
      e.name like concat('%',#{name},'%')
  </if>
   <if test="gender != null">
         and e.gender = #{gender}
     </if>
     <if test="begin != null and end != null">
         and e.entry_date between #{begin} and #{end}
     </if>
  </where>
</select>
</mapper>
```

`<if>`：判断条件是否成立，如果条件为true，则拼接SQL。

`<where>`：根据查询条件，来生成where关键字，并会自动去除条件前面多余的and或or。



### 2.foreach

```xml
<mapper namespace="com.fjq.mapper.EmpExprMapper">

    <insert id="insertbatch">
    insert into emp_expr(emp_id,begin,end,company,job) values
    <foreach collection="exprList"  item="expr" separator=",">
        (#{expr.empId},#{expr.begin},#{expr.end},#{expr.company},#{expr.job})
    </foreach>
    </insert>
</mapper>
```

这里用到Mybatis中的动态SQL里提供的 `<foreach>` 标签，改标签的作用，是用来遍历循环，常见的属性说明：

- collection:集合名称
- item:集合遍历出来的元素
- separator:每一次遍历使用的分隔符
- open:遍历开始前拼接的片段
- close:遍历开始后拼接的片段

上述的属性，是可选的，并不是所有的都是必须的。 可以自己根据实际需求，来指定对应的属性。



### 3.set

```xml
<update id="updateById">
    update emp
    <set>
        <if test="username != null and username != ''">username = #{username},</if>
        <if test="password != null and password != ''">password = #{password},</if>
        <if test="name != null and name != ''">name = #{name},</if>
        <if test="gender != null">gender = #{gender},</if>
        <if test="phone != null and phone != ''">phone = #{phone},</if>
        <if test="job != null">job = #{job},</if>
        <if test="salary != null">salary = #{salary},</if>
        <if test="image != null and image != ''">image = #{image},</if>
        <if test="entryDate != null">entry_date = #{entryDate},</if>
        <if test="deptId != null">dept_id = #{deptId},</if>
        <if test="updateTime != null">update_time = #{updateTime},</if>
    </set>
    where id = #{id}
</update>
```





## 八.使用技巧

### 1.主键返回

`@Options(useGeneratedKeys = true, keyProperty = "id")`

使用场景：假设你的 MySQL 数据库中有一张 `user` 表，其主键 `id` 是自增（AUTO_INCREMENT）的。 当你在 Java 代码中创建一个 `User` 对象准备插入数据库时，此时它的 `id` 是 `null`。但很多时候，执行完插入操作后，你需要立刻拿到这个刚刚生成的新 ID，去进行下一步的业务（比如往另一张关联表里插入数据）。常配合INSERT操作一起用

```java
@Mapper
public interface UserMapper {

    @Insert("INSERT INTO user (username, age) VALUES (#{username}, #{age})")
    // 核心在这里：执行完上面的 Insert 后，把生成的 ID 塞回参数 user 对象的 id 属性里
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertUser(User user);
    
}
```

```java
// xml映射写法
<insert id="insertUser" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO user (username, age) 
    VALUES (#{username}, #{age})
</insert>
```



### 2.分页查询

1）**引入依赖**

```xml
<!--分页插件PageHelper-->
<dependency>
<groupId>com.github.pagehelper</groupId>
<artifactId>pagehelper-spring-boot-starter</artifactId>
<version>1.4.7</version>
</dependency>
```

2）**在application.yml添加配置**

直接在配置文件的最外面写上就行

```yml
pagehelper:
  helper-dialect: mysql
  reasonable: true
  page-size-zero: false
  support-methods-arguments: true
  
pagehelper:
  helper-dialect: mysql # 告诉插件你的底层是 MySQL，它才知道用 LIMIT 语法
  reasonable: true      # 开启分页合理化：如果查第 0 页，会自动变成第 1 页；如果查的页数超过总页数，会自动查最后一页。极大地防止了前端传错参数导致的报错。
  page-size-zero: false  当pageSize（每页条数）被设置为 0 时，是否查询全部数据
  support-methods-arguments: true  支持通过Mapper接口参数传递分页参数
```

**3）设计DTO类**

根据请求参数进行封装，在sky-pojo-dto模块中

```java
package com.sky.dto;
import lombok.Data;
import java.io.Serializable;
@Data
public class EmployeePageQueryDTO implements Serializable {

    //员工姓名
    private String name;

    //页码
    private int page;

    //每页显示记录数
    private int pageSize;

}

```

**4）封装PageResult**

所有的分页查询，统一都封装为PageResult对象。

在sky-common-result模块

```java
package com.sky.result;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * 封装分页查询结果
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResult implements Serializable {

    private long total; //总记录数

    private List records; //当前页数据集合

}

```

**5）Controller层**

在sky-server模块中，com.sky.controller.admin.EmployeeController中添加分页查询方法。

```java
    @GetMapping("/page")
    public Result<PageResult> page(EmployeePageQueryDTO employeePageQueryDTO){
        log.info("员工分页查询，参数为：{}", employeePageQueryDTO);
        PageResult pageResult = employeeService.pageQuery(employeePageQueryDTO);
        return Result.success(pageResult);
    }
```

**6）Service层接口**

在EmployeeService接口中声明pageQuery方法：

```java
PageResult pageQuery(EmployeePageQueryDTO employeePageQueryDTO);
```

**7）Service层实现类**

在EmployeeServiceImpl中实现pageQuery方法：

```java
public PageResult pageQuery(EmployeePageQueryDTO employeePageQueryDTO) {
    //1. 设置分页参数
    PageHelper.startPage(employeePageQueryDTO.getPage(), employeePageQueryDTO.getPageSize());
    //2. 执行查询
    List<Employee> employeeList = employeeMapper.pageQuery(employeePageQueryDTO);
    Page<Employee> p = (Page<Employee>) employeeList;//强转一下
    //3. 封装结果
    return new PageResult(p.getTotal(), employeeList);
    //或者是
    return new PageResult(p.getTotal(),p.getResult());
}
```

**注意：**此处使用 mybatis 的分页插件 PageHelper 来简化分页代码的开发。底层基于 mybatis 的拦截器实现。

**8）Mapper层**

在 EmployeeMapper 中声明 pageQuery 方法：

```java
Page<Employee> pageQuery(EmployeePageQueryDTO employeePageQueryDTO);
```

在 src/main/resources/mapper/EmployeeMapper.xml 中编写SQL：

```sql
<select id="pageQuery" resultType="com.sky.entity.Employee">
        select * from employee
        <where>
            <if test="name != null and name != ''">
                and name like concat('%',#{name},'%')
            </if>
        </where>
        order by create_time desc
</select>
```

**实现机制**

我们打开Idea的控制台，可以看到在进行分页查询时，输出的SQL语句。

![image-20260323111258863](/covers/mybatis-1-mybatis/image-20260323111258863.png)

我们看到执行了两条SQL语句，而这两条SQL语句，其实是从我们在Mapper接口中定义的SQL演变而来的。

* 第一条SQL语句，用来查询总记录数。

其实就是将我们编写的SQL语句进行的改造增强，将查询返回的字段列表替换成了 `count(0)` 来统计总记录数。

* 第二条SQL语句，用来进行分页查询，查询指定页码对应 的数据列表。

其实就是将我们编写的SQL语句进行的改造增强，在SQL语句之后拼接上了limit进行分页查询，而由于测试时查询的是第一页，起始索引是0，所以简写为limit ？

而PageHelper在进行分页查询时，会执行上述两条SQL语句，并将查询到的总记录数，与数据列表封装到了 `Page<Emp>` 对象中，我们再获取查询结果时，只需要调用Page对象的方法就可以获取。



### 3.@Param

**只要参数大于等于两个，或者用到了动态标签（`<if>`、`<foreach>`），一律在参数前敲上 `@Param`**

在 MyBatis 中，`@Param` 注解的核心作用是**给 Mapper 接口中的方法参数命名**，以便在对应的 SQL 语句（通常是 XML 文件或注解 SQL）中能够通过明确的名称来引用这些参数（即使用 `#{name}`）。

使用：

- **有多个参数时（最常见）：** 当方法有多个参数，MyBatis 默认无法通过名称识别它们（早期 Java 版本编译后会丢失参数名），必须用 `@Param` 显式指定。
- **在动态 SQL 中使用基本类型：** 如果你在 `<if test="...">` 等动态 SQL 标签中需要判断参数，即使只有一个基本类型（如 `String` 或 `int`）的参数，也强烈建议加上 `@Param`。
- **传递集合或数组时：** 给 `List` 或数组命名，方便在 `<foreach>` 标签的 `collection` 属性中引用。

**常见使用场景与代码示例**

场景一：传递多个基本参数

当方法需要传入用户名和密码两个独立的参数时。

```java
public interface UserMapper {
    // 使用 @Param 指定参数名为 "username" 和 "password"
    User login(@Param("username") String username, @Param("password") String password);
}
```

```xml
<select id="login" resultType="User">
    SELECT * FROM users 
    WHERE username = #{username} AND password = #{password}
</select>
```



场景二：混合传递对象和基本类型参数

有时候你需要同时传递一个分页/状态参数和一个复杂的实体类对象。

```java
public interface UserMapper {
    List<User> searchUsers(@Param("status") int status, @Param("user") User user);
}
```

```xml
<select id="searchUsers" resultType="User">
    SELECT * FROM users 
    WHERE status = #{status} 
    AND age > #{user.age} 
    AND role = #{user.role}
</select>
```



场景三：传递集合（List / Array）进行 IN 查询

当需要根据一个 ID 列表查询多条数据时。

```java
public interface UserMapper {
    List<User> selectByIds(@Param("userIds") List<Integer> userIds);
}
```

```xml
<select id="selectByIds" resultType="User">
    SELECT * FROM users WHERE id IN
    <foreach item="id" collection="userIds" open="(" separator="," close=")">
        #{id}
    </foreach>
</select>
```



场景四：单参数但需要用到动态 SQL (`<if>`)

即使只有一个参数，只要你在 XML 里用了 `<if test="...">` 进行判断，就强烈建议加上 `@Param`。

```java
// 虽然只有一个参数，但为了给动态 SQL 使用，依然加上注解
List<TaskRecord> searchTask(@Param("keyword") String keyword);
```

```xml
<select id="searchTask" resultType="TaskRecord">
    SELECT * FROM task_record
    <where>
        <if test="keyword != null and keyword != ''">
            task_name LIKE CONCAT('%', #{keyword}, '%')
        </if>
    </where>
</select>
```



### **4.resultMap**

之前我们写 `<select>` 查询时，用的都是 `resultType="User"`。那是 MyBatis 在“偷懒”，它假设你的数据库列名和 Java 实体类的属性名长得一模一样（或者符合驼峰命名），所以它能自动帮你把数据对号入座。

但是，现实中的企业业务往往非常复杂。`ResultMap` 就是用来应对那些“MyBatis 无法自动对号入座”的复杂场景的。

在实际开发中，我们使用 `ResultMap` 主要是为了解决 **3 种痛点**。我们以你熟悉的“用户与任务”为例，从简到难为你拆解：

---

**场景一：字段名与属性名彻底对不上（基础用法）**

虽然你在 `application.yml` 里开启了驼峰命名（`user_name` 自动转 `userName`），但如果老的数据库设计非常不规范，导致名字彻底不一样怎么办？

* 数据库字段：`emp_id`，`emp_name`
* Java 实体类：`userId`，`username`

这个时候，`resultType` 就彻底失效了，查出来的值全是 `null`。你必须自己写一个 `<resultMap>` 充当“翻译官”。

```xml
<resultMap id="userMap" type="User">
    <id column="emp_id" property="userId" />
    <result column="emp_name" property="username" />
</resultMap>

<select id="getUserById" resultMap="userMap">
    SELECT emp_id, emp_name FROM user WHERE emp_id = #{id}
</select>
```

**`<id>` 标签：专门用来映射数据库的表主键（Primary Key）。** MyBatis 在底层处理数据缓存和嵌套结果（比如你截图里的 `<association>`）时，会依赖 `<id>` 标记的主键来唯一标识和比较对象，这能大幅提升性能。

**`<result>` 标签：用来映射数据库的普通列。**

---


**场景二：一对一复杂嵌套关联 (`<association>`)**

假设你的需求是：“查询一个任务详情，并且要**顺带查出**创建这个任务的那个人的全部信息”。

**Java 实体类设计：**
在面向对象的思维里，任务（Task）里面应该包含一个用户（User）对象。

```java
public class TaskRecord {
    private Integer taskId;
    private String taskName;
    // 重点：任务里嵌了一个完整的 User 对象
    private User creator; 
}

```

如果你用原生 SQL 写连表查询：
`SELECT t.task_id, t.task_name, u.user_id, u.username FROM task_record t JOIN user u ON t.user_id = u.user_id`

查出来的结果是一张扁平的表，MyBatis 的 `resultType` 根本不知道怎么把 `u.user_id` 塞进 `creator` 这个嵌套对象里。这时候必须上 `ResultMap`！

```xml
<resultMap id="taskWithUserMap" type="TaskRecord">
    <id column="task_id" property="taskId"/>
    <result column="task_name" property="taskName"/>
    
    <association property="creator" javaType="User">
        <id column="user_id" property="userId"/>
        <result column="username" property="username"/>
    </association>
</resultMap>

<select id="getTaskDetail" resultMap="taskWithUserMap">
    SELECT t.task_id, t.task_name, u.user_id, u.username 
    FROM task_record t 
    LEFT JOIN user u ON t.user_id = u.user_id
    WHERE t.task_id = #{id}
</select>

```

---

**场景三：一对多集合关联 (`<collection>`) —— 终极难点**

反过来，现在的需求变成了：“查询一个用户的信息，同时查出他名下的**所有历史打卡任务**”。

**Java 实体类设计：**
用户（User）里面应该包含一个任务的列表（List）。

```java
public class User {
    private Integer userId;
    private String username;
    // 重点：一个人对应多个任务，这是一个 List 集合
    private List<TaskRecord> tasks; 
}

```

这时候查出来的数据，往往是多行数据对应同一个用户。MyBatis 怎么把这多行数据折叠进一个 `List` 里呢？

```xml
<resultMap id="userWithTasksMap" type="User">
    <id column="user_id" property="userId"/>
    <result column="username" property="username"/>
    
    <collection property="tasks" ofType="TaskRecord">
        <id column="task_id" property="taskId"/>
        <result column="task_name" property="taskName"/>
    </collection>
</resultMap>

<select id="getUserWithTasks" resultMap="userWithTasksMap">
    SELECT u.user_id, u.username, t.task_id, t.task_name
    FROM user u
    LEFT JOIN task_record t ON u.user_id = t.user_id
    WHERE u.user_id = #{id}
</select>

```

---

**💡 面试/实战避坑口诀**

* **一对一（对象）：** 用 `<association>`，属性填 **`javaType`**（Java 的具体类型）。
* **一对多（列表）：** 用 `<collection>`，属性填 **`ofType`**（List 里面的泛型类型）。
