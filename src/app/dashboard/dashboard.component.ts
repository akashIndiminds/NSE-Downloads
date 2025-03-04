import { Component, OnInit, HostListener } from '@angular/core';
import { SidebarComponent } from '../sibebar/sidebar.component';
import { TopBarComponent } from '../topbar/topbar.component';
import { RupeeAnimationComponent } from '../rupeeanimation/rupee-animation.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  standalone:true,
  imports: [SidebarComponent, TopBarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  files: any[] = []; // Store downloaded files
  isLoading: boolean = false;
  isSidebarOpen: boolean = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.isSidebarOpen = false;
  
}
  // Navigate to Admin page (File Status Page)
  navigateToNseDownload() {
    this.router.navigate(['/file-status']);
    // यदि sidebar toggle करना है तो आप यहां toggleSidebar() भी कॉल कर सकते हैं
    this.toggleSidebar();
  }

toggleSidebar() {
  this.isSidebarOpen = !this.isSidebarOpen;
  //console.log('Sidebar toggled. Current state:', this.isSidebarOpen);
}


@HostListener('document:mousedown', ['$event'])
handleClickOutside(event: Event): void {
  const target = event.target as HTMLElement;
  const isSidebarClick = target.closest('.sidebar') !== null; // Check if click is inside the sidebar
  const isHamburgerClick = target.closest('.hamburger') !== null; // Check if click is on the hamburger button


  if (this.isSidebarOpen && !isSidebarClick && !isHamburgerClick) {
    this.isSidebarOpen = false;
  }
}
}
