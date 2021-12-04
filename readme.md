## Firefly NovoBanco Transactions Parser

The parser processes the .xls file exported from Novo Banco on-line banking and imports them to a Firefly III instance using Firefly III official API

## How it works

The project is divided into 2 projects: 
1) an Angular frontend that expects the file to be uploaded via drag & drop, and 
2) an Express.js server exposing 2 routes (POST: /firefly/sync/novobanco, GET: /firefly/last_transaction) that communicate with the Firefly III instance API

## Notes
Transfers are not yet supported and will be parsed as either deposit or withdrawal based on the amounts