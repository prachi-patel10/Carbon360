import { Routes } from '@angular/router';
import { Login } from './public/account/login/login';
import { Register } from './public/account/register/register';
import { Layout } from './private/layout/layout';
import { authGuard } from './core/guards/auth-guard';
import { Section } from './private/masters/section/section';
import { Unauthorized } from './public/unauthorized/unauthorized';
import { MasterUserComponent } from './private/masters/user/user';
import { Home } from './private/masters/home/home';
import { DashboardComponent } from './private/dashboard/dashboard';
import { MasterRoleComponent } from './private/masters/role/role';

export const routes: Routes = [

  // Default Redirect
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  // Public Routes (No Navbar)
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'unauthorized',
    component: Unauthorized
  },
    {
        path: 'role',
        component: MasterRoleComponent
      },
   {
        path: 'dashboard',
        component: DashboardComponent
      },   {
        path: 'user',
        component: MasterUserComponent
      },
     

  // Protected Routes (With Navbar Layout)
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'home',
        component: Home
      },
      {
        path: 'section',
        component: Section
      },
      
    ]
  },

  // Optional wildcard
  // {
  //   path: '**',
  //   redirectTo: 'login'
  // }

];
