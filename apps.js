(function(w) {
if (w.fastXDM) return;

var handlers = {};
var onEnvLoad = [];
var env = {};

// Key generation
function genKey() {
  var key = '';
  for (i=0;i<5;i++) key += Math.ceil(Math.random()*15).toString(16);
  return key;
}

function waitFor(obj, prop, func, self,  count) {
  if (obj[prop]) {
     func.apply(self);
  } else {
    count = count || 0;
    if (count < 1000) setTimeout(function() {
      waitFor(obj, prop, func, self, count + 1)
    }, 0);
  }
}

function attachScript(url) {
  setTimeout(function() {
    var newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.src = url || w.fastXDM.helperUrl;
    waitFor(document, 'body', function() {
      document.getElementsByTagName('HEAD')[0].appendChild(newScript);
    });
  }, 0);
}

// Env functions
function getEnv(callback, self) {
  if (env.loaded) {
    callback.apply(self, [env]);
  } else {
    onEnvLoad.push([self, callback]);
  }
}

function envLoaded() {
  env.loaded = true;
  if (onEnvLoad.length > 0) {
    for (callback in onEnvLoad) onEnvLoad[callback][1].apply(onEnvLoad[callback][0], [env]);
  }
}

function applyMethod(strData, self) {
  getEnv(function(env) {
    var data = env.json.parse(strData);
    if (data[0]) {
      if (!data[1]) data[1] = [];
      for (i in data[1]) {
        if (data[1][i] && data[1][i]._func) {
          var funcNum = data[1][i]._func;
          data[1][i] = function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('_func'+funcNum);
            self.callMethod.apply(self, args);
          }
        }
      }
      setTimeout(function() {
        if (!self.methods[data[0]]) {
          throw Error('fastXDM: Method ' + data[0] + ' is undefined');
        }
        self.methods[data[0]].apply(self, data[1]);
      }, 0);
    }
  });
}

// XDM object
w.fastXDM = {
  _id: 0,
  helperUrl: 'http://userapi.com/js/api/xdmHelper.js',

  Server: function(methods) {
    this.methods = methods || {};
    this.id = w.fastXDM._id++;
    this.key = genKey();

    this.methods['%init%'] = this.methods['__fxdm_i'] = function() {
      w.fastXDM.run(this.id);
      if (this.methods['onInit']) this.methods['onInit']();
    };
    this.frameName = 'fXD'+this.key;
    this.server = true;
    handlers[this.key] = [applyMethod, this];
  },

  Client: function(methods) {
    this.methods = methods || {};
    this.id = w.fastXDM._id++;
    w.fastXDM.run(this.id);
    if (window.name.indexOf('fXD') == 0) {
      this.key = window.name.substr(3);
    } else {
      throw Error('Wrong window.name property.');
    }
    this.caller = window.parent;
    handlers[this.key] = [applyMethod, this];
    this.client = true;

    w.fastXDM.on('helper', function() {
      w.fastXDM.onClientStart(this);
    }, this);

    getEnv(function(env) {
      env.send(this, env.json.stringify(['%init%']));

      var methods = this.methods;
      setTimeout(function() {
        if (methods['onInit']) methods['onInit']();
      }, 0);
    }, this);
  },

  onMessage: function(e) {
    if (!e.data) return false;
    var key = e.data.substr(0, 5);
    // s(JSON.stringify(handlers));
    if (handlers[key]) handlers[key][0](e.data.substr(6), handlers[key][1]);
  },

  setJSON: function(json) {
    env.json = json;
  },

  getJSON: function(callback) {
    if (!callback) return env.json;
    getEnv(function(env) {
      callback(env.json);
    });
  },

  setEnv: function(exEnv) {
    for (i in exEnv) {
      env[i] = exEnv[i];
    }
    envLoaded();
  },

  _q: {},

  on: function(key, act, self) {
    if (!this._q[key]) this._q[key] = [];
    if (this._q[key] == -1) {
      act.apply(self);
    } else {
      this._q[key].push([act, self]);
    }
  },

  run: function(key) {
    if (this._q[key] && this._q[key].length > 0) {
      for (i in this._q[key]) this._q[key][i][0].apply(this._q[key][i][1]);
    }
    this._q[key] = -1;
  },

  waitFor: waitFor
}


w.fastXDM.Server.prototype.start = function(obj, count) {
  if (obj.contentWindow) {
    this.caller = obj.contentWindow;
    this.frame = obj;

    w.fastXDM.on('helper', function() {
      w.fastXDM.onServerStart(this);
    }, this);

  } else { // Opera old versions
    var self = this;
    count = count || 0;
    if (count < 50) setTimeout(function() {
      self.start.apply(self, [obj, count+1]);
    }, 100);
  }
}

w.fastXDM.Server.prototype.destroy = function() {
  if (handlers && handlers.indexOf) {
    handlers.splice(handlers.indexOf(this.key), 1);
  }
}

function extend(obj1, obj2){
  for (var i in obj2) {
    if (obj1[i] && typeof(obj1[i]) == 'object') {
      extend(obj1[i], obj2[i])
    } else {
      obj1[i] = obj2[i];
    }
  }
}

w.fastXDM.Server.prototype.append = function(obj, options, attrs) {
  var div = document.createElement('DIV');
  div.innerHTML = '<iframe name="'+this.frameName+'" '+(attrs || '')+' />';
  var frame = div.firstChild;
  var self = this;
  setTimeout(function() {
    frame.frameBorder = '0';
    if (options) extend(frame, options);
    obj.insertBefore(frame, obj.firstChild);
    self.start(frame);
  }, 0);
  return frame;
}

w.fastXDM.Client.prototype.callMethod = w.fastXDM.Server.prototype.callMethod = function() {
  var args = Array.prototype.slice.call(arguments);
  var method = args.shift();
  for (i in args) {
    if (typeof(args[i]) == 'function') {
      this.funcsCount = (this.funcsCount || 0) + 1;
      var func = args[i];
      var funcName = '_func' + this.funcsCount;
      this.methods[funcName] = function() {
        func.apply(this, arguments);
        delete this.methods[funcName];
      }
      args[i] = {_func: this.funcsCount};
    }
  }
  waitFor(this, 'caller', function() {
    w.fastXDM.on(this.id, function() {
      getEnv(function(env) {
        env.send(this, env.json.stringify([method, args]));
      }, this);
    }, this);
  }, this);
}

if (w.JSON && typeof(w.JSON) == 'object' && w.JSON.parse && w.JSON.stringify && w.JSON.stringify({a:[1,2,3]}).replace(/ /g, '') == '{"a":[1,2,3]}') {
  env.json = {parse: w.JSON.parse, stringify: w.JSON.stringify};
} else {
  w.fastXDM._needJSON = true;
}

// PostMessage cover
if (w.postMessage) {
  env.protocol = 'p';
  env.send = function(xdm, strData) {
    xdm.caller.postMessage(xdm.key+':'+strData, "*");
  }
  if (w.addEventListener) {
    w.addEventListener("message", w.fastXDM.onMessage, false);
  } else {
    w.attachEvent("onmessage", w.fastXDM.onMessage);
  }

  if (w.fastXDM._needJSON) {
    w.fastXDM._onlyJSON = true;
    attachScript();
  } else {
    envLoaded();
  }
} else {
  attachScript();
}

})(window);


function appCallback(args) {
  var method = args.shift();
  if (cur.app && cur.app.funcs) {
    if (!cur.app.funcs[method]) {
      setTimeout(function() {
        throw new Error('unsupported app method: ' + method);
      }, 0);
    }
    setTimeout(function() {
      return cur.app.funcs[method].apply(cur.app, args);
    }, 0);
    return true;
  }
  return true;
}

