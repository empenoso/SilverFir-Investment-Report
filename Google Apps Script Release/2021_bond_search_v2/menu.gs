/**
 * SilverFir 🌲. [GAS Release for Т—Ж]
 * 
 * Меню
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * 
 * Last updated: 09.02.2021
 * 
 */

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Поиск облигаций v.5')
        .addItem('Искать по параметрам', 'bond_search_v5')
        .addSeparator()
        .addItem('Открыть описание работы таблицы', 'showAnchor')
        .addToUi();
}

function showAnchor() {
    var html = `<html>
<body>
    <b>SilverFir: Investment Report 🌲:</b><br>
    📍 Статья в <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/investment-report/">Тинькофф-журнале (Т—Ж)</a> (апрель 2020 г).<br><br>
    <b>Скрипт поиска ликвидных облигаций на Мосбирже в качестве замены депозита:<br></b>
    📍 С учётом измения налогообложения в 2021 году в <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/moex-bond-search2/">Тинькофф-журнале (Т—Ж)</a> (апрель 2021 г).<br>
    📍 Версия поиска в Гугл таблице в статье <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/moex-bond-search/">Тинькофф-журнала (Т—Ж)</a> (август 2020 г).<br>
</body>
</html>
    `;
    var ui = HtmlService.createHtmlOutput(html)
    SpreadsheetApp.getUi().showModelessDialog(ui, "Т—Ж");
}