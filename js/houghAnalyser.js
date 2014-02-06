var HoughAnalyser = function HoughAnalyser(image, type) {
    return new HoughAnalyser.fn.init(image, type);
};

var LineHoughAnalyser = function LineHoughAnalyser(parent) {
    return new LineHoughAnalyser.fn.init(parent);
};

var RectangleHoughAnalyser = function RectangleHoughAnalyser(parent) {
    return new RectangleHoughAnalyser.fn.init(parent);
};

var CircleHoughAnalyser = function CircleHoughAnalyser(parent) {
    return new CircleHoughAnalyser.fn.init(parent);
};

HoughAnalyser.fn = HoughAnalyser.prototype = {
    originalImage: Image,
    canvasOriginal: HTMLCanvasElement,
    contextOriginal: CanvasRenderingContext2D,
    originalImageData: ImageData,
    houghImageData: Array,
    filteredHoughImageData: Array,
    init: function (image, type) {
        this.setImage(image);
        this.houghImageFinishedEvent = new CustomEvent("houghImageFinished");
        this.filteredHoughImageFinishedEvent = new CustomEvent("filteredHoughImageFinished");
        this.resultImageFinishedEvent = new CustomEvent("resultImageFinished", this);

        switch (type) {
            case "line":
                this.analyser = new LineHoughAnalyser(this);
                break;
            case "circle":
                this.analyser = new CircleHoughAnalyser(this);
                break;
            case "rectangle":
                this.analyser = new RectangleHoughAnalyser(this);
                break;
            default:
                console.log("Unknown hough transformation type: " + type);
        }
    },
    setImage: function (image) {
        this.createInMemoryCopies(image);
    },
    createInMemoryCopies: function (source) {

        this.originalImage = new Image();
        this.canvasOriginal = document.createElement('canvas');
        this.contextOriginal = this.canvasOriginal.getContext('2d');

        this.originalImage.src = source.src;
        this.canvasOriginal.width = source.width;
        this.canvasOriginal.height = source.height;

        this.contextOriginal.drawImage(this.originalImage, 0, 0);
        this.originalImageData = this.contextOriginal.getImageData(0, 0, this.originalImage.width, this.originalImage.height);

    },
    run: function () {
        this.analyser.generateHoughImages();
        this.analyser.generateFilteredHoughImage();
        this.analyser.generateResultImage(this.analyser.filteredHoughArray);
    },
    createSlider: function (container, labelText, id, stepSize, maxValue, minValue, value) {
        var li01 = document.createElement('li');
        var form01 = document.createElement('form');
        var label01 = document.createElement('label');
        var input01 = document.createElement('input');

        input01.id = id;
        input01.type = "range";
        input01.step = stepSize;
        input01.max = maxValue;
        input01.min = minValue;
        input01.value = value;


        label01.setAttribute("for", id);
        label01.innerHTML = labelText;

        form01.appendChild(label01);
        form01.appendChild(input01);
        li01.appendChild(form01);

        container.appendChild(li01);

    }
}

