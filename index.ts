import { marketDataManager } from './market';



async function demonstrateMarketDataManagerUsage() {
    // 初始化 marketDataManager
    // 这个方法必须在使用其他方法之前调用
    // 它会从 API 获取初始数据并设置 WebSocket 连接
    await marketDataManager.initialize();

    // 1. 获取默认排序的数据
    // 参数:
    //   limit?: number - 可选，限制返回的结果数量
    // 返回: MarketData[] - 按 sort_order 升序排列的市场数据
    const defaultSortedData = marketDataManager.getDefaultSortedData(10);
    console.log('Top 10 pairs by default sort order:', defaultSortedData);

    // 2. 获取市场数据（可自定义排序）
    // 参数:
    //   sortBy?: 'pair_name' | 'volume24h' | 'lastPrice' | 'priceChange24h' | 'sort_order' - 排序字段
    //   order?: 'asc' | 'desc' - 排序顺序
    //   limit?: number - 限制返回的结果数量
    // 返回: MarketData[] - 根据指定条件排序的市场数据
    const volumeSortedData = marketDataManager.getMarketData('volume24h', 'desc', 5);
    console.log('Top 5 pairs by 24h volume (descending):', volumeSortedData);

    // 3. 获取市场数据总数
    // 返回: number - 市场数据的总数量
    const totalCount = marketDataManager.getTotalMarketDataCount();
    console.log('Total number of market pairs:', totalCount);

    // 4. 模糊搜索
    // 参数:
    //   query: string - 搜索关键词
    //   limit?: number - 可选，限制返回的结果数量
    // 返回: MarketData[] - 匹配搜索关键词的市场数据
    const btcPairs = marketDataManager.fuzzySearch("BTC", 3);
    console.log('Top 3 BTC related pairs:', btcPairs);

    // 5. 切换自选状态
    // 参数:
    //   pairName: string - 交易对名称
    // 返回: boolean - 切换后的自选状态（true 为已收藏，false 为未收藏）
    const isBtcusdtFavorite = marketDataManager.toggleFavorite("BTCUSDT");
    console.log('Is BTCUSDT now a favorite?', isBtcusdtFavorite);

    // 6. 获取所有自选交易对
    // 返回: MarketData[] - 所有被标记为自选的交易对数据
    const favorites = marketDataManager.getFavorites();
    console.log('All favorite pairs:', favorites);

    // 7. 检查是否为自选
    // 参数:
    //   pairName: string - 交易对名称
    // 返回: boolean - 是否为自选（true 为已收藏，false 为未收藏）
    const isEthUsdtFavorite = marketDataManager.isFavorite("ETHUSDT");
    console.log('Is ETHUSDT a favorite?', isEthUsdtFavorite);

    // 示例：结合多个方法使用
    // 获取按成交量排序的前 10 个自选交易对
    const topFavoritesByVolume = marketDataManager.getFavorites()
        .sort((a, b) => parseFloat(b.ticker.v) - parseFloat(a.ticker.v))
        .slice(0, 10);
    console.log('Top 10 favorite pairs by volume:', topFavoritesByVolume);

    // 注意：由于 WebSocket 连接，市场数据会持续更新
    // 您可以随时调用这些方法来获取最新的数据


    // 币币订阅地址：wss://stream.cexyes.com
    // 合约订阅地址：wss://future.cexyes.com


    // 登录之后 应该初始化获取收藏交易对数据  合约和现货是分开的  现货传递参数type=SPOTS  合约传递参数 type=FUTURES

    // 收藏列表接口地址 https://www.postman.com/kol111/workspace/testcex/request/4922941-097f1fdd-f105-448b-b9c0-f2b456634175?action=share&source=copy-link&creator=4922941&active-environment=058b3cd3-fcbb-4aec-983b-d93fb4f1ff5d
    // 现货收藏列表 type=SPOTS  
    // 合约收藏列表 type=FUTURES




    /**
     * 1.本程序使用 需要运行两份 一份是现货 另一份是合约
     * 2.初始化获取收藏交易对数据  需要请求两份 一份是现货 另一份是合约 
     * 3.列表渲染的时候 直接写一个定时任务一秒刷新一次即可 
     * 4.收藏 和取消收藏 两个步骤 ，首先执行本程序的 toggleFavorite  然后再执行接口请求。 也可以对本程序进行改动 直接写入到 toggleFavorite方法中 ，
     * 异步执行收藏和取消操作 ,接口返回结果不用提醒， 但是添加和取消操作的时候 需要同步进行一个小提醒
     * 
     */



}

// 运行演示函数
demonstrateMarketDataManagerUsage().catch(console.error);