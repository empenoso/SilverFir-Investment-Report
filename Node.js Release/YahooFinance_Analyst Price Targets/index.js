/**
 * SilverFir: Investment Report 🌲 [Node.js Release]
 * https://empenoso.github.io/SilverFir-Investment-Report/
 * 
 * Модуль поиска американских акций по параметрам [YahooFinance_Analyst Price Targets/index.js]
 * 
 * @author Mikhail Shardin [Михаил Шардин] 
 * https://shardin.name/
 * 
 * Last updated: 16.08.2024
 * 
 */

start()

async function start() {
    let startTime = (new Date()).getTime(); //записываем текущее время в формате Unix Time Stamp - Epoch Converter
    console.log("Функция %s начала работу в %s. \n", getFunctionName(), (new Date()).toLocaleString("ru-RU"))

    const fetch = await loadFetch()
    global.fs = require("fs")
    global.path = require('path')
    const delay = await loadDelay()
    global.moment = require('moment')
    moment.locale('ru')

    const sumOfRecommendationsMore = 7 // Количество компаний аналитиков проводивших анализ за два месяца
    const GrowthPotentialMore = 25 // Потенциал роста, %    
    const YieldMore = 0 // Текущая дивидендная доходность, %

    const conditions = `<li>Потенциал роста, % >= ${GrowthPotentialMore}</li>
                        <li>Количество компаний аналитиков проводивших анализ за два месяца >= ${sumOfRecommendationsMore}</li>
                        <li>Текущая див. доходность, % >= ${YieldMore}</li>`

    // ! Вариант: считываем готовый массив всех символов из источника
    // Cписок всех обыкновенных акций, торгуемых на NYSE, NASDAQ и AMEX: http://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs
    // ftp://ftp.nasdaqtrader.com/symboldirectory/nasdaqtraded.txt
    // другие источники данных: https://github.com/gsee/symbology/blob/master/R/ExchSymbolMaps.R
    // ftp://ftp.nysedata.com/OpenBook/SymbolMapping/
    // https://www.otcmarkets.com/research/stock-screener
    // http://www.batstrading.com/market_data/symbol_listing/csv/
    // https://www.gurufocus.com/stock_list.php?m_country[]=USA&m_country[]=$OTCPK&m_country[]=$GREY&m_country[]=$NAS&m_country[]=$NYSE&m_country[]=$ARCA&m_country[]=$OTCBB&m_country[]=$AMEX&m_country[]=$BATS&m_country[]=$IEXG&n=100

    var tickerArray = []
    var tickerArrayUnique = []

    // ! перед этим обновить из консоли: $ sh nasdaqtraded.sh

    console.log(`Текущая директория: ${process.cwd()}`)
    tickerArray = JSON.parse(fs.readFileSync(path.resolve(__dirname, './nasdaqtraded.json'), 'utf8'))
    tickerArrayUnique = tickerArray.filter((v, i, a) => a.indexOf(v) === i)

    console.log(`\n${getFunctionName()}. Поиски Analyst Price Targets.`)
    var Selection = []
    var log = `<li>Поиск начат ${new Date().toLocaleString("ru-RU")}.</li>`
    let growthPotentialErrorsCount = 0 // отслеживает количество ошибок

    // for (var s = 0; s <= 200 - 1; s++) { // тест
    for (var s = 0; s <= tickerArrayUnique.length - 1; s++) { // работа
        await delay((Math.random() * (5 - 1) + 1) * 1000); //1...5 sec
        ID = tickerArrayUnique[s]
        console.log(`${getFunctionName()}. Ищем для ${ID} (${s+1} из ${tickerArrayUnique.length}) ${new Date().toLocaleString("ru-RU")}.\nСсылка на сайт: https://finance.yahoo.com/quote/${ID}/analysis?p=${ID}.`)
        log += '<li>Cтрока № ' + (s + 1) + ' из ' + tickerArrayUnique.length + '. Ищем для <a target="_blank" rel="noopener noreferrer" href="https://finance.yahoo.com/quote/' + ID + '/analysis?p=' + ID + '">' + ID + '</a>.</li>'
        const {
            cookie,
            crumb
        } = await getCredentials();

        financial = await financialData(ID, cookie, crumb)
        currentPrice = +financial.split('|')[0]
        GrowthPotential = +financial.split('|')[2]
        if (financial === "X|X|X") {
            growthPotentialErrorsCount++
            console.log(`${getFunctionName()}. Счетчик компаний, где нет данных о прогнозируемой цене = ${growthPotentialErrorsCount} из ${tickerArrayUnique.length}.`)
        }

        if (GrowthPotential >= GrowthPotentialMore) {
            Trend = await recommendationTrend(ID, cookie, crumb)
            if (Trend >= sumOfRecommendationsMore) {
                SummaryDetail = await USAStockGetSummaryDetail(ID, cookie, crumb)
                Yield = SummaryDetail.dividendYield
                averageDailyVolume10Day = SummaryDetail.averageDailyVolume10Day
                marketCap = SummaryDetail.marketCap
                if (Yield > YieldMore) {
                    Name = await USAStockGetName(ID, cookie, crumb)
                    Sector = await USAStockGetSector(ID, cookie, crumb)
                    logo = `<img src="https://financialmodelingprep.com/image-stock/${ID}.jpg" height="32" width="32">`

                    Selection.push([Name, ID, currentPrice, averageDailyVolume10Day, GrowthPotential, Yield, Sector, marketCap, logo, Trend])
                    console.log('\n%s. Yahoo Finance выборка № %s: %s.\n', getFunctionName(), Selection.length, JSON.stringify(Selection[Selection.length - 1]))
                    log += '<li><b>Результат № ' + Selection.length + ': ' + JSON.stringify(Selection[Selection.length - 1]) + ' в ' + (new Date().toLocaleTimeString()) + '.</b></li>'

                    Selection.sort(function (x, y) { // сортировка по столбцу GrowthPotential
                        var xp = x[3];
                        var yp = y[3];
                        return xp == yp ? 0 : xp > yp ? -1 : 1;
                    });
                }
            }
        } else {
            console.log(`${getFunctionName()}. Компания ${ID} не прошла в выборку, из-за того что потенциал роста меньше ожидаемого или отсутсвует.\nОстальные параметры не рассматриваются.`)
        }
        if (s % 100 == 0) { // запись на диск каждые 100 строк
            await HTMLgenerate(Selection, conditions, log)
            console.log(`\nЗаписали на диск на ${s} строке.`)
        }
        let percentageCompletion = (s + 1) / tickerArrayUnique.length * 100
        let duration = Math.round(((new Date()).getTime() - startTime) / 1000 / 60 * 100) / 100;
        let TimeLeft = duration * 100 / percentageCompletion - duration
        let EndTime = moment(new Date()).add(~~TimeLeft, 'minutes').calendar() // .format('LLLL')
        console.log(`============== Выполнено на: ${percentageCompletion.toFixed(2)}%. Начато: ${moment(startTime).fromNow()}, осталось: ~${~~TimeLeft} минут (до ${EndTime}) ==============\n`)
    }
    log += `<li>Поиск завершён ${new Date().toLocaleString("ru-RU")}.</li>`
    console.log(`${getFunctionName()}. Счетчик компаний, где нет данных о прогнозируемой цене = ${growthPotentialErrorsCount} из ${tickerArrayUnique.length}.`)
    log += `<li><b>Счетчик компаний, где нет данных о прогнозируемой цене = ${growthPotentialErrorsCount} из ${tickerArrayUnique.length}.</b></li>`

    console.log(`\n${getFunctionName()}. Выборка тикеров после поисков (${Selection.length} бумаг): ${JSON.stringify(Selection)}.`)

    await HTMLgenerate(Selection, conditions, log)

    let currTime = (new Date()).getTime();
    let duration = Math.round((currTime - startTime) / 1000 / 60 * 100) / 100; //время выполнения скрипта в минутах
    console.log("\nФункция %s закончила работу в %s.", getFunctionName(), (new Date()).toLocaleString("ru-RU"))
    console.log("Время выполнения %s в минутах: %s.", getFunctionName(), duration)
}
module.exports.start = start;


