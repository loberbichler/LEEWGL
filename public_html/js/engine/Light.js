/**
 * @constructor
 * @augments LEEWGL.GameObject
 * @param  {vec3} options.ambient
 * @param  {vec3} options.color
 * @param  {number} options.specular
 */
LEEWGL.Light = function(options) {
  LEEWGL.REQUIRES.push('Light');
  LEEWGL.GameObject.call(this, options);

  var ext_options = {
    'ambient': [0.2, 0.2, 0.2],
    'color': [1.0, 1.0, 1.0],
    'specular': 1.0,
  };

  extend(LEEWGL.Light.prototype, LEEWGL.Options.prototype);
  this.addOptions(ext_options);
  this.setOptions(options);

  this.type = 'Light';
  this.lightType = 'Base';

  this.ambient = vec3.copy([], this.options.ambient);
  this.color = vec3.copy([], this.options.color);
  this.specular = this.options.specular;

  this.setEditables();
};

LEEWGL.Light.prototype = Object.create(LEEWGL.GameObject.prototype);

/**
 * Initializes this.editables
 */
LEEWGL.Light.prototype.setEditables = function() {
  LEEWGL.GameObject.prototype.setEditables.call(this);
  var editables = {
    'ambient': {
      'name': 'Ambient',
      'table-titles': ['r', 'g', 'b'],
      'type': 'vector',
      'value': this.ambient
    },
    'color': {
      'name': 'Color',
      'table-titles': ['r', 'g', 'b'],
      'type': 'vector',
      'value': this.color
    },
    'specular': {
      'name': 'Specular',
      'type': 'number',
      'value': this.specular
    },
    'lightType': {
      'name': 'Type',
      'type': 'array',
      'value': this.lightType
    }
  };
  addToJSON(this.editables, editables);
};
/**
 * Returns render data in form of json array
 * @returns  {object} data
 */
LEEWGL.Light.prototype.renderData = function() {
  if (this.editables.render.value === false) {
    return {
      'uniforms': {
        'uAmbient': vec3.fromValues(0, 0, 0),
        'uSpecular': 0,
        'uLightColor': vec3.fromValues(0, 0, 0),
        'uShininess': 0
      }
    }
  }

  return {
    'uniforms': {
      'uAmbient': this.ambient,
      'uSpecular': this.specular,
      'uLightColor': this.color,
      'uShininess': 8.0
    }
  };
};
/**
 * @param  {LEEWGL.Light} light
 * @param  {bool} cloneID
 * @param  {bool} recursive
 * @param  {bool} addToAlias
 * @return {LEEWGL.Light} light
 */
LEEWGL.Light.prototype.clone = function(light, cloneID, recursive, addToAlias) {
  if (typeof light === 'undefined')
    light = new LEEWGL.Light(this.options);

  LEEWGL.GameObject.prototype.clone.call(this, light, cloneID, recursive, addToAlias);

  vec3.copy(light.ambient, this.ambient);
  vec3.copy(light.color, this.color);
  light.specular = this.specular;
  light.lightType = this.lightType;

  return light;
};
/**
 * @constructor
 * @augments LEEWGL.Light
 * @param  {vec3} options.direction
 */
LEEWGL.Light.DirectionalLight = function(options) {
  LEEWGL.Light.call(this, options);

  var ext_options = {
    'direction': [1.0, 0.0, 0.0]
  };

  this.addOptions(ext_options);
  this.setOptions(options);

  this.lightType = 'Directional';
  this.shaderType = LEEWGL.ShaderLibrary.DIRECTIONAL;
  this.direction = vec3.clone(this.options['direction']);

  this.setEditables();
};

LEEWGL.Light.DirectionalLight.prototype = Object.create(LEEWGL.Light.prototype);

/**
 * Calls LEEWGL.Light.setEditables
 */
LEEWGL.Light.DirectionalLight.prototype.setEditables = function() {
  LEEWGL.Light.prototype.setEditables.call(this);

  var editables = {
    'direction': {
      'name': 'Direction',
      'table-titles': ['x', 'y', 'z'],
      'type': 'vector',
      'value': this.direction
    }
  };

  addToJSON(this.editables, editables);
  addPropertyToAllJSON(this.editables, 'alias');
};
/**
 * Generates a lookAt matrix with given eye position
 * @param  {vec3} target - where the viewer is looking at
 * @return  {mat4} view
 */
LEEWGL.Light.DirectionalLight.prototype.getView = function(camera) {
  var view = mat4.create();
  var pos = camera.transform.position;
  mat4.lookAt(view, pos, vec3.add(vec3.create(), pos, vec3.normalize(vec3.create(), this.direction)), this.up);
  return view;
};
/**
 * Generates a projection matrix with this.outerAngle
 * @return  {mat4} projection
 */
