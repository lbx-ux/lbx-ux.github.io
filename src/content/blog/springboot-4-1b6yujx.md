---
title: 4返回结果实体类
description: 一.统一返回结果实体类
pubDate: 2026-10-10
series: SpringBoot
order: 4
source: SpringBoot/4返回结果实体类
---

## 一.统一返回结果实体类

### 1.定义状态码枚举类 (ResultCode)

将所有的状态码和提示信息统一管理，避免代码里到处都是“魔法数字”。

```java
@Getter
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    ERROR(500, "系统内部异常"),
    PARAM_ERROR(400, "参数校验失败"),
    UNAUTHORIZED(401, "暂未登录或token已经过期"),
    FORBIDDEN(403, "没有相关权限");

    private final Integer code;
    private final String message;

    ResultCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

### 2.编写统一返回实体类 (Result)

引入泛型 `<T>`，并利用上面定义的枚举类。

```java
@Data
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    // 私有化构造方法，强制用户使用提供的静态方法
    private Result() {}

    private Result(Integer code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /**
     * 成功返回结果 (无数据)
     */
    public static <T> Result<T> success() {
        return new Result<>(ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMessage(), null);
    }

    /**
     * 成功返回结果 (带有数据)
     * @param data 获取的数据
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMessage(), data);
    }

    /**
     * 成功返回结果 (自定义提示信息和数据)
     */
    public static <T> Result<T> success(String message, T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), message, data);
    }

    /**
     * 失败返回结果 (使用默认的内部错误)
     */
    public static <T> Result<T> error() {
        return new Result<>(ResultCode.ERROR.getCode(), ResultCode.ERROR.getMessage(), null);
    }

    /**
     * 失败返回结果 (自定义错误码和错误信息)
     */
    public static <T> Result<T> error(Integer code, String message) {
        return new Result<>(code, message, null);
    }

    /**
     * 失败返回结果 (自定义错误信息)
     */
    public static <T> Result<T> error(String message) {
        return new Result<>(ResultCode.ERROR.getCode(), message, null);
    }

    /**
     * 失败返回结果 (使用指定的枚举错误码)
     */
    public static <T> Result<T> error(ResultCode resultCode) {
        return new Result<>(resultCode.getCode(), resultCode.getMessage(), null);
    }
}
```



## 二.ResultCode六大方法

### 一、 成功返回（Success 系列）

**1. `Result.success()` —— 成功（无数据返回）**

- **适用场景**：前端只需要知道操作成功了，不需要拿到具体数据。比如：删除、修改、发送验证码、退出登录等。
- **代码示例**：

```java
@DeleteMapping("/deleteUser/{id}")
public Result<Void> deleteUser(@PathVariable Long id) {
    userService.removeById(id);
    // 告诉前端：删除成功！(默认 code=200, msg="操作成功", data=null)
    return Result.success(); 
}
```

**2. `Result.success(T data)` —— 成功（携带核心数据）**

- **适用场景**：这是**最常用**的方法。比如查询详情、获取列表、登录返回 Token 等。
- **代码示例**：

```java
@GetMapping("/getUser/{id}")
public Result<User> getUser(@PathVariable Long id) {
    User user = userService.getById(id);
    // 告诉前端：查询成功，并把 user 对象塞进 data 里！
    return Result.success(user); 
}
```

**3. `Result.success(String message, T data)` —— 成功（自定义提示语 + 携带数据）**

- **适用场景**：既要返回数据，又要给前端一个特定的弹窗提示语。比如登录成功后提示“欢迎回来”，或者签到成功提示“连续签到3天，获得奖励”。
- **代码示例**：

```java
@PostMapping("/login")
public Result<String> login(@RequestBody LoginDTO dto) {
    String token = authService.login(dto);
    // 告诉前端：登录成功提示语，并返回 token
    return Result.success("登录成功，欢迎回来！", token); 
}
```

### 二、 失败返回（Error 系列）

**4. `Result.error()` —— 失败（默认系统异常）**

- **适用场景**：遇到不可预知的系统崩溃或兜底的异常捕获时使用。它会返回你在枚举里定义的默认错误（比如 code=500, msg="系统内部异常"）。
- **代码示例**：

```java
@GetMapping("/doSomething")
public Result<String> doSomething() {
    try {
        int i = 1 / 0; // 模拟系统发生严重异常
    } catch (Exception e) {
        // 记录日志...
        return Result.error(); 
    }
    return Result.success();
}
```

**5. `Result.error(String message)` —— 失败（自定义错误提示语）**

- **适用场景**：业务逻辑校验不通过，需要直接告诉用户为什么失败，但不需要特别细分错误码（统一用默认错误码 500 即可）。
- **代码示例**：

```java
@PostMapping("/register")
public Result<Void> register(@RequestBody User user) {
    if (userService.checkUsernameExists(user.getUsername())) {
        // 直接告诉前端具体的错误原因，前端可以直接将这个 msg 弹窗显示
        return Result.error("该用户名已被注册，请更换一个！");
    }
    userService.save(user);
    return Result.success();
}
```

**6. `Result.error(ResultCode resultCode)` —— 失败（使用指定的枚举状态码）**

- **适用场景**：需要严格区分不同错误类型的场景，前端会根据特定的 `code` 做出不同反应。比如：`code=401` 前端就跳登录页，`code=403` 前端就提示无权限。
- **代码示例**：

```java
@GetMapping("/getSecretData")
public Result<String> getSecretData(@RequestHeader("Authorization") String token) {
    if (!tokenService.isValid(token)) {
        // 明确返回 UNAUTHORIZED (401, "暂未登录或token已经过期")
        return Result.error(ResultCode.UNAUTHORIZED);
    }
    return Result.success("这是机密数据");
}
```



在真实的企业开发中，我们**很少会在 Controller 里大量写 `Result.error(...)`**。

通常的做法是：

1. Controller 里面**只管写成功**的逻辑，最后 `return Result.success(...)`。
2. 遇到失败的逻辑，直接 `throw new CustomException("用户名已存在")` 抛出异常。
3. 配合 Spring Boot 的 `@RestControllerAdvice`（全局异常处理器）去统一拦截这些异常，然后在处理器里面调用 `Result.error(...)` 包装成统一格式返回给前端。

这样你的 Controller 代码会非常干净，全是正常业务逻辑，没有各种恶心的 `if-else` 返回错误结果的代码。
