
var imageFolder = "img/";
var imageFiles = [{file: "lines.png"},
    {file:"noisy-lines.png"},
    {file:"circle01.png"},
    {file:"circle02.png"},
    {file:"circle03.png"},   // 4
    {file:"circle04.png"},
    {file:"circles01.png"},
    {file:"circles02.png"},
    {file:"circles03.png"},
    {file:"ellipse01.png"},
    {file:"ellipse02.png"},
    {file:"ellipses.png"},
    {file:"rectangle01.png"},
    {file:"rectangle02.png"},
    {file:"rectangles.png"},
    {file:"siegel.png"}];
var defaultIndex = 0;


function deleteImages(){
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

function loadImage(){
    deleteImages();

    var selectedImage;
    if(!this.value){
        selectedImage = imageFiles[defaultIndex].file;
    }  else {
        selectedImage = imageFiles[this.value].file;
    }

    var image = new Image();
    image.src = imageFolder + selectedImage;

    var imageContainer = document.querySelector('#original-image');

    while(imageContainer.hasChildNodes()){
        imageContainer.removeChild(imageContainer.lastChild);
    }
    imageContainer.appendChild(image);
}


function createImageDropdown(){

    for(var i=0; i< imageFiles.length; i++){
        var option = document.createElement('option');
        option.value = i;
        option.textContent = imageFiles[i].file; // oder images als { filename: image.jpg, name: image } ablegen und dann hier images[i].name – schöner in der UI;
        document.querySelector('#image-select').appendChild(option);
        document.querySelector('#image-select').addEventListener('change', loadImage);
    }
}




function init(){
    createImageDropdown();
    loadImage();
};


//document.querySelector('#threshold-select').onchange = function(event){
//    if(houghAnalyer){
//        houghAnalyer.generateFilteredHoughImage();
//    }
//}

var houghAnalyer;


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
    var statusDiv = document.querySelector('#status');
    statusDiv.textContent = e.detail.message;
})



init();