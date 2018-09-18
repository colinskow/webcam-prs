import { Component, OnInit } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import { ModelService } from './services/model.service';
import { WebcamService } from './services/webcam.service';

@Component({
  selector: 'prs-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  mobilenetLoaded = false;

  constructor(private model: ModelService, private webcam: WebcamService) {}

  async ngOnInit() {
    await this.model.loadMobilenet();
    this.mobilenetLoaded = true;
  }
}
