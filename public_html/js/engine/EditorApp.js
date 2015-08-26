LEEWGL.REQUIRES.push('EditorApp');

/**
 * @constructor
 * @memberof LEEWGL.App
 * @param  {Object} options
 */
LEEWGL.EditorApp = function(options) {
  LEEWGL.App.call(this, options);

  this.camera = new LEEWGL.PerspectiveCamera({
    'alias': 'EditorCamera',
    'fov': 90,
    'aspect': 512 / 512,
    'near': 1,
    'far': 1000,
    'inOutline': false
  });
  this.gameCamera = new LEEWGL.PerspectiveCamera({
    'alias': 'GameCamera',
    'fov': 90,
    'aspect': 512 / 512,
    'near': 1,
    'far': 1000
  });

  this.cameraGizmo = new LEEWGL.Geometry.Sphere();
  this.triangle = new LEEWGL.Geometry.Triangle({
    'alias': 'Triangle'
  });
  this.cube = new LEEWGL.Geometry.Cube({
    'alias': 'Cube'
  });
  this.grid = new LEEWGL.Geometry.Grid({
    'alias': 'Grid',
    'wireframe': true
  });
  this.light = new LEEWGL.Light.SpotLight({
    'alias': 'Light'
  });

  this.picker = new LEEWGL.Picker();
  this.movement = {
    'x': 0,
    'y': 0
  };

  this.activeKeys = [];

  this.picking = (typeof options !== 'undefined' && typeof options.picking !== 'undefined') ? options.picking : true;

  this.translationSpeed = {
    'x': ((typeof options !== 'undefined' && typeof options.translationSpeedX !== 'undefined') ? options.translationSpeedX : 0.1),
    'y': ((typeof options !== 'undefined' && typeof options.translationSpeedY !== 'undefined') ? options.translationSpeedY : 0.1)
  };
  this.rotationSpeed = {
    'x': ((typeof options !== 'undefined' && typeof options.rotationSpeedX !== 'undefined') ? options.rotationSpeedX : 0.1),
    'y': ((typeof options !== 'undefined' && typeof options.rotationSpeedY !== 'undefined') ? options.rotationSpeedY : 0.1)
  };

  this.scene = new LEEWGL.Scene();
  this.scenePlay = new LEEWGL.Scene();
  this.backupScene = [];

  this.activeElement = null;

  this.playing = false;

  this.shadowmap = new LEEWGL.Shadowmap();
  this.useShadows = false;

  this.testModel = new LEEWGL.Geometry.Triangle();

  this.ajax = new LEEWGL.AsynchRequest();

  this.backupElements = [];
};

LEEWGL.EditorApp.prototype = Object.create(LEEWGL.App.prototype);

