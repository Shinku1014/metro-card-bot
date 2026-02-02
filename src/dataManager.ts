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

        const today = new Date();
        const monthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

        const newCard: Card = {
            id: Date.now().toString(),
            name: cardName,
            coupons: {
                A: 10,
                B: [{ monthKey, count: 5 }]
            },
            dailyUsage: {
                A: false,
                B: false,
                date: new Date().toDateString()
            },
            status: 'idle',
            lastUsed: null,
            createdAt: new Date().toLocaleString()
        };

        userData.cards.push(newCard);
        data[userId.toString()] = userData;
        this.saveData(data);
        return true;
    }

    public getCards(userId: number): Card[] {
        const userData = this.getUserData(userId);
        this.checkAndRefillCoupons(userId, userData);
        this.resetDailyStatusIfNeeded(userId, userData);
        return userData.cards;
    }

    public updateCardStatus(userId: number, cardId: string, newStatus: Card['status']): boolean {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const card = userData.cards.find(c => c.id === cardId);
        if (!card) return false;

        const oldStatus = card.status;
        card.status = newStatus;
        card.lastUsed = new Date().toLocaleString();

        if (oldStatus === 'in_station' && newStatus === 'idle') {
            card.status = 'idle'; // Reset to idle, usage tracked in dailyUsage
        } else {
            card.status = newStatus;
        }

        data[userId.toString()] = userData;
        this.saveData(data);
        return true;
    }

    private resetDailyStatusIfNeeded(userId: number, userData: UserData): void {
        const today = new Date().toDateString();
        let modified = false;

        userData.cards.forEach(card => {
            if (!card.dailyUsage) {
                card.dailyUsage = { A: false, B: false, date: today };
                modified = true;
            } else if (card.dailyUsage.date !== today) {
                card.dailyUsage = { A: false, B: false, date: today };
                modified = true;
            }

            // Clean up legacy status
            if (card.status === 'used_today') {
                card.status = 'idle';
                modified = true;
            }
        });

        if (modified) {
            const data = this.loadData();
            data[userId.toString()] = userData;
            this.saveData(data);
        }
    }

    private checkAndRefillCoupons(userId: number, userData: UserData): void {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

        // Calculate previous month key
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;

        let modified = false;

        // Check if global month tracker needs update, or just run validation
        if (userData.currentMonth !== currentMonth || userData.currentYear !== currentYear) {
            userData.currentMonth = currentMonth;
            userData.currentYear = currentYear;
            modified = true;
        }

        userData.cards.forEach(card => {
            // Ensure data structure integrity
            if (!card.coupons) {
                // Convert old card if exists?
                // Or just init
                card.coupons = { A: 10, B: [] };
            }
            if (!card.coupons.B) card.coupons.B = [];

            // Ensure dailyUsage exists
            if (!card.dailyUsage) {
                card.dailyUsage = {
                    A: false,
                    B: false,
                    date: new Date().toDateString()
                };
                modified = true;
            }

            // Add current month coupons if missing
            const hasCurrentMonth = card.coupons.B.some(b => b.monthKey === currentMonthKey);
            if (!hasCurrentMonth) {
                card.coupons.B.push({ monthKey: currentMonthKey, count: 5 });
                modified = true;
            }

            // Remove expired coupons (Now B is only valid for the current month)
            const initialLen = card.coupons.B.length;
            card.coupons.B = card.coupons.B.filter(b => 
                b.monthKey === currentMonthKey
            );

            if (card.coupons.B.length !== initialLen) {
                modified = true;
            }
            }
        });

        if (modified) {
            const data = this.loadData();
            data[userId.toString()] = userData;
            this.saveData(data);
        }
    }

    public consumeCoupon(userId: number, cardId: string, type: 'A' | 'B'): { success: boolean, message: string } {
        const data = this.loadData();
        const userData = this.getUserData(userId);
        const card = userData.cards.find(c => c.id === cardId);

        if (!card) return { success: false, message: '找不到卡片' };

        if (!card.coupons) {
            // Should not happen with new logic, but reset if happens
            this.checkAndRefillCoupons(userId, userData); // Try to Init
            if (!card.coupons) return { success: false, message: '数据错误' };
        }

        // Check daily usage first
        if (!card.dailyUsage) {
            card.dailyUsage = { A: false, B: false, date: new Date().toDateString() };
        } else if (card.dailyUsage.date !== new Date().toDateString()) {
            card.dailyUsage = { A: false, B: false, date: new Date().toDateString() };
        }

        if (type === 'A') {
            if (card.dailyUsage.A) {
                return { success: false, message: '今日已使用过五折优惠' };
            }
            if (card.coupons.A > 0) {
                card.coupons.A -= 1;
                card.dailyUsage.A = true;
                card.status = 'idle'; // Back to idle
                card.lastUsed = new Date().toLocaleString();

                data[userId.toString()] = userData;
                this.saveData(data);
                return { success: true, message: `已使用五折优惠。剩余: ${card.coupons.A}` };
            } else {
                return { success: false, message: '五折优惠已用完' };
            }
        } else if (type === 'B') {
            if (card.dailyUsage.B) {
                return { success: false, message: '今日已使用过-2优惠' };
            }
            // Use oldest valid batch first
            card.coupons.B.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

            const batch = card.coupons.B.find(b => b.count > 0);

            if (batch) {
                batch.count -= 1;
                card.dailyUsage.B = true;
                card.status = 'idle';
                card.lastUsed = new Date().toLocaleString();

                const totalB = card.coupons.B.reduce((sum, b) => sum + b.count, 0);

                data[userId.toString()] = userData;
                this.saveData(data);
                return { success: true, message: `已使用-2优惠(${batch.monthKey})。剩余: ${totalB}` };
            } else {
                return { success: false, message: '优惠-2已用完' };
            }
        }
        return { success: false, message: '无效的优惠券类型' };
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
