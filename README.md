# 旅行星球

3D 地球点哪生哪的旅游攻略小玩具。点地球或城市标记,大模型现写一份当地攻略,可登录后收藏。

## 功能

- 3D 地球(react-globe.gl),全球 100 个主要城市黄色标记直接点击
- 任意经纬度反向地理编码 → 调用大模型生成结构化攻略
- 邮箱密码注册/登录,收藏喜欢的地点
- 同一地点(经纬度按 0.01° 归并)结果缓存,二次点击秒开
- 管理员后台:批量刷新所有缓存攻略 / 一键清空

## 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4
- react-globe.gl + three.js
- NextAuth (Credentials, JWT)
- Prisma 6 + MySQL
- 反向地理编码:OpenStreetMap Nominatim
- 大模型:任意 OpenAI 兼容协议(OpenAI / DeepSeek / 通义 / Kimi / OpenRouter / 自建中转)

## 本地开发

```bash
npm install
cp .env.example .env       # 按下面说明填值
npx prisma db push          # 首次建表
npm run dev
```

打开 http://localhost:3000

### .env 必填项

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/travel"
NEXTAUTH_SECRET="用 openssl rand -base64 32 生成"
NEXTAUTH_URL="http://localhost:3000"

LLM_PROVIDER="openai"
LLM_API_KEY="你的 key"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_MODEL="deepseek-chat"

NOMINATIM_CONTACT="你的邮箱或仓库 URL"
```

`LLM_PROVIDER=mock` 不需要 key,直接返回占位攻略,适合先跑通流程。

### 创建管理员账号

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="strong-password" npm run seed:admin
```

或者把这两行写进 `.env` 后 `npm run seed:admin`。

## 项目结构

```
app/
  api/
    attractions/        生成/缓存攻略
    auth/[...nextauth]  NextAuth 路由
    favorites/          收藏增删查
    register/           注册接口
    admin/              管理员批量操作
  admin/                管理员控制台
  favorites/            我的收藏
  login/ register/      登录/注册页
  page.tsx              首页(3D 地球)
components/
  GlobeView.tsx         3D 地球客户端组件
  GuidePanel.tsx        攻略侧栏 + 收藏按钮
  GuideContent.tsx      结构化攻略渲染
  NavBar.tsx            顶部导航
lib/
  auth.ts               NextAuth 配置
  geocode.ts            Nominatim 反向地理编码
  llm.ts                大模型抽象层
  guide-types.ts        攻略 JSON schema + 解析
  cities.ts             100 个全球城市标记数据
  prisma.ts             Prisma 单例
  rate-limit.ts         进程内限流
  admin-guard.ts        管理员鉴权
prisma/
  schema.prisma         User / Attraction / Favorite
public/textures/        本地化的地球贴图
```

## 大模型配置示例

| 服务 | LLM_BASE_URL | LLM_MODEL |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-sonnet-4-5` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 自建中转 | 你的中转地址 + `/v1` | 中转里映射的模型名 |

只要中转吐出 OpenAI 兼容的 `/chat/completions`,这套都通。

## 部署

服务器部署详见 [DEPLOY-aPanel.md](./DEPLOY-aPanel.md)(基于宝塔/aPanel + Nginx + PM2)。

## 已知限制

- 反向地理编码用 OSM Nominatim,部分海洋/无人区识别不出来,会提示"无法识别该位置"
- 限流是进程内 Map,PM2 cluster 多实例每实例独立计数
- 没做邮箱验证,注册即生效
- 大模型调用最长可能要 10-30 秒,看模型和服务商

## License

MIT
