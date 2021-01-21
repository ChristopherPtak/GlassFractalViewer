
// TODO: Parallelize this program
// TODO: Add more fractals


/**************/
/* Page Setup */
/**************/

// HTML elements needed for interaction
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

// Values concerning canvas and window size
var offsetX;
var offsetY;
var scaleMult;

function updateWindowSize()
{
    // Update canvas and window size info
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    scaleMult = Math.min(offsetX, offsetY);
}

updateWindowSize();

// Session-specific values
var valueFunction;
var colorFunction;
var viewX;
var viewY;
var viewScale;

// Functions for setting these values

function setValueFunction(newValueFunction)
{
    valueFunction = newValueFunction;

    // Trigger a redraw with the new function
    drawScreen();
}

function setColorFunction(newColorFunction)
{
    colorFunction = newColorFunction;

    // Trigger a redraw with the new function
    drawScreen();
}


/***********************/
/* Rendering functions */
/***********************/

// Create a queue for rendering jobs.
// This centralizes the list of tasks to be done, and allows all current
// tasks to be cancelled if a new screen is being rendered.
var RenderQueue = {

    jobs: [],

    // Cancel all currently waiting jobs
    clearJobs: function () {
        this.jobs.length = 0;
    },

    // Add a new job
    addJob: function (job) {

        // Put the job on the queue
        RenderQueue.jobs.push(job);

        // The job-running callback loop
        function runNextJob() {
            if (RenderQueue.jobs.length !== 0) {
                RenderQueue.jobs.shift()();
                window.setTimeout(runNextJob);
            }
        }

        // If this new job is the first one that has not run,
        // start the callback loop
        if (RenderQueue.jobs.length === 1) {
            window.setTimeout(runNextJob);
        }

    }

};


// Get the real coordinate from the pixel value
function pixelToRealPart(pixelX)
{
    return ((pixelX - offsetX) / (scaleMult * viewScale)) + viewX;
}

// Get the imaginary coordinate from the pixel value
function pixelToImagPart(pixelY)
{
    return ((pixelY - offsetY) / (scaleMult * viewScale)) + viewY;
}

// Draw a single block of pixels at the given location
function drawBlock(pixelX, pixelY, size)
{
    // Block of image data
    var imageData = context.createImageData(size, size);
    var data = imageData.data;

    // Count index of current pixel in array
    var i = 0;

    for (var y = pixelY; y < pixelY + size; y++) {
        for (var x = pixelX; x < pixelX + size; x++) {

            // Calculate value
            var realPart = pixelToRealPart(x);
            var imagPart = pixelToImagPart(y);
            var value = valueFunction(realPart, imagPart);

            // Calculate color
            var colorValue = colorFunction(value);

            // Assign color value to pixels
            data[i + 0] = colorValue[0];
            data[i + 1] = colorValue[1];
            data[i + 2] = colorValue[2];
            data[i + 3] = 255;
            i += 4;

        }
    }

    // Copy image data to the correct location
    context.putImageData(imageData, pixelX, pixelY);
}

// Draw all blocks on the screen
function drawScreen()
{
    // TODO: Parallelize this function

    // The width and height of a rendering block (in pixels)
    var blockSize = 100;

    // Create a list of all blocks to be rendered
    var blocks = [];
    for (var x = 0; x < canvas.width; x += blockSize) {
        for (var y = 0; y < canvas.height; y += blockSize) {

            // Calculate the distance of this block from
            // the center of the screen; this is not actually
            // the distance but the order is the same
            var distanceFromCenter = Math.pow(x - offsetX, 2)
                                   + Math.pow(y - offsetY, 2);

            // Add an array representing this block
            blocks.push([x, y, distanceFromCenter]);

        }
    }

    // Sort the blocks based on the distance from the center
    blocks.sort(function (firstBlock, secondBlock) {
        if (firstBlock[2] > secondBlock[2]) return 1;
        if (firstBlock[2] < secondBlock[2]) return -1;
        return 0;
    });

    // Clear the current jobs
    RenderQueue.clearJobs();

    // Add jobs for all new blocks
    blocks.forEach(function (block) {
        RenderQueue.addJob(function () {
            drawBlock(block[0], block[1], blockSize);
        });
    });
}


