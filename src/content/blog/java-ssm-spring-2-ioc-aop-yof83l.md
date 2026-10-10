---
title: 2.IOC/DI
description: IOC，DIIoC（控制反转）是一种软件设计思想，而DI（依赖注入）是该思想的具体技术实现。核心概念对比传统开发模式（主动控制）：对象内部直接负责依赖对象的创建（如UserService内部通过new
pubDate: 2026-08-24
series: Spring
order: 2
sort: 22
source: Java后端/SSM/Spring/2.IOC.AOP.md
---

# IOC，DI

**IoC（控制反转）** 是一种软件设计思想，而 **DI（依赖注入）** 是该思想的具体技术实现。

**核心概念对比**

- **传统开发模式（主动控制）**：对象内部直接负责依赖对象的创建（如 `UserService` 内部通过 `new OrderService()` 实例化依赖）。控制权在当前对象手中，导致类与类之间高度耦合。
- **IoC 模式（控制反转）**：将对象的创建、初始化、生命周期管理及相互关系的维护全部移交给 **Spring 容器**。对象从“主动创建依赖”转变为“被动等待容器分发”。
- **DI（依赖注入）**：Spring 容器在运行期，动态地将组件所依赖的其他 Bean 传递（注入）给该组件的过程。



## IOC

> **IMPORTANT**：
>
> **组件声明与注册注解**

- **`@Component`**：通用组件注解，标识一个类由 Spring IoC 容器托管。
- **分层派生注解**（功能等同于 `@Component`，但增强了语义化）：
  - **`@Service`**：标注业务逻辑层（Service 层）。
  - **`@Mapper`**：标注数据访问层（ Mapper 层），具备自动转译数据库异常的特性。
  - **`@Controller` / `@RestController`**：标注控制层组件；`@RestController` 整合了 `@ResponseBody`。
- **`@Configuration`**：声明当前类为配置类（相当于 XML 配置文件），通常内部配合 **`@Bean`** 使用。
- **`@Bean`**：用于方法上，将方法的返回值作为一个 Bean 注册到容器中（常用于引入和配置第三方库的类）。



**`@Component` 和 `@Configuration` 虽然都会把类交给 Spring 容器管理（把它们变成 Bean），但它们的定位和核心运作机制完全不同。**

简单来说：

- **`@Component` 是“普通员工”**：用来把你自己写的普通业务类或工具类交给 Spring 管理。
- **`@Configuration` 是“配置车间”**：用来替代传统的 XML 配置文件，专门负责组装和生产那些比较复杂的、或者来自第三方的 Bean。

**1. 什么时候使用 `@Component`？**

**场景定位：当你想让 Spring 帮你实例化并管理一个你自己写的普通类时。**

它是 Spring 中最基础的组件注解（像 `@Controller`、`@Service`、`@Repository` 底层都是基于 `@Component` 派生出来的）。当你写了一个工具类、一个自定义的拦截器、或者一个定时任务类，你不想每次都 `new` 它，就可以直接在类上加这个注解。

**典型用例：**

- 自定义的工具类（如 `JwtTokenUtil`、`SmsSender`）。
- 自定义的拦截器（Interceptor）或过滤器（Filter）。
- 消息队列的消费者监听类。

**代码示例：**

```java
@Component
public class JwtTokenUtil {
    public String generateToken(String username) {
        // 生成 token 的逻辑
        return "token_string";
    }
}
```



**2. 什么时候使用 `@Configuration`？**

**场景定位：当你需要配置第三方依赖，或者需要集中通过 `@Bean` 注解手动实例化一系列相互依赖的对象时。**

你可以把 `@Configuration` 标注的类看作是一个**专门用来生产 Bean 的工厂**。在这个类里面，你通常会配合 `@Bean` 注解一起使用。

**典型用例：**

- 配置第三方中间件（例如：注入 MyBatis-Plus 的分页插件、配置自定义的 RedisTemplate 序列化器、配置阿里云 OSS 客户端）。
- 配置跨域规则（CORS 拦截器配置）。
- 当你需要通过复杂的代码逻辑（比如 if-else 校验配置文件参数）来决定如何构建一个 Bean 时。

**代码示例：**

```java
@Configuration
public class MybatisPlusConfig {
    
    // 专门手动生产一个 Bean 并交给 Spring 容器管理
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // 比如在这里为其添加分页插件
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
        return interceptor;
    }
}
```



**3. 核心区别（底层进阶/面试考点）：CGLIB 代理机制**

