LEEWGL.REQUIRES.push('Scene');

/**
 *
 * @constructor
 * @memberof LEEWGL.Object3D
 * @param {object} options
 */
LEEWGL.Scene = function(options) {
  LEEWGL.Object3D.call(this, options);
  this.type = 'Scene';

  Object.defineProperties(this, {
    'shaders': {
      value: {},
      enumerable: true,
      writable: true
    },
    'activeShader': {
      value: null,
      enumerable: false,
      writable: true
    }
  });
};

LEEWGL.Scene.prototype = Object.create(LEEWGL.Object3D.prototype);

LEEWGL.Scene.prototype.addShader = function(name, shader) {
  this.shaders[name] = shader;
};

LEEWGL.Scene.prototype.setActiveShader = function(name) {
  this.activeShader = this.shaders[name];
};

LEEWGL.Scene.prototype.clone = function(scene, cloneID, addToAlias) {
  if (typeof scene === 'undefined')
    scene = new LEEWGL.Scene();

  LEEWGL.Object3D.prototype.clone.call(this, scene, cloneID, true, addToAlias);

  for (var name in this.shaders) {
    if (this.shaders.hasOwnProperty(name)) {
      scene.shaders[name] = this.shaders[name].clone();
    }
  }
  return scene;
};

LEEWGL.Scene.prototype.import = function(stringified_json, recursive) {
  var json = JSON.parse(stringified_json);

  console.log(json);

  var scene = new LEEWGL.Scene(json);
  scene.shaders = json.shaders;

  for (var i = 0; i < scene.children.length; ++i) {
    var child = scene.children[i];
    var className = functionFromString('LEEWGL.' + child.type);
    scene.children[i] = new className(child);
    scene.children[i].parent = scene;
  }

  // scene = LEEWGL.Object3D.prototype.import.call(this, stringified_json, recursive, scene);
  return scene;
};
