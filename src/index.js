let NovoBancoXlsParser = require('./classes/NovoBancoXlsParser.js')
let FireFlyApiManager = require('./classes/FireFlyApiManager.js')
let Transaction = require('./classes/Transaction.js')

const parser = new NovoBancoXlsParser('../files/example.xls');
const fireFlyApi = new FireFlyApiManager();

parser.run();

// ideally, how would the process run?

// if there is a file on the 'target' folder it would trigger startup

// it would identify the latest transaction and match it against the new found transactions, excluding repeated transactions
fireFlyApi.getLastTransaction().then(
    (response) => {

        let responseTransaction = response.data.data[0].attributes.transactions[0];
        if(responseTransaction) {
            let transaction = new Transaction();
            transaction.description = responseTransaction.description;
            transaction.date = new Date(responseTransaction.date).getTime();
            transaction.type = responseTransaction.type;

            if(responseTransaction.type === 'withdrawal') {
                transaction.debit = parseFloat(responseTransaction.amount);
                transaction.credit = 0;
            } else if(responseTransaction.type === 'deposit') {
                transaction.credit = parseFloat(responseTransaction.amount);
                transaction.debit = 0;
            }

            // given a latest transaction found, we will filter out all transactions up until this one
            if(transaction) {
                // parser.removeTransactionsUpUntil(transaction); // TODO: lets test this better
            }

            
            // it would then populate with more transactions
            if(parser.transactions) {
                fireFlyApi.postTransactions(parser.transactions);
            }




        } else {
            console.log('No transactions found! Safe to POST');
            if(parser.transactions) {
                fireFlyApi.postTransactions(parser.transactions);
            }
        }
        
    }
);

