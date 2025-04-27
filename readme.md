# Mothbot Project

Mothbot is a Discord bot designed to support the Temple of Chrysalis community. It provides features such as activity tracking, user consent management, and integration with external APIs. The project consists of two main components: the **Bot** and the **Backend**, each with its own responsibilities and architecture.

---

## Table of Contents

- [Mothbot Project](#mothbot-project)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Features](#features)
    - [General Features](#general-features)
  - [Bot Overview](#bot-overview)
    - [Bot Features](#bot-features)
    - [Bot Project Structure](#bot-project-structure)
    - [Bot Setup and Installation](#bot-setup-and-installation)
    - [Bot Commands](#bot-commands)
  - [Backend Overview](#backend-overview)
    - [Backend Features](#backend-features)
    - [Backend Project Structure](#backend-project-structure)
    - [Backend Setup and Installation](#backend-setup-and-installation)
    - [Backend API Endpoints](#backend-api-endpoints)
  - [Environment Variables](#environment-variables)
    - [Bot `.env` File](#bot-env-file)
    - [Backend `.env` File](#backend-env-file)
  - [Development Guidelines](#development-guidelines)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
  - [Contributing](#contributing)
  - [License](#license)

---

## Introduction

Mothbot is a modular project designed to enhance the Discord experience for the Temple of Chrysalis community. It consists of:
- **Bot**: A Discord bot that interacts with users, processes commands, and communicates with the backend.
- **Backend**: A REST API that handles data storage, processing, and secure communication with the bot.

The project is built with scalability and maintainability in mind, using modern technologies such as Node.js, MongoDB, and Discord.js.

---

## Features

### General Features
- User activity tracking and statistics.
- User consent management for data collection.
- AI Horde integration for generating AI-based responses.
- Feedback and bug reporting system integrated with GitHub.
- Secure communication between the bot and backend using HMAC authentication.

---

## Bot Overview

The **Bot** is the user-facing component of the project. It interacts with users through Discord's slash commands and processes events such as messages and reactions.

### Bot Features
- **Slash Commands**: Provides an intuitive way for users to interact with the bot.
- **Activity Tracking**: Tracks user activity (e.g., messages sent) and sends data to the backend.
- **AI Horde Integration**: Generates AI-based responses for user queries.
- **Feedback System**: Allows users to submit feedback or bug reports directly to GitHub.
- **Scheduled Tasks**: Runs periodic tasks such as daily statistics updates.
- **Logging**: Logs all interactions for debugging and auditing purposes.

### Bot Project Structure
```
bot/
├── .env.production          # Environment variables for production
├── .env.development         # Environment variables for development
├── bot.js                   # Main bot entry point
├── config.js                # Configuration loader
├── logger.js                # Logging utility
├── register-commands.js     # Command registration script
├── admin/                   # Admin tools
├── commands/                # Slash commands
├── cronjobs/                # Scheduled tasks
├── events/                  # Event handlers
├── logs/                    # Log files
└── utils/                   # Utility functions
```

### Bot Setup and Installation
1. **Navigate to the Bot Directory**:
   ```bash
   cd bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy `sample.env` to `.env.development` and/or `.env.production`
   - Fill in the required values (see [Environment Variables](#environment-variables)).

4. **Register Commands**:
   ```bash
   npm run register-commands
   ```

5. **Start the Bot**:
   ```bash
   npm run start:dev
   or
   npm run start:prod
   ```

### Bot Commands

| Command            | Description                                         |
|--------------------|-----------------------------------------------------|
| `/help`            | Provides help and useful links.                     |
| `/opt-in`          | Allows users to opt-in to data collection.          |
| `/opt-out`         | Allows users to opt-out of data collection.         |
| `/useractivity`    | Fetches activity stats for a user.                  |
| `/general-stats`   | Fetches general statistics for a date range.        |
| `/feedback`        | Submits feedback or bug reports to GitHub.          |
| `/search_articles` | Searches for articles on the Temple's website.      |

---

## Backend Overview

The **Backend** is the data processing and storage component of the project. It provides a REST API for managing user statistics, consent, and general stats.

### Backend Features
- **REST API**: Exposes endpoints for managing user data and statistics.
- **MongoDB Integration**: Stores user activity, consent, and general statistics.
- **HMAC Authentication**: Secures communication with the bot.
- **Daily Active User Tracking**: Calculates and stores daily active user statistics.
- **Scalable Architecture**: Designed to handle large-scale data processing.

### Backend Project Structure

```
backend/
├── .env.production          # Environment variables for development
├── .env.development         # Environment variables for development
├── dbConnection.js          # MongoDB connection setup
├── package.json             # Backend dependencies and scripts
├── sample.env               # Sample environment variables
├── server.js                # Main backend entry point
├── controllers/             # API controllers
├── middleware/              # Middleware for authentication
├── models/                  # MongoDB schemas
├── public/                  # Static files
└── routes/                  # API routes
```

### Backend Setup and Installation

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy `sample.env` to `.env.development` and/or `.env.production`
   - Fill in the required values (see [Environment Variables](#environment-variables)).

4. **Start the Backend**:
   ```bash
   npm run start:dev
   or
   npm run start:prod
   ```

### Backend API Endpoints

| Endpoint                       | Method | Description                              |
|--------------------------------|--------|------------------------------------------|
| `/user-stats/add`              | POST   | Adds or updates user statistics.         |
| `/user-stats/process-messages` | POST   | Processes bulk user messages.            |
| `/user-stats/delete-user/:id`  | DELETE | Deletes all data for a specific user.    |
| `/user-consent`                | POST   | Creates or updates user consent.         |
| `/user-consent/:userId`        | GET    | Retrieves user consent status.           |
| `/general-stats/add`           | POST   | Adds or updates general statistics.      |
| `/general-stats/active-users`  | GET    | Fetches daily active user stats.         |

---

## Environment Variables

### Bot `.env` File
| Variable              | Description                                      |
|-----------------------|--------------------------------------------------|
| `APP_TOKEN`           | Discord bot token.                               |
| `CLIENT_ID`           | Discord bot client ID.                           |
| `GUILD_ID`            | Discord server (guild) ID.                       |
| `API_URL`             | Backend API base URL.                            |
| `BOT_SECRET`          | Secret key for HMAC authentication.              |
| `HORDE_API_KEY`       | API key for AI Horde integration.                |
| `HORDE_ENABLED`       | Enable/disable AI Horde responses (`true/false`).|
| `GITHUB_TOKEN`        | GitHub token for issue creation.                 |
| `GITHUB_REPO`         | GitHub repository for issue tracking.            |
| `TIME_ZONE`           | Server timezone (e.g., `Europe/Helsinki`).       |

### Backend `.env` File
| Variable              | Description                                      |
|-----------------------|--------------------------------------------------|
| `SERVER_HOST`         | Hostname for the backend server.                 |
| `SERVER_PORT`         | Port for the backend server.                     |
| `DB_HOST`             | MongoDB hostname.                                |
| `DB_PORT`             | MongoDB port.                                    |
| `DB_NAME`             | MongoDB database name.                           |
| `DB_USER`             | MongoDB username.                                |
| `DB_PWD`              | MongoDB password.                                |
| `SECRET_KEY`          | Secret key for HMAC authentication.              |

---

## Development Guidelines

1. **Code Style**: Follow consistent formatting and naming conventions.
2. **Testing**: Test all changes locally before committing.
3. **Logging**: Use the provided logger for debugging and tracking.
4. **Environment**: Use `.env.development` for local development and `.env.production` for production.
5. **Documentation**: Document all new features and changes in the `readme.md`.

---

## Troubleshooting

### Common Issues
1. **Bot Not Responding**:
   - Ensure the bot token in `.env` is correct.
   - Check if the bot is added to the Discord server.

2. **Backend Not Connecting to MongoDB**:
   - Verify MongoDB credentials in `.env`.
   - Ensure MongoDB is running and accessible.

3. **HMAC Authentication Errors**:
   - Ensure the `BOT_SECRET` in the bot and `SECRET_KEY` in the backend match.

4. **Command Registration Fails**:
   - Run `npm run register-commands` in the `bot/` directory to register commands.

---

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description.

---

## License

This project is licensed under the ISC License. See the `LICENSE` file for details.
