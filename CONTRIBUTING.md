# 贡献指南

感谢您考虑为MCP Playwright Test项目做出贡献！这份文档将指导您如何参与项目开发。

## 开发流程

1. Fork本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交您的更改: `git commit -m 'Add some amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 提交Pull Request

## 开发环境设置

```bash
# 克隆项目
git clone https://github.com/yourusername/mcp-playwright-test.git
cd mcp-playwright-test

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test
```

## 代码风格

我们使用ESLint和Prettier来保持代码风格一致。请确保您的代码符合项目的代码风格规范。

```bash
# 运行代码检查
pnpm lint

# 自动修复代码风格问题
pnpm lint:fix
```

## 提交消息规范

我们使用约定式提交（Conventional Commits）来规范提交消息格式。提交消息应遵循以下格式：

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选页脚]
```

常用的类型包括：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更改
- `style`: 不影响代码含义的更改（空格、格式等）
- `refactor`: 既不修复bug也不添加功能的代码重构
- `perf`: 性能优化
- `test`: 添加缺失的测试或更正现有测试
- `chore`: 对构建过程或辅助工具的更改

## 报告Bug

如果您发现了bug，请在创建issue前先搜索是否已有相关问题。创建issue时，请提供：

1. 清晰的标题和描述
2. 重现步骤
3. 预期结果与实际结果
4. 环境信息（操作系统、Node.js版本等）
5. 相关日志或截图

## 功能请求

如果您希望添加新功能，建议先创建一个issue讨论该功能的必要性和实现方式。

## 许可证

通过贡献代码，您同意您的贡献将根据项目的MIT许可证进行许可。
