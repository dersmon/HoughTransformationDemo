var selectedThreshold;
var houghAnalyer;

document.querySelector('#threshold-select').onchange = function(event){
    if(houghAnalyer){
        houghAnalyer.selectedThreshold = document.querySelector('#threshold-select').value;
        houghAnalyer.run();
    }
}

function clearResults(){
    var temp =  document.querySelector('#accumulator-image');
    while(temp.hasChildNodes()){
        temp.removeChild(temp.lastChild);
    }
    var temp =  document.querySelector('#accumulator-image-filtered');
    while(temp.hasChildNodes()){
        temp.removeChild(temp.lastChild);
    }
    var temp =  document.querySelector('#original-image-lines');
    while(temp.hasChildNodes()){
        temp.removeChild(temp.lastChild);
    }
}

function runApplication(){
    var originalImage  = document.querySelector('#original-image').firstChild;
    var requestedType  = document.querySelector('#hough-select').selectedOptions[0].value;

    selectedThreshold = document.querySelector('#threshold-select').value;
    houghAnalyer = new HoughAnalyser(originalImage, requestedType);
    houghAnalyer.selectedThreshold = document.querySelector('#threshold-select').value;

    document.addEventListener("houghImageFinished", function(e) {
        clearResults();
        document.querySelector('#accumulator-image').appendChild(houghAnalyer.accumulatorImage);
    });

    document.addEventListener("analyserFinished", function(e) {
        clearResults();
        document.querySelector('#accumulator-image').appendChild(houghAnalyer.accumulatorImage);
        document.querySelector('#accumulator-image-filtered').appendChild(houghAnalyer.accumulatorImageFiltered);
        document.querySelector('#original-image-lines').appendChild(houghAnalyer.resultImage);
    });

    houghAnalyer.run();
}

