# cy3's site

[English](/README.md) | [Chinese](/README_zh.md)

<p align="center">
  <a href="/LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg" />
  </a>
  <img alt="Language" src="https://img.shields.io/badge/language-TypeScript-blue" />
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Hono+JSX-blue?style=flat&logo=hono" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-Hono-orange" />
  <img alt="Database" src="https://img.shields.io/badge/database-Cloudflare%20D1-brightgreen?style=flat&logo=sqlite" />
  <img alt="Website" src="https://img.shields.io/badge/website-cy3.cc.cd-blue" />
</p>


<p align="center">
  <img alt="GitHub stars" src="https://img.shields.io/github/stars/chenyuan33/cy3-cc-cd?style=social" />
  <img alt="GitHub forks" src="https://img.shields.io/github/forks/chenyuan33/cy3-cc-cd?style=social" />
  <img alt="GitHub watchers" src="https://img.shields.io/github/watchers/chenyuan33/cy3-cc-cd?style=social" />
</p>

[Star History](https://www.star-history.com/?repos=chenyuan33%2Fcy3-cc-cd&type=date&legend=top-left)

<a href="https://www.star-history.com/?repos=chenyuan33%2Fcy3-cc-cd&type=date&legend=top-left">

 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=chenyuan33/cy3-cc-cd&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=chenyuan33/cy3-cc-cd&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=chenyuan33/cy3-cc-cd&type=date&legend=top-left" />
 </picture>

</a>

一个网站。部署在 Cloudflare Worker 上。

## 本地部署

1. 克隆仓库
	``` bash
	git clone https://github.com/chenyuan33/cy3-cc-cd.git
	cd cy3-cc-cd
	```
2. 安装依赖
	``` bash
	npm install
	```
3. 配置环境
	``` bash
	cp .env.example .env
	node -e "const fs=require('fs'),crypto=require('crypto');const secret=crypto.randomBytes(32).toString('hex');let env=fs.readFileSync('.env','utf8');env=env.replace(/^SECRET=.*$/m, `SECRET=${secret}`);fs.writeFileSync('.env',env);"
	```
4. 初始化数据库（若只是更新，可以只运行更新部分的 sql 文件内容）
	``` bash
	npx wrangler d1 execute <database-name> --local --file=database_init.sql
	```
5. 启动开发服务器
	``` bash
	npm run dev
	```
	或
	``` bash
	npm run start
	```
6. 注册管理员账号
	注册完第一个用户后，运行 `UPDATE users SET permission = permission | 4 WHERE id = 1` 给 uid 为 1 的用户管理员权限。

## 云端部署

请在你的 Cloudflare 账号创建一个 D1 数据库并替换 /wrangler.jsonc 中的 `d1_databases` 内容。之后，可以通过 `npm run deploy` 进行部署。

## 特殊功能启用方式

若在未完成以下操作之前使用，结果是未定义的。

### 签到

初始化完数据库后打开 /admin，分别提交四个签到文本，其中两个的 Good 项不填，另外两个的 Bad 项不填。

### 邮箱验证

找 @cqiming (https://cy3.cc.cd/user/8) 获取 token 和 token user 并添加为 .env 中 `EMAIL_VERIFY_TOKEN` 和 `EMAIL_VERIFY_TOKEN_USER` 的值。

## 贡献指南

建议或 Bug 反馈可以在 [Issues](https://github.com/chenyuan33/cy3-cc-cd/issues/new) 或[工单](https://cy3.cc.cd/ticket)中提出。

我们欢迎贡献，请遵循以下步骤：

1. Fork 本仓库
2. 创建你的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交你的更改（`git commit -m 'Add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启一个 Pull Request

请在对功能进行必要的测试后再开启 Pull Request。

