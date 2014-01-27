var selectedImage = "lines";

var radians = [];
var sinus  = [];
var cosine = [];

var knownRadiiRange = 0;

function calculateMaxValueToIntensityFactor(array){
    var maxAccumulated = Number.MIN_VALUE;
    var minAccumulated = Number.MAX_VALUE;

    for(var i = 0; i  < array.length; i++){
        for(var j = 0; j < array[0].length; j++){
            if(array[i][j] < minAccumulated && array[i][j] != 0){
                minAccumulated = array[i][j] ;
            }
            if(array[i][j] > maxAccumulated && array[i][j] != 0){
                maxAccumulated = array[i][j];
            }
        }
    }
    return 255 / maxAccumulated;

}

function createAccumulatedArray(source){
    var radiansStep = Math.PI / source.width;
    radians = [];
    sinus  = [];
    cosine = [];


    for(var currentRadian = 0, i = 0; currentRadian < Math.PI; currentRadian += radiansStep, i++){
        radians[i] = currentRadian;
        sinus[i]   = Math.sin(currentRadian);
        cosine[i]  = Math.cos(currentRadian);
    }

    var image   = new Image();
    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('2d');

    image.src = source.src;
    canvas.width = image.width;
    canvas.height = image.height;

    context.drawImage(image, 0, 0);

    var posCenterX = Math.floor(source.width * 0.5);
    var posCenterY = Math.floor(source.height * 0.5);

    var imageData = context.getImageData(0, 0, source.width, source.height);
    var maxDistance = Math.sqrt((image.width * image.width) + (image.height * image.height)) * 0.5;
    var overAllRadii = [];

    for(var i = 0, j = 0, posX = -posCenterX, posY = posCenterY;
        i < imageData.data.length;
        i+=4, j++, posX++){

        if(i % (4 * source.width) == 0 && i != 0){
            posY--;
            posX = -posCenterX;
        }

        if(imageData.data[i] == 0 && imageData.data[i+1] == 0 && imageData.data[i+2] == 0){
            continue;
        }

        var currentRadii = [];

        for(var a = 0; a < radians.length; a++){
            currentRadii[a] = Math.floor((posX * cosine[a]) + (posY * sinus[a])) ;
        }
        overAllRadii.push(currentRadii);
    }

    var maxValueRadii = Number.MIN_VALUE;
    var minValueRadii = Number.MAX_VALUE;

    for(var i = 0; i < overAllRadii.length; i++){
        for(var j = 0; j < overAllRadii[0].length; j++){
            if(overAllRadii[i][j] < minValueRadii){
                minValueRadii = overAllRadii[i][j] ;
            }
            if(overAllRadii[i][j] > maxValueRadii){
                maxValueRadii = overAllRadii[i][j];
            }
        }
    }

    knownRadiiRange = Math.abs(minValueRadii) + Math.abs(maxValueRadii);
    var accumulatedMatrix = [];

    for(var i = 0; i < radians.length; i++){
        accumulatedMatrix[i] = [];
        for(var j = 0; j < source.height; j++){
            accumulatedMatrix[i][j] = 0;
        }
    }

    var offset = knownRadiiRange * 0.5;
    var factorRangeToImage = source.height / knownRadiiRange;


    for(var currentPoint = 0; currentPoint < overAllRadii.length; currentPoint++){
        for(var currentRadiant = 0; currentRadiant < radians.length; currentRadiant++){
            var currentValue = overAllRadii[currentPoint][currentRadiant];
            accumulatedMatrix[currentRadiant][Math.floor((currentValue + offset) * factorRangeToImage)] += 1;
        }
    }
    return accumulatedMatrix;
}

function drawAccumulatorArray(array, target){
    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('2d');

    var factorMaxAccumulatedToImage = calculateMaxValueToIntensityFactor(array);

    canvas.height =  array[0].length;
    canvas.width  =  array.length;

    var threshold = document.querySelector('#threshold-select').value;
    var resultImageData = context.createImageData(canvas.width, canvas.height);
    for(var y = 0, i = 0; y < canvas.height; y++){
        for(var x = 0; x < canvas.width; x++, i+=4){
            var currentValue =  Math.floor(array[x][y] * factorMaxAccumulatedToImage);
            resultImageData.data[i] = resultImageData.data[i+1] = resultImageData.data[i+2] = currentValue;
            resultImageData.data[i+3] = 255;
        }
    }
    context.putImageData(resultImageData, 0, 0);

    while(target.hasChildNodes()){
        target.removeChild(target.lastChild);
    }
    target.appendChild(canvas);

}



function drawLine(context, radius, radiant, centerX, centerY){
    var y1, y2, x1, x2;

    if(radiant > Math.PI/4 && radiant < Math.PI*2/3){
        x1 = -centerX ;
        y1 = (radius - x1 * Math.cos(radiant)) / Math.sin(radiant);

        x2 = centerX;
        y2 = (radius - x2 * Math.cos(radiant)) /  Math.sin(radiant);
    } else {
        y1 = -centerY;
        x1 = (radius - y1 *  Math.sin(radiant)) / Math.cos(radiant);

        y2 = centerY;
        x2 = (radius - y2 *  Math.sin(radiant)) / Math.cos(radiant);
    }

    context.strokeStyle = "#FF0000";
    context.beginPath();
    context.moveTo(centerX + x1, centerY + y1);
    context.lineTo(centerX + x2, centerY + y2);
    context.stroke();

}

function drawLines(array, source, target){

    while(target.hasChildNodes()){
        target.removeChild(target.lastChild);
    }

    var centerX = Math.round(source.width * 0.5);
    var centerY = Math.round(source.height * 0.5);

    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width  = source.width;
    canvas.height = source.height;

    context.drawImage(source, 0, 0);
    for(var i = 0; i < array.length; i++){
        for(var j = 0; j < array[0].length; j++){
            if(array[i][j] > 0){

                var radiant = radians[i];
                var radius  = (j * knownRadiiRange / source.height) - (knownRadiiRange * 0.5);
                drawLine(context, radius, -radiant, centerX, centerY);
            }
        }
    }

    target.appendChild(canvas);

}

function applyThreshold(array){
    for(var i = 0; i < array.length; i++){
        for(var j = 0; j < array[0].length; j++){
            if(array[i][j] < selectedThreshold){
                array[i][j] = 0;
            }
        }
    }
    return array;
}

function extractLocalMaxima(array){
    for(var i = 0; i < array.length; i++){
        for(var j = 0; j < array[0].length; j++){
            for(var k = i - 3; k < i + 3; k++){
                if(k < 0 || k > array.length - 1){
                    continue;
                }
                for(var l = j - 3; l < j + 3; l++){
                    if(l < 0 ||l > array[0].length - 1){
                        continue;
                    }
                    if(array[k][l] > array[i][j]){
                        array[i][j] = 0;
                    }
                }
            }
        }
    }
    return array;
}


function runApplication(){
    var originalImage  = document.querySelector('#original-image').firstChild;
    var accumulatorDiv = document.querySelector('#accumulator-image');
    var accumulatedArray         = createAccumulatedArray(originalImage);
    drawAccumulatorArray(accumulatedArray, accumulatorDiv);

    var accumulatorDivThreshold = document.querySelector('#accumulator-image-filtered');
    var accumulatedArrayFiltered = extractLocalMaxima(applyThreshold(accumulatedArray));
    drawAccumulatorArray(accumulatedArrayFiltered, accumulatorDivThreshold);
    var originalImageWithLines  = document.querySelector('#original-image-lines');
    drawLines(accumulatedArrayFiltered, originalImage, originalImageWithLines);
}