LEEWGL.EditorApp.prototype.onCreate = function() {
  var that = this;

  this.core.setViewport(0, 0, 512, 512);
  this.core.setSize(512, 512);

  this.camera.transform.setPosition([0.0, 0.0, 10.0]);
  this.camera.setLookAt([0.0, 0.0, -1.0]);

  this.gameCamera.transform.setPosition([10.0, 0.0, 10.0]);
  this.gameCamera.setLookAt([0.0, 0.0, -1.0]);
  this.cameraGizmo.transform.setPosition([10.0, 0.0, 10.0]);

  this.shaderLibrary.addParameterChunks([LEEWGL.ShaderLibrary.DEFAULT, LEEWGL.ShaderLibrary.PICKING, LEEWGL.ShaderLibrary.COLOR, LEEWGL.ShaderLibrary.AMBIENT]);

  if (this.light instanceof LEEWGL.Light.SpotLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.SPOT);
  else if (this.light instanceof LEEWGL.Light.DirectionalLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.DIRECTIONAL);
  else if (this.light instanceof LEEWGL.Light.PointLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.POINT);

  if (this.useShadows === true)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.SHADOW_MAPPING);

  var colorShader = new LEEWGL.Shader();

  colorShader.createShaderFromCode(this.gl, LEEWGL.Shader.VERTEX, this.shaderLibrary.out(LEEWGL.Shader.VERTEX));
  colorShader.createShaderFromCode(this.gl, LEEWGL.Shader.FRAGMENT, this.shaderLibrary.out(LEEWGL.Shader.FRAGMENT));
  colorShader.linkShader(this.gl);
  colorShader.use(this.gl);

  colorShader.createUniformSetters(this.gl);
  colorShader.createAttributeSetters(this.gl);

  this.shaderLibrary.reset();

  this.shaderLibrary.addParameterChunks([LEEWGL.ShaderLibrary.DEFAULT, LEEWGL.ShaderLibrary.PICKING, LEEWGL.ShaderLibrary.TEXTURE, LEEWGL.ShaderLibrary.AMBIENT]);

  if (this.light instanceof LEEWGL.Light.SpotLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.SPOT);
  else if (this.light instanceof LEEWGL.Light.DirectionalLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.DIRECTIONAL);
  else if (this.light instanceof LEEWGL.Light.PointLight)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.POINT);

  if (this.useShadows === true)
    this.shaderLibrary.addParameterChunk(LEEWGL.ShaderLibrary.SHADOW_MAPPING);

  var textureShader = new LEEWGL.Shader();

  textureShader.createShaderFromCode(this.gl, LEEWGL.Shader.VERTEX, this.shaderLibrary.out(LEEWGL.Shader.VERTEX));
  textureShader.createShaderFromCode(this.gl, LEEWGL.Shader.FRAGMENT, this.shaderLibrary.out(LEEWGL.Shader.FRAGMENT));
  textureShader.linkShader(this.gl);
  textureShader.use(this.gl);

  textureShader.createUniformSetters(this.gl);
  textureShader.createAttributeSetters(this.gl);

  this.scene.addShader('color', colorShader);
  this.scene.addShader('texture', textureShader);
  this.scenePlay.addShader('color', colorShader);
  this.scenePlay.addShader('texture', textureShader);

  this.cameraGizmo.setBuffer(this.gl);
  this.cameraGizmo.addColor(this.gl);

  this.triangle.setBuffer(this.gl);
  this.triangle.addColor(this.gl);
  this.triangle.transform.setPosition([0, 0, 0]);

  this.cube.setBuffer(this.gl);
  this.cube.addColor(this.gl);
  this.cube.transform.setPosition([5, 0, 0]);

  this.cube.addComponent(new LEEWGL.Component.CustomScript());

  this.grid.generate();
  this.grid.setBuffer(this.gl);
  this.grid.addColor(this.gl);
  this.grid.transform.translate([0.0, -5.0, 0.0]);

  // test load collada file
  var Importer = new LEEWGL.Importer();

  var model = Importer.import('models/cup.obj', this.gl);

  this.scene.add(this.camera, this.gameCamera, this.triangle, this.cube, this.grid, this.cameraGizmo, this.light);

  this.gl.enable(this.gl.DEPTH_TEST);
  this.gl.depthFunc(this.gl.LEQUAL);

  if (this.picking === true)
    this.picker.init(this.gl, this.canvas.width, this.canvas.height);

  if (this.useShadows === true)
    this.shadowmap.init(this.gl, 1024, 1024);

  this.scene.setActiveShader('color');
  this.scenePlay.setActiveShader('color');

  UI.setApp(this);
  UI.setScene(this.scene);
  UI.addObjToOutline(this.scene.children);
  UI.setTransformationMode('translation');

  // var test = this.scene.export();

  // console.log(encodeURI(test));

  // console.log(this.scene.shaders.color.code.fragment);
  // console.log(colorShader.code.fragment == this.scene.shaders.color.code.fragment);

  // var json = JSON.parse(test);

  // console.log(this.scene.shaders);
  // console.log(json.shaders.color.code.fragment);
};

LEEWGL.EditorApp.prototype.updatePickingList = function(scene) {
  if (this.picking === true) {
    this.picker.clear();
    for (var i = 0; i < scene.children.length; ++i) {
      var element = scene.children[i];
      if (typeof element.buffers !== 'undefined')
        this.picker.addToList(element);
    }
    this.picker.init(this.gl, this.canvas.width, this.canvas.height);
  }
};

LEEWGL.EditorApp.prototype.onMouseDown = function(event) {
  var mouseCords = UI.getRelativeMouseCoordinates(event, this.canvas);

  event.target.focus();

  var obj = null;

  if (this.picking === true) {
    obj = this.picker.pick(this.gl, mouseCords.x, mouseCords.y);
    if (obj !== null) {
      this.activeElement = obj;
      this.movement.x = 0;
      this.movement.y = 0;

      UI.setInspectorContent(obj.id);
    } else {
      UI.setInspectorContent(-1);
    }
  }
  event.preventDefault();
  event.stopPropagation();
};

