
import { vec3, vec2, mat4 } from "gl-matrix";

let gl: WebGLRenderingContext = null;
let g_uMvpMatrixLocation: WebGLUniformLocation = null;
let g_uColorLocation: WebGLUniformLocation = null;
let g_projMatrix: mat4 = null;
let g_viewMatrix: mat4 = null;
let g_modelMatrix: mat4 = null;
let g_vmMatrix: mat4 = null;
let g_mvpMatrix: mat4 = null;

const g_N = 20;
const g_M = 20;
const g_SCALE = 25;
const g_GAME_FIELD_WIDTH = g_SCALE * g_N;
const g_GAME_FIELD_HEIGHT = g_SCALE * g_M;

let g_snakeLength = 3;
let g_snake = Array<{ x: number, y: number }>(100);

enum Dir
{
    Up, Left, Down, Right
};
let g_currentDir = Dir.Up;

let getRandomInt = (min: number, max: number) =>
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Fruit
{
    public x = 0;
    public y = 0;

    public CreateNew(): void
    {
        this.x = getRandomInt(0, g_N - 1);
        this.y = getRandomInt(0, g_M - 1);
    }

    public Draw(): void
    {
        drawSquare(vec3.fromValues(this.x * g_SCALE, this.y * g_SCALE, 0), vec3.fromValues(1, 0, 0), g_SCALE);
    }
}
let g_fruits = new Array<Fruit>();

let vertexShaderSource =
    `
    attribute vec3 aPosition;
    uniform mat4 uMvpMatrix;

    void main()
    {
        gl_Position = uMvpMatrix * vec4(aPosition, 1.0);
    }
`;

let fragmentShaderSource =
    `
    precision mediump float;

    uniform vec3 uColor;

    void main()
    {
        gl_FragColor = vec4(uColor, 1.0);
    }
`;

let getWebGLContext = (canvasName: string): WebGLRenderingContext =>
{
    let canvas = document.getElementById(canvasName) as HTMLCanvasElement;
    if (canvas === null)
    {
        console.log(`Failed to get the canvas element with the name "${canvasName}"`);
        return null;
    }

    let gl = canvas.getContext("webgl");
    if (gl === null)
    {
        console.log("Our browser does not support WebGL");
        return null;
    }
    return gl;
};

let createShader = (shaderSource: string, shaderType: number): WebGLShader =>
{
    let shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    let ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean;
    if (!ok)
    {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
};

let createShaderProgram = (): WebGLProgram =>
{
    let program = gl.createProgram();
    let vShader = createShader(vertexShaderSource, gl.VERTEX_SHADER);
    let fShader = createShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    let ok = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!ok)
    {
        console.log("Failed to link a shader program");
        return null;
    }
    gl.useProgram(program);
    return program;
}

let initVertexBuffers = (program: WebGLProgram): boolean =>
{
    let vertices = new Float32Array([
        0, 1, 0,        // Square
        0, 0, 0,
        1, 1, 0,
        1, 0, 0,
        -0.5, 0, 0,     // Line
        0.5, 0, 0
    ]);

    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    let aPositionLocation = gl.getAttribLocation(program, "aPosition");
    if (aPositionLocation === -1)
    {
        console.log("Failed to get the aPositionLocation variable");
        return false;
    }
    gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLocation);

    return true;
};

let getUniformLocation = (program: WebGLProgram, name: string): WebGLUniformLocation =>
{
    let location = gl.getUniformLocation(program, name);
    if (location === null)
    {
        console.log(`Failed to get a location variable with the name: "${name}"`);
        return null;
    }
    return location;
};

let setUniforms = (position: vec3, color: vec3, scale: vec3, radians: number): void =>
{
    mat4.identity(g_modelMatrix);
    mat4.translate(g_modelMatrix, g_modelMatrix, position);
    mat4.rotateZ(g_modelMatrix, g_modelMatrix, radians);
    mat4.scale(g_modelMatrix, g_modelMatrix, scale);
    mat4.mul(g_vmMatrix, g_viewMatrix, g_modelMatrix);
    mat4.mul(g_mvpMatrix, g_projMatrix, g_vmMatrix);
    gl.uniformMatrix4fv(g_uMvpMatrixLocation, false, g_mvpMatrix);
    gl.uniform3fv(g_uColorLocation, color);
};

let drawLine = (p1: vec3, p2: vec3, color: vec3) =>
{
    let centerX = p1[0] + (p2[0] - p1[0]) / 2.0;
    let centerY = p1[1] + (p2[1] - p1[1]) / 2.0;

    let a = p2[1] - p1[1];
    let b = p2[0] - p1[0];
    let tan = a / b;
    let angle = Math.atan(tan);
    let length = vec2.length(vec2.fromValues(b, a));

    setUniforms(vec3.fromValues(centerX, centerY, 0), color, vec3.fromValues(length, 1, 1), angle);

    gl.drawArrays(gl.LINES, 4, 2);
};

