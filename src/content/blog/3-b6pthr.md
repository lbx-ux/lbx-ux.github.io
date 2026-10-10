---
title: 3.图形验证码
description: 阿里云图形验证码（Captcha1.0.0）集成笔记
pubDate: 2026-07-01
series: 验证码
order: 2
source: 实战/验证码/3.图形认证.md
---

# 阿里云图形验证码（Captcha 1.0.0）集成笔记

## 一、概述

阿里云图形认证（Captcha）通过滑块拼图、图标点选等交互方式识别人机请求，用于防止短信接口被脚本恶意刷量。

**版本**：1.0.0（SDK 文件名 `ct4.js`）

**核心流程**：

```
用户点击"获取验证码"
  → 前端弹出图形验证码弹窗（滑块/拼图）
  → 用户完成人机验证
  → SDK 回调返回验证参数 (lot_number, captcha_output, pass_token, gen_time)
  → 前端将参数 + 手机号 POST 到后端 /user/code
  → 后端调用阿里云二次校验接口 https://captcha.alicaptcha.com/validate
  → 校验通过 → 发送短信验证码
```

---

## 二、后端实现（Spring Boot）

### 2.1 添加配置 `application.yaml`

```yaml
aliyun:
  captcha:
    app-id: 6b4d5628fe38e926dc609b22d95ea1ec    # 控制台创建方案后生成的 appId
    app-key: aaed0dea3b4a72e1796b6ca5c1aee3cd  # 控制台创建方案后生成的 appKey
```

### 2.2 配置属性类 `AliyunCaptchaProperties.java`

```java
package com.hmdp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "aliyun.captcha")
public class AliyunCaptchaProperties {
    private String appId;
    private String appKey;
}
```

**说明**：`@ConfigurationProperties(prefix = "aliyun.captcha")` 会自动将 `application.yaml` 中 `aliyun.captcha` 下的配置映射到这个类的字段上。`app-id`（横线）会自动匹配 `appId`（驼峰）。

### 2.3 二次校验 Helper `AliyunCaptchaHelper.java`

```java
package com.hmdp.utils;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.http.ContentType;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.hmdp.config.AliyunCaptchaProperties;
import com.hmdp.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class AliyunCaptchaHelper {

    private final AliyunCaptchaProperties captchaProperties;

    /**
     * 向阿里云图形认证服务发起二次校验
     *
     * @param lotNumber     前端 getValidate().lot_number（验证流水号）
     * @param captchaOutput 前端 getValidate().captcha_output（验证输出信息）
     * @param passToken     前端 getValidate().pass_token（验证通过标识）
     * @param genTime       前端 getValidate().gen_time（验证通过时间戳）
     * @return true: 人机验证通过, false: 验证失败
     */
    public boolean verifyCaptcha(String lotNumber, String captchaOutput,
                                  String passToken, String genTime) {

        // ========== 第1步：计算签名 sign_token ==========
        // 签名算法：HMAC-SHA256(lot_number, appKey) → 转 hex 小写字符串
        // lot_number 作为消息原文，appKey 作为 HMAC 密钥
        String signToken = SecureUtil.hmacSha256(captchaProperties.getAppKey())
                .digestHex(lotNumber);

        // ========== 第2步：构造 form 参数 ==========
        Map<String, Object> params = new HashMap<>();
        params.put("lot_number", lotNumber);
        params.put("captcha_output", captchaOutput);
        params.put("pass_token", passToken);
        params.put("gen_time", genTime);
        params.put("sign_token", signToken);

        // ========== 第3步：发送 POST 请求到二次校验接口 ==========
        // captcha_id 放在 URL 上，方便异常时从日志中定位
        String url = "https://captcha.alicaptcha.com/validate?captcha_id="
                + captchaProperties.getAppId();

        try {
            // 必须使用 application/x-www-form-urlencoded 格式发送
            String responseBody = HttpUtil.createPost(url)
                    .contentType(ContentType.FORM_URLENCODED.getValue())
                    .form(params)
                    .timeout(5000)   // 5秒超时
                    .execute()
                    .body();

            // ========== 第4步：解析响应 JSON ==========
            JSONObject json = JSONUtil.parseObj(responseBody);
            String status = json.getStr("status");
            String result = json.getStr("result");

            // status == "error" 表示请求本身有问题（如参数格式错误）
            if (StrUtil.equals(status, "error")) {
                log.error("图形验证码二次校验请求错误: code={}, msg={}",
                        json.getStr("code"), json.getStr("msg"));
                throw new BusinessException("图形验证服务异常，请稍后重试");
            }

            // result == "success" 表示人机验证通过
            if (StrUtil.equals(result, "success")) {
                log.info("图形验证码二次校验通过");
                return true;
            }

            // result == "fail" 表示人机验证不通过（如 pass_token 过期）
            log.warn("图形验证码二次校验不通过: result={}, reason={}",
                    result, json.getStr("reason"));
            return false;

        } catch (BusinessException e) {
            throw e;  // 业务异常直接抛出
        } catch (Exception e) {
            log.error("调用图形验证码二次校验接口遇到未知异常", e);
            throw new BusinessException("图形验证服务异常，请稍后重试");
        }
    }
}
```

