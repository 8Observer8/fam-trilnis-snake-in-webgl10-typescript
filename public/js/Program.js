define(["require", "exports", "gl-matrix"], function (require, exports, gl_matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var gl = null;
    var g_uMvpMatrixLocation = null;
    var g_uColorLocation = null;
    var g_projMatrix = null;
    var g_viewMatrix = null;
    var g_modelMatrix = null;
    var g_vmMatrix = null;
    var g_mvpMatrix = null;
    var g_N = 20;
    var g_M = 20;
    var g_SCALE = 25;
    var g_GAME_FIELD_WIDTH = g_SCALE * g_N;
    var g_GAME_FIELD_HEIGHT = g_SCALE * g_M;
    var g_snakeLength = 3;
    var g_snake = Array(100);
    var Dir;
    (function (Dir) {
        Dir[Dir["Up"] = 0] = "Up";
        Dir[Dir["Left"] = 1] = "Left";
        Dir[Dir["Down"] = 2] = "Down";
        Dir[Dir["Right"] = 3] = "Right";
    })(Dir || (Dir = {}));
    ;
    var g_currentDir = Dir.Up;
    var getRandomInt = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var Fruit = /** @class */ (function () {
        function Fruit() {
            this.x = 0;
            this.y = 0;
        }
        Fruit.prototype.CreateNew = function () {
            this.x = getRandomInt(0, g_N - 1);
            this.y = getRandomInt(0, g_M - 1);
        };
        Fruit.prototype.Draw = function () {
            drawSquare(gl_matrix_1.vec3.fromValues(this.x * g_SCALE, this.y * g_SCALE, 0), gl_matrix_1.vec3.fromValues(1, 0, 0), g_SCALE);
        };
        return Fruit;
    }());
    var g_fruits = new Array();
    var vertexShaderSource = "\n    attribute vec3 aPosition;\n    uniform mat4 uMvpMatrix;\n\n    void main()\n    {\n        gl_Position = uMvpMatrix * vec4(aPosition, 1.0);\n    }\n";
    var fragmentShaderSource = "\n    precision mediump float;\n\n    uniform vec3 uColor;\n\n    void main()\n    {\n        gl_FragColor = vec4(uColor, 1.0);\n    }\n";
    var getWebGLContext = function (canvasName) {
        var canvas = document.getElementById(canvasName);
        if (canvas === null) {
            console.log("Failed to get the canvas element with the name \"" + canvasName + "\"");
            return null;
        }
        var gl = canvas.getContext("webgl");
        if (gl === null) {
            console.log("Our browser does not support WebGL");
            return null;
        }
        return gl;
    };
    var createShader = function (shaderSource, shaderType) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        var ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!ok) {
            console.log(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    };
    var createShaderProgram = function () {
        var program = gl.createProgram();
        var vShader = createShader(vertexShaderSource, gl.VERTEX_SHADER);
        var fShader = createShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);
        var ok = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!ok) {
            console.log("Failed to link a shader program");
            return null;
        }
        gl.useProgram(program);
        return program;
    };
    var initVertexBuffers = function (program) {
        var vertices = new Float32Array([
            0, 1, 0,
            0, 0, 0,
            1, 1, 0,
            1, 0, 0,
            -0.5, 0, 0,
            0.5, 0, 0
        ]);
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        var aPositionLocation = gl.getAttribLocation(program, "aPosition");
        if (aPositionLocation === -1) {
            console.log("Failed to get the aPositionLocation variable");
            return false;
        }
        gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPositionLocation);
        return true;
    };
    var getUniformLocation = function (program, name) {
        var location = gl.getUniformLocation(program, name);
        if (location === null) {
            console.log("Failed to get a location variable with the name: \"" + name + "\"");
            return null;
        }
        return location;
    };
    var setUniforms = function (position, color, scale, radians) {
        gl_matrix_1.mat4.identity(g_modelMatrix);
        gl_matrix_1.mat4.translate(g_modelMatrix, g_modelMatrix, position);
        gl_matrix_1.mat4.rotateZ(g_modelMatrix, g_modelMatrix, radians);
        gl_matrix_1.mat4.scale(g_modelMatrix, g_modelMatrix, scale);
        gl_matrix_1.mat4.mul(g_vmMatrix, g_viewMatrix, g_modelMatrix);
        gl_matrix_1.mat4.mul(g_mvpMatrix, g_projMatrix, g_vmMatrix);
        gl.uniformMatrix4fv(g_uMvpMatrixLocation, false, g_mvpMatrix);
        gl.uniform3fv(g_uColorLocation, color);
    };
    var drawLine = function (p1, p2, color) {
        var centerX = p1[0] + (p2[0] - p1[0]) / 2.0;
        var centerY = p1[1] + (p2[1] - p1[1]) / 2.0;
        var a = p2[1] - p1[1];
        var b = p2[0] - p1[0];
        var tan = a / b;
        var angle = Math.atan(tan);
        var length = gl_matrix_1.vec2.length(gl_matrix_1.vec2.fromValues(b, a));
        setUniforms(gl_matrix_1.vec3.fromValues(centerX, centerY, 0), color, gl_matrix_1.vec3.fromValues(length, 1, 1), angle);
        gl.drawArrays(gl.LINES, 4, 2);
    };
    var drawSquare = function (position, color, size, degrees) {
        if (size === void 0) { size = 1; }
        if (degrees === void 0) { degrees = 0; }
        setUniforms(position, color, gl_matrix_1.vec3.fromValues(size, size, size), degrees * Math.PI / 180.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    var drawField = function () {
        for (var i = 0; i < g_GAME_FIELD_WIDTH; i += g_SCALE) {
            drawLine(gl_matrix_1.vec3.fromValues(i, 0, 0), gl_matrix_1.vec3.fromValues(i, g_GAME_FIELD_HEIGHT, 0), gl_matrix_1.vec3.fromValues(0, 1, 0));
        }
        for (var i = 0; i < g_GAME_FIELD_HEIGHT; i += g_SCALE) {
            drawLine(gl_matrix_1.vec3.fromValues(0, i, 0), gl_matrix_1.vec3.fromValues(g_GAME_FIELD_WIDTH, i, 0), gl_matrix_1.vec3.fromValues(0, 1, 0));
        }
    };
    var drawSnake = function () {
        for (var i = 0; i < g_snakeLength; i++) {
            drawSquare(gl_matrix_1.vec3.fromValues(g_snake[i].x * g_SCALE, g_snake[i].y * g_SCALE, 0), gl_matrix_1.vec3.fromValues(0, 0, 1), g_SCALE, 0);
        }
    };
    var display = function () {
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (var i = 0; i < g_fruits.length; i++) {
            g_fruits[i].Draw();
        }
        drawField();
        drawSnake();
    };
    var tick = function () {
        for (var i = g_snakeLength; i > 0; i--) {
            g_snake[i].x = g_snake[i - 1].x;
            g_snake[i].y = g_snake[i - 1].y;
        }
        if (g_currentDir === Dir.Up) {
            g_snake[0].y += 1;
        }
        if (g_currentDir === Dir.Left) {
            g_snake[0].x -= 1;
        }
        if (g_currentDir === Dir.Down) {
            g_snake[0].y -= 1;
        }
        if (g_currentDir === Dir.Right) {
            g_snake[0].x += 1;
        }
        for (var i = 0; i < g_fruits.length; i++) {
            if ((g_snake[0].x === g_fruits[i].x) && (g_snake[0].y === g_fruits[i].y)) {
                g_snakeLength++;
                g_fruits[i].CreateNew();
            }
        }
        if (g_snake[0].y > g_M) {
            g_currentDir = Dir.Down;
        }
        else if (g_snake[0].x < 0) {
            g_currentDir = Dir.Right;
        }
        else if (g_snake[0].y < 0) {
            g_currentDir = Dir.Up;
        }
        else if (g_snake[0].x > g_N) {
            g_currentDir = Dir.Left;
        }
        for (var i = 1; i < g_snakeLength; i++) {
            if (g_snake[0].x === g_snake[i].x && g_snake[0].y === g_snake[i].y) {
                g_snakeLength = i;
            }
        }
    };
    var timer = function () {
        tick();
        display();
    };
    var keyDownHandler = function (ev) {
        if (ev.key === "Up" || ev.key === "ArrowUp" || ev.key === "w") {
            g_currentDir = Dir.Up;
        }
        else if (ev.key === "Left" || ev.key === "ArrowLeft" || ev.key === "a") {
            g_currentDir = Dir.Left;
        }
        else if (ev.key === "Down" || ev.key === "ArrowDown" || ev.key === "s") {
            g_currentDir = Dir.Down;
        }
        else if (ev.key === "Right" || ev.key === "ArrowRight" || ev.key === "d") {
            g_currentDir = Dir.Right;
        }
    };
    var main = function () {
        // Get a WebGL context
        gl = getWebGLContext("renderCanvas");
        if (gl === null)
            return;
        // Get a shader program
        var program = createShaderProgram();
        if (!program)
            return;
        // Initialize vertex buffers
        if (!initVertexBuffers(program))
            return;
        // Get uniforms
        g_uMvpMatrixLocation = getUniformLocation(program, "uMvpMatrix");
        g_uColorLocation = getUniformLocation(program, "uColor");
        if (g_uMvpMatrixLocation === null || g_uColorLocation === null)
            return;
        // Create matrices
        g_modelMatrix = gl_matrix_1.mat4.create();
        g_viewMatrix = gl_matrix_1.mat4.lookAt(gl_matrix_1.mat4.create(), gl_matrix_1.vec3.fromValues(0, 0, 1), gl_matrix_1.vec3.fromValues(0, 0, 0), gl_matrix_1.vec3.fromValues(0, 1, 0));
        g_projMatrix = gl_matrix_1.mat4.ortho(gl_matrix_1.mat4.create(), 0, g_GAME_FIELD_WIDTH, 0, g_GAME_FIELD_HEIGHT, 10, -10);
        g_vmMatrix = gl_matrix_1.mat4.create();
        g_mvpMatrix = gl_matrix_1.mat4.create();
        for (var i = 0; i < g_snake.length; i++) {
            g_snake[i] = { x: 0, y: 0 };
        }
        g_snake[0] = { x: 1, y: 3 };
        g_snake[1] = { x: 1, y: 2 };
        g_snake[2] = { x: 1, y: 1 };
        for (var i = 0; i < 10; i++) {
            g_fruits.push(new Fruit());
            g_fruits[i].CreateNew();
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        document.addEventListener("keydown", function (ev) { keyDownHandler(ev); }, false);
        display();
        setInterval(function () { timer(); }, 300);
    };
    // Debug version
    main();
});
// Release version
// window.onload = () => { main(); };
//# sourceMappingURL=Program.js.map