这两种注解最本质的区别在于**方法调用的代理机制**。

假设你在这个类里面用 `@Bean` 注册了两个对象 A 和 B，并且**在创建 B 的方法内部直接调用了创建 A 的方法**：

- **如果用的是 `@Configuration`：** Spring 默认会对这个类使用 CGLIB 动态代理增强（`proxyBeanMethods = true`）。当 B 调用 A 的方法时，Spring 会拦截这个调用，去容器里检查 A 是否已经存在。如果存在，就直接返回容器里的 A。这**绝对保证了 Spring 单例模式的安全性**。
- **如果错用成了 `@Component`：** 这种行为被称为“Lite Mode”（轻量级模式），Spring 不会做代理拦截。此时的调用就是普通的 Java 方法调用，每次调用 A 的方法都会重新 `new` 一个全新的 A 对象出来。这**破坏了依赖注入的单例原则**，可能会导致多线程安全问题或连接池泄露。

**总结对比**

| **特性**           | **@Component**                               | **@Configuration**                         |
| ------------------ | -------------------------------------------- | ------------------------------------------ |
| **核心定位**       | 标识普通组件（工具类、自定义组件）           | 标识配置类（替代传统的 XML 配置文件）      |
| **是否被代理拦截** | 否（普通 Java 对象）                         | 是（默认使用 CGLIB 增强代理，保证单例）    |
| **配合注解**       | 通常单独使用，或者配合 `@Autowired` 引入依赖 | 绝大多数情况配合 `@Bean` 一起使用          |
| **启动优先级**     | 依靠普通的组件扫描加载                       | 在容器启动初期就会被优先解析处理           |
| **适用场景归纳**   | 你自己写的、单纯需要被 Spring 接管的类       | 第三方组件接入、需要复杂参数装配的构建过程 |





## DI

> **IMPORTANT**：
>
> **Spring 中 DI 的三种注入方式**

- **构造器注入（推荐）**：容器通过构造函数把依赖塞给你。就像餐厅直接给你配好餐盘，你伸手接过来就行。

保证依赖不可变（可声明 `final`），防止 `NullPointerException`

```java
@Service
public class UserService {
    private final UserDao userDao;
    // 构造器注入
    public UserService(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

```java
@Service
public class UserService {
    private final UserDao userDao;
    // 构造器注入
    public UserService(UserDao userDao) {
        this.userDao = userDao;
    }
}
```

- **Setter 注入**：容器调用你的 `set` 方法把依赖传进来。就像服务员把菜放桌上，你拿个空碗去盛。

```java
@Autowired
public void setUserDao(UserDao userDao) {
    this.userDao = userDao;
}
```

- **字段注入（常用但争议大）**：容器直接通过反射把依赖强行塞到你的私有属性里。就像服务员直接把菜倒进你兜里，方便但不太优雅。

```java
@Autowired
private UserDao userDao;
```





推荐使用：`@RequiredArgsConstructor` 本质上依然属于**构造器注入**，它并不是 Spring 自身独立的新注入类型，而是来自 **Lombok** 库的代码生成注解。

**工作原理与协作机制**

1. **Lombok 负责生成构造函数**：在编译期，Lombok 会自动为所有带有 `final` 修饰（或 `@NonNull`）的成员变量生成一个构造函数。
2. **Spring 负责执行注入**：从 Spring 4.3 开始，**如果一个 Bean 类只有一个构造函数，Spring 会默认用该构造函数进行依赖注入**，无需显式添加 `@Autowired` 注解。

你编写的代码：

```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final OrderService orderService;
}
```

编译后实际生成的底层代码（即标准的**构造器注入**）：

```java
@Service
public class UserService {
    private final UserRepository userRepository;
    private final OrderService orderService;

