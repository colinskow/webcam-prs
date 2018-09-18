import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModelService, ExampleCounter } from '../services/model.service';
import { WebcamService } from '../services/webcam.service';
import { NEUTRAL, PAPER, ROCK, SCISSORS } from '../constants';

@Component({
  selector: 'prs-trainer',
  templateUrl: './trainer.component.html',
  styleUrls: ['./trainer.component.scss']
})
export class TrainerComponent implements AfterViewInit, OnDestroy {

  @ViewChild('webcam') webcamRef;
  @ViewChild('neutralThumb') neutralThumbRef;
  @ViewChild('paperThumb') paperThumbRef;
  @ViewChild('rockThumb') rockThumbRef;
  @ViewChild('scissorsThumb') scissorsThumbRef;

  NEUTRAL = NEUTRAL;
  PAPER = PAPER;
  ROCK = ROCK;
  SCISSORS = SCISSORS;

  learningRateOptions = [
    0.00001,
    0.0001,
    0.001,
    0.003
  ];
  batchSizeOptions = [
    0.05,
    0.1,
    0.4,
    1
  ];
  epochOptions = [ 10, 20, 40 ];
  denseUnitOptions = [ 10, 100, 200 ];

  labelThumbs: { [key: number]: HTMLCanvasElement } = {};

  _learningRate: number;
  set learningRate(value: number) {
    this._learningRate = parseFloat(value as any);
    this.model.learningRate = this._learningRate;
  }
  get learningRate() {
    return this._learningRate;
  }

  _batchSizeFraction: number;
  set batchSizeFraction(value: number) {
    this._batchSizeFraction = parseFloat(value as any);
    this.model.batchSizeFraction = this._batchSizeFraction;
  }
  get batchSizeFraction() {
    return this._batchSizeFraction;
  }

  _epochs: number;
  set epochs(value: number) {
    this._epochs = parseInt(value as any, 10);
    this.model.epochs = this._epochs;
  }
  get epochs() {
    return this._epochs;
  }

  _denseUnits: number;
  set denseUnits(value: number) {
    this._denseUnits = parseInt(value as any, 10);
    this.model.denseUnits = this._denseUnits;
  }
  get denseUnits() {
    return this._denseUnits;
  }

  training = false;
  trainingStatus = '';
  error = '';
  exampleCounts: ExampleCounter = {};
  subs: Subscription[] = [];

  constructor(private model: ModelService, private webcam: WebcamService) {
    this.learningRate = this.learningRateOptions[1];
    this.batchSizeFraction = this.batchSizeOptions[2];
    this.epochs = this.epochOptions[1];
    this.denseUnits = this.denseUnitOptions[1];
  }

  async ngAfterViewInit() {
    this.labelThumbs[NEUTRAL] = this.neutralThumbRef.nativeElement;
    this.labelThumbs[PAPER] = this.paperThumbRef.nativeElement;
    this.labelThumbs[ROCK] = this.rockThumbRef.nativeElement;
    this.labelThumbs[SCISSORS] = this.scissorsThumbRef.nativeElement;
    const sub1 = this.model.trainingStatus$.subscribe(msg => this.trainingStatus = msg);
    const sub2 = this.model.exampleCount$.subscribe(counts => this.exampleCounts = counts);
    this.subs.push(sub1, sub2);
    try {
      await this.webcam.setup(this.webcamRef.nativeElement);
    } catch (e) {
      this.error = 'No webcam detected.';
    }
    this.model.warmUp();
  }

  async getExample(label: number) {
    const image = this.model.addExample(label);
    this.webcam.draw(image, this.labelThumbs[label]);
  }

  async train() {
    this.training = true;
    console.log('training');
    try {
      await this.model.train();
      this.training = false;
    } catch (err) {
      this.training = false;
      console.error(err);
      this.error = err;
    }
    console.log('done training');
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe);
  }

}
