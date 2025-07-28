import * as fs from 'fs';
import * as path from 'path';
import { Card, UserData, Database } from './types';

export class DataManager {
    private dataFile: string;

    constructor(dataFile: string = './data/cards.json') {
        this.dataFile = dataFile;
        this.ensureDataFile();
    }

    private ensureDataFile(): void {
        const dir = path.dirname(this.dataFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(this.dataFile)) {
            this.saveData({});
        }
    }

    private loadData(): Database {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data) as Database;
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    private saveData(data: Database): void {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    private getUserData(userId: number): UserData {
        const data = this.loadData();
        const userIdStr = userId.toString();

        if (!data[userIdStr]) {
            data[userIdStr] = {
                cards: [],
                currentMonth: new Date().getMonth(),
                currentYear: new Date().getFullYear()
            };
            this.saveData(data);
        }
        return data[userIdStr];
    }

    public addCard(userId: number, cardName: string): boolean {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const cardExists = userData.cards.find(card => card.name === cardName);
        if (cardExists) {
            return false; // 卡片已存在
        }

        const newCard: Card = {
            id: Date.now().toString(),
            name: cardName,
            monthlyUsage: 0,
            status: 'idle',
            lastUsed: null,
            createdAt: new Date().toISOString()
        };

        userData.cards.push(newCard);
        data[userId.toString()] = userData;
        this.saveData(data);
        return true;
    }

    public getCards(userId: number): Card[] {
        const userData = this.getUserData(userId);
        this.resetMonthlyUsageIfNeeded(userId, userData);
        return userData.cards;
    }

    public updateCardStatus(userId: number, cardId: string, newStatus: Card['status']): boolean {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const card = userData.cards.find(c => c.id === cardId);
        if (!card) return false;

        const oldStatus = card.status;
        card.status = newStatus;
        card.lastUsed = new Date().toISOString();

        // 如果从进站状态变为出站状态，增加使用次数
        if (oldStatus === 'in_station' && newStatus === 'idle') {
            card.monthlyUsage += 1;
        }

        data[userId.toString()] = userData;
        this.saveData(data);
        return true;
    }

    private resetMonthlyUsageIfNeeded(userId: number, userData: UserData): void {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (userData.currentMonth !== currentMonth || userData.currentYear !== currentYear) {
            // 重置所有卡片的月度使用次数
            userData.cards.forEach(card => {
                card.monthlyUsage = 0;
                card.status = 'idle';
            });

            userData.currentMonth = currentMonth;
            userData.currentYear = currentYear;

            const data = this.loadData();
            data[userId.toString()] = userData;
            this.saveData(data);
        }
    }

    public deleteCard(userId: number, cardId: string): boolean {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const cardIndex = userData.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return false;

        userData.cards.splice(cardIndex, 1);
        data[userId.toString()] = userData;
        this.saveData(data);
        return true;
    }
}
