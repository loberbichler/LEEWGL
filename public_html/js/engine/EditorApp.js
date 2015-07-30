LEEWGL.REQUIRES.push('EditorApp');

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

  this.triangle = new LEEWGL.Geometry.Triangle();
  this.cube = new LEEWGL.Geometry.Cube();
  this.grid = new LEEWGL.Geometry.Grid();

  this.picker = new LEEWGL.Picker();

  this.light = new LEEWGL.Light.SpotLight();

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
  this.activeElement = null;

  this.shadowmap = new LEEWGL.Shadowmap();
  this.useShadows = false;

  this.testModel = new LEEWGL.Geometry.Triangle();
};

LEEWGL.EditorApp.prototype = Object.create(LEEWGL.App.prototype);

LEEWGL.EditorApp.prototype.onCreate = function() {
  var that = this;

  var head = new LEEWGL.DOM.Element(document.head);

  this.core.setViewport(0, 0, 512, 512);
  this.core.setSize(512, 512);

  this.triangle.alias = 'Triangle';
  this.cube.alias = 'Cube';
  this.grid.alias = 'Grid';
  this.light.alias = 'Light';

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

  /// insert shader into html to be able to export it later
  var vertexHTML0 = new LEEWGL.DOM.Element('script', {
    'id': 'vertex-shader-0',
    'type': 'x-shader/x-vertex',
    'class': 'vertex-shaders',
    'html': this.shaderLibrary.vertex.parameters.join('\n') + this.shaderLibrary.vertex.main.join('\n') + '}'
  });
  var fragmentHTML0 = new LEEWGL.DOM.Element('script', {
    'id': 'fragment-shader-0',
    'type': 'x-shader/x-fragment',
    'class': 'fragment-shaders',
    'html': this.shaderLibrary.fragment.parameters.join('\n') + this.shaderLibrary.fragment.main.join('\n') + '}'
  });
  head.grab(vertexHTML0);
  head.grab(fragmentHTML0);

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

  /// insert shader into html to be able to export it later
  var vertexHTML1 = new LEEWGL.DOM.Element('script', {
    'id': 'vertex-shader-1',
    'type': 'x-shader/x-vertex',
    'class': 'vertex-shaders',
    'html': this.shaderLibrary.vertex.parameters.join('\n') + this.shaderLibrary.vertex.main.join('\n') + '}'
  });
  var fragmentHTML1 = new LEEWGL.DOM.Element('script', {
    'id': 'fragment-shader-1',
    'type': 'x-shader/x-fragment',
    'class': 'fragment-shaders',
    'html': this.shaderLibrary.fragment.parameters.join('\n') + this.shaderLibrary.fragment.main.join('\n') + '}'
  });
  head.grab(vertexHTML1);
  head.grab(fragmentHTML1);

  this.cameraGizmo.setBuffer(this.gl);
  this.cameraGizmo.addColor(this.gl);

  this.triangle.setBuffer(this.gl);
  this.triangle.addColor(this.gl);

  this.cube.setBuffer(this.gl);
  this.cube.addColor(this.gl);
  this.cube.transform.offsetPosition([5, 0, 0]);

  this.cube.addComponent(new LEEWGL.Component.CustomScript());

  this.grid.generateGrid(10, 10, {
    'x': 10.0,
    'z': 10.0
  });
  this.grid.setBuffer(this.gl);
  this.grid.setColorBuffer(this.gl);
  this.grid.transform.translate([0.0, -5.0, 0.0]);

  // / test load collada file
  var Importer = new LEEWGL.Importer();

  // var model = Importer.import('models/cup.obj', this.gl);

  this.scene.add(this.camera, this.gameCamera, this.triangle, this.cube, this.cameraGizmo, this.light);

  UI.addObjToOutline(this.scene.children);
  UI.addObjToOutline([this.light]);

  this.gl.enable(this.gl.DEPTH_TEST);
  this.gl.depthFunc(this.gl.LEQUAL);

  UI.setGL(this.gl);
  UI.setScene(this.scene);

  if (this.picking === true)
    this.picker.initPicking(this.gl, this.canvas.width, this.canvas.height);

  if (this.useShadows === true)
    this.shadowmap.init(this.gl, 1024, 1024);

  this.cube.export();
};

LEEWGL.EditorApp.prototype.updatePickingList = function() {
  if (this.picking === true) {
    for (var i = 0; i < this.scene.children.length; ++i) {
      var element = this.scene.children[i];
      if (typeof element.buffers !== 'undefined')
        this.picker.addToList(element);
    }
    this.picker.initPicking(this.gl, this.canvas.width, this.canvas.height);
  }
};

