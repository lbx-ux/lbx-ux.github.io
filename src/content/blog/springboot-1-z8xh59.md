---
title: 1.规范包结构
description: com.yourcompany.project├──config//【配置层】存放所有第三方组件和系统核心的配置类│├──MybatisPlusConfig.java//MyBatis-Plus分页插
pubDate: 2026-10-10
series: SpringBoot
order: 1
source: SpringBoot/1.规范包结构
---

## 1.单体化模块

```
com.yourcompany.project
├── config            // 【配置层】存放所有第三方组件和系统核心的配置类
│   ├── MybatisPlusConfig.java  // MyBatis-Plus 分页插件等配置
│   ├── RedisConfig.java        // Redis 序列化配置
│   ├── MinioConfig.java        // MinIO 客户端初始化配置
│   └── WebMvcConfig.java       // Web核心配置 (必须：在这里注册 Interceptor)
│
├── interceptor       // 【拦截器层】存放 Web 请求的前置校验逻辑
│   ├── LoginInterceptor.java       // 登录校验 (Token解析等)
│   └── RateLimitInterceptor.java   // 接口防刷限流 (通常配合 Redis 使用)
│
├── controller        // 【表现层】只负责接收请求、参数校验、转发业务、返回响应
│   ├── UserController.java
│   └── FileController.java 
│
├── service           // 【业务层】存放核心业务逻辑，保持接口与实现分离
│   ├── UserService.java
│   └── impl
│       └── UserServiceImpl.java
│
├── mapper            // 【持久层】与数据库交互的接口 (MyBatis/MyBatis-Plus)
│   └── UserMapper.java
│
├── model             // 【模型层】严格区分数据的生命周期和流转边界
│   ├── entity        // PO：与数据库表结构完全对应的实体类
│   ├── dto           // DTO：接收前端传来的入参 (如 UserLoginDTO)
│   └── vo            // VO：处理后返回给前端的出参 (如 UserDetailVO)
│
├── common            // 【公共组件层】整个项目的基础设施，不涉及具体业务
│   ├── result
│   │   └── Result.java             // 统一响应结构 (code, msg, data)
│   ├── exception     // ★ 全局异常处理的核心归宿 ★
│   │   ├── GlobalExceptionHandler.java // @RestControllerAdvice 全局异常捕获
│   │   └── BusinessException.java      // 自定义业务异常 (供 Service 层抛出)
│   └── constant
│       └── RedisKeyConstants.java  // 统一管理所有的 Redis Key，拒绝魔法值
│
├── utils             // 【工具类层】纯静态方法，提供通用能力
│   ├── RedisUtil.java    // 封装缓存操作 (包含防止缓存穿透/击穿的逻辑)
│   ├── MinioUtil.java    // 封装 OSS 对象存储操作 (上传、获取预览URL)
│   └── JwtUtil.java      // 封装 Token 的生成与解析
│
└── Application.java  // SpringBoot 启动类 (与最外层包平级)
```



**关键架构约束（团队开发铁律）**：

在这样的结构下，开发时必须遵守以下依赖和流转方向，绝对不能反向调用：

1. **代码依赖方向：** `Controller` -> `Service` -> `Mapper`。绝不允许 Controller 直接调用 Mapper。
2. **对象流转方向：**
   - **进：** 前端 JSON -> `Controller` (转为 DTO) -> `Service` (DTO 转为 Entity) -> `Mapper` (存入数据库)。
   - **出：** 数据库 -> `Mapper` (Entity) -> `Service` (Entity 转为 VO) -> `Controller` (包装成 Result) -> 前端。
3. **异常处理原则：**
   - `Service` 遇到校验失败或逻辑错误（如“密码错误”、“库存不足”），**直接抛出** `BusinessException`，禁止在业务代码里写 `return Result.error()`。
   - `GlobalExceptionHandler` 会在系统边缘自动接住所有异常，并转化为标准的 HTTP 响应。

