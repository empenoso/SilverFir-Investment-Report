/**
 * SilverFir: Investment Report 🌲 [Node.js Release]
 * https://fir.icu/
 * 
 * Модуль поиска облигаций по параметрам [bond_search_v2/index.js]
 * 
 * Описание: https://habr.com/ru/post/506720/ (2020 год)
 * Описание: https://habr.com/ru/post/533016/ (2021 год)
 * 
 * @author Mikhail Shardin [Михаил Шардин] 
 * https://shardin.name/
 * 
 * Last updated: 05.04.2022
 * 
 */

start()

async function start() {
    let startTime = (new Date()).getTime(); //записываем текущее время в формате Unix Time Stamp - Epoch Converter
    console.log("Функция %s начала работу в %s. \n", getFunctionName(), (new Date()).toLocaleString("ru-RU"))

    global.fetch = require("node-fetch")
    global.fs = require("fs")
    global.path = require('path')
    global.moment = require('moment')

    await MOEXsearchBonds()

    let currTime = (new Date()).getTime();
    let duration = Math.round((currTime - startTime) / 1000 / 60 * 100) / 100; //время выполнения скрипта в минутах
    console.log("\nФункция %s закончила работу в %s.", getFunctionName(), (new Date()).toLocaleString("ru-RU"))
    console.log("Время выполнения %s в минутах: %s.", getFunctionName(), duration)
}
module.exports.start = start;

/**
 * Основная функция
 */

async function MOEXsearchBonds() { //поиск облигаций по параметрам
    const YieldMore = 15 //Доходность больше этой цифры
    const YieldLess = 40 //Доходность меньше этой цифры
    const PriceMore = 60 //Цена больше этой цифры
    const PriceLess = 110 //Цена меньше этой цифры
    const DurationMore = 6 //Дюрация больше этой цифры
    const DurationLess = 13 //Дюрация меньше этой цифры
    const VolumeMore = 600 //Объем сделок в каждый из n дней, шт. больше этой цифры
    const BondVolumeMore = 10000 // Совокупный объем сделок за n дней, шт. больше этой цифры
    const OfferYesNo = "ДА" //Учитывать, чтобы денежные выплаты были известны до самого погашения? 
    // ДА - облигации только с известными цифрами выплаты купонов
    // НЕТ - не важно, пусть в какие-то даты вместо выплаты прочерк
    const conditions = `<li>${YieldMore}% < Доходность < ${YieldLess}%</li>
                        <li>${PriceMore}% < Цена < ${PriceLess}%</li>
                        <li>${DurationMore} мес. < Дюрация < ${DurationLess} мес.</li> 
                        <li>Значения всех купонов известны до самого погашения: ${OfferYesNo}.</li>                         
                        <li>Объем сделок в каждый из 15 последних дней (c ${moment().subtract(15, 'days').format('DD.MM.YYYY')}) > ${VolumeMore} шт.</li>
                        <li>Совокупный объем сделок за 15 дней больше ${BondVolumeMore} шт.</li> 
                        <li>Поиск в Т0, Т+, Т+ (USD) - Основной режим - безадрес.</li>`
    var bonds = []
    var count
    var log = `<li>Поиск начат ${new Date().toLocaleString("ru-RU")}.</li>`
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
                console.log(`${getFunctionName()}. Строка ${i + 1} из ${count}: ${BondName} (${SECID}): цена=${BondPrice}%, доходность=${BondYield}%, дюрация=${BondDuration} мес.`)
                log += '<li>Строка ' + (i + 1) + ' из ' + count + ': ' + BondName + ' (' + SECID + '): цена=' + BondPrice + '%, доходность=' + BondYield + '%, дюрация=' + BondDuration + ' мес.</li>'
                if (BondYield > YieldMore && BondYield < YieldLess && //условия выборки
                    BondPrice > PriceMore && BondPrice < PriceLess &&
                    BondDuration > DurationMore && BondDuration < DurationLess) {
                    console.log(`${getFunctionName()}. \\-> Условие доходности (${BondYield}%), цены (${BondPrice}%) и дюрации (${BondDuration} мес.) для ${BondName} прошло.`)
                    volume = await MOEXsearchVolume(SECID, VolumeMore)
                    let BondVolume = volume.value
                    log += volume.log
                    console.log(`${getFunctionName()}. \\-> Совокупный объем сделок за n дней: ${BondVolume}, а условие ${BondVolumeMore} шт.`)
                    if (volume.lowLiquid == 0 && BondVolume > BondVolumeMore) { // lowLiquid: 0 и 1 - переключатели. 
                        //❗ 0 - чтобы оборот был строго больше заданного
                        //❗ 1 - фильтр оборота не учитывается, в выборку попадают все бумаги, подходящие по остальным параметрам
                        MonthsOfPayments = await MOEXsearchMonthsOfPayments(SECID)
                        MonthsOfPaymentsDates = MonthsOfPayments.formattedDates
                        MonthsOfPaymentsNull = MonthsOfPayments.value_rubNull
                        log += MonthsOfPayments.log
                        if (OfferYesNo == "ДА" && MonthsOfPaymentsNull == 0) {
                            bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, MonthsOfPaymentsDates])
                            console.log(`${getFunctionName()}. Для ${BondName} все даты будущих платежей с известным значением выплат.`)
                            log += '<li>Для ' + BondName + ' все даты будущих платежей с известным значением выплат.</li>'
                            console.log('%s. Результат № %s: %s.', getFunctionName(), bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                            log += '<li><b>Результат № ' + bonds.length + ': ' + JSON.stringify(bonds[bonds.length - 1]) + '.</b></li>'
                        }
                        if (OfferYesNo == "НЕТ") {
                            bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, MonthsOfPaymentsDates])
                            console.log('%s. Результат № %s: %s.', getFunctionName(), bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                            log += '<li><b>Результат № ' + bonds.length + ': ' + JSON.stringify(bonds[bonds.length - 1]) + '.</b></li>'
                        }
                    } else {
                        console.log(`${getFunctionName()}. Облигация ${BondName}, ${SECID} в выборку не попадает из-за малых оборотов или доступно мало торговых дней.`)
                        log += `<li>Облигация ${BondName}, ${SECID} в выборку не попадает из-за малых оборотов или доступно мало торговых дней.</li>`
                    }
                }

            }
        } catch (e) {
            console.log(`Ошибка в ${getFunctionName()}: ${e}.`)
            log += '<li>Ошибка в  ' + getFunctionName() + '.</li>'
        }
    }
    if (bonds == 0) {
        console.log(`${getFunctionName()}. В массиве нет строк.`)
        return "В массиве нет строк"
    }
    bonds.sort(function (x, y) { // сортировка по столбцу Объем сделок за n дней, шт.
        var xp = x[3];
        var yp = y[3];
        return xp == yp ? 0 : xp > yp ? -1 : 1;
    });
    log += `<li>Поиск завершён ${new Date().toLocaleString("ru-RU")}.</li>`

    console.log(`${getFunctionName()}. Выборка: ${JSON.stringify(bonds[0,1])}, ...`)
    await HTMLgenerate(bonds, conditions, log)
}
module.exports.MOEXsearchBonds = MOEXsearchBonds;

