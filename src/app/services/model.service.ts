import { EventEmitter, Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import { WebcamService } from './webcam.service';
import { DatasetService } from './dataset.service';
import { NUM_CLASSES, NEUTRAL, PAPER, ROCK, SCISSORS } from '../constants';

export interface ExampleCounter {
  [label: number]: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModelService {

  mobilenet: tf.Model;
  model: tf.Model;
  denseUnits: number;
  learningRate: number;
  epochs: number;
  batchSizeFraction: number;
  trainingStatus$ = new EventEmitter<string>();
  trained = false;

  exampleCounts: ExampleCounter = {
    [NEUTRAL]: 0,
    [PAPER]: 0,
    [ROCK]: 0,
    [SCISSORS]: 0,
  };

  exampleCount$ = new EventEmitter<ExampleCounter>();

  constructor(private webcam: WebcamService, private dataset: DatasetService) {}

  async loadMobilenet() {
    const mobilenet = await tf.loadModel(
        'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
    // Return a model that outputs an internal activation.
    const layer = mobilenet.getLayer('conv_pw_13_relu');
    this.mobilenet = tf.model({inputs: mobilenet.inputs, outputs: layer.output});
  }

  warmUp() {
    // Warm up the model. This uploads weights to the GPU and compiles the WebGL
    // programs so the first time we collect data from the webcam it will be
    // quick.
    tf.tidy(() => this.mobilenet.predict(this.webcam.capture()));
  }

  addExample(label: number) {
    const image = this.webcam.capture();
    tf.tidy(() => {
      this.dataset.addExample(this.mobilenet.predict(image) as tf.Tensor, label);
    });
    this.exampleCounts[label] ++;
    this.exampleCount$.emit(this.exampleCounts);
    return image;
  }

  /**
   * Sets up and trains the classifier.
   */
  async train() {
    if (this.dataset.xs == null) {
      throw new Error('Add some examples before training!');
    }

    // Creates a 2-layer fully connected model. By creating a separate model,
    // rather than adding layers to the mobilenet model, we "freeze" the weights
    // of the mobilenet model, and only train weights from the new model.

    this.model = tf.sequential({
      layers: [
        // Flattens the input to a vector so we can use it in a dense layer. While
        // technically a layer, this only performs a reshape (and has no training
        // parameters).
        tf.layers.flatten({inputShape: [7, 7, 256]}),
        // Layer 1
        tf.layers.dense({
          units: this.denseUnits,
          activation: 'relu',
          kernelInitializer: 'varianceScaling',
          useBias: true
        }),
        // Layer 2. The number of units of the last layer should correspond
        // to the number of classes we want to predict.
        tf.layers.dense({
          units: NUM_CLASSES,
          kernelInitializer: 'varianceScaling',
          useBias: false,
          activation: 'softmax'
        })
      ]
    });

    // Creates the optimizers which drives training of the model.
    const optimizer = tf.train.adam(this.learningRate);
    // We use categoricalCrossentropy which is the loss function we use for
    // categorical classification which measures the error between our predicted
    // probability distribution over classes (probability that an input is of each
    // class), versus the label (100% probability in the true class)>
    this.model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy'});

    // We parameterize batch size as a fraction of the entire dataset because the
    // number of examples that are collected depends on how many examples the user
    // collects. This allows us to have a flexible batch size.
    const batchSize =
        Math.floor(this.dataset.xs.shape[0] * this.batchSizeFraction);
    if (!(batchSize > 0)) {
      throw new Error(
          `Batch size is 0 or NaN. Please choose a non-zero fraction.`);
    }

    // Train the model! Model.fit() will shuffle xs & ys so we don't have to.
    await this.model.fit(this.dataset.xs, this.dataset.ys, {
      batchSize,
      epochs: this.epochs,
      callbacks: {
        onBatchEnd: async (batch, logs) => {
          this.trainingStatus$.emit('Loss: ' + logs.loss.toFixed(5));
        }
      }
    });
    this.trained = true;
  }

  async predict(): Promise<number> {
      const predictedClass = tf.tidy(() => {
        // Capture the frame from the webcam.
        const img = this.webcam.capture();

        // Make a prediction through mobilenet, getting the internal activation of
        // the mobilenet model.
        const activation = this.mobilenet.predict(img);

        // Make a prediction through our newly-trained model using the activation
        // from mobilenet as input.
        const predictions = this.model.predict(activation) as tf.Tensor;

        // Returns the index with the maximum probability. This number corresponds
        // to the class the model thinks is the most probable given the input.
        return predictions.as1D().argMax();
      });

      const classId = (await predictedClass.data())[0];
      predictedClass.dispose();

      return classId;
  }

  nextFrame() {
    return tf.nextFrame();
  }

}
