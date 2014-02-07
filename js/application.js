var selectedThreshold;
var houghAnalyer;

//document.querySelector('#threshold-select').onchange = function(event){
//    if(houghAnalyer){
//        houghAnalyer.generateFilteredHoughImage();
//    }
//}


function runApplication(){
    deleteImages();

    var originalImage  = document.querySelector('#original-image').firstChild;
    var requestedType  = document.querySelector('#hough-select').selectedOptions[0].value;
    houghAnalyer = new HoughAnalyser(originalImage, requestedType);
    houghAnalyer.run();
}

document.addEventListener("houghImageFinished", function(e) {
    var temp =  document.querySelector('#accumulator-image');
    while(temp.hasChildNodes()){
        temp.removeChild(temp.lastChild);
    }

    var unfilteredHoughImage = document.querySelector('#accumulator-image')
    for(var i = 0; i < houghAnalyer.houghImageData.length; i++){
        var canvas = document.createElement('canvas');
        canvas.width = houghAnalyer.houghImageData[i].width;
        canvas.height = houghAnalyer.houghImageData[i].height;

        var context = canvas.getContext('2d');

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
    canvas.width = houghAnalyer.filteredHoughImageData[0].width;
    canvas.height = houghAnalyer.filteredHoughImageData[0].height;

    var context = canvas.getContext('2d');
    context.putImageData(houghAnalyer.filteredHoughImageData[0], 0, 0);

    container.appendChild(canvas);
});

document.addEventListener("resultImageFinished", function(e) {

    var container = document.querySelector('#original-image-lines');
    while(container.hasChildNodes()){
        container.removeChild(container.lastChild);
    }

    container.appendChild(houghAnalyer.resultImage);
});

document.addEventListener("status", function(e) {
    var container = document.querySelector('#status');
    container.textContent = e.detail.message;
})
