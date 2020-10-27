/**
 * SilverFir: Investment Report 🌲 [Node.js Release]
 * https://fir.icu/
 * 
 * Модуль поиска облигаций по параметрам [bond_search_v2/index.js]
 * 
 * Запуск под Linux: $ npm start
 * Запуск под Windows: start.bat
 * Подробности: https://habr.com/ru/post/506720/ 
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * https://www.facebook.com/mikhail.shardin/
 * 
 * Last updated: 27.10.2020
 * 
 */

start()

async function start() {
    let startTime = (new Date()).getTime(); //записываем текущее время в формате Unix Time Stamp - Epoch Converter
    console.log("Функция %s начала работу в %s. \n", getFunctionName(), (new Date()).toLocaleString())

    global.fetch = require("node-fetch")
    global.fs = require("fs")
    global.path = require('path')
    global.moment = require('moment')

    await MOEXsearchBonds()

    let currTime = (new Date()).getTime();
    let duration = Math.round((currTime - startTime) / 1000 / 60 * 100) / 100; //время выполнения скрипта в минутах
    console.log("\nФункция %s закончила работу в %s.", getFunctionName(), (new Date()).toLocaleString())
    console.log("Время выполнения %s в минутах: %s.", getFunctionName(), duration)
}
module.exports.start = start;

/**
 * Основная функция
 */

async function MOEXsearchBonds() { //поиск облигаций по параметрам
    const YieldMore = 9 //Доходность больше этой цифры
    const YieldLess = 13 //Доходность меньше этой цифры
    const PriceMore = 97 //Цена больше этой цифры
    const PriceLess = 103 //Цена меньше этой цифры
    const DurationMore = 6 //Дюрация больше этой цифры
    const DurationLess = 36 //Дюрация меньше этой цифры
    const VolumeMore = 500 //Объем сделок в каждый из n дней, шт. больше этой цифры
    const conditions = `<li>${YieldMore}% < Доходность < ${YieldLess}%</li>
                        <li>${PriceMore}% < Цена < ${PriceLess}%</li>
                        <li>${DurationMore} мес. < Дюрация < ${DurationLess} мес.</li> 
                        <li>Объем сделок в каждый из 15 последних дней (c ${moment().subtract(15, 'days').format('DD.MM.YYYY')}) > ${VolumeMore} шт.</li>
                        <li>Поиск в Т0, Т+, Т+ (USD) - Основной режим - безадрес.</li>`
    var bonds = [
        // ["BondName", "SECID", "BondPrice", "BondVolume", "BondYield", "BondDuration", "BondTax"],
    ]
    var count
    var log = `<li>Поиск начат ${new Date().toLocaleString()}.</li>`
    for (const t of [7, 58, 193]) { // https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/
        const url = `https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/${t}/securities.json?iss.dp=comma&iss.meta=off&iss.only=securities,marketdata&securities.columns=SECID,SECNAME,PREVLEGALCLOSEPRICE&marketdata.columns=SECID,YIELD,DURATION`
        console.log(`${getFunctionName()}. Ссылка поиска всех доступных облигаций группы: ${url}.`)
        log += `<li><b>Ссылка поиска всех доступных облигаций группы ${t}: <a target="_blank" rel="noopener noreferrer" href="${url}">${url}</a>.</b></li>`
        try {
            const response = await fetch(url)
            const json = await response.json()
            // if (json.marketdata.data[0][1] == 0) {
            //     console.log('%s. Нет данных c Московской биржи. Проверьте вручную по ссылке выше.', getFunctionName())
            //     break
            // }
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
                console.log(`${getFunctionName()}. Строка ${i + 1} из ${count}: ${BondName} (${SECID}): цена=${BondPrice}%, доходность=${BondYield}%.`)
                log += '<li>Строка ' + (i + 1) + ' из ' + count + ': ' + BondName + ' (' + SECID + '): цена=' + BondPrice + '%, доходность=' + BondYield + '%.</li>'
                if (BondYield > YieldMore && BondYield < YieldLess && //условия выборки
                    BondPrice > PriceMore && BondPrice < PriceLess &&
                    BondDuration > DurationMore && BondDuration < DurationLess) {
                    console.log(`${getFunctionName()}. \\-> Условие доходности (${BondYield}%), цены (${BondPrice}%) и дюрации (${BondDuration} мес.) прошло.`)
                    volume = await MOEXsearchVolume(SECID, VolumeMore)
                    BondVolume = volume.value
                    log += volume.log
                    if (volume.lowLiquid == 0) { // lowLiquid: 0 и 1 просто переключатели. 1 - если за какой-то из дней оборот был меньше заданного
                        BondTax = await MOEXsearchTax(SECID)
                        bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, BondTax])
                        console.log('%s. Cтрока № %s: %s.', getFunctionName(), bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                        log += '<li><b>Результат № ' + bonds.length + ': ' + JSON.stringify(bonds[bonds.length - 1]) + '.</b></li>'
                    }
                }
            }
        } catch (e) {
            console.log(`Ошибка в ${getFunctionName()}: ${e}.`)
            log += '<li>Ошибка в  ' + getFunctionName() + '.</li>'
        }
    }
    if (bonds == 0) {
        return "В массиве нет строк"
    }
    bonds.sort(function (x, y) { // сортировка по столбцу Объем сделок за n дней, шт.
        var xp = x[3];
        var yp = y[3];
        return xp == yp ? 0 : xp > yp ? -1 : 1;
    });
    log += `<li>Поиск завершён ${new Date().toLocaleString()}.</li>`

    console.log(`${getFunctionName()}. Выборка: ${JSON.stringify(bonds[0,1])}, ...`)
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

