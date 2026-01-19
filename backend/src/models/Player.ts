import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import { Team } from './Team';

export interface PlayerAttributes {
    id: string;
    name: string;
    category: string;
    gender: string;
    position?: string;
    employee_no?: string;
    basePrice: number;
    soldPrice?: number;
    isSold: boolean;
    photoUrl?: string;
    gameIds?: string; // Comma separated IDs
    teamId?: string | null;
    matchesPlayed?: number;
    points?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PlayerCreationAttributes extends Optional<PlayerAttributes, 'id' | 'isSold'> { }

export class Player extends Model<PlayerAttributes, PlayerCreationAttributes> implements PlayerAttributes {
    public id!: string;
    public name!: string;
    public category!: string;
    public gender!: string;
    public position?: string;
    public employee_no?: string;
    public basePrice!: number;
    public soldPrice?: number;
    public isSold!: boolean;
    public photoUrl?: string;
    public gameIds?: string;
    public teamId?: string | null;
    public matchesPlayed!: number;
    public points!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Player.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        gender: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        position: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        employee_no: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        basePrice: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        soldPrice: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        isSold: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        photoUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        gameIds: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        teamId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Team',
                key: 'id',
            },
        },
        matchesPlayed: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        modelName: 'Player',
        tableName: 'Player',
        timestamps: true,
    }
);