/**
 * Дополнительные функции
 */

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
            if (thresholdValue > volume) { // если оборот в конкретный день меньше 
                lowLiquid = 1
                console.log(`${getFunctionName()}. На ${i+1}-й день (${json.history.data[i][1]}) из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.`)
                log += `<li>Поиск оборота. На ${i+1}-й день (${json.history.data[i][1]}) из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.</li>`
            }
            if (count < 6) { // если всего дней в апи на этом периоде очень мало
                lowLiquid = 1
                console.log(`${getFunctionName()}. Всего в АПИ Мосбиржи доступно ${count} дней, а надо хотя бы больше 6 торговых дней с ${DateRequestPrevious}!`)
                log += `<li>Поиск оборота. Всего в АПИ Мосбиржи доступно ${count} дней, а надо хотя бы больше 6 торговых дней с ${DateRequestPrevious}!</li>`
            }
        }
        if (lowLiquid != 1) {
            console.log(`${getFunctionName()}. Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.`)
            log += `<li>Поиск оборота. Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.</li>`
        }
        console.log(`${getFunctionName()}. Итоговый оборот в бумагах (объем сделок, шт) за ${count} дней: ${volume_sum} шт нарастающим итогом.`)
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
        // console.log("%s. boardID для %s: %s", getFunctionName(), ID, boardID);
        return boardID
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
}
module.exports.MOEXboardID = MOEXboardID;

