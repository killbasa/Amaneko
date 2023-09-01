<div align="center">

# Amaneko

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Setup

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
