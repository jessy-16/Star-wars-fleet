import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FleetComponent } from './fleet.component';
import { SwapiService } from '../services/swapi.service';
import { of } from 'rxjs';
import { Starship } from '../models/starship.model';

const mockStarship: Starship = {
  name: 'Millennium Falcon',
  model: 'YT-1300 light freighter',
  manufacturer: 'Corellian Engineering Corporation',
  cost_in_credits: '100000',
  length: '34.37',
  max_atmosphering_speed: '1050',
  crew: '4',
  passengers: '6',
  cargo_capacity: '100000',
  consumables: '2 months',
  hyperdrive_rating: '0.5',
  MGLT: '75',
  starship_class: 'Light freighter',
  url: 'https://swapi.dev/api/starships/10/',
  notes: '',
};

describe('FleetComponent', () => {
  let component: FleetComponent;
  let fixture: ComponentFixture<FleetComponent>;
  let swapiServiceSpy: jasmine.SpyObj<SwapiService>;

  beforeEach(async () => {
  swapiServiceSpy = jasmine.createSpyObj('SwapiService', [
    'getStarships',
    'clearCache',
    'isCached',
  ]);

  swapiServiceSpy.getStarships.and.returnValue(
    of({
      count: 1,
      next: null,
      previous: null,
      results: [mockStarship],
    })
  );

  await TestBed.configureTestingModule({
    imports: [FleetComponent],
    providers: [
      { provide: SwapiService, useValue: swapiServiceSpy },
    ],
  }).compileComponents();

  fixture = TestBed.createComponent(FleetComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should store edited notes in client state map', () => {
    // Simulate AG Grid valueSetter being called
    const notesColDef = component.columnDefs.find((c) => c.field === 'notes')!;
    const valueSetter = notesColDef.valueSetter as Function;

    const rowData = { ...mockStarship };
    const result = valueSetter({
      data: rowData,
      newValue: 'Fast ship!',
      oldValue: '',
    });

    expect(result).toBeTrue();
    const editedValues = component.getEditedValues();
    expect(editedValues.has(mockStarship.url)).toBeTrue();
    expect(editedValues.get(mockStarship.url)!['notes']).toBe('Fast ship!');
  });

  it('should update row data when notes are edited', () => {
    const notesColDef = component.columnDefs.find((c) => c.field === 'notes')!;
    const valueSetter = notesColDef.valueSetter as Function;

    const rowData = { ...mockStarship };
    valueSetter({ data: rowData, newValue: 'Kessel Run', oldValue: '' });

    expect(rowData.notes).toBe('Kessel Run');
  });

  it('should override previous edits when editing again', () => {
    const notesColDef = component.columnDefs.find((c) => c.field === 'notes')!;
    const valueSetter = notesColDef.valueSetter as Function;

    const rowData = { ...mockStarship };
    valueSetter({ data: rowData, newValue: 'First edit', oldValue: '' });
    valueSetter({ data: rowData, newValue: 'Second edit', oldValue: 'First edit' });

    const editedValues = component.getEditedValues();
    expect(editedValues.get(mockStarship.url)!['notes']).toBe('Second edit');
  });

  it('should use valueGetter to read from client state', () => {
    const notesColDef = component.columnDefs.find((c) => c.field === 'notes')!;
    const valueSetter = notesColDef.valueSetter as Function;
    const valueGetter = notesColDef.valueGetter as Function;

    const rowData = { ...mockStarship };

    // Before edit
    expect(valueGetter({ data: rowData })).toBe('');

    // After edit
    valueSetter({ data: rowData, newValue: 'Edited!', oldValue: '' });
    expect(valueGetter({ data: rowData })).toBe('Edited!');
  });

  it('should have the Notes column marked as editable', () => {
    const notesColDef = component.columnDefs.find((c) => c.field === 'notes')!;
    expect(notesColDef.editable).toBeTrue();
  });

  it('should have all required columns defined', () => {
    const fields = component.columnDefs.map((c) => c.field);
    expect(fields).toContain('name');
    expect(fields).toContain('model');
    expect(fields).toContain('manufacturer');
    expect(fields).toContain('hyperdrive_rating');
    expect(fields).toContain('crew');
    expect(fields).toContain('notes');
  });

  
});