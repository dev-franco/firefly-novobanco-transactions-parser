

class NovoBancoXlsParser {
    transactions = [];

    // basic settings
    settings = {
        filePath : '',
        transactionsStartAtRow: 9 // in NOVO BANCO the exported .xls contains some information before the actual transactions
    }

    constructor(filePath) {
        console.log('Starting up with', filePath)
        if(filePath) {
            this.settings.filePath = filePath;
        }
    }

    run = () => {

        let xlsx = require('node-xlsx').default;
        let Transaction = require('./Transaction.js');

        // Parse a file
        const worksheets = xlsx.parse(`${this.settings.filePath}`);

        // since the export contains 1 sheet, reference the first returned sheet
        const sheet = worksheets[0]

        if(sheet && sheet.data) {
            sheet.data.forEach(((row, index) => {
                if(index > this.settings.transactionsStartAtRow) {

                    let date = row[0]; // why? bcus sort
                    let type = row[2];
                    let description = row[3];
                    let debit = parseFloat(row[4]);
                    let credit = parseFloat(row[5]);

                    // only parse valid transactions
                    if(date && description && (debit || credit)) {
                        // actual transactions
                        let transaction = new Transaction(
                            date,
                            type,
                            description,
                            debit,
                            credit
                        );

                        this.transactions.push(transaction);

                    }
                }
            }));
        }
    }

    removeTransactionsUpUntil = (transaction)  => {
        if(this.transactions && transaction) {
            this.transactions = this.transactions.filter(t => t.date > transaction.date);
        }
    }
}

module.exports = NovoBancoXlsParser