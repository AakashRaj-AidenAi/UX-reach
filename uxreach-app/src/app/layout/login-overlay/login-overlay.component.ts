import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-overlay',
  imports: [],
  templateUrl: './login-overlay.component.html',
  styleUrl: './login-overlay.component.scss'
})
export class LoginOverlayComponent implements AfterViewInit {
  protected readonly appState = inject(AppStateService);
  private readonly auth = inject(AuthService);

  @ViewChild('googleBtn') private googleBtn!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    // DOM is guaranteed ready here — render the GIS button directly into the ref.
    if (this.googleBtn?.nativeElement) {
      this.auth.renderButton(this.googleBtn.nativeElement);
    }
  }
}
