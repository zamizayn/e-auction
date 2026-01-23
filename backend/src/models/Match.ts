import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import { Team } from './Team';
import { Game } from './Game';

export interface MatchAttributes {
    id: string;
    gameId: string;
    teamAId?: string;
    teamBId?: string;
    playerAId?: string;
    playerBId?: string;
    winnerId?: string | 'draw';
    scoreA?: number;
    scoreB?: number;
    status: 'scheduled' | 'completed';
    stage: string; // e.g., 'league', 'semi-final', 'final', 'Round 1', etc.
    createdAt?: Date;
    updatedAt?: Date;
}

interface MatchCreationAttributes extends Optional<MatchAttributes, 'id' | 'status'> { }

export class Match extends Model<MatchAttributes, MatchCreationAttributes> implements MatchAttributes {
    public id!: string;
    public gameId!: string;
    public teamAId?: string;
    public teamBId?: string;
    public playerAId?: string;
    public playerBId?: string;
    public winnerId?: string | 'draw';
    public scoreA?: number;
    public scoreB?: number;
    public status!: 'scheduled' | 'completed';
    public stage!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Match.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        gameId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Game',
                key: 'id',
            },
        },
        teamAId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Team',
                key: 'id',
            },
        },
        teamBId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Team',
                key: 'id',
            },
        },
        playerAId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Player',
                key: 'id',
            },
        },
        playerBId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Player',
                key: 'id',
            },
        },
        winnerId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        scoreA: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        scoreB: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('scheduled', 'completed'),
            defaultValue: 'scheduled',
        },
        stage: {
            type: DataTypes.STRING,
            defaultValue: 'league',
        },
    },
    {
        sequelize,
        modelName: 'Match',
        tableName: 'Match',
        timestamps: true,
    }
);
