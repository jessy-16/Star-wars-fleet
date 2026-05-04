import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  IGetRowsParams,
  IDatasource,
  CellValueChangedEvent,
  GridOptions,
  ModuleRegistry,
  InfiniteRowModelModule,
  ClientSideRowModelModule,
} from 'ag-grid-community';
import { SwapiService } from '../services/swapi.service';
import { Starship } from '../models/starship.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

// Register required AG Grid modules
ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
]);

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './fleet.component.html',
})
export class FleetComponent implements OnInit {
  private readonly swapiService = inject(SwapiService);

  // Grid API reference
  private gridApi!: GridApi;

  // State signals
  readonly isInitialLoading = signal(true);
  readonly hasError = signal(false);
  readonly errorMessage = signal('');
  readonly isEmpty = signal(false);
  readonly searchQuery = signal('');
  readonly totalCount = signal(0);
  readonly rowCount = signal(0);
  readonly isAtEnd = signal(false);
  isDark = true;

  // Search debounce
  private searchSubject = new Subject<string>();

  // Page size for SWAPI (SWAPI returns 10 per page)
  private readonly PAGE_SIZE = 10;

  // Edited values stored in client state (Map<url, Partial<Starship>>)
  private readonly editedValues = new Map<string, Partial<Starship>>();

  // Column definitions
  readonly columnDefs: ColDef[] = [
    {
      headerName: 'Name',
      field: 'name',
      minWidth: 160,
      flex: 2,
      resizable: true,
      pinned: 'left',
      cellClass: 'font-semibold text-yellow-300',
    },
    {
      headerName: 'Model',
      field: 'model',
      minWidth: 180,
      flex: 2,
      resizable: true,
    },
    {
      headerName: 'Class',
      field: 'starship_class',
      minWidth: 140,
      flex: 1,
      resizable: true,
    },
    {
      headerName: 'Manufacturer',
      field: 'manufacturer',
      minWidth: 200,
      flex: 2,
      resizable: true,
    },
    {
      headerName: 'Hyperdrive',
      field: 'hyperdrive_rating',
      minWidth: 110,
      width: 110,
      resizable: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'Crew',
      field: 'crew',
      minWidth: 90,
      width: 90,
      resizable: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'Passengers',
      field: 'passengers',
      minWidth: 110,
      width: 110,
      resizable: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'MGLT',
      field: 'MGLT',
      minWidth: 80,
      width: 80,
      resizable: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
    },
    {
      headerName: 'Length (m)',
      field: 'length',
      minWidth: 100,
      width: 100,
      resizable: true,
      cellClass: 'text-right pr-4',
      headerClass: 'text-right',
    },
    {
      headerName: 'Cost (credits)',
      field: 'cost_in_credits',
      minWidth: 130,
      flex: 1,
      resizable: true,
      cellClass: 'text-right pr-4',
      valueFormatter: (p) =>
        p.value && p.value !== 'unknown'
          ? Number(p.value).toLocaleString()
          : p.value,
    },
    {
      headerName: 'Cargo (kg)',
      field: 'cargo_capacity',
      minWidth: 110,
      flex: 1,
      resizable: true,
      cellClass: 'text-right pr-4',
      valueFormatter: (p) =>
        p.value && p.value !== 'unknown'
          ? Number(p.value).toLocaleString()
          : p.value,
    },
    {
      headerName: 'Consumables',
      field: 'consumables',
      minWidth: 120,
      flex: 1,
      resizable: true,
    },
    {
      //  EDITABLE COLUMN - stored in client state only
      headerName: 'Notes ✏️',
      field: 'notes',
      minWidth: 200,
      flex: 2,
      resizable: true,
      editable: true,
      cellClass: 'cursor-text italic text-gray-400',
      cellEditor: 'agTextCellEditor',
      cellEditorParams: { maxLength: 200 },
      valueSetter: (params) => {
        const starship: Starship = params.data;
        const newValue: string = params.newValue ?? '';
        // Store edit in client state map
        const existing = this.editedValues.get(starship.url) ?? {};
        this.editedValues.set(starship.url, { ...existing, notes: newValue });
        // Update the row data in place
        params.data.notes = newValue;
        return true;
      },
      valueGetter: (params) => {
        const starship: Starship = params.data;
        if (!starship) return '';
        const edited = this.editedValues.get(starship.url);
        return edited?.notes !== undefined ? edited.notes : starship.notes ?? '';
      },
    },
  ];

  readonly defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    suppressMovable: false,
  };

  readonly gridOptions: GridOptions = {
    rowModelType: 'infinite',
    cacheBlockSize: this.PAGE_SIZE,
    infiniteInitialRowCount: 10,
    maxBlocksInCache: 20,
    suppressHorizontalScroll: false,
    animateRows: false,
  };

 ngOnInit(): void {
  //  THEME
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    this.isDark = savedTheme === 'dark';
  }

  this.applyTheme();

    // Debounce search input - clear cache & refresh grid when term changes
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchQuery.set(term);
        this.swapiService.clearCache();
        this.isAtEnd.set(false);
        this.isEmpty.set(false);
        this.gridApi?.setGridOption('datasource', this.buildDatasource());
      });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('datasource', this.buildDatasource());
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  retryLoad(): void {
    this.hasError.set(false);
    this.isInitialLoading.set(true);
    this.swapiService.clearCache();
    this.isAtEnd.set(false);
    this.gridApi?.setGridOption('datasource', this.buildDatasource());
  }

  // Returns a fresh AG Grid datasource bound to the current search query 
  private buildDatasource(): IDatasource {
    let firstLoad = true;

    return {
      getRows: (params: IGetRowsParams) => {
        const page = Math.floor(params.startRow / this.PAGE_SIZE) + 1;
        const search = this.searchQuery();

        this.swapiService.getStarships(page, search || undefined).subscribe({
          next: (data) => {
            if (firstLoad) {
              firstLoad = false;
              this.isInitialLoading.set(false);
              this.totalCount.set(data.count);

              if (data.count === 0) {
                this.isEmpty.set(true);
                params.successCallback([], 0);
                return;
              }
              this.isEmpty.set(false);
            }

            const lastRow = data.next === null ? params.startRow + data.results.length : -1;

            if (data.next === null) {
              this.isAtEnd.set(true);
            }

            this.rowCount.set(params.startRow + data.results.length);
            params.successCallback(data.results, lastRow);
          },
          error: (err) => {
            console.error('SWAPI error', err);
            this.isInitialLoading.set(false);
            this.hasError.set(true);
            this.errorMessage.set(
              'Failed to load starship data. Please check your connection.'
            );
            params.failCallback();
          },
        });
      },
    };

  }

  

  // Exposes edited values for testing/inspection 
  getEditedValues(): Map<string, Partial<Starship>> {
    return this.editedValues;
  }

  toggleTheme() {
  this.isDark = !this.isDark;
  localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  this.applyTheme();
}

applyTheme() {
  const body = document.body;

  body.classList.remove('dark', 'light');
  body.classList.add(this.isDark ? 'dark' : 'light');
}
}