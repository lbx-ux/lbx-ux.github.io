---
title: 3.Bean
description: 1.IOC，DI，Bean在Spring框架中，IoC（控制反转）、DI（依赖注入）和Bean是三个紧密相关但层次不同的核心概念。可以将它们理解为“指导思想→实现方法→被管理的对象”这样一个层层递进的
pubDate: 2026-08-24
series: Spring
order: 3
sort: 23
source: Java后端/SSM/Spring/3.Bean.md
---

## 1. IOC，DI，Bean

在 Spring 框架中，**IoC（控制反转）**、**DI（依赖注入）** 和 **Bean** 是三个紧密相关但层次不同的核心概念。可以将它们理解为“**指导思想 → 实现方法 → 被管理的对象**”这样一个层层递进的关系。

| 概念               | 核心定义                                                     | 角色与层次                   |
| :----------------- | :----------------------------------------------------------- | :--------------------------- |
| **IoC (控制反转)** | 一种**设计思想**。将对象的创建和依赖关系的管理权，从代码本身“反转”给外部容器。 | **指导思想**（顶层设计）     |
| **DI (依赖注入)**  | IoC思想的**具体实现方式**。容器在创建对象时，自动将其依赖的其他对象“注入”进来。 | **实现方法**（具体操作）     |
| **Bean**           | 被 Spring IoC 容器**管理的 Java 对象**。它是构成应用程序主干的对象。 | **被管理的对象**（具体实体） |



**详细解析**

**1. IoC（控制反转）：一种设计思想**

在没有 Spring 的传统编程中，当对象 A 需要对象 B 时，通常由 A 自己通过 `new` 关键字主动创建 B。这使得代码耦合度高，难以维护和测试。

**IoC 的核心思想就是“反转”这种控制权**：将创建对象、管理对象生命周期及对象间依赖关系的控制权，从程序代码本身转移给一个外部的 **IoC 容器**。这是一种为了降低耦合度、提高程序扩展性的设计原则。



**2. DI（依赖注入）：IoC 的具体实现**

DI 是 IoC 思想最核心、最直接的落地实现。

它的工作机制是：当 IoC 容器在创建一个 Bean 时，如果发现它依赖于其他对象，容器会自动去查找这些依赖对象，并通过**构造函数**、**Setter 方法**或**注解**等方式，将它们“注入”到当前对象中。整个过程对开发者是透明的，我们不再需要手动去获取依赖。

> 值得注意的是，**依赖查找（DL, Dependency Lookup）** 是另一种 IoC 的实现方式，即对象主动从容器中查找依赖。但 DI 是 Spring 框架主要采用的方式。



**3. Bean：被容器管理的对象**

在 Spring 中，所有由 IoC 容器创建、装配和管理的 Java 对象都被称为 **Bean**。

*   **本质上**，Bean 就是一个普通的 Java 对象（POJO）。
*   **区别在于**，Bean 的生命周期（创建、初始化、销毁等）完全由 Spring IoC 容器来控制，而普通对象则由开发者自行管理。



**总结：它们是如何协同工作的？**

可以用一个生活中的例子来串联这三者：

*   **IoC（思想）** 就像是“**中央厨房统一配送**”的理念，将“点餐者”自己做饭的权力反转给了中央厨房。
*   **DI（方法）** 就是实现这一理念的“**配送机制**”，中央厨房会根据订单（依赖关系），将菜品（依赖对象）配送到各个点餐者手中。
*   **Bean（对象）** 则是中央厨房统一管理、配送的“**每一道菜**”。

对应到代码中：
1.  你编写好一个类（如 `UserService`），并告诉 Spring（通过 `@Service` 等注解或 XML）这是一个 **Bean**。
2.  Spring 的 **IoC 容器** 接管了这个 Bean 的创建和管理。
3.  当创建 `UserService` 时，容器发现它需要一个 `UserDao`，于是通过 **DI** 将早已准备好的 `UserDao` Bean 自动注入进来。

总而言之，**IoC** 是目标和指导思想，**DI** 是实现这一目标的具体手段，而 **Bean** 则是在这个过程中被 IoC 容器管理的具体对象。理解了这个链条，就抓住了 Spring 框架的核心。





## 2. Bean的生命周期

一个 Bean 从出生到销毁分四大阶段：**实例化 → 属性注入 → 初始化 → 使用/销毁**。

**1. 实例化(Instantiation)**

Spring 通过解析配置(注解扫描或 XML)拿到 BeanDefinition,然后反射调用构造方法，创建出一个“裸对象”。此时只是内存里有了这个对象，属性都是默认值。

**2. 属性注入(Populate Properties)**

根据 `@Autowired`、`@Resource` 或 XML 配置，把依赖的其他 Be an 注入进来。这一步是循环依赖问题发生的地方。

**3. 初始化(Initialization)**

这是扩展点最密集的阶段，顺序如下：

- **Aware 回调**：如果实现了 `BeanNameAware`、`BeanFactoryAware`、`ApplicationContextAware`,依次拿到容器信息
- **BeanPostProcessor 的 postProcessBeforeInitialization**:所有后置处理器的“前置”逻辑
- **初始化方法**(三者按序执行)：① `@PostConstruct` 标注的方法 → ② `InitializingBean.afterPropertiesSet()` → ③ `init-method`(XML 或 `@Bean(initMethod=...)`)指定的方法
- **BeanPostProcessor 的 postProcessAfterInitialization**:AOP 代理对象通常就在这一步生成(`AbstractAutoProxyCreator`),所以你 `getBean()` 拿到的往往是代理而非原始对象