    // 由 Lombok 自动生成的构造器，Spring 容器调用此构造器完成 DI
    public UserService(UserRepository userRepository, OrderService orderService) {
        this.userRepository = userRepository;
        this.orderService = orderService;
    }
}
```

**为什么现代 Spring 开发极其推荐这种写法？**

- **兼具构造器注入的优势**：保持对象不可变性（`final`）、避免注入 `null`、单测时便于直接 `new` 传入 Mock 依赖。
- **规避样板代码（Boilerplate）**：当类中需要注入多个依赖时，省去了手写冗长构造函数以及维护构造参数的繁琐过程。
- **避免字段注入的缺陷**：避免了在属性上直接写 `@Autowired`（字段注入）可能导致的依赖隐藏或警告问题。



# AOP

 AOP（面向切面编程）是一种通过**运行期动态代理**将横切关注点（如日志记录、事务管理、权限校验、耗时统计等）从核心业务逻辑中解耦出来的编程范式。

## 核心概念

> **切面（Aspect）** 在 **织入（Weaving）** 过程中，根据 **切入点（Pointcut）** 选定符合条件的 **连接点（JoinPoint）**，将 **通知（Advice）** 附加到 **目标对象（Target）** 上生成最终代理。

| **术语**     | **英文**      | **概念解析**                                                 |
| ------------ | ------------- | ------------------------------------------------------------ |
| **目标对象** | **Target**    | 包含核心业务逻辑、被代理的原始对象。                         |
| **连接点**   | **JoinPoint** | 程序运行中可以织入切面的位置。Spring AOP 中**仅支持方法执行**。 |
| **切入点**   | **Pointcut**  | 匹配连接点的规则表达式，指定切面在哪些方法生效（如 `execution(...)`）。 |
| **通知**     | **Advice**    | 切面在特定连接点执行的操作（定义“何时”执行“什么逻辑”）。     |
| **切面**     | **Aspect**    | 横切关注点的模块化封装类（使用 `@Aspect` 注解标记）。        |
| **织入**     | **Weaving**   | 将切面应用到目标对象以创建代理对象的过程（Spring 在**运行期**完成）。 |



### 1. 目标对象（Target）

在 Spring AOP 中，**Target（目标对象）** 指的是**被切面通知（Advise）的原始业务对象**。

Spring AOP 采用运行时动态代理机制。客户端实际注入并调用的是**代理对象（Proxy）**，代理对象在执行完切面逻辑（Advice）后，最终会将请求委派给目标对象（Target）去执行真实的业务代码。

```
[Client] ---> [Proxy Object (代理对象)] ---> [Target Object (目标对象)]
                     |
            (执行 Around/Before/After 等增强)
```



**核心对比：`target` 与 `this`**

在 AspectJ 切点表达式和通知参数绑定中，`target` 与 `this` 最容易被混淆：

| **标识符**     | **含义**                      | **匹配依据**                         | **JDK 动态代理下的表现**                               |
| -------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------ |
| **`target()`** | **目标对象**（Target Object） | 实际执行业务逻辑的原始 Bean 实例类型 | 匹配实现类的类型（如 `UserServiceImpl`）               |
| **`this()`**   | **代理对象**（Proxy Object）  | Spring 生成的 AOP 代理实例类型       | 仅匹配接口类型（如 `UserService`），直接写实现类会失效 |

**切点表达式示例**

```java
// 1. 匹配目标对象为 OrderServiceImpl 的所有方法（推荐，更符合直觉）
@Pointcut("target(com.example.service.impl.OrderServiceImpl)")
public void targetPointcut() {}

// 2. 匹配代理对象类型（若使用 JDK 代理，此切点匹配不到 OrderServiceImpl，因为代理类只实现了接口）
@Pointcut("this(com.example.service.impl.OrderServiceImpl)")
public void thisPointcut() {}
```



**在通知中获取 Target**

通过 `JoinPoint` 可以分别获取目标对象与当前代理对象：

```java
@Aspect
@Component
public class LogAspect {

    @Before("execution(* com.example.service.*.*(..))")
    public void doBefore(JoinPoint joinPoint) {
        // 获取被代理的目标对象（Target）
        Object target = joinPoint.getTarget();
        Class<?> targetClass = target.getClass(); // 例如: UserServiceImpl

        // 获取当前代理对象（Proxy）
        Object proxy = joinPoint.getThis();
        Class<?> proxyClass = proxy.getClass();   // 例如: com.sun.proxy.$ProxyXX 或 UserServiceImpl$$EnhancerBySpringCGLIB$$XX
    }
}
```



**目标对象内部自调用失效问题**

因为 AOP 增强只发生在**外部经由代理对象调用**的阶段，若在目标对象内部直接调用同类的方法：

**同一个类内部的方法相互调用时，事务（`@Transactional`）或切面（AOP）会失效。**

```java
@Service
public class OrderService {

    public void createOrder() {
        // 内部直接调用，此时的调用者是 this (目标对象本身)，而不是代理对象
        // 因此 processPayment() 上的 @Transactional 或自定义 AOP 注解将不会触发！
        this.processPayment(); 
    }

