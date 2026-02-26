import { Routes } from '@angular/router';
import { Login } from './public/account/login/login';
import { Register } from './public/account/register/register';
import { Layout } from './private/layout/layout';
import { Unauthorized } from './public/unauthorized/unauthorized';
import { MasterUserComponent } from './private/masters/user/user';
import { Home } from './private/masters/home/home';
import { DashboardComponent } from './private/dashboard/dashboard';
import { MasterRoleComponent } from './private/masters/role/role';
import { DepartmentComponent } from './private/masters/department/department';
import { TripComponent } from './private/fleet-transport/vehicle-ec/vehicle-ec';
import { Vehicles } from './private/fleet-transport/vehicles/vehicles';
import { Fueltype } from './private/masters/fueltype/fueltype';

export const routes: Routes = [

    // Default Redirect
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },

    // Public Routes (No Navbar)
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'unauthorized', component: Unauthorized },

    // Dashboard Routes
    {
        path: 'dashboard',
        component: DashboardComponent,
        children: [
            // { path: '', redirectTo: 'login', pathMatch: 'full' },
            { path: 'user', component: MasterUserComponent },
            { path: 'role', component: MasterRoleComponent },
            { path: 'department', component: DepartmentComponent }, // create/import DepartmentComponent
            { path: 'vehicle', component: TripComponent },
            { path: 'vehiclemaster', component: Vehicles },// create/import VehicleComponent
            { path: 'fueltype', component: Fueltype },// create/import VehicleComponent

            // { path: 'waste', component: WasteComponent },           // create/import WasteComponent
            // { path: 'generator', component: GeneratorComponent },   // create/import GeneratorComponent
        ]
    },

    // Protected Routes with Layout
    // {
    //   path: '',
    //   component: Layout,
    //   children: [
    //     { path: 'home', component: Home },
    //     { path: 'section', component: Section },
    //     // Add more protected routes here if needed
    //   ]
    // },

    // Wildcard route (redirect unknown paths to login or 404)
    {
        path: '**',
        redirectTo: 'login'
    }

];