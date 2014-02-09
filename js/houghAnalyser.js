var HoughAnalyser = function HoughAnalyser(image, type) {
    return new HoughAnalyser.fn.init(image, type);
};

var LineHoughAnalyser = function LineHoughAnalyser(parent) {
    return new LineHoughAnalyser.fn.init(parent);
};

var CircleHoughAnalyser = function CircleHoughAnalyser(parent) {
    return new CircleHoughAnalyser.fn.init(parent);
};

var EllipseHoughAnalyser = function EllipseHoughAnalyser(parent) {
    return new EllipseHoughAnalyser.fn.init(parent);
}

HoughAnalyser.fn = HoughAnalyser.prototype = {
    originalImage: Image,
    canvasOriginal: HTMLCanvasElement,
    contextOriginal: CanvasRenderingContext2D,
    imageDataOriginal: ImageData,
    houghImageData: Array,
    filteredHoughImageData: Array,
    numEdgePixels: Number,
    edgePixels: Array,
    inputContainer: Object,
    init: function (image, type) {
        this.setupImage(image);
        this.houghImageFinishedEvent = new CustomEvent("houghImageFinished");        // TODO: deprecated
        this.filteredHoughImageFinishedEvent = new CustomEvent("filteredHoughImageFinished");       // TODO: deprecated
        this.resultImageFinishedEvent = new CustomEvent("resultImageFinished");            // TODO: deprecated
        this.inputContainer = document.querySelector("#hough-input");
        switch (type) {
            case "line":
                this.analyser = new LineHoughAnalyser(this);
                break;
            case "circle":
                this.analyser = new CircleHoughAnalyser(this);
                break;
            case "ellipse":
                this.analyser = new EllipseHoughAnalyser(this);
                break;
            default:
                console.log("Unknown hough transformation type: " + type);
        }
    },
    setupImage: function (image) {
        this.createInMemoryCopies(image);

        this.numEdgePixels = 0;
        this.edgePixels = [];

        var imageDataLength = this.imageDataOriginal.data.length;
        var factor =  Math.floor(4 * this.imageDataOriginal.width);

        for(var i = 0; i < imageDataLength; i+=4){
            if(this.imageDataOriginal.data[i] > 0){
                var edgePixel = [];

                edgePixel.x = Math.round(i % factor) * 0.25;
                edgePixel.y = Math.round(i / factor);
                edgePixel.i = i;

                this.edgePixels.push(edgePixel);
            }
        }
        this.numEdgePixels = this.edgePixels.length;
    },
    createInMemoryCopies: function (source) {

        this.originalImage = new Image();
        this.canvasOriginal = document.createElement('canvas');
        this.contextOriginal = this.canvasOriginal.getContext('2d');

        this.originalImage.src = source.src;
        this.canvasOriginal.width = source.width;
        this.canvasOriginal.height = source.height;

        this.contextOriginal.drawImage(this.originalImage, 0, 0);
        this.imageDataOriginal = this.contextOriginal.getImageData(0, 0, this.originalImage.width, this.originalImage.height);

    },
    run: function () {
        this.analyser.generateHoughImages();
        this.analyser.generateFilteredHoughImage();
        this.analyser.generateResultImage(this.analyser.filteredHoughArray);
    },
    createSlider: function (container, labelText, id, stepSize, minValue, maxValue, value) {
        var li01 = document.createElement('li');
        var form01 = document.createElement('form');
        var label01 = document.createElement('label');
        var input01 = document.createElement('input');

        input01.id = id;
        input01.type = "range";
        input01.step = stepSize;
        input01.min = minValue;
        input01.max = maxValue;
        input01.value = value;


        label01.setAttribute("for", id);
        label01.innerHTML = labelText;

        form01.appendChild(label01);
        form01.appendChild(input01);
        li01.appendChild(form01);

        this.inputContainer.appendChild(li01);

        return li01;

    },
    updateStatus: function(message){
        var statusUpdate = new CustomEvent("status", {
            detail: {
                message: (message)
            }
        });
        document.dispatchEvent(statusUpdate);
    },
    houghImageFinished: function(){
        var event =  new CustomEvent("houghImageFinished");
        document.dispatchEvent(event);
    },
    filteredHoughImageFinished: function(){
        var event =  new CustomEvent("filteredHoughImageFinished");
        document.dispatchEvent(event);
    },
    resultImageFinished: function(){
        var event =  new CustomEvent("resultImageFinished");
        document.dispatchEvent(event);
    },
    clearInput: function () {
        var container = document.querySelector("#hough-input");
        while (container.hasChildNodes()) {
            container.removeChild(container.lastChild);
        }
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
        this.parent.clearInput();
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

        var originalData = this.parent.imageDataOriginal;
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
//        var resultImageData = context.calculateHoughImageData(canvas.width, canvas.height);
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
        this.parent.createSlider(container, "Threshold", "threshold-select", 1, 2, 256, 180);


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
    asynchronousCallsCounter: Number,
    overallMax: Number,
    filteredMax: Number,
    houghImageData: Array,
    threshold: Number,
    init: function (parent) {
        console.log("creating new CircleHoughAnalyser");

        this.parent = parent;
        this.minRadius = 5;
        this.maxRadius = (this.parent.originalImage.width < this.parent.originalImage.height) ? this.parent.originalImage.width : this.parent.originalImage.height;

        this.calculateStepSize = 1;
        this.asynchronousCallsCounter = 0;
        this.calculateRadiusIndex = 0;

        var stepSizeAngles = (2 * Math.PI) / 360;

        this.cosine = [];
        this.sinus = [];

        for (var i = 0, index = 0; i < (2 * Math.PI); i += stepSizeAngles, index++) {
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
        this.overallMax = Number.MIN_VALUE;

        this.parent.clearInput(); // TODO: später?
    },
    calculateHoughArray: function (startIndex) {
        var endIndex = startIndex + this.calculateStepSize;

        if (endIndex > this.maxRadius - this.minRadius) {
            endIndex = this.maxRadius - this.minRadius;
        }

        var maxAngle =  this.cosine.length;

        for(var radiusIndex = startIndex; radiusIndex < endIndex; radiusIndex++){
            if(!this.houghArray[radiusIndex]){
                this.houghArray[radiusIndex] = [];
            }
            for(var edgePixelIndex = 0; edgePixelIndex < this.parent.numEdgePixels; edgePixelIndex++){
                var edgePixel = this.parent.edgePixels[edgePixelIndex];

                for(var angleIndex = 0; angleIndex < maxAngle; angleIndex++){
                    var x = Math.floor(edgePixel.x + this.radiiCos[radiusIndex][angleIndex]);
                    var y = Math.floor(edgePixel.y + this.radiiSin[radiusIndex][angleIndex]);

                    if(x < 0 || y < 0 || x > this.parent.originalImage.width || y > this.parent.originalImage.height){
                        continue;
                    }

                    if(!this.houghArray[radiusIndex][x]){
                        this.houghArray[radiusIndex][x] = [];
                    }
                    if(!this.houghArray[radiusIndex][x][y]) {
                        this.houghArray[radiusIndex][x][y] = 0;
                    }

                    this.houghArray[radiusIndex][x][y] += 1;

                    if(this.overallMax < this.houghArray[radiusIndex][x][y]){
                        this.overallMax = this.houghArray[radiusIndex][x][y];
                    }
                }
            }
        }
        this.calculateRadiusIndex = endIndex;
    },
    generateHoughArray: function (calculateRequestNumber) {
        var _this = this;
        if (calculateRequestNumber != this.asynchronousCallsCounter) {
            this.houghArray = [];
            this.calculateRadiusIndex = 0;
            this.overallMax = Number.MIN_VALUE;
        }

        var percentageDone;
        if (this.calculateRadiusIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = Math.round((this.calculateRadiusIndex / (this.maxRadius - this.minRadius)) * 100);
        }

        this.parent.updateStatus("Calculating hough-array, " + percentageDone + "% done.");

        this.calculateHoughArray(this.calculateRadiusIndex);

        if (this.calculateRadiusIndex < this.maxRadius - this.minRadius) {
            setTimeout(function () {
                _this.generateHoughArray(calculateRequestNumber);
            }, 0);
        } else {
            this.parent.updateStatus("");
            this.houghImageData = [];
            this.calculateRadiusIndex = 0;

            this.asynchronousCallsCounter += 1;
            this.generateHoughImageData(this.asynchronousCallsCounter);
        }
    },
    generateHoughImages: function () {
        this.houghArray = [];
        this.asynchronousCallsCounter += 1;
        this.generateHoughArray(this.asynchronousCallsCounter);
    },
    calculateFilteredArray: function () {
        var startIndex = this.calculateRadiusIndex;
        var endIndex = this.calculateRadiusIndex + this.calculateStepSize;

        if (endIndex > this.maxRadius - this.minRadius) {
            endIndex = this.maxRadius - this.minRadius;
        }
        this.calculateRadiusIndex = endIndex;

        var maxIndexRadius = this.houghArray.length;
        var maxIndexX = this.parent.originalImage.width;
        var maxIndexY = this.parent.originalImage.height;

        for (var radiusIndex = startIndex; radiusIndex < endIndex; radiusIndex++) {
            if(!this.houghArray[radiusIndex]){
                continue;
            }
            for (var x = 0; x < maxIndexX; x++) {
                if(!this.houghArray[radiusIndex][x]){
                    continue;
                }
                for (var y = 0; y < maxIndexY; y++) {
                    if(!this.houghArray[radiusIndex][x][y]){
                        continue;
                    }

                    if(this.houghArray[radiusIndex][x][y] >= this.threshold){
                        var localMax = true;
                        for(var i = (radiusIndex - 3); i < (radiusIndex + 4) && localMax; i++){
                            if(i > 0 && i < maxIndexRadius){
                                if(! this.houghArray[i]){
                                    continue;
                                }
                                for(var j = (x - 3); j < (x + 4); j++){
                                    if(! this.houghArray[i][j]){
                                        continue;
                                    }
                                    if(j > 0 && j < maxIndexX){
                                        for(var k = (y - 3); k < (y + 4); k++){
                                            if(! this.houghArray[i][j][k]){
                                                continue;
                                            }
                                            if(k > 0 && k < maxIndexY){
                                                if(this.houghArray[radiusIndex][x][y] < this.houghArray[i][j][k]){
                                                    localMax = false;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if(localMax){
                            if(this.filteredMax <  this.houghArray[radiusIndex][x][y]){
                                this.filteredMax = this.houghArray[radiusIndex][x][y]
                            }

                            var filteredItem = [];

                            filteredItem.x = x;
                            filteredItem.y = y;
                            filteredItem.radiusIndex = radiusIndex;
                            filteredItem.accumulated = this.houghArray[radiusIndex][x][y]

                            this.houghArrayFiltered.push(filteredItem);

                        }
                    }
                }
            }
        }
    },
    applyThreshold: function (calculateRequestNumber) {
        var _this = this;

        if (calculateRequestNumber != this.asynchronousCallsCounter) {
            console.log("resetting calculation stats")
            this.houghArrayFiltered = [];
            this.filteredMax = Number.MIN_VALUE;
            return;
        }
        var percentageDone;
        if (this.calculateRadiusIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = Math.round((this.calculateRadiusIndex / (this.maxRadius - this.minRadius)) * 100);
        }

        this.parent.updateStatus("Calculating filtered hough-array, " + percentageDone + "% done.");

        this.calculateFilteredArray();

        if (this.calculateRadiusIndex < this.maxRadius - this.minRadius) {
            setTimeout(function () {
                _this.applyThreshold(calculateRequestNumber);
            }, 0);
        } else {
            this.parent.updateStatus("");
            this.generateFilteredHoughImageDataOuter();
        }
    },
    start_creatingFilteredHoughArray: function () {
        this.threshold = document.querySelector('#threshold-select').value;

        this.houghArrayFiltered = [];

        this.filteredMax = Number.MIN_VALUE;

        this.calculateRadiusIndex = 0;

        this.asynchronousCallsCounter += 1;
        this.applyThreshold(this.asynchronousCallsCounter);
    },
    generateHoughImageData: function(calculateRequestNumber){
        var _this = this;

        if (calculateRequestNumber != this.asynchronousCallsCounter) {
            console.log("resetting calculation stats")
            this.houghImageData = [];
            return;
        }
        var percentageDone;
        if (this.calculateRadiusIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = Math.round((this.calculateRadiusIndex / (this.maxRadius - this.minRadius)) * 100);
        }

        this.parent.updateStatus("Generating hough images: " + percentageDone + "% done.");

       this.calculateHoughImageData(this.houghArray, this.overallMax, this.calculateRadiusIndex);

        if (this.calculateRadiusIndex < this.maxRadius - this.minRadius) {
            setTimeout(function () {
                _this.generateHoughImageData(calculateRequestNumber);
            }, 0);
        } else {
            this.parent.updateStatus("");

            this.parent.houghImageData = [];
            this.parent.houghImageData[0] = this.houghImageData[0];

            this.parent.houghImageFinished();
            var radiusSelector = this.parent.createSlider(null, "Select radius: ", "hough-image-select", 1, 0, this.maxRadius - this.minRadius - 1, 0);
            var thresholdSelector = this.parent.createSlider(null, "Threshold: ", "threshold-select", 1,  10, this.overallMax, this.overallMax - 5);

            radiusSelector.oninput = this.selectHoughImage.bind(this);
            thresholdSelector.onchange = this.start_creatingFilteredHoughArray.bind(this);

            this.start_creatingFilteredHoughArray();
        }
    },
    calculateHoughImageData: function (array, maxValue, startIndex) {
        var endIndex = startIndex + this.calculateStepSize;

        if (endIndex > this.maxRadius - this.minRadius) {
            endIndex = this.maxRadius - this.minRadius;
        }

        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var factor = 255 / maxValue;

        for (var i = startIndex; i < endIndex; i++) {
            var imageData = context.createImageData(canvas.width, canvas.height);
            for (var resultY = 0, index = 0; resultY < canvas.height; resultY++) {

                for (var resultX = 0; resultX < canvas.width; resultX++, index += 4) {
                    if (!array[i] || !array[i][resultX] || !array[i][resultX][resultY]) {
                        imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = 0;
                    } else {
                        imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = array[i][resultX][resultY] * factor;
                    }
                    imageData.data[index + 3] = 255;
                }
            }
            this.houghImageData[i] = imageData;
        }
        this.calculateRadiusIndex = endIndex;
    },
    generateFilteredHoughImageDataOuter: function(){
        var canvas = document.createElement('canvas');

        canvas.width = this.parent.originalImage.width;
        canvas.height = this.parent.originalImage.height;

        var context  = canvas.getContext('2d');
        this.filteredHoughImageData = context.getImageData(0,0, canvas.width, canvas.height);
        this.calculatedFilteredHoughImageData();

        this.parent.filteredHoughImageData[0] = this.filteredHoughImageData;
        this.parent.filteredHoughImageFinished();

        this.parent.resultImage = this.createResultImage();
        this.parent.resultImageFinished();

    },
    calculatedFilteredHoughImageData: function(){

        var canvas = document.createElement("canvas");

        var factor = 255 / this.filteredMax;
        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var maxIndexX = canvas.width;
        var maxIndexY = canvas.height;

        for(var index = 0; index < this.filteredHoughImageData.data.length; index +=4){
            this.filteredHoughImageData.data[index] = this.filteredHoughImageData.data[index + 1] = this.filteredHoughImageData.data[index + 2] = 0;
            this.filteredHoughImageData.data[index + 3] = 255;

        }


        for(var filteredItemsIndex = 0; filteredItemsIndex < this.houghArrayFiltered.length; filteredItemsIndex++){
            var current = this.houghArrayFiltered[filteredItemsIndex];
            var index = ((current.y * canvas.width) + current.x) * 4;
            this.filteredHoughImageData.data[index] = this.filteredHoughImageData.data[index + 1] = this.filteredHoughImageData.data[index + 2] = current.accumulated * factor;
        }
    },
    createResultImage: function(){
        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        var factor = 255 / this.overallMax;


        for(var filteredItemIndex = 0; filteredItemIndex < this.houghArrayFiltered.length; filteredItemIndex++){
            var filteredItem = this.houghArrayFiltered[filteredItemIndex];

            for(var angleIndex = 0; angleIndex < this.cosine.length; angleIndex++){

                var xOriginal = Math.floor(filteredItem.x + this.radiiCos[filteredItem.radiusIndex][angleIndex]);
                var yOriginal = Math.floor(filteredItem.y + this.radiiSin[filteredItem.radiusIndex][angleIndex]);

                if(xOriginal < 0 || yOriginal < 0 || xOriginal > canvas.width || yOriginal > canvas.height){
                    continue;
                }

                var index = ((yOriginal * canvas.width) + xOriginal) * 4;
                imageData.data[index] = filteredItem.accumulated * factor;
                imageData.data[index + 1] = imageData.data[index + 2] = 0;
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
    }
}

EllipseHoughAnalyser.fn = EllipseHoughAnalyser.prototype = {
    parent: HoughAnalyser,
    aMin: Number,
    relativeVoteMin: Number,
    edgePixels: Array,
    numEdgePixels: Number,
    detectedEllipses: Array,
    init: function(parent){
        this.parent = parent;
        this.aMin = 10;
        this.relativeVoteMin = 0.45;
        this.numEdgePixels = 0;
        this.edgePixels = [];

        var imageDataLength = this.parent.imageDataOriginal.data.length;
        var factor =  Math.floor(4 * this.parent.imageDataOriginal.width);

        for(var i = 0; i < imageDataLength; i+=4){
            if(this.parent.imageDataOriginal.data[i] > 0){
                var edgePixel = [];

                edgePixel.x = Math.round(i % factor) * 0.25;
                edgePixel.y = Math.round(i / factor);
                edgePixel.i = i;

                this.edgePixels.push(edgePixel);
            }
        }
        this.numEdgePixels = this.edgePixels.length;

    },
    generateHoughImages: function(){
        this.detectedEllipses = [];
        this.findEllipses(0);

    },
    findEllipses: function(startIndex){
        var _this = this;

        var percentageDone;
        if (startIndex == 0) {
            percentageDone = 0;
        } else {
            percentageDone = Math.round((startIndex / (this.numEdgePixels)) * 100);
        }

        var myEvent = new CustomEvent("progress", {
            detail: {
                message: new String("Searching for ellipses, " + percentageDone + "% done.")
            }
        });

        document.dispatchEvent(myEvent);

        this.extractEllipseParameters(startIndex);


        if (startIndex <  this.numEdgePixels) {
            setTimeout(function () {
                _this.findEllipses(startIndex + 1);
            }, 0);
        } else {
            var myEvent = new CustomEvent("progress", {
                detail: {
                    message: ("Found ellipses: " + this.detectedEllipses.length)
                }
            });
            document.dispatchEvent(myEvent);

            console.log("Found ellipses: " + this.detectedEllipses.length);
            for(var i = 0; i < this.detectedEllipses.length; i++){
                var current = this.detectedEllipses[i];

                console.log("center: " + current.o.x + " " + current.o.y);
                console.log("w: " + current.t.x + " " + current.t.y + ", u: " + current.u.x + " " + current.u.y);
                console.log("alpha: " + current.alpha + ", beta: " + current.beta + ", theta: " + current.theta);
                console.log("accumulator: " + current.accumulator[current.beta[0]] + ", circumference: " + current.circumference[current.beta[0]]);
            }
        }

    },
    extractEllipseParameters: function(inputIndex){
        var t = this.edgePixels[inputIndex];
        for(var i = inputIndex + 1; i < this.numEdgePixels; i++){
            var u = this.edgePixels[i];
            var alpha = (Math.sqrt((Math.pow((u.x - t.x), 2) + Math.pow((u.y - t.y), 2))) * 0.5);
            var roundedAlpha =  Math.round(alpha);

            if(roundedAlpha <= this.aMin){
                //console.log("alpha zu klein: " + alpha + " " + this.aMin);
                continue;
            }

            var ox = (t.x + u.x) * 0.5;
            var oy = (t.y + u.y) * 0.5;


            var alphaSquare = alpha * alpha;
            var theta = Math.atan2((u.y - t.y), (u.x - t.x));

            //var theta = Math.atan((u.y - t.y) / (u.x - t.x));
            var thetaSin = Math.sin(theta);
            var thetaCos = Math.cos(theta);

            var accumulator = [];
            var circumferenceAssumed = [];



            for(var j = 0; j < this.numEdgePixels; j++){
                var k = this.edgePixels[j];
                var distanceToCenter = Math.round(Math.sqrt(Math.pow(ox - k.x, 2) + Math.pow(oy - k.y, 2)));
                if(distanceToCenter > roundedAlpha){
                    //console.log("abstand zum zentrum zu groß: " + distanceToCenter + " " + alpha);
                    continue;
                }
                var delta = Math.sqrt(Math.pow(k.y - oy, 2) + Math.pow(k.x - ox, 2));
                var gamma = (thetaSin * (k.y - oy)) + (thetaCos * (k.x - ox));

                var deltaSquare = Math.pow(delta, 2);
                var gammaSquare = Math.pow(gamma, 2);


                var beta = Math.sqrt(((alphaSquare * deltaSquare) - (alphaSquare * gammaSquare)) / (alphaSquare - gammaSquare));
                if(beta < this.aMin * 0.5){
                    continue;
                }

                var betaIndex = Math.floor(beta);

                if(!accumulator[betaIndex]){
                    accumulator[betaIndex] = 0;
                }
                //betaValues[beta].push(beta);
                accumulator[betaIndex] += 1;
                if(!circumferenceAssumed[betaIndex]){
                    var lambda = (alpha - beta) / (alpha + beta);
                    circumferenceAssumed[betaIndex] = Math.PI * (alpha + beta) * (1 + ((3 * Math.pow(lambda,2)) / (10 + Math.sqrt(4 - (3 * Math.pow(lambda, 2))))));
                }
            }
            var countNull = 0;
            var maxValue = Number.MIN_VALUE;
            var maxValueIndex = -1;
            var betaI = [];
            for(var j = 0; j < accumulator.length; j++){

                if(!accumulator[j]){
                    countNull++;
                    continue;
                }

                if(accumulator[j] > maxValue){
                    maxValue = accumulator[j];
                    maxValueIndex = j;
                }


                var validation = accumulator[j] - circumferenceAssumed[j] * this.relativeVoteMin;
                if (validation > 0){
                    betaI.push(j);
                }
            }

            if(betaI.length > 0){
                var ellipse = [];

                ellipse.o = [];
                ellipse.o.x = ox;
                ellipse.o.y = oy;
                ellipse.alpha = roundedAlpha;
                ellipse.theta = theta;
                ellipse.beta = betaI;
                ellipse.t = t;
                ellipse.u = u;
                ellipse.accumulator = accumulator;
                ellipse.circumference = circumferenceAssumed;

                this.detectedEllipses.push(ellipse);

            }
        }
    }
}


HoughAnalyser.fn.init.prototype = HoughAnalyser.prototype;
LineHoughAnalyser.fn.init.prototype = LineHoughAnalyser.prototype;
CircleHoughAnalyser.fn.init.prototype = CircleHoughAnalyser.prototype;
EllipseHoughAnalyser.fn.init.prototype = EllipseHoughAnalyser.prototype;