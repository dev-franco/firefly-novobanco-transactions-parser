const Transaction = require('./Transaction');

class FireFlyApiManager {

    settings = {
        apiUrl: "http://192.168.1.90:7000/api/v1",
        jwtToken : "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5IiwianRpIjoiZWZmMzA5ODBlYzM2ODY4OGI4ZjJkM2Y4ZTE0M2I4YTFmNWM4MTA3MmJkNmY4MzM0ZThlNWQyYWUxN2U1NTQyYWE2MWM3YjZjNjZiNmYzZWQiLCJpYXQiOjE2MzY4MjE3OTMuMTA4MzU3LCJuYmYiOjE2MzY4MjE3OTMuMTA4MzY3LCJleHAiOjE2NjgzNTc3OTMuMDMwNzc1LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.VC3prT11OadBaKS8rmbih8n2poKLqxWHonnLUWD306V94F9I5OfkszWVjW7H5Jlu5-X5LQr9uyOdAYPcP66XavBj-mVgGOwSd2xkm5QkjkV9Dzj8qLw65WNvXIfPCwfYx9ikCK-BtQoMy85sawpp7Jpzz6EtuZyfm8dAc-Dvhyz9ln13vzomvgTFGvFwITlAOzv6ijOZMXYaV16FWzuhctMdoJ8CI7u7asONPeJ3GUIBliiHWhkwHpgZAzdhZWWUmkfrfFlIrxWr_TZ2TQn6Z6HnA5BSQCBMaHFKVKawl444iiAH14TnwXveJbyu8HXe3upvLnW-o0insHbFiWe8Ahs-f9wIVPxJ7mpx8hWfteJJxU0mIJpvyNhCl3OA6cB9usQNug2aurbRd_s60YhuOpFDFjfYHrtf5ZOTa-82SyLt04mEZwGZUdQnnpJWGUMnFC35BPiovsN5IHyKd3_2RNALssP7gDWpksHVGFdD9cDlynD88mK8W3jTgWjtOIlq04mPaLOPzxNYKIY0BF37eZk8o_tFzb3XB3QhjdDI1DGpYqunOCN_EuZ5jaJ1U24l6sFmuG2U_KSu2yp9ONHRLrCKtqk_fu0xE4Kv_m-0ksGTUqzcWysppAUD_07MfxRpzk-UsR2PqlI6OSFFDB_C0EvHx-bpuPh-ydSR9B0gYDo",
        mainAccountName: "Novo Banco",
        savingsAccountName: "Novo Banco savings account",
        connectionTimeout: 10 // in seconds
    }

    /**
     * given an array of NB transactions will convert into firefly schema
     * split transactions into types and do post requests for each
     * @param {Transaction[]} transactions 
     */
    postTransactions(transactions) {

        if(transactions && transactions.length > 0) {
            // convert our NB transactions to firefly expected format
            // we need to split the transactions into types, other wise
            // we will get a 'All splits must be of the same type' error message
            let fireFlyTransactions = this.prepareTransactionsForFirefly(transactions);
            // we reverse both arrays because since we have no hours on our dates
            // firefly will think 2 records inserted in the same day means their order was 1 => 2; when in reality it's 2 => 1 (later transaction is higher than previous)
            let fireFlyDebitTransactions = fireFlyTransactions.filter(t => t.type === 'deposit').reverse();
            let fireFlyWithdrawalTransactions = fireFlyTransactions.filter(t => t.type === 'withdrawal').reverse();

            // we need 2 payloads, one for each transaction type
            let depositPayload = {
                group_title: `firefly-import-deposit-${new Date().getTime()}`,
                error_if_duplicate_hash: false,
                apply_rules: false,
                fire_webhooks: true,
                transactions: fireFlyDebitTransactions
            }

            let withdrawalPayload = {
                group_title: `firefly-import-withdrawal-${new Date().getTime()}`,
                error_if_duplicate_hash: false,
                apply_rules: false,
                fire_webhooks: true,
                transactions: fireFlyWithdrawalTransactions
            }

            if(withdrawalPayload) {
                this.request('/transactions', 'POST', withdrawalPayload).then(
                    () => {
                        console.log(`Inserted ${withdrawalPayload.transactions.length} transactions of type withdrawal into Firefly`);
                    },
                    (error) => {
                        console.log(error.response.data)
                    }
                );
            }

            if(depositPayload) {
                this.request('/transactions', 'POST', depositPayload).then(
                    () => {
                        console.log(`Inserted ${depositPayload.transactions.length} transactions of type deposit into Firefly`);
                    },
                    (error) => {
                        console.log(error.response.data)
                    }
                );
            }
        } else {
            console.log('No transactions found to POST')
        }

        
    }

