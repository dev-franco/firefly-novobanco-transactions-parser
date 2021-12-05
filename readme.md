## Firefly NovoBanco Transactions Parser

The parser processes the .xls file exported from Novo Banco on-line banking and imports them to a Firefly III instance using Firefly III official API

## How it works

The project is divided into 2 projects: 
1) an Angular frontend that expects the file to be uploaded via drag & drop, and 
2) an Express.js server exposing 2 routes (POST: /firefly/sync/novobanco, GET: /firefly/last_transaction) that communicate with the Firefly III instance API

An .env file within the /src/api/ folder is available to define required variables so the parser knows where and how to push information to.

# Building for Docker
1) Clone the project; we will be building 2 images, one for the API and one for the frontend
2) Navigate to src/api and run: `docker build . -t franco/firefly-novobanco-transactions-parser-api` - this will build the image and may take some time
3) Navigate to src/frontend and run: `docker build . -t franco/firefly-novobanco-transactions-parser-frontend`
4) After both images are built and locally available, navigate to the project root folder and run: `docker-compose up`

* Note: the image names can be changed, however do not forget to update the docker-compose.yml file to pull the correct image names.


## Notes & Limitations
- Transfers are not yet supported and will be parsed as either deposit or withdrawal based on the amounts
- Timestamps for transactions are only day precise; this is due to the currently exported Novo Banco file only containing dates and no HH:mm information