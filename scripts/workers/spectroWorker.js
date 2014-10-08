/* jshint worker:true */

'use strict';
(function (global) {
	/**
	 * A handy web worker to draw a spectrom (and calculate a fft)
	 *
	 * @version 1.1
	 * @author Georg raess <graess@phonetik.uni-muenchen.de>
	 * @link http://www.phonetik.uni-muenchen.de/
	 *
	 */
	var executed = false;
	var PI = 3.141592653589793; // value : Math.PI
	var TWO_PI = 6.283185307179586; // value : 2 * Math.PI
	var emphasisPerOctave; // = 3.9810717055349722; // value : toLinearLevel(6);	
	var sin, cos, n; // vars to hold sin and cos table	
	var internalalpha = 0.16;
	var totalMax = 0;
	var dynRangeInDB = 50;
	var myOffset = 0;
	var mywidth = 0;
	var myDrawOffset = 0;
	var pixelRatio = 1;
	var myFFT, paint, HzStep, c, d, maxPsd, pixelHeight, transparency;
	var myWindow = {
		BARTLETT: 1,
		BARTLETTHANN: 2,
		BLACKMAN: 3,
		COSINE: 4,
		GAUSS: 5,
		HAMMING: 6,
		HANN: 7,
		LANCZOS: 8,
		RECTANGULAR: 9,
		TRIANGULAR: 10
	};

	// worker scope global config var definitions
	var N;
	var upperFreq;
	var lowerFreq;
	var start;
	var end;
	var myStep;
	var myheight;
	var wFunction;
	var sampleRate;
	var streamChannels;
	var threadSoundBuffer;
	var drawHeatMapColors;
	var heatMapColorAnchors = [
		[255, 0, 0],
		[0, 255, 0],
		[0, 0, 0]
	];

	var preEmphasisFilterFactor = 0.97;


	/**
	 *various helper functions for calculation
	 */

	// used by FFT
	function toLinearLevel(dbLevel) {
		return Math.pow(10, (dbLevel / 10));
	}

	// used by FFT
	function log10(arg) {
		return Math.log(arg) / 2.302585092994046; // Math.log(x) / Math.LN10
	}

	// used by FFT
	function magnitude(real, imag) {
		return Math.sqrt((real * real) + (imag * imag));
	}

	/**
	 * calculates Magnitude by
	 * - reading the current (defined with offset) data from localSoundBuffer
	 * - applying the current Window Function to the selected data
	 * - calculating the actual FFT
	 * - (and saving the biggest value in totalMax)
	 *
	 * [parameters]
	 * channel			-> Number of Channels
	 * offset			-> Calculated offset in PCM Stream
	 * windowSize		-> Size of Window used for calculation
	 * c				-> Upper Boundry (c = Math.floor(upperFreq/HzStep);)
	 *
	 * [return]
	 * calculated FFT data as Float32Array
	 */

	function getMagnitude(channel, offset, windowSize, c, d) {
		// imaginary array of length N
		var imag = new Float32Array(N);

		// real array of length N
		var real = new Float32Array(N);

		// result array of length N
		var result = new Float32Array(c - d);

		// set real values by reading local sound buffer
		for (var j = 0; j < windowSize; j++) {
			real[j] = threadSoundBuffer[offset + j];
		}

		// calculate FFT window function over real 
		myFFT.wFunction(wFunction, internalalpha, real);

		// calculate FFT over real and save to result
		myFFT.fft(real, imag);
		// calculate magnitude for each spectral component 
		for (var low = 0; low <= c - d; low++) {
			result[low] = magnitude(real[low + d], imag[low + d]);
			// result[low] = result[low] * low * emphasisPerOctave; // preemphasis per octave SIC SIC SIC... don't use
			if (totalMax < result[low]) {
				totalMax = result[low];
			}
		}
		return result;
	}

	/**
	 * interpolates a 3D color space and calculate accoring
	 * value on that plane
	 *
	 * @param minval is the minimum value to map to (number)
	 * @param maxval is the maximum value to map to (number)
	 * @param val is the value itself (number)
	 * @param colors is an array of arrays containing the colors
	 * to interpol. against (of the form: [[255, 0, 0],[0, 255, 0],[0, 0, 255]])
	 */
	function convertToHeatmap(minval, maxval, val, colors) {
		var maxIndex = colors.length - 1;
		var v = (val - minval) / (maxval - minval) * maxIndex;
		var i1 = Math.floor(v);
		var i2 = Math.min.apply(null, [Math.floor(v) + 1, maxIndex]);
		var rgb1 = colors[i1];
		var rgb2 = colors[i2];
		var f = v - i1;
		return ({
			'r': Math.floor(rgb1[0] + f * (rgb2[0] - rgb1[0])),
			'g': Math.floor(rgb1[1] + f * (rgb2[1] - rgb1[1])),
			'b': Math.floor(rgb1[2] + f * (rgb2[2] - rgb1[2]))
		});
	}


	/**
	 * draws a single Line on the Canvas Element
	 * by calculating the RGB value of the current pixel with:
	 * 255-(255*scaled)
	 * function has to be called in an outer loop (according to canvas_width)
	 * the inner loop draws a single line on the canvas (according to canvas_height)
	 * @param line is the calculated FFT data
	 * @param p 
	 * @param c 
	 * @param d 
	 * @param cacheOffet 
	 * @param renderWidth of the image on the canvas
	 * @param renderHeight of the image on the canvas
	 * @param transparency of the image on the canvas  
	 *
	 */

	function drawOfflineSpectogram(line, p, c, d, cacheOffet, renderWidth, renderHeight, transparency) {

		// set upper boundary for linear interpolation
		var x1 = pixelHeight;
		var rgb, index, px, py;
		// value for first interpolation at lower boundry (height=0)
		var psd = (2 * Math.pow(paint[line][1], 2)) / N;
		var psdLog = 10 * log10(psd / maxPsd);
		var scaledVal = ((psdLog + dynRangeInDB) / dynRangeInDB);
		if (scaledVal > 1) {
			scaledVal = 1;
		} else if (scaledVal < 0) {
			scaledVal = 0;
		}

		for (var i = 0; i < paint[line].length; i++) {

			var y0 = scaledVal; // !!!! set y0 to previous scaled value

			// for each value in paint[] calculate pixelHeight interpolation points
			// x0=0
			// x1=pixelHeight
			// if(paint[i-1]<0) paint[i-1] = 1
			// y0=paint[i-1]    
			// y1=paint[i]


			// !!!! calculate next scaledValue [0...1] 
			psd = (2 * Math.pow(paint[line][i], 2)) / N;
			psdLog = 10 * log10(psd / maxPsd);
			scaledVal = ((psdLog + dynRangeInDB) / dynRangeInDB);
			if (scaledVal > 1) {
				scaledVal = 1;
			}
			if (scaledVal < 0) {
				scaledVal = 0;
			}

			// !!!! set y1 to this scaled value
			var y1 = scaledVal;

			if (pixelHeight >= 1) {
				// do interpolation between y0 (previous scaledValue) and y1 (scaledValue now)
				for (var b = 0; b < pixelHeight; b++) {
					var y2 = y0 + (y1 - y0) / x1 * b;

					// calculate corresponding color value for interpolation point [0...255]
					rgb = 255 - Math.round(255 * y2);

					// set internal image buffer to calculated & interpolated value
					px = Math.floor(line + cacheOffet);
					py = Math.floor(myheight - (pixelHeight * (i - 2) + b));

					index = (px + (py * renderWidth)) * 4;
					if (drawHeatMapColors) {
						if (!isNaN(rgb)) { // SIC!!! Why do we have NaNs as rgb vals?
							var hmVals = convertToHeatmap(0, 255, rgb, heatMapColorAnchors);
							p[index + 0] = hmVals.r;
							p[index + 1] = hmVals.g;
							p[index + 2] = hmVals.b;
							p[index + 3] = transparency;

						} else {
							p[index + 0] = rgb;
							p[index + 1] = rgb;
							p[index + 2] = rgb;
							p[index + 3] = transparency;
						}

					} else {
						p[index + 0] = rgb;
						p[index + 1] = rgb;
						p[index + 2] = rgb;
						p[index + 3] = transparency;
					}
				}
			} else {
				rgb = 255 - Math.round(255 * y1);
				// set internal image buffer to calculated & interpolated value
				px = Math.floor(line + cacheOffet);
				py = Math.floor(myheight - (pixelHeight * (i - 2)));

				index = (px + (py * renderWidth)) * 4;
				p[index + 0] = rgb;
				p[index + 1] = rgb;
				p[index + 2] = rgb;
				p[index + 3] = '255';
			}
		}
	}

	/**
	 * the actual FFT calculation including all window 
	 * functions
	 *
	 * @param fftSize is the actual size of the FFT
	 *
	 */
	function FFT(fftSize) {
		var m, i, x;
		n = fftSize;
		m = parseInt((Math.log(n) / 0.6931471805599453), 10);
		if (n !== (1 << m)) { // Make sure n is a power of 2
			console.log('ERROR : FFT length must be power of 2');
		}
		if (cos === undefined || n !== fftSize) {

			// this means that the following is only executed 
			// when no COS table exists
			// or n changes 

			cos = new Float32Array(n / 2); // precompute cos table
			for (x = 0; x < n / 2; x++) {
				cos[x] = Math.cos(-2 * PI * x / n);
			}
		}
		if (sin === undefined || n !== fftSize) {

			// this means that the following is only executed 
			// when no COS table exists
			// or n changes 

			sin = new Float32Array(n / 2); // precompute sin table
			for (x = 0; x < n / 2; x++) {
				sin[x] = Math.sin(-2 * PI * x / n);
			}
		}

		/**
		 * choose window function set alpha and execute it on the buffer
		 *
		 * @param type is the chosen window Function as enmu
		 * @param alpha is the alpha value for Window Functions (default 0.16)
		 * @param buffer represents the current fft window data
		 * @return the calculated FFT window
		 */
		this.wFunction = function (type, alpha, buffer) {
			var length = buffer.length;
			this.alpha = alpha;
			switch (type) {
			case myWindow.BARTLETT:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionBartlett(length, i);
				}
				break;
			case myWindow.BARTLETTHANN:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionBartlettHann(length, i);
				}
				break;
			case myWindow.BLACKMAN:
				this.alpha = this.alpha || 0.16;
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionBlackman(length, i, alpha);
				}
				break;
			case myWindow.COSINE:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionCosine(length, i);
				}
				break;
			case myWindow.GAUSS:
				this.alpha = this.alpha || 0.25;
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionGauss(length, i, alpha);
				}
				break;
			case myWindow.HAMMING:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionHamming(length, i);
				}
				break;
			case myWindow.HANN:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionHann(length, i);
				}
				break;
			case myWindow.LANCZOS:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionLanczos(length, i);
				}
				break;
			case myWindow.RECTANGULAR:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionRectangular(length, i);
				}
				break;
			case myWindow.TRIANGULAR:
				for (i = 0; i < length; i++) {
					if (i > 0) {
						buffer[i] = this.applyPreEmph(buffer[i], buffer[i - 1]);
					}
					buffer[i] *= this.wFunctionTriangular(length, i);
				}
				break;
			}
			return buffer;
		};

		// the Window Functions

		this.wFunctionBartlett = function (length, index) {
			return 2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2));
		};

		this.wFunctionBartlettHann = function (length, index) {
			return 0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(TWO_PI * index / (length - 1));
		};

		this.wFunctionBlackman = function (length, index, alpha) {
			var a0 = (1 - alpha) / 2;
			var a1 = 0.5;
			var a2 = alpha / 2;
			return a0 - a1 * Math.cos(TWO_PI * index / (length - 1)) + a2 * Math.cos(4 * PI * index / (length - 1));
		};

		this.wFunctionCosine = function (length, index) {
			return Math.cos(PI * index / (length - 1) - PI / 2);
		};

		this.wFunctionGauss = function (length, index, alpha) {
			return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
		};

		this.wFunctionHamming = function (length, index) {
			return 0.54 - 0.46 * Math.cos(TWO_PI * index / (length - 1));
		};

		this.wFunctionHann = function (length, index) {
			return 0.5 * (1 - Math.cos(TWO_PI * index / (length - 1)));
		};

		this.wFunctionLanczos = function (length, index) {
			var x = 2 * index / (length - 1) - 1;
			return Math.sin(PI * x) / (PI * x);
		};

		this.wFunctionRectangular = function () {
			return 1;
		};

		this.wFunctionTriangular = function (length, index) {
			return 2 / length * (length / 2 - Math.abs(index - (length - 1) / 2));
		};
		/**
		 * calculate and apply according pre-emphasis on sample
		 */
		this.applyPreEmph = function (curSample, prevSample) {
			return curSample - preEmphasisFilterFactor * prevSample;
		};

		// the FFT calculation
		this.fft = function (x, y) {
			// Bit-reverse
			var i, j, k, n1, n2, a, c, s, t1, t2;
			// Bit-reverse
			j = 0;
			n2 = n / 2;
			for (i = 1; i < n - 1; i++) {
				n1 = n2;
				while (j >= n1) {
					j = j - n1;
					n1 = n1 / 2;
				}
				j = j + n1;

				if (i < j) {
					t1 = x[i];
					x[i] = x[j];
					x[j] = t1;
					t1 = y[i];
					y[i] = y[j];
					y[j] = t1;
				}
			}

			// FFT
			n1 = 0;
			n2 = 1;

			for (i = 0; i < m; i++) {
				n1 = n2;
				n2 = n2 + n2;
				a = 0;

				for (j = 0; j < n1; j++) {
					c = cos[a];
					s = sin[a];
					a += 1 << (m - i - 1);

					for (k = j; k < n; k = k + n2) {
						t1 = c * x[k + n1] - s * y[k + n1];
						t2 = s * x[k + n1] + c * y[k + n1];
						x[k + n1] = x[k] - t1;
						y[k + n1] = y[k] - t2;
						x[k] = x[k] + t1;
						y[k] = y[k] + t2;
					}
				}
			}
		};
	}



	/**
	 * initial function call for calculating and drawing Spectrogram
	 * input sample data comes from the buffer "localSoundBuffer"
	 * which has to be filled before.
	 * - first loop calculates magnitudes to draw (getMagnitude())
	 * - second loop draws values on canvas  (drawOfflineSpectogram())
	 *
	 * @param N is the window Size
	 * @param upperFreq is the upper boundry in Hz
	 * @param start is the start time
	 * @param endis the end time
	 * @param cWidth is the width of canvas element
	 * @param cHeightis the height of canvas element
	 * @param octxis the context of canvas element used for drawing
	 */

	var parseData = (function () {
		return function (N, upperFreq, lowerFreq, start, end, renderWidth, renderHeight, pixelRatio, transparency, drawHeatMapColors, preEmphasisPerOctaveInDb) {

			if (!executed) {

				// start execution once
				executed = true;

				// calculate emphasisPerOctave
				emphasisPerOctave = toLinearLevel(preEmphasisPerOctaveInDb);

				// instance of FFT with windowSize N
				myFFT = new FFT(N);

				// array holding FFT results paint[canvas width][canvas height]
				paint = new Array(renderWidth);

				// Hz per pixel height
				HzStep = (sampleRate / 2) / (N / 2);

				// upper Hz boundary to display
				c = Math.ceil(upperFreq / HzStep);

				// lower Hz boundary to display
				d = Math.floor(lowerFreq / HzStep); // -1 for value below display when lower>0

				// height between two interpolation points
				pixelHeight = renderHeight / (c - d - 2);

				// create new picture
				var imageResult = new Uint8ClampedArray(Math.ceil(renderWidth * renderHeight * 4));

				// calculate i FFT runs, save result into paint and set maxPsd while doing so
				for (var i = 0; i < renderWidth; i++) {
					paint[i] = getMagnitude(0, Math.round(i * myStep) + myOffset, N, c, d);
					maxPsd = (2 * Math.pow(totalMax, 2)) / N;
				}

				// draw spectrogram on png image with canvas width
				// (one column is drawn in drawOfflineSpectogram)
				for (var j = 0; j < renderWidth; j++) {
					drawOfflineSpectogram(j, imageResult, c, d, myDrawOffset, renderWidth, renderHeight, transparency, drawHeatMapColors);
				}

				// post generated image block with settings back
				global.postMessage({
					'window': wFunction,
					'start': start,
					'end': end,
					'myStep': myStep,
					'pixelHeight': pixelHeight,
					'pixelRatio': pixelRatio,
					'renderWidth': renderWidth,
					'renderHeight': renderHeight,
					'img': imageResult.buffer
				}, [imageResult.buffer]);

				// free vars
				myFFT = null;

				// stop execution
				executed = false;
			}
		};
	})();

	/**
	 * Web Worker Communication
	 *
	 * Steps:
	 * ------
	 *
	 * (1)	Setup Web Worker by calling "config" and corresponding parameter
	 *		N		--> window Size
	 *		alpha	--> transparency of spectrogram
	 *		freq	--> upper Frequency Boundry
	 *		start	--> start Value in
	 *		end		--> end Value in
	 *		window	-->	window Function (please use myWindow enum)
	 *		width	--> height of canvas used to display
	 *		height	--> width of canvas used to display
	 *      stream  --> the data to be calculated
	 *      etc. see below
	 *
	 *		- example: primeWorker.postMessage({'cmd': 'config', 'N': N});
	 *
	 *
	 * (2)  Wait for callback of Web Worker sending you Base64 encoded spectrogram image
	 */

	addEventListener('message', function (e) {
	    var render = true;
	    var renderError = '';
		var data = e.data;
		if (data.N !== undefined) {
			N = data.N;
		} else {
		    renderError = 'N';
		    render = false;
		}
		if (data.alpha !== undefined) {
			internalalpha = data.alpha;
		} else {
		    renderError = 'alpha';
		    render = false;		    
		}
		if (data.freq !== undefined) {
			upperFreq = data.freq;
		} else {
		    renderError = 'freq';
		    render = false;	
		}
		if (data.freqLow !== undefined) {
			lowerFreq = data.freqLow;
		} else {
		    renderError = 'freqLow';
		    render = false;			    
		}
		if (data.start !== undefined) {
			start = data.start;
		} else {
		    renderError = 'start';
		    render = false;			    
		}
		if (data.end !== undefined) {
			end = data.end;
		} else {
		    renderError = 'end';
		    render = false;	
		}
		if (data.myStep !== undefined) {
			myStep = data.myStep;
		} else {
		    renderError = 'myStep';
		    render = false;			    
		}
		if (data.window !== undefined) {
			switch (data.window) {
			case 1:
				wFunction = myWindow.BARTLETT;
				break;
			case 2:
				wFunction = myWindow.BARTLETTHANN;
				break;
			case 3:
				wFunction = myWindow.BLACKMAN;
				break;
			case 4:
				wFunction = myWindow.COSINE;
				break;
			case 5:
				wFunction = myWindow.GAUSS;
				break;
			case 6:
				wFunction = myWindow.HAMMING;
				break;
			case 7:
				wFunction = myWindow.HANN;
				break;
			case 8:
				wFunction = myWindow.LANCZOS;
				break;
			case 9:
				wFunction = myWindow.RECTANGULAR;
				break;
			case 10:
				wFunction = myWindow.TRIANGULAR;
				break;
			}
		} else {
		    renderError = 'window';
		    render = false;	
		}
		if (data.width !== undefined) {
			mywidth = data.width;
		} else {
		    renderError = 'width';
		    render = false;	
		}
		if (data.height !== undefined) {
			myheight = data.height;
		} else {
		    renderError = 'height';
		    render = false;	
		}
		if (data.dynRangeInDB !== undefined) {
			dynRangeInDB = data.dynRangeInDB;
		} else {
		    renderError = 'dynRangeInDB';
		    render = false;	
		}
		if (data.pixelRatio !== undefined) {
			pixelRatio = data.pixelRatio;
		} else {
		    renderError = 'pixelRatio';
		    render = false;	
		}
		if (data.sampleRate !== undefined) {
			sampleRate = data.sampleRate;
		} else {
		    renderError = 'sampleRate'; 
		    render = false;	
		}
		if (data.streamChannels !== undefined) {
			streamChannels = data.streamChannels;
		} else {
		    renderError = 'streamChannels';
		    render = false;	
		}
		if (data.transparency !== undefined) {
			transparency = data.transparency;
		} else {
		    renderError = 'transparency';
		    render = false;	
		}
		if (data.stream !== undefined) {
			threadSoundBuffer = new Float32Array(data.stream);
		} else {
		    renderError = 'stream';
		    render = false;	
		}
		if (data.drawHeatMapColors !== undefined) {
			drawHeatMapColors = data.drawHeatMapColors;
		} else {
		    renderError = 'drawHeatMapColors';
		    render = false;	
		}
		if (data.preEmphasisFilterFactor !== undefined) {
			preEmphasisFilterFactor = data.preEmphasisFilterFactor;
		} else {
		    renderError = 'preEmphasisFilterFactor';
		    render = false;	
		}
		if (data.heatMapColorAnchors !== undefined) {
			heatMapColorAnchors = data.heatMapColorAnchors;
		} else {
		    renderError = 'heatMapColorAnchors';
		    render = false;	
		}
		if(render) {
		    parseData(N, upperFreq, lowerFreq, start, end, mywidth, myheight, pixelRatio, transparency, drawHeatMapColors, preEmphasisFilterFactor);
		} else {
		    this.postMessage({
			  'status': {
				'type': 'ERROR',
				'message': renderError + ' is undefined'
			  }
		    });		
		}
		
	}, false);
})(self);