var vkApp = function(cont, options, params, onInit) {
  params = params || {};
  options = options || {};
  if (window.parent && window.parent != window && !options.checking) {
    return false;
  }
  var self = this;
  this.cont = ge(cont);
  if (!this.cont) {
    return;
  }

  params.hash = (params.hash || '');
  if (params.hash.indexOf('#') != -1) {
    var cut = params.hash.split('#').pop();
    if ((cut || '').substr(0, 1) == vk.navPrefix) {
      params.hash = '';
    } else {
      params.hash = cut;
    }
  }

  this.params = params;

  this.onReady = new Array();

  if (options.type == 1) { // IFrame
    var url = options.src;
    var urlParams = [];
    for (var i in params) {
      if (i == 'hash') {
        urlParams.push(i+'='+encodeURIComponent(params[i]));
      } else {
        urlParams.push(i+'='+params[i]);
      }
    }
    url += ((url.indexOf('?') == -1) ? '?' : '&') + urlParams.join('&');
  }
  if (options.inlineApp) {
    self.inlineApp = true;
  }
  self.options = extend({
    heightMax:  4500
  }, options);

  this.funcs = {
    onInit: function() {
      if (options.heightSync) {
        self.RPC.callMethod('getHeight', function(height) {
          self.setHeight(height)
        })
      }
      if (!self.inited) {
        self.inited = true;
        if (onInit) onInit();
        if (!self.inlineApp) {
          self.onAppReady();
        }
      }
      return true;
    },
    ApiCall: function(args, callback) {
      var method = args.shift();
      self.api(method, args[0], callback)
    },
    _getAppInfo: function(callback) {
      callback([self.params.api_id, window.location.hash]);
    },
    api: function(callId, method, args) { // flash callbacks
      self.api(method, args, function(data) {
        self.apiCallback(callId, data);
      });
    },
    setHeight: function(height) {
      self.setHeight(height);
    },
    scrollWindow: function(y, speed) {
      if (self.inlineApp) return;
      var scrollTop = Math.max(y, 0);
      speed = intval(speed);
      if (speed && speed > 0) {
        animate(htmlNode, {scrollTop: scrollTop}, speed);
        animate(bodyNode, {scrollTop: scrollTop}, speed);
      } else {
        window.scroll(0, scrollTop);
      }
    },
    scrollTop: function(subscribe) {
      var ch = window.innerHeight || document.documentElement.clientHeight || bodyNode.clientHeight;
      if (!cur.appTopOffset) {
        cur.appTopOffset = getXY(cur.app.cont)[1];
      }
      var idle = 0;
      if (curNotifier && curNotifier.idle_manager && curNotifier.idle_manager.is_idle) {
        idle = 1;
      }
      cur.app.runCallback('onScrollTop', parseInt(scrollGetY()), parseInt(ch), parseInt(cur.appTopOffset), idle);
    },
    scrollSubscribe: function(fireEvent) {
      var onScr = function() {
        var ch = window.innerHeight || document.documentElement.clientHeight || bodyNode.clientHeight;
        self.runCallback('onScroll', parseInt(scrollGetY()), parseInt(ch));
      }
      var subscribe = function() {
        addEvent(browser.msie6 ? pageNode : window, 'scroll', onScr);
      }
      subscribe();
      if (fireEvent) {
        onScr();
      }
      if (cur._back) {
        cur._back.show.push(subscribe);
        cur._back.hide.push(function() {
          removeEvent(browser.msie6 ? pageNode : window, 'scroll', onScr);
        })
      } else {
        cur.destroy.push(function() {
          removeEvent(browser.msie6 ? pageNode : window, 'scroll', onScr);
        });
      }
    },
    saveWallPost: function(hash) {
      showBox('al_apps.php', {act: 'save_wall_post_box', hash: hash, aid: cur.aid});
    },
    showRequestBox: function(uid, message, requestKey) {
      showBox('al_apps.php', {act: 'show_request_box', aid: cur.aid, message: message, uid: uid, request_key: requestKey}, {params:{width: 430}, onFail: function(text) {
        cur.app.runCallback('onRequestFail', text);
        return true;
      }});
    },
    showProfilePhotoBox: function(hash) {
      showBox('al_apps.php', {act: 'show_profile_photo_box', hash: hash, aid: cur.aid});
    },
    setTitle: function(text) {
      if (self.inlineApp) return;
      text = text.replace(/[<>]+/gi, '');
      document.title = getLang('global_vkontakte')  + (text ? (' | ' + text) : '');
    },
    resizeWindow: function(width, height) {
      self.setWidth(width);
      self.setHeight(height);
    },
    getLocationProtocol: function(callback) {
      callback(location.protocol);
    },
    setLocation: function(loc, fireEvent) {
      loc = loc.toString();
      cur.appLoc = loc;
      if (fireEvent) {
        cur.app.runCallback('onLocationChanged', loc);
      }
      nav.setLoc(extend(nav.objLoc, {'#': loc}));
      //nav.change({'#': loc});
    },
    setNavigation: function() {
      return;
    },
    showInstallBox: function() {
      if (cur.appUser) {
        Apps.onAppAdded();
      } else {
        if (cur.installBoxShown) {
          return;
        }
        cur.installBoxShown = true;
        var box = showBox('apps', {act: 'install_box', aid: options.aid});
        box.setOptions({onHide: function() {
          setTimeout(function() {
            cur.installBoxShown = false;
          }, 3000);
        }});
      }
    },
    showSettingsBox: function(mask) {
      if (cur.settingsBoxShown) {
        return;
      }
      cur.settingsBoxShown = true;
      var box = showBox('apps', {act: 'settings_box', aid: options.aid, mask: mask});
      box.setOptions({onHide: function() {
        setTimeout(function() {
          cur.settingsBoxShown = false;
        }, 3000);
      }});
    },
    showInviteBox: function()  {
      Apps.showInviteBox(options.aid, options.hash);
    },
    showPaymentBox: function(votes) {
      showBox('al_apps.php', {act: 'show_payment_box',  votes: votes, aid: options.aid});
    },
    showLeadsPaymentBox: function(lead_id) {
      showBox('al_apps.php', {act: 'show_payment_box', aid: options.aid, offers: isArray(lead_id) ? lead_id.join(",") : (intval(lead_id) || 1)});
    },
    showOrderBox: function(params) {
      if (typeof params != 'object') {
        var args = Array.prototype.slice.call(arguments);
        params = {};
        each(args, function(){
          var kv = this.split('=');
          if (kv.length == 2) params[kv[0]] = kv[1];
        });
      }
      for (var i in params) {
        if (!inArray(i, ['type', 'votes', 'offer_id', 'item', 'currency'])) {
          delete params[i];
        }
      }
      if (params.type == 'offers' && isArray(params.offer_id)) {
        params.offer_id = params.offer_id.join(',');
      }
      params.act = 'show_order_box';
      params.aid = options.aid;
      showBox('al_apps.php', params, {
        onFail: function(error) {
          showFastBox(getLang('global_error'), error);
          return true;
        }
      });

      cur.onAppOrderCancel = function() {
        cur.app.runCallback('onOrderCancel');
      }
      cur.onAppOrderSuccess = function(appOrderId) {
        cur.app.runCallback('onOrderSuccess', appOrderId);
      }
      cur.onAppOrderFail = function(errorCode) {
        cur.app.runCallback('onOrderFail', errorCode);
      }
    },
    showMerchantPaymentBox: function(params) {
      if (self.inlineApp) return;
      if (typeof params != 'object') {
        var args = Array.prototype.slice.call(arguments);
        params = {};
        each(args, function(){
          var kv = this.split('=');
          if (kv.length == 2) params[kv[0]] = kv[1];
        });
      }
      // Clear parameters
      var trash = [];
      for (var i in params) {
        if ((i == 'merchant_id') || (i == 'required_fields')) {
          continue;
        }
        if (i.indexOf('custom_') == 0) {
          continue;
        }
        if (i.indexOf('item_') == 0) {
          var part = i.substr(5);
          var allowed = ['id_', 'name_', 'description_', 'price_', 'currency_', 'quantity_', 'photo_url_', 'digital_'];
          var found = false;
          for (var j in allowed) {
            if (part.indexOf(allowed[j]) == 0) {
              found = true;
              break;
            }
          }
          if (found) {
            continue;
          }
        }
        trash.push(i);
      }

      // Test mode
      var testMode = 1;
      if ('test_mode' in params) {
        testMode = ((params.test_mode.toString() == '0') ? 0 : 1);
      }

      for (var i in trash) {
        delete params[trash[i]];
      }

      params.show_in_box = 1;

      var url = testMode ? 'al_paytest.php' : 'al_pay.php';

      //stManager.add(['selects.js']);
      cur.payMerchantBox = showBox(url, params, {
        params: {
          bodyStyle: 'padding: 0;',
          width: 534
        },
        stat: ['selects.js', 'pay.css', 'ui_controls.js', 'ui_controls.css'],
        onFail: function(error) {
          showFastBox(getLang('global_error'), error);
          return true;
        }
      });

      cur.onMerchantPaymentCancel = function() {
        cur.app.runCallback('onMerchantPaymentCancel');
      }

      cur.onMerchantPaymentSuccess = function(merchant_order_id) {
        cur.app.runCallback('onMerchantPaymentSuccess', merchant_order_id);
      }

      cur.onMerchantPaymentFail = function(errorCode) {
        cur.app.runCallback('onMerchantPaymentFail', errorCode);
      }
    },
    showPortlet: function(options) {
      if (!options.url) {
        throw new Error('showPortlet Error: no options.src passed');
      }
      if (options.title) {
        var title = options.title.replace(/[<>&]*/g, '');
      } else {
        var title = 'No Title';
      }
      var opts = {
        title: title,
        height: intval(options.height) || 300,
        width: intval(options.width) || 200,
        x: intval(options.x) || 10,
        y: intval(options.y) || 10,
        minH: intval(options.minHeight) || 100,
        onHold: function(on) { // window is moving or scrolling
          //console.log('here', on);
        },
        content: '<div class="fc_content_overflow"></div>'
      };
      opts.content = '';
      defBox(opts, function(box) {
        var appOpts = {
          aid: cur.app.options.aid,
          src: options.url,
          type: 1,
          widget: true,
          width: opts.width - 20,
          height: opts.height - 20,
          heightSync: true,
          boxed: true,
          onResize: function() {
            box.update();
          }

        };
        var i = 8, lcName = '';
        while (i--) {
          lcName += Math.floor(Math.random() * 100 % 16).toString(16);
        }
        var appParams = extend(cur.app.params, {
          lc_name: lcName
        });
        box.app = new vkApp(box.cont, appOpts, appParams);
      });

      //opts.content = self.boxApp(options);
    },
    addToMenu: function() {
      ajax.post('al_apps.php', {act: 'add_left_menu', aid: cur.aid, hash: cur.app.options.hash}, {
        onDone: function (html) {
          geByTag1('ol', ge('side_bar')).innerHTML = html;
        }
      });
    },
    adsPublish: function() {
      AdsLight.handleEvent.apply(AdsLight, arguments);
    },
    debug: function() {
      debugLog((arguments.length == 1) ? arguments[0] : arguments);
    }
  };

  if (params.widget) {
    self.options.type = 1;
    self.options.widget = true;
  } else if (self.options.type != 2) {
    renderFlash(ge('flash_api_external_cont'), {
      url: 'swf/api_external.swf',
      id: 'flash_api_external',
      width: 1,
      height: 1,
      preventhide: 1,
      version: 9
    }, {
      allowFullScreen: true,
      allowscriptaccess: 'always',
      allownetworking: 'all',
      wmode: 'opaque'
    }, {
      debug: (params.debug ? 1 : 0),
      lc_name: params.lc_name
    });


    self.externalFrame = ge('flash_api_external');
  }

  var wmode = self.options.wmode || 'opaque';

  if (self.options.no_init) {
    return false;
  }

  var res = 1;
  switch (self.options.type) {
    case 1: // Iframe App
      this.RPC = new fastXDM.Server(this.funcs);
      var frameParams = {
        src: url,
        width: '100%',
        overflow: 'hidden',
        scrolling: 'no'
      };
      if (!self.options.widget) {
        frameParams.height = self.options.height+'px';
      }
      this.frame = this.RPC.append(self.cont, frameParams, 'webkitallowfullscreen="true" mozallowfullscreen="true" allowfullscreen="true"');
      break;
    case 2: // Flash Wrapper App
      var opts = {
        url: options.src,
        id: 'flash_app',
        width: self.options.width,
        height: self.options.height,
        version: 9
      }
      if (wmode == 'opaque') {
        opts.preventhide = 1;
      }
      res = renderFlash(self.cont, opts, {allowFullScreen: true, allowscriptaccess: 'sameDomain', allowFullScreenInteractive: 'true', allownetworking: 'all', bgcolor: '#F7F7F7', wmode: wmode}, params);
      self.frame = ge('flash_app');
      break;
    case 3: // flash app
      var opts = {
        url: options.src,
        id: 'flash_app',
        width: self.options.width,
        height: self.options.height,
        version: 9
      }
      if (wmode == 'opaque') {
        opts.preventhide = 1;
      }
      res = renderFlash(self.cont, opts, {allowFullScreen: true, allownetworking: 'all', allowscriptaccess: 'never', allowFullScreenInteractive: 'true', wmode: wmode}, params);
      self.frame = ge('flash_app');
      break;
  }

  if (!res) {
    self.cont.innerHTML = '<div class="apps_no_flash_msg"><img src="/images/upload.gif" /></div>';
    ajax.post('al_apps.php', {act: 'no_flash', total: (browser.iphone || browser.ipad) ? 1 : 0}, {
      onDone: function(info) {
        self.cont.innerHTML = info;
      }
    })
  }

  if (params.widget) {
    setTimeout(function() {
      if (!self.inited) {
        show('app_connect_error');
      }
    }, 8000);
  }

  cur.destroy.push((function() {
    if (this.RPC) {
      this.RPC.destroy();
    }
  }).bind(this));

}

vkApp.prototype.boxApp = function(options) {
  //var boxApp = new vkApp();
}

vkApp.prototype.onAppReady = function() {
  for (var i in this.onReady) {
    this.onReady[i]();
  }
  /*setTimeout(function() {
  cur.app.runCallback('onStageResize', 627, 230);
  }, 3000);*/
}

vkApp.prototype.runCallback = function() {
  var args = Array.prototype.slice.call(arguments);
  var method = args[0];
  var eventName = 'customEvent';
  if ('onLocationChanged,onMerchantPaymentSuccess,onBalanceChanged,onWindowResized,onSettingsChanged'.indexOf(method)!= -1) {
    eventName = method;
    var fArgs = args.slice(1);
  } else {
    var fArgs = args.slice();
  }
  switch(this.options.type) {
    case 1:
      this.RPC.callMethod('runCallback', args);
      if (!this.options.widget && !browser.iphone && !browser.ipad) {
        try {
          this.externalFrame[eventName](fArgs);
        } catch(e) {}
      }
      break;
    case 2:
      this.frame[eventName](fArgs);
      break;
    case 3:
      this.externalFrame[eventName](fArgs);
      break;
  }
}

vkApp.prototype.apiCallback = function(callId, data) {
  var args = Array.prototype.slice.call(arguments);
  try {
    if (this.options.type == 2) {
      this.frame.apiCallback(callId, data);
    } else {
      this.externalFrame.apiCallback(callId, data);
    }
  } catch(e) {
    // pass
  }
}

vkApp.prototype.setHeight = function(height) {
  if (!height) return;
  if (this.inlineApp && height > this.options.heightMax) {
    height = this.options.heightMax;
  }
  var h = height + 'px';
  this.frame.style.height = h;
  if (!this.options.boxed) {
    this.cont.style.height = h;
  }
  if (this.options.onResize) {
    this.options.onResize();
  }
}

vkApp.prototype.setWidth = function(width) {
  if (!width || this.inlineApp) return;
  if (!cur.app) return;
  var size = getSize(cur.app.cont);
  width = Math.min(Math.max(width, 100), 1000);
  handlePageView({
    width: Math.max(width, 625)+166
  });
  this.frame.style.width = this.cont.style.width = width + 'px';
}

vkApp.prototype.balanceUpdated = function(money) {
  this.runCallback('onBalanceChanged', money);
}

vkApp.prototype.checkMethod = function(method, params, callback) {
  var m = method.toLowerCase();
  if (m == 'wall.post' || m == 'activity.set') {
    showBox('apps', {
      act: 'wall_post_box',
      aid: this.options.aid,
      owner_id: params['owner_id'],
      attachments: params['attachments'] || params['attachment'],
      text: params[m == 'wall.post' ? 'message' : 'text'],
      method: m
    }, {params: {width: '430px'}});

    var self = this;
    cur.apiWallPost = function(hash, error) {
      if (error) {
        if (callback) {
          callback({error: error});
        }
      } else {
        self.api(method, extend(params, {method_access: hash}), callback);
      }
    };
    return false;
  }
  return true;
}

vkApp.prototype.checkMethodResult = function(method, params, data, callback) {
  switch(method) {
    case 'photos.saveProfilePhoto':
      if (!data.error) {
        cur.profilePhotoBoxCallback = function(success) {
          if (success) {
            callback({response: {'photo_src': data.response['photo_src']}});
          } else {
            callback({error: {error_code: 10007, error_msg: "Operation denied by user"}});
          }
          window.profilePhotoBoxCallback = false;
        }
        cur.app.funcs.showProfilePhotoBox(data.response['photo_hash']);
        return false;
      }
      break;
  }
  return true;
}

vkApp.prototype.onLocChanged = function(strLoc) {
  //if (cur.appLoc == strLoc) return;
  if (!strLoc) {
    strLoc = '';
  }
  if (cur.appLoc == strLoc) return;
  cur.appLoc = strLoc;
  this.runCallback('onLocationChanged', strLoc);
}

