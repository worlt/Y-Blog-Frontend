# Y-Blog · 审核端

这是 [Y-Blog 前端仓库](../README.md) 的审核端应用，默认开发端口为 **2001**。

请克隆完整仓库：本应用通过 `@common` 引用相邻的 `common/`，不能脱离它单独运行。

## 开发

在当前应用目录执行：

```bash
npm ci
npm run dev
```

后端默认位于 `http://localhost:8088`，API 代理配置见本目录的 `vite.config.js`。

## 构建

```bash
npm run build
npm run preview
```

静态产物位于本应用的 `dist/`。`preview` 只用于本地预览。

完整功能、联调与部署说明见 [根 README](../README.md)，安全要求见 [SECURITY.md](../SECURITY.md)。

原创代码使用 **AGPL-3.0-only**，见 [LICENSE](../LICENSE)。维护者：**worlt <2516930419@qq.com>**。
