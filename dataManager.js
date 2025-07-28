const fs = require('fs');
const path = require('path');

class DataManager {
    constructor(dataFile = './data/cards.json') {
        this.dataFile = dataFile;
        this.ensureDataFile();
    }

    ensureDataFile() {
        const dir = path.dirname(this.dataFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(this.dataFile)) {
            this.saveData({});
        }
    }

    loadData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    saveData(data) {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    getUserData(userId) {
        const data = this.loadData();
        if (!data[userId]) {
            data[userId] = {
                cards: [],
                currentMonth: new Date().getMonth(),
                currentYear: new Date().getFullYear()
            };
            this.saveData(data);
        }
        return data[userId];
    }

    addCard(userId, cardName) {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const cardExists = userData.cards.find(card => card.name === cardName);
        if (cardExists) {
            return false; // 卡片已存在
        }

        const newCard = {
            id: Date.now().toString(),
            name: cardName,
            monthlyUsage: 0,
            status: 'idle', // idle, in_station, completed
            lastUsed: null,
            createdAt: new Date().toISOString()
        };

        userData.cards.push(newCard);
        data[userId] = userData;
        this.saveData(data);
        return true;
    }

    getCards(userId) {
        const userData = this.getUserData(userId);
        this.resetMonthlyUsageIfNeeded(userId, userData);
        return userData.cards;
    }

    updateCardStatus(userId, cardId, newStatus) {
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

        data[userId] = userData;
        this.saveData(data);
        return true;
    }

    resetMonthlyUsageIfNeeded(userId, userData) {
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
            data[userId] = userData;
            this.saveData(data);
        }
    }

    deleteCard(userId, cardId) {
        const data = this.loadData();
        const userData = this.getUserData(userId);

        const cardIndex = userData.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return false;

        userData.cards.splice(cardIndex, 1);
        data[userId] = userData;
        this.saveData(data);
        return true;
    }
}

module.exports = DataManager;
