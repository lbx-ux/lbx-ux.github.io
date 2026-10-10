---
title: 三.DML
description: DMLDML英文全称是DataManipulationLanguage(数据操作语言),用来对数据库中表的数据记录进行增、删、改操作。1.添加数据(insert)1.给指定的字段添加数据sqlinse
pubDate: 2026-08-20
series: MySQL
order: 3
source: Java后端/数据库/Mysql/1. 基础/2.2.DML.md
---

# DML

DML英文全称是Data Manipulation Language(数据操作语言), 用来对数据库中表的数据记录进行增、删、改操作。

## 1. 添加数据(insert)

### 1. 给指定的字段添加数据

```sql
insert into 表名 (字段1，字段2…………字段n) values (值1，值2…………值n);
```

### 2. 给全部字段添加数据

```sql
insert into 表名 values(值1,值2…………);
```

### 3. 批量添加数据

在一次操作中插入多条数据，这种方式比执行多次单行插入的效率高得多。

```sql
insert into 表名 (字段1，字段2…………字段n) values (值1，值2…………值n),(值1，值2…………值n),(值1，值2…………值n);
```

```sql
insert into 表名 values(值1,值2…………),(值1,值2…………),(值1,值2…………);
```

注意事项：

- 插入数据时，指定的字段顺序需要与值的顺序是一一对应的。

- 字符串和日期型数据应该包含在引号中（使用单引号）。

- 插入的数据大小，应该在字段的规定范围内。



## 2.修改数据(update)

```sql
update 表名 set 字段名1=值1,字段名2=值2,…………[where 条件];

修改语句的条件可以有，也可以没有，如果没有条件，则会修改整张表的所有数据。
```



## 3. 删除数据(delete)

```sql
delete from 表名 [where 条件];
```

- DELETE 语句的条件可以有，也可以没有，如果没有条件，则会删除整张表的所有数据。

- DELETE 语句不能删除某一个字段的值（可以使用UPDATE，将该字段值置为NULL即可）。

- 当进行删除全部数据操作时，datagrip会提示我们，询问是否确认删除，我们直接点击 Execute即可。