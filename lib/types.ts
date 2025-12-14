export interface TempDataPoint {
  time: string; // ISO timestamp для БД
  displayTime: string; // Форматований час для графіка
  temp: number;
  index: number;
}
