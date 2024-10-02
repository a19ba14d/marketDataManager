import axios, { AxiosError } from 'axios';
import WebSocket from 'ws';

interface Ticker {
    e: string;
    E: string;
    s: string;
    p: string;
    P: string;
    w: string;
    x: string;
    c: string;
    Q: string;
    b: string;
    B: string;
    a: string;
    A: string;
    o: string;
    h: string;
    l: string;
    v: string;
    q: string;
    O: string;
    C: string;
    F: string;
    L: string;
    n: string;
}

interface MarketData {
    id: number;
    pair_name: string;
    ticker: Ticker;
    image: string;
    sort_order: number;
    is_collect: boolean;
}

interface ApiResponse {
    status_code: number;
    message: string;
    data: MarketData[];
}

interface WebSocketMessage {
    type: string;
    topic: string;
    data: Ticker;
}

type SortField = 'pair_name' | 'volume24h' | 'lastPrice' | 'priceChange24h' | 'sort_order';
type SortOrder = 'asc' | 'desc';

class MarketDataManager {
    private static instance: MarketDataManager;
    private marketData: MarketData[] = [];
    private apiUrl = 'https://b.cexyes.com/api/spot/tickers';
    private wsUrl = 'wss://stream.cexyes.com';
    private ws: WebSocket | null = null;
    private initializationPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): MarketDataManager {
        if (!MarketDataManager.instance) {
            MarketDataManager.instance = new MarketDataManager();
        }
        return MarketDataManager.instance;
    }

    public async initialize(): Promise<void> {
        if (!this.initializationPromise) {
            this.initializationPromise = this.initializeData().then(() => {
                this.setupWebSocket();
            });
        }
        return this.initializationPromise;
    }

    private async initializeData(): Promise<void> {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const response = await axios.get<ApiResponse>(this.apiUrl, { timeout: 10000 });
                if (response.data.status_code === 200) {
                    this.marketData = response.data.data.map(item => ({
                        ...item,
                        is_collect: false // 初始化时设置 is_collect 为 false
                    }));
                    console.log('Market data initialized successfully');
                    return;
                } else {
                    console.error('Failed to initialize market data:', response.data.message);
                }
            } catch (error) {
                retries++;
                if (error instanceof AxiosError) {
                    console.error(`Attempt ${retries}: Failed to initialize market data:`, error.message);
                    if (error.code === 'ECONNRESET') {
                        console.log('Connection reset by the server. Retrying...');
                    }
                } else {
                    console.error(`Attempt ${retries}: An unexpected error occurred:`, error);
                }

                if (retries >= maxRetries) {
                    console.error('Max retries reached. Could not initialize market data.');
                } else {
                    console.log(`Retrying in 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    }

    private setupWebSocket(): void {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
            console.log('WebSocket connection established');
            const subscriptions = this.marketData.map(data => `${data.pair_name}@ticker`);
            const subscribeMessage = JSON.stringify({ sub: subscriptions });
            this.ws.send(subscribeMessage);
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                if (message.type === 'message' && message.topic.endsWith('@ticker')) {
                    this.updateMarketData(message.data);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        this.ws.on('close', () => {
            console.log('WebSocket connection closed. Attempting to reconnect...');
            setTimeout(() => this.setupWebSocket(), 5000);
        });
    }

    private updateMarketData(ticker: Ticker): void {
        const index = this.marketData.findIndex(item => item.pair_name === ticker.s);
        if (index !== -1) {
            this.marketData[index].ticker = ticker;
        }
    }

    public getMarketData(sortBy: SortField = 'sort_order', order: SortOrder = 'asc', limit?: number): MarketData[] {
        const sortedData = [...this.marketData].sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortBy) {
                case 'pair_name':
                    aValue = a.pair_name;
                    bValue = b.pair_name;
                    break;
                case 'volume24h':
                    aValue = parseFloat(a.ticker.v);
                    bValue = parseFloat(b.ticker.v);
                    break;
                case 'lastPrice':
                    aValue = parseFloat(a.ticker.c);
                    bValue = parseFloat(b.ticker.c);
                    break;
                case 'priceChange24h':
                    aValue = parseFloat(a.ticker.P);
                    bValue = parseFloat(b.ticker.P);
                    break;
                case 'sort_order':
                    aValue = a.sort_order;
                    bValue = b.sort_order;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return order === 'asc' ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });

        return limit && limit > 0 ? sortedData.slice(0, limit) : sortedData;
    }

    public getDefaultSortedData(limit?: number): MarketData[] {
        return this.getMarketData('sort_order', 'asc', limit);
    }

    public getTotalMarketDataCount(): number {
        return this.marketData.length;
    }

    public fuzzySearch(query: string, limit?: number): MarketData[] {
        const normalizedQuery = query.toLowerCase();
        const results = this.marketData.filter(data =>
            data.pair_name.toLowerCase().includes(normalizedQuery)
        );

        results.sort((a, b) => {
            const aStartsWith = a.pair_name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
            const bStartsWith = b.pair_name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
            return aStartsWith - bStartsWith;
        });

        return limit && limit > 0 ? results.slice(0, limit) : results;
    }

    public toggleFavorite(pairName: string): boolean {
        const index = this.marketData.findIndex(item => item.pair_name === pairName);
        if (index !== -1) {
            this.marketData[index].is_collect = !this.marketData[index].is_collect;
            return this.marketData[index].is_collect;
        }
        return false;
    }

    public getFavorites(): MarketData[] {
        return this.marketData.filter(item => item.is_collect);
    }

    public isFavorite(pairName: string): boolean {
        const item = this.marketData.find(item => item.pair_name === pairName);
        return item ? item.is_collect : false;
    }
}

export const marketDataManager = MarketDataManager.getInstance();