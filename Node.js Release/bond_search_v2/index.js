/**
 * SilverFir: Investment Report 🌲 [Node.js Release]
 * https://fir.icu/
 *
 * Модуль поиска облигаций по параметрам [bond_search_v2/index.js]
 *
 * Запуск под Linux: $ npm start
 * Запуск под Windows: start.bat
 * Запуск в docker: docker-compose up
 * Подробности: https://habr.com/ru/post/506720/
 *
 * @author Mikhail Shardin [Михаил Шардин]
 * https://www.facebook.com/mikhail.shardin/
 *
 * Last updated: 23.05.2020
 *
 */

bond_search_v2()

async function bond_search_v2() {
    let startTime = (new Date()).getTime(); //записываем текущее время в формате Unix Time Stamp - Epoch Converter
    console.log("Функция %s начала работу в %s. \n", getFunctionName(), (new Date()).toLocaleString())

    global.fetch = require("node-fetch")
    global.fs = require("fs")

    await MOEXsearchBonds()

    let currTime = (new Date()).getTime();
    let duration = Math.round((currTime - startTime) / 1000 / 60 * 100) / 100; //время выполнения скрипта в минутах
    console.log("\nФункция %s закончила работу в %s.", getFunctionName(), (new Date()).toLocaleString())
    console.log("Время выполнения %s в минутах: %s.", getFunctionName(), duration)
}

/**
 * Основная функция
 */

async function MOEXsearchBonds() { //поиск облигаций по параметрам
    const YieldMore = process.env.YieldMore || '7' //Доходность больше этой цифры
    const YieldLess = process.env.YieldLess || '14' //Доходность меньше этой цифры
    const PriceMore = process.env.PriceMore || '95' //Цена больше этой цифры
    const PriceLess = process.env.PriceLess || '101' //Цена меньше этой цифры
    const DurationMore = process.env.DurationMore || '1' //Дюрация больше этой цифры
    const DurationLess = process.env.DurationLess || '6' //Дюрация меньше этой цифры
    const VolumeMore = process.env.VolumeMore || '5000' //Объем сделок за n дней, шт. больше этой цифры
    const conditions = `<li>${YieldMore}% < Доходность < ${YieldLess}%</li>
                        <li>${PriceMore}% < Цена < ${PriceLess}%</li>
                        <li>${DurationMore} мес. < Дюрация < ${DurationLess} мес.</li>
                        <li>Объем сделок за n дней > ${VolumeMore} шт.</li>
                        <li>Поиск в Т0, Т+, Т+ (USD) - Основной режим - безадрес.</li>`
    var bonds = [
        // ["BondName", "SECID", "BondPrice", "BondVolume", "BondYield", "BondDuration", "BondTax"],
    ]
    var count
    var log = `<li>Поиск начат ${new Date().toLocaleString()}.</li>`
    for (const t of [7, 58, 193]) { // https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/
        const url = `https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/${t}/securities.json?iss.dp=comma&iss.meta=off&iss.only=securities,marketdata&securities.columns=SECID,SECNAME,PREVLEGALCLOSEPRICE&marketdata.columns=SECID,YIELD,DURATION`
        console.log('%s. Ссылка поиска всех доступных облигаций группы: %s', getFunctionName(), url)
        log += '<li><b>Ссылка поиска всех доступных облигаций группы: ' + url + '.</b></li>'
        try {
            const response = await fetch(url)
            const json = await response.json()
            if (json.marketdata.data[0][1] == 0) {
                console.log('%s. Нет данных c Московской биржи. Проверьте вручную по ссылке выше.', getFunctionName())
                break
            }
            let list = json.securities.data
            count = list.length
            console.log('%s. Всего в списке: %s бумаг.', getFunctionName(), count)
            log += '<li>Всего в списке: ' + count + ' бумаг.</li>'
            // for (var i = 0; i <= 200; i++) {
            for (var i = 0; i <= count - 1; i++) {
                BondName = json.securities.data[i][1].replace(/\"/g, '').replace(/\'/g, '')
                SECID = json.securities.data[i][0]
                BondPrice = json.securities.data[i][2]
                BondYield = json.marketdata.data[i][1]
                BondDuration = Math.floor((json.marketdata.data[i][2] / 30) * 100) / 100 // кол-во оставшихся месяцев
                console.log('%s. Работа со строкой %s из %s: %s (%s).', getFunctionName(), (i + 1), count, BondName, SECID)
                log += '<li>Работа со строкой ' + (i + 1) + ' из ' + count + ': ' + SECID + ' (' + BondYield + '%, ' + BondPrice + ').</li>'
                if (BondYield > YieldMore && BondYield < YieldLess && //условия выборки
                    BondPrice > PriceMore && BondPrice < PriceLess &&
                    BondDuration > DurationMore && BondDuration < DurationLess) {

                    BondVolume = await MOEXsearchVolume(SECID)
                    if (BondVolume > VolumeMore) { //если оборот в бумагах больше этой цифры
                        BondTax = await MOEXsearchTax(SECID)
                        bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, BondTax])
                        console.log('%s. Cтрока № %s: %s.', getFunctionName(), bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                        log += '<li><b>Cтрока № ' + bonds.length + ': ' + JSON.stringify(bonds[bonds.length - 1]) + '.</b></li>'
                    }
                }
            }
        } catch (e) {
            console.log('Ошибка в %s', getFunctionName())
            log += '<li>Ошибка в  ' + getFunctionName() + '.</li>'
        }
    }
    if (bonds == 0) {
        return "В массиве нет строк"
    }
    await HTMLgenerate(bonds, conditions, log)
}
module.exports.MOEXsearchBonds = MOEXsearchBonds;

