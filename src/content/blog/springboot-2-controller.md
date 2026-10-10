---
title: "2.controller"
description: "@RestController"
pubDate: 2026-10-10
series: "SpringBoot"
order: 2
source: "SpringBoot/2.controller"
---

## 一.注解

### @RestController

`@RestController` 就是告诉Spring：“我这个类专做数据接口，所有方法返回的东西，**直接当外卖打包发走（JSON）**，别想着端盘子上桌（返回HTML）！”  

**“只送数据，不送页面”**  ，return返回的值不是返回到了控制台，而是返回给了前端

- 你写的方法返回 `new Dept(1, "技术部")`  

- 浏览器/手机APP收到的不是网页，而是：  

  ```json
  {"id":1, "name":"技术部"}
  ```

- 前端（Vue/React/小程序）拿到这个JSON，自己决定怎么显示

| 场景                                  | 用什么注解            | 为什么                               |
| ------------------------------------- | --------------------- | ------------------------------------ |
| 传统网站（返回HTML页面）              | `@Controller`         | 需要跳转到login.html、index.jsp等    |
| **现代开发（APP/小程序/前后端分离）** | **`@RestController`** | **前端自己画页面，后端只管给数据** ✅ |



### @RequestMapping

`@RequestMapping` 是一个注解（你可以理解为一种特殊的标记），它用来告诉 Spring 框架，某个方法应该在什么样的情况下被调用

@RequestMapping("/depts")：这个注解的意思是，当用户的请求 URL 中包含 `/depts` 这个路径时，Spring 框架就会找到这个注解所在的那个方法，并且执行这个方法。

我们可以把公共的路径 `/depts` 抽取到类上的，那在各个方法上，就可以省略了这个 `/depts` 路径，然后再具体实现的代码前加上GetMapping或PostMapping



## 二.接受请求参数

### 1. `@RequestParam`：接收查询参数 (Query Parameter) 或表单数据

用于提取 URL 中 `?` 后面的参数（如 `/api/user?name=张三&age=25`），或者 `application/x-www-form-urlencoded` 格式的表单数据。

- **常用属性**：`name` (参数名)、`required` (是否必传，默认 true)、`defaultValue` (默认值)。

```java
@GetMapping("/getUser")
public String getUser(
        @RequestParam(name = "name") String userName,
        @RequestParam(name = "age", required = false, defaultValue = "18") Integer userAge) {
    return "User: " + userName + ", Age: " + userAge;
}
```

> **提示**：如果请求参数名与 Controller 方法的变量名**完全一致**，甚至可以省略 `@RequestParam` 注解，Spring 会自动完成映射。

### 2. `@PathVariable`：接收路径变量 (Path Variable)

用于 RESTful 风格的 URL 中，从 URI 路径中提取变量值（如 `/api/user/1001`）。

```java
@GetMapping("/user/{id}")
public String getUserById(@PathVariable("id") Long userId) {
    return "查询到的用户 ID 为: " + userId;
}
```

*可以通过 `/user/1001` 访问，`userId` 将接收到 `1001`。*

### 3. `@RequestBody`：接收请求体中的 JSON 数据 (JSON Body)

通常用于 `POST` 或 `PUT` 请求。当前端发送 `application/json` 格式的数据时，Spring Boot 会自动利用 Jackson 库将其反序列化为 Java 对象。

```java
// 先定义一个实体类
public class User {
    private String name;
    private Integer age;
    // 省略 getter 和 setter
}

@PostMapping("/createUser")
public String createUser(@RequestBody User user) {
    return "成功创建用户: " + user.getName();
}
```

### 4. 使用实体类 (POJO) 直接接收多个查询参数

当 GET 请求有多个查询参数，或者 POST 提交了普通表单数据时，直接用一个实体类来接收会更优雅。

**注意：这里不需要加 `@RequestBody` 注解。**

```java
// URL: /api/search?keyword=java&page=1&size=10
@GetMapping("/search")
public String search(SearchCriteria criteria) {
    // Spring 会自动调用 criteria 的 setter 方法注入 keyword, page, size
    return "搜索词: " + criteria.getKeyword();
}
```

### 5. `@RequestHeader`：接收 HTTP 请求头 (Header) 参数

用于获取请求头中的特定信息，例如 Token、User-Agent 等。

```java
@GetMapping("/checkAuth")
public String checkAuth(@RequestHeader("Authorization") String token) {
    return "接收到的 Token 是: " + token;
}
```

### 6. 接收数组或集合参数

如果前端传递了多个同名参数（例如 `?ids=1,2,3` 或 `?ids=1&ids=2&ids=3`），可以使用数组或 `List` 来接收。

```java
@GetMapping("/deleteUsers")
public String deleteUsers(@RequestParam("ids") List<Long> ids) {
    return "准备删除的用户 ID 列表: " + ids.toString();
}
```

### 7.文件上传

上传图片/文件等资源，使用**MultipartFile file**接受

```java
public Result upload(MultipartFile file){
    //处理
}
```

**💡 总结与对比建议**

| **接收方式**      | **注解**         | **适用场景**                  | **数据格式示例**               |
| ----------------- | ---------------- | ----------------------------- | ------------------------------ |
| **查询参数/表单** | `@RequestParam`  | GET 过滤条件、简单表单提交    | `?name=tom&age=20`             |
| **RESTful 路径**  | `@PathVariable`  | 获取具体资源的 ID 等标识      | `/user/101`                    |
| **JSON 请求体**   | `@RequestBody`   | POST/PUT 提交复杂的嵌套对象   | `{"name":"tom", "age":20}`     |
| **请求头**        | `@RequestHeader` | 鉴权 Token、获取客户端信息等  | `Authorization: Bearer xx`     |
| **对象自动绑定**  | 无需注解         | 参数较多的 GET 请求或普通表单 | `?name=tom&age=20` 映射到 POJO |

