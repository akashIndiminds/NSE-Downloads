import { Component, Input, Output, EventEmitter, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import necessary module
import { Router } from '@angular/router'; // For routing between pages


@Component({
  selector: 'app-sidebar',
  standalone: true,  // Ensure the component is standalone
  imports: [CommonModule ],  // Import dependencies
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;  // Sidebar visibility controlled by parent component
  @Output() isOpenChange = new EventEmitter<boolean>();  // Emit event to toggle sidebar visibility
  private _isOpen = false;
  private bodyScrollListener!: () => void;

  constructor(
    private router: Router,
     private renderer: Renderer2
    ) {}

    ngOnInit() {
      // Add event listener to prevent body scroll when sidebar is open
      this.bodyScrollListener = this.renderer.listen('body', 'scroll', (event) => {
        if (this.isOpen) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    }

    ngOnDestroy() {
      // Clean up event listener
      if (this.bodyScrollListener) {
        this.bodyScrollListener();
      }
    }
    handleOverlayClick(event: MouseEvent) {
      if (event.target === event.currentTarget) { // Only if clicking the overlay itself
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
      }
    }
  
    toggle() {
      const newState = !this.isOpen;
      this.isOpenChange.emit(newState);
      
      // Handle body scroll
      if (newState) {
        this.renderer.addClass(document.body, 'sidebar-open');
      } else {
        this.renderer.removeClass(document.body, 'sidebar-open');
      }
    }

  stopSidebarClose(event: MouseEvent) {

    // Prevent the sidebar from closing if the click is not on the close button
    const closeButton = event.target as HTMLElement;
    if (closeButton && closeButton.classList.contains('close-btn')) {
      // If clicked on the close button, let the sidebar close
      return;
    }
    event.stopPropagation(); // Prevent propagation if clicked elsewhere inside the sidebar
  }

  

  navigateToDashboard() {
    this.router.navigate(['/dashboard']); // Adjust the route as needed
    this.toggle(); 
  }


  // Navigate to Admin page
  navigateToNseDownload() {
   this.router.navigate(['/file-status']); // Add this method
    this.toggle(); 
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']); // Navigate to the settings page
    this.toggle(); 
  }
  
  logout(): void {
    this.router.navigate(['/login']); // Redirect to the login page
  }
}