/**********************/
/* Fractal Evaluation */
/**********************/

// Evaluate a pixel of the traditional Mandelbrot fractal
function mandelbrotValueFunction(realPart, imagPart)
{
    // Detail parameters
    var maxIterations = 100;
    var escapeLimit = 4;

    // Initially, Z = 0 + 0i
    zRealPart = 0;
    zImagPart = 0;

    for (var i = 0; i < maxIterations; i++) {

        var tempRealPart = zRealPart;
        var tempImagPart = zImagPart;

        // Square Z
        zRealPart = Math.pow(tempRealPart, 2) - Math.pow(tempImagPart, 2);
        zImagPart = 2 * tempRealPart * tempImagPart;

        // Add C
        zRealPart += realPart;
        zImagPart += imagPart;

        if (Math.pow(zRealPart, 2) + Math.pow(zImagPart, 2) > escapeLimit) {

            // If the point is outside the escape limit, we consider it
            // not in the Mandelbrot set

            // Calculate the absolute value of the escaped point
            var zAbs = Math.sqrt(Math.pow(zRealPart, 2) +
                                 Math.pow(zImagPart, 2));

            // Calculate the smooth value
            var value = i;
            value -= Math.log(Math.log(zAbs) / Math.log(2));
            value /= maxIterations;

            return value;

        }

    }

    // In this case, the point is in the Mandelbrot set
    // Set the color to black
    return 0;
}


/**************************/
/* Colorization Functions */
/**************************/

// Simple intensity to greyscale value
function valueToGreyscale(value)
{
    return [value * 255, value * 255, value * 255];
}

// Make a fake blackbody-like color spectrum
function valueToSpectrum(value)
{
    var r = 0;
    var g = 0;
    var b = 0;

    if (value < 0.5) {
        // Exponential expression (half)
        // Makes the red area larger
        r = 1.2872169 * (1 - Math.exp(-3 * value));
    } else {
        // Normal distribution (half)
        r = Math.exp(-Math.pow(3 * (value - 0.5), 2));
    }

    // Normal distrubutions
    g = 0.75 * Math.exp(-Math.pow(5 * (value - 0.666), 2));
    b = Math.exp(-Math.pow(8 * (value - 0.8), 2));

    return [255 * r, 255 * g, 255 * b];
}


/******************/
/* User Interface */
/******************/

// Default initial settings
valueFunction = mandelbrotValueFunction;
colorFunction = valueToSpectrum;
viewX = -0.5;
viewY = 0;
viewScale = 0.5;

// When the screen is clicked:
canvas.onclick = function(mouseEvent)
{
    var borderSize = 100;

    // Check if mouse is near the edge
    if (mouseEvent.pageX < borderSize
        || mouseEvent.pageY < borderSize
        || mouseEvent.pageX > window.innerWidth - borderSize
        || mouseEvent.pageY > window.innerHeight - borderSize) {

        // Zoom out
        viewScale /= 2;

        // Reset the view if we try to zoom out too far
        if (viewScale < 0.5) {
            viewX = -0.5;
            viewY = 0;
            viewScale = 0.5;
        }

    } else {
        // Zoom in to a point
        viewX = pixelToRealPart(mouseEvent.pageX);
        viewY = pixelToImagPart(mouseEvent.pageY);
        viewScale *= 2;
    }

    // Redraw the screen with the new coordinates
    drawScreen();
};

// When the window size is changed:
window.onresize = function()
{
    // Register the new window size
    updateWindowSize();

    // Redraw the screen
    drawScreen();
}


// In case we are using a colorscheme where 0 is not black,
// find the default color and fill the canvas before rendering
var defaultColor = colorFunction(0);
context.fillStyle = "rgb(" + defaultColor[0] + ","
                           + defaultColor[1] + ","
                           + defaultColor[2] + ")";
context.fillRect(0, 0, canvas.width, canvas.height);

// Draw the initial fractal view
drawScreen();