    @Transactional
    public void processPayment() {
        // 业务逻辑
    }
}
```

**常见解决方案：**

1. **注入自身代理**：通过 `@Autowired private OrderService self;` 调用 `self.processPayment()`。
2. **从 AOP 上下文获取代理**：`((OrderService) AopContext.currentProxy()).processPayment()`（需开启 `@EnableAspectJAutoProxy(exposeProxy = true)`）。
3. **重构拆分**：将 `processPayment` 拆分到独立的 Service Bean 中。





### 2. 连接点（JoinPoint）

在 AOP 中，**连接点（JoinPoint）** 代表程序执行过程中能够织入切面逻辑的具体时机或位置。在 **Spring AOP** 中，由于其基于运行时动态代理实现，**连接点特指 Spring 管理的 Bean 中「方法的执行」**。



**连接点（JoinPoint）与切入点（Pointcut）的关系**

- **连接点（JoinPoint）**：所有**候选位置**。在 Spring 中，所有能够被代理拦截的公开方法本身都是连接点。
- **切入点（Pointcut）**：具体的**匹配规则**。通过表达式从众多连接点中筛选出真正需要增强的目标方法。
- **形象类比**：连接点是菜单上的**所有菜品**，切入点是你根据喜好**勾选下单的菜**。



**`JoinPoint` 接口的核心 API**

在通知（Advice）方法的第一个参数中声明 `JoinPoint`，可以提取当前被拦截方法运行时的全部上下文元数据：

| **方法**                  | **返回类型**     | **作用说明**                                                 |
| ------------------------- | ---------------- | ------------------------------------------------------------ |
| **`getArgs()`**           | `Object[]`       | 获取当前目标方法执行时传入的**实际参数列表**                 |
| **`getSignature()`**      | `Signature`      | 获取**方法签名**，通常强转为 `MethodSignature` 读取方法名（getName）、返回值类型（getReturnType)、形参名称数组（getParameterNames） |
| **`getTarget()`**         | `Object`         | 获取被代理的**原始目标对象**（Target）                       |
| **`getThis()`**           | `Object`         | 获取当前生成的**代理对象**（Proxy）                          |
| **`getSourceLocation()`** | `SourceLocation` | 获取源码位置信息（行号、源文件名）                           |



**`JoinPoint` 与 `ProceedingJoinPoint` 的区别**

Spring AOP 提供了两个层级的接口，分别对应不同类型的通知：

- **`JoinPoint`（只读上下文）**
  - **适用场景**：`@Before`、`@After`、`@AfterReturning`、`@AfterThrowing`。
  - **特点**：只能**观察**方法信息（如读取参数、记录日志），不能干预或中断原方法的执行流程。
- **`ProceedingJoinPoint`（控制上下文）**
  - **适用场景**：**仅用于 `@Around` 环绕通知**（它是 `JoinPoint` 的子接口）。
  - **特点**：新增了 `proceed()` 和 `proceed(Object[] args)` 方法，拥有原方法执行的**控制权**，可以决定原方法是否执行、修改传入参数、替换返回值或捕获重抛异常。

```java
@Aspect
@Component
public class MonitorAspect {

    // 1. 使用基础 JoinPoint 进行前置审计
    @Before("execution(* com.example.service.*.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getName();
        Object[] args = joinPoint.getArgs();

        System.out.println("准备执行方法: " + methodName + "，入参: " + Arrays.toString(args));
    }

    // 2. 使用 ProceedingJoinPoint 进行性能统计与异常熔断
    @Around("execution(* com.example.service.*.*(..))")
    public Object monitorAround(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        
        try {
            // 执行真正的目标连接点方法（也可以在此修改入参：pjp.proceed(newArgs)）
            Object result = pjp.proceed(); 
            return result;
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.println(pjp.getSignature().getName() + " 耗时: " + duration + "ms");
        }
    }
}
```





### 3. 切入点（Pointcut） 

**切入点（Pointcut）** 是 AOP 中用于**定义拦截规则的表达式**。如果说连接点（JoinPoint）是系统中所有“可以被增强的方法”，切入点就是具体的“过滤器”，负责明确指定切面通知（Advice）应该织入到**哪些类的哪些方法**上。



**切点的核心语法：`execution` 表达式**

`execution` 是最常用、表达能力最强的切点指示符，其语法结构如下：

```
execution(修饰符? 返回类型 包名.类名.方法名(参数) 异常模式?)
```

- **修饰符**（可选）：如 `public`、`protected`（省略表示匹配所有修饰符）。
- **返回类型**（必填）：`*` 表示匹配任意返回类型；`void`、`String`、`java.util.List` 等表示具体类型。
- **类路径与方法名**（必填）：可使用通配符匹配类名和方法名。
- **参数列表**（必填）：
  - `(..)`：匹配任意数量、任意类型的参数。
  - `(*)`：匹配且仅匹配一个任意类型的参数。
  - `(String, ..)`：匹配第一个参数为 `String`，后续参数任意。



**典型通配符写法：**

```java
// 拦截 UserService 下的所有 public 方法
@Pointcut("execution(public * com.example.service.UserService.*(..))")