/**
 * Условие работы с АПИ
 */

async function getCredentials() { // на основе https://stackoverflow.com/a/76555529
    // Inline the API and User-Agent values
    const API = 'https://query2.finance.yahoo.com';
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';

    // get the A3 cookie
    const response = await fetch('https://fc.yahoo.com', {
        headers: {
            'User-Agent': USER_AGENT
        },
        timeout: 10000 // Увеличиваем таймаут до 10 секунд
    })
    const cookie = response.headers.get('set-cookie')

    // now get the crumb
    const url = new URL('/v1/test/getcrumb', API)
    const request = new Request(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'cookie': cookie
        }
    })
    const crumbResponse = await fetch(request)
    const crumb = await crumbResponse.text()

    return {
        cookie,
        crumb
    }
}

/**
 * Получение данных
 */

async function USAStockGetName(ID, cookie, crumb) { //получаем имя бумаги 
    // https://query1.finance.yahoo.com/v10/finance/quoteSummary/GRMN?modules=price&crumb=rxBh.H4z62E
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=price&crumb=${crumb}`;
    console.log("%s. URL for %s: %s", getFunctionName(), ID, url);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
                'cookie': cookie
            },
            timeout: 10000 // Увеличиваем таймаут до 10 секунд
        });
        const json = await response.json();
        const value = json.quoteSummary.result[0].price.longName;
        console.log("%s. Name for %s: %s", getFunctionName(), ID, value);
        if (value == 0) return 'нет';
        return value.replace(/\'/g, '');
    } catch (e) {
        console.log(`Ошибка в ${getFunctionName()}: ${e}.`);
    }
}

async function USAStockGetSector(ID, cookie, crumb) { //категория бумаги Sector и подкатегория Industry
    // https://query1.finance.yahoo.com/v10/finance/quoteSummary/GRMN?modules=assetProfile&crumb=rxBh.H4z62E
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=assetProfile&crumb=${crumb}`
    console.log("%s. url для %s: %s", getFunctionName(), ID, url);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
                'cookie': cookie
            },
            timeout: 10000 // Увеличиваем таймаут до 10 секунд
        });
        const json = await response.json()
        const value = json.quoteSummary.result[0].assetProfile.sector
        console.log("%s. Sector для %s: %s", getFunctionName(), ID, value)
        if (value == 0) return 'нет'
        return value
    } catch (e) {
        console.log(`Ошибка в ${getFunctionName()}: ${e}.`)
    }
}

