var Dev = {

init: function(opts) {
  cur.searchEl = ge('dev_search');
  placeholderSetup(cur.searchEl, {back: true});

  cur.nav.push(function(changed, old, n) {
    debugLog(n);
    if (old[0] == 'dev' && !old.act) {
      return true;
    }
    if (n[0].substr(0, 4) == 'dev/' || (n[0] == 'dev' && n.act) && cur.page) {
      var page = n[0].substr(4);
      if (page) {
        Dev.switchPage(page, n.edit);
        return false;
      }
    }
  });

  var onKey = function(e) {
    if (cur.edit && e.keyCode == 83 && (e.ctrlKey || e.metaKey)) {
      var btn = ge('dev_save_button');
      btn.click();
      return cancelEvent(e);
    }
    if (e.keyCode == KEY.RETURN && hasClass(e.target, 'dev_param_field')) {
      ge('dev_req_run_btn').click();
    }
  }
  addEvent(document, 'keydown', onKey);
  cur.destroy.push(function() {
    removeEvent(document, 'keydown', onKey);
  });

  Dev.initPage(opts);
  if (cur.page) {
    Dev.initSuggestions();
  }
},

initPage: function(opts) {
  if (opts.edit) {
    var desc = ge('dev_method_desc');
    placeholderSetup(desc, {back: true});
    var simular = ge('dev_edit_simular');
    placeholderSetup(simular, {back: true});
    var textareas = geByClass('dev_textarea', ge('dev_page'));
    for(var i in textareas) {
      autosizeSetup(textareas[i], {});
    }
    elfocus(desc);
  }
  if (opts.res) {
    Dev.requestResult(parseJSON(opts.res));
  }
  extend(cur, opts);
  elfocus(cur.searchEl);
},

switchPage: function(page, edit) {
  cur.page = page;
  var pageRaw = page.split('.');
  Dev.switchSection(pageRaw[0], false, true)

  var curSel = geByClass1('dev_mlist_sel', ge('dev_mlist_cont'));
  removeClass(curSel, 'dev_mlist_sel');
  var newSel = ge('dev_mlist_'+page.replace('.', '_'));
  if (newSel) {
    addClass(newSel, 'dev_mlist_sel');
  }

  var actsCont = ge('dev_page_acts');
  ajax.post('/dev/'+page, {preload: 1, edit: edit ? 1 : 0}, {
    onDone: function(title, text, acts, edit_sections, isPage, opts, js) {
      ge('dev_header_name').innerHTML = title;
      ge('dev_page_cont').innerHTML = text;
      ge('dev_page_acts').innerHTML = acts;
      ge('dev_page_sections').innerHTML = edit_sections;
      nav.setLoc('dev/'+page+(edit ? '?edit=1' : ''));
      if (isPage) {
        hide('dev_method_narrow');
        show('dev_page_narrow');
      } else {
        show('dev_method_narrow');
        hide('dev_page_narrow');
      }
      Dev.initPage(opts);
      if (js) {
        eval('(function(){' + js + ';})()');
      }
      scrollToTop(0);
    },
    showProgress: function() {
      if (newSel && !cur.devSectLoader) {
        cur.devSectLoader = actsCont.innerHTML;
        actsCont.innerHTML = '<div class="progress_inline dev_sect_load fl_r"></div>';
      }
    },
    hideProgress: function() {
      if (cur.devSectLoader) {
        actsCont.innerHTML = cur.devSectLoader;
        cur.devSectLoader = false;
      }
    }
  });
},

switchSection: function(sect, openSect, onlyIfSect) {
  if (cur.sect == sect) {
    return;
  }
  if (!cur.sections || !cur.sections[sect]) {
    if (onlyIfSect) {
      return;
    }
    sect = 'users';
  }
  var rows = cur.sections[sect]['list'];
  var name = cur.sections[sect]['name'];
  ge('dev_section_menu').innerHTML = name;
  if (cur.methodsDD && cur.methodsDD.header && cur.methodsDD.header.firstChild) {
    cur.methodsDD.header.firstChild.innerHTML = name;
  }
  var html = '';
  var firstMethod = false;
  for (var i in rows) {
    var name = rows[i];
    if (!firstMethod) {
      firstMethod = name;
    }
    html += '<a id="dev_mlist_'+(name.replace(/\./g, '_'))+'" class="dev_mlist_item'+(cur.page == name ? ' dev_mlist_sel' : '')+'" href="/dev/'+name+'">'+name+'</a>';
  }
  var mlist = ge('dev_mlist_list');
  mlist.innerHTML = html;
  cur.sect = sect;
  if (openSect) {
    nav.go('/dev/'+sect);
  }
},

getParamName: function(obj) {
  var name = obj.id.replace(/^dev_edit_/, '');
  return name.substr(0, 1).toUpperCase() + name.substr(1);
},

saveDoc: function(hash, btn) {
  var params = {act: 'a_save_page', hash: hash, page: cur.page, type: cur.type};
  var textareas = geByClass('dev_textarea', ge('dev_page'));
  for (var i in textareas) {
    params[Dev.getParamName(textareas[i])] = val(textareas[i]);
  }
  var inputs = geByClass('dev_input', ge('dev_page'));
  for (var i in inputs) {
    params[Dev.getParamName(inputs[i])] = val(inputs[i]);
  }
  var parents = [];
  if (cur.dropDowns) {
    for (var i in cur.dropDowns) {
      var iItem = cur.dropDowns[i];
      var value = iItem.val();
      if (parseInt(value) != -1) {
        for(var k in iItem.options.defaultItems) {
          var kItem = iItem.options.defaultItems[k];
          if (kItem[0] == value) {
            parents.push(kItem[2]);
            break;
          }
        }
      }
    }
  }
  params['parents'] = parents.join(',');
  ajax.post('dev', params, {
    onDone: function(msg) {
      showDoneBox(msg);
    },
    showProgress: lockButton.pbind(btn),
    hideProgress: unlockButton.pbind(btn)
  })
},


parentChange: function(dd, v, objId) {
  var cont = ge(objId);

  var el = cont;
  var nextEl = el.nextSibling;
  while (nextEl) {
    if (hasClass(nextEl, 'dev_sel_section')) {
      for (var i in cur.dropDowns) {
        if (cur.dropDowns[i].container.parentNode == nextEl) {
          cur.dropDowns.splice(i ,1);
        }
      }
      re(nextEl);
    } else {
      el = nextEl;
    }
    nextEl = el.nextSibling;
  }
  if (parseInt(v) == -1) {
    var name = '';
  } else {
    var name = '';
    for (var i in dd.defaultItems) {
      if (parseInt(dd.defaultItems[i][0]) == parseInt(v)) {
        name = dd.defaultItems[i][2];
      }
    }
  }
  var prg = ge('dev_sections_progress');
  var parents = [];
  if (cur.dropDowns) {
    for (var i in cur.dropDowns) {
      var iItem = cur.dropDowns[i];
      var value = iItem.val();
      if (parseInt(value) == -1) {
        break;
      } else {
        for(var k in iItem.options.defaultItems) {
          var kItem = iItem.options.defaultItems[k];
          debugLog(kItem);
          if (kItem[0] == value) {
            parents.push(kItem[2]);
            break;
          }
        }
      }
    }
  }
  ajax.post('dev', {act: 'a_get_sections', name: name, page: cur.page, parents: parents.join(','), hash: cur.editHash}, {
    onDone: function(rows, js) {
      cont.parentNode.insertBefore(cf(rows), prg);
      eval('(function(){' + js + ';})()');
    },
    showProgress: show.pbind(prg),
    hideProgress: hide.pbind(prg)
  });
},

methodRun: function(hash, btn) {
  var params = {hash: hash};
  var paramsFields = geByClass('dev_param_field', ge('dev_params_wrap'));

  var params = {act: 'a_run_method', method: cur.page, hash: hash};
  for (var i in paramsFields) {
    var el = paramsFields[i];
    var v = val(el);
    if (v !== '') {
      params['param_'+el.id.substr(10)] = v;
    }
  }
  if (cur.edit) {
    params['_edit'] = '1';
  }
  ajax.post('dev', params, {
    onDone: function(code) {
      var res = parseJSON(code);
      Dev.requestResult(res);
    },
    onFail: function(msg) {
      setTimeout(showFastBox({title: getLang('global_error'), width: 500}, '<div style="word-wrap: break-word;">'+msg+'</div>').hide, 2000);
      return true;
    },
    showProgress: lockButton.pbind(btn),
    hideProgress: unlockButton.pbind(btn)
  });
},

wrapObject: function(obj, noCover) {
  var html = '';
  if (!cur.wrapNum) {
    cur.wrapNum = 0;
  }
  switch (typeof obj) {
    case 'object':
      var items = [];
      if (Object.prototype.toString.call( obj ) == '[object Array]') {
        for (var i in obj) {
          items.push(Dev.wrapObject(obj[i]));
        }
        html += '<span class="dev_result_block"><span class="dev_result_lbracket">[</span>'+items.join(', ')+'<span class="dev_result_lbracket">]</span></span>';
      } else {
        for (var i in obj) {
          items.push('<span class="dev_result_key">'+i+':</span> '+Dev.wrapObject(obj[i]));
        }
        var res = '<div class="dev_result_obj">'+items.join(',<br/>')+'</div>';
        if (noCover) {
          html += res;
        } else {
          html += '<span class="dev_result_block"><span id="dev_wrap_open_'+cur.wrapNum+'" class="dev_result_bracket">{</span><br/>'+res+'<span id="dev_wrap_close_'+cur.wrapNum+'" class="dev_result_bracket">}</span></span>';
          cur.wrapNum += 1;
        }
      }
      break;
    case 'string':
      var str = clean(obj);
      if (obj.match(/^http:\/\/.*/)) {
        str = '<a href="'+str+'" target="_blank">'+str+'</a>';
      }
      html += '<span class="dev_result_str">\''+str+'\'</span>';
      break;
    case 'number':
      html += '<span class="dev_result_num">'+obj+'</span>';
      break;
    case 'boolean':
      html += '<span class="dev_result_bool">'+obj+'</span>';
    default:
      debugLog('unknown type', typeof obj);
      break;
  }
  return html;
},

requestResult: function(res) {
  var html = Dev.wrapObject(res, true);
  ge('dev_result').innerHTML = html;
},

resultMove: function(el) {
  var res = ge('dev_result');
  debugLog(el);
  while(el) {
    if (hasClass(el, 'dev_result_block')) {
      addClass(el, 'dev_result_highlight')
      break;
    }
    el = el.parentNode;
    if (el == res) {
      break;
    }
  }
  if (cur.highLighted != el) {
    removeClass(cur.highLighted, 'dev_result_highlight')
    cur.highLighted = el;
  }
},

onSearchChange: function(el, ev) {
  if (ev) {
    switch(ev.keyCode) {
      case KEY.DOWN:
        return Dev.selSuggRow(false, 1, ev);
        break;
      case KEY.UP:
        return Dev.selSuggRow(false, -1, ev);
        break;
      case KEY.RETURN:
        return Dev.onSearchSelect();
        break;
      case KEY.ESC:
        val(el, '');
        break;
    }
  }
  setTimeout(function() {
    var v = val(el).toLowerCase().replace(/[^a-zа-я]+/g, '');
    if (v) {
      if (v == cur.prevSearch) {
        return show('dev_search_suggest');;
      }
      var reStr = '';
      for (var i = 0; i < v.length; i++) {
        reStr += v.substr(i, 1)+'.*?';
      }
      var regEx = new RegExp('.*?('+reStr+')', 'i');
      var regExPrior = new RegExp('^('+reStr+')', 'i');
      var found = [];
      for(var i in cur.sections) {
        var list = cur.sections[i].list;
        for (var k in list) {
          var method = list[k];
          var m = method.match(regExPrior);
          if (m) {
            found.push([method, method.length]);
          } else {
            var m = method.match(regEx);
            if (m) {
              found.push([method, method.length+2]);
            }
          }
        }
      }
      found = found.sort(function(a, b) {
        if (a[1] < b[1]) {
          return -1;
        } else if (a[1] > b[1]) {
          return 1
        } else {
          return 0;
        }
      });
      var foundList = [];
      for (var i in found) {
        foundList.push(found[i][0])
      }
      Dev.showSuggestions(foundList, v);
    } else {
      Dev.showSuggestions();
    }
    cur.prevSearch = v;
  }, 0);
},

initSuggestions: function() {
  var cont = ge('dev_search_suggest_list');
  debugLog('init sugg');
  stManager.add(['notifier.css', 'notifier.js'], function() {
    debugLog('go next');
    cur.scroll = new Scrollbar(cont, {
      prefix: 'fc_',
      nomargin: true,
      global: true,
      nokeys: true,
      right: vk.rtl ? 'auto' : 0,
      left: !vk.rtl ? 'auto' : 0
    });
  });
},

showSuggestions: function(list, v) {
  if (list && list.length) {
    var cont = ge('dev_search_suggest_list');
    var html = '';
    var reStr = [];
    for (var i = 0; i < v.length; i++) {
      reStr.push(v.substr(i, 1));
    }
    var reg = new RegExp(reStr.join('.*?'), 'i');
    for(var i in list) {
      var name = list[i];
      name = name.replace(reg, function(found) {
        return '<em>'+found+'</em>';
      })
      html += '<a class="dev_search_row" onmousedown="return Dev.onSearchSelect(event);" onmouseover="Dev.selSuggRow(this);">'+name+'</a>';
    }
    cont.innerHTML = html;
    show('dev_search_suggest');
    if (cur.scroll) {
      cur.scroll.scrollTop(0);
      cur.scroll.update(false, true);
    }
  } else {
    hide('dev_search_suggest');
    debugLog('hiden');
  }

},

onSearchSelect: function(ev) {
  var cont = ge('dev_search_suggest_list');
  var el = ge('dev_search');
  var curSel = geByClass1('dev_sugg_sel', cont);
  var method = false;
  var q = val(el);
  if (curSel) {
    method = val(curSel).replace(/<[^>]*>/g, '');
  } else {
    firstSel = geByClass1('dev_search_row', cont);
    var methodStr = (val(firstSel) || '').replace(/<[^>]*>/g, '');
    if (methodStr && methodStr.replace(/[\. ]/g, '').toLowerCase().indexOf(q.replace(/[\. ]/g, '').toLowerCase()) === 0) {
      if (methodStr.split('.')[0].toLowerCase().indexOf(q.toLowerCase()) === 0) {
        method = methodStr.split('.')[0];
      } else {
        method = methodStr;
      }
    }
  }

  if (method) {
    nav.go('dev/'+method);
    val(el, '');
  } else {
    nav.go('dev?act=search&q='+q);
  }
  Dev.onSearchChange(el, ev);
  return cancelEvent(ev);
},

selSuggRow: function(obj, move, ev) {
  if (!isVisible(ge('dev_search_suggest'))) {
    return false;
  }
  var cont = ge('dev_search_suggest_list');
  var curSel = geByClass1('dev_sugg_sel', cont);
  if (!obj) {
    if (move == 1 && curSel) {
      obj = curSel.nextSibling;
    } else if (move == -1 && curSel) {
      obj = curSel.previousSibling;
      if (!obj) {
        var listRows = geByClass('dev_search_row', cont);
        obj = listRows[listRows.length - 1];
      }
    }
    if (!obj) {
      obj = geByClass1('dev_search_row', cont);
    }
  }
  if (curSel != obj) {
    if (curSel) {
      removeClass(curSel, 'dev_sugg_sel');
    }
    addClass(obj, 'dev_sugg_sel');
    if (move) {
      var y = getXY(obj)[1];
      var stY = getXY(cont)[1];
      var pos = y - stY - cont.scrollTop;
      var minHeight = getSize(obj)[1];
      var maxHeight = 250 - getSize(obj)[1];
      if (pos > maxHeight) {
        cur.scroll.scrollTop(cont.scrollTop + pos - maxHeight);
      } else if (pos < 0) {
        cur.scroll.scrollTop(Math.max(0, cont.scrollTop + pos));
      }
    }

  }
  return cancelEvent(ev);

},

onSearchBlur: function() {
  hide('dev_search_suggest');
},

checkParamVal: function(obj, ev, type, checks) {
  switch(ev.keyCode) {
    case KEY.UP:
      if (type == 'int' || type == 'positive') {
        val(obj, intval(val(obj)) + 1);
      }
      break;
    case KEY.DOWN:
      if (type == 'int' || type == 'positive') {
        val(obj, intval(val(obj)) - 1);
      }
      break;
  }
  setTimeout(function() {
    var v = val(obj);
    var startVal = v;
    switch(type) {
      case 'int':
        v = (v == '-') ? '-' : intval(v);
        break;
      case 'positive':
        v = positive(v);
        break;
    }
    if (v != startVal) {
      val(obj, v);
    }

  }, 0)

},

toggleMethodListHeader: function(obj) {
  var v = val(obj);
  if (hasClass(obj, 'dev_methods_list_min')) {
    removeClass(obj, 'dev_methods_list_min');
    addClass(obj, 'dev_methods_list_max');
  } else {
    if (!v) {
      addClass(obj, 'dev_methods_list_min');
      removeClass(obj, 'dev_methods_list_max');
    }
  }
},

showPageSettings: function() {

},

reportError: function(address, title) {
  return !showBox('/bugs', {act: 'new_box', doc: address, doc_title: title}, {
    stat: ['wide_dd.js', 'wide_dd.css', 'page.css', 'page.js', 'upload.js'],
    cache: 1,
    params: {
      width: 500,
      hideButtons: true,
      bodyStyle: 'border: 0px; padding: 0px'
    }
  });
},

paletteDown: function(ev, down, y, noChangeColor) {
  var palette = ge('dev_palette');
  var height = getSize(palette)[1];
  if (y === undefined) {
    var y = ev.offsetY || ev.layerY;
  }
  var y = Math.max(0, Math.min(y, height));
  var t =  Math.round(y / (height / 360));
  t = Math.abs(t - 360);
  t = (t == 360)? 0 : t;
  ge('dev_colors').style.backgroundColor = "rgb("+Dev.hsv2rgb(t,100,100)+")";
  if (!noChangeColor) {
    Dev.setColor(Dev.hsv2rgb(t, cur.pickerX, cur.pickerY));
  }
  cur.pickerT = t;
  var pointer = ge('dev_picker1');
  setStyle(pointer, {marginTop: y - 1});
  if (down) {
    var yMain = ev.clientY;
    var onMove = function(evNew) {
      Dev.paletteDown(evNew, false, y + evNew.clientY - yMain);
    }
    addEvent(window, 'mousemove', onMove);

    addEvent(window, 'mouseup', function(evNew) {
      removeEvent(window, 'mousemove', onMove)
    });
  }
  return cancelEvent(ev);
},

colorsDown: function(ev, down, x, y, noChangeColor) {
  var pointer = ge('dev_picker2');
  var colors = ge('dev_colors');
  var size = getSize(colors);
  if (x === undefined) {
    var x = ev.offsetX || ev.layerX;
  }
  if (y === undefined) {
    var y = ev.offsetY || ev.layerY;
  }
  y = Math.max(0, Math.min(y, size[1]));
  x = Math.max(0, Math.min(x, size[0]));
  setStyle(pointer, {marginTop: y - 6, marginLeft: x - 7});
  cur.pickerX = x / size[0] * 100;
  cur.pickerY = 100 - y / size[1] * 100;
  if (!noChangeColor) {
    Dev.setColor(Dev.hsv2rgb(cur.pickerT, cur.pickerX, cur.pickerY));
  }
  if (down) {
    var yMain = ev.clientY;
    var xMain = ev.clientX;
    var onMove = function(evNew) {
      Dev.colorsDown(evNew, false, x + evNew.clientX - xMain, y + evNew.clientY - yMain);
    }
    addEvent(window, 'mousemove', onMove);
    addEvent(window, 'mouseup', function(evNew) {
      removeEvent(window, 'mousemove', onMove)
    });
  }
  return cancelEvent(ev);
},

hsv2rgb: function (H,S,V){
  debugLog('try', H, S, V);
  var f, p, q , t, lH, R, G, B;

  S /=100;
  V /=100;

  lH = Math.floor(H / 60);

  f = H/60 - lH;
  p = V * (1 - S);
  q = V *(1 - S*f);
  t = V* (1 - (1-f)* S);

  switch (lH) {
    case 0: R = V; G = t; B = p; break;
    case 1: R = q; G = V; B = p; break;
    case 2: R = p; G = V; B = t; break;
    case 3: R = p; G = q; B = V; break;
    case 4: R = t; G = p; B = V; break;
    case 5: R = V; G = p; B = q; break;
  }

  return [parseInt(R*255), parseInt(G*255), parseInt(B*255)];
},
rgb2hsv: function(rgb) {
  var rr, gg, bb,
  r = rgb[0] / 255,
  g = rgb[1] / 255,
  b = rgb[2] / 255,
  h, s,
  v = Math.max(r, g, b),
  diff = v - Math.min(r, g, b),
  diffc = function(c){
    return (v - c) / 6 / diff + 1 / 2;
  };

  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(r);
    gg = diffc(g);
    bb = diffc(b);

    if (r === v) {
      h = bb - gg;
    } else if (g === v) {
      h = (1 / 3) + rr - bb;
    } else if (b === v) {
      h = (2 / 3) + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
},
hex2rgb: function(hex) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
  ] : [0,0,0];
},

