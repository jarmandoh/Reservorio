import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoryPage {
  number: string;
  title: string;
  description: string;
  detail: string;
}

export interface StoryData {
  edition: string;
  location: string;
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  book: {
    coverTitle: string;
    coverSubtitle: string;
    contentsTitle: string;
    featureEyebrow: string;
    featureTitle: string;
    featureLines: string[];
    caption: string;
  };
  pages: StoryPage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`El campo "${field}" debe ser un texto de hasta ${maxLength} caracteres.`);
  }
  return value.trim();
}

export function parseStoryData(value: unknown): StoryData {
  if (!isRecord(value) || !isRecord(value['intro']) || !isRecord(value['book'])) {
    throw new Error('El JSON debe incluir los objetos "intro" y "book".');
  }

  const rawPages = value['pages'];
  if (!Array.isArray(rawPages) || rawPages.length < 1 || rawPages.length > 6) {
    throw new Error('El JSON debe incluir entre 1 y 6 páginas.');
  }

  const pages = rawPages.map((page, index): StoryPage => {
    if (!isRecord(page)) {
      throw new Error(`La página ${index + 1} debe ser un objeto.`);
    }
    return {
      number: requiredText(page['number'], `pages[${index}].number`, 4),
      title: requiredText(page['title'], `pages[${index}].title`, 60),
      description: requiredText(page['description'], `pages[${index}].description`, 100),
      detail: requiredText(page['detail'], `pages[${index}].detail`, 220),
    };
  });

  const featureLines = value['book']['featureLines'];
  if (!Array.isArray(featureLines) || featureLines.length < 1 || featureLines.length > 4) {
    throw new Error('El campo "book.featureLines" debe incluir entre 1 y 4 líneas.');
  }

  return {
    edition: requiredText(value['edition'], 'edition', 60),
    location: requiredText(value['location'], 'location', 60),
    intro: {
      eyebrow: requiredText(value['intro']['eyebrow'], 'intro.eyebrow', 60),
      title: requiredText(value['intro']['title'], 'intro.title', 100),
      description: requiredText(value['intro']['description'], 'intro.description', 180),
    },
    book: {
      coverTitle: requiredText(value['book']['coverTitle'], 'book.coverTitle', 60),
      coverSubtitle: requiredText(value['book']['coverSubtitle'], 'book.coverSubtitle', 100),
      contentsTitle: requiredText(value['book']['contentsTitle'], 'book.contentsTitle', 60),
      featureEyebrow: requiredText(value['book']['featureEyebrow'], 'book.featureEyebrow', 60),
      featureTitle: requiredText(value['book']['featureTitle'], 'book.featureTitle', 80),
      featureLines: featureLines.map((line, index) => requiredText(line, `book.featureLines[${index}]`, 60)),
      caption: requiredText(value['book']['caption'], 'book.caption', 100),
    },
    pages,
  };
}

@Injectable({ providedIn: 'root' })
export class TestStoryService {
  private readonly http = inject(HttpClient);

  load(): Observable<StoryData> {
    return this.http.get<unknown>(environment.storyDataUrl).pipe(map(parseStoryData));
  }
}