async function USAStockGetReturn(ID, cookie, crumb) { //5-Years Return - средний возврат за последние 5 лет
    return 0
}

async function USAStockGetSummaryDetail(ID, cookie, crumb) { //Dividend Yield - годовая дивидендная доходность
    // https://query1.finance.yahoo.com/v10/finance/quoteSummary/GRMN?modules=summaryDetail&crumb=rxBh.H4z62E
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ID}?modules=summaryDetail&crumb=${crumb}`
    console.log("%s. url для %s: %s", getFunctionName(), ID, url);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
                'cookie': cookie
            },
            timeout: 10000 // Увеличиваем таймаут до 10 секунд
        });
        const json = await response.json()
        dividendYield = json.quoteSummary.result[0].summaryDetail.dividendYield.fmt
        averageDailyVolume10Day = json.quoteSummary.result[0].summaryDetail.averageDailyVolume10Day.raw
        marketCap = json.quoteSummary.result[0].summaryDetail.marketCap.raw

        if (typeof dividendYield == "undefined") dividendYield = 0
        dividendYield = +dividendYield.split('%')[0]
        averageDailyVolume10Day = Number((averageDailyVolume10Day / 1000000).toFixed(3)) // переводим в миллионы
        marketCap = Math.round(marketCap / 1000000) // переводим в миллионы

        console.log(`${getFunctionName()}. dividendYield для ${ID} = ${dividendYield}%.`)
        console.log(`${getFunctionName()}. averageDailyVolume10Day для ${ID} = ${averageDailyVolume10Day} миллионов $.`)
        console.log(`${getFunctionName()}. marketCap для ${ID} = ${marketCap} миллионов $.`)
        return {
            dividendYield,
            averageDailyVolume10Day,
            marketCap
        }
    } catch (e) {
        console.log(`Ошибка в ${getFunctionName()}: ${e}.`)
        return 0
    }
}

async function financialData(ticker, cookie, crumb) { // Считывание средних цен аналитиков
    // https://query1.finance.yahoo.com/v10/finance/quoteSummary/GRMN?modules=financialData&crumb=rxBh.H4z62E
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData&crumb=${crumb}`
    console.log(`${getFunctionName()}. Ссылка для ${ticker}: ${url}.`)
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
                'cookie': cookie
            },
            timeout: 10000 // Увеличиваем таймаут до 10 секунд
        });
        const json = await response.json()
        var currentPrice = json.quoteSummary.result[0].financialData.currentPrice.raw
        var targetMeanPrice = json.quoteSummary.result[0].financialData.targetMeanPrice.raw
        GrowthPotential = +(100 - (100 / (targetMeanPrice / currentPrice))).toFixed(2)
        console.log(`${getFunctionName()}. Analyst Price Targets для ${ticker}:\ncurrent: ${currentPrice}, average ${targetMeanPrice} \nGrowth potential: ${GrowthPotential}%.`)
        if (targetMeanPrice && currentPrice) {
            return `${currentPrice}|${targetMeanPrice}|${GrowthPotential}`
        } else {
            return `X|X|X`
        }
    } catch (e) {
        console.log(`${getFunctionName()}. Ошибка: ${e}.`)
        return `X|X|X`
    }
}

