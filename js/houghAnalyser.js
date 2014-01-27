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
    imageDataOriginal: ImageData,
    accumulatorImage: HTMLCanvasElement,
    accumulatorImageFiltered: HTMLCanvasElement,
    selectedThreshold: Number,
    resultImage: HTMLCanvasElement,
    init: function (image, type) {
        this.setImage(image);
        this.houghFinishedEvent = new CustomEvent("houghImageFinished");
        this.finishedEvent = new CustomEvent("analyserFinished", this);

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
        this.createLocalCopies(image);
    },
    createLocalCopies: function (source) {

        this.originalImage = new Image();
        this.canvasOriginal = document.createElement('canvas');
        this.contextOriginal = this.canvasOriginal.getContext('2d');

        this.originalImage.src = source.src;
        this.canvasOriginal.width = source.width;
        this.canvasOriginal.height = source.height;

        this.contextOriginal.drawImage(this.originalImage, 0, 0);
        this.imageDataOriginal = this.contextOriginal.getImageData(0, 0, this.originalImage.width, this.originalImage.height);

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

    },
    run: function () {
        this.accumulatorImage = this.analyser.getAccumulatorImage();
        document.dispatchEvent(this.houghFinishedEvent);
        this.accumulatorImageFiltered = this.analyser.getAccumulatorImageFiltered();
        this.resultImage = this.analyser.getResultImage(this.analyser.accumulatorArrayFiltered);
        document.dispatchEvent(this.finishedEvent);
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
    accumulatorArray: Array(),
    accumulatorArrayFiltered: Array(),
    init: function (parent) {
        //console.log("creating new LineHoughAnalyser");
        this.parent = parent;
        this.setUpPrerequisites();
    },
    getAccumulatorImage: function () {
        if (this.accumulatorArray.length == 0) {
            this.createAccumulatedArray();
        }
        return this.createAccumulatedImage(this.accumulatorArray);
    },
    getAccumulatorImageFiltered: function () {
        if (this.accumulatorArray.length == 0) {
            this.createAccumulatedArray();
        }

        for (var i = 0; i < this.accumulatorArray.length; i++) {
            this.accumulatorArrayFiltered[i] = [];
            for (var j = 0; j < this.accumulatorArray[0].length; j++) {
                if (this.accumulatorArray[i][j] < this.parent.selectedThreshold) {
                    this.accumulatorArrayFiltered[i][j] = 0;
                }
                else {
                    this.accumulatorArrayFiltered[i][j] = this.accumulatorArray[i][j];
                }
            }
        }

        var tempArray = new Array();

        for(var i = 0; i < this.accumulatorArrayFiltered.length; i++){
            tempArray[i] = [];
            for(var j = 0; j < this.accumulatorArrayFiltered[0].length; j++){
                tempArray[i][j] =    this.accumulatorArrayFiltered[i][j];
            }
        }



        for(var i = 0; i < this.accumulatorArrayFiltered.length; i++){
            for(var j = 0; j < this.accumulatorArrayFiltered[0].length; j++){
                for(var k = i - 3; k < i + 3; k++){
                    if(k < 0 || k > this.accumulatorArrayFiltered.length - 1){
                        continue;
                    }
                    for(var l = j - 3; l < j + 3; l++){
                        if(l < 0 ||l > this.accumulatorArrayFiltered[0].length - 1){
                            continue;
                        }
                        if(this.accumulatorArrayFiltered[k][l] > this.accumulatorArrayFiltered[i][j]){
                            tempArray[i][j] = 0;
                        }
                    }
                }
            }
        }

        for(var i = 0; i < this.accumulatorArrayFiltered.length; i++){
            for(var j = 0; j < this.accumulatorArrayFiltered[0].length; j++){
                this.accumulatorArrayFiltered[i][j] = tempArray[i][j] ;
            }
        }


        return this.createAccumulatedImage(this.accumulatorArrayFiltered);
    },
    getResultImage: function (array) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.width = this.parent.originalImage.width;
        canvas.height = this.parent.originalImage.height;

        context.drawImage(this.parent.originalImage, 0, 0);
        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < array[0].length; j++) {
                if (array[i][j] > 0) {

                    var radiant = this.radians[i];
                    var radius = (j * this.knownRadiiRange / canvas.height) - (this.knownRadiiRange * 0.5);
                    this.drawLine(context, radius, -radiant, this.centerOriginal.x, this.centerOriginal.y);
                }
            }
        }
        return canvas;
    },
    createAccumulatedArray: function () {
        var overAllRadii = [];

        var originalData = this.parent.imageDataOriginal;
        var originalImage = this.parent.originalImage;

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

            var currentRadii = [];

            for (var a = 0; a < this.radians.length; a++) {
                currentRadii[a] = Math.floor((posX * this.cosine[a]) + (posY * this.sinus[a]));
            }
            overAllRadii.push(currentRadii);
        }

        var maxValueRadii = Number.MIN_VALUE;
        var minValueRadii = Number.MAX_VALUE;

        for (var i = 0; i < overAllRadii.length; i++) {
            for (var j = 0; j < overAllRadii[0].length; j++) {
                if (overAllRadii[i][j] < minValueRadii) {
                    minValueRadii = overAllRadii[i][j];
                }
                if (overAllRadii[i][j] > maxValueRadii) {
                    maxValueRadii = overAllRadii[i][j];
                }
            }
        }

        this.knownRadiiRange = Math.abs(minValueRadii) + Math.abs(maxValueRadii);
        var accumulatedMatrix = [];

        for (var i = 0; i < this.radians.length; i++) {
            accumulatedMatrix[i] = [];
            for (var j = 0; j < originalImage.height; j++) {
                accumulatedMatrix[i][j] = 0;
            }
        }

        var offset = this.knownRadiiRange * 0.5;
        var factorRangeToImage = originalImage.height / this.knownRadiiRange;


        for (var currentPoint = 0; currentPoint < overAllRadii.length; currentPoint++) {
            for (var currentRadiant = 0; currentRadiant < this.radians.length; currentRadiant++) {
                var currentValue = overAllRadii[currentPoint][currentRadiant];
                accumulatedMatrix[currentRadiant][Math.floor((currentValue + offset) * factorRangeToImage)] += 1;
            }
        }
        this.accumulatorArray = accumulatedMatrix;
    },
    createAccumulatedImage: function (array) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        var factorMaxAccumulatedToImage = this.parent.calculateMaxValueToIntensityFactor(array);

        canvas.height = array[0].length;
        canvas.width = array.length;

        var threshold = document.querySelector('#threshold-select').value;
        var resultImageData = context.createImageData(canvas.width, canvas.height);
        for (var y = 0, i = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++, i += 4) {
                var currentValue = Math.floor(array[x][y] * factorMaxAccumulatedToImage);
                resultImageData.data[i] = resultImageData.data[i + 1] = resultImageData.data[i + 2] = currentValue;
                resultImageData.data[i + 3] = 255;
            }
        }
        context.putImageData(resultImageData, 0, 0);

        return canvas;

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
        context.moveTo(centerX + x1, centerY + y1 - 1 );
        context.lineTo(centerX + x2, centerY + y2 - 1);
        context.stroke();

    },
    setUpPrerequisites: function () {

        this.radiansStep = Math.PI / this.parent.canvasOriginal.width;

        this.radians = [];
        this.sinus   = [];
        this.cosine  = [];

        this.accumulatorArray = [];
        this.accumulatorArrayFiltered = [];

        for (var currentRadian = 0, i = 0; currentRadian < Math.PI; currentRadian += this.radiansStep, i++) {
            this.radians[i] = currentRadian;
            this.sinus[i] = Math.sin(currentRadian);
            this.cosine[i] = Math.cos(currentRadian);
        }


        this.centerOriginal["x"] = Math.floor(this.parent.originalImage.width * 0.5);
        this.centerOriginal["y"] = Math.floor(this.parent.originalImage.height * 0.5);


        this.maxDistance = Math.sqrt((this.parent.originalImage.width * this.parent.originalImage.width) + (this.parent.originalImage.height * this.parent.originalImage.height)) * 0.5;
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
        this.searchDistanceMax = Math.round(0.5 * ((this.parent.canvasOriginal.width > this.parent.canvasOriginal.height) ? this.parent.canvasOriginal.width :  this.parent.canvasOriginal.height));
        this.searchDistanceMin = 20;

        this.houghWidth = Math.round((4 * this.parent.canvasOriginal.width) / 3);
        this.houghHeight = Math.round((4 * this.parent.canvasOriginal.height) / 3);

        this.stepsRadians = (3 * Math.PI) / (4 * this.searchDistanceMax);
        this.stepsRadius = 3/4;
        console.log(this.searchDistanceMax, this.searchDistanceMin);
    },
    getAccumulatorImage: function(){
        var minDistanceOffset = Math.round(this.searchDistanceMin * 0.5);
        var firstY = Math.round(this.searchDistanceMin * 0.5);

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.height = this.parent.canvasOriginal.height;
        canvas.width =  this.parent.canvasOriginal.width;

        var threshold = document.querySelector('#threshold-select').value;
        var resultImageData = context.createImageData(canvas.width, canvas.height);

        var count = 0;
        for (var y = 0, i = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++, i += 4) {
                if((x < minDistanceOffset || x > canvas.width - minDistanceOffset - 1) || (y < minDistanceOffset || y > canvas.height - minDistanceOffset - 1)){
                    //resultImageData.data[i] = 0;
                    continue;
                }

                if(count == 0){
                    var minX = x - Math.floor(this.searchDistanceMin * 0.5);
                    if(minX < 0){
                        minX = 0;
                    }
                    var minY = y - Math.floor(this.searchDistanceMin * 0.5);
                    if(minY < 0){
                        minY = 0;
                    }
                    var maxX = x + Math.floor(this.searchDistanceMin * 0.5);
                    if(maxX > canvas.width){
                        maxX = canvas.width;
                    }
                    var maxY = y + Math.floor(this.searchDistanceMin * 0.5);
                    if(maxY > canvas.height){
                        maxY = canvas.height;
                    }

                    console.log(minX, minY, maxX, maxY);

                    for (var innerY = 0, j = 0; innerY < canvas.height; innerY++) {
                        for (var innerX = 0; innerX < canvas.width; innerX++, j += 4) {
                            if((innerX > minX && innerX < maxX) && (innerY > minY && innerY < maxY)){
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
    analyseSubsection: function(center){
        var points = [];
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.height = this.searchDistanceMax;
        canvas.width =  this.searchDistanceMax;

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
    precalc: Array,
    init: function (parent) {
        console.log("creating new CircleHoughAnalyser");
        this.parent = parent;
        this.minRadius = 5;
        this.maxRadius = 200;
        this.precalculate();
        this.createAccumulatorArray();
    },
    precalculate: function(){
        var stepSize = (2 * Math.PI) / this.parent.canvasOriginal.width;

        this.cosine = [];
        this.sinus  = [];

        for(var i = 0, index = 0; i < (2*Math.PI); i += stepSize, index++){
            this.cosine[index] = Math.cos(i);
            this.sinus[index]  = Math.sin(i);
        }

        this.radiiSin = [];
        this.radiiCos = [];

        for(var i = 0; i < this.maxRadius - this.minRadius; i++){
            this.radiiSin[i] = [];
            this.radiiCos[i] = [];
            for(var j = 0; j < this.cosine.length; j++){
                this.radiiSin[i][j] = (i + this.minRadius) * this.sinus[j];
                this.radiiCos[i][j] = (i + this.minRadius) * this.cosine[j];
            }
        }
    }

    ,
    createAccumulatorArray: function(){
        var originalData = this.parent.imageDataOriginal;

        var canvas = document.createElement("canvas");

        canvas.width = this.parent.canvasOriginal.width;
        canvas.height = this.parent.canvasOriginal.height;

        var context = canvas.getContext('2d');
        context.drawImage(this.parent.originalImage, 0, 0);

        var array = [];

        for(var radius = 0; radius < this.maxRadius - this.minRadius; radius++){
            array[radius] = [];
            for(var x = 0; x < canvas.width; x++){
                array[radius][x] = [];
                for(var y = 0; y < canvas.height; y++){
                    array[radius][x][y] = 0;
                }
            }
        }

        //console.log(this.minRadius, this.maxRadius, canvas.width, canvas.height);


        for(var originalX = 0, index = 0; originalX < this.parent.originalImage.width; originalX++){
            for(var originalY = 0; originalY < this.parent.originalImage.height; originalY++, index+=4){
                if(originalData.data[index] < 128){
                    continue;
                }

                //console.log("center: ");
                //console.log(originalY, originalY);
                //console.log("points of radius " + (0 + this.minRadius));


                for(var i = 0; i < this.maxRadius - this.minRadius; i++){
                    for(var j = 0; j < this.cosine.length; j++){
                        var x = originalX + this.radiiCos[i][j];
                        var y = originalY + this.radiiSin[i][j];


                        if(x < 0 || y < 0 || x > canvas.width - 1 || y > canvas.height - 1){
                            continue;
                        }
                        //console.log(this.radiiCos[i][j]);
                        //console.log(x, y);
                        array[i][Math.floor(x)][Math.floor(y)] += 1;
                    }
                }
            }
        }

        var maxValues = [];
        var overallMax = Number.MIN_VALUE;

        for(var i = 0; i < array.length; i++){
            maxValues[i] = Number.MIN_VALUE;
            for(var j = 0; j < array[i].length; j++){
                for(var k = 0; k < array[i][j].length; k++){
                    maxValues[i] = (array[i][j][k] > maxValues[i]) ? array[i][j][k] : maxValues[i];
                    overallMax = (array[i][j][k] > overallMax) ? array[i][j][k] : overallMax;
                }
            }

            //console.log("local maxvalue: " + maxValues[i]);
        }

        //console.log(array.length, array[0].length, array[0][0].length)
        //console.log("max value: " + maxValue[i]);


        var imageDataArray = [];

        //for(var i = 0; i < this.maxRadius - this.minRadius; i++){
        for(var i = 0; i < array.length; i++){
            //var factor = 255 / maxValues[i];
            var factor = 255 / overallMax;

            var imageData = context.createImageData(canvas.width, canvas.height);

            for(var resultX = 0, index = 0; resultX < canvas.width; resultX++){
                for(var resultY = 0; resultY < canvas.height; resultY++, index += 4){
                        if(array[i][resultX][resultY] > 0){
                            imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = array[i][resultX][resultY] * factor;
                        } else {
                            imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = 0;
                        }
                        imageData.data[index + 3] = 255;
                }
            }
            imageDataArray[i] = imageData;
        }
        //console.log(imageDataArray);

        var houghDiv =  document.querySelector('#accumulator-image');

        while(houghDiv.hasChildNodes()){
            houghDiv.removeChild(houghDiv.lastChild);
        }


        for(var i = 0; i < imageDataArray.length; i++){
            //console.log(i)
            var resultCanvas = document.createElement("canvas");

            resultCanvas.width = this.parent.canvasOriginal.width;
            resultCanvas.height = this.parent.canvasOriginal.height;

            var resultContext = resultCanvas.getContext('2d');
            resultContext.drawImage(this.parent.originalImage, 0, 0);

            resultContext.putImageData(imageDataArray[i], 0, 0);

            houghDiv.appendChild(resultCanvas);
        }


        //console.log(canvas);
        //document.body.appendChild(canvas);

        // pro weißem Punkt
        // --> alle Radi+Mittelpunkte, die den Punkt kreuzen
        //

    }
}

HoughAnalyser.fn.init.prototype = HoughAnalyser.prototype;
LineHoughAnalyser.fn.init.prototype = LineHoughAnalyser.prototype;
RectangleHoughAnalyser.fn.init.prototype = RectangleHoughAnalyser.prototype;
CircleHoughAnalyser.fn.init.prototype = CircleHoughAnalyser.prototype;