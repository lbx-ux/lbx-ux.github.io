---
title: 七. 多表关系
description: 一.多表关系项目开发中，在进行数据库表结构设计时，会根据业务需求及业务模块之间的关系，分析并设计表结构，由于业务之间相互关联，所以各个表结构之间也存在着各种联系，基本上分为三种：一对多(多对一),多对
pubDate: 2026-08-20
tags: [MySQL]
series: MySQL
order: 7
source: Java后端/数据库/Mysql/1. 基础/5.多表查询.md
---

# 一. 多表关系

项目开发中，在进行数据库表结构设计时，会根据业务需求及业务模块之间的关系，分析并设计表结构，由于业务之间相互关联，所以各个表结构之间也存在着各种联系，基本上分为三种：  一对多(多对一),多对多,一对一


## 1. 一对多

- 案例：部门与员工的关系

- 关系：一个部门对应多个员工，一个员工对应一个部门

- 实现：在多的一方建立外键，指向一的一方的主键



## 2. 多对多

- 案例：学生与课程的关系

- 关系：一个学生可以选修多门课程，一门课程也可以供多个学生选择

- 实现：建立第三张中间表，中间表至少包含两个外键，分别关联两方主键



## 3. 一对一

- 案例：用户与用户详情的关系

- 关系：一对一关系，多用于单表拆分，将一张表的基础字段放在一张表中，其他详情字段放在另一张表中，以提升操作效率

- 实现：在任意一方加入外键，关联另外一方的主键，并且设置外键为唯一的(UNIQUE)



# 二. 多表查询概述

## 1. 概述

多表查询就是指从多张表中查询数据。

原来查询单表数据，执行的SQL形式为：select * from 表名

那么我们要执行多表查询，就只需要使用逗号分隔多张表即可，如：select * from emp, dept

此时, 我们看到查询结果中包含了大量的结果集, 总共 102 条记录, 而这其实就是员工表 emp 所有的记录 (17) 与 部门表 dept 所有记录 (6) 的所有组合情况, 这种现象称之为笛卡尔积。接下来, 就来简单介绍下笛卡尔积。

笛卡尔积：笛卡尔乘积是指在数学中，两个集合A集合和B集合的所有组合情况。


而在多表查询中，我们是需要消除无效的笛卡尔积的，只保留两张表关联部分的数据。

在SQL语句中，如何来去除无效的笛卡尔积呢？我们可以给多表查询加上连接查询的条件即可。

```sql
select * from dept,emp where dept.id=emp.dept_id;
```

而由于id为17的员工，没有dept_id字段值，所以在多表查询时，根据连接查询的条件并没有查询到。



## 2. 分类

- 连接查询

  - 内连接：相当于查询A、B交集部分数据
  
  
    - 外连接：
  
      - 左外连接：查询左表所有数据，以及两张表交集部分数据
      - 右外连接：查询右表所有数据，以及两张表交集部分数据
  
  
    - 自连接：当前表与自身的连接查询，自连接必须使用表别名
  


- 子查询




# 三. 内连接


内连接查询的是两张表交集部分的数据

内连接的语法分为两种：隐式内连接、显式内连接。

## 1. 隐式内连接

```sql
select 字段列表 from 表1，表2 where 条件
```

## 2. 显式内连接

```sql
select 字段列表 from 表1 [inner] join 表2 on 连接条件
```



案例：

A. 查询每一个员工的姓名，及关联的部门的名称（隐式内连接实现）

```sql
select emp.name,dept.name from emp,dept where emp.dept_id=dept.id;
```

优解：为每一张表起别名，简化SQL编写

```sql
select e.name,d.name from emp e,dept d where e.dept_id=d.id;
```



B．查询每一个员工的姓名，及关联的部门的名称（显式内连接实现）

```sql
 select e.name, d.name from emp e inner join dept d on e.dept_id = d.id;
```



**表的别名**：

①. tablea as 别名1, tableb as 别名2;

②. tablea 别名1，tableb 别名2；

注意事项：

一旦为表起了别名，就不能再使用表名来指定对应的字段了，此时只能够使用别名来指定字段。



# 四. 外连接


外连接分为两种，分别是：左外连接和右外连接。具体的语法结构为：

## 1. 左外连接

左外连接相当于查询表1(左表)的所有数据，当然也包含表1和表2交集部分的数据。

```sql
select 字段列表 from 表1 left [outer] join 表2 on 条件
```

## 2. 右外连接

右外连接相当于查询表2 (右表) 的所有数据, 当然也包含表1和表2交集部分的数据。

```sql
select 字段列表 from 表1 right [outer] join 表2 on 条件
```



案例：

A. 查询emp表的所有数据，和对应的部门信息

由于需求中提到，要查询emp的所有数据，所以是不能内连接查询的，需要考虑使用外连接查询。

```sql
select emp.*,dept.name from emp left outer join dept on emp.dept_id = dept.id;
```

B. 查询dept表的所有数据, 和对应的员工信息 (右外连接)

由于需求中提到，要查询dept表的所有数据，所以是不能内连接查询的，需要考虑使用外连接查询。

```sql
select emp.*,dept.* from emp right outer join dept on emp.dept_id = dept.id;
```

注意事项：

左外连接和右外连接是可以相互替换的，只需要调整在连接查询时SQL中，表结构的先后顺序就可以了。而我们在日常开发使用时，更偏向于左外连接。



# 五. 自连接