LEEWGL.Light.DirectionalLight.prototype.getProjection = function(camera) {
  var projection = mat4.create();
  var pos = camera.transform.position;
  mat4.ortho(projection, pos[0] - 100.0, pos[0] + 100.0, pos[1] - 100.0, pos[1] + 100.0, camera.near, camera.far);
  return projection;
};
/**
 * Returns render data in form of json array
 * @returns  {object} data
 */
LEEWGL.Light.DirectionalLight.prototype.renderData = function() {
  var data = LEEWGL.Light.prototype.renderData.call(this);
  data.uniforms['uLightDirection'] = this.direction;
  return data;
};
/**
 * @param  {LEEWGL.Light.DirectionalLight} directionalLight
 * @param  {bool} cloneID
 * @param  {bool} recursive
 * @param  {bool} addToAlias
 * @return {LEEWGL.Light.DirectionalLight} directionalLight
 */
LEEWGL.Light.DirectionalLight.prototype.clone = function(directionalLight, cloneID, recursive, addToAlias) {
  if (typeof directionalLight === 'undefined')
    directionalLight = new LEEWGL.Light.DirectionalLight(this.options);

  LEEWGL.Light.prototype.clone.call(this, directionalLight, cloneID, recursive, addToAlias);
  vec3.copy(directionalLight.direction, this.direction);
  directionalLight.editables = this.editables;
  return directionalLight;
};

/**
 * @constructor
 * @augments LEEWGL.Light
 * @param  {vec3} options.spot-direction
 * @param  {number} options.radius
 * @param  {number} options.inner-angle
 * @param  {number} options.outer-angle
 */
LEEWGL.Light.SpotLight = function(options) {
  LEEWGL.Light.call(this, options);

  var ext_options = {
    'spot-direction': [1.0, 0.0, 0.0],
    'radius': 20,
    'inner-angle': Math.PI * 0.1,
    'outer-angle': Math.PI * 0.15
  };

  this.addOptions(ext_options);
  this.setOptions(options);

  this.lightType = 'Spot';
  this.shaderType = LEEWGL.ShaderLibrary.SPOT;

  this.spotDirection = vec3.clone(this.options['spot-direction']);
  this.radius = this.options.radius;
  this.innerAngle = this.options['inner-angle'];
  this.outerAngle = this.options['outer-angle'];

  this.setEditables();
};

LEEWGL.Light.SpotLight.prototype = Object.create(LEEWGL.Light.prototype);

/**
 * Calls LEEWGL.Light.setEditables
 */
LEEWGL.Light.SpotLight.prototype.setEditables = function() {
  LEEWGL.Light.prototype.setEditables.call(this);

  var editables = {
    'spotDirection': {
      'name': 'SpotDirection',
      'table-titles': ['x', 'y', 'z'],
      'type': 'vector',
      'value': this.spotDirection
    },
    'radius': {
      'name': 'Radius',
      'type': 'number',
      'value': this.radius
    },
    'innerAngle': {
      'name': 'InnerAngle',
      'type': 'number',
      'value': this.innerAngle
    },
    'outerAngle': {
      'name': 'OuterAngle',
      'type': 'number',
      'value': this.outerAngle
    }
  };
  addToJSON(this.editables, editables);
  addPropertyToAllJSON(this.editables, 'alias');
};

/**
 * Generates a lookAt matrix with given eye position
 * @param  {vec3} target - where the viewer is looking at
 * @return  {mat4} view
 */
LEEWGL.Light.SpotLight.prototype.getView = function(target) {
  var view = mat4.create();
  mat4.lookAt(view, this.transform.position, target, this.up);
  return view;
};
/**
 * Generates a projection matrix with this.outerAngle
 * @return  {mat4} projection
 */
LEEWGL.Light.SpotLight.prototype.getProjection = function() {
  var angle = this.outerAngle * (180 / Math.PI) * 2.0;
  var projection = mat4.create();
  mat4.perspective(projection, angle, 1.0, 1.0, 100.0);
  return projection;
};
/**
 * Generates a view-projection matrix
 * @return  {mat4} mat
 */
LEEWGL.Light.SpotLight.prototype.matrix = function(target) {
  var view = this.getView(target);
  var proj = this.getProjection();
  return mat4.multiply(mat4.create(), proj, view);
};
/**
 * Returns render data in form of json array
 * @returns  {object} data
 */
LEEWGL.Light.SpotLight.prototype.renderData = function() {
  var data = LEEWGL.Light.prototype.renderData.call(this);
  data.uniforms['uLightPosition'] = this.transform.position;
  data.uniforms['uSpotDirection'] = this.spotDirection;
  data.uniforms['uSpotInnerAngle'] = this.innerAngle;
  data.uniforms['uSpotOuterAngle'] = this.outerAngle;
  data.uniforms['uLightRadius'] = this.radius;
  data.uniforms['uLightView'] = this.getView([0, 0, 0]);
  data.uniforms['uLightModel'] = this.transform.matrix();
  return data;
};
/**
 * @param  {LEEWGL.Light.SpotLight} spotLight
 * @param  {bool} cloneID
 * @param  {bool} recursive
 * @param  {bool} addToAlias
 * @return {LEEWGL.Light.SpotLight} spotLight
 */
