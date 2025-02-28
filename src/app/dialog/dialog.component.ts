import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';

export interface DialogData {
  title: string;
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports:[CommonModule],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent {
  constructor(
    public dialogRef: DialogRef<void>,
    @Inject(DIALOG_DATA) public data: DialogData
  ) {}
}
