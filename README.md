# tiny-vue3

学习《Vue.js设计与实现》并实现一个简版 Vue。

## 为什么要写这个项目？

### 一、学习记录

记录自己的学习过程，可以作为笔记回顾，大部分 commit 都对应到具体的章节内容。

### 二、实现一个简版 Vue

书上给的大部分还是代码的实现思路，官方代码库 [HcySunYang/code-for-vue-3-book](https://github.com/HcySunYang/code-for-vue-3-book)，给的也是每个章节对应的代码实现，都是单个的 `.html` 文件
，没有将其当做一个项目来划分目录和功能。

所以我参考 [vuejs/core](https://github.com/vuejs/core) 对文件目录和函数做了划分。

例如：/core/reactivity
```
├── __test__
    ├── computed.spec.js
    ├── effect.spec.js
    ├── ref.spec.js
    ├── scheduler.spec.js
    └── watch.spec.js
├── computed.js
├── effect.js
├── reactive.js
├── ref.js
└── watch.js
```

### 三、单元测试

有时候在实现新功能的时候因为书本勘误或自己实现的逻辑错误，导致之前实现的功能出现问题。所以引入 Jest 来做单元测试，保证项目功能的健壮性。
- 可以参考 [vuejs/core](https://github.com/vuejs/core) 提供的单元测试，可以通过补充单测来完善功能。
- 将每个章节的内容尽可能写成一个或者多个单测，可以通过 commit 记录查看。
- 测试用例在每个功能模块的 `__test__` 文件中。
 
PS：有些功能实在不知道怎么用 Jest 模拟，就写在 `.html` 里面了。
- 比如：【8.8 事件冒泡和更新时机问题】，见 **/core/run-time/__test__/test_bubbling.html**

## 安装

```shell
git clone git@github.com:Rye-z/tiny-vue3.git
```

```shell
pnpm install
```

## 使用

一定要搭配《Vue.js设计与实现》，因为细节真的很多，看代码看不明白的。

安装之后，可以通过 git，checkout 到具体的提交记录，可以调试对应章节代码和单元测试。

如果你使用 WebStorm：

![img.png](images/use_checkout.png)

通过 git 的 diff 功能，可以查看有哪些改动以及添加了哪些单元测试，你可以自己去 run/debug 单元测试。

![img.png](images/checkout_git_changes.png)

## 流程图

自己学习时，画的一些图，在 **/core/doc** 下，之后可能也会放一些文档。

#### 双端 Diff 算法
![双端diff](./doc/双端Diff算法.excalidraw.png)

#### 快速 Diff 算法
![快速diff](./doc/快速Diff算法.excalidraw.png)

