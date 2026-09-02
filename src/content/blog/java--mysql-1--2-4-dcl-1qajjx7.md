---
title: 五.DCL
description: DCLDCL英文全称是DataControlLanguage（数据控制语言），用来管理数据库用户控制数据库的访问权限。1.查询用户sqlusemysql;selectfromuser;!image20
pubDate: 2026-08-20
tags: [MySQL]
series: MySQL
order: 5
source: Java后端/数据库/Mysql/1. 基础/2.4.DCL.md
---

# DCL

DCL英文全称是Data Control Language（数据控制语言），用来管理数据库用户控制数据库的访问权限。

## 1. 查询用户

```sql
use mysql;
select * from user;
```

![image-20260125213547981](/covers/java--mysql-1--2-4-dcl-1qajjx7/image-20260125213547981.png)

其中 Host代表当前用户访问的主机，如果为localhost，仅代表只能够在当前本机访问，是不可以远程访问的。User代表的是访问该数据库的用户名。在MySQL中需要通过Host和User来唯一标识一个用户。

## 2. 创建用户

```sql
create user '用户名'@'主机名' identified by '密码';
注意：此时只能在当前本机下访问，不可以远程访问

create user '用户名'@'%' identified by '密码';
可以任意主机访问数据库
```

## 3. 修改用户密码

```sql
alter user '用户名'@'主机名' identified with mysql_native_password by '新密码';
```

## 4. 删除用户

```sql
drop user '用户名'@'主机名'；
```



## 权限控制

|        权限        |        说明        |
| :----------------: | :----------------: |
| all,all privileges |      所有权限      |
|       select       |      查询数据      |
|       insert       |      插入数据      |
|       update       |      修改数据      |
|       delete       |      删除数据      |
|       alter        |       修改表       |
|        drop        | 删除数据库/表/视图 |
|       create       |   创建数据库/表    |

### 1. 查询权限

```sql
show grants for '用户名'@'主机名';
```

### 2. 授予权限  

```sql
grant 权限列表 on 数据库名.表名 to '用户名'@'主机名';
```

### 3. 撤销权限

```sql
remove 权限列表 on 数据库名.表名 from '用户名'@'主机名';
```

- 多个权限之间，使用逗号分隔

- 授权时，数据库名和表名可以使用 * 进行通配，代表所有。