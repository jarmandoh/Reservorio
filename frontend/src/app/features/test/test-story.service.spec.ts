import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { parseStoryData, StoryData, TestStoryService } from './test-story.service';

const validStory = {
  edition: 'CUADERNO DE OFICIOS',
  location: 'BOGOTÁ · COLOMBIA',
  intro: {
    eyebrow: 'UNA HISTORIA LOCAL',
    title: 'Una ciudad de posibilidades',
    description: 'Del mapa a las manos que saben resolver.',
  },
  book: {
    coverTitle: 'Historias cercanas',
    coverSubtitle: 'Un libro de oficios locales.',
    contentsTitle: 'Contenido',
    featureEyebrow: 'EL OFICIO DE ESTAR CERCA',
    featureTitle: 'Una historia local',
    featureLines: ['Las mejores soluciones', 'comienzan cerca de ti.'],
    caption: 'Hecho de historias reales.',
  },
  pages: [
    {
      number: '01',
      title: 'El mapa',
      description: 'Todo empieza cerca de ti.',
      detail: 'Explora lugares y personas que pueden ayudarte.',
    },
  ],
};

describe('TestStoryService', () => {
  let service: TestStoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TestStoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and validates story data from the configured URL', () => {
    let story: StoryData | undefined;
    service.load().subscribe(result => (story = result));

    const request = http.expectOne(environment.storyDataUrl);
    expect(request.request.method).toBe('GET');
    request.flush(validStory);

    expect(story?.pages[0].title).toBe('El mapa');
  });

  it('rejects data with more pages than the book layout supports', () => {
    expect(() => parseStoryData({ ...validStory, pages: Array(7).fill(validStory.pages[0]) })).toThrow(
      'El JSON debe incluir entre 1 y 6 páginas.'
    );
  });

  it('rejects incomplete page data', () => {
    expect(() => parseStoryData({ ...validStory, pages: [{ title: 'Sin número' }] })).toThrow('pages[0].number');
  });
});