LineHoughAnalyser.fn = LineHoughAnalyser.prototype = {
    constructor: LineHoughAnalyser,
    radians: Array(),
    sinus: Array(),
    cosine: Array(),
    knownRadiiRange: Number,
    parent: Object,
    centerOriginal: Array(),
    maxDistance: Number,
    houghArray: Array(),
    filteredHoughArray: Array(),
    selectedThreshold: Number,
    init: function (parent) {
        this.parent = parent;
        this.preCalculate();
        this.generateControls();

    },
    preCalculate: function () {
        this.radiansStep = Math.PI / this.parent.canvasOriginal.width;

        this.radians = [];
        this.sinus = [];
        this.cosine = [];

        this.houghArray = [];
        this.filteredHoughArray = [];

        for (var currentRadian = 0, i = 0; currentRadian < Math.PI; currentRadian += this.radiansStep, i++) {
            this.radians[i] = currentRadian;
            this.sinus[i] = Math.sin(currentRadian);
            this.cosine[i] = Math.cos(currentRadian);
        }


        this.centerOriginal["x"] = Math.floor(this.parent.originalImage.width * 0.5);
        this.centerOriginal["y"] = Math.floor(this.parent.originalImage.height * 0.5);


        this.maxDistance = Math.sqrt((this.parent.originalImage.width * this.parent.originalImage.width) + (this.parent.originalImage.height * this.parent.originalImage.height)) * 0.5;
    },
    generateHoughArray: function () {

        var originalData = this.parent.originalImageData;
        var originalImage = this.parent.originalImage;

        var accumulatedMatrix = [];
        var maxRadius = Math.floor(Math.sqrt((originalImage.height * originalImage.height) + (originalImage.width * originalImage.width)));

        for (var i = 0; i < this.radians.length; i++) {
            accumulatedMatrix[i] = [];
            for (var j = 0; j < maxRadius; j++) {
                accumulatedMatrix[i][j] = 0;
            }
        }

        for (var i = 0, j = 0, posX = -this.centerOriginal.x, posY = this.centerOriginal.y;
             i < originalData.data.length;
             i += 4, j++, posX++) {

            if (i % (4 * originalImage.width) == 0 && i != 0) {
                posY--;
                posX = -this.centerOriginal.x;
            }

            if (originalData.data[i] == 0 && originalData.data[i + 1] == 0 && originalData.data[i + 2] == 0) {
                continue;
            }

            for (var a = 0; a < this.radians.length; a++) {

                var currentRadius = Math.floor((posX * this.cosine[a]) + (posY * this.sinus[a]) + Math.floor(maxRadius * 0.5));
                accumulatedMatrix[a][currentRadius] += 1;
            }
        }

        this.houghArray = accumulatedMatrix;
    },
    generateHoughImages: function () {
        if (this.houghArray.length == 0) {
            this.generateHoughArray();
        }
        this.parent.houghImageData = [];
        this.parent.houghImageData[0] = this.generateImageData(this.houghArray);

        document.dispatchEvent(this.parent.houghImageFinishedEvent);
    },
    generateFilteredHoughArray: function () {
        if (this.houghArray.length == 0) {
            this.generateHoughArray();
        }

        this.selectedThreshold = document.querySelector('#threshold-select').value;

        for (var i = 0; i < this.houghArray.length; i++) {
            this.filteredHoughArray[i] = [];
            for (var j = 0; j < this.houghArray[0].length; j++) {
                if (this.houghArray[i][j] < this.selectedThreshold) {
                    this.filteredHoughArray[i][j] = 0;
                }
                else {
                    this.filteredHoughArray[i][j] = this.houghArray[i][j];
                }
            }
        }
        var tempArray = new Array();

        for (var i = 0; i < this.filteredHoughArray.length; i++) {
            tempArray[i] = [];
            for (var j = 0; j < this.filteredHoughArray[0].length; j++) {
                tempArray[i][j] = this.filteredHoughArray[i][j];
            }
        }


        for (var i = 0; i < this.filteredHoughArray.length; i++) {
            for (var j = 0; j < this.filteredHoughArray[0].length; j++) {
                for (var k = i - 3; k < i + 3; k++) {
                    if (k < 0 || k > this.filteredHoughArray.length - 1) {
                        continue;
                    }
                    for (var l = j - 3; l < j + 3; l++) {
                        if (l < 0 || l > this.filteredHoughArray[0].length - 1) {
                            continue;
                        }
                        if (this.filteredHoughArray[k][l] > this.filteredHoughArray[i][j]) {

                            tempArray[i][j] = 0;
                        }
                    }
                }
            }
        }

        for (var i = 0; i < this.filteredHoughArray.length; i++) {
            for (var j = 0; j < this.filteredHoughArray[0].length; j++) {
                this.filteredHoughArray[i][j] = tempArray[i][j];
            }
        }
    },
    generateFilteredHoughImage: function () {
        this.generateFilteredHoughArray();

        this.parent.filteredHoughImageData[0] = this.generateImageData(this.filteredHoughArray);

        document.dispatchEvent(this.parent.filteredHoughImageFinishedEvent);
    },
    generateResultImage: function (array) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.width = this.parent.originalImage.width;
        canvas.height = this.parent.originalImage.height;

        context.drawImage(this.parent.originalImage, 0, 0);

        var maxRadius = Math.floor(Math.sqrt((this.parent.originalImage.height * this.parent.originalImage.height) + (this.parent.originalImage.width * this.parent.originalImage.width)));

        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < array[0].length; j++) {
                if (array[i][j] > 0) {
                    var radiant = this.radians[i];
                    var radius = j - (maxRadius * 0.5);
                    this.drawLine(context, radius, -radiant, this.centerOriginal.x, this.centerOriginal.y);
                }
            }
        }
        this.parent.resultImage = canvas;

        document.dispatchEvent(this.parent.resultImageFinishedEvent);
    },
    generateImageData: function (array) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        var factorMaxAccumulatedToImage = this.calculateMaxValueToIntensityFactor(array);

        canvas.height = this.parent.originalImage.height;
        canvas.width = this.parent.originalImage.width;

        var widthFactor = array.length / canvas.width;
        var heightFactor = array[0].length / canvas.height;

        var threshold = document.querySelector('#threshold-select').value;
        var resultImageData = context.createImageData(canvas.width, canvas.height);
        for (var y = 0, i = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++, i += 4) {
                var xIndex = Math.floor(x * widthFactor);
                var yIndex = Math.floor(y * heightFactor);

                var currentValue = Math.floor(array[xIndex][yIndex] * factorMaxAccumulatedToImage);

                resultImageData.data[i] = resultImageData.data[i + 1] = resultImageData.data[i + 2] = currentValue;
                resultImageData.data[i + 3] = 255;
            }
        }
        return resultImageData;

