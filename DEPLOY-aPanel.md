# aPanel 部署指南

适用于 aPanel（宝塔国际版）/ 宝塔面板。流程基本一致。

## 一、面板里准备环境

软件商店里安装：

- **Node.js 版本管理器**（装 Node 20 LTS）
- **MySQL 8.0**（或 5.7）
- **Nginx**
- **PM2 管理器**（推荐，用来守护 Node 进程）

## 二、建数据库

面板左侧 → **数据库** → 添加数据库

- 数据库名：`travel`
- 用户名：`travel`
- 密码：自己设一个强密码
- 字符集：`utf8mb4`

记下用户名、密码、端口（默认 3306）。

## 三、上传代码

**方式 ：直接上传**

文件管理 → 进入 `/www/wwwroot/` → 上传整个 `travel` 文件夹。

> 注意：不要上传 `node_modules` 和 `.next` 目录，到服务器上重装。

## 四、配置 `.env`

在 `/www/wwwroot/travel/.env` 编辑：

```env
DATABASE_URL="mysql://travel:你的密码@127.0.0.1:3306/travel"

NEXTAUTH_SECRET="用 openssl rand -base64 32 生成的随机串"
NEXTAUTH_URL="https://你的域名"

LLM_PROVIDER="openai"
LLM_API_KEY="你的key"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_MODEL="deepseek-chat"
```

`NEXTAUTH_URL` 必须和实际访问域名完全一致（包括 https），否则登录会跳错。

## 五、安装依赖、建表、构建

在面板终端里：

```bash
cd /www/wwwroot/travel
npm ci
npx prisma migrate deploy
npm run build
```

第一次执行 `npx prisma migrate deploy` 会按 `prisma/migrations` 里的迁移建表。

> 如果项目里还没有 migrations 目录（首次部署），改用：
> ```bash
> npx prisma migrate dev --name init
> ```
> 它会生成迁移文件 + 建表。之后再次部署用 `migrate deploy` 就行。

## 六、启动 Node 进程（用 PM2）

打开 PM2 管理器 → 添加项目：

- 项目名称：`travel`
- 运行目录：`/www/wwwroot/travel`
- 启动文件：`npm`
- 启动参数：`start`
- Node 版本：选你装的 20.x
- 端口：`3000`

点启动。

或者命令行：

```bash
cd /www/wwwroot/travel
pm2 start npm --name travel -- start
pm2 save
pm2 startup     # 按提示执行那行命令，开机自启
```

`pm2 logs travel` 看日志，`pm2 restart travel` 重启。

## 七、加站点 + 反向代理

网站 → **添加站点**

- 域名：填你的域名
- PHP 版本：纯静态
- 不勾选数据库、FTP

建好后，点站点名 → **反向代理** → 添加：

- 名称：`travel`
- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`
- 启用

保存。

## 八、申请 SSL

站点设置 → **SSL** → Let's Encrypt → 选中域名 → 申请 → 强制 HTTPS。

申请完了，确认 `.env` 里 `NEXTAUTH_URL` 是 `https://...` 开头，重启 PM2：

```bash
pm2 restart travel
```

## 九、设置管理员

项目自带 seed 脚本，推荐用法。先在 `.env` 里填好：

```env
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="一个强密码"
```

然后在终端执行：

```bash
cd /www/wwwroot/travel
npm run seed:admin
```

脚本会按邮箱 upsert：
- 账号不存在 → 直接创建管理员账号
- 账号已存在 → 把它升级为管理员（同时重置密码为 `ADMIN_PASSWORD`）

执行完登录这个邮箱，攻略侧栏右上角会出现橙色"刷新"按钮（仅管理员可见），点一下就重新调大模型生成攻略并覆盖数据库缓存。

> 安全提示：seed 跑完后，建议把 `.env` 里的 `ADMIN_PASSWORD` 留空或改掉，避免明文长期落在服务器上。下次需要重置时再填回来即可。

如果不想用脚本，也可以手动 SQL：

```bash
mysql -u travel -p travel
```

```sql
UPDATE User SET isAdmin = 1 WHERE email = '你的邮箱';
```

## 十、更新代码

git 方式：

```bash
cd /www/wwwroot/travel
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart travel
```

可以保存成 `deploy.sh`，每次更新 `bash deploy.sh`。

## 常见问题

**登录后立刻跳回登录页**
`NEXTAUTH_URL` 和实际访问域名不一致。检查 `.env`，包括 https 前缀。

**攻略里的中文乱码**
数据库不是 utf8mb4。建库时一定要选 utf8mb4，连接串无所谓。

**`npm run build` 内存不足**
小内存服务器（1G）容易 OOM。终端跑：

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

或临时开 swap。

**外网访问不了，但本地 curl 127.0.0.1:3000 正常**
反向代理没配好，或防火墙没开 80/443。安全组（云服务器）+ 系统防火墙都要放行。

**3000 端口不要对外暴露**
被 nginx 反代了，外面只走 80/443 就行。云服务器安全组别开 3000。