/**
 * Дополнительные функции
 */

async function MOEXsearchTax(ID) { //налоговые льготы для корпоративных облигаций, выпущенных с 1 января 2017 года
    const url = `https://iss.moex.com/iss/securities/${ID}.json?iss.meta=off&iss.only=description`
    console.log('%s. Ссылка для %s: %s', getFunctionName(), ID, url)
    try {
        const response = await fetch(url)
        const json = await response.json()
        STARTDATEMOEX = json.description.data.find(e => e[0] === 'STARTDATEMOEX')[2];
        // DAYSTOREDEMPTION = json.description.data.find(e => e[0] === 'DAYSTOREDEMPTION')[2]; //получение кол-ва оставшихся дней по погашения
        console.log("%s. Дата принятия решения о включении ценной бумаги в Список для %s: %s.", getFunctionName(), ID, STARTDATEMOEX);
        const trueFalse = new Date(STARTDATEMOEX) > new Date('2017-01-01')
        return trueFalse
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
}
module.exports.MOEXsearchTax = MOEXsearchTax;

async function MOEXsearchVolume(ID) { //суммирование оборотов по корпоративной облигации за последние n дней
    now = new Date();
    DateRequestPrevious = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() - 15}`; //этот день n дней назад
    const boardID = await MOEXboardID(ID)
    if (!boardID) {
        return
    }
    const url = `https://iss.moex.com/iss/history/engines/stock/markets/bonds/boards/${boardID}/securities/${ID}.json?iss.meta=off&iss.only=history&history.columns=SECID,TRADEDATE,VOLUME,NUMTRADES&limit=20&from=${DateRequestPrevious}`
    // numtrades - Минимальное количество сделок с бумагой
    // VOLUME - оборот в количестве бумаг (Объем сделок, шт)
    console.log('%s. Ссылка для %s: %s', getFunctionName(), ID, url)
    try {
        const response = await fetch(url)
        const json = await response.json()
        let list = json.history.data
        let count = list.length
        var volume_sum = 0
        for (var i = 0; i <= count - 1; i++) {
            volume = json.history.data[i][2];
            volume_sum += volume
        }
        console.log("%s. Оборот в бумагах (объем сделок, шт) для %s за последние %s дней: %s штук.", getFunctionName(), ID, count, volume_sum);
        return volume_sum
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
}
module.exports.MOEXsearchVolume = MOEXsearchVolume;

async function MOEXboardID(ID) { //узнаем boardid любой бумаги по тикеру
    const url = `https://iss.moex.com/iss/securities/${ID}.json?iss.meta=off&iss.only=boards&boards.columns=secid,boardid,is_primary`
    try {
        const response = await fetch(url)
        const json = await response.json()
        boardID = json.boards.data.find(e => e[2] === 1)[1]
        console.log("%s. boardID для %s: %s", getFunctionName(), ID, boardID);
        return boardID
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
}
module.exports.MOEXboardID = MOEXboardID;

/**
 * Общие вспомогательные функции
 */

async function HTMLgenerate(bonds, conditions, log) { //генерирование HTML https://developers.google.com/chart/interactive/docs/gallery/table?hl=ru
    const hmtl = `
    <!DOCTYPE html>
    <html lang="ru">

    <head>
        <meta charset="utf-8">
        <title>Мосбиржа. Фильтр облигаций</title>
        <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
        <script type="text/javascript">
            google.charts.load('current', {
                'packages': ['table']
            });
            google.charts.setOnLoadCallback(drawTable);

            function drawTable() {
                var data = new google.visualization.DataTable();

                data.addColumn('string', 'Полное наименование');
                data.addColumn('string', 'Код ценной бумаги');
                data.addColumn('number', 'Цена, %');
                data.addColumn('number', 'Объем сделок за n дней, шт.');
                data.addColumn('number', 'Доходность');
                data.addColumn('number', 'Дюрация, месяцев');
                data.addColumn('boolean', 'Есть льгота?');
                data.addRows(
                    ${JSON.stringify(bonds).replace(/\"/g, '\'')}
                );
                var table = new google.visualization.Table(document.getElementById('table_div'));
                table.draw(data, {
                    showRowNumber: true,
                    width: '100%',
                    height: '100%',
                    sortColumn: 3,
                    sortAscending: false
                });
            }
        </script>
    </head>

    <body>
        <noscript>
            ${makeTableHTML(bonds)}
            <small>(JavaScript в этом браузере отключён, поэтому таблица не динамическая)</small>
        </noscript>
        <div id="table_div"></div>
        <p>Выборка сгенерирована ${new Date().toLocaleString()} по условиям 📜:
        <ul>
            ${conditions}
        </ul>
        Составил <a href="https://www.facebook.com/mikhail.shardin" target="_blank"> Михаил Шардин</a>.</p>
        <details>
            <summary>Техническая информация</summary><small>
                <ol>
                    ${log}
                </ol>
            </small>
        </details>
    </body>

    </html>`
    var out_file_name = './out/bond_search-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "-"+ now.getHours() + "-" + now.getMinutes() +'.html'
    fs.writeFileSync(out_file_name, hmtl)

}
module.exports.HTMLgenerate = HTMLgenerate;

function makeTableHTML(bonds) { //генерируем html таблицу из массива
    var result = `<table style="text-align: center; border: 1px solid green; border-collapse: collapse; border-style: hidden;">
        <tr>
            <td>Полное наименование</td>
            <td>Код ценной бумаги</td>
            <td>Цена, %</td>
            <td>Объем сделок за n дней, шт.</td>
            <td>Доходность</td>
            <td>Дюрация, месяцев</td>
            <td>Есть льгота?</td>
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