async function MOEXsearchMonthsOfPayments(ID) { //узнаём месяцы, когда происходят выплаты
    var log = ''
    const url = `https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/${ID}.json?iss.meta=off&iss.only=coupons`
    // для бумаг с большим количеством выплат АПИ выводит только первые 19 выплат, например:
    // https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/RU000A100CG7
    // https://bonds.finam.ru/issue/details0251800002/default.asp
    console.log(`${getFunctionName()}. Ссылка для поиска месяцев выплат для ${ID}: ${url}.`)
    try {
        const response = await fetch(url)
        const json = await response.json()
        var couponDates = []
        var value_rubNull = 0
        for (var i = 0; i <= json.coupons.data.length - 1; i++) {
            coupondate = json.coupons.data[i][3] // даты купона
            value_rub = json.coupons.data[i][9] // сумма выплаты купона
            inFuture = new Date(coupondate) > new Date()
            if (inFuture == true) {
                couponDates.push(+coupondate
                    .split("-")[1]
                )
                // console.log(`${getFunctionName()}. Купон для ${ID} выплачивается в месяц ${JSON.stringify(couponDates[couponDates.length - 1])} (строка ${couponDates.length}).`)
                // console.log(`${getFunctionName()}. Для ${ID} выплата ${coupondate} в размере ${value_rub} руб.`)
                if (value_rub == null) {
                    value_rubNull += 1
                }
            }
        }
        if (value_rubNull > 0) {
            console.log(`${getFunctionName()}. Для ${ID} есть ${value_rubNull} дат(ы) будущих платежей с неизвестным значением выплат.`)
            log += `<li>Поиск выплат. Для ${ID} есть ${value_rubNull} дат(ы) будущих платежей с неизвестным значением выплат.</li>`
        }
        let uniqueDates = [...new Set(couponDates)] // уникальные значения месяцев
        uniqueDates = uniqueDates.sort(function (a, b) {
            return a - b;
        })
        console.log(`${getFunctionName()}. Купоны для ${ID} выплачиваются в ${uniqueDates} месяцы.`)
        log += `<li>Поиск выплат. Купоны для ${ID} выплачиваются в ${uniqueDates} месяцы.</li>`
        let formattedDates = ''
        for (let y = 1; y < 13; y++) {
            formattedDates += uniqueDates.includes(y) ? `${y}` : `–––`
            formattedDates += y == 12 ? `` : `-` // -
        }
        formattedDates = formattedDates
            .replace(/^1-/g, 'янв-')
            .replace(/2-/g, 'фев-')
            .replace(/3-/g, 'мар-')
            .replace(/4-/g, 'апр-')
            .replace(/5-/g, 'май-')
            .replace(/6-/g, 'июн-')
            .replace(/7-/g, 'июл-')
            .replace(/8-/g, 'авг-')
            .replace(/9-/g, 'сен-')
            .replace(/10-/g, 'окт-')
            .replace(/11-/g, 'ноя-')
            .replace(/12/g, '-дек')
        // console.log(`${getFunctionName()}. Сформатированная строка вывода в которой есть месяцы выплат: ${formattedDates}.`)
        // log += `<li>Поиск выплат. Сформатированная строка вывода в которой есть месяцы выплат: ${formattedDates}.</li>`
        return {
            formattedDates: formattedDates,
            value_rubNull: value_rubNull,
            log: log
        }
    } catch (e) {
        console.log('Ошибка в %s', getFunctionName())
    }
}
module.exports.MOEXsearchMonthsOfPayments = MOEXsearchMonthsOfPayments;

async function MOEXsearchTax(ID) { //налоговые льготы для корпоративных облигаций, выпущенных с 1 января 2017 года. Неактуально с 1 января 2021 года
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
                data.addColumn('number', 'Объем сделок , шт.'); // с ${moment().subtract(15, 'days').format('DD.MM.YYYY')}
                data.addColumn('number', 'Доходность');
                data.addColumn('number', 'Дюрация, месяцев');
                data.addColumn('string', 'Месяцы выплат');
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
            ${makeTableHTML(bonds)
                .replace(/янв/g, '01')
                .replace(/фев/g, '02')
                .replace(/мар/g, '03')
                .replace(/апр/g, '04')
                .replace(/май/g, '05')
                .replace(/июн/g, '06')
                .replace(/июл/g, '07')
                .replace(/авг/g, '08')
                .replace(/сен/g, '09')
                .replace(/окт/g, '10')
                .replace(/ноя/g, '11')
                .replace(/дек/g, '12')
                .replace(/\–\–\–/g, '––')
            }
            <small>(JavaScript в этом браузере отключён, поэтому таблица не динамическая)</small>
        </noscript>
        <div id="table_div"></div>
        <p>Выборка сгенерирована ${moment().format('DD.MM.YYYY')} по условиям 🔎:
        <ul>
            ${conditions}
        </ul>
        Составил <a href="https://github.com/empenoso" target="_blank"> Михаил Шардин</a>.<br>
        <small>Подробнее про скрипт поиска ликвидных облигаций <a href="https://habr.com/ru/post/533016/ " target="_blank">в статье на Хабре</a>.</small></p>
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
        fs.writeFileSync(path.resolve(__dirname, `./searching_results/bond_search_${moment().format('YYYY-MM-DD')}.html`), hmtl)
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
            <td>Месяцы выплат</td>
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
