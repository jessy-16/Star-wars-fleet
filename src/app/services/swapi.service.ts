import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SwapiPage, Starship } from '../models/starship.model';

@Injectable({
  providedIn: 'root',
})
export class SwapiService {
  private baseUrl = 'https://swapi.py4e.com/api/starships/';
  private cache = new Map<string, SwapiPage>();

  constructor(private http: HttpClient) {}

  getStarships(page: number, search?: string): Observable<SwapiPage> {
    const key = `page=${page}&search=${search || ''}`;

    if (this.cache.has(key)) {
      return new Observable((observer) => {
        observer.next(this.cache.get(key)!);
        observer.complete();
      });
    }

    let params = new HttpParams().set('page', page.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<SwapiPage>(this.baseUrl, { params }).pipe(
      map((data) => {
        const resultsWithNotes: Starship[] = data.results.map((s) => ({
          ...s,
          notes: '',
        }));

        const result = {
          ...data,
          results: resultsWithNotes,
        };

        this.cache.set(key, result);
        return result;
      })
    );
  }

  clearCache() {
    this.cache.clear();
  }

  isCached(page: number, search?: string): boolean {
    const key = `page=${page}&search=${search || ''}`;
    return this.cache.has(key);
  }
}