async function recommendationTrend(ticker, cookie, crumb) { // Количество рекомендаций аналитиков
    // https://query1.finance.yahoo.com/v10/finance/quoteSummary/GRMN?modules=recommendationTrend&crumb=rxBh.H4z62E
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=recommendationTrend&crumb=${crumb}`
    // console.log(`${getFunctionName()}. Ссылка для ${ticker}: ${url}.`)
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
                'cookie': cookie
            },
            timeout: 10000 // Увеличиваем таймаут до 10 секунд
        });
        const json = await response.json()
        var strongBuy0 = json.quoteSummary.result[0].recommendationTrend.trend[0].strongBuy
        var buy0 = json.quoteSummary.result[0].recommendationTrend.trend[0].buy
        var hold0 = json.quoteSummary.result[0].recommendationTrend.trend[0].hold
        var sell0 = json.quoteSummary.result[0].recommendationTrend.trend[0].sell
        var strongSell0 = json.quoteSummary.result[0].recommendationTrend.trend[0].strongSell
        sumOfRecommendations0 = strongBuy0 + buy0 + hold0 + sell0 + strongSell0
        console.log(`${getFunctionName()}. Recommendation Trends для ${ticker}, текущий месяц:\nStrong Buy: ${strongBuy0}; Buy: ${buy0}; Hold: ${hold0}; Sell: ${sell0}; Strong Sell: ${strongSell0}.\nИтого: ${sumOfRecommendations0} рекомендаций.`)

        var strongBuy1 = json.quoteSummary.result[0].recommendationTrend.trend[1].strongBuy
        var buy1 = json.quoteSummary.result[0].recommendationTrend.trend[1].buy
        var hold1 = json.quoteSummary.result[0].recommendationTrend.trend[1].hold
        var sell1 = json.quoteSummary.result[0].recommendationTrend.trend[1].sell
        var strongSell1 = json.quoteSummary.result[0].recommendationTrend.trend[1].strongSell
        sumOfRecommendations1 = strongBuy1 + buy1 + hold1 + sell1 + strongSell1
        console.log(`${getFunctionName()}. Recommendation Trends для ${ticker}, предыдущий месяц:\nStrong Buy: ${strongBuy1}; Buy: ${buy1}; Hold: ${hold1}; Sell: ${sell1}; Strong Sell: ${strongSell1}.\nИтого: ${sumOfRecommendations1} рекомендаций.`)

        return sumOfRecommendations0 + sumOfRecommendations1
    } catch (e) {
        console.log(`${getFunctionName()}. Ошибка: ${e}.`)
        return 0
    }
}

/**
 * Поиск тикеров
 */

async function YahooSymbolDownloader(ID) { //Yahoo ticker downloader
    const url = `https://finance.yahoo.com/_finance_doubledown/api/resource/searchassist;searchTerm=${ID}?device=console&returnMeta=true`
    console.log(`\n${getFunctionName()}. Ссылка для ${ID}: ${url}.`)
    var symbolArray = []
    try {
        const response = await fetch(url)
        const json = await response.json()
        var count = json.data.items.length
        for (var i = 0; i <= count - 1; i++) {
            var typeDisp = json.data.items[i].typeDisp
            if (typeDisp == 'Equity') { // проверка, что это акция
                var symbol = json.data.items[i].symbol
                var name = json.data.items[i].name
                console.log(`${getFunctionName()}. Yahoo ticker для ${ID}: ${symbol} [${name}].`)
                symbolArray.push(symbol)
            }
        }
        console.log(`${getFunctionName()}. Массив для ${ID}: ${JSON.stringify(symbolArray)}.`)
        return symbolArray
    } catch (e) {
        console.log(`${getFunctionName()}. Ошибка: ${e}.`)
    }
}

