import { Routes } from '@angular/router';
import { Login } from './public/account/login/login';
import { Register } from './public/account/register/register';
import { Layout } from './private/layout/layout';
import { authGuard } from './core/guards/auth-guard';
import { Section } from './private/masters/section/section';
import { Unauthorized } from './public/unauthorized/unauthorized';
import { User } from './private/masters/user/user';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login
    }, {
        path: 'register',
        component: Register
    },
    {
        path : 'unauthorized',
        component : Unauthorized
    }, {
        path: 'layout',
        component: Layout,
        canActivate:[authGuard],
        children: [
            {
                path: 'section',
                component: Section,
                
            },
            {
                path:'user',
                component : User,
                
            }
        ]
    },
//     {
//     path: '**',
//     redirectTo: 'login'
//   }
];