//        canvas.height = array[0].length;
//        canvas.width = array.length;
//
//        var threshold = document.querySelector('#threshold-select').value;
//        var resultImageData = context.createImageData(canvas.width, canvas.height);
//        for (var y = 0, i = 0; y < canvas.height; y++) {
//            for (var x = 0; x < canvas.width; x++, i += 4) {
//                var currentValue = Math.floor(array[x][y] * factorMaxAccumulatedToImage);
//                resultImageData.data[i] = resultImageData.data[i + 1] = resultImageData.data[i + 2] = currentValue;
//                resultImageData.data[i + 3] = 255;
//            }
//        }
//        return resultImageData;
    },
    recalculateThreshold: function () {
        console.log("generateFiltered called");
        this.filteredHoughArray = [];
        this.generateFilteredHoughImage();
        this.generateResultImage(this.filteredHoughArray);
    },
    generateControls: function () {
        var container = document.querySelector("#hough-input");
        while (container.hasChildNodes()) {
            container.removeChild(container.lastChild);
        }
        this.selectedThreshold = 80;
        this.parent.createSlider(container, "Threshold", "threshold-select", 1, 256, 2, 180);


        document.querySelector('#threshold-select').onchange = this.recalculateThreshold.bind(this);
    },
    drawLine: function (context, radius, radiant, centerX, centerY) {

        var y1, y2, x1, x2;

        if (radiant > Math.PI / 4 && radiant < Math.PI * 2 / 3) {
            x1 = -centerX;
            y1 = (radius - x1 * Math.cos(radiant)) / Math.sin(radiant);

            x2 = centerX;
            y2 = (radius - x2 * Math.cos(radiant)) / Math.sin(radiant);
        } else {
            y1 = -centerY;
            x1 = (radius - y1 * Math.sin(radiant)) / Math.cos(radiant);

            y2 = centerY;
            x2 = (radius - y2 * Math.sin(radiant)) / Math.cos(radiant);
        }

        context.strokeStyle = "#FF0000";
        context.beginPath();
        context.moveTo(centerX + x1, centerY + y1 - 1);
        context.lineTo(centerX + x2, centerY + y2 - 1);
        context.stroke();

    },
    calculateMaxValueToIntensityFactor: function (array) {
        var maxAccumulated = Number.MIN_VALUE;
        var minAccumulated = Number.MAX_VALUE;

        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < array[0].length; j++) {
                if (array[i][j] < minAccumulated && array[i][j] != 0) {
                    minAccumulated = array[i][j];
                }
                if (array[i][j] > maxAccumulated && array[i][j] != 0) {
                    maxAccumulated = array[i][j];
                }
            }
        }
        return 255 / maxAccumulated;

    }
}