/**
 * Общие вспомогательные функции
 */

async function loadFetch() {
    const fetch = (await import('node-fetch')).default
    return fetch
}
async function loadDelay() {
    const delay = (await import('delay')).default
    return delay
}

async function HTMLgenerate(array, conditions, log) { //генерирование HTML https://developers.google.com/chart/interactive/docs/gallery/table?hl=ru
    const hmtl = `
    <!DOCTYPE html>
    <html lang="ru">

    <head>
        <meta charset="utf-8">
        <title>🕵️ Yahoo Finance. Recommendation</title>
        <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
        <script type="text/javascript">
            google.charts.load('current', {
                'packages': ['table']
            });
            google.charts.setOnLoadCallback(drawTable);

            function drawTable() {
                var data = new google.visualization.DataTable();

                data.addColumn('string', 'Наименование');
                data.addColumn('string', 'Идентификатор');
                data.addColumn('number', 'Текущая<br>цена');
                data.addColumn('number', 'Средний оборот<br>за 10 дней<br>в миллионах');
                data.addColumn('number', 'Потенциал роста +<br>падения -, %');
                data.addColumn('number', 'Дивидендная<br>доходность, %');
                data.addColumn('string', 'Cектор');
                data.addColumn('number', 'Текущая<br>капитализация<br>в миллионах');
                data.addColumn('string', 'Логотип');
                data.addColumn('number', 'Количество аналитиков<br>за 2 месяца');
                
                data.addRows(
                    ${JSON.stringify(array)
                        .replace(/\"/g, '\'')}
                );
                var table = new google.visualization.Table(document.getElementById('table_div'));
                table.draw(data, {
                    allowHtml: true,
                    showRowNumber: true,
                    width: '100%',
                    height: '100%',
                    sortColumn: 4,
                    sortAscending: false,
                    allowHtml: true // Включает рендеринг HTML
                });
            }
        </script>
    </head>

    <body>
        <noscript>
            ${makeTableHTML(array)}
            <small>(JavaScript в этом браузере отключён, поэтому таблица не динамическая)</small>
        </noscript>
        <div id="table_div"></div>
        <p>Выборка сгенерирована ${new Date().toLocaleString("ru-RU")} по условиям 📜:
        <ol>
            ${conditions}
        </ol>
        Составил <a href="https://shardin.name/" target="_blank"> Михаил Шардин</a>.<br>
        <small>Подробнее про систему поиска недооцененных американских акций, используя данные Яху Финанс <a href="https://habr.com/ru/articles/836450/" target="_blank">в статье на Хабре</a>.</small></p>
        <details>
            <summary>Техническая информация</summary><small>
                <ol>
                    ${log}
                </ol>
            </small>
        </details>
    </body>

    </html>`

    try {
        fs.writeFileSync(path.resolve(__dirname, `./searching_results/YahooFinance_Recommendation_${moment().format('YYYY-MM-DD')}.html`), hmtl)
        console.log(`\nЗаписано на диск с именем ${moment().format('YYYY-MM-DD')}.html`)
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }

}
module.exports.HTMLgenerate = HTMLgenerate;

function makeTableHTML(bonds) { //генерируем html таблицу из массива
    var result = `<table style="text-align: center; border: 1px solid green; border-collapse: collapse; border-style: hidden;">
        <tr>
            <td>Наименование</td>
            <td>Идентификатор</td>
            <td>Текущая цена</td>
            <td>Средний оборот за 10 дней</td>
            <td>Потенциал роста + /падения -, %</td>            
            <td>Див. доходность, %</td>
            <td>Сектор</td>
            <td>Текущая капитализация</td>
            <td>Логотип</td>
            <td>Кол-во аналитиков за 2 месяца</td>
        </tr>`
    for (var i = 0; i < bonds.length; i++) {
        result += "<tr>";
        for (var j = 0; j < bonds[i].length; j++) {
            result += '<td style="border: 1px solid green;">' + bonds[i][j] + "</td>";
        }
        result += "</tr>";
    }
    result += "</table>";
    return result;
}

function getFunctionName() { //автоматически получаем имя функции
    return (new Error()).stack.split('\n')[2].split(' ')[5];
}
module.exports.getFunctionName = getFunctionName;