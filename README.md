# AIGC Cloud Frontend

基于 Next.js 的 AI 创作平台前端。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: Tailwind CSS + Radix UI + Shadcn/ui
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod
- **Web3**: ethers.js
- **国际化**: next-intl

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 代码检查
pnpm lint

# 启动服务
pnpm start -p 3001
```

### 启动开发服务

```bash
pnpm dev
```

访问地址：

- 用户端：http://localhost:3001
- 管理后台：http://localhost:3001/admin
- 运营后台：http://localhost:3001/operator

### 默认内置账号（由后端启动时自动创建）

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| admin | Admin@123456 | 管理员 |
| operator | Operator@123456 | 运营管理员 |
| testuser | Test@123456 | 普通用户（测试）|

> 其他普通用户请通过注册页自行注册。

### 构建生产版本

```bash
pnpm build
```

### PM2 守护进程（可选）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start "npx next start -p 3001" --name aigccloud-frontend

# 开机自启
pm2 startup
pm2 save

# 常用命令
pm2 restart aigccloud-frontend   # 重启
pm2 stop aigccloud-frontend      # 停止
pm2 delete aigccloud-frontend    # 删除进程
pm2 status                       # 查看状态
pm2 logs aigccloud-frontend      # 查看日志
```

## 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# E2E 测试 (UI 模式)
pnpm test:e2e:ui
```

## 目录结构

```
src/
├── app/           # 页面路由
├── components/    # 组件
├── hooks/         # 自定义 Hooks
├── lib/           # 工具函数
├── store/         # 状态管理
├── types/         # 类型定义
└── i18n/          # 国际化
```