vkApp.prototype.api = function(method, inputParams, callback, captcha) {
  var self = this;
  if (arguments.length == 2) {
    callback=params;
    inputParams={};
  }

  if (!inputParams) {
    inputParams = {};
  }

  if (!captcha && !inputParams.method_access && !inputParams.method_force && !this.checkMethod(method, inputParams, callback)) {
    return;
  }

  var params = {
    v: '3.0',
    api_id: this.params.api_id,
    method: method,
    format: 'json',
    rnd: parseInt(Math.random()*10000)
  }

  if (inputParams) {
    for (var i in inputParams) {
      params[i] = inputParams[i];
    }
  }

  var lParams=[];
  for (i in params) {
    lParams.push([i,params[i]]);
  }

  function sName(i, ii) {
    if (i[0] > ii[0])
    return 1;
    else if (i[0] < ii[0])
    return -1;
    else
    return 0;
  }

  lParams.sort(sName);
  var sig = this.params.viewer_id;
  for (i in lParams) {
    sig += lParams[i][0] + '=' + lParams[i][1];
  }
  sig += this.params.secret;
  params.sid = this.params.sid;

  stManager.add('md5.js', function() {
    params.sig = MD5(sig);
    var done = function(text) {
      var response = eval('('+text+')');
      if (response.error && response.error.error_code == 14) { // Captcha needed
        cur.appCaptcha = showCaptchaBox(response.error.captcha_sid, 0, false, {
          onSubmit: function(sid, value) {
            inputParams['captcha_sid'] = sid;
            inputParams['captcha_key'] = value;
            self.api(method, inputParams, callback, true);
            cur.appCaptcha.setOptions({onHide: function(){}}).hide();
          },
          onHide: function() {
            callback(response);
          },
          imgSrc: response.error.captcha_img
        });
      } else {
        if (captcha) {
          cur.appCaptcha.setOptions({onHide: function(){}}).hide();
        }
        if (!self.checkMethodResult(method, inputParams, response, callback)) {
          return;
        } else if (callback) {
          callback(response);
        }
      }
    }
    var fail = function() {
      debugLog('Ajax fail');
    }

    ajax.plainpost(self.params['api_script'] || '/api.php', params, done, fail);
  });
}


