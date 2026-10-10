---
title: 8.json
description: JSONJSON只是一种文本格式的数据表示，它只有6种值：对象{"key":value}数组1,2,3字符串"hello"数字123/3.14布尔true/false空null关键认知：JSON没有类
pubDate: 2026-10-10
series: Java
order: 8
source: Java/类/1.json
---

# JSON

JSON 只是一种**文本格式的数据表示**，它只有 6 种值：

```
对象      {"key": value}
数组      [1, 2, 3]
字符串    "hello"
数字      123 / 3.14
布尔      true / false
空        null
```

关键认知：**JSON 没有类（class）的概念**。`{"name":"北京营业部","bid":1}` 就是一段文本，它不“属于”任何 Java 类。所谓“转成对象”，是把这段文本的键值对**映射**到某个 Java 类的同名字段上。



## 1. 解析后取出的是什么类

当你在 Java 里解析 JSON 字符串时，有两条路：

**路线 1：解析成“JSON 树”模型（取出的是 JSON 库自己的容器类）**

```
String ──parse──→ JSONObject / JSONArray ──get──→ 具体值
```

- **`JSONObject`**：本质是一个 `Map<String, Object>` 的包装，对应 JSON 的 `{}`。
- **`JSONArray`**：本质是一个 `List<Object>` 的包装，对应 JSON 的 `[]`
- 取出来的**叶子值**是 Java 基础类型：`getStr()` → `String`、`getLong()` → `Long`、`getBool()` → `Boolean`、`getObj()` → `Object`



**路线 2：直接映射成业务类（JavaBean）**

```
String ──toBean──→ OrganDTO（你的业务类）
```

跳过手动取值，库通过反射把同名字段直接填进去。



## 2. 示例

```java
// msg 是 MQ 传来的字符串：
// {"type":"ORG","operation":"ADD","content":[{"id":"973","parentId":"0","name":"测试组织","status":true}]}

// ① parseObj：String → JSONObject
JSONObject jsonObject = JSONUtil.parseObj(msg);
```

此时 `jsonObject` 的真实结构（hutool 的 JSONObject 内部就是个 Map）：

```
jsonObject (JSONObject ≈ Map)
 ├─ "type"      → "ORG"            (String)
 ├─ "operation" → "ADD"            (String)
 └─ "content"   → JSONArray ≈ List
                    └─ [0] JSONObject ≈ Map
                          ├─ "id"       → "973"
                          ├─ "parentId" → "0"
                          ├─ "name"     → "测试组织"
                          └─ "status"   → true
// ② 从树上取叶子值，拿到的就是 String/Long/Boolean 这些 Java 类型
String type = jsonObject.getStr("type");            // String "ORG"
String operation = jsonObject.getStr("operation");  // String "ADD"

// ③ 取数组 → 取数组里的对象 → 强转回 JSONObject
JSONObject content = (JSONObject) jsonObject.getJSONArray("content").getObj(0);
```

第 ③ 行值得细说：`getJSONArray("content")` 拿到 `JSONArray`（≈List），`.getObj(0)` 取出第 0 个元素，声明类型是 `Object`——但我们知道它原本就是嵌套的 JSON 对象，所以强转回 `JSONObject`。



## 3. 总结

```
                    ┌─ 路线1：树模型 ──→ JSONObject(≈Map) / JSONArray(≈List)
JSON字符串 ──解析──┤                        │ getStr/getLong/getBool
                    │                        ↓
                    │                   String / Long / Boolean / 嵌套JSONObject
                    │                        │ 手动 set（或 toBean 自动映射）
                    │                        ↓
                    └─ 路线2：直接映射 ──→ 业务类（OrganDTO / OLTEntity ...）
                                           ↑ 由你的代码/框架 new 出来
                                             JSON 库只负责填字段
```

**回答标题的问题**：“取出的 json 是什么类”——取决于你怎么取：

- `parseObj()` 取出 → **`JSONObject`**（hutool）/ `JSONObject`（fastjson）/ `JsonNode`（Jackson 树模型）
- `parseArray()` 取出 → **`JSONArray`**
- `toBean()` 取出 → **你指定的业务类**
- 从 JSONObject 上 `getStr/getLong/getBool` 取出 → **String/Long/Boolean** 等基础类型

一个实用建议：hutool 的 `JSONObject` 继承自 `JSON` 接口并实现了 `Map` 接口，所以它**可以当 Map 用**（`jsonObject.keySet()`、遍历 entry 都行），理解“JSONObject ≈ Map<String,Object> 的加强版（带类型转换取值方法）”这句话，这类代码就再也不会迷糊了。