LEEWGL.EditorApp.prototype.onMouseDown = function(event) {
  var mouseCords = UI.getRelativeMouseCoordinates(event, this.canvas);

  event.target.focus();

  var obj = null;

  if (this.picking === true) {
    this.picker.bind(this.gl);
    obj = this.picker.pick(this.gl, mouseCords.x, mouseCords.y);
    if (obj !== null) {
      this.activeElement = obj;
      this.movement.x = 0;
      this.movement.y = 0;

      UI.setInspectorContent(obj.id);

      this.picker.unbind(this.gl);
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
    movement.x = (LEEWGL.Settings.RotationSpeed.x * movement.x);
    movement.y = (LEEWGL.Settings.RotationSpeed.y * movement.y);
    this.camera.offsetOrientation(movement.y, movement.x);
  } else if ((event.which === 1 || button === LEEWGL.MOUSE.LEFT) && this.activeElement !== null) {
    var forward = this.camera.forward();

    this.movement.x = movement.x * this.translationSpeed.y;
    this.movement.y = movement.y * this.translationSpeed.y;

    var trans = [this.movement.x, -this.movement.y, 0.0];
    vec3.transformMat4(trans, trans, this.camera.orientation());

    if (event.ctrlKey)
      this.activeElement.transform.scale([this.movement.x * 0.01, this.movement.y * 0.01, 1.0]);
    else
      this.activeElement.transform.rotateY(rad, true);

    UI.setInspectorContent(this.activeElement.id);
  }
};

LEEWGL.EditorApp.prototype.onMouseUp = function(event) {
  this.activeElement = null;
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

  if (this.scene.needsUpdate === true) {
    this.updatePickingList();
    this.scene.needsUpdate = false;
  }
};

LEEWGL.EditorApp.prototype.handleKeyInput = function() {
  if (typeof UI !== 'undefined' && UI.playing === true)
    return;

  if (this.activeKeys[LEEWGL.KEYS.PAGE_UP]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.down(), LEEWGL.Settings.TranslationSpeed.y)));
  } else if (this.activeKeys[LEEWGL.KEYS.PAGE_DOWN]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.down(), LEEWGL.Settings.TranslationSpeed.y));
  }

  if (this.activeKeys[LEEWGL.KEYS.LEFT_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.right(), LEEWGL.Settings.TranslationSpeed.x)));
  } else if (this.activeKeys[LEEWGL.KEYS.RIGHT_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.right(), LEEWGL.Settings.TranslationSpeed.x));
  }

  if (this.activeKeys[LEEWGL.KEYS.UP_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.scale(vec3.create(), this.camera.forward(), LEEWGL.Settings.TranslationSpeed.z));
  } else if (this.activeKeys[LEEWGL.KEYS.DOWN_CURSOR]) {
    this.camera.transform.offsetPosition(vec3.negate(vec3.create(), vec3.scale(vec3.create(), this.camera.forward(), LEEWGL.Settings.TranslationSpeed.z)));
  }
};

LEEWGL.EditorApp.prototype.onRender = function() {
  this.clear();

  var viewProjection = this.camera.viewProjMatrix;

  if (typeof UI !== 'undefined' && UI.playing === true)
    viewProjection = this.gameCamera.viewProjMatrix;

  var activeShader = null;

  for (var i = 0; i < this.scene.children.length; ++i) {
    var element = this.scene.children[i];
    if (element.usesTexture === true)
      activeShader = this.scene.shaders['texture'];
    else
      activeShader = this.scene.shaders['color'];

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

LEEWGL.EditorApp.prototype.clear = function() {
  this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  this.gl.clearColor(LEEWGL.Settings.BackgroundColor.r, LEEWGL.Settings.BackgroundColor.g, LEEWGL.Settings.BackgroundColor.b, LEEWGL.Settings.BackgroundColor.a);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.gl.colorMask(true, true, true, true);
};

LEEWGL.EditorApp.prototype.draw = function(element, shader, viewProjection) {
  if (element.render === true) {
    shader.use(this.gl);
    shader.uniforms['uVP'](viewProjection);

    if (this.useShadows === true)
      this.shadowmap.draw(this.gl, shader, this.light);

    if (this.light instanceof LEEWGL.Light.DirectionalLight) {
      shader.uniforms['uLightDirection'](this.light.direction);
    } else if (this.light instanceof LEEWGL.Light.SpotLight) {
      shader.uniforms['uLightPosition'](this.light.transform.position);
      shader.uniforms['uSpotDirection'](this.light.spotDirection);
      shader.uniforms['uSpotInnerAngle'](this.light.innerAngle);
      shader.uniforms['uSpotOuterAngle'](this.light.outerAngle);
      shader.uniforms['uLightRadius'](this.light.radius);
    } else if (this.light instanceof LEEWGL.Light.PointLight) {
      shader.uniforms['uLightPosition'](this.light.position);
      shader.uniforms['uLightRadius'](this.light.radius);
    }
    shader.uniforms['uAmbient']([0.2, 0.2, 0.2]);
    shader.uniforms['uSpecular'](this.light.specular);
    shader.uniforms['uLightColor'](this.light.color);
    element.draw(this.gl, shader, this.gl.TRIANGLES);
  }
};