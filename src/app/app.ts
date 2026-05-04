import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FleetComponent } from '../app/fleet/fleet.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FleetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  loading = true;
  progress = 0;

  constructor(private cdr: ChangeDetectorRef) {
  this.startLoading();
}
  startLoading() {
    if (this.progress < 100) {
      this.progress++;

      setTimeout(() => {
        this.startLoading();
      }, 30); // vitesse
    } else {
      setTimeout(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }, 300);
    }
    
  }
}