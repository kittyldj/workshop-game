# 第三方组件声明

本作品内联了以下第三方代码。它们的许可证与本项目不同，**分发时必须保留其版权声明**。

## Three.js

- 版本：r160（`build/three.min.js`，UMD 构建）
- 网站：<https://threejs.org/>
- 许可证：**MIT**
- 版权：Copyright © 2010-2023 Three.js Authors
- 位置：`src/three.min.js`，构建后内联进 `index.html`

Three.js 的 `@license` 注释块已随压缩代码一并保留在产物中（搜索 `SPDX-License-Identifier: MIT` 可定位）。

MIT 许可证全文：

```
The MIT License

Copyright © 2010-2023 Three.js Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## 美术与音频资源

**无。** 所有几何体、贴图、音效均由代码在运行时生成，
仓库中不含任何第三方图片、模型、字体或音频文件。
