import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ModelService } from '../services/model.service';
import { WebcamService } from '../services/webcam.service';
import { NEUTRAL, PAPER, ROCK, SCISSORS } from '../constants';

@Component({
  selector: 'prs-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements AfterViewInit {

  @ViewChild('webcam') webcamRef;
  error = '';
  prediction = '';

  constructor(private model: ModelService, private webcam: WebcamService) { }

  async ngAfterViewInit() {
    try {
      await this.webcam.setup(this.webcamRef.nativeElement);
      if (this.model.trained) {
        this.predictLoop();
      }
    } catch (e) {
      this.error = 'No webcam detected.';
    }
  }

  async predictLoop() {
    while (true) {
      const label = await this.model.predict();
      switch (label) {
        case PAPER:
          this.prediction = 'PAPER';
          break;
        case ROCK:
          this.prediction = 'ROCK';
          break;
        case SCISSORS:
          this.prediction = 'SCISSORS';
          break;
        default:
          this.prediction = '';
      }
      await this.model.nextFrame();
    }
  }

}
