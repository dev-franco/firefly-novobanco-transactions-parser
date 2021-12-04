require('dotenv').config()
const express = require('express')
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs')
const NovoBancoXlsParser = require('../classes/NovoBancoXlsParser.js')
const FireFlyApiManager = require('../classes/FireFlyApiManager.js')
const Transaction = require('../classes/Transaction.js')

const app = express()
const port = process.env.SERVER_PORT
const fireFlyApi = new FireFlyApiManager();


// enable files upload
app.use(fileUpload({
  createParentPath: true
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// setup post route
app.post('/firefly/sync/novobanco', async (req, res) => {
  
  try {
    if(!req.files) {
      res.send({
        status: false,
        message: 'No file uploaded'
      });
    } else {
      // save file to disk
      // make sure folder exists
      if(!fs.existsSync('files/')) {
        fs.mkdirSync('files');
      }
      fs.writeFile("files/file.xls", req.files.file.data, function(err) {
        if(err) {
          return console.log(err);
        }
        
        res.setHeader('Content-type', 'application/json')
        
        // load up the parser with the generated file
        const parser = new NovoBancoXlsParser('files/file.xls');
        parser.run()
        
        // begin communicating with firefly api
        fireFlyApi.getLastTransaction().then(
          (response) => {
            
            let responseTransaction = response.data && response.data.data && response.data.data[0] && response.data.data[0].attributes ? response.data.data[0].attributes.transactions[0] : false;
            if(responseTransaction) {
              let transaction = new Transaction();
              transaction.description = responseTransaction.description;
              transaction.date = new Date(responseTransaction.date).getTime() / 1000; // transactions will come with ms 
              transaction.type = responseTransaction.type;
              
              if(responseTransaction.type === 'withdrawal') {
                transaction.debit = parseFloat(responseTransaction.amount);
                transaction.credit = 0;
              } else if(responseTransaction.type === 'deposit') {
                transaction.credit = parseFloat(responseTransaction.amount);
                transaction.debit = 0;
              }
              
              // given a latest transaction found, we will filter out all transactions up until this one
              // given NB limitations, we can only remove transactions up to a precision of a day, not hours
              if(transaction) {
                parser.removeTransactionsUpUntil(transaction);
              }
              
            }
            
            // proceed to post transactions - if an old transaction was found, it was already removed before
            if(parser.transactions) {
              const publishedTransactions = fireFlyApi.postTransactions(parser.transactions);
              if(!publishedTransactions) {
                
                res.send({
                  status: false,
                  message: 'No new transactions found to POST'
                })
              } else {
                
                // after both transactions complete, system is ready to output summary
                publishedTransactions.then((transactions) => {

                  const deposit = transactions[0];
                  const withdrawal = transactions[1];
                  const totalDeposit = deposit.data.data.attributes.transactions ? deposit.data.data.attributes.transactions.length : 0;
                  const totalWithdrawal = withdrawal.data.data.attributes.transactions ? withdrawal.data.data.attributes.transactions.length : 0;

                  res.send({
                    status: true,
                    data: parser.transactions,
                    totals : {
                      deposit: totalDeposit,
                      withdrawal: totalWithdrawal
                    }
                  });
                })                
              }
              
            } else {
              res.send({
                status: false,
                message: 'No transactions to import, check latest transaction'
              })
            }
            
          });
          
          
          
          // delete the generated file
          try {
            fs.unlinkSync('files/file.xls')
          } catch(err) {
            console.log('Error removing file');
            console.error(err)
          }
        }); 
        
      }
      
    } catch(e) {
      console.log('Got errors');
      console.log(e);
      res.send('Failed');
    }
    
})


app.get('/firefly/last_transaction', async (req, res) => {

  fireFlyApi.getLastTransaction().then(response => {
    let responseTransaction = response.data && response.data.data && response.data.data[0] && response.data.data[0].attributes ? 
      response.data.data
        .sort((a, b) => a.id > b.id ? -1 : false)
        .filter(t => t.attributes.transactions.find(tr => tr.type !== 'transfer'))
      [0].attributes.transactions[0] : false;

      
    if(responseTransaction) {
      let transaction = new Transaction();
      transaction.description = responseTransaction.description;
      transaction.date = new Date(responseTransaction.date).getTime() / 1000; // transactions will come with ms 
      transaction.type = responseTransaction.type;
      
      if(responseTransaction.type === 'withdrawal') {
        transaction.debit = parseFloat(responseTransaction.amount);
        transaction.credit = 0;
      } else if(responseTransaction.type === 'deposit') {
        transaction.credit = parseFloat(responseTransaction.amount);
        transaction.debit = 0;
      }

      res.setHeader('Content-type', 'application/json');
      res.send(JSON.stringify(transaction));
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})