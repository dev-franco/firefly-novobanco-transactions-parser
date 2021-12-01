export class Transaction {
  date!: Date;
  type!: TransactionType;
  description!: String;
  debit!: Number;
  credit!: Number;

  deserialize(object: any): Transaction {
    const t = new Transaction;
    t.date = new Date(object.date * 1000);
    t.type = object.type;
    t.description = object.description;
    t.debit = object.debit;
    t.credit = object.credit;
    return t;
  }

}

export enum TransactionType {
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer'
}
