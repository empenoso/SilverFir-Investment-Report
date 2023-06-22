/**
 * SilverFir 🌲. [GAS Release for Т—Ж]
 * 
 * Модуль поиска облигаций по параметрам
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * https://shardin.name/
 * 
 * Last updated: 08.07.2020
 * 
 */

function bond_search_v3() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var parameters = ss.getSheetByName("Параметры");
    var result = ss.getSheetByName("Результат");
    result.clear();
    const YieldMore = parameters.getRange("a3").getValue() //Доходность больше этой цифры
    const YieldLess = parameters.getRange("c3").getValue() //Доходность меньше этой цифры
    const PriceMore = parameters.getRange("a4").getValue() //Цена больше этой цифры
    const PriceLess = parameters.getRange("c4").getValue() //Цена меньше этой цифры
    const DurationMore = parameters.getRange("a5").getValue() //Дюрация больше этой цифры
    const DurationLess = parameters.getRange("c5").getValue() //Дюрация меньше этой цифры
    const VolumeMore = parameters.getRange("c6").getValue() //Объем сделок за n дней, шт. больше этой цифры
    const conditions = ` ${YieldMore}% < Доходность < ${YieldLess}% 
                         ${PriceMore}% < Цена < ${PriceLess}% 
                         ${DurationMore} мес. < Дюрация < ${DurationLess} мес.  
                         Объем сделок за n дней > ${VolumeMore} шт. 
                         Поиск в Т0, Т+, Т+ (USD) - Основной режим - безадрес. `
    Logger.log(conditions)
    var bonds = []
    var count
    Logger.log(`Поиск начат ${new Date().toLocaleString()}.`)

    for (const t of [7, 58, 193]) { // https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/
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
                // console.log('Работа со строкой %s из %s: %s (%s).', (i + 1), count, BondName, SECID)
                if (BondYield > YieldMore && BondYield < YieldLess && //условия выборки
                    BondPrice > PriceMore && BondPrice < PriceLess &&
                    BondDuration > DurationMore && BondDuration < DurationLess) {

                    BondVolume = MOEXsearchVolume(SECID)
                    if (BondVolume > VolumeMore) { //если оборот в бумагах больше этой цифры
                        BondTax = MOEXsearchTax(SECID)
                        bonds.push([BondName, SECID, BondPrice, BondVolume, BondYield, BondDuration, BondTax])
                        console.log('Cтрока № %s: %s.', bonds.length, JSON.stringify(bonds[bonds.length - 1]))
                    }
                }
            }
        } catch (e) {
            console.log(`Ошибка в bond_search_v3: ${e}.`)
        }
    }
    bonds.sort(function (x, y) { // сортировка по столбцу Объем сделок за n дней, шт.
        var xp = x[3];
        var yp = y[3];
        return xp == yp ? 0 : xp > yp ? -1 : 1;
    });
    bonds.unshift(["Полное наименование", "Код ценной бумаги", "Цена, %", "Объем сделок за n дней, шт.", "Доходность", "Дюрация, месяцев", "Есть льгота?"]);
    result.getRange("A1:G" + bonds.length).setValues(bonds);
    result.getRange("a:g").setHorizontalAlignment("center");
    result.autoResizeColumns(1, 6);
    result.getRange(result.getLastRow() + 2, 1).setValue("Данные обновлены " + Utilities.formatDate(new Date(), "GMT+5", "dd.MM.yyyy в HH:mm:ss") + ".");
    result.getRange(result.getLastRow() + 1, 1).setFormula('=HYPERLINK("https://www.facebook.com/mikhail.shardin"; "Автор скрипта Михаил Шардин.")');
}

function MOEXsearchVolume(ID) { //суммирование оборотов по корпоративной облигации за последние n дней
    now = new Date();
    DateRequestPrevious = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() - 15}`; //этот день n дней назад
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
        for (var i = 0; i <= count - 1; i++) {
            volume = json.history.data[i][2];
            volume_sum += volume
        }
        console.log("Оборот в бумагах (объем сделок, шт) для %s за последние %s дней: %s штук.", ID, count, volume_sum);
        return volume_sum
    } catch (e) {
        console.log('Ошибка в MOEXsearchVolume:' + e)
    }
}

function MOEXsearchTax(ID) { //налоговые льготы для корпоративных облигаций, выпущенных с 1 января 2017 года
    const url = 'https://iss.moex.com/iss/securities/' + ID + '.json?iss.meta=off&iss.only=description'
    console.log('Ссылка для %s: %s', ID, url)
    var rez
    try {
        const response = UrlFetchApp.fetch(url).getContentText();
        const json = JSON.parse(response);
        STARTDATEMOEX = json.description.data.find(e => e[0] === 'STARTDATEMOEX')[2];
        // DAYSTOREDEMPTION = json.description.data.find(e => e[0] === 'DAYSTOREDEMPTION')[2]; //получение кол-ва оставшихся дней по погашения
        console.log("Дата принятия решения о включении ценной бумаги в Список для %s: %s.", ID, STARTDATEMOEX);
        const trueFalse = new Date(STARTDATEMOEX) > new Date('2017-01-01')
        if (trueFalse == true) {
            rez = 'да'
        } else {
            rez = 'нет'
        }
        return rez
    } catch (e) {
        console.log('Ошибка в MOEXsearchTax:' + e)
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
        console.log("boardID для %s: %s", ID, boardID);
        return boardID
    } catch (e) {
        console.log('Ошибка в MOEXboardID:' + e)
    }
}

function invalidateAuth() { //аннулировать аутентификацию скрипта для данного аккаунта гугла
    ScriptApp.invalidateAuth();
}