var Apps = { // can be removed soon
  address: 'apps',
  init: function(obj, appTpl, appRecTpl, appMagusTpl) {
    extend(cur, {
      searchCont: ge('apps_search'),
      module: 'apps',
      aSearch: ge('s_search'),
      clearSearch: ge('apps_query_reset'),
      aContent: ge('app_rows'),
      sContent: ge('app_search_list'),
      sPreload: ge('app_search_preload'),
      sWrap: ge('app_search_wrap'),
      summary: ge('apps_summary'),
      sSummary: ge('app_search_summary'),
      progress: ge('apps_summary_progress'),
      showMore: ge('more_link'),
      sShowMore: ge('s_more_link'),
      showRecMore: ge('rec_more_link'),
      recommendations: ge('app_recommend'),
      appTpl: appTpl,
      appRecTpl: appRecTpl,
      appMagusTpl: appMagusTpl
    });

    cur.onSilentLoad = [];

    extend(cur, obj);
    extend(cur, {
      defaultCount: cur.shownApps,
      appsPerPage: 20,
      recsPerPage: 15,
      settingsPerPage: 10,
      recsInitCount: 20,
      deletedCount: 0
    });
    if (cur.recJSON) {
      cur.recCount = cur.recJSON.length;
    }

    placeholderSetup(cur.aSearch, {back: true});

    Apps.scrollnode = browser.msie6 ? pageNode : window;
    window.scrollTop = bodyNode.scrollTop = pageNode.scrollTop = htmlNode.scrollTop = 0;

    cur._back = {
      show: [Apps.startEvents.pbind(cur), Apps.backToCatalog],
      hide: [Apps.stopEvents.pbind(cur)],
      text: cur.backLang
    };
    Apps.startEvents(cur);

    setTimeout(function() {
      var cl = nav.curLoc ? nav.fromStr(nav.curLoc) : nav.objLoc;
      cur.searchStr = cl.q || '';
      if (cur.add) {
        ge('s_gr_search').focus();
      } else {
        cur.aSearch.focus();
      }
    }, 0);

    cur.apps = {};

    if (!cur.silent_mode) return;
    cur.silent = true;
    var query = {act: 'load_apps_silent', gid: cur.gid, section: cur.section};
    if (cur.searchType != undefined) {
      query.type = cur.searchType;
    }
    if (!cur.preload) {
      extend(query, {preload: 1});
    }
    ajax.post(Apps.address, query, {ads: (!!cur.preload), onDone: (function(data, opts, preload) {
      if (opts) {
        opts = eval('('+opts+')');
        extend(opts.summaryLang, cur.summaryLang);
        extend(cur, opts);
      }
      if (query.preload) {
        cur.preload = preload;
      }
      var obj = eval('('+data+')');
      if (!obj) {
        cur.silent = false;
        return;
      }
      cur.searchOffset = 0;
      var isMagus = cur.section == 'catalog' && cur.catalogSection == 'magus';
      cur.curList = isMagus ? 'magus' : 'all';
      cur.appsList = obj[cur.curList] ? obj : isMagus ? {magus:[]} : {all:[]};
      if (cur.section == 'catalog' && !cur.searchStr) {
        cur.sectionCount = 0;
      } else {
        cur.sectionCount = (cur.appsList[cur.curList] || []).length;
      }
      this.indexAll(function() {
        cur.silent = false;
        if (cur.onSilentLoad) {
          for (var i in cur.onSilentLoad) {
            cur.onSilentLoad[i]();
          }
        }
      });
    }).bind(this)});
    if (cur.section == 'apps' && !cur.scores) {
      Apps.setScores();
    }
    cur.feedHideEls = [];
    var ddAppsCont = ge('apps_cat_summary_type');
    if (ddAppsCont) {
      cur.appsTypeDD = new DropdownMenu(cur.appsTypes, {
        target: ddAppsCont,
        value: 0,
        fadeSpeed: 0,
        containerClass: 'apps_summary_dd',
        onSelect: function(ev) {
          var ind = ev.target.index;
          return Apps.switchType(ind);
        }
      });
    }
  },

  initUpdates: function(opts) {
    cur.updatesKey = opts.key;
    var checkCb = function() {
      if (window.Notifier) {
        var res = Notifier.addKey(cur.updatesKey, function(key, data) {
          if (!cur.updatesKey) {
            return;
          }
          if (data.events) {
            for (var i in data.events) {
              Apps.parseEvent(data.events[i]);
            }
          }
          if (data.ts) {
            cur.updatesKey.ts = data.ts;
          }
        });
      }
    };
    checkCb();
    checkInt = setInterval(checkCb, 10000);
    cur.destroy.push(function () {
      clearInterval(checkInt);
    });
  },

  parseEvent: function(ev) {
    var ev = ev.split('<!>');
    var html = ev[3];
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    if (h < 10) {
      h = '0'+h;
    }
    if (m < 10) {
      m = '0'+m;
    }
    html = html.replace('{date}', h+':'+m);
    var el = se(html);
    var cont = ge('apps_feed_list');
    var appsEls = geByClass('apps_recent_row', ge('apps_recent_list'));
    var appsCount = appsEls.length;
    var feedEls = geByClass('apps_feed_row', cont);
    var feedCount = feedEls.length;
    var time = 300;

    if (feedCount && feedCount >= 3) {
      var last = feedEls.pop();
      debugLog('last', last);
      if (cont && last) {
        cont.removeChild(last);
      }
      var preLast = feedEls.pop();
      addClass(preLast, 'apps_feed_last');
      cur.feedHideEls.push(last);
    }

    var c = ce('div', {className: 'apps_feed_animate_cont'});
    c.appendChild(el);
    addClass(el, 'apps_feed_animate_el');
    cont.insertBefore(c, cont.firstChild);

    animate(c, {height: 51}, {duration: time, transition: Fx.Transitions.easeOutCubic}, function() {
      removeClass(el, 'apps_feed_animate_el');
      cont.insertBefore(el, c);
      re(c);
    });
    if (window.tooltips) {
      tooltips.hideAll();
    }
    //var size = getSize(cont);
    //setStyle(cont, {height: size[1], overflow: 'hidden', });
    cur.el = el;
    cur.c = c;
    cur.cont = cont;
  },

  backToCatalog: function() {
    if (window.appsListChanged) {
      var list = ge('apps_recent_list');
      if (list) {
        ajax.post('al_apps.php', {act: 'update_recent'}, {
          onDone: function(html, recent) {
            list.innerHTML = html;
            delete window.appsListChanged;
            if (recent) {
              recent = eval('('+recent+')');
              for (var i in recent) {
                var a = recent[i];
                cur.apps[a[0]] = a;
              }
            }
          },
          showProgress: show.pbind('apps_recent_progress'),
          hideProgress: hide.pbind('apps_recent_progress')
        });
      }
    }
  },

  startEvents: function(cur) {
    addEvent(Apps.scrollnode, 'scroll', Apps.scrollCheck);
    addEvent(window, 'resize', Apps.scrollCheck);
    addEvent(cur.aSearch, 'blur', Apps.searchBlur);
    addEvent(cur.aSearch, 'focus', Apps.searchFocus);
    Apps.startFeatured();
  },

  stopEvents: function(cur) {
    removeEvent(Apps.scrollnode, 'scroll', Apps.scrollCheck);
    removeEvent(window, 'resize', Apps.scrollCheck);
    removeEvent(cur.aSearch, 'blur', Apps.searchBlur);
    removeEvent(cur.aSearch, 'focus', Apps.searchFocus);
    Apps.stopFeatured();
  },

  initAppView: function(params, options) {
    cur.nav.push(function(changed, old, n, opt) {
      if (changed['0'] === undefined && !changed['join'] && !opt.pass) {
        if (changed['#']) {
          cur.app.onLocChanged(changed['#']);
          if (opt.back) {
            if (vk.al != 3) {
              nav.setLoc(n);
            }
          } else {
            nav.setLoc(n);
          }
          return false;
        } else {
          nav.setLoc(n);
          return false;
        }
      }
    });

    var stateCallback = function(e) {
      if (e.type == 'block') {
        cur.app.runCallback('onWindowBlur');
      } else {
        cur.app.runCallback('onWindowFocus');
      }
    };

    cur.app.onReady.push(function() {
      //alert('inited');
      cur.app.onLocChanged(params.hash);
      addEvent(document, 'block unblock', stateCallback, true);
      cur.destroy.push(function() {
        removeEvent(document, 'block unblock', stateCallback);
      });
    });

    if (options.icon) {
      setFavIcon(options.icon);
      cur.destroy.push(function() {
        setFavIcon('/images/favicon' + (vk.intnat ? '_vk' : 'new') + '.ico');
      });
    }
  },

  setFooter: function() {
    if (!cur.footer) {
      return;
    }
    setTimeout(function() {
      var pageFooter = ge('footer_wrap');
      cur.footerBackup = pageFooter.innerHTML;
      pageFooter.innerHTML = cur.footer;
      cur.destroy.push(function() {
        pageFooter.innerHTML = cur.footerBackup;
      });

      if (cur.appMenuItems) {
        cur.adminMenu = Apps.setFooterDD(ge('apps_admin_menu'), cur.appMenuItems);
      }
      if (cur.appMenuTypeItems) {
        cur.adminTypeMenu = Apps.setFooterDD(ge('apps_check_change_type'), cur.appMenuTypeItems);
      }
    }, 0);
  },

  setFooterDD: function(target, items) {
    var p_options = [];
    for (var i in items) {
      var item = items[i];
      p_options.push({i:i, l:item[0], onClick: (function(item) {
        eval(item[1]);
        cur.adminMenu.hide();
        return false;
      }).pbind(item)})
    }
    return new DropdownMenu(p_options, {
      target: target,
      containerClass: 'dd_menu_posts'
    });
  },

  installApp: function(aid, hash, callback) {
    ajax.post(Apps.address, {act: 'do_install', aid: aid, hash: hash}, {onDone: function() {
      Apps.onAppAdded();
      if (callback) {
        callback();
      }
    }});
  },

  onAppAdded: function() {
    if (cur.app) {
      cur.app.runCallback('onApplicationAdded');
      cur.appUser = true;
      hide('apps_install_btn');
      show('apps_show_settings');
    }
  },

  saveSettings: function(aid, hash, onlyCheckboxes, extOpts) {
    if (!onlyCheckboxes) {
      //hide('apps_user_settings_cont');
      //ge('apps_show_settings').innerHTML = '<img src="/images/upload.gif" />';
      //scrollToTop(200);
      if (extOpts && extOpts.btn) {
        lockButton(extOpts.btn);
      }
      show('apps_settings_progress');
    }

    var payAdd = ge('app_pay_add');
    var payWidthdraw = ge('app_pay_withdraw');
    var params = {
      act: 'save_settings',
      aid: aid,
      hash: hash,
      from: 'appview',
      app_settings_1: isChecked(ge('app_settings_1')),
      app_settings_256: isChecked(ge('app_settings_256')),
      add: (payAdd ? payAdd.value : 0),
      withdraw: (payWidthdraw ? payWidthdraw.value : 0),
      only_checkboxes: (onlyCheckboxes ? 1 : 0),
      cur_aid: cur.aid
    };
    if (isVisible('app_settings_2097152')) {
      params.app_settings_2097152 = isChecked(ge('app_settings_2097152'));
    }

    ajax.post('apps', params, extend({
      onDone: function(result) {
        if (extOpts && extOpts.btn) {
          unlockButton(extOpts.btn);
        }
        if (result['left_nav']) {
          val(geByTag1('ol', ge('side_bar')), result['left_nav']);
        }
        if (!onlyCheckboxes) {
          if (cur.app) {
            cur.app.runCallback('onSettingsChanged', result.settings);
          }
        }
        cur.settingsOnLoad = false;
        if (result.coins !== undefined) {
          if (cur.app) {
            cur.app.balanceUpdated(result.coins);
          }
        }
        if (result.balance !== undefined) {
          updateMoney(result.balance);
        }
        var box = curBox();
        if (box && !onlyCheckboxes) {
          box.hide();
        }
      },
      onFail: function(text) {
        ge('apps_settings_error').innerHTML = text;
        show('apps_settings_error');
        hide('apps_settings_progress');
        scrollToTop(200);
      }
    }, extOpts || {}));
  },

  searchFocus: function() {
    var alist = ge('apps_results');
    if (!hasClass(alist, 'light')) addClass(alist, 'light');
  },

  searchBlur: function() {
    var alist = ge('apps_results');
    if (hasClass(alist, 'light')) removeClass(alist, 'light');
  },

  scrollCheck: function () {
    if (browser.mobile || cur.isAppsLoading  || cur.disableAutoMore) return;
    if (!isVisible(cur.showMore) && !isVisible(cur.sShowMore) && !isVisible(cur.showRecMore)) return;
    if (!cur.curList) {
      setTimeout(Apps.scrollCheck, 50);
      return;
    }

    var docEl = document.documentElement;
    var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
    var st = scrollGetY();

    if (isVisible(cur.showMore) && cur.section != 'settings' && st + ch + 400 > cur.showMore.offsetTop) {
      Apps.showRows(true);
    }

    if (isVisible(cur.sShowMore) && st + ch + 400 > cur.sShowMore.offsetTop) {
      Apps.loadRows();
    }

    /*if (cur.moreNewScroll) {
      var moreNew = ge('app_new_more');
      if (isVisible(moreNew) && cur.section == 'catalog' && st + ch + 400 > moreNew.offsetTop) {
        Apps.showMoreNew(moreNew);
      }
    }*/
  },

  indexAll: function(callback) {
    var all = cur.appsList['all'];
    cur.appsIndex = new vkIndexer(all, function(obj) {
      try {
        cur.apps[parseInt(obj[0])] = obj;
        return obj[3];
      } catch(e) { return '';}
    }, function() {
        if (callback) {
          callback();
        }
    });
  },

  drawApp: function(app, last, edit) {
    var score = false;
    if (cur.scores && cur.section == 'apps' && !cur.searchStr) {
      var score = cur.scores[parseInt(app[0])];
    }
    return cur.appTpl(app, last, edit, score);
  },

  drawRecApp: function(app, last) {
    if (cur.catalogSection == 'magus') {
      return cur.appMagusTpl(app, last);
    } else {
      return cur.appRecTpl(app, last);
    }
  },

  updateList: function(e, obj) {
    if (window.tooltips && cur.section == 'catalog' && !cur.searchStr) {
      tooltips.hideAll()
    }
    if (e && e.keyCode == KEY.ESC) {
      return Apps.clearSearch(ge('apps_query_reset'), e);
    }
    if (!cur.section) {
      return Apps.switchTab('apps', false, true);
    }
    if (cur.silent) {
      addClass(cur.searchCont, 'loading');
      cur.onSilentLoad.push(function() {
        removeClass(cur.searchCont, 'loading');
        Apps.updateList(e, obj);
      });
      return;
    }
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout((function() {
      var str = trim(obj.value);
      if (str == cur.searchStr && !cur.justAdded && !cur.ignoreEqual) {
        return;
      }
      if (cur.ignoreEqual) {
        delete cur.ignoreEqual;
      }
      if (str) {
        addClass(cur.clearSearch, 'shown');
      } else {
        removeClass(cur.clearSearch, 'shown');
      }
      if (cur.section == 'apps' && str.length < 2) {
        Apps.hideSearchResults();
      }
      cur.searchStr = str;
      cur.loadMore = 1;
      this.searchApps(str, 'all');
      scrollToTop();
    }).bind(this), 10);
  },

  searchApps: function(str, type) {
    cur.shownApps = 0;
    cur.curSection = type;
    if (str) {
      var htmlentities = function(s){
        var el = document.createElement('div');
        el.innerText = el.textContent = s;
        s = el.innerHTML;
        delete el;
        return s.split('"').join('&quot;');
      }
      var htmlencode = function(str){
        var aStr = str.split(''), i = aStr.length, aRet = [];
        while (i--) {
          var iC = aStr[i].charCodeAt();
          if (iC == 39 || (iC > 127 && iC < 1040) || iC > 1103) {
            aRet.push('&#'+iC+';');
          } else if (iC == 36) {
            aRet.push('&#0'+iC+';');
          } else {
            aRet.push(htmlentities(aStr[i]));
          }
        }
        return aRet.reverse().join('');
      }
      var res = cur.appsIndex.search(htmlencode(str));
      var newList = cur.curSection;
      newList += '_search_'+str;
      cur.curList = newList;
      cur.appsList[cur.curList] = res;

      str += ' '+(parseLatin(str) || '');
      str = trim(escapeRE(str).split('&').join('&amp;'));
      cur.selection = {
        re: new RegExp('('+str.replace(cur.appsIndex.delimiter, '|')+')', 'gi'),
        val: '<span>$1</span>'
      };
    } else {
      cur.curList = cur.curSection;
      cur.selection = false;
    }

    cur.sectionCount = (cur.appsList[cur.curList]) ? Apps.filter(cur.appsList[cur.curList]).length : 0;
    this.filterTimeout = setTimeout((function() {
      hide(cur.sShowMore);
      cur.searchOffset = 0;
      if (!this.showRows(false)) {
        if ((cur.section == 'apps' || cur.section == 'catalog') && cur.sectionCount) {
          this.changeSummary();
        }
      }
    }).bind(this), 10);
  },

  clearSearch: function(el, event) {
    setStyle(el, {opacity: .6});
    cur.aSearch.setValue('');
    cur.aSearch.focus();
    removeClass(cur.clearSearch, 'shown');
    cur.searchStr = '';
    if (cur.section == 'catalog') {
      if (cur.searchSort) {
        cur.searchOffset = 0;
        cur.sectionCount = 0;
        addClass(cur.searchCont, 'loading');
        this.catalogSearch(cur.searchStr, cur.searchOffset);
      } else {
        cur.ignoreEqual = true;
        this.updateList(null, cur.aSearch);
      }
      return;
    }
    this.hideSearchResults();
    var isMagus = (cur.section == 'catalog' && cur.catalogSection == 'magus');
    this.searchApps('', isMagus ? 'magus' : 'all');
    scrollToTop();
  },

  showRows: function(force) {
    if (cur.silent) {
      cur.onSilentLoad.push(function() {
        Apps.showRows(force);
      });
      return;
    }
    if (cur.section == 'settings') {
      this.showSettingsRows();
      return;
    }
    if (!cur.justAdded){
      if (ge('apps_message')) hide('apps_message');
    } else {
      show('apps_message');
      delete cur.justAdded;
    }

    if (cur.section == 'catalog' && !cur.searchStr) {
      cur.searchOffset = 0;
      addClass(cur.searchCont, 'loading');
      cur.sectionCount = 0;
      this.catalogSearch(cur.searchStr, cur.searchOffset);
      return true;
    }

    var list = cur.appsList[cur.curList] || [];
    list = Apps.filter(list).sort(function(a,b) {return a._order - b._order});

    cur.sectionCount = list.length;
    var start = cur.shownApps;
    var count = (cur.searchStr || force) ? cur.appsPerPage : cur.defaultCount;
    var end = start + count;

    var cont = cur.aContent;

    if ((!list || !list.length)) {
      var msg;
      var defaultList = (cur.section == 'catalog' && cur.catalogSection == 'magus') ? 'magus' : 'all';
      if (!cur.searchStr && cur.appsList[defaultList].length <= cur.deletedCount) {
        if (cur.id == vk.id) {
          msg = getLang('apps_youhavenoapps')+"<br /><a onclick=\"Apps.showSummaryProgress(); return nav.go(this, event);\" href=\"apps?act=catalog\">"+getLang('apps_viewallapps')+" &raquo;</a>";
        } else if (cur.gid){
          msg = getLang('apps_noappsingroup2');
          if (cur.isGroupAdmin) msg += "<br /><a onclick=\"Apps.showSummaryProgress() return nav.go(this, event);\" href=\"apps?act=catalog&gid="+cur.gid+"\">"+getLang('apps_viewallapps')+" &raquo;</a>";
        } else {
          msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
        }
        cont.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
      } else {
        if (cur.searchStr.length < 2) {
          if (cur.section == 'catalog') {
this.loadRows();
          } else {
            msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
            cont.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
          }
        }
      }
      hide(cur.showMore);
    } else {
      if (!cur.shownApps) cont.innerHTML = '';
      var apps = list.slice(start, end);
      if (!apps.length) {
        if (cur.shownApps >= cur.sectionCount) {
          hide(cur.showMore);
          if (cur.searchStr && cur.searchStr.length >= 2) {
            this.loadRows();
          }
        }
        return;
      }

      if (cur.section == 'apps' && !cur.searchStr) {
        Apps.loadScores(apps, function() {
          Apps.drawRows(apps, cont);
        });
      } else {
        Apps.drawRows(apps, cont);
      }

    }
    if (cur.shownApps >= cur.sectionCount) {
      hide(cur.showMore);
      if (cur.searchStr && cur.searchStr.length >= 2) {
        this.loadRows();
      }
    } else {
      show(cur.showMore);
    }
  },

  setScores: function() {
    cur.scores = {};
    var nodes = cur.aContent.childNodes;
    for(var i in nodes) {
      var el = nodes[i];
      if (el.id && el.id.substr(0, 3) == 'app') {
        var aud = geByClass1('app_audience', el);
        cur.scores[parseInt(el.id.substr(3))] = aud.innerHTML;
      }
    }
  },

  loadScores: function(apps, callback) {
    var aids = [];
    for (var i in apps) {
      var aid = parseInt(apps[i][0]);
      if (cur.scores[aid] === undefined) {
        aids.push(aid)
      }
    }
    //return false;
    if (!aids.length) {
      if (callback) {
        callback();
      }
      return;
    }
    if (cur.loadingScores) {
      return;
    }
    cur.loadingScores = true;
    ajax.post('apps', {act: 'loads_scores', offset: cur.shownApps, aids: aids.join(',')}, {
      onDone: function(rows) {
        for(var i in rows) {
          cur.scores[parseInt(i)] = rows[i];
        }
        cur.loadingScores = false;
        if (callback) {
          callback();
        }
      },
      showProgress: function() {
        show('show_more_progress')
        hide('show_more')
      },
      hideProgress: function() {
        hide('show_more_progress')
        show('show_more')
      }
    })
  },

  drawRows: function(apps, cont) {
    var html = [];
    for (i in apps) {
      var app = apps[i].slice();
      var last = (cur.shownApps == cur.sectionCount - 1);
      if (cur.selection) {
        app[3] = app[3].replace(cur.selection.re, cur.selection.val);
      }
      html.push(Apps.drawApp(app, last));
      cur.shownApps += 1;
    }
    var au = ce('div', {innerHTML: html.join('')});
    while (au.firstChild) {
      cont.appendChild(au.firstChild);
    }
    if (cur.shownApps) {
      if (!cur.searchStr || cur.searchStr.length < 2) {
        hide(cur.sContent);
      }
    }
    if (cur.section == 'catalog') {
      if (cur.searchStr) {
        hide('apps_cat');
        show('apps_subsummary');
      } else {
        show('apps_cat');
        hide('apps_subsummary');
      }
    }
  },

  loadRows: function() {
    if (cur.section == 'settings') {
      if (!cur.sectionCount) {
        Apps.changeSummary();
        msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
        cur.aContent.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
      }
      return;
    }
    if (cur.sPreload.innerHTML) {
      while (cur.sPreload.firstChild) {
        cur.sContent.appendChild(cur.sPreload.firstChild);
      }
    }
    if (!cur.loadMore) {
      cur.loadMore = 1;
      hide(cur.sShowMore);
      return;
    }
    if (cur.section == 'catalog') {
      if (cur.searchStr) {
        //hide('apps_cat');
        //show('apps_subsummary');
      } else {
        show('apps_cat');
        hide('apps_subsummary');
      }

      if (!cur.searchStr) cur.searchStr = '';
      Apps.catalogSearch(cur.searchStr, cur.searchOffset);
      return;
    }
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout((function() {
      Apps.searchRequest(cur.searchStr, cur.searchOffset);
    }).bind(this), 300);
  },

  catalogSearch: function(val, offset, opts) {
    if (val[val.length - 1] == ' ') {
      val[val.length - 1] = '_';
    }
    var opts = opts || {};
    setStyle(cur.clearSearch, {opacity: .6});
    var exclude = [];
    if (val) {
      if (cur.appsList) {
        var lst = cur.appsList[cur.curList];
        if (lst) {
          for (var i in lst) {
            exclude.push(lst[i][0]);
          }
        }
      }
    }
    var query = {
      act: 'search',
      q: val,
      offset: offset,
      oid: cur.oid,
      from: cur.section,
      sort: cur.searchSort,
      type: cur.searchType,
      catalog_search: 1,
      exclude: exclude.join(',')
    };
    if (!val) {
      query.type = cur.searchType;
    }
    ajax.post(Apps.address, query, {
      onDone: function(res, preload, options) {
        if (cur.module != 'apps') return;
        if (opts.callback) {
          opts.callback();
        }
        Apps.hideSummaryProgress();
        var newVal = cur.searchStr;
        if (newVal[newVal.length - 1] == ' ') {
          newVal[newVal.length - 1] = '_';
        }
        if (val != newVal) {
          return;
        }
        if (res) {
          cur.sContent.innerHTML = res;
        }
        if (preload) {
          cur.sPreload.innerHTML = preload;
          cur.hasMore = true;
        } else {
          cur.hasMore = false;
        }
        Apps.applyOptions(options);

        if (!cur.sectionCount) {
          hide(cur.sWrap);
          Apps.changeSummary(true);
          cur.aContent.innerHTML = '';
          if (!cur.searchCount && !res && !preload) {
            msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
            cur.aContent.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
            hide(cur.showMore);
            hide(cur.sContent);
          } else {
            show(cur.sContent);
          }
        } else {
          if (cur.searchCount) {
            cur.sSummary.innerHTML = langNumeric(cur.searchCount, cur.summaryLang['apps_found'], true);
            show(cur.sWrap);
            show(cur.sContent);
          } else {
            Apps.hideSearchResults();
            hide(cur.sWrap);
          }
        }
        if (cur.searchStr) {
          hide('apps_cat');
          show('apps_subsummary');
        } else {
          show('apps_cat');
          hide('apps_subsummary');
        }
        Apps.scrollCheck();
        delete nav.objLoc.section;

        if (cur.searchSort || nav.objLoc.sort || cur.searchType || nav.objLoc.type || val || nav.objLoc.q) {
          nav.setLoc(extend(nav.objLoc, {sort: cur.searchSort, type: cur.searchType, q: val}));
        }
      },
      onFail: function() {
        Apps.hideSummaryProgress();
      },
      showProgress: opts.showProgress || function () {
        cur.isAppsLoading = true;
        addClass(cur.searchCont, 'loading');
      },
      hideProgress: opts.hideProgress || function () {
        cur.isAppsLoading = false;
        removeClass(cur.searchCont, 'loading');
      },
      cache: val ? 0 : 1
    });
  },

  searchRequest: function(val, offset) {
    if (!val) return;
    if (val[val.length - 1] == ' ') {
      val[val.length - 1] = '_';
    }
    addClass(cur.searchCont, 'loading');
    setStyle(cur.clearSearch, {opacity: .6});
    var query = {act: 'search', q: val, offset: offset, oid: cur.oid, from: cur.section};
    if (cur.newLook) {
      query.type = cur.searchType;
    }
    var cont = cur.aContent;
    var otherCont = cur.sContent;
    ajax.post(Apps.address, query, {onDone: function(res, preload, options) {
        removeClass(cur.searchCont, 'loading');
        var newVal = cur.searchStr;
        if (newVal[newVal.length - 1] == ' ') {
          newVal[newVal.length - 1] = '_';
        }
        if (val != newVal) {
          return;
        }
        if (res) {
          cur.sContent.innerHTML = res;
        }
        if (preload) {
          cur.sPreload.innerHTML = preload;
          cur.hasMore = true;
        } else {
          cur.hasMore = false;
        }
        Apps.applyOptions(options);
        show(cur.sContent);
        if (!cur.sectionCount) {
          hide(cur.sWrap);
          Apps.changeSummary(true);
          cont.innerHTML = '';
          if (!cur.searchCount && !res && !preload) {
            msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
            cont.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
            hide(cur.showMore);
            hide(otherCont);
          }
        } else {
          if (cur.searchCount) {
            cur.sSummary.innerHTML = langNumeric(cur.searchCount, cur.summaryLang['apps_found'], true);
            show(cur.sWrap);
          } else {
            Apps.hideSearchResults();
            hide(cur.sWrap);
          }
        }
        Apps.scrollCheck();
      },
      onFail: function() {
        removeClass(cur.searchCont, 'loading');
      },
      showProgress: function () {
        cur.isAppsLoading = true;
      },
      hideProgress: function () {
        cur.isAppsLoading = false;
      }
    });
  },

  applyOptions: function(options) {
    extend(cur, options);
    if (!cur.hasMore) {
      hide(cur.sShowMore);
    } else {
      show(cur.sShowMore);
    }
  },

  hideSearchResults: function() {
    if (!cur.sContent) return;
    setTimeout(function(){
      cur.sContent.innerHTML = '';
      cur.sPreload.innerHTML = '';
      hide(cur.sContent);
      hide(cur.sWrap);
    }, 0);
  },

  /*showMoreRecommendations: function(force) {
    if (cur.silent) {
      cur.onSilentLoad.push(function() {
        Apps.showMoreRecommendations(force);
      });
      return;
    }
    var list = cur.appsList[cur.curList];
    list = Apps.filter(list).sort(function(a,b) {return a._order - b._order});
    if (!list || list.length == 0) {
      msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
      cur.sContent.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
      hide(cur.showRecMore);
      return;
    }

    if (force) cur.shownRecs = 0;

    var start = cur.shownRecs;
    var count = force ? cur.recsInitCount : cur.recsPerPage;
    var end = start + count;

    if (!cur.shownRecs || force) cur.sContent.innerHTML = '';
    var apps = list.slice(start, end);
    var html = [];
    for (i in apps) {
      var last = (cur.shownRecs == cur.sectionCount - 1);
      var app = apps[i].slice();
      if (cur.selection) {
        app[3] = app[3].replace(cur.selection.re, cur.selection.val);
      }
      html.push(Apps.drawRecApp(app, last));
      cur.shownRecs += 1;
    }
    var au = ce('div', {innerHTML: html.join('')});
    while (au.firstChild) {
      cur.sContent.appendChild(au.firstChild);
    }
    show(cur.recommendations);

    if (cur.shownRecs >= cur.sectionCount) {
      hide(cur.showRecMore);
    } else {
      show(cur.showRecMore);
    }
  },*/

  filter: function(arr) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (cur.apps && cur.apps[t[0]] && !cur.apps[t[0]].deleted) {
        res.push(t);
      }
    }
    return res;
  },

  showAppSettings: function(aid, info) {
    if (info) {
      showBox(Apps.address, {act: 'settings_box_info', aid: aid});
    } else {
      showBox(Apps.address, {act: 'settings_box', aid: aid, mask: 0, main: 1});
    }
  },

  showInviteBox: function(aid, hash) {
    if (!aid) {
      aid = cur.app.options.aid;
      hash = cur.app.options.hash;
    }
    showTabbedBox('al_friends.php', {act: 'select_friends_box', Checked: '', invite: 1, aid: aid, from: 'apps'}, {stat: ['privacy.js', 'ui_controls.js', 'ui_controls.css'], cache: 1});
    cur.onFlistSave = function (ids, list) {
      ajax.post('apps', {act: 'invite_friends', aid: aid, friends: ids.join(','), hash: hash}, {
        onDone: function(title, text) {
          setTimeout(showFastBox({title: title}, text, getLang('global_close')).hide, 2000);
        },
        onFail: function(text) {
          setTimeout(showFastBox({title: getLang('global_error')}, text, getLang('global_close')).hide, 2000);
          return true;
        }
      })
    }
  },

  addApp: function(aid, hash) {
    if (cur.adding) return false;
    cur.adding = true;
    ajax.post(Apps.address, {act: 'join', gid: cur.gid, id: aid, hash: hash, from: 'al_apps', section: cur.section}, {
      onDone: function(msg, res) {
        delete cur.adding;
        ge('app_add'+aid).innerHTML = msg;
        if (cur.section == 'apps') {
          var obj = eval('('+res+')');
          var all_list = cur.appsList['all'];
          if (all_list && all_list.length) {
            obj._order = all_list[0]._order - 1;
            cur.appsList['all'].splice(0,0,obj);
          } else {
            obj._order = 0;
            cur.appsList['all'] = [obj];
          }
          cur.apps[obj[0]] = obj;
          cur.appsIndex.add(obj);
          cur.defaultCount++;
        }
      },
      onFail: function() {
        delete cur.adding;
      }
    });
    return false;
  },

  removeApp: function(aid, hash, force) {
    if (cur.silent) {
      cur.onSilentLoad.push(function() {
        Apps.removeApp(aid);
      });
      return;
    }
    if (cur.deleting) {
      return false;
    }
    var doRemoveApp = function(aid, hash, force) {
      cur.deleting = true;
      Apps.showSummaryProgress();
      var el = ge('app' + aid);
      if (window.tooltips && ge('delete_row' + aid)) {
        tooltips.hide(ge('delete_row' + aid))
      }
      if (ge('apps_message')) hide('apps_mesasge');
      var del = ge('delete_row' + aid);
      if (del) setStyle(del, {backgroundColor: '#FFF'});
      var params = {act: 'quit', gid: cur.gid, id: aid, hash: hash, from: 'al_apps'};
      if (cur.section == 'catalog' && force == 2) {
        params.from = 'recent';
        params.offset = cur.recentOffset;
      }
      ajax.post(Apps.address, params, {
        onDone: function(text, data) {
          delete cur.deleting;
          delete cur.preload;
          Apps.hideSummaryProgress();
          cur.appsIndex.remove(cur.apps[aid]);
          cur.deletedCount++;
          cur.apps[aid].deleted = true;
          if (cur.section == 'catalog' && force == 2) {
            var row = ge('delete_row' + aid);
            var newRow = geByClass1('apps_recent_row_hidden', ge('apps_recent_list'));
            if (row) {
              row = row.parentNode;
              removeClass(newRow, 'apps_recent_row_hidden')
              hide(row);
            }
            ge('apps_recent_list').appendChild(cf(text));
            if (data) {
              cur.recentOffset += data;
            }
            return;
          } else if (force) {
            cur.aSearch.value = '';
            // delete cur.apps[aid];
            cur.ignoreEqual = true;
            Apps.updateList(null, cur.aSearch);
            return;
          } else {
            if (!cur.deletedApps) cur.deletedApps = [];
            cur.deletedApps[aid] = el.innerHTML;
            var isLast = hasClass(el.firstChild, 'last');
            el.innerHTML = text;
            if (isLast) {
              var dld = geByClass1('dld', el);
              if (dld) addClass(dld, 'last');
            }
          }
          if (cur.section == 'apps' || cur.section == 'catalog') {
            cur.shownApps--;
            cur.sectionCount--;
            Apps.changeSummary();
          } else {
            var summaryLang, i = parseInt(cur.apps[aid][7]);
            cur.totalCounters[i]--;
            cur.shownCounters[i]--;
            var summaries = [ge('apps_summary'), ge('app_site_summary'), ge('app_desktop_summary')];
            switch (i) {
              case 1:
                curLang = cur.summaryLang['x_sites'];
                break;
              case 2:
                curLang = cur.summaryLang['x_desktops'];
                break;
              case 0:
              default:
                curLang = cur.summaryLang['x_apps'];
                break;
            }
            if (summaries[i]) summaries[i].innerHTML = langNumeric(cur.totalCounters[i], curLang, true);
          }
        },
        onFail: function() {
          delete cur.deleting;
          Apps.hideSummaryProgress();
        }
      });
    }
    if (cur.section == 'catalog' && force == 2) {
      var box = showFastBox({title: cur.lang.apps_quit_app_box_title, width: 430, bodyStyle: "line-height: 160%;"}, cur.lang.apps_quit_confirm, getLang('apps_remove'), function() {
        doRemoveApp(aid, hash, force);
        box.hide();
      }, getLang('global_cancel'));
    } else if (cur.adminApps && cur.adminApps[aid]) {
      var box = showFastBox({title: cur.lang.deleting_app, width: 430, bodyStyle: "line-height: 160%;"}, cur.lang.admin_quit, getLang('global_delete'), function() {
        doRemoveApp(aid, hash, force);
        box.hide();
      }, getLang('global_cancel'));
    } else {
      doRemoveApp(aid, hash, force);
    }
    return false;
  },

  restoreApp: function(aid, hash) {
    if (cur.restoring) {
      return false;
    }
    cur.restoring = true;
    Apps.showSummaryProgress();
    var el = ge('app' + aid);
    ajax.post(Apps.address, {act: 'join', gid: cur.gid, id: aid, hash: hash, from: 'al_apps', section: cur.section}, {
      onDone: function(result) {
        delete cur.restoring;
        cur.deletedCount--;
        Apps.hideSummaryProgress();
        el.innerHTML = cur.deletedApps[aid];
        delete cur.apps[aid].deleted;
        delete cur.deletedApps[aid];
        cur.appsIndex.add(cur.apps[aid]);
        if (cur.section == 'apps') {
          cur.shownApps++;
          cur.sectionCount++;
          Apps.changeSummary();
        } else {
          var summaryLang, i = parseInt(cur.apps[aid][7]);
          cur.totalCounters[i]++;
          cur.shownCounters[i]++;
          var summaries = [ge('apps_summary'), ge('app_site_summary'), ge('app_desktop_summary')];
          switch (i) {
            case 1:
              curLang = cur.summaryLang['x_sites'];
              break;
            case 2:
              curLang = cur.summaryLang['x_desktops'];
              break;
            case 0:
            default:
              curLang = cur.summaryLang['x_apps'];
              break;
          }
          if (summaries[i]) summaries[i].innerHTML = langNumeric(cur.totalCounters[i], curLang, true);
        }
      },
      onFail: function() {
        delete cur.restoring;
        Apps.hideSummaryProgress();
      }
    });
    return false;
  },

  changeSummary: function(from_search) {
    var sum = ge('apps_summary');
    if (!sum) return;
    var html = '', count = (from_search) ? cur.searchCount : cur.sectionCount;

    if (cur.section == 'catalog' && !cur.searchStr) {
      html = cur.summaryLang['apps_popular_summary'];
    /*} else if (cur.section == 'catalog' && !cur.searchSort) {
      html = cur.catalogSection == 'magus' ? getLang('apps_recommended_apps') : getLang('apps_friends_apps');*/
    } else {
      if (cur.searchStr) {
        if (count) {
          var lang_key = (from_search) ? cur.summaryLang['apps_found'] : cur.summaryLang['x_apps'];
          html = langNumeric(count, lang_key, true);
        } else {
          html = cur.summaryLang['no_apps']
        }
      } else {
        if (count) {
          html = langNumeric(count, cur.summaryLang['x_apps_default'], true);
        } else {
          html = cur.summaryLang['no_apps_default']
        }
      }
    }
    sum.innerHTML = html;
  },

  showAppFriends: function(aid, ev) {
    return !showBox(Apps.address, {act: 'show_app_friends_box', aid: aid}, {cache: 1, params:{width: '400px', bodyStyle: 'padding: 0px'}, stat: ['boxes.css'], dark: 1}, ev);
  },

  switchTab: function(tab, event, search) {
    var el = ge('tab_' + tab);
    if (el) {
      each(geByTag('li', ge('apps_tabs')), function(i, e) {
        removeClass(e, 'active_link');
      });
      addClass(el, 'active_link');
    }
    if (window.tooltips) {
      tooltips.hideAll();
    }
    if (cur.preload && cur.preload[tab]) {
      ge('apps').innerHTML = cur.preload[tab].html;

      /*var c = geByClass1('apps_section_act', ge('apps_cat_sections'));
      removeClass(c, 'apps_section_act');
      if (tab != 'settings') {
        addClass(ge('tab_'+tab), 'apps_section_act');
      }*/

      if (cur.preload[tab].title) document.title = cur.preload[tab].title;
      eval(cur.preload[tab].js);
      if (!search) {
        val(cur.aSearch, '');
      }
      nav.objLoc = {0: Apps.address, act: tab, mid: nav.objLoc.mid, gid: nav.objLoc.gid, add: nav.objLoc.add};
      nav.setLoc(nav.objLoc);
    } else {
      Apps.showSummaryProgress();
      nav.go({0: Apps.address, act: tab, mid: nav.objLoc.mid, gid: nav.objLoc.gid, add: nav.objLoc.add});
    }
    cur.recentOffset = 0;
    //return;
  },

  switchSort: function(sort) {
    cur.searchSort = sort;
    cur.searchOffset = 0;
    removeClass(geByClass1('apps_section_act', ge('apps_submenu_sort')), 'apps_section_act');

    show('submenu_sort');

    if (sort == 2) {
      addClass(ge('submenu_recommend'), 'apps_section_act');
      //hide('apps_submenu_type');
    } else if (sort) {
      addClass(ge('submenu_popular_week'), 'apps_section_act');
      //show('apps_submenu_type');
    } else {
      addClass(ge('submenu_popular'), 'apps_section_act');
      //show('apps_submenu_type');
    }

    this.catalogSearch(cur.searchStr, cur.searchOffset, {callback: function() {
      hide('submenu_sort');
    }});
  },

  switchType: function(type, obj) {
    cur.searchType = type;
    cur.searchOffset = 0;
    if (type > 9) {
      scrollToY(getXY(cur.sContent)[1] - 50, 150);

      cur.categoryStr = obj.innerHTML;
    }

    var typeCont = ge('apps_cat_summary');
    this.catalogSearch(cur.searchStr, cur.searchOffset, {
      showProgress: function() {
        debugLog('here', typeCont);
        addClass(typeCont, 'apps_summary_loading');
      },
      hideProgress: function() {
        removeClass(typeCont, 'apps_summary_loading');
      }
    });
  },

  listOut: function(obj) {
    if (!hasClass(obj, 'app_filter_selected')) {
      obj.className = 'app_filter';
    }
  },

  listOver: function(obj) {
    if (!hasClass(obj, 'app_filter_selected')) {
      obj.className = 'app_filter_over';
    }
  },

  filterByAppType: function(arr, type) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (type == t[7]) {
        res.push(t);
      }
    }
    return res;
  },

  filterByAppAdmin: function(arr) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (parseInt(t[8]) || (cur.adminApps && cur.adminApps[parseInt(t[0])])) {
        res.push(t);
      }
    }
    return res;
  },

  updateFilter: function(type, sort) {
    cur.catalogSection = 'all';
    if (sort !== undefined) {
      var el = ge('app_filter_' + sort);
      if (el) {
        each(geByTag('div', ge('apps_filters')), function(i, e) {
          if (!hasClass(e, 'app_filter_sep')) e.className = 'app_filter';
        });
        el.className = 'app_filter_selected';
      }
      if (cur.searchSort == sort) return;
      cur.searchSort = sort;
    }
    if (type) {
      if (cur.searchType == type) return;
      cur.searchType = type;
    }
    show(ge('apps_search_filter'));
    hide(cur.showRecMore);
    this.searchTimeout = setTimeout((function() {
      cur.searchStr = trim(cur.aSearch.value);
      cur.searchOffset = 0;
      Apps.showSummaryProgress();
      Apps.catalogSearch(cur.searchStr, cur.searchOffset);
    }).bind(this), 10);
  },

  showSettingsRows: function(type) {
    var list = cur.appsList[cur.curList] || [];
    var summaries = [ge('apps_summary'), ge('app_site_summary'), ge('app_desktop_summary'), ge('app_edit_summary')];
    var contents = [ge('app_rows'), ge('app_site_list'), ge('app_desktop_list'), ge('app_edit_list')];
    var more_buttons = [ge('more_link'), ge('site_more_link'), ge('desktop_more_link'), ge('edit_more_link')];
    var results = [ge('app_rows'), ge('app_site_results'), ge('app_desktop_results'), ge('app_edit_results')];
    var wraps = [null, ge('app_site_wrap'), ge('app_desktop_wrap'), ge('app_edit_wrap')];
    if (type === undefined) {
      cur.shownCounters = [0, 0, 0, 0];
      for (var i in contents) {
        if (contents[i]) contents[i].innerHTML = '';
      }
    }
    if (!list || !list.length) {
      summaries[0].innerHTML = cur.summaryLang['no_apps'];
      var msg;
      if (!cur.appsList['all'] || cur.appsList['all'].length <= cur.deletedCount) {
        msg = cur.summaryLang['no_apps_default'];
      } else {
        msg = getLang('apps_no_apps_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
      }
      show(results[0]);
      cur.aContent.innerHTML = '<div id="no_apps" class="app_msg">'+msg+'</div>';
      hide(cur.showMore);
      for (var i = 1; i <=3; i++) {
        hide(results[i]);
        hide(more_buttons[i]);
      }
    } else {
      var type_from = (type !== undefined) ? type : 0;
      var type_to = (type !== undefined) ? type : 3;
      for (var i = type_to; i >= type_from; i--) {
        var start = cur.shownCounters[i];
        var end = start + cur.settingsPerPage;
        var apps = (i < 3) ? this.filterByAppType(list, i) : this.filterByAppAdmin(list);
        cur.totalCounters[i] = apps.length;
        apps = apps.slice(start, end);
        show(wraps[i]);
        if (!apps.length) {
          if (contents[i]) contents[i].innerHTML = '';
          hide(results[i]);
          hide(more_buttons[i]);
          if (!i) {
            for (var j = 1; j <= 2; j++) {
              if (isVisible(results[j])) {
                summaries[0].innerHTML = summaries[j].innerHTML;
                hide(wraps[j]);
                break;
              }
            }
          }
        } else {
          show(results[i]);
          var html = [];
          for (k in apps) {
            var last = (parseInt(k) + start == cur.totalCounters[i] - 1);
            var app = apps[k].slice();
            if (cur.selection) {
              app[3] = app[3].replace(cur.selection.re, cur.selection.val);
            }
            var edit = (i == 3);
            html.push(Apps.drawApp(app, last, edit));
            cur.shownCounters[i] += 1;
          }
          var au = ce('div', {innerHTML: html.join('')});
          while (au.firstChild) {
            contents[i].appendChild(au.firstChild);
          }
          if (cur.shownCounters[i] >= cur.totalCounters[i]) {
            hide(more_buttons[i]);
          } else {
            show(more_buttons[i]);
          }
          if (i == 3) continue;
          // update summary of block
          var curLang;
          switch (i) {
            case 1:
              curLang = cur.summaryLang['x_sites'];
              break;
            case 2:
              curLang = cur.summaryLang['x_desktops'];
              break;
            case 0:
            default:
              curLang = cur.summaryLang['x_apps'];
              break;
          }
          if (summaries[i]) summaries[i].innerHTML = langNumeric(cur.totalCounters[i], curLang, true);
        }
      }
    }
  },

  _animDelX: function(aid, opacity, set_active) {
    var el = ge('delete_row' + aid);
    if (!el) return;
    if (set_active !== undefined) {
      el.active = set_active;
    } else if (el.active) {
      return;
    }
    animate(el, {opacity: opacity}, 200);
  },

  rowActive: function(aid, tt) {
    Apps._animDelX(aid, 1, 1);
    if (tt) {
      showTooltip(ge('delete_row' + aid), {text: tt, showdt: 500, black: 1, shift: [13, 4, 8]});
    }
  },
  rowInactive: function(aid) {
    Apps._animDelX(aid, 0.5, 0);
  },
  rowOver: function(aid) {
    Apps._animDelX(aid, 0.5);
  },
  rowOut: function(aid) {
    Apps._animDelX(aid, 0);
  },
  deleteRow: function(aid, hash) {
    slideUp('app' + aid, 200);
    if (tooltips) {
      tooltips.hide(ge('delete_row' + aid))
    }
    cur.appsIndex.remove(cur.apps[aid]);
    cur.apps[aid].deleted = true;
    ajax.post(Apps.address, {act: 'hide_suggestion', aid: aid, hash: hash}, {onDone: function() {
      if (cur.preload && cur.preload[cur.section]) {
        delete cur.preload[cur.section];
      }
    }});
  },
  hideRow: function(aid, hash) {
    slideUp('app' + aid, 200);
    if (tooltips) {
      tooltips.hide(ge('delete_row' + aid))
    }
    cur.appsIndex.remove(cur.apps[aid]);
    cur.apps[aid].deleted = true;
    ajax.post(Apps.address, {act: 'hide_magus', aid: aid, hash: hash}, {onDone: function() {
      if (cur.preload && cur.preload[cur.section]) {
        delete cur.preload[cur.section];
      }
    }});
  },
  deleteNot: function(nid, hash, nids) {
    if (cur.deletingNot) return;
    var prefix = (nid[0] == 'i') ? 'invite' : 'notify';
    if (window.tooltips && ge('delete_row' + nid)) {
      tooltips.hide(ge('delete_row' + nid))
    }
    cur.deletingNot = true;
    var params = {act: 'delete_notif', nid: nid, hash: hash};
    if (nids) {
      params['nids'] = nids;
    }
    ajax.post(Apps.address, params, {
      onDone: function(response) {
        if (prefix == 'invite') {
          ge('app_buttons_'+nid).innerHTML = response;
        } else if (prefix == 'notify') {
          var cont = ge('notify_info'+nid);
          hide('notify_hide'+nid);
          cont.innerHTML = response;
        }
        delete cur.deletingNot;
      },
      onFail: function(response) {
        delete cur.deletingNot;
    }
  });
  },

  rejectRequest: function(lnk, rid, hash) {
    var block = ge("apps_request_row_"+rid);
    cur['req_'+rid+'_back'] = block.innerHTML;
    ajax.post('al_apps.php', {act: 'a_reject_request', rid: rid, hash: hash}, {
      onDone: function(text) {
        block.innerHTML = text;
      },
      showProgress: function() {
        if (!cur.reqLnkBack) {
          cur.reqLnkBack = lnk.innerHTML;
        }
        lnk.innerHTML = '<img src="/images/upload.gif">';
      },
      hideProgress: function() {
        if (!cur.reqLnkBack) {
          lnk.innerHTML = cur.reqLnkBack;
        }
      }
    })
  },

  requestsRestore: function(obj, rid, hash) {
    var b = obj.innerHTML;
    var block = ge("apps_request_row_"+rid);
    ajax.post('al_apps.php', {act: 'a_request_restore', req_id: rid, hash: hash}, {
      onDone: function() {
        if (cur['req_'+rid+'_back']) {
          block.innerHTML = cur['req_'+rid+'_back'];
        }
      },
      showProgress: function() {
        obj.innerHTML = '<img src="/images/upload.gif" />';
      },
      hideProgress: function() {
        obj.innerHTML = b;
      }
    })
  },

  requestsBanUser: function(obj, mid, hash) {
    ajax.post('al_apps.php', {act: 'a_request_ban_user', mid: mid, hash: hash}, {
      onDone: function(text) {
        obj.parentNode.parentNode.innerHTML = text;
      },
      showProgress: function() {
        lockButton(obj);
      },
      hideProgress: function() {
        unlockButton(obj);
      }
    })
  },

  reportInviteSpam: function (nid, aid, inviter, hash) {
    if (cur.reportingSpam) return;
    cur.reportingSpam = true;
    ajax.post(Apps.address, {act: 'report_invite_spam', nid: nid, aid: aid, inviter: inviter, hash: hash}, {
      onDone: function(response) {
        ge('app_buttons_'+nid).innerHTML = response;
        delete cur.reportingSpam;
      },
      onFail: function(response) {
        delete cur.reportingSpam;
      }
    });
  },
  deleteAllInvites: function(hash) {
    var box = showFastBox(getLang('apps_delete_all_invites_title'), getLang('apps_notifies_sure_delete_all'), getLang('global_delete'), function(){
      Apps.showSummaryProgress();
      ajax.post(Apps.address, {act: 'delete_all_invites', hash: hash}, {
        onDone: function() {
          if (!cur.notifyCount) {
            ge('apps_summary').innerHTML = getLang('apps_no_notifications');
            ge('app_rows').innerHTML = '<div id="no_apps" class="app_msg">'+getLang('apps_you_have_no_notifies')+'</div>';
            hide('more_link');
            hide('app_hidden_rows');
            hide('app_notify_rows');
          } else {
            hide('app_rows');
            hide('more_link');
            hide('app_hidden_rows');
            hide('app_notify_wrap');
            ge('apps_summary').innerHTML =  ge('app_notify_summary').innerHTML;
          }
          Apps.hideSummaryProgress();
          box.hide(200);
        },
        onFail: function() {
          Apps.hideSummaryProgress();
          box.hide(200);
        }
      });
    }, getLang('global_cancel'));
  },
  denyNotifications: function(nid, aid, hash) {
    if (cur.denyingNot) return;
    cur.denyingNot = true;
    ajax.post(Apps.address, {act: 'deny_notifications', aid: aid, hash: hash}, {
      onDone: function(response) {
        ge('notify_info'+nid).innerHTML = response;
        delete cur.denyingNot;
      },
      onFail: function() {
        delete cur.denyingNot;
      }
    });
  },
  recountAddVotes: function(obj) {
    var add_val = obj.value.replace(/[^0-9]/g, '');
    ge('add_votes').innerHTML = langNumeric(add_val, votes_flex);
    if (add_val > 0 && ge('app_pay_withdraw')) {
      ge('app_pay_withdraw').value = 0;
      this.recountWithdrawVotes(ge('app_pay_withdraw'));
    }
  },
  recountWithdrawVotes: function(obj) {
    var withdraw_val = obj.value.replace(/[^0-9]/g, '');
    ge('withdraw_votes').innerHTML = langNumeric(withdraw_val, votes_flex);
    if (withdraw_val > 0) {
      ge('app_pay_add').value = 0;
      this.recountAddVotes(ge('app_pay_add'));
    }
  },
  cancelInstall: function() {
    nav.go('/apps', false);
  },
  runApp: function(obj, domain, hash, sett, ref, mid) {
    if (!vk.id) {
      showDoneBox(cur.pleaseSignInLang);
      return false;
    }
    lockButton(obj);
    var l = clone(nav.objLoc);
    delete l.w;
    nav.setLoc(l);
    window.appsListChanged = 1;
    var url = '/'+domain+'?join=1&hash='+hash+'&sett='+sett;
    if (ref) {
      if (isObject(ref)) {
        for (var i in ref) {
          if (i != 'w') {
            url += '&' + i + '=' + ref[i];
          }
        }
      } else if (ref != '') {
        url += '&ref='+ref;
      }
    }
    if (mid) {
      url += '&mid='+mid;
    }
    if (nav.objLoc['#']) {
      url += '#'+nav.objLoc['#'];
    }
    nav.go(url);
  },
  runOver: function() {
    animate(ge('apps_i_run_box'), {opacity: 1}, 200);
  },
  runOut: function () {
    animate(ge('apps_i_run_box'), {opacity: 0.8}, 200);
  },
  approveInstall: function(hash, sett, obj, btn) {
    var loc = extend(nav.objLoc, {
      'join': 1,
      'hash': hash,
      'sett': sett
    });
    if (isChecked('apps_notifications_checkbox') && isVisible('apps_notifications_checkbox')) {
      loc['notify'] = 1;
    }
    if (obj) {
      obj.innerHTML = '<img src="/images/upload.gif" />';
    }
    if (btn) {
      lockButton(btn);
    }
    window.appsListChanged = 1;
    nav.go(loc, false, {pass: true});
  },
  deleteApp: function(aid, hash, obj) {
    if (cur.appDeleteBtn) return;
    obj.style.cursor = 'default';
    cur.appDeleteBtn = obj.innerHTML;
    obj.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('/apps', {act: 'quit', id: aid, hash: (hash || cur.app.options.hash), from: 'app'}, {
      onDone: function(text) {
        cur._back = false;
        nav.go('/apps?m=1', false);
      },
      onFail: function(text) {
        obj.innerHTML = cur.appDeleteBtn;
        obj.style.cursor = 'pointer';
        cur.appDeleteBtn = false;
        var errCont = ge('apps_settings_error');
        errCont.innerHTML = text;
        show(errCont);
        scrollToTop(200);
        return true;
      }
    });
  },
  toggleGroupAddForm: function(val) {
    if (val === undefined) {
      val = !isVisible('apps_add_to_group');
    }
    toggle('apps_add_to_group', val);
    toggle('apps_search', !val);
    if (!val) {
      ge('s_gr_search').value = '';
      cur.aSearch.focus();
    } else {
      cur.aSearch.value = '';
      ge('s_gr_search').focus();
    }
    ge('app_form_toggler').innerHTML = val ? getLang('global_cancel') : getLang('apps_addapp');
  },
  addAppToGroup: function(el, hash) {
    var val = el.value;
    if (!val) return;
    ajax.post(Apps.address, {act: 'find_install_app', gid: cur.gid, link: val, hash: hash}, {
      onDone: function(t, err) {
        var el = ge('apps_message');
        if (err) {
          if (el) el.innerHTML = err;
        } else {
          var obj = eval('('+t+')');
          if (!obj) return;
          var all_list = cur.appsList['all'];
          if (!cur.apps[obj[0]]) {
            if (all_list && all_list.length) {
              obj._order = all_list[0]._order - 1;
              cur.appsList['all'].splice(0,0,obj);
            } else {
              obj._order = 0;
              cur.appsList['all'] = [obj];
            }
            cur.apps[obj[0]] = obj;
            cur.appsIndex.add(obj);
          } else {
            var pos = all_list.indexOf(cur.apps[obj[0]]);
            var tmp = all_list.splice(pos, 1)[0];
            delete tmp.deleted;
            tmp._order = all_list[0]._order - 1;
            all_list.splice(0,0,tmp);
            cur.appsIndex.add(cur.apps[obj[0]]);
          }
          cur.defaultCount++;
          cur.shownApps++;
          if (el) {
            var msg = obj[3];
            if (obj[2]) msg = '<a href="'+obj[2]+'">'+msg+'</a>';
            msg = '<span style="font-weight: normal">'+getLang('apps_added_to_group').split('{app}').join(msg).split('{link}').join('<a onclick="Apps.removeApp('+obj[0]+', \''+obj[5]+'\', true); return false;">').split('{/link}').join('</a>')+'</span>';
            msg = getLang('apps_addedtogroup')+".<br/>"+msg;
            el.innerHTML = msg;
          }
          Apps.toggleGroupAddForm(false);
        }
        animate(el, {backgroundColor: '#F9F6E7'}, 2000);
        cur.aSearch.value = '';
        cur.justAdded = true;
        Apps.updateList(null, cur.aSearch);
      },
      showProgress: function () {
        lockButton(ge('app_gr_search_submit'));
      },
      hideProgress: function () {
        unlockButton(ge('app_gr_search_submit'));
      }
    });
  },

  reportApp: function(aid, place_id) {
    showBox('al_reports.php', {act:'report_app_box', app_id: aid, place_id: place_id}, {
      stat:['ui_controls.js', 'ui_controls.css']
    });
  },

  loadSettings: function(data) {
    ajax.post('apps', {act: 'show_settings', aid: cur.aid}, extend({cache: 1}, data));
  },

  showSettings: function(obj) {
    if (!cur.settBtnText) {
      cur.settBtnText = obj.innerHTML;
    }
    if (cur.settShown) {
      scrollToTop(200);
      cur.settShown = false;
      delete ajaxCache['/apps#act=show_settings&aid='+cur.aid];
    } else {
      showBox('apps', {act: 'show_settings', aid: cur.aid});

      /*obj.innerHTML = '<img src="/images/upload.gif" />';
      Apps.loadSettings({
        onDone: function(btnText, settCont) {
          cur.settShown = true;
          cont.innerHTML = settCont;
          obj.innerHTML = cur.settBtnText;
          show(cont);
          if (cur.helpShown) {
            ge('apps_help_link').innerHTML = cur.helpBtnText
            cur.helpShown = false;
          }
        }
      });*/
    }
  },

  switchRecommendType: function(type) {
    if (cur.silent) {
      cur.onSilentLoad.push(function() {
        Apps.switchRecommendType(type);
      });
      return;
    }
    Apps.showSummaryProgress();
    cur.catalogSection = (type) ? 'friends' : 'magus';
    cur.ignoreEqual = true;
    var el = ge('app_rec_filter_' + type);
    if (el) {
      each(geByTag('div', ge('apps_filters')), function(i, e) {
        if (!hasClass(e, 'app_filter_sep')) e.className = 'app_filter';
      });
      el.className = 'app_filter_selected';
    }
    cur.silent = true;
    this.indexAll(function() {
      cur.silent = false;
      hide(cur.sShowMore);
      hide(ge('apps_search_filter'));
      Apps.updateList(null, cur.aSearch);
      cur.searchSort = cur.searchType = 0;
      delete nav.objLoc.sort;
      delete nav.objLoc.type;
      delete nav.objLoc.q;
      nav.setLoc(extend(nav.objLoc, {section: type ? 'friends' : 'recommendations'}));
      Apps.hideSummaryProgress();
    });
  },

  featuredSlide: function(ev, left) {
    if (cur.featuredAnimate) return cancelEvent(ev);
    var cont = ge('apps_featured_inner');
    if (window.curNotifier && curNotifier.idle_manager && curNotifier.idle_manager.is_idle && !(ev && ev.button)) {
      return false;
    }
    if (!cont) {
      clearInterval(cur.featuredInterval);
    }
    cur.featuredAnimate = true;
    if (left) {
      cont.insertBefore(cont.lastChild, cont.firstChild);
      cont.style.marginLeft = '-606px';
    }
    setTimeout(function() {
      cssAnim(cont, {marginLeft: left ? 0 : -606}, {duration: 300, func: 'ease-in-out'}, function() {
        if (!left) {
          cont.appendChild(cont.firstChild);
          cont.style.marginLeft = '0px';
        }
        cur.featuredAnimate = false;
      });
    });
    Apps.startFeatured();
    return cancelEvent(ev);
  },

  startFeatured: function() {
    clearInterval(cur.featuredInterval);
    cur.featuredInterval = setInterval(Apps.featuredSlide, 10000);
  },

  stopFeatured: function() {
    clearInterval(cur.featuredInterval);
  },

  hideOldNotify: function(obj) {
    if (cur.oldNotif && cur.oldNotif != obj) {
      if (!cur.oldNotif.tthide && cur.oldNotif.temphide) {
        cur.oldNotif.temphide();
      }
    }
    if (window.tooltips && cur.oldNotif != obj) {
      tooltips.hideAll()
    }
  },

  showNotify: function(obj, aid, text, shift) {
    if (cur.silent) {
      return cur.onSilentLoad.push(Apps.showNotify.pbind(obj, aid, text));
    }
    //if (!cur.notify) return;
    var n = (aid && cur.notify) ? cur.notify[aid] : false;
    if (!n) {
      var app = aid ? cur.apps[aid] : '';
      if (app || text) {
        Apps.hideOldNotify(obj);
        showTooltip(obj, {
          text: text || app[3],
          slide: cur.oldNotif ? 0 : 15,
          shift: [0, shift || -2, shift || 0, 0],
          className: 'apps_name_tt',
          center: true,
          hidedt: 400,
          hasover: false,
          noload: true,
          black: 1
        });
        cur.oldNotif = obj;
      }
      return;
    }
    if (n[4]) {
      var more = '<a class="apps_notify_more" onclick="Apps.switchTab(\'notifications\', event);">'+n[4]+'</a>';
    } else {
      var more = '';
    }
    var text = '<div class="apps_notify_text">'+n[1]+'</div>';
    Apps.hideOldNotify(obj);
    showTooltip(obj, {
      text: '<div class="apps_notify_tt">'+
            '<div class="apps_notify_date fl_r">'+n[3]+'</div>'+
            '<div class="apps_notify_tt_title">'+n[2]+'</div>'+
            text+more+'</div>',
      slide: 15,
      shift: [-7, 2, 0, 24],
      className: 'rich wall_tt',
      hidedt: 400,
      hasover: true,
      noload: true,
      black: 1
    });
    cur.oldNotif = obj;
  },

  showSummaryProgress: function() {
    show(cur.progress);
  },

  hideSummaryProgress: function() {
    hide(cur.progress);
  },

  removeAllNotifies: function(obj, hash) {
    var back = obj.innerHTML;
    obj.innerHTML = '<img src="/images/upload.gif">';
    ajax.post('apps', {act: 'a_remove_all_notifies', hash: hash}, {
      onDone: function() {
        nav.reload();
      },
      onFail: function() {
        obj.innerHTML = back;
      }
    });
  },

  ssChange: function(obj) {
    var old = geByClass1('apps_i_th_act', ge('apps_i_th_contr')).parentNode;
    if (!obj) {
      obj = old.nextSibling;
      if (!obj) {
        obj = ge('apps_i_th_contr').firstChild;
      }
      obj = obj.firstChild;
    }
    if (old) {
      removeClass(old.firstChild, 'apps_i_th_act');
    }
    var num = intval(obj.getAttribute('rel'));
    addClass(obj, 'apps_i_th_act');
    animate(ge('apps_i_slider'), {
      scrollLeft: num * 607
    }, 300);
  },

  showAllNotifies: function(obj) {
    hide(obj);
    show(obj.nextSibling);
    return false;
  },

  /*loadRecent: function() {
    var recent = ge('apps_recent_all');
    var textEl = ge("r_more_text");

    if (cur.silent) {
      cur.showRecentBack = textEl.innerHTML || '&nbsp;';
      textEl.innerHTML = '<img src="/images/upload.gif" />';
      cur.onSilentLoad.push(function() {
        Apps.loadRecent();
      });
      return;
    }
    var html = [];
    var rows = geByClass('apps_recent_row', ge('apps_recent_list'));
    var shown = {};
    for(var i in rows) {
      var elId = rows[i].id.split('_');
      shown[elId[2]] = 1;
    }
    if (!cur.recentOffset) {
      ge('apps_recent_text').innerHTML = langNumeric(cur.recentCount, cur.summaryLang['x_apps_default'], true);
    }
    cur.recentOffset = cur.recentOffset || 0;

    var len = cur.appsList['all'].length;
    var rowsShown = 0;
    var showMore = false;
    for (;cur.recentOffset < len; cur.recentOffset++) {
      var app = cur.appsList['all'][cur.recentOffset];
      if (app[6] & 2) {
        var aid = intval(app[0]);
        if (shown[aid]) continue;

        if (++rowsShown > 28) {
          showMore = true;
          break;
        }

        if (cur.notify[aid]) {
          var sticker = '<div class="apps_sticker">&nbsp;</div>';
        } else {
          var sticker = '';
        }
        var row = rs(cur.recentRowTpl, {
          photo: app[1],
          aid: aid,
          title: app[3],
          href: app[2],
          sticker: sticker
        });
        html.push(row);
      }
    }
    recent.appendChild(ce('div', {innerHTML: html.join('')}));
    if (cur.showRecentBack) {
      textEl.innerHTML = cur.showRecentBack;
    }
    if (!showMore) {
      hide('r_more_link');
    }
    show(recent);
    //cur.recentShown = true;
  },*/

  ttScore: function(obj, name, info) {
    var showsp = 200;
    if (cur.ttScoreShown && window.tooltips) {
      tooltips.hideAll();
      showsp = 0;
    }
    return showTooltip(obj, {
      center: 1,
      black: 1,
      showsp: showsp,
      shift: [0, 2, 10],
      text: '<div class="apps_score_tt_cont"><b>'+name+'</b>'+(info ? '<div class="apps_score_tt">'+info+'</div>' : '')+'</div>'
    });
  },

  showMoreRecent: function(obj) {
    if (!cur.recentBack) {
      cur.recentBack = obj.innerHTML;
    }
    var feedLen = cur.feedHideEls.length;
    each(geByClass('apps_recent_row_hidden', ge('apps_recent_list')), function(i, el) { re(el); });

    ajax.post('al_apps.php', {act: 'more_recent', offset: cur.recentOffset, 'feed_offset': cur.feedOffset, 'feed_hidden': feedLen}, {
      onDone: function(recent, feed, newOffset, feedOffset, showMore) {
        cur.recentOffset = newOffset;
        cur.feedOffset = feedOffset;
        var feedCont = ge('apps_feed_list');
        var els = geByClass('apps_feed_last', feedCont);
        for(var i in els) {
          removeClass(els[i], 'apps_feed_last');
        }
        ge('apps_recent_list').appendChild(cf(recent));
        var nextEl;
        while (nextEl = cur.feedHideEls.pop()) {
          feedCont.appendChild(nextEl);
        }
        feedCont.appendChild(cf(feed));
        if (!showMore) {
          hide('app_recent_more');
        }
      },
      showProgress: function() {
        obj.innerHTML = '<img src="/images/upload.gif" />';
      },
      hideProgress: function() {
        obj.innerHTML = cur.recentBack;
      }
    });
  },

  showMoreNew: function(obj) {
    if (!cur.blockBack) {
      cur.blockBack = obj.innerHTML;
    }
    if (cur.loadingNew) {
      return false;
    }
    if (!cur.shownNew) {
      cur.shownNew = 1;
      show('apps_new_hidden');
    }
    cur.loadingNew = 1;
    var onMoreLoaded = function(rows, newOffset, newCount) {
      cur.newOffset = newOffset;
      ge('apps_cat_new').appendChild(cf(rows));
      cur.loadingNew = 0;
      if (newOffset >= newCount) {
        hide(obj);
      }
      cur.morePreloaded = -1;
      ajax.post('al_apps.php', {act: 'more_new', offset: cur.newOffset}, {
        onDone: function(rows, newOffset, newCount) {
          if (cur.morePreloaded == -2) {
            onMoreLoaded(rows, newOffset, newCount);
          } else {
            cur.morePreloaded = [rows, newOffset, newCount];
          }
        },
        onFail: function() {
          cur.morePreloaded = false;
          return true;
        }
      });
    };

    if (cur.morePreloaded) {
      if (cur.morePreloaded == -1 || cur.morePreloaded == -2) {
        cur.morePreloaded = -2;
      } else {
        onMoreLoaded.apply(onMoreLoaded, cur.morePreloaded);
      }
      return;
    }

    ajax.post('al_apps.php', {act: 'more_new', offset: cur.newOffset}, {
      onDone: onMoreLoaded,
      showProgress: function() {
        obj.innerHTML = '<img src="/images/upload.gif" />';
      },
      hideProgress: function() {
        obj.innerHTML = cur.blockBack;
      },
      onFail: function() {
        cur.loadingNew = 0;
      }
    });
    cur.moreNewScroll = true;
  },

  updateOnline: function() {
    ajax.post('al_apps.php', {act: 'update_online', aid: cur.aid, hash: cur.app.options.hash}, {ads: 1});
  },

  updateOffline: function(c) {
    ajax.post('al_apps.php', {act: 'update_offline', aid: (c || cur).aid, hash: (c || cur).app.options.hash});
  },

  editBlacklist: function () {
    showBox('al_apps.php', {act: 'blacklist_box', height: lastWindowHeight}, {stat: ['privacy.css', 'indexer.js']});
    return false;
  },
  blacklistInit: function(box, owners, options) {
    options = options || {};

    var scrollNode = geByClass1('apps_blacklist_wrap', box.bodyNode);
    var contNode = geByClass1('apps_blacklist', box.bodyNode);
    var moreEl = geByClass1('olist_more', box.bodyNode, 'a');
    var unbanned = {};
    var indexer = new vkIndexer(owners, function(owner) {
      return owner[1];
    });

    box.setOptions({width: '407px', bodyStyle: 'padding: 0px'});
    box.removeButtons();
    box.addButton(getLang('global_close'), function () {
      box.hide(200);
    }, 'yes');
    contNode.parentNode.style.height = options.boxHeight+'px';

    var filter = geByClass1('olist_filter', box.bodyNode);
    placeholderSetup(filter, {back: 1});
    if (!options.nofocus) {
      setTimeout(elfocus.pbind(filter), 100);
    }

    if (moreEl) {
      if (!isVisible(moreEl)) {
        re(moreEl);
        show(moreEl);
      } else {
        moreEl.onclick = function (event) {
          renderList('', 60);
          return cancelEvent(event);
        }
      }
    }

    addEvent(filter, 'keyup', function (e) {
      renderList(clean(val(this)));
    });
    addEvent(contNode, 'click mouseover mouseout', onMouseEvent);
    addEvent(scrollNode, 'scroll', onScroll);

    function onScroll() {
      if (!moreEl || !moreEl.offsetTop || !moreEl.onclick) {
        return;
      }
      var y = moreEl.offsetTop,
          sh = contNode.scrollHeight,
          st = contNode.scrollTop,
          h = contNode.offsetHeight || contNode.clientHeight;

      if (st + h + 100 >= y) {
        moreEl.onclick();
      }
    }
    function onMouseEvent(event) {
      var target = event.originalTarget || event.target;
      while (target && target != bodyNode && (!target.className || target.className.indexOf('olist_item_wrap') == -1)) {
        target = target.parentNode;
      }
      if (!target || target == bodyNode) return;
      if (hasClass(target, 'olist_item_loading')) {
        return cancelEvent(event);
      }
      if (event.type == 'mouseover' || event.type == 'mouseout') {
        if (!hasClass(target, 'olist_item_wrap_on'))
          target.className = 'olist_item_wrap' + (event.type == 'mouseover' ? '_over' : '');
      } else {
        if (checkEvent(event)) return true;
        box.changed = true;
        var id = target.id.match(/-?\d+/)[0];
        var checked = unbanned[id];
        var hash = false;
        each (owners, function () {
          if (this[0] == id) {
            hash = this[4];
            return false;
          }
        });
        ajax.post('/al_apps.php', {act: 'a_blacklist_delete', cancel: checked, owner_id: id, hash: hash}, {
          onDone: function () {
            target.className = !checked ? 'olist_item_wrap_on' : 'olist_item_wrap_over';
            unbanned[id] = !checked;
          },
          showProgress: function () {
            addClass(target, 'olist_item_loading');
          },
          hideProgress: function () {
            removeClass(target, 'olist_item_loading');
          }
        });

        if (contNode.scrollTop < 50) {
          setTimeout(function () {
            elfocus(filter);
            if (val(filter).length) {
              filter.select();
            }
          }, 100);
        }

        return cancelEvent(event);
      }
    }
    function renderList(pattern, offset) {
      offset = offset || 0;
      var slice, tpl,
          limit = offset ? 60 : 120

      if (pattern) {
        pattern = pattern.replace(/\u2013|\u2014/g, '-');
      }
      slice = pattern ? indexer.search(pattern) : owners;
      tpl = options.tpl;

      var total = slice.length;
      slice = slice.slice(offset, offset + limit);
      var html = [];
      if (pattern) {
        var term = escapeRE(pattern), termRus = parseLatin(pattern);
        if (termRus != null) {
          term = term + '|' + escapeRE(termRus);
        }
        var regexp = new RegExp('(?![^&;]+;)(?!<[^<>]*)((\\(*)(' + term + '))(?![^<>]*>)(?![^&;]+;)', 'gi');
      }
      var rsTpl = function(obj, pattern, unbanned, regexp) {
        var checked = unbanned[obj[0]];
        var label = obj[1];
        if (pattern) {
          label = pattern.indexOf(' ') == -1 ? label.split(' ') : [label];
          var tmp = '';
          for (var i in label) {
            tmp += (i > 0 ? ' ' : '') + label[i].replace(regexp, '$2<em>$3</em>');
          }
          label = tmp;
        }
        return {
          id: obj[0],
          name: label,
          photo: obj[2],
          link: obj[3] || (obj[0] > 0 ? ('id' + obj[0]) : ('app' + (-obj[0] + 1000000000)))
        };
      }
      each (slice, function () {
        html.push(rs(tpl, rsTpl(this, pattern, unbanned, regexp)));
      });
      if (!offset && !html.length) {
        html.push('<div class="olist_empty">' + (pattern ? getLang('global_search_not_found').replace('{search}', clean(pattern)) : options.lang['apps_blacklist_empty']) + '</div>');
      }
      re(moreEl);
      html = html.join(' ');

      if (!offset) {
        val(contNode, html);
      } else {
        contNode.appendChild(cf(html));
      }
      if (total > offset + limit) {
        contNode.appendChild(moreEl);
        moreEl.onclick = function (event) {
          renderList(pattern, offset + limit);
          return cancelEvent(event);
        }
      }
      if (box && box.scroll) {
        box.scroll.update(false, true);
      }
    }
  }
};

try{stManager.done('apps.js');}catch(e){}
