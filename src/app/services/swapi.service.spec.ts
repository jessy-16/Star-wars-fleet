import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SwapiService } from './swapi.service';
import { SwapiPage } from '../models/starship.model';

describe('SwapiService', () => {
  let service: SwapiService;
  let httpMock: HttpTestingController;

  const mockPage1: SwapiPage = {
  count: 36,
  next: 'https://swapi.py4e.com/api/starships/?page=2',
  previous: null,
  results: [
    {
      name: 'CR90 corvette',
      model: 'CR90 corvette',
      manufacturer: 'Corellian Engineering Corporation',
      cost_in_credits: '3500000',
      length: '150',
      max_atmosphering_speed: '950',
      crew: '30-165',
      passengers: '600',
      cargo_capacity: '3000000',
      consumables: '1 year',
      hyperdrive_rating: '2.0',
      MGLT: '60',
      starship_class: 'corvette',
      url: 'https://swapi.py4e.com/api/starships/2/',
    },
  ],
};

  const mockPage2: SwapiPage = {
  count: 36,
  next: null,
  previous: 'https://swapi.py4e.com/api/starships/?page=1',
  results: [
    {
      name: 'Star Destroyer',
      model: 'Imperial I-class Star Destroyer',
      manufacturer: 'Kuat Drive Yards',
      cost_in_credits: '150000000',
      length: '1,600',
      max_atmosphering_speed: 'n/a',
      crew: '47,060',
      passengers: 'n/a',
      cargo_capacity: '36000000',
      consumables: '2 years',
      hyperdrive_rating: '2.0',
      MGLT: '60',
      starship_class: 'Star Destroyer',
      url: 'https://swapi.py4e.com/api/starships/3/',
    },
  ],
};

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SwapiService],
    });
    service = TestBed.inject(SwapiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch page 1 and add default notes field', (done) => {
    service.getStarships(1).subscribe((data) => {
      expect(data.count).toBe(36);
      expect(data.results.length).toBe(1);
      expect(data.results[0].notes).toBe('');
      expect(data.results[0].name).toBe('CR90 corvette');
      done();
    });

    const req = httpMock.expectOne(
      (r) => r.url.includes('/starships/') && r.params.get('page') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPage1);
  });

  it('should cache pages and not make duplicate HTTP requests', (done) => {
    // First request
    service.getStarships(1).subscribe(() => {
      // Second request — should come from cache, no HTTP call
      service.getStarships(1).subscribe((data) => {
        expect(data.results[0].name).toBe('CR90 corvette');
        done();
      });
      // No second HTTP request should be made
    });

    const req = httpMock.expectOne(
      (r) => r.url.includes('/starships/') && r.params.get('page') === '1'
    );
    req.flush(mockPage1);
    httpMock.verify(); // Ensures no extra HTTP request
  });

  it('should pass search param when provided', (done) => {
    service.getStarships(1, 'falcon').subscribe((data) => {
      expect(data).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/starships/') &&
        r.params.get('page') === '1' &&
        r.params.get('search') === 'falcon'
    );
    expect(req.request.params.get('search')).toBe('falcon');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('should detect last page when next is null', (done) => {
    service.getStarships(2).subscribe((data) => {
      expect(data.next).toBeNull();
      done();
    });

    const req = httpMock.expectOne(
      (r) => r.url.includes('/starships/') && r.params.get('page') === '2'
    );
    req.flush(mockPage2);
  });

  it('should clear cache', (done) => {
    service.getStarships(1).subscribe(() => {
      expect(service.isCached(1)).toBeTrue();
      service.clearCache();
      expect(service.isCached(1)).toBeFalse();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/starships/'));
    req.flush(mockPage1);
  });
});