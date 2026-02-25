import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class SectionService {

  private baseUrl = environment.apiBaseUrl;
    constructor(private http : HttpClient){

     
  }
   getAllDept() {
    return this.http.get(`${this.baseUrl}/Department/All`, this.getHeaders());
   }

  createSection(sectionData: any) {
    return this.http.post(`${this.baseUrl}/Section/Create`, sectionData, this.getHeaders());
  }
  
  updateSection(hashId : string,sectionData: any) {
  return this.http.put(
    `${this.baseUrl}/Section/Update/${hashId}`,
    sectionData,
    this.getHeaders()
  );
}

 deleteSection(hashSectId : string) {
    return this.http.delete(`${this.baseUrl}/Section/Delete/${hashSectId}`, this.getHeaders());
  }

  getSectionById(Hashid: string) {
  return this.http.get(
    `${this.baseUrl}/Section/${Hashid}`,this.getHeaders()
  );
}


updateSectionStatus(id: number, isActive: boolean) {
    const body = {
      
    };

    return this.http.put(
      `${this.baseUrl}/Section/status/${id}`,
      body,
      this.getHeaders()
    );
  }

getAllSection(
    search?: string,
    isActive?: boolean,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortColumn: string = "SectionName",
    sortDirection: string = "ASC"
  ) {

    let params: any = {};


    if (search && search.trim() !== '') {
      params.search = search;
    }

    if (isActive !== undefined) {
      params.isActive = isActive;
    }

    params.pageNumber = pageNumber;
    params.pageSize = pageSize;

    params.sortColumn = sortColumn;
    params.sortDirection = sortDirection;

    return this.http.get(
      `${this.baseUrl}/Section/GetAllSection`,{
      params: params,
       headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        }),
      }
      
    );
  }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      })
    }
  }
}
