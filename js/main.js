var myGame;
window.addEventListener("DOMContentLoaded", function(){
    myGame = new Game('renderCanvas');
}, false
);

var RestartScene = function()
{
    myGame.scene.dispose();
    myGame = new Game('renderCanvas');
}

var Game = function(canvasId)
{
    var canvas = document.getElementById(canvasId);

    this.engine = new BABYLON.Engine(canvas, true);

    this.odd = true;
    this.currentSpeed = 120;

    this.scene = this._initScene(this.engine);

    this.colorGrad = [new BABYLON.Color3(0.63,0.98, 0.64),
                        new BABYLON.Color3(0.57, 0.79, 0.69),
                        new BABYLON.Color3(0.3, 0.46, 0.6),
                        new BABYLON.Color3(0.36, 0.32, 0.47),
                        new BABYLON.Color3(0.34, 0.12, 0.3),];

    this.currentActiveColor = 0;
    this.nextActiveColor = this.colorGrad[1];
    this.lerpCount = 0;
    this.outlineTime = 0;

    this.playerLevel = null;
    this.gameOverStatus = false;
    this.gameRunning = false;
    this.cameraPovTarget = 0;

    this.gameScore = 0;

    this._initGame();
    

    var _this = this;
    
    this.scene.onPointerDown = function(evt, pickInfo){
        if(_this.gameOverStatus || !_this.gameRunning)
            return;
        _this.checkStack();
    }
    this.engine.runRenderLoop(() => {
        this.scene.render();
        if(this.gameRunning || !this.gameOver)
            this._disableOutline();
        

            this.animateGameOver();
    });

    // this.scene.debugLayer.show();

    this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "myUI"
      );

    var button1 = BABYLON.GUI.Button.CreateSimpleButton("but1", "TAP TO START");
    button1.width = "300px"
    button1.height = "80px";
    button1.color = "white";
    // button1.cornerRadius = 20;
    button1.background = "#f67e7d";
    button1.onPointerUpObservable.add(function() {
        _this.gameStart();
        button1.dispose();
    });
    this.advancedTexture.addControl(button1);    
}

Game.prototype._setColor = function()
{
    var color = new BABYLON.Color3();
    var nextColor;
    if(this.lerpCount>1)
    {
        this.currentActiveColor++;
        if(this.currentActiveColor>this.colorGrad.length-1)
            this.currentActiveColor = 0;
        this.lerpCount = 0;
    }
    
    if(this.currentActiveColor<this.colorGrad.length-1)
    {
        nextColor = this.colorGrad[this.currentActiveColor+1];
    }
    else
    {
        nextColor = this.colorGrad[0];
    }

    BABYLON.Color3.LerpToRef(this.colorGrad[this.currentActiveColor], nextColor, this.lerpCount, color);
    this.lerpCount+=0.2;
    // color = this.colorGrad[this.currentActiveColor];
    return color;
},

Game.prototype._initScene = function(engine)
{
    var scene = new BABYLON.Scene(engine);

    this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(2, 1, -2), scene);
    this.camera.setTarget(BABYLON.Vector3.Zero());
    this.camera.fov = 1;
    // camera.rotation = new BABYLON.Vector3(Math.PI/3.5, 0, 0);
    // this.camera.attachControl(engine.getRenderingCanvas());

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0,1,0), scene);

    light.intensity = 0.7;

    return scene;
}

