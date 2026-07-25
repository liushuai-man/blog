---
title: Vue2响应式数据的核心方法
published: 2025-12-14
description: '在 Vue2 中，响应式数据的核心方法是 Object.defineProperty()。它允许你为对象定义新属性，或修改已有属性的特性（如是否可枚举、可修改、可删除等），是实现数据劫持（如 Vue 2 响应式）的基础。'
tags: ['Vue2']
category: Vue2
draft: false
---

Object.defineProperty() 是 JavaScript 中用于精确控制对象属性行为的核心方法，它允许你为对象定义新属性，或修改已有属性的特性（如是否可枚举、可修改、可删除等），是实现数据劫持（如 Vue 2 响应式）的基础。

语法

```javascript
Object.defineProperty(obj, prop, descriptor);
```

参数

| 参数         | 说明                                                   |
| ------------ | ------------------------------------------------------ |
| `obj`        | 要定义 / 修改属性的目标对象                            |
| `prop`       | 要定义 / 修改的属性名（字符串 / Symbol）               |
| `descriptor` | 属性描述符（对象），分两种类型：数据描述符、存取描述符 |

描述符只能是以下两种类型之一，不能混合使用（`value`/`writable` 和 `get`/`set` 互斥）：

1\. 数据描述符（控制属性值相关）

包含以下可选键：

value：属性的值（任意类型，默认 undefined）

writable：是否可修改属性值（布尔值，默认 false）

enumerable：是否可枚举（for...in/Object.keys 能否遍历到，默认 false）

configurable：是否可配置（能否删除属性 / 修改描述符，默认 false）

例如：

```javascript
const obj = {};

// 定义数据描述符属性
Object.defineProperty(obj, 'name', {
  value: '张三',
  writable: false, // 不可修改
  enumerable: false, // 不可枚举
  configurable: true, // 可配置（后续可修改描述符/删除）
});

//configurable: false 的限制：
//1.无法修改 enumerable、configurable 本身
//2.无法把 writable: false 改为 true（反之可以）
//3.无法删除该属性
//4.无法把数据描述符改为存取描述符（反之也不行）

console.log(obj.name); // 张三
obj.name = '李四'; // 严格模式下报错，非严格模式无效果
console.log(obj.name); // 张三（未被修改）

console.log(Object.keys(obj)); // []（不可枚举）
delete obj.name; // 可删除（configurable: true）
console.log(obj.name); // undefined
```

2\. 存取描述符（控制属性的读写逻辑）

包含以下可选键：

get：取值函数（访问属性时触发，默认 undefined）

set：存值函数（修改属性时触发，接收新值作为参数，默认 undefined）

enumerable：是否可枚举（默认 false）

configurable：是否可配置（默认 false）

例如：

```javascript
const obj = {
  age: 18,
};

// 定义存取描述符属性
Object.defineProperty(obj, 'age', {
  get() {
    console.log('读取age属性');
    return this.age;
  },
  set(newVal) {
    console.log('修改age属性为：', newVal);
    if (newVal < 0) {
      this.age = 0;
    } else {
      this.age = newVal;
    }
  },
  enumerable: true,
  configurable: true,
});

console.log(obj.age); // 读取age属性 → 18
obj.age = 20; // 修改age属性为：20
console.log(obj.age); // 读取age属性 → 20
obj.age = -5; // 修改age属性为：-5
console.log(obj.age); // 读取age属性 → 0
```

---

Object.defineProperty 只能定义单个属性，如需批量定义，可使用 Object.defineProperties；

对于数组，Object.defineProperty 无法拦截通过索引修改数组的行为（如 arr\[0\] = 1），Vue 2 中通过重写数组方法（push/pop 等）解决；

ES6 后新增的 Proxy 替代 Object.defineProperty 实现更全面的对象拦截（支持数组、动态属性等），但兼容性稍差。

---

总结就是，Object.defineProperty（）是Vue2用来将data中的属性定义存取描述符（getter/setter）实现数据拦截的方法
