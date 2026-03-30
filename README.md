# 🥗 MacroTracker

A full-featured, cross-platform nutrition tracking app built with **Ionic Angular** and **Capacitor**. Track your daily macros, log meals, monitor water intake, visualize trends, and chat with **Milo** — your AI-powered nutrition assistant.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the App](#-running-the-app)
- [Building for Android](#-building-for-android)
- [App Walkthrough](#-app-walkthrough)
  - [Authentication](#-authentication)
  - [Today (Home)](#-today-home)
  - [Logging Food](#-logging-food)
  - [History & Templates](#-history--templates)
  - [Charts & Analytics](#-charts--analytics)
  - [Goals](#-goals)
  - [Settings](#-settings)
  - [Milo — AI Assistant](#-milo--ai-assistant)
- [Environment Variables](#-environment-variables)
- [Themes](#-themes)
- [Contributing](#-contributing)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📧 **OTP Login** | Passwordless email login via 6-digit OTP |
| 🍽️ **Meal Logging** | Create meals, add food items, mark meals complete |
| 🔍 **Food Search** | Search 300k+ foods via USDA FoodData Central API |
| 🤖 **AI Recipe Parsing** | Paste any recipe text — AI extracts all food items and macros |
| 💧 **Water Tracking** | Log daily water intake with quick +/- controls |
| 📊 **Charts** | Calorie trends, macro breakdowns, averages over 7/14/30 days |
| 📅 **History** | Browse past days, view macro summaries, navigate by date |
| 📋 **Meal Templates** | Save and reuse meal configurations |
| 🎯 **Custom Goals** | Set personal calorie, protein, carbs, fat and fiber targets |
| 👤 **User Profile** | Name, age, gender, weight, height, activity level |
| 🎨 **5 Themes** | Aurora, Ember, Midnight, Coral, Mint |
| 🧠 **Milo AI Chat** | Context-aware AI assistant with persistent conversation memory |
| ☁️ **Cloud Sync** | Data synced to MongoDB via REST API |
| 📱 **Native Android** | Packaged with Capacitor for Android |

---

## 🛠 Tech Stack

### App
| Layer | Technology |
|---|---|
| Framework | [Ionic Angular](https://ionicframework.com/) v8 |
| Language | TypeScript / Angular v20 |
| Native Runtime | [Capacitor](https://capacitorjs.com/) v8 |
| Local Storage | `@ionic/storage-angular` (IndexedDB) |
| Charts | [Chart.js](https://www.chartjs.org/) v4 |
| HTTP | Angular `HttpClient` |

### Server
| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Database | MongoDB Atlas |
| Email | Nodemailer (SMTP) |
| AI | OpenAI GPT-4o mini |
| Nutrition Data | USDA FoodData Central API |
| Deployment | Docker + Nginx |

---

## 📁 Project Structure

```
macro-tracker/
├── src/
│   ├── app/
│   │   ├── tab1/            # Today — daily log & macro summary
│   │   ├── tab2/            # History & meal templates
│   │   ├── tab3/            # Goals
│   │   ├── charts/          # Analytics & charts
│   │   ├── settings/        # Profile & app settings
│   │   ├── astra/           # Milo AI chat (modal)
│   │   ├── login/           # OTP email login modal
│   │   ├── add-food/        # Food search / manual entry / AI parse
│   │   ├── meal-detail/     # Individual meal view
│   │   ├── models/          # TypeScript interfaces & enums
│   │   ├── services/        # Business logic services
│   │   │   ├── meal.service.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── nutrition-api.service.ts
│   │   │   └── ai.service.ts
│   │   └── tabs/            # Tab bar shell
│   ├── environments/        # API URLs per environment
│   ├── theme/               # Ionic theme variables
│   ├── global.scss
│   └── index.html           # Splash screen
├── android/                 # Capacitor Android project
├── server/                  # Backend (excluded from this repo)
├── angular.json
├── capacitor.config.ts
└── package.json
```

---

## ✅ Prerequisites

Make sure you have these installed:

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **npm** ≥ 9
- **Angular CLI** — `npm install -g @angular/cli`
- **Ionic CLI** — `npm install -g @ionic/cli`
- **Capacitor CLI** — `npm install -g @capacitor/cli`

For Android builds:
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
- **Java 17+** (bundled with Android Studio)

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/macro-tracker.git
cd macro-tracker

# Install dependencies
npm install
```

### Configure API URL

Edit `src/environments/environment.ts` to point to your server:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'   // local dev
};
```

And `src/environments/environment.prod.ts` for production:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://your-server.com/api'
};
```

---

## ▶️ Running the App

### Browser (development)

```bash
npm start
# or
ionic serve
```

Opens at `http://localhost:8100`

### With live reload on device

```bash
ionic capacitor run android --livereload --external
```

---

## 📦 Building for Android

```bash
# Build the web assets
npm run build

# Sync to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then in Android Studio: **Build → Generate Signed Bundle / APK**

---

## 🗺 App Walkthrough

### 🔐 Authentication

MacroTracker uses **passwordless OTP login** — no passwords to remember.

1. On first launch a login screen appears
2. Enter your email address and tap **Send OTP**
3. A 6-digit code is emailed to you (valid for 10 minutes)
4. Enter the code to sign in
5. Your session persists — you won't be asked again unless you log out

> Your email is stored locally and synced to the cloud so you stay logged in even after reinstalling the app.

---

### 🏠 Today (Home)

The main dashboard shows everything for the selected day:

- **Date navigation** — tap the arrows or the date chip to jump to any day
- **Daily Summary card** — progress bars for Calories, Protein, Carbs, Fat and Fiber showing current vs goal
- **Water Intake** — tap `+` / `−` to log water in 250 ml increments, or tap the value to enter a custom amount
- **Meals list** — all meals for the day with item count and calorie total
  - Tap a meal to open it and manage items
  - Swipe left to delete a meal
  - Long-press a meal to rename it
  - Tap the checkmark to mark a meal complete
- **Add Meal** button — choose from templates or create a new one

#### Milo FAB

Tap the ✨ **sparkles button** in the bottom-right corner to open Milo, your AI nutrition assistant.

---

### 🍽 Logging Food

Inside any meal, tap **Add Food** to open the food entry screen with three modes:

#### 🔍 Search Tab
- Searches the **USDA FoodData Central** database (300,000+ foods)
- Tap any result to auto-fill all macros
- Adjust serving size — macros scale automatically

#### ✏️ Manual Tab
- Enter food name, serving size, and all macro values directly
- Supports: calories, protein, carbs, fat, fiber, sugar, sodium

#### 🤖 AI Tab
- Paste any recipe, ingredient list, or meal description
- AI (GPT-4o mini) extracts each ingredient with estimated macros
- Review parsed items and add them all at once

---

### 📅 History & Templates

The **History tab** has two segments:

**History**
- Lists every day you've logged data, newest first
- Each card shows the date, calorie count and a macro breakdown bar
- Tap any day to navigate back to it in the Today view

**Templates**
- Saved meal configurations you can reuse
- Create a template from an existing meal via the meal detail screen
- Tap a template to apply it to today's log instantly

---

### 📊 Charts & Analytics

The **Charts tab** shows visual trends over the last **7, 14 or 30 days**:

- **Calorie Trend** — bar chart of daily calories vs your goal line
- **Macro Breakdown** — stacked bar chart of protein / carbs / fat each day
- **Macro Averages** — doughnut chart of your average macro split

**Stats summary cards:**

| Stat | Description |
|---|---|
| Avg. Calories | Mean daily calorie intake |
| Avg. Protein | Mean daily protein |
| Days Logged | Total days with data in range |
| Days On Goal | Days where calories hit ≥ 80% of target |

---

### 🎯 Goals

Set your daily targets:

| Macro | Default |
|---|---|
| Calories | 2000 kcal |
| Protein | 150 g |
| Carbs | 250 g |
| Fat | 65 g |
| Fiber | 30 g |

Tap **Save Goals** — changes reflect immediately across all screens.

---

### ⚙️ Settings

**Profile**
- Name, age, gender
- Weight (kg / lbs) and height (cm / ft)
- Activity level (Sedentary → Very Active)

**App Settings**
- Toggle which macros to display (Fiber, Sugar, Sodium)
- Set water intake goal (litres)
- Choose default meal names for new days
- Select app theme

---

### 🧠 Milo — AI Assistant

Milo is a context-aware AI nutrition assistant available from the **home screen FAB**.

**What Milo knows about you:**
- Your profile (age, weight, height, activity level)
- Your macro goals
- Today's logged meals and water intake

**Example questions:**
- *"What is my BMI?"*
- *"How many calories should I eat to lose weight?"*
- *"Am I hitting my protein goal today?"*
- *"What is my TDEE?"*
- *"Suggest a high-protein snack under 200 calories"*

**Persistent memory** — Milo remembers your conversation history (up to 100 messages). Your chat is restored every time you open the assistant. Tap the **↺ refresh button** to clear the history and start fresh.

---

## 🔑 Environment Variables

The server requires a `.env` file (see `server/` directory):

```env
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your@gmail.com
PORT=3000
```

> ⚠️ Never commit `.env` files — they are excluded by `.gitignore`

---

## 🎨 Themes

Five built-in color themes, selectable from Settings:

| Theme | Primary Color | Vibe |
|---|---|---|
| **Aurora** | Purple / Indigo | Default, modern |
| **Ember** | Orange / Red | Warm, energetic |
| **Midnight** | Dark Blue | Dark & focused |
| **Coral** | Coral / Pink | Soft, friendly |
| **Mint** | Teal / Green | Fresh, calm |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit following [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:` etc.
4. Push and open a Pull Request

---

## 🙏 Acknowledgements

Special thanks to the AI tools that made this project possible:

| Tool | Contribution |
|---|---|
| **GitHub Copilot** | Code suggestions, architecture guidance, and intelligent autocompletion throughout development |
| **Claude (Anthropic)** | Design insights, feature implementation, code reviews, and writing assistance |

---

<div align="center">
  Built with ❤️ using Ionic Angular
</div>