// 拦截 service 包及其所有子包下所有类的所有方法
@Pointcut("execution(* com.example.service..*.*(..))")

// 拦截所有以 get、find 开头的查询方法
@Pointcut("execution(* com.example..*.get*(..)) || execution(* com.example..*.find*(..))")
```



**常见切点指示符速查**

除了 `execution`，Spring AOP 还支持多种维度的匹配指示符：

| **切点指示符**           | **匹配依据**              | **常见场景**                                                 |
| ------------------------ | ------------------------- | ------------------------------------------------------------ |
| **`execution`**          | 方法签名                  | 针对特定类、方法名模式的拦截（最常用）                       |
| **`@annotation`**        | 方法级注解                | 拦截标记了特定自定义注解的方法（如 `@Log`、`@RateLimit`）    |
| **`within`**             | 静态声明类型              | 拦截指定包或类内的所有方法（粒度到类级，比 execution 匹配性能更高） |
| **`@within`**            | 类级注解                  | 拦截带有指定注解的类中的所有方法                             |
| **`bean`**               | Spring Bean 容器标识      | 按 Bean 的 ID/Name 匹配（如 `bean(*Service)`，Spring 特有）  |
| **`target` / `@target`** | 目标对象类型 / 类注解     | 按底层目标 Bean 的实际类型或目标类上的注解匹配               |
| **`args` / `@args`**     | 运行时入参类型 / 参数注解 | 按传入方法的实际对象类型或参数类上的注解匹配                 |



**切点的声明、复用与逻辑组合**

通过 `@Pointcut` 注解修饰一个空方法，可以声明一个命名的切点，方便在多个通知中复用或通过逻辑运算符（`&&`、`||`、`!`）组合：

```java
@Aspect
@Component
public class SystemLogAspect {

    // 1. 声明切点：拦截 service 包下的所有方法
    @Pointcut("within(com.example.service..*)")
    public void inServiceLayer() {}

    // 2. 声明切点：拦截标记了 @Log 注解的方法
    @Pointcut("@annotation(com.example.annotation.Log)")
    public void hasLogAnnotation() {}

    // 3. 组合切点：在 service 层 并且 标记了 @Log 的方法
    @Pointcut("inServiceLayer() && hasLogAnnotation()")
    public void serviceLogPointcut() {}

    // 4. 引用切点
    @Before("serviceLogPointcut()")
    public void beforeLog(JoinPoint joinPoint) {
        System.out.println("触发日志记录: " + joinPoint.getSignature().getName());
    }
}
```

**最佳实践与性能建议**

- **缩小匹配范围**：尽量结合 `within()` 或明确的包路径限定范围。避免使用极宽泛的表达式（如 `execution(* *(..))`），宽泛的切点会导致 Spring 在启动解析 Bean 时遍历过多无用类，降低容器启动速度。
- **业务增强优先使用自定义注解**：对于非通用分层拦截（如操作日志、防重提交、权限校验），优先使用 `@annotation(MyAnnotation)`，比基于方法名的通配匹配更清晰、耦合度更低。





### 4. 通知（Advice）

**通知（Advice）** 是切面在特定连接点（JoinPoint）上执行的**具体增强逻辑**。如果说切点（Pointcut）解决了“在哪里切”的问题，通知则明确了“切进去后做什么”**以及**“在什么时候做”。

**五种通知类型**

| **注解**              | **通知类型** | **触发时机**                   | **核心能力**                                           |
| --------------------- | ------------ | ------------------------------ | ------------------------------------------------------ |
| **`@Before`**         | 前置通知     | 目标方法**执行前**             | 参数校验、权限检查、审计记录（抛异常可阻断原方法执行） |
| **`@AfterReturning`** | 返回通知     | 目标方法**正常执行完毕后**     | 获取并处理方法的返回值（若发生异常则不触发）           |
| **`@AfterThrowing`**  | 异常通知     | 目标方法**抛出未捕获异常后**   | 异常告警、错误日志记录、异常类型统计                   |
| **`@After`**          | 最终通知     | 目标方法**结束后（无论成败）** | 资源释放、清理上下文（类似于 `finally` 块）            |
| **`@Around`**         | 环绕通知     | **完全包裹**目标方法执行全过程 | 手动控制执行流程、修改入参及返回值、性能统计、限流熔断 |

两条使用经验：

1. **能用简单通知就别用 Around**。只记前置日志就用 `@Before`，语义清晰；`Around` 留给需要控制流程的场景。
2. **需要改流程时只有 Around 能做到**：
   - 不调用 `pjp.proceed()` → 目标方法根本不执行（限流、权限拦截的原理）
   - `pjp.proceed(newArgs)` → 换参数执行
   - `return 别的对象` → 替换返回值
   - `try/catch` 包住 `proceed()` → 吞掉异常实现降级

> 顺带说明：`@Transactional` 就是 Spring 用 AOP 实现的——它的切面在进入方法时开启事务、正常返回时提交、抛异常时回滚。你写的切面和它的机制完全一样。



**三个特殊获取方式值得记住：**

```java
// 1. 拿方法上的注解实例（最优雅的绑定式写法）
@Around("@annotation(metric)")

