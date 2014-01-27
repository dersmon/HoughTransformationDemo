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



    houghAnalyer.run();
}

document.addEventListener("houghImageFinished", function(e) {
    clearResults();

    var unfilteredHoughImage = document.querySelector('#accumulator-image')
    for(var i = 0; i < houghAnalyer.houghImageData.length; i++){


        var canvas = document.createElement('canvas');
        canvas.width = houghAnalyer.houghImageData[i].width;
        canvas.height = houghAnalyer.houghImageData[i].height;

        var context = canvas.getContext('2d');

        context.drawImage(houghAnalyer.originalImage, 0, 0);


        context.putImageData(houghAnalyer.houghImageData[i], 0, 0);

        var div = document.createElement('div');
        div.classList.add('imageContainer');
        div.classList.add('left');
        div.appendChild(canvas);
        unfilteredHoughImage.appendChild(div);
    }
    document.querySelector('#accumulator-image').appendChild(unfilteredHoughImage);
});

document.addEventListener("filteredHoughImageFinished", function(e){
    var container =  document.querySelector('#accumulator-image-filtered');
    while(container.hasChildNodes()){
        container.removeChild(container.lastChild);
    }

    var canvas = document.createElement('canvas');
    canvas.width = houghAnalyer.filteredHoughImageData.width;
    canvas.height = houghAnalyer.filteredHoughImageData.height;

    var context = canvas.getContext('2d');
    context.putImageData(houghAnalyer.filteredHoughImageData, 0, 0);

    container.appendChild(canvas);
});

document.addEventListener("resultImageFinished", function(e) {

    var container = document.querySelector('#original-image-lines').appendChild(houghAnalyer.resultImage);
    while(container.hasChildNodes()){
        container.removeChild(container.lastChild);
    }

    var canvas = document.createElement('canvas');
    canvas.width = houghAnalyer.filteredHoughImageData.width;
    canvas.height = houghAnalyer.filteredHoughImageData.height;

    var context = canvas.getContext('2d');
    context.putImageData(houghAnalyer.filteredHoughImageData, 0, 0);

    container.appendChild(canvas);
});

