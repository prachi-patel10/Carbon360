import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MasterTreeService {
  apiUrl = 'https://your-backend-api.com/api/trees'; // replace with real API

  constructor(private http: HttpClient) {}

  getTrees(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  addTree(tree:any) { return this.http.post(this.apiUrl, tree); }
  updateTree(tree:any) { return this.http.put(`${this.apiUrl}/${tree.TreeId}`, tree); }
  deleteTree(id:number) { return this.http.delete(`${this.apiUrl}/${id}`); }
}