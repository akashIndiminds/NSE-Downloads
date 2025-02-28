import { Component, Output, EventEmitter, HostListener, ElementRef,  Input  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopBarComponent  {
  
  @Output() toggleSidebar = new EventEmitter<void>(); // Event emitter to toggle the sidebar
  
  constructor(
    private elementRef: ElementRef
  ) {}


  onToggleSidebar() {
    this.toggleSidebar.emit(); // Emit the event to toggle the sidebar
  }
}