// 2. 拿返回值 —— 形参名要和 returning 属性一致
@AfterReturning(value = "...", returning = "result")
public void afterReturn(JoinPoint jp, Object result)

// 3. 拿异常 —— 形参名要和 throwing 属性一致
@AfterThrowing(value = "...", throwing = "ex")
public void afterThrow(JoinPoint jp, Exception ex)
```

Web 项目里在切面中拿请求信息（URL、IP、Header）的标准做法：

```java
ServletRequestAttributes attrs =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
HttpServletRequest request = attrs.getRequest();
```



**通知的参数绑定与代码示例**

不同通知可以通过属性绑定目标方法的**返回值**或**异常对象**：

```java
@Aspect
@Component
public class TransactionAspect {

    // 1. 前置通知：在执行前读取入参
    @Before("execution(* com.example.service.OrderService.createOrder(..))")
    public void beforeAdvice(JoinPoint joinPoint) {
        System.out.println("准备创建订单，参数: " + joinPoint.getArgs()[0]);
    }

    // 2. 返回通知：通过 returning 属性绑定目标方法的返回值
    @AfterReturning(value = "execution(* com.example.service.OrderService.createOrder(..))", returning = "orderId")
    public void afterReturningAdvice(JoinPoint joinPoint, Long orderId) {
        System.out.println("订单创建成功，生成的订单 ID 为: " + orderId);
    }

    // 3. 异常通知：通过 throwing 属性绑定抛出的异常
    @AfterThrowing(value = "execution(* com.example.service.OrderService.*(..))", throwing = "ex")
    public void afterThrowingAdvice(JoinPoint joinPoint, Exception ex) {
        System.err.println("方法 " + joinPoint.getSignature().getName() + " 执行出错: " + ex.getMessage());
    }

    // 4. 环绕通知：唯一必须使用 ProceedingJoinPoint 的通知
    @Around("execution(* com.example.service.OrderService.pay(..))")
    public Object aroundAdvice(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println("[环绕前] 开启事务");
        try {
            // 执行原方法，可在此替换入参：pjp.proceed(newArgs)
            Object result = pjp.proceed(); 
            System.out.println("[环绕后] 提交事务");
            return result; // 可以修改并返回新的结果
        } catch (Throwable t) {
            System.out.println("[环绕异常] 回滚事务");
            throw t;
        }
    }
}
```



**单个切面内的执行时序**

同一个切面内部各通知的标准执行时序如下：

```java
// 1. @Around 处于最外层拦截器
@Around(前半部分);

try {
    // 2. 目标方法执行前
    @Before;
    
    // 3. 执行真实业务逻辑
    result = 目标方法(); 
    
    // 4. 正常返回时触发
    @AfterReturning;
    
} catch (Throwable e) {
    // 4. 发生异常时触发
    @AfterThrowing;
    throw e;
} finally {
    // 5. 无论成败都会触发（相当于 finally）
    @After;
}

