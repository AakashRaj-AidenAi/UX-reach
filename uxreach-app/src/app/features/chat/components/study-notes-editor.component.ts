import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { StudyNote } from '../../../models/chat.model';

@Component({
  selector: 'app-study-notes-editor',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="notes-editor">
      @for (note of localNotes; track note.studyId; let i = $index) {
        <div class="note-card" [ngClass]="{ 'note-card--posted': note.posted }">
          <div class="note-card-header">
            <span class="note-study-tag">Study {{ note.studyId }}</span>
            <span class="note-study-name">{{ note.studyName }}</span>
            @if (note.posted) {
              <span class="note-posted-badge">
                <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;">check_circle</span>
                Posted
              </span>
            }
          </div>

          <input
            class="note-title-input"
            type="text"
            [(ngModel)]="note.title"
            [disabled]="note.posted"
            placeholder="Title (e.g. April 24, 2026)"
          />

          <textarea
            class="note-content-textarea"
            [(ngModel)]="note.content"
            [disabled]="note.posted"
            rows="9"
            spellcheck="false"
          ></textarea>

          @if (!note.posted) {
            <button class="note-post-btn" (click)="onPostOne(i)">
              <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">upload</span>
              Post to Salesforce
            </button>
          }
        </div>
      }

      <div class="notes-footer">
        @if (allPosted) {
          <div class="all-posted-msg">
            <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>
            All notes posted to Salesforce
          </div>
        } @else {
          <button class="post-all-btn" (click)="onPostAll()">
            <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">publish</span>
            Post All to Salesforce
          </button>
          <span class="post-hint">or post each study individually above</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .notes-editor {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .note-card {
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      background: var(--card-alt);
      transition: opacity 0.2s ease;
    }

    .note-card--posted {
      opacity: 0.6;
    }

    .note-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .note-study-tag {
      font-size: 11px;
      font-weight: 600;
      background: rgba(26, 115, 232, 0.1);
      color: var(--blue);
      padding: 2px 7px;
      border-radius: 10px;
      letter-spacing: 0.2px;
    }

    .note-study-name {
      font-size: 12px;
      color: var(--text-muted);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .note-posted-badge {
      font-size: 11px;
      font-weight: 500;
      color: var(--green);
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .note-title-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      color: var(--text);
      background: var(--card);
      box-sizing: border-box;
      margin-bottom: 6px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .note-title-input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.12);
    }

    .note-title-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .note-content-textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      font-size: 13px;
      font-family: 'Google Sans', 'Roboto', monospace;
      color: var(--text);
      background: var(--card);
      box-sizing: border-box;
      resize: vertical;
      line-height: 1.75;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .note-content-textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.12);
    }

    .note-content-textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .note-post-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
      padding: 5px 14px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      cursor: pointer;
      border: 1px solid rgba(26, 115, 232, 0.3);
      background: rgba(26, 115, 232, 0.07);
      color: var(--blue);
      transition: all 0.15s ease;
    }

    .note-post-btn:hover {
      background: rgba(26, 115, 232, 0.15);
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.2);
    }

    .notes-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 4px;
    }

    .post-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 18px;
      border-radius: 18px;
      font-size: 13px;
      font-weight: 500;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      cursor: pointer;
      border: 1px solid rgba(26, 115, 232, 0.35);
      background: rgba(26, 115, 232, 0.09);
      color: var(--blue);
      transition: all 0.15s ease;
    }

    .post-all-btn:hover {
      background: rgba(26, 115, 232, 0.17);
      box-shadow: 0 1px 3px rgba(60, 64, 67, 0.25);
    }

    .post-hint {
      font-size: 11px;
      color: var(--text-faint);
    }

    .all-posted-msg {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--green);
    }
  `]
})
export class StudyNotesEditorComponent implements OnInit {
  @Input({ required: true }) notes: StudyNote[] = [];
  @Output() postAllNotes = new EventEmitter<StudyNote[]>();
  @Output() postOneNote = new EventEmitter<StudyNote>();

  localNotes: StudyNote[] = [];

  ngOnInit(): void {
    this.localNotes = this.notes.map(n => ({ ...n }));
  }

  get allPosted(): boolean {
    return this.localNotes.length > 0 && this.localNotes.every(n => n.posted);
  }

  onPostOne(idx: number): void {
    this.localNotes[idx] = { ...this.localNotes[idx], posted: true };
    this.postOneNote.emit(this.localNotes[idx]);
  }

  onPostAll(): void {
    this.localNotes = this.localNotes.map(n => ({ ...n, posted: true }));
    this.postAllNotes.emit(this.localNotes);
  }
}
