import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private api = 'https://your-api-url/api/project';

  constructor(private http: HttpClient) {}

  getAll(search: string) {
    return this.http.get(`${this.api}?search=${search}`);
  }

  create(data: any) {
    return this.http.post(this.api, data);
  }

  update(data: any) {
    return this.http.put(this.api, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }

  toggleActive(id: string) {
    return this.http.patch(`${this.api}/toggle/${id}`, {});
  }
}