import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TrainerComponent } from './trainer/trainer.component';
import { GameComponent } from './game/game.component';

const routes: Routes = [
  { path: 'train', component: TrainerComponent },
  { path: 'play', component: GameComponent },
  { path: '', redirectTo: '/train', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