// 6. 目标方法成功且后续通知全部结束后，回到环绕通知收尾
@Around(后半部分);
```

```
正常: @Around(前半) → @Before → 目标方法 → @AfterReturning → @After → @Around(后半)
异常: @Around(前半) → @Before → 抛异常 → @AfterThrowing → @After（然后异常继续向外抛）
```

注意异常路径下 **`@Around` 的后半段不会执行**，除非像 `MetricAspect` 那样用 `try/finally` 包住 `proceed()`。

这句话指的是：如果在环绕通知（`@Around`）中没有对 `proceed()` 做异常保护，一旦被拦截的目标方法抛出异常，**写在 `proceed()` 下方的代码会被直接跳过、不会被执行**。

**常规写法（异常时后半段失效）**

```java
@Around("execution(* com.example.service.*.*(..))")
public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
    // 1. 前半段：记录开始时间（正常执行）
    long start = System.currentTimeMillis();

    // 2. 执行目标方法
    // 💥 如果目标方法抛出 RuntimeException，程序直接中断并向外抛出异常！
    Object result = joinPoint.proceed(); 

    // 3. 后半段：计算耗时
    // ❌ 遇到异常时，代码根本走不到这里，导致本次调用的耗时/指标无法被记录
    long cost = System.currentTimeMillis() - start;
    System.out.println("方法耗时: " + cost + "ms");

    return result;
}
```



**使用 `try/finally` 的标准写法（指标统计/资源释放必备）**

如果要在无论成功还是抛异常的情况下都统计指标（例如 `MetricAspect` 统计请求耗时、上报监控）或释放资源，必须将 `proceed()` 放入 `try` 块，将后半段逻辑放入 `finally` 块：

```java
@Around("execution(* com.example.service.*.*(..))")
public Object metricAspect(ProceedingJoinPoint joinPoint) throws Throwable {
    long start = System.currentTimeMillis();
    try {
        // 执行目标方法并直接返回
        return joinPoint.proceed();
    } finally {
        // ✅ 无论正常返回还是抛出异常，finally 里的后半段代码 100% 会被执行
        long cost = System.currentTimeMillis() - start;
        System.out.println("方法执行结束，总耗时: " + cost + "ms");
    }
}
```

**常见应用场景**

- **耗时统计与监控埋点（Metric）**：即使业务失败报错，也必须记录本次请求耗时和失败计数。
- **资源清理 / Context 释放**：在前半段绑定了 `ThreadLocal` 或分布式锁，必须在 `finally` 中清理/释放，防止内存泄漏或死锁。



**多个切面的优先级控制（`@Order`）**

当多个切面同时匹配到同一个方法时，可以通过在切面类上添加 `@Order(int)` 注解来指定优先级（数字越小，优先级越高）：

- **高优先级切面** 会在更外层运行：先进入其 `@Before`，最后离开其 `@After`（类似洋葱模型）。
- **典型分层**：
  - `@Order(1)` 链路追踪切面（TraceId 注入）
  - `@Order(2)` 分布式锁 / 防重切面
  - `@Order(3)` 业务事务切面（`@Transactional` 默认顺序较低）





### 5. 切面（Aspect）

**切面（Aspect）** 是对横切关注点的模块化封装。

如果将系统的核心业务流程（如用户注册、订单结算）看作**纵向的业务主线**，那么散落在各个业务模块中的通用逻辑（如日志记录、事务控制、权限校验、性能监控、参数验签）就是**横向的切面**。

$$\text{切面（Aspect）} = \text{切入点（Pointcut：在哪里拦截）} + \text{通知（Advice：拦截后做什么）}$$



**切面的基本结构**

在 Spring 中，切面通常是一个声明了 `@Aspect` 并交由 Spring 容器管理的普通 Bean：

```java
@Aspect      // 1. 声明该类为一个切面
@Component   // 2. 注册为 Spring 容器中的 Bean
@Order(1)    // 3. (可选) 控制多个切面协同工作时的执行顺序
public class RateLimitAspect {

    // 4. 定义切入点 (Pointcut)：规则为拦截所有标记了 @RateLimiter 的方法
    @Pointcut("@annotation(com.example.annotation.RateLimiter)")
    public void rateLimitPointcut() {}

    // 5. 定义通知 (Advice)：在目标切点执行前进行令牌桶限流校验
    @Before("rateLimitPointcut()")
    public void checkRateLimit(JoinPoint joinPoint) {
        // 横切逻辑：限流检查
        boolean allowed = RateLimiterService.tryAcquire();
        if (!allowed) {
            throw new BusinessException("系统繁忙，请稍后再试！");
        }
    }
}
```



**切面在 Spring AOP 底层的生效流程**

Spring 不会直接修改编写的 Java 源码或 class 字节码，而是通过 **`BeanPostProcessor` 机制在运行期动态生成代理**：

```
[Spring 启动] 
   └── AnnotationAwareAspectJAutoProxyCreator 扫描容器中所有标注 @Aspect 的 Bean
   