RectangleHoughAnalyser.fn = RectangleHoughAnalyser.prototype = {
    constructor: RectangleHoughAnalyser,
    parent: Object,
    searchDistanceMax: Number,
    searchDistanceMin: Number,
    stepRadians: Number,
    stepRadius: Number,
    init: function (parent) {
        this.parent = parent;
        console.log("creating new RectangleHoughAnalyser");
        this.searchDistanceMax = Math.round(0.5 * ((this.parent.canvasOriginal.width > this.parent.canvasOriginal.height) ? this.parent.canvasOriginal.width : this.parent.canvasOriginal.height));
        this.searchDistanceMin = 20;

        this.houghWidth = Math.round((4 * this.parent.canvasOriginal.width) / 3);
        this.houghHeight = Math.round((4 * this.parent.canvasOriginal.height) / 3);

        this.stepsRadians = (3 * Math.PI) / (4 * this.searchDistanceMax);
        this.stepsRadius = 3 / 4;
        console.log(this.searchDistanceMax, this.searchDistanceMin);
    },
    getAccumulatorImage: function () {
        var minDistanceOffset = Math.round(this.searchDistanceMin * 0.5);
        var firstY = Math.round(this.searchDistanceMin * 0.5);

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.height = this.parent.canvasOriginal.height;
        canvas.width = this.parent.canvasOriginal.width;

        var threshold = document.querySelector('#threshold-select').value;
        var resultImageData = context.createImageData(canvas.width, canvas.height);

        var count = 0;
        for (var y = 0, i = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++, i += 4) {
                if ((x < minDistanceOffset || x > canvas.width - minDistanceOffset - 1) || (y < minDistanceOffset || y > canvas.height - minDistanceOffset - 1)) {
                    //resultImageData.data[i] = 0;
                    continue;
                }

                if (count == 0) {
                    var minX = x - Math.floor(this.searchDistanceMin * 0.5);
                    if (minX < 0) {
                        minX = 0;
                    }
                    var minY = y - Math.floor(this.searchDistanceMin * 0.5);
                    if (minY < 0) {
                        minY = 0;
                    }
                    var maxX = x + Math.floor(this.searchDistanceMin * 0.5);
                    if (maxX > canvas.width) {
                        maxX = canvas.width;
                    }
                    var maxY = y + Math.floor(this.searchDistanceMin * 0.5);
                    if (maxY > canvas.height) {
                        maxY = canvas.height;
                    }

                    console.log(minX, minY, maxX, maxY);

                    for (var innerY = 0, j = 0; innerY < canvas.height; innerY++) {
                        for (var innerX = 0; innerX < canvas.width; innerX++, j += 4) {
                            if ((innerX > minX && innerX < maxX) && (innerY > minY && innerY < maxY)) {
                                resultImageData.data[j] = 255;
                            }
                            else {
                                resultImageData.data[j] = 0;
                            }
                            resultImageData.data[j + 1] = resultImageData.data[j + 2] = 0;
                            resultImageData.data[j + 3] = 255;

                        }
                    }
                    count++;
                }


                // Zwischenbild extrahieren


            }
        }


        context.putImageData(resultImageData, 0, 0);

        return canvas;
    },
    analyseSubsection: function (center) {
        var points = [];
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.height = this.searchDistanceMax;
        canvas.width = this.searchDistanceMax;

        var threshold = document.querySelector('#threshold-select').value;
        var resultImageData = context.createImageData(canvas.width, canvas.height);

        context.putImageData(resultImageData, 0, 0);

        document.appendChild(canvas);
    }
}