在实际开发中，最经典的组合是：**GET 请求用 `@RequestParam` 或直接用 POJO 接收，POST 请求用 `@RequestBody` 接收 JSON 数据**



## 三.参数校验

### 1.引入依赖

使用的是 Spring Boot 2.3 及以上版本，参数校验库已经被移出了 `web` 启动器，需要手动在 `pom.xml` 中引入：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

### 2.最常用的校验注解

这三个“判空”注解最容易搞混，一定要记牢：

- **`@NotNull`**：不能为 `null`。但可以是空字符串 `""`。**（通常用于 Integer、Long 等包装类对象）**
- **`@NotEmpty`**：不能为 `null`，且长度必须大于 0。**（通常用于集合 List、Map 或数组）**
- **`@NotBlank`**：不能为 `null`，且必须包含至少一个非空格字符。**（绝对只用于 String 字符串）**

其他常用注解（可以组合使用）：

| **注解**                      | **作用**                 | **适用类型**       | **示例场景**                               |
| ----------------------------- | ------------------------ | ------------------ | ------------------------------------------ |
| `@Size(min=, max=)`           | 限制字符串长度或集合大小 | String, Collection | 密码长度 `min=6, max=20`                   |
| `@Min(value)` / `@Max(value)` | 限制数字的最小值/最大值  | Number             | 年龄 `@Min(18)`                            |
| `@Pattern(regexp=)`           | 使用正则表达式校验       | String             | 手机号 `@Pattern(regexp="^1[3-9]\\d{9}$")` |
| `@Email`                      | 验证是否为合法邮箱格式   | String             | 邮箱输入框                                 |
| `@Future` / `@Past`           | 验证日期必须在未来/过去  | Date, LocalDate    | 优惠券过期时间、生日                       |

### 3.示例

参数校验分为两步：**1. 在 DTO（实体类）上加规则；2. 在 Controller 开启校验。**

#### 1. 给 DTO 加上校验规则

在类的属性上添加注解，并写好 `message`（如果不符合规则，这个 message 就会被全局异常处理器拦截并返回给前端）。

```java
package com.example.model.dto;

import lombok.Data;
import javax.validation.constraints.*;
import java.util.List;

@Data
public class UserRegisterDTO {

    // 字符串必须用 @NotBlank
    @NotBlank(message = "用户名不能为空")
    @Size(min = 4, max = 15, message = "用户名长度必须在4-15个字符之间")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    // 数字判空用 @NotNull
    @NotNull(message = "年龄不能为空")
    @Min(value = 18, message = "未满18岁禁止注册")
    private Integer age;

    @Email(message = "邮箱格式不正确")
    private String email;

    // 集合判空用 @NotEmpty
    @NotEmpty(message = "请至少选择一个兴趣爱好")
    private List<String> hobbies;
}
```

#### 2. 在 Controller 层开启校验

在接收参数的实体类前面加上 **`@Validated`** 或者 **`@Valid`** 注解。（推荐统一使用 `@Validated`，它是 Spring 提供的，支持分组校验等高级功能）。

```java
@RestController
@RequestMapping("/api/user")
public class UserController {

    @PostMapping("/register")
    // 注意：这里的 @Validated 是灵魂！不加它，DTO 里的注解全是摆设
    public Result<Void> register(@Validated @RequestBody UserRegisterDTO dto) {
        
        // 只要代码能走到这里，说明前端传来的参数 100% 绝对合法！
        // 任何校验失败的情况，都已经被全局异常处理器拦截并返回错误信息了。
        
        userService.register(dto);
        return Result.success();
    }
}
```

### 💡 避坑与进阶提示

1. **嵌套校验：** 如果你的 DTO 里面还包含另一个对象（比如 `UserDTO` 里面有个 `AddressDTO`），你想连带校验内部对象，必须在 `AddressDTO` 属性上加上 `@Valid`：

   ```java
   @Valid // 必须加这个才能嵌套校验内部属性
   @NotNull(message = "地址信息不能为空")
   private AddressDTO address;
   ```

2. **单个参数校验（不用 DTO 的情况）：** 如果你的 Controller 是 Get 请求，直接接收单个参数，比如 `public Result getUser(@Min(1) Long id)`。这种情况需要在 Controller 类上（类名上方）打上 **`@Validated`** 注解才会生效。



## 四.日期校验

方式一：

```java
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
//加在实体类上面
```

方式二：

在WebMvcConfiguration中扩展SpringMVC的消息转换器，统一对日期类型进行格式处理

```java
@Configuration
@Slf4j
public class WebMvcConfiguration extends WebMvcConfigurationSupport {  
    /**
     * 扩展Spring MVC框架的消息转化器
     * @param converters
     */
    protected void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        log.info("扩展消息转换器...");
        //创建一个消息转换器对象
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        //需要为消息转换器设置一个对象转换器，对象转换器可以将Java对象序列化为json数据
        converter.setObjectMapper(new JacksonObjectMapper());
        //将自己的消息转化器加入容器中
        converters.add(0,converter);
    }
}
```