**4. 使用与销毁(Destruction)**

单例 Bean 存活于容器整个生命周期，容器关闭时触发销毁，顺序同样是三选一按序:`@PreDestroy` → `DisposableBean.destroy()` → `destroy-method`。注意原型作用域的 Bean,Spring 只负责创建，销毁交给用户。



**用代码验证顺序**

```java
@Component
public class LifecycleDemo implements InitializingBean, DisposableBean {

    public LifecycleDemo() {
        System.out.println("1. 构造方法");
    }

    @Autowired
    public void setDependency(Dependency d) {
        System.out.println("2. 属性注入");
    }

    @PostConstruct
    public void postConstruct() {
        System.out.println("3. @PostConstruct");
    }

    @Override
    public void afterPropertiesSet() {
        System.out.println("4. afterPropertiesSet");
    }

    // 假设通过 @Bean(initMethod="customInit") 指定
    public void customInit() {
        System.out.println("5. init-method");
    }

    @PreDestroy
    public void preDestroy() {
        System.out.println("6. @PreDestroy");
    }

    @Override
    public void destroy() {
        System.out.println("7. destroy()");
    }
}
```

输出就是 1→7 依次执行。中间若再注册两个 `BeanPostProcessor`,before 会插在第 3 步前，after 插在第 5 步后。





## 3. 循环依赖

好：**三级缓存是为了在“不破坏生命周期设计”的前提下，让循环依赖的 Bean 能拿到对方的“半成品”引用**。

A 依赖 B,B 又依赖 A。创建 A 时要注入 B → 于是去创建 B → 创建 B 又要注入 A……鸡生蛋问题。Spring 的解法思路：A 只要完成了**实例化**，它的内存地址就定了，可以先把这个“半成品”引用借给别人用，等它后面完成属性填充和初始化即可。

**三级缓存的定义**

都在 `DefaultSingletonBeanRegistry` 里：

| 缓存                         | 存什么                                       |
| ---------------------------- | -------------------------------------------- |
| 一级 `singletonObjects`      | **成品**：完整走完生命周期的单例 Bean        |
| 二级 `earlySingletonObjects` | **半成品**：实例化了但未完成初始化的早期引用 |
| 三级 `singletonFactories`    | **工厂**:`ObjectFactory`,能按需生产早期引用  |



**完整流程(A ↔ B)**

```
1. getBean(A):A 实例化(构造方法执行完)
2.          → 把 () -> getEarlyBeanReference(A) 这个工厂放入三级缓存
3.          → A 开始属性注入,发现依赖 B → 触发 getBean(B)
4. getBean(B):B 实例化,同样把自己的工厂放进三级缓存
5.          → B 属性注入,发现依赖 A → 触发 getSingleton(A):
              一级缓存没有(A 未完成)→ 二级也没有 → 三级命中!
6.          → 调用 A 的工厂得到早期引用(若有 AOP 则此时生成代理),
              放入二级缓存,并删除三级缓存的工厂
7.          → B 拿到 A 的早期引用,注入成功,B 继续走完初始化,
              放入一级缓存
8. 回到 A:B 注入完成,A 继续走完初始化,放入一级缓存
9. 全程结束,二级、三级缓存中 A 的痕迹被清掉
```

注意第 6 步：一旦某个 Bean 的早期引用被别人拿走了，就固定放在二级缓存里，后续再有人来取都从二级拿，保证多次获取拿到的是**同一个对象**(否则代理会被重复创建两次)。



**核心追问：为什么是三级，两级不行吗？**

这是本题的胜负手。答案在于 **AOP 代理的生成时机**。

Spring 的设计原则是：代理应该在初始化之后由 `BeanPostProcessor`(即 `postProcessAfterInitialization`)统一生成。但如果只有两级缓存，为了解决循环依赖就必须在**实例化之后立刻**判断“这个 Bean 要不要提前生成代理”——等于所有 Bean 都得提前做 AOP 决策，破坏了生命周期的一致性。

三级缓存的巧妙之处：存的是**工厂而非对象**，工厂是惰性的——

- 正常情况(无循环依赖)：工厂永远不被调用，代理照旧在初始化后生成，零开销；
- 发生循环依赖：工厂才被调用一次，临时产出早期引用(必要时提前生成代理)，放入二级缓存兜底。

所以第三级本质上是一个**延迟决策机制**：“是否需要提前暴露代理”这个决定被推迟到真正发生循环依赖的那一刻。



**边界与限制**

**构造器注入解决不了。** 曝光自己的前提是“实例化已完成”，而构造器注入发生在构造方法里，此时对象还没 new 出来，没东西可曝光 → 直接抛 `BeanCurrentlyInCreationException`。同理 setter 注入可以，字段注入(`@Autowired` 字段)也可以。

**原型作用域解决不了。** Spring 不缓存 prototype,每次都要新造，死循环只能靠检测抛异常。

**@Async 是著名的坑。** 它的代理不走三级缓存的提前曝光逻辑，若参与循环依赖会出现“注入的是原始对象、最终容器里却是代理”的不一致，启动时报 *Bean named 'X' has been injected into other beans in its raw version*。

**Spring Boot 2.6+ 默认禁止循环依赖。** `spring.main.allow-circular-references` 默认为 false,出现循环依赖直接启动失败。官方态度很明确：循环依赖是设计坏味道，应该通过 `@Lazy`、`ObjectProvider` 或重构职责边界来消除，而不是靠容器兜底。

