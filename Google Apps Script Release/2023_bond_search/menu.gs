/**
 * SilverFir 🌲. [GAS Release for Т—Ж]
 * 
 * Модуль меню
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * 
 * Last updated: 03.07.2023
 * 
 */

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Поиск облигаций v. 062023')
        .addItem('Искать по параметрам', 'bond_search_v062023')
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
    📍 Как я ищу ликвидные облигации на Московской бирже в 2023 году, <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/moex-bond-3/">статья в Тинькофф-журнале (Т—Ж)</a> (август 2023 г).<br>    
    📍 Как я ищу ликвидные облигации на Московской бирже в 2022 году c учетом налоговых изменений, <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/moex-bond-2/">статья в Тинькофф-журнале (Т—Ж)</a> (май 2021 г).<br>
    📍 Как я ищу ликвидные облигации на Московской бирже, <a target="_blank" rel="noopener noreferrer"
        href="https://journal.tinkoff.ru/moex-bond-search/">статья в Тинькофф-журнале (Т—Ж)</a> (август 2020 г).<br>
</body>
</html>
    `;
    var ui = HtmlService.createHtmlOutput(html)
    SpreadsheetApp.getUi().showModelessDialog(ui, "Т—Ж");
}