setColor: function(color) {
  var col = ge('dev_colorbox'+cur.colorNum);
  setStyle(col, {backgroundColor: 'rgb('+color.join(',')+')'});
  var colInp = ge('groups_color'+cur.colorNum);
  var hex = [color[0].toString(16), color[1].toString(16), color[2].toString(16)];
  for(var i in hex) if (hex[i].length == 1) hex[i] = '0' + hex[i];
  val(colInp, hex.join('').toUpperCase());
  cur.soonUpdatePreview();
},

showColorBox: function(obj, num, ev) {
  if (browser.msie && browser.version < 9) {
    return false;
  }
  cur.colorNum = num;
  var wrap = ge('dev_community_colors');
  var cont = ge('dev_colorpicker');
  var colors = ge('dev_colors');
  var palette = ge('dev_palette');
  var shownHere = false;
  if (!cur.colorShown) {
    fadeIn(cont, 200);
    var shownHere = true;
    cur.colorShown = true;
  }
  var posY = (getXY(obj)[1] - getXY(wrap)[1]);
  if (cur.colorInited) {
    animate(cont, {marginTop: -180 + posY}, 200)
  } else {
    setStyle(cont, {marginTop: -180 + posY})
    var palSize = getSize(palette);
    var pal = palette.getContext('2d');
    var gradient = pal.createLinearGradient(palSize[0]/2,palSize[1],palSize[0]/2,0);
    var hue = [[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255],[255,0,0]];
    for (var i=0; i <= 6; i++){
      color = 'rgb('+hue[i][0]+','+hue[i][1]+','+hue[i][2]+')';
      gradient.addColorStop(i*1/6, color);
    };
    pal.fillStyle = gradient;
    pal.fillRect(0, 0, palSize[0], palSize[1]);
    addEvent(document, 'mouseup', function() {
      cur.paletteDown = false;
    })
  }
  var colInp = ge('groups_color'+cur.colorNum);
  var color = val(colInp);
  var rgb = Dev.hex2rgb(color);
  var hsv = Dev.rgb2hsv(rgb);

  Dev.paletteDown(false, false, (360 - hsv.h) / 360 * getSize(palette)[1], true);
  var colorsSize = getSize(colors);
  Dev.colorsDown(false, false, (hsv.s) / 100 * colorsSize[0], (100 - hsv.v) / 100 * colorsSize[1], true);

  var onWndMove = function(ev) {
    var el = ev.target;
    while(el) {
      if (el.id == 'dev_colorpicker' || hasClass(el, 'dev_colorbox_cont')) {
        if (cur.colorBoxHideTimeout) {
          debugLog('cancel Hide');
          clearTimeout(cur.colorBoxHideTimeout);
          cur.colorBoxHideTimeout = false;
        }
        return false;
      }
      el = el.parentNode;
    }
    if (cur.colorBoxHideTimeout) {
      return false;
    }
    cur.colorBoxHideTimeout = setTimeout(function() {
      fadeOut(cont, 200);
      cur.colorShown = false;
      removeEvent(window, 'mousemove', onWndMove);
    }, 500);

  };
  if (shownHere) {
    addEvent(window, 'mousemove', onWndMove);
  }

  cur.colorInited = true;
  return cancelEvent(ev);
},

_eof:1};try{stManager.done('dev.js');}catch(e){}
