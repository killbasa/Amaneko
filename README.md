<div align="center">

# Amaneko

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Uptime Kuma](https://status.amaneko.ca/api/badge/8/status?upLabel=online&downLabel=offline&label=Bot+status)](https://status.amaneko.ca/)

### Discord bot for VTuber livestream relays, cameos, and notifications.

</div>

## Features ⚙️

- Stream notifications for your favourite VTubers.
- Relay livestream comments and cameos directly to a Discord channel.
- Get notified whenever a new community post is created.
- Display a list of upcoming streams based on your subscriptions.

## Links 🔗

- Bot invite (soon)
- [Documentation](https://docs.amaneko.ca/)
- [Status page](https://status.amaneko.ca/)

## Image tags

[Nightly](https://github.com/killbasa/Amaneko/pkgs/container/amaneko/146766665?tag=nightly): Version that is used for Amaneko's staging environment. **Bugs and crashes may occur.**

[Stable](https://github.com/killbasa/Amaneko/pkgs/container/amaneko/146766665?tag=stable): Version that is used for Amaneko's production environment.

## Setup 🔧

### 1. Fork and clone the repository

```bash
# After forking the repository, copy the url and run:
git clone https://github.com/[USERNAME]/Amaneko.git
cd Amaneko
```

### 2. Create and configure the .env files

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
yarn install
```

### 4. Start the required services

```bash
docker compose up -d
```

### 5. Generate the database

```bash
yarn db:generate
yarn db:push
```

### 6. Build project

```bash
yarn build
```
