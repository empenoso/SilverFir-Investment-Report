/**
 * SilverFir 🌲. [GAS Release for Т—Ж]
 * 
 * Модуль поиска облигаций на Московской Бирже по параметрам
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * 
 * Last updated: 03.09.2023
 * 
 */

function bond_search_v102023() {
    eval(UrlFetchApp.fetch('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js').getContentText()); // использую https://momentjs.com/ для работы с датами

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var parameters = ss.getSheetByName("Параметры");
    var result = ss.getSheetByName("Результат");
    result.clear();
    result.clearFormats();
    const YieldMore = parameters.getRange("a3").getValue() //Доходность больше этой цифры
    const YieldLess = parameters.getRange("c3").getValue() //Доходность меньше этой цифры
    const PriceMore = parameters.getRange("a4").getValue() //Цена больше этой цифры
    const PriceLess = parameters.getRange("c4").getValue() //Цена меньше этой цифры
    const DurationMore = parameters.getRange("a5").getValue() //Дюрация больше этой цифры
    const DurationLess = parameters.getRange("c5").getValue() //Дюрация меньше этой цифры
    const VolumeMore = parameters.getRange("c7").getValue() //Объем сделок в каждый из 15 последних дней, шт. больше этой цифры
    const BondVolumeMore = parameters.getRange("c8").getValue() // Совокупный объем сделок за n дней, шт. больше этой цифры
    const OfferYesNo = parameters.getRange("c6").getValue() //Учитывать, чтобы денежные выплаты были известны до самого погашения? 
    const conditions = `Параметры поиска:
    - ${YieldMore}% < Доходность < ${YieldLess}% 
    - ${PriceMore}% < Цена < ${PriceLess}% 
    - ${DurationMore} мес. < Дюрация < ${DurationLess} мес.  
    - Значения всех купонов известны до самого погашения?: ${OfferYesNo}.
    - Объем сделок в каждый из 15 последних дней (c ${moment().subtract(15, 'days').format('DD.MM.YYYY')}) > ${VolumeMore} шт. 
    - Совокупный объем сделок за 15 дней больше ${BondVolumeMore} шт.
    - Поиск в Т0, Т+, Т+ (USD) - Основной режим - безадрес. `
    Logger.log(conditions)

    var bonds = []
    var count
    Logger.log(`Поиск начат ${new Date().toLocaleString("ru-RU")}.`)

    for (const t of [58, 193, 105, 77, 207, 167, 245]) { // https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/
        const url = 'https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/' + t + '/securities.json?iss.dp=comma&iss.meta=off&iss.only=securities,marketdata&securities.columns=SECID,SECNAME,PREVLEGALCLOSEPRICE&marketdata.columns=SECID,YIELD,DURATION'
        console.log('Ссылка поиска всех доступных облигаций группы: %s', url)
        try {
            const response = UrlFetchApp.fetch(url).getContentText();
            const json = JSON.parse(response);
            let list = json.securities.data
            count = list.length
            console.log('Всего в списке: %s бумаг.', count)
            for (var i = 0; i <= count - 1; i++) {
                BondName = json.securities.data[i][1].replace(/\"/g, '').replace(/\'/g, '')
                SECID = json.securities.data[i][0]
                BondPrice = json.securities.data[i][2]
                BondYield = json.marketdata.data[i][1]
                BondDuration = Math.floor((json.marketdata.data[i][2] / 30) * 100) / 100 // кол-во оставшихся месяцев 
                console.log(`Строка ${i + 1} из ${count}: ${BondName} (${SECID}): цена=${BondPrice}%, доходность=${BondYield}%.`)
                if (BondYield > YieldMore && BondYield < YieldLess && //условия выборки
                    BondPrice > PriceMore && BondPrice < PriceLess &&
                    BondDuration > DurationMore && BondDuration < DurationLess) {

                    console.log(`  \\-> Условие доходности (${YieldMore} < ${BondYield}% < ${YieldLess}), цены (${PriceMore} < ${BondPrice}% < ${PriceLess}) и дюрации (${DurationMore} < ${BondDuration} мес. < ${DurationLess}) для ${BondName} прошло.`)
                    volume = MOEXsearchVolume(SECID, VolumeMore)
                    BondVolume = volume.value

                    if (volume.lowLiquid == 0 && BondVolume > BondVolumeMore) { // lowLiquid: 0 и 1 - переключатели
                        //❗ 0 - чтобы оборот был строго больше заданного
                        //❗ 1 - фильтр оборота не учитывается, в выборку попадают все бумаги, подходящие по остальным параметрам
                        MonthsOfPayments = MOEXsearchMonthsOfPayments(SECID)

                        MonthsOfPaymentsDates = MonthsOfPayments.formattedDates
                        MonthsOfPaymentsNull = MonthsOfPayments.value_rubNull
                        if (OfferYesNo == "ДА" && MonthsOfPaymentsNull == 0) {
                            bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, MonthsOfPaymentsDates])
                            console.log(`Для ${BondName} все даты будущих платежей с известным значением выплат.`)
                            console.log('Результат № %s: %s.', bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                        }
                        if (OfferYesNo == "НЕТ") {
                            bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, MonthsOfPaymentsDates])
                            console.log('Результат № %s: %s.', bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                        }
                    } else {
                        console.log(`Облигация ${BondName}, ${SECID} в выборку не попадает из-за малых оборотов или доступно мало торговых дней.`)
                    }
                }
            }
        } catch (e) {
            console.log(`Ошибка в bond_search_v062023: ${e}.`)
        }
    }
    bonds.sort(function (x, y) { // сортировка по столбцу Объем сделок за n дней, шт.
        var xp = x[3];
        var yp = y[3];
        return xp == yp ? 0 : xp > yp ? -1 : 1;
    });
    bonds.unshift(["Полное наименование", "Код ценной бумаги", "Цена, %", `Объем сделок\nс ${moment().subtract(15, 'days').format('DD.MM.YYYY')}, шт.`, "Доходность", "Дюрация, месяцев", "Месяцы выплат"]);
    result.getRange("A1:G" + bonds.length).setValues(bonds);
    result.getRange("a:g").setHorizontalAlignment("center").setVerticalAlignment("middle");
    result.getRange("D:D").setNumberFormat("#,##0");
    result.getRange("A1:G1").setFontWeight("bold");
    result.autoResizeColumns(1, 7);
    result.getRange(result.getLastRow() + 2, 1).setHorizontalAlignment("left").setValue(conditions + "\n\nДанные найдены: " + Utilities.formatDate(new Date(), "GMT+5", "dd.MM.yyyy в HH:mm:ss") + ".");
}

