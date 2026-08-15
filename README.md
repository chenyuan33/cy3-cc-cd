# cy3's site

[English](/README.md) | [Chinese](/README_zh.md)

[![GitHub License](https://img.shields.io/github/license/chenyuan33/cy3-cc-cd)](/LICENSE)

![Star History](https://www.star-history.com/?repos=chenyuan33%2Fcy3-cc-cd&type=date&legend=top-left)

A website deployed on Cloudflare Workers.

## Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/chenyuan33/cy3-cc-cd.git
   cd cy3-cc-cd
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Configure environment
   ```bash
   cp .env.example .env
   node -e "const fs=require('fs'),crypto=require('crypto');const secret=crypto.randomBytes(32).toString('hex');let env=fs.readFileSync('.env','utf8');env=env.replace(/^SECRET=.*$/m, `SECRET=${secret}`);fs.writeFileSync('.env',env);"
   ```
4. Initialize the database (if you are only updating, you can just run the SQL from the update section)
   ```bash
   npx wrangler d1 execute <database-name> --local --file=database_init.sql
   ```
5. Start the development server
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm run start
   ```
6. Register an admin account
   After registering the first user, run `UPDATE users SET permission = permission & 4 WHERE id = 1` to grant admin privileges to the user with `uid = 1`.

## Cloud Deployment

Create a D1 database in your Cloudflare account and replace the `d1_databases` content in `/wrangler.jsonc` accordingly. Then you can deploy via `npm run deploy`.

## Enabling Special Features

Using these features before completing the steps below may lead to undefined behavior.

### Check-in

After initializing the database, open `/admin` and submit four check-in text entries, leaving the `Good` field empty for two of them, and the `Bad` field empty for the other two.

### Email Verification

Contact @cqiming (https://cy3.cc.cd/user/8) to obtain a token and token user, then add them as the values for `EMAIL_VERIFY_TOKEN` and `EMAIL_VERIFY_TOKEN_USER` in your `.env` file.

## Contributing

Suggestions or bug reports can be submitted via [Issues](https://github.com/chenyuan33/cy3-cc-cd/issues/new) or [Tickets](https://cy3.cc.cd/ticket).

We welcome contributions. Please follow these steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure you have tested your changes appropriately before opening a Pull Request.