**关键知识点**：

| 要点 | 说明 |
|------|------|
| **签名算法** | `HMAC-SHA256(lot_number, appKey)` → hex 小写。lot_number 是消息原文，appKey 是密钥 |
| **请求格式** | 必须是 `application/x-www-form-urlencoded`，否则会报 `illegal gen_time` 错误 |
| **URL 参数** | `captcha_id` 放在 URL query string 上，其余参数放在 POST body |
| **超时处理** | 设置 5 秒超时，避免因阿里云服务不可用而阻塞业务 |
| **错误分类** | `status="error"` 是请求错误，抛异常；`result="fail"` 是验证不通过，返回 false |
| **Hutool 工具** | `SecureUtil.hmacSha256()` 做签名，`HttpUtil.createPost()` 发请求，`JSONUtil.parseObj()` 解析响应 |

**二次校验接口返回的三种情况**：

```json
// 1. 校验成功
{ "status": "success", "result": "success", "reason": "", "captcha_args": {...} }

// 2. 校验失败（验证过期、签名错误等）
{ "status": "success", "result": "fail", "reason": "pass_token expire", "captcha_args": {...} }

// 3. 请求异常（参数格式错误等）
{ "status": "error", "code": "-50005", "msg": "illegal gen_time", "desc": {...} }
```

### 2.4 请求 DTO `CaptchaCodeDTO.java`

```java
package com.hmdp.dto;

import lombok.Data;

@Data
public class CaptchaCodeDTO {
    private String phone;
    private String lotNumber;
    private String captchaOutput;
    private String passToken;
    private String genTime;
}
```

**说明**：前端将手机号 + 4 个验证参数一起放在 JSON body 中传给后端。使用 DTO 而非 `@RequestParam` 的原因：
- 参数有 5 个，query param 会让 URL 过长
- 验证参数是敏感信息，放在 body 中更安全
- 与项目登录接口 `@RequestBody LoginFormDTO` 风格一致

### 2.5 修改 Controller `UserController.java`

```java
// 改动前
@PostMapping("code")
public Result<String> sendCode(@RequestParam("phone") String phone, HttpSession session) {
    return userService.sendCode(phone, session);
}

// 改动后
@PostMapping("code")
public Result<String> sendCode(@RequestBody CaptchaCodeDTO captchaCodeDTO, HttpSession session) {
    return userService.sendCode(captchaCodeDTO, session);
}
```

### 2.6 修改 Service 接口 `IUserService.java`

```java
// 改动前
Result<String> sendCode(String phone, HttpSession session);

// 改动后
Result<String> sendCode(CaptchaCodeDTO captchaCodeDTO, HttpSession session);
```

### 2.7 修改 Service 实现 `UserServiceImpl.java`

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    private final UserMapper userMapper;
    private final AliyunSmsHelper aliyunSmsHelper;
    private final AliyunCaptchaHelper aliyunCaptchaHelper;  // 新增注入
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public Result<String> sendCode(CaptchaCodeDTO dto, HttpSession session) {
        // 第1步：校验手机号格式
        String phone = dto.getPhone();
        if (RegexUtils.isPhoneInvalid(phone)) {
            throw new BusinessException("手机号格式错误！！！");
        }

        // 第2步：调用阿里云图形验证码二次校验
        boolean captchaPass = aliyunCaptchaHelper.verifyCaptcha(
                dto.getLotNumber(),
                dto.getCaptchaOutput(),
                dto.getPassToken(),
                dto.getGenTime()
        );
        if (!captchaPass) {
            throw new BusinessException("人机验证未通过，请重新尝试");
        }

        // 第3步：验证通过后才发送短信验证码
        aliyunSmsHelper.sendSmsCode(phone);
        return Result.success();
    }

    // ... login() 方法不变
}
```

**校验顺序**：手机号格式 → 图形验证码 → 短信发送。每一层校验失败都抛出 `BusinessException`，由 `GlobalExceptionHandler` 统一处理返回给前端。

---

## 三、前端实现（Vue 3）

### 3.1 引入 SDK

SDK 文件 `ct4.js` 需要从 [号码认证控制台](https://dypns.console.aliyun.com/overview) → API & SDK → 图形验证码 → 网页端 → h5 下载，放在 `frontend/public/` 目录下。

`index.html` 中引入：

```html
<head>
  <!-- ... -->
  <script src="/ct4.js"></script>
</head>
```

> **注意**：阿里云 Captcha 1.0 的 `ct4.js` 没有公共 CDN，必须下载后本地托管。

### 3.2 登录页集成（关键代码）

```javascript
// 全局常量 & 变量
const CAPTCHA_APP_ID = '6b4d5628fe38e926dc609b22d95ea1ec'
let captchaInstance = null

