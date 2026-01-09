export interface CouponBatch {
    monthKey: string;
    count: number;
}

export interface DailyUsage {
    A: boolean;
    B: boolean;
    date: string;
}

export interface Card {
    id: string;
    name: string;
    coupons: {
        A: number;
        B: CouponBatch[];
    };
    dailyUsage: DailyUsage;
    status: 'idle' | 'in_station' | 'used_today';
    lastUsed: string | null;
    createdAt: string;
}

export interface UserData {
    cards: Card[];
    currentMonth: number;
    currentYear: number;
}

export interface Database {
    [userId: string]: UserData;
}

export interface BotContext {
    from?: {
        id: number;
        first_name?: string;
        username?: string;
    };
    callbackQuery?: any;
    editMessageText?: (text: string, keyboard?: any) => Promise<any>;
    reply?: (text: string, keyboard?: any) => Promise<any>;
    answerCbQuery?: (text?: string) => Promise<any>;
    scene?: {
        enter: (sceneName: string) => Promise<any>;
        leave: () => Promise<any>;
    };
    wizard?: {
        state: any;
        next: () => Promise<any>;
    };
}
