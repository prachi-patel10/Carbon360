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
import { Vehicletype } from './private/fleet-transport/vehicletype/vehicletype';  
import { Generatormaster } from './private/power-generator/generatormaster/generatormaster';
import { EmissionFactorComponent } from './private/masters/emissionfactor/emissionfactor';
import { GeneratorOperationComponent } from './private/power-generator/generator-ec/generator-ec';
import { Citymaster } from './private/fleet-transport/citymaster/citymaster';
import { Sitelocationmaster } from './private/power-generator/sitelocationmaster/sitelocationmaster';
import { VehicleReport } from './private/fleet-transport/vehicle-report/vehicle-report';
import { SearchGenerator } from './private/power-generator/search-generator/search-generator';
import { MyActionVehicle } from './private/fleet-transport/my-action-vehicle/my-action-vehicle';
import { MyActionGenerator } from './private/power-generator/my-action-generator/my-action-generator';

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
            { path: 'vehicleReport', component: VehicleReport },
            { path: 'vehiclemaster', component: Vehicles },// create/import VehicleComponent
            { path: 'fueltype', component: Fueltype },
            { path: 'emissionFactors', component: EmissionFactorComponent },
              { path: 'vehicletypeservice', component: Vehicletype },
              {path: 'generator', component: Generatormaster},
            // { path: 'waste', component: WasteComponent },           // create/import WasteComponent
            { path: 'generator-ec', component:GeneratorOperationComponent  },   // create/import GeneratorComponent
            { path: 'citymaster',component:Citymaster},
            {path: 'sitelocation', component:Sitelocationmaster},
            {path: 'searchGenerator', component:SearchGenerator},
            {path: 'MyActionVehicle', component:MyActionVehicle},
            {path: 'MyActionGenerator', component:MyActionGenerator}
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