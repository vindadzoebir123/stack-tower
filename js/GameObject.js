var GameObject = function(name, game){

    BABYLON.Mesh.call(this, name, game.scene);

    this.game = game;
    this.scene = game.scene;
}

GameObject.prototype = Object.create(BABYLON.Mesh.prototype);

GameObject.prototype.constructor = GameObject;

var Stack = function(game)
{
    GameObject.call(this, "stack", game);

    this.body = null;

    this.directions = [0,0];

    this.rotations = [0,0];

    var vertexData = BABYLON.VertexData.CreateSphere(16,0.75, BABYLON.Mesh.DEFAULTSIDE);

    vertexData.applyToMesh(this);

    this.position.y = Stack.START_HEIGHT;

    var _this = this;

    this.getScene().registerBeforeRender(function(){
        if(_this.position.y < -10)
        {
            _this.game.reset();
        }
    });
};

Stack.prototype = Object.create(GameObject.prototype);
Stack.prototype.constructor = Stack;

