import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

export const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    define: {
        timestamps: true, // Adds createdAt and updatedAt
    }
});