// 组件挂载时初始化
onMounted(() => {
  if (window.initAlicom4) {
    window.initAlicom4({
      captchaId: CAPTCHA_APP_ID,  // 控制台获取的 appId
      product: 'bind',            // 固定值
    }, (instance) => {
      captchaInstance = instance

      // 验证成功回调 — 获取验证参数，发送后端请求
      captchaInstance.onSuccess(() => {
        const validateData = captchaInstance.getValidate()
        doSendCode(validateData)  // 携带参数请求后端
      })

      // 验证出错回调 — 恢复按钮
      captchaInstance.onError(() => {
        codeDisabled.value = false
        ElMessage.warning('图形验证未完成，请重试')
      })

      // 用户关闭弹窗回调 — 恢复按钮
      captchaInstance.onClose(() => {
        codeDisabled.value = false
      })
    })
  }
})

// 组件销毁时清理
onBeforeUnmount(() => {
  if (captchaInstance) {
    captchaInstance.reset()
    captchaInstance = null
  }
})

// 点击"获取验证码" — 弹出图形验证码弹窗
const sendCode = () => {
  if (!form.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }

  codeDisabled.value = true
  if (captchaInstance) {
    captchaInstance.showCaptcha()  // 弹出验证弹窗
  } else {
    ElMessage.error('验证码服务未就绪，请刷新页面后重试')
    codeDisabled.value = false
  }
}

// 图形验证通过后，发送短信请求
const doSendCode = async (validateData) => {
  try {
    await request.post('/user/code', {
      phone: form.phone,
      lotNumber: validateData.lot_number,
      captchaOutput: validateData.captcha_output,
      passToken: validateData.pass_token,
      genTime: validateData.gen_time,
    })
    ElMessage.success('验证码发送成功')
    // 开启 60 秒倒计时...
  } catch (error) {
    codeDisabled.value = false
    ElMessage.error(typeof error === 'string' ? error : '验证码发送失败')
  }
}
```

### 3.3 SDK 关键 API 速查

| API | 说明 |
|-----|------|
| `window.initAlicom4({captchaId, product}, callback)` | 初始化，callback 接收 captcha 实例 |
| `captchaObj.showCaptcha()` | 弹出验证码弹窗 |
| `captchaObj.onSuccess(callback)` | 用户验证成功回调 |
| `captchaObj.getValidate()` | 获取验证结果，返回 `{lot_number, captcha_output, pass_token, gen_time}` |
| `captchaObj.onError(callback)` | 验证出错回调（网络问题、SDK 加载失败等） |
| `captchaObj.onClose(callback)` | 用户手动关闭弹窗回调 |
| `captchaObj.reset()` | 重置验证状态（验证失败后可重新验证） |
| `captchaObj.destroy()` | 销毁验证实例，移除 DOM 和事件监听 |

---

## 四、错误处理对照表

| 场景 | 前端表现 | 后端处理 |
|------|---------|---------|
| 手机号格式错误 | 前端正则拦截，不发请求 | Service 层双重校验，抛 `BusinessException` |
| SDK 未加载完成 | 点击按钮提示"验证码服务未就绪" | N/A |
| 用户关闭验证弹窗 | `onClose` 恢复按钮可点击状态 | N/A |
| 验证出错（网络等） | `onError` 恢复按钮，提示重试 | N/A |
| 后端二次校验 fail | 收到 `"人机验证未通过"` 提示 | `CaptchaHelper` 返回 false → `BusinessException` |
| 后端二次校验 API 报错 | 收到 `"图形验证服务异常"` 提示 | `CaptchaHelper` 抛 `BusinessException` |
| 请求超时（5s） | Axios timeout 触发 reject | Hutool HttpUtil 5000ms 超时 |

---

## 五、涉及文件清单

```
前端:
  frontend/public/ct4.js                              # SDK 文件（从控制台下载）
  frontend/index.html                                 # 引入 <script src="/ct4.js">
  frontend/src/views/Login.vue                        # onMounted 初始化 + sendCode 改造

后端:
  backend/src/main/resources/application.yaml         # 新增 aliyun.captcha 配置
  backend/src/main/java/.../config/AliyunCaptchaProperties.java  # 配置属性类（新增）
  backend/src/main/java/.../utils/AliyunCaptchaHelper.java       # 二次校验 Helper（新增）
  backend/src/main/java/.../dto/CaptchaCodeDTO.java              # 请求 DTO（新增）
  backend/src/main/java/.../controller/UserController.java       # sendCode 改为 @RequestBody
  backend/src/main/java/.../service/IUserService.java           # 接口签名修改
  backend/src/main/java/.../service/impl/UserServiceImpl.java   # 注入 CaptchaHelper，先校验再发短信
```