[创建业务 Bean]
   └── 检查当前 Bean 的类或方法是否匹配切面的 Pointcut 规则
         ├── 不匹配：直接返回原始 Target 实例
         └── 匹配成功：为 Target 创建代理对象（Proxy），并将切面逻辑组装为拦截器链
```

- **`Advisor` 转化**：在 Spring 源码内部，一个 `@Aspect` 类中的每一个「通知方法 + 切点」都会被解析包装为一个 **`Advisor`**（如 `PointcutAdvisor`）。
- **链式调用**：当客户端调用代理对象的方法时，代理对象会按照优先级依次执行切面拦截器链（`MethodInterceptor`），最后调用真正的目标对象（Target）。





### 6. 织入（Weaving）

- **本质**：把切面代码与目标业务对象结合，并生成最终代理对象（Proxy）的**动作或阶段**。
- **织入时机对比**：
  - **编译期 / 类加载期织入**：如原生 AspectJ，需要专用编译器（ajc）或 Java Agent 探针在类加载前修改字节码。
  - **运行期织入（Spring AOP 采用的方式）**：Spring 容器启动并初始化 Bean 时，通过 **JDK 动态代理**（基于接口）或 **CGLIB**（基于子类继承）在内存中动态生成代理类，对业务代码零侵入。





## 动态代理

**动态代理** 是在程序**运行期间**由 JVM 动态生成代理类和对象的技术。

相较于“静态代理”需要为每一个被代理类手动编写代理代码，动态代理能够统一拦截一批方法调用，在不侵入业务源码的前提下织入公共逻辑（如事务管理、权限控制、日志追踪、RPC 远程调用等），这也是 Spring AOP 的底层核心支撑。

在 Java 生态中，最主流的动态代理实现主要有两种：**JDK 原生动态代理** 与 **CGLIB 动态代理**。

**JDK 动态代理与 CGLIB 核心对比**

| **维度**            | **JDK 动态代理**                          | **CGLIB 动态代理**                                   |
| ------------------- | ----------------------------------------- | ---------------------------------------------------- |
| **底层实现机制**    | Java 官方反射包（`java.lang.reflect`）    | 基于 ASM 框架直接操作字节码                          |
| **代理生成方式**    | **基于接口**：生成实现指定接口的新类      | **基于继承**：生成目标类的派生**子类**               |
| **对目标类的要求**  | 目标类**必须实现至少一个接口**            | 目标类与方法**不能使用 `final` 修饰**                |
| **拦截核心接口**    | `InvocationHandler`（重写 `invoke` 方法） | `MethodInterceptor`（重写 `intercept` 方法）         |
| **Spring 默认策略** | Spring Boot 1.x 默认策略（有接口时）      | **Spring Boot 2.x / 3.x 默认策略**（全部采用 CGLIB） |



**Spring Boot 为什么默认全面转向 CGLIB？**

在早期的 Spring AOP 中，有接口用 JDK、无接口用 CGLIB。但从 **Spring Boot 2.0+** 开始，默认配置项 `spring.aop.proxy-target-class` 被设置为 `true`（全面使用 CGLIB）。

- **避免类型转换异常（`ClassCastException`）**：在依赖注入时，若使用 JDK 代理，开发者如果用具体实现类注入（如 `@Autowired private UserServiceImpl service;`），Spring 会因代理对象类型是 `$Proxy` 而导致类型转换失败；而 CGLIB 生成的是 `UserServiceImpl` 的子类，天然兼容直接注入实现类。
- **现代 JVM 下性能趋近**：在早期的 Java 版本中 CGLIB 性能显著领先，虽然高版本 JDK 对原生反射/代理进行了大幅优化，但 CGLIB 在功能统一性和避免类型陷阱上体验更好。





## 使用方法

**第 1 步：引入依赖**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

**第 2 步：写一个切面类**

加上 `@Aspect` 和 `@Component` 两个注解，里面声明切点和通知。

**第 3 步**

Spring Boot 启动时自动为匹配到的 Bean 创建 CGLIB 代理，之后所有对目标方法的调用都会先经过你的切面。不需要 XML，不需要手动创建代理，也不需要 `@EnableAspectJAutoProxy`——Boot 全部自动化了。