自连接查询，顾名思义，就是自己连接自己，也就是把一张表连接查询多次，而对于自连接查询，可以是内连接查询，也可以是外连接查询。

```sql
select 字段列表 from 表1 别名1 [left/right] join 表2 别名2 on 条件;
```

注意事项：

在自连接查询中，必须要为表起别名，要不然我们不清楚所指定的条件、返回的字段，到底是哪一张表的字段。



案例：

A. 查询员工 及其 所属领导的名字

```sql
1 select a.name, b.name from emp a, emp b where a.managerid = b.id;
```

B. 查询所有员工 emp 及其领导的名字 emp，如果员工没有领导，也需要查询出来

```SQL
select e1.name as '员工',e2.name as '领导' from emp e1 left join emp e2 on e1.managerid=e2.id;
```



# 六. 联合查询

对于union查询，就是把多次查询的结果合并起来，形成一个新的查询结果集。

```sql
select 字段列表 from 表1
union [all]
select 字段列表 from 表2
```

- 对于联合查询的多张表的列数必须保持一致，字段类型也需要保持一致。

- union all 会将全部的数据直接合并在一起，union 会对合并之后的数据去重。



# 七. 子查询

## 1. 概念

SQL语句中嵌套select语句，称为嵌套查询，又称子查询。

```sql
select 字段列表 from 表1 where 条件=(select 字段列表 from 表2 where 条件)
```

子查询外部的语句可以是增删改查的任何一个

## 2. 分类

根据子查询结果不同，分为：

- 标量子查询 (子查询结果为单个值)


- 列子查询 (子查询结果为一列)


- 行子查询 (子查询结果为一行)


- 表子查询 (子查询结果为多行多列)


根据子查询位置，分为：

- where之后
- from之后
- select之后




## 3. 标量子查询

是单个值（数字、字符串、日期等），最简单的形式，这种子查询称为标量子查询。

常用的操作符 **= <> > >= < <=**



A. 查询 "销售部" 的所有员工信息

完成这个需求时，我们可以将需求分解为两步：

(1) 查询 "销售部" 部门ID

```sql
select id from dept where name='销售部';
```

(2) 根据 "销售部" 部门ID，查询员工信息

```sql
select * from emp where dept_id=(select id from dept where name='销售部');
```



 B. 查询在 "方东白" 入职之后的员工信息

完成这个需求时，我们可以将需求分解为两步：

(1) 查询 方东白 的入职日期

```sql
select entrydate from emp where name='方东白'
```

(2) 查询指定入职日期之后入职的员工信息

```sql
select * from emp where entrydate>(select entrydate from emp where name='方东白');
```



## 4. 列子查询

子查询返回的结果是一列（可以是多行），这种子查询称为列子查询。

常用的操作符

| 操作符 |                  描述                  |
| :----: | :------------------------------------: |
|   in   |      在指定的集合范围之内，多选一      |
| not in |         不在指定的集合范围之内         |
|  any   |  子查询返回列表中，有任意一个满足即可  |
|  some  | 与any等同，使用some的地方都可以使用any |
|  all   |    子查询返回列表的所有值都必须满足    |



案例：

A. 查询 "销售部" 和 "市场部" 的所有员工信息

分解为以下两步：

(1) 查询 "销售部" 和 "市场部" 的部门ID

```sql
select id from dept where name='销售部'||name='市场部'
```

(2) 根据部门ID，查询员工信息

```sql
select * from emp where dept_id in(select id from dept where name='销售部'||name='市场部');
```



B. 查询比 财务部 所有人工资都高的员工信息

分解为以下两步：

(1) 查询所有 财务部 人员工资

```sql
select salary from emp where dept_id='3'
```

(2) 比 财务部 所有人工资都高的员工信息

```sql
select * from emp where salary>all(select salary from emp where dept_id='3');
```



## 5. 行子查询

子查询返回的结果是一行（可以是多列），这种子查询称为行子查询。

常用的操作符：=、<>,in ,not in



案例：

A. 查询与 "张无忌" 的薪资及直属领导相同的员工信息；

这个需求同样可以拆解为两步进行：

(1) 查询 "张无忌" 的薪资及直属领导

```sql
select salary,managerid from emp where name='张无忌'
```

(2) 查询与 "张无忌" 的薪资及直属领导相同的员工信息；

```sql
select * from emp where (salary,managerid)=(select salary,managerid from emp where name='张无忌');
```



## 6. 表子查询

子查询返回的结果是多行多列，这种子查询称为表子查询。

常用的操作符：in

案例：

A. 查询与 "鹿杖客", "宋远桥" 的职位和薪资相同的员工信息

分解为两步执行：

(1) 查询 "鹿杖客", "宋远桥" 的职位和薪资

```sql
select job, salary from emp where name = '鹿杖客' or name = '宋远桥'
```

(2) 查询与 "鹿杖客", "宋远桥" 的职位和薪资相同的员工信息

```sql
select * from emp where (job, salary) in (select job, salary from emp where name = '鹿杖客' or name = '宋远桥');
```



B. 查询入职日期是 "2006- 01- 01" 之后的员工信息, 及其部门信息

分解为两步执行：

(1) 入职日期是 "2006-01-01" 之后的员工信息

```sql
select * from emp where entrydate > '2006-01-01';
```

(2) 查询这部分员工, 对应的部门信息;

```sql
select e.*, d.* from (select * from emp where entrydate > '2006-01-01') e left join dept d on e.dept_id = d.id;
```
