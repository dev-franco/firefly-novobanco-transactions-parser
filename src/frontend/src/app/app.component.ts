import { Component, OnInit, } from '@angular/core';
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';
import { HttpClient } from '@angular/common/http';
import { Transaction } from './modules/api/models/transaction';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  title = 'frontend';
  apiUrl = 'http://localhost:3000';
  apiEndpoint = '/firefly/sync/novobanco'
  http: HttpClient
  isLoading = false;
  response?: {
    status: boolean,
    message: string,
    totalInsertedTransactions?: {
      deposit: number,
      withdrawal: number
    }
  }

  lastTransaction!: Transaction;

  constructor(http: HttpClient) {
   this.http = http;
  }

  ngOnInit(): void {
    this.http.get(`${this.apiUrl}/firefly/last_transaction`).subscribe(
      (response: any) => {
        const transaction = new Transaction().deserialize(response);
        if(transaction) {
          this.lastTransaction = transaction;
        }
      }
    )
  }

  public files: NgxFileDropEntry[] = [];

  public dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

         const formData = new FormData()
         formData.append('file', file, droppedFile.relativePath)

         this.isLoading = true;
         this.http.post(`${this.apiUrl}${this.apiEndpoint}`, formData, { responseType: 'json' })
          .subscribe((data: any) => {
            this.isLoading = false;

            // no transactions found to post
            if(data.status === false) {
              this.response = {
                status: data.status,
                message: data.message
              };
            } else if (data.status === true) {
              this.response = {
                status: data.status,
                message: data.message,
                totalInsertedTransactions: {
                  deposit: data.totals.deposit,
                  withdrawal: data.totals.withdrawal
                }
              }
            }

            console.log('Got data from backend')
            console.log(data);
          }, (error: any) => {
            console.log(error);
          }, () =>{

          })

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

}
