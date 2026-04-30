<div align="center">
  <br>
  <a href="https://github.com/CikimCikim/Download-CF2GH/actions/workflows/deploy.yml">
    <img src="https://img.shields.io/badge/🚀_RUN_MANUAL_DEPLOY-2ea44f?style=for-the-badge&logo=cloudflare&logoColor=white" width="450" alt="Deploy Button">
  </a>
  <br>
  <p><i>Click above to trigger the GitHub Action manually</i></p>
</div>


<div dir="rtl">

# 🤖 ربات تلگرام — Cloudflare Worker

<div align="center">


یک ربات تلگرامی قدرتمند بر پایه **Cloudflare Workers** که از **GitHub** به‌عنوان فضای ذخیره‌سازی فایل و **KV** برای کش استفاده می‌کند.

</div>

---

## 📋 فهرست مطالب

- [معرفی پروژه](#-معرفی-پروژه)
- [پیش‌نیازها](#-پیش-نیازها)
- [مرحله ۱ — ساخت ربات تلگرام](#-مرحله-۱--ساخت-ربات-تلگرام)
- [مرحله ۲ — تنظیمات Cloudflare](#-مرحله-۲--تنظیمات-cloudflare)
- [مرحله ۳ — ویرایش فایل wrangler.toml](#-مرحله-۳--ویرایش-فایل-wranglertoml)
- [مرحله ۴ — تنظیم Secrets در GitHub](#-مرحله-۴--تنظیم-secrets-در-github)
- [مرحله ۵ — دیپلوی پروژه](#-مرحله-۵--دیپلوی-پروژه)
- [مرحله ۶ — ست کردن Webhook](#-مرحله-۶--ست-کردن-webhook)
- [محدودیت‌های پلن رایگان](#-محدودیتهای-پلن-رایگان)

---

## 🌟 معرفی پروژه

این پروژه یک ربات تلگرامی است که:

- روی **Cloudflare Workers** اجرا می‌شود (کاملاً رایگان و بدون سرور)
- از **GitHub Actions** برای دانلود و آپلود فایل استفاده می‌کند
- فایل‌ها را در **ریپوزیتوری GitHub** ذخیره می‌کند
- فهرست فایل‌ها را در **Cloudflare KV** کش می‌کند

---

## 🛒 پیش‌نیازها

قبل از شروع، مطمئن شو که این‌ها رو داری:

| مورد | توضیح |
|------|-------|
| حساب GitHub | رایگان — [ثبت‌نام](https://github.com/signup) |
| حساب Cloudflare | رایگان — [ثبت‌نام](https://dash.cloudflare.com/sign-up) |
| اکانت تلگرام | داری که داری 😄 |

---

## 📱 مرحله ۱ — ساخت ربات تلگرام

### ۱.۱ — ساخت ربات از BotFather

۱. توی تلگرام سرچ کن: **@BotFather**
۲. روی **Start** بزن
۳. بنویس: `/newbot`
۴. یه اسم برای ربات بده (مثلاً: `My Download Bot`)
۵. یه یوزرنیم بده که حتماً به `bot` ختم بشه:

</div>

```
✅ درست:   mydownloader_bot
✅ درست:   FileManagerBot
❌ غلط:    mydownloader
❌ غلط:    bot_myfile
```

<div dir="rtl">

۶. بعد از ساخت، BotFather یه پیام می‌فرسته که توکن ربات توشه:

</div>

```
Use this token to access the HTTP API:
7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

<div dir="rtl">

> 🔑 **BOT_TOKEN** — همون توکن بالاست. فرمتش اینه: یه عدد، بعد دونقطه، بعد یه رشته حروف و عدد.
>
> این رو یه جا نگه دار — بعداً لازمه.

---

### ۱.۲ — پیدا کردن آیدی عددی تلگرامت

۱. توی تلگرام سرچ کن: **@userinfobot**
۲. روی **Start** بزن
۳. ربات یه پیام می‌فرسته:

</div>

```
Id: 123456789
First: علی
Last: محمدی
```

<div dir="rtl">

> 🔑 **OWNER_ID** — همون عدد کنار `Id:` هست. فقط عدد، بدون هیچ چیز اضافه.

---

## ☁️ مرحله ۲ — تنظیمات Cloudflare

### ۲.۱ — ساخت KV Namespace

**KV** یه دیتابیس ساده‌ست که ربات فهرست فایل‌ها رو توش ذخیره می‌کنه.

۱. برو به [dash.cloudflare.com](https://dash.cloudflare.com)
۲. از منوی سمت چپ روی **Workers & Pages** کلیک کن
۳. از زیرمنو **KV** رو انتخاب کن:

</div>

```
Workers & Pages
└── KV   ← اینجا
```

<div dir="rtl">

۴. روی دکمه آبی **Create a namespace** کلیک کن
۵. توی باکس اسم، دقیقاً این رو بنویس:

</div>

```
BOT_KV
```

<div dir="rtl">

۶. روی **Add** کلیک کن
۷. بعد از ساخت، یه ردیف جدید می‌بینی با یه آیدی طولانی:

</div>

```
BOT_KV    |    0fe7d6baa64347769a9a5a14742e0fd3    |   ...
```

<div dir="rtl">

> 🔑 **KV Namespace ID** — همون رشته‌ی طولانی وسطه. این رو کپی کن، توی مرحله ۳ لازمه.

---

### ۲.۲ — پیدا کردن Account ID

۱. توی داشبورد Cloudflare، از منوی سمت چپ روی **Workers & Pages** کلیک کن
۲. سمت راست صفحه، یه بخش **Account ID** می‌بینی:

</div>

```
Account ID
──────────────────────────
a1b2c3d4e5f6...........   [Copy]
```

<div dir="rtl">

۳. روی دکمه **Copy** کلیک کن

> 🔑 **CF_ACCOUNT_ID** — همون آیدیه که کپی کردی.

---

### ۲.۳ — ساخت API Token

۱. از گوشه راست بالای صفحه روی آیکن پروفایلت کلیک کن
۲. روی **My Profile** کلیک کن
۳. از منوی بالا روی **API Tokens** کلیک کن
۴. روی **Create Token** کلیک کن
۵. از لیست template‌ها، **Edit Cloudflare Workers** رو انتخاب کن
۶. تنظیمات باید این‌شکلی باشه:

</div>

```
Permissions:
✅ Account — Workers KV Storage — Edit
✅ Account — Workers Scripts   — Edit
✅ Account — Workers Routes    — Edit

Account Resources:  Include — All accounts
Zone Resources:     Include — All zones
```

<div dir="rtl">

۷. روی **Continue to summary** و بعد **Create Token** کلیک کن
۸. توکن رو کپی کن — **فقط یه بار نشون داده می‌شه!**

> 🔑 **CF_API_TOKEN** — همون توکنیه که کپی کردی.

---

## 📝 مرحله ۳ — ویرایش فایل wrangler.toml

حالا باید آیدی KV که توی مرحله ۲.۱ گرفتی رو توی فایل `wrangler.toml` جایگذاری کنی.

۱. توی ریپوزیتوری GitHub فورک‌شده‌ات، فایل `wrangler.toml` رو باز کن
۲. روی آیکن ویرایش (قلم ✏️) کلیک کن
۳. خط `id` رو پیدا کن و آیدی قدیمی رو با آیدی KV خودت عوض کن:

</div>

```toml
[[kv_namespaces]]
binding = "BOT_KV"
id = "اینجا_آیدی_KV_خودت_رو_بذار"
```

<div dir="rtl">

۴. پایین صفحه روی **Commit changes** کلیک کن
۵. یه پیام بنویس (مثلاً: `update KV id`) و دوباره **Commit changes** بزن

---

## 🔐 مرحله ۴ — تنظیم Secrets در GitHub

> ⚠️ **مهم:** این تنظیمات توی **Settings ریپوزیتوری** انجام می‌شه، نه Settings اکانت!

### چطور Secret اضافه کنیم؟

۱. توی ریپوزیتوری فورک‌شده‌ات برو به تب **Settings**
۲. از منوی سمت چپ روی **Secrets and variables** کلیک کن
۳. از زیرمنو **Actions** رو انتخاب کن:

</div>

```
Settings (ریپو)
└── Secrets and variables
    └── Actions   ← اینجا
```

<div dir="rtl">

۴. روی **New repository secret** کلیک کن
۵. اسم و مقدار رو وارد کن و **Add secret** بزن

برای هر ۸ تا Secret پایین، این کارو تکرار کن:

---

### `BOT_TOKEN`

توکنی که BotFather داد.

</div>

```
Name:   BOT_TOKEN
Value:  7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

<div dir="rtl">

### `OWNER_ID`

آیدی عددی تلگرام خودت که از @userinfobot گرفتی — فقط عدد، هیچی اضافه نکن.

</div>

```
Name:   OWNER_ID
Value:  123456789
```

---

<div dir="rtl">

### `CF_ACCOUNT_ID`

آیدی اکانت Cloudflare از مرحله ۲.۲.

</div>

```
Name:   CF_ACCOUNT_ID
Value:  a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

---

<div dir="rtl">

### `CF_API_TOKEN`

توکن API کلادفلر از مرحله ۲.۳.

</div>

```
Name:   CF_API_TOKEN
Value:  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

<div dir="rtl">

### `MY_GH_TOKEN`

توکن شخصی GitHub — این رو باید بسازی.

> ⚠️ **توجه:** این تنظیم توی **Settings اکانت GitHub** انجام می‌شه، نه Settings ریپوزیتوری!

**مراحل ساخت:**

۱. روی عکس پروفایلت توی GitHub کلیک کن (گوشه راست بالا)
۲. **Settings** رو انتخاب کن
۳. از منوی سمت چپ، تا آخر اسکرول کن و روی **Developer settings** کلیک کن
۴. روی **Personal access tokens** کلیک کن
۵. **Tokens (classic)** رو انتخاب کن
۶. روی **Generate new token** و بعد **Generate new token (classic)** کلیک کن
۷. تنظیمات:

</div>

```
Note:       my-bot-token
Expiration: No expiration

Scopes:
✅ repo     (همه زیرگزینه‌هایش تیک می‌خوره)
✅ workflow
```

<div dir="rtl">

۸. روی **Generate token** کلیک کن و توکن رو کپی کن — **فقط یه بار نشون داده می‌شه!**

توکن GitHub همیشه با `ghp_` شروع می‌شه:

</div>

```
Name:   MY_GH_TOKEN
Value:  ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

<div dir="rtl">

### `REPO_OWNER`

یوزرنیم GitHub خودت — نه ایمیل، نه اسم واقعی.

برای پیدا کردنش نگاه کن به آدرس پروفایلت:

</div>

```
https://github.com/[اینجا_یوزرنیمته]
```

```
Name:   REPO_OWNER
Value:  your-github-username
```

---

<div dir="rtl">

### `REPO_NAME`

اسم دقیق ریپوزیتوری.

برای پیدا کردنش نگاه کن به آدرس ریپو:

</div>

```
https://github.com/username/[اینجا_اسم_ریپوته]
```

```
Name:   REPO_NAME
Value:  your-repo-name
```

---

<div dir="rtl">

### `WORKER_URL`

آدرس Worker کلادفلر — **بعد از دیپلوی (مرحله ۵) پیداش می‌کنی.**

فرمت کلی:

</div>

```
https://[نام-worker].[subdomain].workers.dev
```

<div dir="rtl">

مثال:

</div>

```
Name:   WORKER_URL
Value:  https://my-telegram-bot.username.workers.dev
```

---

<div dir="rtl">

## 🚀 مرحله ۵ — دیپلوی پروژه

> ✅ مطمئن شو همه Secrets (به‌جز `WORKER_URL`) ست شدن و فایل `wrangler.toml` آپدیت شده.

۱. توی ریپوزیتوری GitHub برو به تب **Actions**
۲. از منوی سمت چپ **Deploy to Cloudflare** رو انتخاب کن
۳. روی **Run workflow** و بعد دکمه سبز **Run workflow** کلیک کن

صبر کن حدود ۱ دقیقه — وقتی تیک سبز اومد، دیپلوی موفق بوده.

### بعد از دیپلوی — پیدا کردن WORKER_URL

۱. برو به [dash.cloudflare.com](https://dash.cloudflare.com)
۲. روی **Workers & Pages** کلیک کن
۳. روی Worker جدیدت کلیک کن
۴. آدرس Worker رو کپی کن:

</div>

```
https://my-telegram-bot.username.workers.dev
```

<div dir="rtl">

۵. این آدرس رو به‌عنوان **WORKER_URL** در GitHub Secrets ست کن (مرحله ۴ رو دوباره انجام بده).

---

## 🔗 مرحله ۶ — ست کردن Webhook

### ۶.۱ — ست کردن Webhook

توی مرورگر این آدرس رو باز کن — فقط مقادیر داخل کروشه رو با مقادیر خودت عوض کن:

</div>

```
https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=[WORKER_URL]/webhook
```

<div dir="rtl">

مثال واقعی:

</div>

```
https://api.telegram.org/bot7123456789:AAFxxx.../setWebhook?url=https://my-telegram-bot.username.workers.dev/webhook
```

<div dir="rtl">

اگه موفق بود، این جواب رو می‌بینی:

</div>

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

<div dir="rtl">

### ۶.۲ — ثبت دستورات ربات

این آدرس رو توی مرورگر باز کن — آدرس Worker خودت رو بذار:

</div>

```
https://my-telegram-bot.username.workers.dev/setup
```

<div dir="rtl">

اگه جواب `Bot commands registered.` گرفتی — همه چیز درسته! ✅

### ۶.۳ — تست ربات

۱. توی تلگرام ربات خودت رو پیدا کن
۲. بنویس `/start`
۳. اگه جواب گرفتی — ربات داره! 🎉

---

## 📊 محدودیت‌های پلن رایگان

### Cloudflare Workers

| محدودیت | مقدار |
|---------|-------|
| درخواست روزانه | ۱۰۰,۰۰۰ درخواست/روز |
| CPU time | ۱۰ میلی‌ثانیه/درخواست |
| KV خواندن | ۱۰۰,۰۰۰ عملیات/روز |
| KV نوشتن | ۱,۰۰۰ عملیات/روز |
| حجم KV | ۱ گیگابایت کل |

### GitHub Actions

| محدودیت | مقدار |
|---------|-------|
| دقیقه ماهانه | ۲,۰۰۰ دقیقه/ماه |
| حجم توصیه‌شده ریپو | تا ۱ گیگابایت |
| حداکثر اندازه هر فایل | ۱۰۰ مگابایت (بزرگ‌ترها خودکار تقسیم می‌شن) |
| همزمانی workflow | ۲۰ job موازی |

> هر دانلود معمولاً ۲ تا ۵ دقیقه از Actions می‌خوره.

---

## 🗂️ ساختار فایل‌های پروژه

</div>

```
📁 your-repo/
├── index.js              ← کد اصلی ربات (Cloudflare Worker)
├── wrangler.toml         ← تنظیمات Worker و KV
├── package.json          ← وابستگی‌ها
├── 📁 .github/workflows/
│   ├── deploy.yml        ← دیپلوی خودکار به Cloudflare
│   ├── download.yml      ← دانلود فایل از لینک
│   ├── sync.yml          ← همگام‌سازی فهرست فایل‌ها با KV
│   └── wipe.yml          ← حذف فایل‌ها
└── 📁 downloads/         ← فایل‌های دانلود‌شده اینجا ذخیره می‌شن
```

<div dir="rtl">

---

## ❓ سوالات رایج

**ربات جواب نمی‌ده؟**
مطمئن شو که Webhook درست ست شده. مرحله ۶.۱ رو دوباره انجام بده.

**خطای دیپلوی می‌گیرم؟**
بررسی کن `CF_API_TOKEN` و `CF_ACCOUNT_ID` درست ست شدن.

**دانلود شروع نمی‌شه؟**
مطمئن شو `MY_GH_TOKEN` داره permission های `repo` و `workflow` رو.

**WORKER_URL رو کجا پیدا کنم؟**
Cloudflare Dashboard ← Workers & Pages ← روی Worker خودت کلیک کن ← آدرس نشون داده‌شده.

</div>
