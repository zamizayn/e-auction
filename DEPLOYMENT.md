# Backend Deployment Guide

Follow these steps to set up the backend server on your production machine (e.g., VPS, EC2, DigitalOcean Droplet).

## 1. Prerequisites
Ensure the server has the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** (usually comes with Node.js)
- **PM2** (for process management): `npm install -g pm2`

## 2. Project Setup
1.  **Copy Files**: Upload the `backend` folder to your server.
2.  **Navigate**: Open a terminal and go to the backend directory:
    ```bash
    cd /path/to/backend
    ```
3.  **Install Dependencies**:
    ```bash
    npm install
    ```

## 3. Environment Configuration
1.  **Create .env**: Create a `.env` file in the `backend` directory.
2.  **Add Variables**: Add your database connection string and port.
    ```env
    DATABASE_URL="postgresql://username:password@localhost:5432/auction_db?schema=public"
    PORT=5000
    ```
    *(Replace the values with your actual database credentials)*

## 4. Database Setup
Since the database is already created, you just need to sync the schema.
1.  **Generate Prisma Client**:
    ```bash
    npx prisma generate
    ```
2.  **Push Schema**: This updates the database tables to match your code.
    ```bash
    npx prisma db push
    ```

## 5. Build and Run
For production, it's best to compile TypeScript to JavaScript.

1.  **Build**:
    ```bash
    npm run build
    ```
    *This will create a `dist` folder.*

2.  **Start with PM2**:
    ```bash
    pm2 start dist/index.js --name "auction-backend"
    ```

3.  **Save PM2 List** (to restart on reboot):
    ```bash
    pm2 save
    pm2 startup
    ```

## 6. Verification
- Check status: `pm2 status`
- View logs: `pm2 logs auction-backend`
- The API should now be accessible at `http://your-server-ip:5000`.