function MOEXsearchVolume(ID, thresholdValue) { // Объем сделок в каждый из n дней больше определенного порога
    now = new Date();
    DateRequestPrevious = moment().subtract(15, 'days').format('YYYY-MM-DD') //этот день 15 дней назад
    const boardID = MOEXboardID(ID)
    if (!boardID) {
        return
    }
    const url = `https://iss.moex.com/iss/history/engines/stock/markets/bonds/boards/${boardID}/securities/${ID}.json?iss.meta=off&iss.only=history&history.columns=SECID,TRADEDATE,VOLUME,NUMTRADES&limit=20&from=${DateRequestPrevious}`
    // numtrades - Минимальное количество сделок с бумагой
    // VOLUME - оборот в количестве бумаг (Объем сделок, шт)
    console.log('Ссылка для %s: %s', ID, url)
    try {
        const response = UrlFetchApp.fetch(url).getContentText();
        const json = JSON.parse(response);
        let list = json.history.data
        let count = list.length
        var volume_sum = 0
        var lowLiquid = 0
        for (var i = 0; i <= count - 1; i++) {
            volume = json.history.data[i][2];
            volume_sum += volume
            if (thresholdValue > volume) {
                var lowLiquid = 1
                console.log(`MOEXsearchVolume. На ${i+1}-й день из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.`)
            }
            if (count < 6) { // если всего дней в апи на этом периоде очень мало
                lowLiquid = 1
                console.log(`MOEXsearchVolume. Всего в АПИ Мосбиржи доступно ${count} дней, а надо хотя бы больше 6 торговых дней с ${DateRequestPrevious}!`)
            }
        }
        if (lowLiquid != 1) {
            console.log(`MOEXsearchVolume. Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.`)
        }
        console.log(`MOEXsearchVolume. Итоговый оборот в бумагах (объем сделок, шт) за ${count} дней: ${volume_sum} шт нарастающим итогом.`)
        return {
            lowLiquid: lowLiquid,
            value: volume_sum
        }
    } catch (e) {
        console.log('Ошибка в MOEXsearchVolume:' + e)
    }
}

function MOEXsearchMonthsOfPayments(ID) { //узнаём месяцы, когда происходят выплаты
    const url = `https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/${ID}.json?iss.meta=off&iss.only=coupons`
    console.log(`MOEXsearchMonthsOfPayments. Ссылка для поиска месяцев выплат для ${ID}: ${url}.`)
    try {
        const response = UrlFetchApp.fetch(url).getContentText();
        const json = JSON.parse(response);
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
                // console.log(`MOEXsearchMonthsOfPayments. Купон для ${ID} выплачивается в месяц ${JSON.stringify(couponDates[couponDates.length - 1])} (строка ${couponDates.length}).`)
                if (value_rub == null) {
                    value_rubNull += 1
                }
            }
        }
        if (value_rubNull > 0) {
            console.log(`MOEXsearchMonthsOfPayments. Для ${ID} есть ${value_rubNull} дат(ы) будущих платежей с неизвестным значением выплат.`)
        }
        let uniqueDates = [...new Set(couponDates)] // уникальные значения месяцев
        uniqueDates = uniqueDates.sort(function (a, b) {
            return a - b;
        })
        console.log(`MOEXsearchMonthsOfPayments. Купоны для ${ID} выплачиваются в ${uniqueDates} месяцы.`)
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
        // console.log(`MOEXsearchMonthsOfPayments. Сформатированная строка вывода в которой есть месяцы выплат: ${formattedDates}.`)
        return {
            formattedDates: formattedDates,
            value_rubNull: value_rubNull
        }
    } catch (e) {
        console.log('Ошибка в MOEXsearchMonthsOfPayments:' + e)
    }
}

/**
 * Дополнительные функции
 */

function MOEXboardID(ID) { //узнаем boardid любой бумаги по тикеру
    const url = 'https://iss.moex.com/iss/securities/' + ID + '.json?iss.meta=off&iss.only=boards&boards.columns=secid,boardid,is_primary'
    try {
        const response = UrlFetchApp.fetch(url).getContentText();
        const json = JSON.parse(response);
        boardID = json.boards.data.find(e => e[2] === 1)[1]
        // console.log("boardID для %s: %s", ID, boardID);
        return boardID
    } catch (e) {
        console.log('Ошибка в MOEXboardID:' + e)
    }
}