Game.prototype._initGame = function(){

    this.scene.clearColor = new BABYLON.Color3.Black;
    this.scene.ambientColor = new BABYLON.Color3(0.3,0.3,0.3);
    this.startPosY = -0.5;
    // this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    // this.scene.fogStart = 20.0;
    // this.scene.fogEnd = 60.0;
    // this.scene.fogDensity = 0.01;
    // this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
    
    var skyboxMaterial = new BABYLON.StandardMaterial("skyMaterial", this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("graphics/skybox", this.scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

    this.skybox = BABYLON.Mesh.CreateBox("skyBox", 2000.0, this.scene);
    this.skybox.material = skyboxMaterial;


    var platform = BABYLON.MeshBuilder.CreateBox("platform", {height:5, width:1, depth:1}, this.scene);
    platform.position = new BABYLON.Vector3(0,-3.1,0);

    this.base = BABYLON.MeshBuilder.CreateBox("box", {height:0.2, width:1, depth:1}, this.scene);
    this.base.position = new BABYLON.Vector3(0,this.startPosY,0);
    this.currentStack = this.base;

    this.material = new BABYLON.StandardMaterial('mat', this.scene);
    this.material.diffuseColor = this._setColor();
    // material.diffuseColor = new BABYLON.Color3(1,1,1);
    this.material.emissiveColor = new BABYLON.Color3(0.5,0.5,0.5);
    this.material.alpha = 0.75;

    // var array = randomColor({luminosity: 'light', hue: 'red', format: 'rgbArray'});
    // var gradient = new BABYLON.ColorGradient(1, BABYLON.Color3.Red(), BABYLON.Color3.Blue());
    // var color = new BABYLON.Color4();
    var color = this.nextActiveColor;
    // // gradient.getColorToRef(color);

    this.material.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    this.material.emissiveFresnelParameters.bias = 0.6;
    this.material.emissiveFresnelParameters.power = 2;
    this.material.emissiveFresnelParameters.leftColor = BABYLON.Color3.Black();
    this.material.emissiveFresnelParameters.rightColor = color;

    this.material.opacityFresnelParameters = new BABYLON.FresnelParameters();
    this.material.opacityFresnelParameters.leftColor = BABYLON.Color3.White();
    this.material.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();
    // var material = new BABYLON.StandardMaterial("grad", this.scene);
    // material.diffuseTexture = new BABYLON.Texture("graphics/leaf.png", this.scene);
    this.base.material = this.material;
    platform.material = this.material;

    
    this.createParticles();
    // this.scene.onPointerDown = function(evt, pickInfo){
    //     // pickInfo.pickedMesh.renderOutline = true;
    //     // pickInfo.pickedMesh.outlineWidth = 0.05;
    //     // pickInfo.pickedMesh.outlineColor = BABYLON.Color3.White();

    //     //mouse click object
    //     // console.log(pickInfo.pickedMesh);
    //     _this._checkStack();
    // }
    
}

Game.prototype.gameStart = function()
{
    this.gameRunning = true;
    this.currentStack = this._createStack();
    this.loadMusic();
    this.updateScore();
}

Game.prototype.updateScore = function()
{
    if(this.scoreText==null)
    {
        this.scoreText = new BABYLON.GUI.TextBlock();
        this.scoreText.text = String(this.gameScore);
        this.scoreText.color = "white";
        this.scoreText.fontSize = 100;
        this.scoreText.top = "-300px";
        this.advancedTexture.addControl(this.scoreText);    
    }
    else
    {
        this.scoreText.text = String(this.gameScore);
    }
}

Game.prototype.createParticles = function()
{
    const particleSystem = new BABYLON.ParticleSystem("particles", 100);

    //Texture of each particle
    particleSystem.particleTexture = new BABYLON.Texture("graphics/star.png");

    // Position where the particles are emiited from
    particleSystem.emitter = new BABYLON.Vector3(0, 0.5, 0);
    particleSystem.minSize = 0.01;
    particleSystem.maxSize = 0.1;

    particleSystem.minInitialRotation = -Math.PI / 2;
    particleSystem.maxInitialRotation = Math.PI / 2;

    particleSystem.start();
}

Game.prototype.checkStack = function()
{
    // var currentStack = this.scene.getMeshByName("instance");
    this.scene.stopAnimation(this.currentStack);

    var hangover;
    var direction;
    if(this.odd)
    {
        hangover = this.currentStack.position.z - this.prevStack.position.z;
        if(Math.abs(hangover)>=0.02)
        {
            direction = hangover > 0 ? 1:-1;
            var newSize = this.prevStack.scaling.z - Math.abs(hangover);
            var fallingBlock = this.currentStack.scaling.z - newSize;
            
            var cubeEdge = this.currentStack.position.z + (newSize/2 * direction);
            var fallingBlockPos = cubeEdge + (fallingBlock/2 * direction);
            this._createFallingCube(new BABYLON.Vector3(this.currentStack.position.x, this.currentStack.position.y, fallingBlockPos),
            new BABYLON.Vector3(this.currentStack.scaling.x, this.currentStack.scaling.y, fallingBlock));
            this.currentStack.position = new BABYLON.Vector3(this.currentStack.position.x, this.currentStack.position.y, this.prevStack.position.z + (hangover/2));
            this.currentStack.scaling = new BABYLON.Vector3(this.currentStack.scaling.x, this.currentStack.scaling.y, newSize);
            this.fallSFX.play();
            if(newSize<0)
            {
                this.gameOver();
                return;
            }
        }
        else
        {
            this.currentStack.position = new BABYLON.Vector3(this.currentStack.position.x, this.currentStack.position.y, this.prevStack.position.z );
            this._showOutline();
            this.stackSFX.play();
        }
    }
    else
    {
        hangover = this.currentStack.position.x - this.prevStack.position.x;
        if(Math.abs(hangover)>=0.02)
        {
            direction = hangover > 0 ? 1:-1;
            var newSize = this.prevStack.scaling.x - Math.abs(hangover);
            var fallingBlock = this.currentStack.scaling.x - newSize;
            
            var cubeEdge = this.currentStack.position.x + (newSize/2 * direction);
            var fallingBlockPos = cubeEdge + (fallingBlock/2 * direction);
            this._createFallingCube(new BABYLON.Vector3(fallingBlockPos, this.currentStack.position.y, this.currentStack.position.z),
            new BABYLON.Vector3(fallingBlock, this.currentStack.scaling.y, this.currentStack.scaling.z));
            this.currentStack.position = new BABYLON.Vector3(this.prevStack.position.x + (hangover/2), this.currentStack.position.y, this.currentStack.position.z);
            this.currentStack.scaling = new BABYLON.Vector3(newSize, this.currentStack.scaling.y, this.currentStack.scaling.z);
            this.fallSFX.play();
            if(newSize<0)
            {
                this.gameOver();
                return;
            }
        }
        else
        {
            this.currentStack.position = new BABYLON.Vector3(this.prevStack.position.x, this.currentStack.position.y, this.currentStack.position.z);
            this._showOutline();
            this.stackSFX.play();
        }
    }

    // this.currentStack.position = new BABYLON.Vector3(1,1,1);

    this.gameScore++;
    this.updateScore();
    this.currentStack = this._createStack();
}

Game.prototype._showOutline = function()
{
    this.currentStack.renderOutline = true;
    this.currentStack.outlineWidth = 0.02;
    this.currentStack.outlineColor = BABYLON.Color3.White();
    this.outlineTime = 0;
}

Game.prototype._disableOutline = function()
{
    if(this.outlineTime>0.2)
    {

        this.currentStack.renderOutline = false;
        this.prevStack.renderOutline = false;
        this.outlineTime = 0;
    }
    else
    {
        this.outlineTime+=0.01;
    }
}

Game.prototype._createFallingCube = function(position, scaling)
{
    var fallingStack = this.currentStack.createInstance("falling");
    var parentStack = this.currentStack;
    fallingStack.position = position;
    fallingStack.scaling = scaling;

    const fallAnim = new BABYLON.Animation("fallAnim", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    const fallKeys = [];

    fallKeys.push({
        frame: 0,
        value : fallingStack.position.y
    });
    fallKeys.push({
        frame: 120,
        value : -10
    });

    fallAnim.setKeys(fallKeys);
    fallingStack.animations = [];
    fallingStack.animations.push(fallAnim);

    fallAnim.addEvent(new BABYLON.AnimationEvent( 110, function() { fallingStack.dispose(); }, true ) );
    fallAnim.addEvent(new BABYLON.AnimationEvent( 10, function() { parentStack.renderOutline = false;}, true ) );
    this.scene.beginAnimation(fallingStack, 0, 120, true);
},

Game.prototype.gameOver = function()
{
    var distance = (this.camera.position.y - 1)/1;
    
    this.cameraPovTarget = Math.abs(this.camera.fov + (distance/5));
    // if(this.cameraPovTarget>2)
    //     this.cameraPovTarget/2;
    this.gameOverStatus = true;
    this.currentStack.dispose();
    console.log("Camera pov target : " + this.cameraPovTarget + ", distance : " + distance);
}

Game.prototype.animateGameOver = function()
{
    if(this.gameOverStatus)
    {
        if(this.camera.fov<this.cameraPovTarget)
        {
            this.camera.fov += 0.001;
        } 
        else
        {
            var text1 = new BABYLON.GUI.TextBlock();
            text1.text = "Game Over";
            text1.color = "white";
            text1.fontSize = 75;
            text1.top = "0px";
            this.advancedTexture.addControl(text1);  
            
            var button1 = BABYLON.GUI.Button.CreateSimpleButton("but1", "RESTART");
            button1.width = "300px"
            button1.height = "80px";
            button1.color = "white";
            button1.top = "200px";
            // button1.cornerRadius = 20;
            button1.background = "#f67e7d";
            button1.onPointerUpObservable.add(function() {
                RestartScene();
            });
            this.advancedTexture.addControl(button1);    
        }
    }
}


Game.prototype._createStack = function()
{
    this.startPosY +=0.2;
    this.camera.position.y +=0.2;
    this.skybox.position.y -=10;
    if(this.currentStack!=null)
    {
        this.prevStack = this.currentStack;
        this.prevStack.name = "Prev";
    }

    var currentStack = this.base.clone("instance");
    var material = new BABYLON.StandardMaterial('dfa', this.scene);
    material.diffuseColor = this._setColor();
    // material.diffuseColor = new BABYLON.Color3(1,1,1);
    material.emissiveColor = new BABYLON.Color3(0.5,0.5,0.5);
    // material.alpha = 0.75;

    // var array = randomColor({luminosity: 'light', hue: 'red', format: 'rgbArray'});
    // var gradient = new BABYLON.ColorGradient(1, BABYLON.Color3.Red(), BABYLON.Color3.Blue());
    // var color = new BABYLON.Color4();
    var color = this.nextActiveColor;
    // // gradient.getColorToRef(color);

    material.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    material.emissiveFresnelParameters.bias = 0.6;
    material.emissiveFresnelParameters.power = 2;
    material.emissiveFresnelParameters.leftColor = BABYLON.Color3.Black();
    material.emissiveFresnelParameters.rightColor = color;

    // material.opacityFresnelParameters = new BABYLON.FresnelParameters();
    // material.opacityFresnelParameters.leftColor = BABYLON.Color3.White();
    // material.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();
    // var material = new BABYLON.StandardMaterial("grad", this.scene);
    // material.diffuseTexture = new BABYLON.Texture("graphics/leaf.png", this.scene);
    currentStack.material = material;
    // this.currentStack.material = this.material;
    // currentStack.parent = this.prevStack;
    currentStack.position = new BABYLON.Vector3(this.prevStack.position.x,this.startPosY,this.prevStack.position.z);
    currentStack.scaling = new BABYLON.Vector3(this.prevStack.scaling.x, this.prevStack.scaling.y, this.prevStack.scaling.z);
    if(this.odd)
    {
        this._playXAnimation(currentStack);
        this.odd = false;
    }

    else
    {
        this._playZAnimation(currentStack);
        this.odd = true;
    }

    this.currentSpeed-=5;
    if(this.currentSpeed<25)
        this.currentSpeed = 25;

    return currentStack;
}

Game.prototype._playXAnimation = function(currentStack)
{
    const stackAnim = new BABYLON.Animation("stackAnim", "position.x", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const stackKeys = [];

    stackKeys.push({
        frame: 0,
        value : -3
    });
    stackKeys.push({
        frame: this.currentSpeed,
        value : 0
    });

    stackKeys.push({
        frame: this.currentSpeed*2,
        value : 3
    });

    stackKeys.push({
        frame: this.currentSpeed*3,
        value : 0
    });

    stackKeys.push({
        frame: this.currentSpeed*4,
        value : -3
    });

    stackAnim.setKeys(stackKeys);
    currentStack.animations = [];
    currentStack.animations.push(stackAnim);

    this.scene.beginAnimation(currentStack, 0, this.currentSpeed*4, true);
}

Game.prototype._playZAnimation = function(currentStack)
{
    const stackAnim = new BABYLON.Animation("stackAnim", "position.z", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const stackKeys = [];

    stackKeys.push({
        frame: 0,
        value : 3
    });
    stackKeys.push({
        frame: this.currentSpeed,
        value : 0
    });

    stackKeys.push({
        frame: this.currentSpeed*2,
        value : -3
    });

    stackKeys.push({
        frame: this.currentSpeed*3,
        value : 0
    });

    stackKeys.push({
        frame: this.currentSpeed*4,
        value : 3
    });

    stackAnim.setKeys(stackKeys);
    currentStack.animations = [];
    currentStack.animations.push(stackAnim);

    this.scene.beginAnimation(currentStack, 0, this.currentSpeed*4, true);
}

Game.prototype.loadMusic = function()
{
    if(this.bgm!=null)
        this.bgm.stop();
    var music = new BABYLON.Sound("Music", "audio/bgm.mp3", this.scene, function(){
        music.play();
    }, {
        loop: true,
        autoplay: false
      });

      this.bgm = music;
    this.fallSFX = new BABYLON.Sound("fallSfx", "audio/fall.wav", this.scene);
    this.stackSFX = new BABYLON.Sound("stackSfx", "audio/stack.wav", this.scene);
}
// new Game('renderCanvas');