LEEWGL.EditorApp.prototype.onMouseMove = function(event) {
  var movement = {
    'x': 0,
    'y': 0
  };

  var button = null;

  /// Chrome
  if (typeof event.movementX !== 'undefined') {
    movement.x = event.movementX;
    movement.y += event.movementY;

    button = event.button;
  }
  /// FF
  else {
    movement.x += event.mozMovementX;
    movement.y += event.mozMovementY;

    button = event.buttons;
  }

  var rad = LEEWGL.Math.degToRad(10);

  if (event.which === 3 || button === LEEWGL.MOUSE.RIGHT) {
    movement.x = (SETTINGS.get('rotation-speed').x * movement.x);
    movement.y = (SETTINGS.get('rotation-speed').y * movement.y);
    this.camera.offsetOrientation(movement.y, movement.x);
  } else if ((event.which === 1 || button === LEEWGL.MOUSE.LEFT) && this.activeElement !== null) {
    var forward = this.camera.forward();

    var mode = UI.transformationMode;

    this.movement.x = movement.x * this.translationSpeed.y;
    this.movement.y = movement.y * this.translationSpeed.y;

    var movementWorld = [this.movement.x, -this.movement.y, 0.0];
    var movementScale = [this.movement.x, -this.movement.y, this.movement.x];

    if (mode === 'translation') {
      if (event.altKey)
        this.activeElement.transform.translate(movementWorld, 'local');
      else if (event.ctrlKey)
        this.activeElement.transform.translate([movementWorld[2], movementWorld[1], movementWorld[0]]);
      else
        this.activeElement.transform.translate(movementWorld);
    } else if (mode === 'rotation') {
      if (event.ctrlKey)
        this.activeElement.transform.rotateX(rad, true);
      else if (event.altKey)
        this.activeElement.transform.rotateZ(rad, true);
      else
        this.activeElement.transform.rotateY(rad, true);
    } else if (mode === 'scale') {
      var scaleVec = this.activeElement.transform.scaleVec;
      movementScale = vec3.add(vec3.create(), scaleVec, movementScale);
      if (event.ctrlKey)
        this.activeElement.transform.scale([movementScale[0], scaleVec[1], scaleVec[2]]);
      else if (event.altKey)
        this.activeElement.transform.scale([scaleVec[0], scaleVec[1], movementScale[2]]);
      else
        this.activeElement.transform.scale([scaleVec[0], movementScale[1], scaleVec[2]]);
    }

    UI.setInspectorContent(this.activeElement.id);
  }
};

LEEWGL.EditorApp.prototype.onMouseUp = function(event) {
  this.activeElement = null;

  if (this.picking === true)
    this.picker.init(this.gl, this.canvas.width, this.canvas.height);
  event.preventDefault();
  event.stopPropagation();
};

LEEWGL.EditorApp.prototype.onKeyUp = function(event) {
  this.activeKeys[event.keyCode] = false;
  event.preventDefault();
  event.stopPropagation();
};

LEEWGL.EditorApp.prototype.onKeyDown = function(event) {
  this.activeKeys[event.keyCode] = true;
  event.preventDefault();
  event.stopPropagation();
};

LEEWGL.EditorApp.prototype.onUpdate = function() {
  this.camera.update();
  this.gameCamera.update();
  this.handleKeyInput();

  this.core.setViewport(SETTINGS.get('viewport').x, SETTINGS.get('viewport').y, SETTINGS.get('viewport').width, SETTINGS.get('viewport').height);
  this.core.setSize(SETTINGS.get('viewport').width, SETTINGS.get('viewport').height);

  var scene = this.scene;

  if (this.playing === true) {
    // scene = this.scenePlay;
    for (var i = 0; i < this.scene.children.length; ++i) {
      this.scene.children[i].onUpdate();
    }
  }

  if (scene.needsUpdate === true) {
    this.updatePickingList(scene);
    scene.needsUpdate = false;
  }
};