LEEWGL.Light.SpotLight.prototype.clone = function(spotLight, cloneID, recursive, addToAlias) {
  if (typeof spotLight === 'undefined')
    spotLight = new LEEWGL.Light.SpotLight(this.options);

  LEEWGL.Light.prototype.clone.call(this, spotLight, cloneID, recursive, addToAlias);

  vec3.copy(spotLight.spotDirection, this.spotDirection);
  spotLight.radius = this.radius;
  spotLight.outerAngle = this.outerAngle;
  spotLight.innerAngle = this.innerAngle;
  return spotLight;
};

/**
 * @constructor
 * @augments LEEWGL.Light
 * @param  {number} options.radius
 */
LEEWGL.Light.PointLight = function(options) {
  LEEWGL.Light.call(this, options);

  var ext_options = {
    'radius': 20
  };

  this.addOptions(ext_options);
  this.setOptions(options);

  this.lightType = 'Point';
  this.shaderType = LEEWGL.ShaderLibrary.POINT;
  this.radius = this.options.radius;

  this.setEditables();
};

LEEWGL.Light.PointLight.prototype = Object.create(LEEWGL.Light.prototype);

/**
 * Calls LEEWGL.Light.setEditables
 */
LEEWGL.Light.PointLight.prototype.setEditables = function() {
  LEEWGL.Light.prototype.setEditables.call(this);

  var editables = {
    'radius': {
      'name': 'Radius',
      'alias': 'radius',
      'type': 'number',
      'value': this.radius
    }
  };

  addToJSON(this.editables, editables);
  addPropertyToAllJSON(this.editables, 'alias');
};
/**
 * Generates a lookAt matrix with given eye position
 * @param  {vec3} target - where the viewer is looking at
 * @return  {mat4} view
 */
LEEWGL.Light.PointLight.prototype.getView = function(target) {
  var view = mat4.create();
  mat4.lookAt(view, this.transform.position, target, this.up);
  return view;
};
/**
 * Generates a projection matrix with given this.outerAngle
 * @return  {mat4} projection
 */
LEEWGL.Light.PointLight.prototype.getProjection = function() {
  var angle = LEEWGL.Math.degToRad(90);
  var projection = mat4.create();
  mat4.perspective(projection, angle, 1.0, 1.0, 100);
  return projection;
};
/**
 * Generates a view-projection matrix
 * @return  {mat4} mat
 */
LEEWGL.Light.PointLight.prototype.matrix = function(target) {
  var view = this.getView(target);
  var proj = this.getProjection();
  return mat4.multiply(mat4.create(), proj, view);
};
/**
 * Returns render data in form of json array
 * @returns  {object} data
 */
LEEWGL.Light.PointLight.prototype.renderData = function() {
  var data = LEEWGL.Light.prototype.renderData.call(this);
  data.uniforms['uLightPosition'] = this.transform.position;
  data.uniforms['uLightRadius'] = this.radius;
  data.uniforms['uLightView'] = this.getView([0, 0, 0]);
  data.uniforms['uLightModel'] = this.transform.matrix();
  data.uniforms['uLightViewModel'] = mat4.multiply(mat4.create(), this.getView([0, 0, 0]), this.transform.matrix());
  return data;
};
/**
 * @param  {LEEWGL.Light.PointLight} pointLight
 * @param  {bool} cloneID
 * @param  {bool} recursive
 * @param  {bool} addToAlias
 * @return {LEEWGL.Light.PointLight} pointLight
 */
LEEWGL.Light.PointLight.prototype.clone = function(pointLight, cloneID, recursive, addToAlias) {
  if (typeof pointLight === 'undefined')
    pointLight = new LEEWGL.Light.PointLight(this.options);

  LEEWGL.Light.prototype.clone.call(this, pointLight, cloneID, recursive, addToAlias);
  pointLight.radius = this.radius;
  return pointLight;
};

/**
 * @constructor
 * @param  {vec3} options.ambient
 * @param  {vec3} options.diffuse
 * @param  {vec3} options.specular
 */
LEEWGL.Material = function(options) {
  this.options = {
    'ambient': [0.5, 0.5, 0.5],
    'diffuse': [1.0, 1.0, 1.0],
    'specular': [0.3, 0.3, 0.3]
  };

  extend(LEEWGL.Material.prototype, LEEWGL.Options.prototype);
  this.setOptions(options);

  this.renderData = function() {
    return {
      'uniforms': {
        'uMaterialAmbientColor': this.options.ambient,
        'uMaterialDiffuseColor': this.options.diffuse,
        'uMaterialSpecularColor': this.options.specular
      }
    };
  };
};
