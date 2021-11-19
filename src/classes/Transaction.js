class Transaction {
    date; // days since 1970
    type; // TPA, TRF, DEB, CRD
    description;
    debit;
    credit;


    constructor(date, type, description, debit, credit) {
        // excel works a bit weird with dates, so unix epoch => 25569 (they start from 1/1/1900)
        if(date) { this.date = (((date) - 25569) * 86400); }
        if(type) { this.type = type; }
        if(description) { this.description = description; }
        if(debit) { this.debit = debit || 0; }
        if(credit) { this.credit = credit || 0; }
    }
}

module.exports = Transaction