CircleHoughAnalyser.fn = CircleHoughAnalyser.prototype = {
    constructor: CircleHoughAnalyser,
    parent: Object,
    minRadius: Number,
    maxRadius: Number,
    sinus: Array,
    cosine: Array,
    radiiSin: Array,
    radiiCos: Array,
    houghArray: Array,
    houghArrayFiltered: Array,
    calculateRadiusIndex: Number,
    calculateStepSize: Number,
    calculateRequests: Number,
    overallMax: Number,
    maxValues: Array,
    houghImageData: Array,
    init: function (parent) {
        console.log("creating new CircleHoughAnalyser");
        this.parent = parent;
        this.minRadius = 5;
        this.maxRadius = 200;

        this.calculateStepSize = Math.floor((this.maxRadius - this.minRadius) / 100);
        console.log(this.calculateStepSize);
        this.calculateRequests = 0;
        this.calculateRadiusIndex = 0;
        this.preCalculate();
        this.generateControls();


        this.overallMax = Number.MIN_VALUE;
    },
    preCalculate: function () {
        var stepSize = (2 * Math.PI) / this.parent.canvasOriginal.width;

        this.cosine = [];
        this.sinus = [];

        for (var i = 0, index = 0; i < (2 * Math.PI); i += stepSize, index++) {
            this.cosine[index] = Math.cos(i);
            this.sinus[index] = Math.sin(i);
        }

        this.radiiSin = [];
        this.radiiCos = [];

        for (var i = 0; i < this.maxRadius - this.minRadius; i++) {
            this.radiiSin[i] = [];
            this.radiiCos[i] = [];
            for (var j = 0; j < this.cosine.length; j++) {
                this.radiiSin[i][j] = (i + this.minRadius) * this.sinus[j];
                this.radiiCos[i][j] = (i + this.minRadius) * this.cosine[j];
            }
        }
        this.houghArray = [];

    },
    calculateHoughArray: function (startIndex) {
        var endIndex = startIndex + this.calculateStepSize;

        if (endIndex > this.maxRadius - this.minRadius) {
            endIndex = this.maxRadius - this.minRadius;
        }
        this.calculateRadiusIndex = endIndex;


        var originalData = this.parent.originalImageData;

        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        for (var currentRadius = startIndex; currentRadius < endIndex; currentRadius++) {
            for (var originalX = 0, index = 0; originalX < this.parent.originalImage.width; originalX++) {
                for (var originalY = 0; originalY < this.parent.originalImage.height; originalY++, index += 4) {
                    // Hack um sicher zu gehen, dass auch alles auf 0 initialisiert wird: >>
                    if (!this.maxValues[currentRadius]) {
                        this.maxValues[currentRadius] = Number.MIN_VALUE;
                    }
                    if (!this.houghArray[currentRadius]) {
                        this.houghArray[currentRadius] = [];
                    }
                    if (!this.houghArray[currentRadius][originalX]) {
                        this.houghArray[currentRadius][originalX] = [];
                    }
                    if (!this.houghArray[currentRadius][originalX][originalY]) {
                        this.houghArray[currentRadius][originalX][originalY] = 0;
                    }

                    // <<

                    if (originalData.data[index] < 128) {
                        continue;
                    }
                    for (var j = 0; j < this.cosine.length; j++) {
                        var x = originalX + this.radiiCos[currentRadius][j];
                        var y = originalY + this.radiiSin[currentRadius][j];

                        if (x < 0 || y < 0 || x > canvas.width - 1 || y > canvas.height - 1) {
                            continue;
                        }

                        if (!this.houghArray[currentRadius][Math.floor(x)]) {
                            this.houghArray[currentRadius][Math.floor(x)] = [];
                        }
                        if (!this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)]) {
                            this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] = 0;
                        }

                        this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] += 1;
                        this.maxValues[currentRadius] = (this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] > this.maxValues[currentRadius]) ? this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] : this.maxValues[currentRadius];
                        this.overallMax = (this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] > this.overallMax) ? this.houghArray[currentRadius][Math.floor(x)][Math.floor(y)] : this.overallMax;
                    }
                }
            }
        }
    },
    generateHoughArray: function (calculateRequestNumber) {
        var _this = this;
        if (calculateRequestNumber != this.calculateRequests) {
            this.houghArray = [];
            this.calculateRadiusIndex = 0;
            this.calculateStepSize = 1;
            this.maxValues = [];
            this.overallMax = Number.MIN_VALUE;
        }
        var percentageDone;
        if (this.calculateRadiusIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = (this.calculateRadiusIndex / (this.maxRadius - this.minRadius)) * 100;
        }

        this.calculateHoughArray(this.calculateRadiusIndex);
        var myEvent = new CustomEvent("status", {
            detail: {
                message: new String("Calculating hough-array, " + percentageDone + "% done.")
            }
        });
        document.dispatchEvent(myEvent);
        if (this.calculateRadiusIndex < this.maxRadius - this.minRadius) {
            setTimeout(function () {
                _this.generateHoughArray(calculateRequestNumber);
            }, 0);
        } else {
            var myEvent = new CustomEvent("progress", {
                detail: {
                    message: ""
                }
            });
            document.dispatchEvent(myEvent);
            this.houghImageData = this.createImageData(this.houghArray);

            this.parent.houghImageData = [];
            this.parent.houghImageData[0] = this.houghImageData[0];


            document.dispatchEvent(this.parent.houghImageFinishedEvent);

            var container = document.querySelector("#hough-input");
            this.parent.createSlider(container, "Threshold: ", "threshold-select", 0, this.overallMax, 1, this.overallMax - 5);
            document.querySelector('#threshold-select').onchange = this.generateFilteredImage.bind(this);

            this.generateFilteredImage();
        }
    },
    generateHoughImages: function () {
        if (this.houghArray.length == 0) {
            this.calculateRequests += 1;
            this.generateHoughArray(this.calculateRequests);
        }
    },
    createFilteredArray: function (threshold) {
        var startIndex = this.calculateRadiusIndex;
        var endIndex = this.calculateRadiusIndex + this.calculateStepSize;

        if (endIndex > this.maxRadius - this.minRadius) {
            endIndex = this.maxRadius - this.minRadius;
        }
        this.calculateRadiusIndex = endIndex;

        var maxIndexRadius = this.houghArray.length;
        var maxIndexX = this.houghArray[0].length;
        var maxIndexY = this.houghArray[0][0].length;

        for (var currentRadius = startIndex; currentRadius < endIndex; currentRadius++) {
            this.houghArrayFiltered[currentRadius] = [];
            for (var x = 0; x < maxIndexX; x++) {
                this.houghArrayFiltered[currentRadius][x] = [];
                for (var y = 0; y < maxIndexY; y++) {
                    this.houghArrayFiltered[currentRadius][x][y] = 0;
                    if(this.houghArray[currentRadius][x][y] >= threshold){
                        var localMax = true;
                        for(var i = (currentRadius - 3); i < (currentRadius + 4) && localMax; i++){
                            if(i > 0 && i < maxIndexRadius){
                                for(var j = (x - 3); j < (x + 4); j++){
                                    if(j > 0 && j < maxIndexX){
                                        for(var k = (y - 3); k < (y + 4); k++){
                                            if(k > 0 && k < maxIndexY){
                                                if(this.houghArray[currentRadius][x][y] < this.houghArray[i][j][k]){
                                                    localMax = false;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if(localMax){
                            this.houghArrayFiltered[currentRadius][x][y] =  this.houghArray[currentRadius][x][y];
                        }
                    }
                }
            }
        }
    },
    applyThreshold: function (calculateRequestNumber, threshold) {
        var _this = this;

        if (calculateRequestNumber != this.calculateRequests) {
            console.log("reseting calculation stats")

            this.calculateStepSize = 1;
        }
        var percentageDone;
        if (this.calculateRadiusIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = (this.calculateRadiusIndex / (this.maxRadius - this.minRadius)) * 100;
        }

        this.createFilteredArray(threshold );
        var myEvent = new CustomEvent("status", {
            detail: {
                message: new String("Calculating filtered hough-array, " + percentageDone + "% done.")
            }
        });
        document.dispatchEvent(myEvent);

        if (this.calculateRadiusIndex < this.maxRadius - this.minRadius) {
            setTimeout(function () {
                _this.applyThreshold(calculateRequestNumber, threshold);
            }, 0);
        } else {
            var myEvent = new CustomEvent("status", {
                detail: {
                    message: ""
                }
            });
            document.dispatchEvent(myEvent);
            this.parent.filteredHoughImageData[0] = [];
            this.parent.filteredHoughImageData[0] = this.createFilteredImageData();
            document.dispatchEvent(this.parent.filteredHoughImageFinishedEvent);
            this.parent.resultImage = this.createResultImage();
            document.dispatchEvent(this.parent.resultImageFinishedEvent);


        }
    },
    generateFilteredImage: function () {
        var threshold = document.querySelector('#threshold-select').value;
        this.houghArrayFiltered = [];
        this.calculateRequests += 1;
        this.houghArrayFiltered = [];
        this.calculateRadiusIndex = 0;
        this.applyThreshold(this.calculateRequests, threshold);


    },
    createImageData: function (array) {
        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var imageDataArray = [];
        var factor = 255 / this.overallMax;
        for (var i = 0; i < array.length; i++) {

            //var factor = 255 / maxValues[i];

            var imageData = context.createImageData(canvas.width, canvas.height);

            for (var resultX = 0, index = 0; resultX < canvas.width; resultX++) {
                for (var resultY = 0; resultY < canvas.height; resultY++, index += 4) {
                    if (array[i][resultX][resultY] > 0) {
                        imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = array[i][resultX][resultY] * factor;
                    } else {
                        imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = 0;
                    }
                    imageData.data[index + 3] = 255;
                }
            }
            imageDataArray[i] = imageData;
        }

        return imageDataArray;
    },
    createFilteredImageData: function(){
        var canvas = document.createElement("canvas");
        var factor = 255 / this.overallMax;
        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var maxRadiusIndex =  this.houghArrayFiltered.length;
        var maxIndexX = this.houghArrayFiltered[0].length;
        var maxIndexY = this.houghArrayFiltered[0][0].length;


        var imageData = context.createImageData(canvas.width, canvas.height);
        for(var i = 0; i < maxRadiusIndex; i++){
            for (var resultX = 0, index = 0; resultX < maxIndexX; resultX++) {
                for (var resultY = 0; resultY < maxIndexY; resultY++, index += 4) {
                    if (this.houghArrayFiltered[i][resultX][resultY] > 0) {
                        imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = 255;
                    } else {
                        if(imageData.data[index] != 255){
                            imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = 0;
                        }
                    }
                    imageData.data[index + 3] = 255;
                }
            }
        }
        return imageData;
    },
    createResultImage: function(){
        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        var maxIndexRadius = this.houghArrayFiltered.length;
        var maxIndexX = this.houghArrayFiltered[0].length;
        var maxIndexY = this.houghArrayFiltered[0][0].length;

        var factor = 255 / this.overallMax;

        for(var currentRadius = 0; currentRadius < maxIndexRadius; currentRadius++){
            for(var x = 0; x < maxIndexX; x++){
                for(var y = 0; y < maxIndexY; y++){
                    if(this.houghArrayFiltered[currentRadius][x][y] > 0){
                            for (var j = 0; j < this.cosine.length; j++) {
                                var xOriginal = Math.floor(x + this.radiiCos[currentRadius][j]);
                                var yOriginal = Math.floor(y + this.radiiSin[currentRadius][j]);
                                var index = Math.round((yOriginal + (xOriginal * maxIndexX)) * 4);
                               // var index = Math.round((y + (x * maxIndexX)) * 4);
                                var newValue = Math.round(this.houghArrayFiltered[currentRadius][x][y] * factor);
                                if(newValue > imageData.data[index]){
                                    imageData.data[index] = this.houghArrayFiltered[currentRadius][x][y] * factor;
                                    imageData.data[index + 1] = imageData.data[index + 2] = 0;
                                }
                            }
                        }
                    }
                }
            }

        context.putImageData(imageData, 0, 0);
        return canvas;
    },
    selectHoughImage: function () {
        var index = document.querySelector('#hough-image-select').value;

        if (index < 0) {
            this.parent.houghImageData = this.houghImageData;
        } else {
            this.parent.houghImageData = [];
            this.parent.houghImageData[0] = this.houghImageData[index];
        }
        document.dispatchEvent(this.parent.houghImageFinishedEvent);
    },
    generateControls: function () {
        var container = document.querySelector("#hough-input");
        while (container.hasChildNodes()) {
            container.removeChild(container.lastChild);
        }
        var statusSpan = document.createElement('span');
        statusSpan.id = "status";


        this.parent.createSlider(container, "Cycle trough radii: ", "hough-image-select", 0, this.maxRadius - this.minRadius - 1, 1, 0);

        document.querySelector('#hough-image-select').oninput = this.selectHoughImage.bind(this);


        container.appendChild(statusSpan);
    }
}

HoughAnalyser.fn.init.prototype = HoughAnalyser.prototype;
LineHoughAnalyser.fn.init.prototype = LineHoughAnalyser.prototype;
RectangleHoughAnalyser.fn.init.prototype = RectangleHoughAnalyser.prototype;
CircleHoughAnalyser.fn.init.prototype = CircleHoughAnalyser.prototype;