/**
 * SilverFir 🌲. [GAS Release for Т—Ж]
 * 
 * Меню
 *
 * @author Mikhail Shardin [Михаил Шардин] 
 * https://shardin.name/
 * 
 * Last updated: 07.07.2020
 * 
 */

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Поиск облигаций v.3')
        .addItem('Искать по параметрам', 'bond_search_v3')
        .addSeparator()
        .addItem('Открыть описание работы таблицы', 'showAnchor')
        .addToUi();
}

function showAnchor() {
    // onclick="google.script.host.close()"
    var html = '<html><body><a target="_blank" rel="noopener noreferrer" href="https://journal.tinkoff.ru/moex-bond-search/">Открыть статью с описанием этой таблицы на Т—Ж</a></body></html>';
    var ui = HtmlService.createHtmlOutput(html)
    SpreadsheetApp.getUi().showModelessDialog(ui, "Т—Ж");
}