LEEWGL.EditorApp.prototype.handleKeyInput = function() {
  if (typeof UI !== 'undefined' && UI.playing === true)
    return;

  if (this.activeKeys[LEEWGL.KEYS.PAGE_UP]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.down(), SETTINGS.get('translation-speed').y)));
  } else if (this.activeKeys[LEEWGL.KEYS.PAGE_DOWN]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.down(), SETTINGS.get('translation-speed').y));
  }

  if (this.activeKeys[LEEWGL.KEYS.LEFT_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.right(), SETTINGS.get('translation-speed').x)));
  } else if (this.activeKeys[LEEWGL.KEYS.RIGHT_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.right(), SETTINGS.get('translation-speed').x));
  }

  if (this.activeKeys[LEEWGL.KEYS.UP_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.forward(), SETTINGS.get('translation-speed').z));
  } else if (this.activeKeys[LEEWGL.KEYS.DOWN_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.forward(), SETTINGS.get('translation-speed').z)));
  }
};

LEEWGL.EditorApp.prototype.onRender = function() {
  this.clear();

  var viewProjection = this.camera.viewProjMatrix;
  var scene = this.scene;

  if (this.playing === true) {
    viewProjection = this.gameCamera.viewProjMatrix;
    // scene = this.scenePlay;
  }

  var activeShader = null;

  for (var i = 0; i < scene.children.length; ++i) {
    var element = scene.children[i];

    if (this.playing === true)
      element.onRender();

    if (element.usesTexture === true) {
      activeShader = scene.shaders['texture'];
      scene.setActiveShader('texture');
    } else {
      activeShader = scene.shaders['color'];
      scene.setActiveShader('color');
    }

    activeShader.use(this.gl);

    if (this.picking === true) {
      this.picker.bind(this.gl);

      activeShader.uniforms['uOffscreen'](1);

      this.draw(element, activeShader, viewProjection);
      this.picker.unbind(this.gl);
    }
    activeShader.uniforms['uOffscreen'](0);

    if (this.useShadows === true) {
      this.shadowmap.bind(this.gl, activeShader);
      var shadowVP = mat4.create();
      mat4.multiply(shadowVP, this.light.getProjection(), this.light.getView([0, 0, 0]));
      this.draw(element, activeShader, shadowVP);

      this.shadowmap.unbind(this.gl, activeShader);
      this.clear();
    }
    this.draw(element, activeShader, viewProjection);
  }
};

LEEWGL.EditorApp.prototype.draw = function(element, shader, viewProjection) {
  if (element.render === true) {
    shader.use(this.gl);
    shader.uniforms['uVP'](viewProjection);

    if (this.useShadows === true)
      this.shadowmap.draw(this.gl, shader, this.light);

    this.light.draw(this.gl, shader);
    element.draw(this.gl, shader, this.gl.TRIANGLES);
  }
};

LEEWGL.EditorApp.prototype.onPlay = function() {
  this.playing = true;
  // this.scenePlay.children = [];
  var that = this;
  var onInit = function(element, original) {
    var scripts = element.components['CustomScript'].applied;
    for (var scriptID in scripts) {
      element.dispatchEvent({
        'type': scriptID
      }, this);
    }
    console.log(element);
    // console.log(element);
    // console.log(element.onInit());
    // that.scene.children[original].onInit();
    element.onInit();
  };

  /// create backup of scene children
  for (var i = 0; i < this.scene.children.length; ++i) {
    this.backupScene[i] = this.scene.children[i].clone(undefined, true, false);
    var element = this.scene.children[i];
    /// run through custom scripts
    if (typeof element.components['CustomScript'] !== 'undefined')
      onInit(element, i);
  }

  console.log(this.backupScene);

  // UI.setScene(this.scenePlay);
  // UI.clearOutline();
  // UI.addObjToOutline(this.scenePlay.children);
};

/**
 * @see {LEEWGL.UI.stop}
 * @callback LEEWGL.Object3D.onStop
 */
LEEWGL.EditorApp.prototype.onStop = function() {
  this.playing = false;

  var onStop = function(element) {
    var scripts = element.components['CustomScript'].applied;
    for (var scriptID in scripts) {
      element.dispatchEvent({
        'type': scriptID
      }, this);
    }
    element.onStop();
  };

  for (var i = 0; i < this.scene.children.length; ++i) {
    var element = this.scene.children[i];
    if (typeof element.components['CustomScript'] !== 'undefined') {
      onStop(element);
    }
    // this.scene.children[i] = this.backupScene[i];
  }

  // this.scenePlay.children = [];
  // UI.setScene(this.scene);
  UI.clearOutline();
  UI.addObjToOutline(this.scene.children);
};