async function MOEXsearchVolume(ID, thresholdValue) { // Объем сделок в каждый из n дней больше определенного порога
    now = new Date();
    DateRequestPrevious = moment().subtract(15, 'days').format('YYYY-MM-DD') // `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() - 15}`; //этот день n дней назад
    const boardID = await MOEXboardID(ID)
    if (!boardID) {
        return
    }
    const url = `https://iss.moex.com/iss/history/engines/stock/markets/bonds/boards/${boardID}/securities/${ID}.json?iss.meta=off&iss.only=history&history.columns=SECID,TRADEDATE,VOLUME,NUMTRADES&limit=20&from=${DateRequestPrevious}`
    // numtrades - Минимальное количество сделок с бумагой
    // VOLUME - оборот в количестве бумаг (Объем сделок, шт)
    var log = ''
    console.log('%s. Ссылка для поиска объёма сделок %s: %s', getFunctionName(), ID, url)
    log += `<li>Поиск оборота. Ссылка: <a target="_blank" rel="noopener noreferrer" href="${url}">${url}</a>.</b></li>`
    try {
        const response = await fetch(url)
        const json = await response.json()
        let list = json.history.data
        let count = list.length
        var volume_sum = 0
        var lowLiquid = 0
        for (var i = 0; i <= count - 1; i++) {
            volume = json.history.data[i][2]
            volume_sum += volume
            if (thresholdValue > volume) {
                var lowLiquid = 1
                console.log(`${getFunctionName()}. На ${i+1}-й день из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.`)
                log += `<li>Поиск оборота. На ${i+1}-й день из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.</li>`                
            }
        }
        console.log(`${getFunctionName()}. Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.`)
        console.log(`${getFunctionName()}. Итоговый оборот в бумагах (объем сделок, шт) за ${count} дней: ${volume_sum} шт нарастающим итогом.`)
        log += `<li>Поиск оборота. Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.</li>`
        log += `<li>Поиск оборота. Итоговый оборот в бумагах (объем сделок, шт) за ${count} дней: ${volume_sum} шт нарастающим итогом.</li>`
        return {
            lowLiquid: lowLiquid,
            value: volume_sum,
            log: log
        }
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
        <title>🕵️ Мосбиржа. Фильтр облигаций</title>
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
                data.addColumn('number', 'Объем сделок с ${moment().subtract(15, 'days').format('DD.MM.YYYY')}, шт.');
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
        <p>Выборка сгенерирована ${new Date().toLocaleString()} по условиям 🔎:
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

    try {
        fs.writeFileSync(path.resolve(__dirname, `./bond_search_${moment().format('YYYY-MM-DD')}.html`), hmtl)
        console.log(`\nЗаписано на диск с именем ${moment().format('YYYY-MM-DD')}.html`)
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
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