    getLastTransaction() {
        return this.request('/transactions', 'GET');
    }

    /**
     * given input array of transactions, parses values to expected Firefly transaction model
     * @param {Transaction[]} transactions - array of raw transactions
     */
    prepareTransactionsForFirefly(transactions) {
        if(transactions) {
            return transactions.map((t, index)=> {

                // depending on transaction type, fields are mandatory
                let transactionType = this.transactionTypeToFireflyType(t);
                let transaction = {
                    date: new Date(t.date * 1000),
                    description: t.description,
                    type: transactionType
                };

                // type: "deposit" => destination_name
                // type: "withdrawal" => source_name
                // type: "transfer" => source_name + destination_name
                switch (transactionType) {
                    case 'deposit':
                        transaction.destination_name = this.settings.mainAccountName;
                        transaction.amount = Math.abs(t.credit)
                        break;

                    case 'withdrawal':
                        transaction.source_name = this.settings.mainAccountName;
                        transaction.amount = Math.abs(t.debit);
                        break;

                    // transfers for external accounts, like expenses, or deposits
                    // we would be better off by looking into the amount of the transfer and determine if it's deposit or withdrawal
                    case 'transfer':
                        let isDeposit = (t.credit > 0 && t.debit === 0);
                        transaction.amount = isDeposit ? Math.abs(t.credit) : Math.abs(t.debit);
                        transaction.type = this.transactionTypeToFireflyType(isDeposit ? 'CRD' : 'DEB');

                        if(isDeposit) {
                            transaction.destination_name = this.settings.mainAccountName;
                            transaction.amount = Math.abs(t.credit);
                        } else {
                            transaction.source_name = this.settings.mainAccountName;
                            transaction.amount = Math.abs(t.debit);
                        }
                        break;
                
                    default:
                        throw(`transaction type case not implemented for: ${transactionType}`)
                        break;
                }

                return transaction;
                
            });

        } else {
            return false;
        }
    }

    /**
     * given an input type converts to Firefly expected transaction type
     * @param {Transaction} transaction
     */
    transactionTypeToFireflyType(transaction) {
        let types = {
            'CRD': 'deposit',
            'DEB': 'withdrawal',
            'TRF': 'transfer',
            'TPA' : 'withdrawal',
            'SDD' : 'withdrawal',
            'LEV' : 'withdrawal',
        }
        if(transaction.type === 'TRF') {
            let isDebit = transaction.debit > 0 && transaction.credit === 0;
            return isDebit ? types['DEB'] : types['CRD'];
        } else {
            return transaction.type ? types[transaction.type] : null;
        }
    }

    /**
     * given a transaction type will return 
     * @param {Transaction} transaction 
     * @param {String} type 
     */
    transactionAmountFromType(transaction, type) {
        
    }

    /**
     * returns a promise based on an http request
     * @param {string} endpoint 
     * @param {string} method 
     */
    request(endpoint, method, data) {
       
        const axios = require('axios');
        let req;

        let timeout = setTimeout(() => {
            throw(`Connection timed out after ${this.settings.connectionTimeout} seconds. Check your apiUrl configuration`);
        }, this.settings.connectionTimeout * 1000)

        const options = {
            headers: {
                Authorization: `Bearer ${this.settings.jwtToken}`,
            },
            timeout: this.settings.connectionTimeout * 1000 // this is ms by default
        };

        // depending on method setup a request
        switch (method) {
            case 'GET':
                req = axios.get(`${this.settings.apiUrl}${endpoint}`, options);
                break;
            case 'POST':
                req = axios.post(`${this.settings.apiUrl}${endpoint}`, data, options);
                break;
        }

        return req;
    }

}


module.exports = FireFlyApiManager