let drawSquare = (position: vec3, color: vec3, size: number = 1, degrees: number = 0) =>
{
    setUniforms(position, color, vec3.fromValues(size, size, size), degrees * Math.PI / 180.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

let drawField = (): void =>
{
    for (let i = 0; i < g_GAME_FIELD_WIDTH; i += g_SCALE)
    {
        drawLine(vec3.fromValues(i, 0, 0), vec3.fromValues(i, g_GAME_FIELD_HEIGHT, 0), vec3.fromValues(0, 1, 0));
    }

    for (let i = 0; i < g_GAME_FIELD_HEIGHT; i += g_SCALE)
    {
        drawLine(vec3.fromValues(0, i, 0), vec3.fromValues(g_GAME_FIELD_WIDTH, i, 0), vec3.fromValues(0, 1, 0));
    }
}

let drawSnake = (): void =>
{
    for (let i = 0; i < g_snakeLength; i++)
    {
        drawSquare(vec3.fromValues(g_snake[i].x * g_SCALE, g_snake[i].y * g_SCALE, 0), vec3.fromValues(0, 0, 1), g_SCALE, 0);
    }
}

let display = (): void =>
{
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < g_fruits.length; i++)
    {
        g_fruits[i].Draw();
    }

    drawField();
    drawSnake();
};

let tick = (): void =>
{
    for (let i = g_snakeLength; i > 0; i--)
    {
        g_snake[i].x = g_snake[i - 1].x;
        g_snake[i].y = g_snake[i - 1].y;
    }

    if (g_currentDir === Dir.Up)
    {
        g_snake[0].y += 1;
    }
    if (g_currentDir === Dir.Left)
    {
        g_snake[0].x -= 1;
    }
    if (g_currentDir === Dir.Down)
    {
        g_snake[0].y -= 1;
    }
    if (g_currentDir === Dir.Right)
    {
        g_snake[0].x += 1;
    }

    for (let i = 0; i < g_fruits.length; i++)
    {
        if ((g_snake[0].x === g_fruits[i].x) && (g_snake[0].y === g_fruits[i].y))
        {
            g_snakeLength++;
            g_fruits[i].CreateNew();
        }
    }

    if (g_snake[0].y > g_M)
    {
        g_currentDir = Dir.Down;
    }
    else if (g_snake[0].x < 0)
    {
        g_currentDir = Dir.Right;
    }
    else if (g_snake[0].y < 0)
    {
        g_currentDir = Dir.Up;
    }
    else if (g_snake[0].x > g_N)
    {
        g_currentDir = Dir.Left;
    }

    for (let i = 1; i < g_snakeLength; i++)
    {
        if (g_snake[0].x === g_snake[i].x && g_snake[0].y === g_snake[i].y)
        {
            g_snakeLength = i;
        }
    }
}

let timer = (): void =>
{
    tick();
    display();
};

let keyDownHandler = (ev: KeyboardEvent): void =>
{
    if (ev.key === "Up" || ev.key === "ArrowUp" || ev.key === "w")
    {
        g_currentDir = Dir.Up;
    }
    else if (ev.key === "Left" || ev.key === "ArrowLeft" || ev.key === "a")
    {
        g_currentDir = Dir.Left;
    }
    else if (ev.key === "Down" || ev.key === "ArrowDown" || ev.key === "s")
    {
        g_currentDir = Dir.Down;
    }
    else if (ev.key === "Right" || ev.key === "ArrowRight" || ev.key === "d")
    {
        g_currentDir = Dir.Right;
    }
};

let main = () =>
{
    // Get a WebGL context
    gl = getWebGLContext("renderCanvas");
    if (gl === null) return;

    // Get a shader program
    let program = createShaderProgram();
    if (!program) return;

    // Initialize vertex buffers
    if (!initVertexBuffers(program)) return;

    // Get uniforms
    g_uMvpMatrixLocation = getUniformLocation(program, "uMvpMatrix");
    g_uColorLocation = getUniformLocation(program, "uColor");
    if (g_uMvpMatrixLocation === null || g_uColorLocation === null) return;

    // Create matrices
    g_modelMatrix = mat4.create();
    g_viewMatrix = mat4.lookAt(mat4.create(), vec3.fromValues(0, 0, 1), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
    g_projMatrix = mat4.ortho(mat4.create(), 0, g_GAME_FIELD_WIDTH, 0, g_GAME_FIELD_HEIGHT, 10, -10);
    g_vmMatrix = mat4.create();
    g_mvpMatrix = mat4.create();

    for (let i = 0; i < g_snake.length; i++)
    {
        g_snake[i] = { x: 0, y: 0 };
    }

    g_snake[0] = { x: 1, y: 3 };
    g_snake[1] = { x: 1, y: 2 };
    g_snake[2] = { x: 1, y: 1 };

    for (let i = 0; i < 10; i++)
    {
        g_fruits.push(new Fruit());
        g_fruits[i].CreateNew();
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    document.addEventListener("keydown", (ev: KeyboardEvent) => { keyDownHandler(ev) }, false);

    display();

    setInterval(() => { timer(); }, 300);
};

// Debug version
main();

// Release version
// window.onload = () => { main(); };
