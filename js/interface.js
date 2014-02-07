var imageFolder = "img/";
var imageFiles = [{file: "lines.png"},
    {file:"noisy-lines.png"},
    {file:"siegel.png"},
    {file:"simple-square.png"},
    {file:"simple-square2.png"},
    {file:"squares.png"},
    {file:"simple-circle.png"},
    {file:"circles.png"}];
var defaultIndex = 6;


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


init();