var AppsEdit = {

init: function() {
  cur.module = 'apps_edit';
  cur.nav.push((function(changed, old, n) {
    if (changed[0] === undefined && changed['section']) {
      this.switchSection(n['section']);
      return false;
    }
  }).bind(this));
},

switchTab: function(tab, event) {
  if (checkEvent(event)) return;
  if (nav.objLoc.section == tab) return;
  var el = ge('tab_' + tab);
  if (el) {
    var tabs = geByClass('active_link', ge('apps_edit_tabs'));
    for (var i in tabs) {
      removeClass(tabs[i], 'active_link');
    }
    addClass(el, 'active_link');
  }
  show('apps_edit_progress');
  if (tab == 'stats') {
    return nav.go('/stats?aid='+cur.aid, event);
  } else {
    nav.change({section: tab});
  }
},

switchSection: function(section) {
  ajax.post('editapp', {section: section, id: cur.aid, load: 1}, {
    onDone: function(content, script, searchBar) {
      hide('apps_edit_progress');
      ge('app_edit_wrap').innerHTML = content;
      re('apps_edit_search_wrap');
      if (searchBar) {
        var container = ge('app_edit');
        container.insertBefore(se(searchBar), geByClass1('app_edit_main', container));
      }
      if (script) eval(script);
      AppsEdit.hideError();
      nav.setLoc(extend(nav.objLoc, {section: section}));
    },
    onFail: AppsEdit.showError
  });
},

showError: function(error, errorObj) {
  if (!error) {
    return true;
  }
  hide('apps_edit_progress');
  if (errorObj) {
    var editError = ge(errorObj);
    show(editError);
  } else {
    var editError = ge('app_edit_error');
    show(ge('app_edit_error_wrap'));
    scrollToTop(200);
  }
  cur.errorShown = true;
  editError.innerHTML = error;
  return true;
},

hideError: function() {
  if (cur.errorShown) {
    hide('app_edit_error_wrap');
    cur.errorShown = false;
  }
},

showRulesBox: function(accept) {
  return !showBox('editapp', {act: 'show_rules', accept: accept}, {cache: 1, params:{width: '550px'},
    onDone: AppsEdit.hideError,
    onFail: AppsEdit.showError
  });
},

getParams: function() {
  var cont = ge('app_edit_cont');
  var params = new Object();
  var trimId = function(id) {
    return (id.indexOf('app_') == 0) ? id.substr(4) : id;
  }
  var inputs = geByTag('input', cont);
  for (var i in inputs) {
    var el = inputs[i];
    if (el.id) {
      params[trimId(el.id)] = val(el);
    }
  }
  var textarea = geByTag('textarea', cont);
  for (var i in textarea) {
    var el = textarea[i];
    if (el.id && el.value) {
      params[trimId(el.id)] = val(el);
    }
  }
  var checkboxes = geByClass('checkbox', cont);
  for (var i in checkboxes) {
    var el = checkboxes[i];
    if (el.id) {
      params[trimId(el.id)] = isChecked(el) ? 1 : 0;
    }
  }
  for (var i in window.radioBtns) {
    params[trimId(i)] = window.radioBtns[i].val;
  }
  for (var i in cur.dropDowns) {
    params[trimId(i)] = cur.dropDowns[i].val();
  }
  delete params['selectedItems'];
  return params;
},

saveOptions: function(act, confirm) {
  var params = this.getParams('app_edit_cont');
  params.act = act || 'save_options';
  params['help'] = Privacy.getValue('help');
  if (act != 'save_info') {
    params['openapi'] = Privacy.getValue('openapi');
    params['need_install'] = Privacy.getValue('install');
    if (isChecked('apps_push_sandbox')) {
      params['apps_push_sandbox'] = 1;
    }
    if (cur.privacy['push']) {
      params['push'] = Privacy.getValue('push');
    }
    var settingsRaw = Privacy.getValue('require');
    settingsRaw = settingsRaw.split('_');
    if (settingsRaw[1]) {
      settingsRaw = settingsRaw[1].split(',');
      for (var i in settingsRaw) {
        var pref = cur.maskByGroupNum[parseInt(settingsRaw[i]) - 300];
        params['access_'+pref] = 1;
      }
    } else {
      var settings = 0;
    }
  }
  if (confirm) {
    params['confirm'] = 1;
  }
  lockButton(ge('app_save_btn'));
  var onPost = function() {
    unlockButton(ge('app_save_btn'));
  }
  ajax.post('editapp', params, {
    onDone: function(type, text, data) {
      onPost();

      hide('apps_options_saved');
      if (type == 'confirm') {
        showFastBox(text, data, getLang('global_continue'), function() {
          curBox().hide();
          AppsEdit.saveOptions(act, true);
        }, getLang('global_cancel'));
      } else if (type == 'error') {
        if (data == 'domain') {
          var tbl = ge('apps_addr_table');
          setStyle(tbl, 'backgroundColor', '#FAEAEA');
          setTimeout(animate.pbind(tbl, {backgroundColor: '#FFFFFF'}, 300), 400);
          elfocus('app_domain');
          var resultCont = ge('apps_addr_result');
          resultCont.innerHTML = text;
          fadeIn(resultCont, 200);
          scrollToTop(200);
        } else if (data == 'base_domain') {
          notaBene(cur.selectDD.control.firstChild);
          cur.selectDD.focusInput();
        } else {
          var el = ge('app_'+data);
          elfocus(el);
          setStyle(el, 'backgroundColor', '#FAEAEA');
          setTimeout(animate.pbind(el, {backgroundColor: '#FFFFFF'}, 300), 400);
        }
      } else {
        if (data.domain) {
          var domainEl = ge('app_domain');
          if (domainEl) {
            domainEl.value = data.domain;
          }
          hide('apps_addr_result');
        }
        if (data.titleNotice) {
          ge('app_name_notice').innerHTML = data.titleNotice;
          show('app_name_notice');
          if (data.titleHide) {
            addClass('app_name', 'apps_edit_input_readonly');
            ge('app_name').readOnly = true;
          } else {
            removeClass('app_name', 'apps_edit_input_readonly');
            ge('app_name').readOnly = false;
          }
        }
        var el = ge('apps_options_saved');
        el.innerHTML = text;
        show(el);
        scrollToTop(200);
      }
    },
    onFail: function(error) {
      onPost();
      hide('apps_options_saved');
      return AppsEdit.showError(error);
    }
  })
},

loadCheckHistory: function(aid) {
  if (isVisible('apps_check_history')) {
    hide('apps_check_history');
  } else {
    show('apps_check_history');
    ge('apps_check_history').innerHTML = '<div style="text-align: center; margin: 30px;"><img src="images/progress7.gif" /></div>';
    ajax.post('apps_check.php', {act: 'a_check_history', no_version: 1, app_id: aid}, {
      onDone: function(text) {
        ge('apps_check_history').innerHTML = text;
      }
    });
  }
},

setMultilang: function(aid, enabled, hash, obj) {
  ajax.post('apps_check', {act: 'switch_multilang', aid: aid, enabled: enabled, hash: hash}, {
    onDone: function() {
      nav.reload();
    }
  })
},

resetNameCounter: function(aid, hash) {
  ajax.post('apps_check', {act: 'a_reset_counters', aid: aid, hash: hash}, {
    onDone: function() {
      nav.reload();
    }
  })
},

adminApp: function(act, id, hash, action, penalty, newCheck, banDomain, warnUsers, customOption, customField) {
  var box = showFastBox(cur.appEditAdminTitle, '<div id="apps_show_penalty" style="display:none;"><div style="color:#666;padding:5px 0;">'+cur.appEditAdminPenalty+'</div><input type="text" id="apps_penalty" class="text" style="width:310px" value="'+penalty+'"/></div><div style="color:#666;padding:5px 0;">'+cur.appEditAdminComment+'</div><textarea id="apps_check_comment" style="width:310px;height:100px;"></textarea><div style="color:#666;padding:5px 0;">'+cur.appEditAdminInternalComment+'</div><textarea id="apps_check_internal_comment" style="width:310px;height:100px;"></textarea>'+(banDomain || '')+(warnUsers || '')+(customOption || ''));
  box.setOptions({width: 350});
  if (penalty > 0) {
    show('apps_show_penalty');
  } else {
    hide('apps_show_penalty');
  }
  box.removeButtons();
  box.addButton(getLang('box_cancel'), box.hide, 'no');
  box.addButton(action, function() {
    if (cur.adminActStarted) return;
    cur.adminActStarted = true;
    var params = {act: act, id: id, hash: hash, penalty: ge('apps_penalty').value, comment: ge('apps_check_comment').value, internal_comment: ge('apps_check_internal_comment').value};
    if (banDomain) {
      params['ban_domain'] = isChecked('admin_app_bandomain');
    }
    if (warnUsers) {
      params['warn_users'] = isChecked('admin_app_warnusers');
    }
    if (customOption) {
      params[customField] = isChecked('admin_custom_field');
    }
    ajax.post(newCheck ? 'apps_check' : 'apps_check.php', params, {
      onDone: function() {
        nav.reload();
      },
      showProgress: box.showProgress,
      hideProgress: box.hideProgress
    });
  }, 'yes');
},

uploadIcon: function() {
	showBox('editapp', {act: 'upload_icon_box', aid: cur.aid}, {params: {width: '430px', bodyStyle: 'padding: 0px; position: relative;'}});
},

uploadPhoto: function(big) {
  showBox('editapp', {act: 'upload_photo_box', aid: cur.aid, big: big ? 1 : 0, edit_lang: cur.editLang}, {params: {width: '438px', bodyStyle: 'padding: 0px; position: relative;'}});
},

checkAddress: function (timeout) {
  cur.addrUnchecked = 0;
  clearTimeout(cur.addressCheckTO);
  if (cur.lastAddress == val('app_domain')) return;
  cur.addressCheckTO = setTimeout(AppsEdit.doCheckAddress, timeout || 0);
},

doCheckAddress: function () {
  var resultCont = ge('apps_addr_result');
  fadeOut(resultCont, 200);
  cur.lastAddress = val('app_domain');
  hide('apps_addr_result');
  ajax.post('editapp', {act: 'a_check_address', name: cur.lastAddress, aid: cur.aid}, {
    onDone: function (msg) {
      cur.addrChecked = 1;
      resultCont.innerHTML = msg;
      fadeIn(resultCont, 200);
    },
    onFail: function (msg) {
      cur.addrChecked = -1;
      resultCont.innerHTML = msg;
      fadeIn(resultCont, 200);
      return true;
    }
  });
},

deleteApp: function() {
  showBox('editapp', {act: 'delete_app_box', aid: cur.aid});
},

activateRow: function(obj) {
  var el = geByClass('apps_edit_delete_row',  obj);
  if (el[0].active) return;
  animate(el[0], {backgroundColor: '#C4D2E1'}, 200);
},

deactivateRow: function(obj) {
  var el = geByClass('apps_edit_delete_row',  obj);
  if (el[0].active) return;
  animate(el[0], {backgroundColor: '#FFF'}, 200);
},

activateDelete: function(obj) {
  obj.active = true;
  animate(obj, {backgroundColor: '#6B8DB1'}, 200);
  showTooltip(obj, {text: getLang('global_delete'), showdt: 500});
},

deactivateDelete: function(obj) {
  obj.active = false;
  animate(obj, {backgroundColor: '#C4D2E1'}, 200);
  if (window.tooltips) {
    tooltips.hide(obj);
  }
},

addSWF: function() {
  showBox('editapp', {act: 'add_swf_box', aid: cur.aid}, {params: {width: '430px', bodyStyle: 'padding: 0px; position: relative;'}});
},

deleteSWF: function(rowId, hash, obj) {
  tooltips.hide(obj);
  var box;
  var save = function() {
    box.showProgress();
    ajax.post('editapp', {act: 'a_delete_swf', aid: cur.aid, swf_id: rowId, hash: hash}, {onDone: function(resp) {
      box.hideProgress();
      box.content(resp);
      box.removeButtons();
      box.addButton(getLang('global_close'), box.hide);
      setTimeout(box.hide, 2000);
      re('apps_edit_swf_'+rowId);
      var rows = geByClass('apps_edit_swf_row', ge('apps_edit_flash_other_options'));
      if (rows.length == 1) {
        re(rows[0]);
      }
    }});
  };
  var hide = function() {
    box.hide();
  };
  box = showFastBox(getLang('apps_title_file_delete'), getLang('apps_confirm_file_delete'), getLang('global_delete'), save, getLang('global_cancel'), hide);
},

updateSWF: function() {
  showBox('editapp', {act: 'update_swf_box', aid: cur.aid}, {params: {width: '430px', bodyStyle: 'padding: 0px; position: relative;'}});
},

showHint: function(el, up, shift) {
  el = ge(el);
  text = cur.hint[el.id];
  clearTimeout(cur.hideHintTimout);
  if (!up) {
    showTooltip(el, {
      text: '<div class="apps_edit_side_tt_pointer apps_edit_name_pointer"></div>' + text,
      slideX: 15,
      className: 'apps_edit_side_tt apps_edit_side_name_tt',
      shift: shift || [-272, 0, -55],
      forcetodown: true
    });
  } else {
    showTooltip(el, {
      text: text,
      slide: 15,
      className: 'apps_edit_up_tt',
      shift: [0, -1, 0]
    });
  }
},

hideHint: function(el) {
  el = ge(el);
  clearTimeout(cur.hideHintTimout);
  cur.hideHintTimout = setTimeout(function() {
    if (window.tooltips && el.tt) {
      el.tt.hide();
    }
  }, 500);
},

showSecret: function(aid, hash) {
  ajax.post('al_apps_edit.php', {act: 'a_show_secret', aid: aid, hash: hash}, {
    onDone: function(title, html, js) {
      var box = showFastBox(title, html);
      eval(js);
    },
    loader: 1
  });
},

changeType: function(aid, hash, new_type) {
  obj = ge('apps_check_change_type');
  obj.innerHTML = '<img src="/images/upload.gif" />';
  ajax.post('apps_check', {act: 'change_type', aid: aid, hash: hash, from: 'appview', new_type: new_type}, {
    onDone: function(text) {
      obj.innerHTML = text;
      if (cur.adminTypeMenu) {
        cur.adminTypeMenu.setOptions({title: text});
      }
    }
  });
  if (cur.adminTypeMenu) {
    cur.adminTypeMenu.hide();
  }
  return false;
},

initUpload: function(cont, opts, lang, resObj) {
  var options = {
    file_name: 'photo',

    file_size_limit: 1024*1024*5, // 5Mb
    file_types_description: 'Image files (*.jpg, *.png, *.gif)',
    file_types: '*.jpg;*.JPG;*.png;*.PNG;*.gif;*.GIF;*.bmp;*.BMP',

    lang: lang,

    /*check_hash: opts['check_hash'],
    check_rhash: opts['check_rhash'],*/

    onUploadStart: function(i, res) {
      if (Upload.types[i] == 'form') {
        show(box.progress);
      }
      hide('apps_edit_upload_error');
    },

    onUploadComplete: function(i, res) {
      var obj;
      try {
        obj = eval('(' + res + ')');
      } catch(e) {
        obj = q2ajx(res);
      }
      if (obj.code) {
        Upload.onUploadError(i, obj.code);
        return;
      }
      if (opts.vars.mid) {
        obj.mid = opts.vars.mid;
      }
      var params = {act: opts['save_act'], app_id: cur.aid};
      if (cur.editLang) {
        params['edit_lang'] = cur.editLang;
      }
      if (opts.errorObj == 'apps_banner_error') {
        hide('apps_banner_update');
      }
      ajax.post('editapp', extend(obj, params), {
        onDone: function(result, data) {
          if (opts['success_callback']) {
            cur[opts['success_callback']](result, data);
          } else {
            resObj.src = result;
            addClass(resObj.parentNode, 'apps_edit_img_loaded');
            if (resObj.parentNode && resObj.parentNode.bOvered) {
              AppsEdit.bOver(resObj.parentNode);
            }
          }
          if (!opts.lite) {
            Upload.embed(i);
          }
          if (opts.errorObj) {
            hide(opts.errorObj);
          }
        },
        onFail: function(error) {
          AppsEdit.showError(error, opts.errorObj);
          if (!opts.lite) {
            Upload.embed(i);
          }
          return true;
        }
      });
    },

    onUploadProgress: function(i, bytesLoaded, bytesTotal) {
      if (!ge('form'+i+'_progress')) {
        var obj = Upload.obj[i], objHeight = getSize(obj)[1], tm = objHeight / 2 + 10;
        var node = obj.firstChild;
        addClass(obj.parentNode, 'apps_edit_progress');
        while (node) {
          if (node.nodeType == 1) {
            if (node.id == 'uploader'+i && browser.msie) {
              setStyle(node, {position: 'relative', left: '-5000px'});
            } else {
              setStyle(node, {visibility: 'hidden'});
            }
          }
          node = node.nextSibling;
        }
        obj.appendChild(ce('div', {innerHTML: '<div class="apps_info_progress_wrap">\
          <div id="form' + i + '_progress" class="apps_upload_progress" style="width: 0%;"></div>\
        </div></div>', className: 'apps_info_prg_cont'}, {height: tm + 'px', marginTop: -tm + 'px'}));
      }
      var percent = intval(bytesLoaded / bytesTotal * 100);
      percent = Math.min(percent, 100);
      setStyle(ge('form' + i + '_progress'), {width: percent + '%'});
    },

    onUploadError: function(i, res) {
      debugLog('error', i, res);
      if (res == 105) {
        var error = lang['apps_banner_size_error'];
      } else if (res == -1) {
        if (opts.errorObj == 'apps_full_banner_error') {
          var error = lang['apps_full_banner_size_error'];
        } else if (opts.errorObj == 'apps_banner_error') {
          var error = lang['apps_new_banner_size_error'];
        } else if (opts.errorObj == 'apps_photo_error') {
          var error = lang['apps_photo_size_error'];
        } else {
          var error = lang['apps_banner_size_error'];
        }
      } else {
        var error = lang['apps_photo_notloaded_unknown'];
      }

      AppsEdit.showError(error, opts.errorObj);
      Upload.embed(i);
    },

    clear: 1,
    type: 'photo',
    max_attempts: 3,
    server: opts.server,
    error: opts['default_error'],
    error_hash: opts['error_hash'],
    dropbox: 'apps_icon_dropbox'
  }
  if (opts.lite) {
    options.flash_lite = 1;
    debugLog(options);
  }
  return Upload.init(cont, opts.url, opts.vars, options);
},

ssOver: function(obj) {
  if (hasClass(obj, 'apps_empty_screen')) return;
  var nc = geByClass1('apps_edit_screen_close', obj);
  if (!nc) {
    var nc = se('<div class="apps_edit_screen_close" onmouseover="showTooltip(this, {black: 1, text: \''+cur['remove_screenshot']+'\', shift: [12, 2, 0], forcetoup: 1});"></div>');
    addEvent(nc, 'click', AppsEdit.ssClose.pbind(obj, nc));
    cur.destroy.push(function() {
      removeEvent(nc, 'click');
    });

    obj.appendChild(nc);
  }
  fadeIn(nc, 100);
},

ssClose: function(obj, nc, ev) {
  if (hasClass(obj, 'apps_empty_screen')) return;
  var pid = obj.getAttribute('rel');
  ajax.post('editapp', {act: 'a_remove_screenshot', hash: cur.photoHash, aid: cur.aid, pid: pid});
  fadeOut(obj, 200, function() {
    addClass(obj, 'apps_empty_screen');
    setStyle(obj, {backgroundImage: 'url(/images/screenshot_c.gif)'});
    if (obj.firstChild) {
      re(obj.firstChild);
    }
    obj.parentNode.appendChild(obj);
    show(obj);
  });
  cur.ssCount -= 1;
  if (cur.ssCount < 4) {
    hide('apps_edit_ss_reason');
    show('apps_edit_ss_limit');
  }
  if (nc.tt) {
    nc.tt.destroy();
  }
  return cancelEvent(ev);
},

ssOut: function(obj) {
  var nc = obj.firstChild;
  fadeOut(nc, 100);
},

ssClick: function(obj) {
  if (hasClass(obj, 'apps_empty_screen')) {
    return false;
  }
  var pid = obj.getAttribute('rel');
  showBox('editapp', {act: 'show_screen', aid: cur.aid, pid: pid});
},

bOver: function(obj) {
  obj.bOvered = 1;
  if (!hasClass(obj, 'apps_edit_img_loaded')) {
    return;
  }
  var btn = geByClass1('apps_edit_btn_wrap', obj)
  fadeIn(btn, 200);
},

bOut: function(obj) {
  obj.bOvered = 0;
  var btn = geByClass1('apps_edit_btn_wrap', obj)
  fadeOut(btn, 200);
},

bClick: function(obj, uplNum) {
  hide(obj.parentNode);
  var obj = obj.parentNode.parentNode;
  removeClass(obj, 'apps_edit_img_loaded');
  var img = geByClass1('apps_edit_b_img', obj);
  debugLog(img, obj);
  img.src = (window.devicePixelRatio >= 2 ? '/images/dquestion_w.gif' : '/images/dquestion_z.gif');
  debugLog('embed', uplNum);
  removeClass(obj, 'apps_edit_progress');
  Upload.embed(uplNum);

  ajax.post('editapp', {act: 'a_clear_full_banner', hash: cur.photoHash, aid: cur.aid}, {
    onDone: function() {
    }
  });
},

certUploadBox: function(obj) {
  var push = (Privacy.getValue('push') || '').split('_');
  showBox('editapp', {act: 'select_cert', aid: cur.aid, push: push[2]});
},

urlFocus: function(obj, hint) {
  if (!val(obj)) {
    val(obj, 'http://');
  }
  if (hint) {
    showTooltip(obj, {
      text: '<div class="apps_edit_tt_pointer"></div>'+cur[hint],
      className: 'apps_edit_tt',
      slideX: 15,
      forcetodown: 1,
      shift: [-275, 0, -35],
      hasover: 1,
      onCreate: function () {
        removeEvent(obj, 'mouseout');
      }
    });
  }

},

urlBlur: function(obj) {
  if (val(obj) == 'http://') {
    val(this, '');
  }
  if (obj.tt) {
    obj.tt.hide();
  }
},

addToNew: function(aid, hash) {
  showBox('editapp', {act: 'add_to_new_box', aid: aid, hash: hash});
},

enableOrders: function(aid, hash, force) {
  var btn = ge('enable_orders_btn');
  AppsEdit.hideError();
  ajax.post('editapp', {act: 'enable_orders', aid: aid, force: force, hash: hash}, {
    onDone: function(result, text) {
      if (result) {
        ge('apps_new_api_notice').innerHTML = text;
      } else {
        var confirmBox = showFastBox(getLang('global_action_confirmation'), text, getLang('box_yes'), function() { confirmBox.hide(); AppsEdit.enableOrders(aid, hash, 1); }, getLang('global_cancel'));
      }
    },
    onFail: function(text) {
      showFastBox(getLang('global_error'), text);
      return true;
    },
    showProgress: function() {
      lockButton(btn);
    },
    hideProgress: function() {
      unlockButton(btn);
    }
  })
},

checkSize: function(obj, maxVal) {
  var curVal = val(obj);
  if (curVal > maxVal) {
    notaBene(obj);
    val(obj, maxVal);
  } else if (curVal != positive(curVal)) {
    notaBene(obj);
    val(obj, positive(curVal) || 607);
  }
},

toggleSecureUrl: function(el) {
  checkbox(el);
  if (isChecked(el)) {
    show('apps_edit_iframe_secure');
  } else {
    hide('apps_edit_iframe_secure');
  }
},
updateSecureUrl: function() {
  if (cur.iframeSecureChanged) {
    return;
  }
  var url = val('app_iframe_url').replace(/^http:/, 'https:');
  val('app_iframe_secure_url', url);
},
onChangeSecureUrl: function() {
  if (val('app_iframe_url').replace(/^http(s)?/, '') != val('app_iframe_secure_url').replace(/^http(s)?/, '')) {
    cur.iframeSecureChanged = true;
  }
},

addFunc: function() {
  hide('apps_edit_funcs_empty');
  show('apps_edit_funcs_bnts');
  var list = ge('apps_edit_funcs');
  var row = se(rs(cur.funcRowTpl, {
    name: '',
    code: 'return "Hello World";'
  }));
  list.appendChild(row);
  debugLog(row);
  var el = geByClass1('apps_edit_editor', row);
  debugLog(el);
  AppsEdit.initEditor(el);
  geByClass1('apps_edit_func_name', row).focus();
},

removeFunc: function(row) {
  var name = val(geByClass1('apps_edit_func_name', row));
  name = 'execute.'+name;

  var box = showFastBox(cur.lang['developers_remove_func'], cur.lang['developers_remove_func_confrim'].replace('%s', clean(name)), cur.lang['developers_do_remove'], function() {
    var el = geByClass1('apps_edit_editor', row);
    if (el && el.ace) {
      el.ace.destroy();
    }
    var cont = ge('apps_edit_funcs');
    var rows = geByClass('apps_edit_func_row', cont);
    addClass(row, 'apps_edit_rows_removed')
    if (rows.length <= 1) {
      re(row);
      show('apps_edit_funcs_empty');
      hide('apps_edit_funcs_bnts');
    } else {
      slideUp(row, 150, function() {
        re(row);
      });
    }
    AppsEdit.saveFuncs();
    box.hide();

  }, getLang('global_cancel'));
},

saveFuncs: function(btn) {
  if (btn) {
    lockButton(btn);
  }
  var cont = ge('apps_edit_funcs');
  var rows = geByClass('apps_edit_func_row', cont);
  var funcs = [];
  for (var i in rows) {
    var row = rows[i];
    if (hasClass(row, 'apps_edit_rows_removed')) {
      continue;
    }
    var name = geByClass1('apps_edit_func_name', row);
    var code = geByClass1('apps_edit_editor', row);
    if (code && code.ace) {
      funcs.push({
        name: val(name),
        code: code.ace.getValue()
      });
    }
  }
  var params = {act: 'save_funcs', aid: cur.aid, hash: cur.funcsHash};
  for(var i in funcs) {
    params['name'+i] = funcs[i].name;
    params['code'+i] = funcs[i].code;
  }
  ajax.post('editapp', params, {
    onDone: function(type, num, errText) {
      if (type == 'name') {
        var row = rows[num];
        var name = geByClass1('apps_edit_func_name', row);
        notaBene(name);
      } else if (type == 'code') {
        var row = rows[num];
        var err = geByClass1('apps_edit_err_info', row);
        err.innerHTML = errText;
        if (!isVisible(err.parentNode)) {
          slideDown(err.parentNode, 150);
        }
        scrollToY(getXY(err.parentNode)[1], 150);
        var code = geByClass1('apps_edit_editor', row);
        if (code && code.ace) {
          code.ace.focus();
        }
      } else {
        var errEls = geByClass('apps_edit_err_info_cont', cont);
        for(var i in errEls) {
          if (isVisible(errEls[i])) {
            slideUp(errEls[i], 150);
          }
        }


        var b = ge('apps_edit_add_btn');
        fadeOut(b, 150, function() {
          var s = ge('apps_edit_save_info');
          s.innerHTML = type;
          fadeIn(s, 150);
          setTimeout(function() {
            fadeOut(s, 150, function() {
              fadeIn(b, 150);
            })
          }, 2000);
        })
      }
      if (btn) {
        unlockButton(btn);
      }
    },
    onFail: function(type, num, field) {
      if (btn) {
        unlockButton(btn);
      }
    }
  })
},

runFunc: function(row, btn) {
  var codeEl = geByClass1('apps_edit_editor', row);

  var code = '';
  if (codeEl && codeEl.ace) {
    code = codeEl.ace.getValue();
  }
  if (cur.runContProgress) {
    return false;
  }
  cur.runContProgress = btn.innerHTML;
  ajax.post('dev', {act: 'a_run_method', method: 'execute', param_code: code, hash: cur.runHash}, {
    onDone: function(code) {
      var res = parseJSON(code);
      var html = Dev.wrapObject(res, true);
      showFastBox({title: cur.lang['developers_run_result'], dark: 1, width: 500, bodyStyle: 'padding: 16px 16px 16px 2px;'}, '<div id="dev_result" onmousemove="Dev.resultMove(event.target);" onmouseout="Dev.resultMove(false);">'+html+'</div>');
    },
    onFail: function(msg) {
      setTimeout(showFastBox(getLang('global_error'), msg).hide, 2000);
      return true;
    },
    showProgress: function() {
      btn.innerHTML = '<span class="progress_inline" /></span>';
    },
    hideProgress: function() {
      btn.innerHTML = cur.runContProgress;
      cur.runContProgress = false;
    },
    stat: ['dev.js', 'dev.css']
  })

},

initEditor: function(el) {
  var editor = ace.edit(el);
  el.ace = editor;
  function adjustHeight() {
    var newHeight = editor.getSession().getScreenLength() * editor.renderer.lineHeight + editor.renderer.scrollBar.getWidth();
    newHeight = Math.max(100, newHeight);
    setStyle(el.parentNode, {height: newHeight.toString() + "px"});
    editor.resize();
  }
  editor.on('change', adjustHeight)
  var session = editor.getSession();
  session.setMode("ace/mode/javascript");
  session.setUseWorker(false);
  adjustHeight();
},

uInit: function(opts) {
  AppsEdit.uInitScroll();
  extend(cur, {
    opts: opts,
    searchInp: ge('apps_edit_search_inp'),
    index: {},
    cache: {},

    lang: extend(cur.lang || {}, opts.lang)
  });
  placeholderSetup(cur.searchInp, {back: true});
  elfocus(cur.searchInp);
  cur.destroy.push(function(c) {
    if (c == cur) AppsEdit.uDeinitScroll();
  });
  AppsEdit.uIndex(cur.opts.data);
},
uInitScroll: function() {
  AppsEdit.scrollnode = browser.msie6 ? pageNode : window;
  AppsEdit.uDeinitScroll();
  addEvent(AppsEdit.scrollnode, 'scroll', AppsEdit.uScroll);
  addEvent(window, 'resize', AppsEdit.uScroll);
},
uDeinitScroll: function() {
  removeEvent(AppsEdit.scrollnode, 'scroll', AppsEdit.uScroll);
  removeEvent(window, 'resize', AppsEdit.uScroll);
},
uScroll: function() {
  if (browser.mobile) return;

  var docEl = document.documentElement;
  var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
  var st = scrollGetY(), lnk = ge('apps_edit_users_more');

  if (!isVisible(lnk)) return;
  if (st + ch > lnk.offsetTop) {
    lnk.onclick();
  }
},
uIndex: function(res, noRefresh) {
  cur.opts.data = res;
  cur.cache = {all: []};
  for (var i = 0, count = res.length; i < count; ++i) {
    cur.cache.all.push(i);
  }
  cur.index = new vkIndexer(cur.cache.all, function(obj) {
    return cur.opts.data[obj][2];
  }, noRefresh ? function(){} : AppsEdit.uSearchUpdate);
},
uResetSearch: function() {
  val(cur.searchInp, '');
  elfocus(cur.searchInp);
  AppsEdit.uSearchUpdate();
},
uSearch: function() {
  var q = trim(val(cur.searchInp));

  if (q.match(/^(https?:\/\/)?([a-z0-9]+\.)*(vkontakte\.ru|vk\.com)\/.+/)) {
    return AppsEdit.uEditAdmin(AppsEdit.uGetAddr(q));
  }
},
uGetAddr: function(lnk) {
  var m = lnk.match(/^(https?:\/\/)?([a-z0-9]+\.)*(vkontakte\.ru|vk\.com)\/(.+)$/), result = m[4].substr(m[4].indexOf('#') + 1).replace(/^[\/\!]*/, '');
  if (m = result.match(/^profile\.php\?id=(\d+)/)) {
    result = intval(m[1]);
  } else {
    if (result.indexOf('?') !== -1) result = result.substr(0, result.indexOf('?'));
    if (m = result.match(/^id(\d+)/)) {
      result = intval(m[1]);
    }
  }
  return result;
},
uSearchUpdate: function() {
  if ((cur.searchInp || {}).id != 'apps_edit_search_inp') return;

  var q = trim(val(cur.searchInp));
  toggle('apps_edit_reset_search', !!q);

  AppsEdit.uShowMore(true);
},
uUpdateSummary: function() {
  if (trim(val(cur.searchInp)) || !isVisible('apps_edit_summary_wrap')) return;

  if (cur.opts.all_count > 0) {
    val('apps_edit_summary', getLang('apps_X_admins', cur.opts.all_count, true));
  } else {
    val('apps_edit_summary', getLang('apps_no_admins_sum'));
  }
},
uShowMore: function(force) {
  var d = cur.opts.data, q = trim(val(cur.searchInp)), highlight = false;
  if (!d) return;

  var lst = cur.cache.all, m;
  if (force) {
    AppsEdit.uUpdateSummary();
    if (cur.qShown === q) return;
    cur.qShown = q;
  }
  if (q) {
    if (q.match(/^(https?:\/\/)?([a-z0-9]+\.)*(vkontakte\.ru|vk\.com)\/.+/)) {
      var addr = AppsEdit.uGetAddr(q);
      lst = [];
      for (var i = 0, l = d.length; i < l; ++i) {
        if (d[i][0] == addr || d[i][1] == '/' + addr) {
          lst.push(i);
        }
      }
    } else {
      lst = cur.cache['_' + q];
      if (lst === undefined) {
        var tmp = cur.index.search(q), mp = {};
        lst = [];
        for (var i = 0, l = tmp.length; i < l; ++i) {
          if (!mp[tmp[i]]) {
            mp[tmp[i]] = true;
            lst.push(tmp[i]);
          }
        }
        lst.sort(function(a,b){return a-b;});
        cur.cache['_' + q] = lst;
      }
      highlight = AppsEdit.uGetHighlight(q);
    }
  }

  var len = lst.length, cont = ge('apps_edit_users_rows'), more = ge('apps_edit_users_more');
  if (!len) {
    hide(more, 'apps_edit_summary_wrap');
    val(cont, AppsEdit.uGenEmpty(getLang('apps_no_admin_found')));
    return;
  }

  var start = force ? 0 : cont.childNodes.length, end = Math.min(len, start + 20), html = [];
  for (var i = start; i < end; ++i) {
    var row = d[lst[i]], name = (row || {})[2];
    if (!row) continue;
    if (highlight) {
      name = name.replace(highlight.re, highlight.val);
    }
    html.push(AppsEdit.uGenRow(row, name));
  }

  if (force) {
    val(cont, html.join(''));
    show('apps_edit_summary_wrap');
    if (q) {
      val('apps_edit_summary', getLang('apps_found_n_users', len, true));
    } else {
      AppsEdit.uUpdateSummary();
    }
  } else {
    cont.innerHTML += html.join('');
  }
  toggle(more, end < len);
},
uGetHighlight: function(q) {
  var indxr = cur.index, delimiter = indxr.delimiter, trimmer = indxr.trimmer;

  q += ' ' + (parseLatin(q) || '');
  q = escapeRE(q).replace(/&/g, '&amp;');
  q = q.replace(trimmer, '').replace(delimiter, '|');
  return {
    re: new RegExp('(' + q + ')', 'gi'),
    val: '<span class="apps_edit_user_highlight">$1</span>'
  }
},
uGenEmpty: function(text) {
  return '<div class="apps_edit_users_none">' + text + '</div>';
},
uGenRow: function(row, name) {
  var oid = row[0], href = row[1], photo = row[3], sex = row[4], level = row[5], info = '', actions = '', nm = name || row[2], q = cur.qShown;
  if (!name && q && !q.match(/^(https?:\/\/)?([a-z0-9]+\.)*(vkontakte\.ru|vk\.com)\/.+/)) {
    highlight = AppsEdit.uGetHighlight(q);
    nm = nm.replace(highlight.re, highlight.val);
  }
  info = cur.opts.levels[level];

  if (cur.opts.main_admin && cur.mainAdminChanging) {
    if (level != 3) {
      actions += '<a class="apps_edit_user_action" onclick="AppsEdit.uChangeMainAdmin(' + oid + ')">' + getLang('apps_main_admin_promote') + '</a>';
    } else {
      actions = '<a class="apps_edit_user_action" onclick="AppsEdit.uMainAdmin(true)">' + getLang('apps_main_admin_change_cancel') + '</a>';
    }
  } else {
    if (level == 0) {
      actions = '<a class="apps_edit_user_action" onclick="AppsEdit.uEditAdmin(' + oid + ')">' + getLang('apps_add_admin') + '</a>';
    } else if (level != 3) {
      actions += '<a class="apps_edit_user_action" onclick="AppsEdit.uEditAdmin(' + oid + ')">' + getLang('Edit') + '</a>';
      actions += ' | <a class="apps_edit_user_action" onclick="AppsEdit.uRemoveAdmin(' + oid + ')">' + getLang('apps_edit_admin_demote') + '</a>';
    } else if (cur.opts.main_admin && cur.opts.all_count > 1) {
      actions = '<a class="apps_edit_user_action" onclick="AppsEdit.uMainAdmin()">' + getLang('apps_main_admin_change') + '</a>';
    }
  }

  return [
'<div id="apps_edit_admin', oid, '" class="apps_edit_user clear_fix">',
'<div class="apps_edit_user_thumb_wrap fl_l">',
  '<a class="apps_edit_user_thumb" href="', href, '"><img class="apps_edit_user_img" src="', photo, '" width="32" /></a>',
'</div>',
'<div class="apps_edit_user_info fl_l">',
  '<a class="apps_edit_user_name" href="', href, '">', nm, '</a> ',
  '<span class="apps_edit_user_type">', info, '</span>',
'</div>',
'<div class="apps_edit_user_actions fl_r">', actions, '</div>',
'</div>'].join('');
},
uShowMessage: function(txt) {
  showDoneBox(txt);
},
uEditAdmin: function(user) {
  showBox('al_apps_edit.php', {act: 'edit_admin_box', id: cur.opts.aid, addr: user}, {dark: true});
},
uRemoveAdmin: function(user) {
  var box = curBox();
  if (box) { box.hide(); }
  showBox('al_apps_edit.php', {act: 'edit_admin_box', id: cur.opts.aid, addr: user, remove: 1});
  return false;
},
uSelAdminLevel: function(el, index, name) {
  radiobtn(el, index, name);
  var desc = ge('apps_admin_partial_level_desc').innerHTML.replace(/^\s+|[\s:]+$/g, '');
  if (index) {
    hide('apps_edit_admin_rights');
    val('apps_admin_partial_level_desc', desc);
  } else {
    show('apps_edit_admin_rights');
    val('apps_admin_partial_level_desc', desc + ':');
  }
},
uSaveAdmin: function(mid, hash) {
  var params = {
    act: 'save_admin',
    id: cur.opts.aid,
    mid: mid,
    hash: hash,
    level: radioval('admins_level'),
    rights: []
  };
  each(geByClass('checkbox', ge('apps_edit_admin_rights')), function (i, el) {
    if (isChecked(el)) {
      params.rights.push(el.getAttribute('id').replace(/^apps_admin_right_/, ''));
    }
  });
  if (!params.rights.length) {
    return;
  }
  ajax.post('al_apps_edit.php', params, {
    onDone: function(msg, row) {
      curBox().hide();
      if (msg) AppsEdit.uShowMessage(msg);

      if (!row) return;

      var d = cur.opts.data, found = false, j, k, l, el;
      if (isArray(d)) {
        for (j = 0, l = d.length; j < l; ++j) {
          if (d[j][0] == mid) {
            found = true;
            if (d[j][5] == 0) {
              ++cur.opts.all_count;
            }
            cur.opts.data[j] = row;
            break;
          }
        }
      }
      if (!found) {
        cur.opts.data.unshift(row);
        ++cur.opts.all_count;
        val(cur.searchInp, '');
        AppsEdit.uIndex(cur.opts.data);
      } else {
        delete cur.qShown;
        AppsEdit.uSearchUpdate();
      }
      AppsEdit.uUpdateSummary();
    },
    showProgress: curBox().showProgress,
    hideProgress: curBox().hideProgress
  });
},
uDoRemoveAdmin: function(mid, hash) {
  var params = {
    act: 'delete_admin',
    id: cur.opts.aid,
    mid: mid,
    hash: hash
  };
  ajax.post('al_apps_edit.php', params, {
    onDone: function(msg, row) {
      curBox().hide();
      if (msg) AppsEdit.uShowMessage(msg);

      if (!row) return;

      var d = cur.opts.data, j, k, l, el;
      if (isArray(d)) {
        for (j = 0, l = d.length; j < l; ++j) {
          if (d[j][0] == mid) {
            cur.opts.data[j] = row;
            --cur.opts.all_count;
            delete cur.qShown;
            AppsEdit.uSearchUpdate();
            break;
          }
        }
      }
    },
    showProgress: curBox().showProgress,
    hideProgress: curBox().hideProgress
  });
},
uMainAdmin: function(cancel) {
  if (!cancel) {
    if (cur.mainAdminChanging) return;
    cur.mainAdminChanging = true;
  } else {
    if (!cur.mainAdminChanging) return;
    cur.mainAdminChanging = false;
  }
  delete cur.qShown;
  AppsEdit.uSearchUpdate();
},
uChangeMainAdmin: function(mid) {
  if (!cur.mainAdminChanging) return;
  showBox('al_apps_edit.php', {act: 'change_main_admin_box', id: cur.opts.aid, mid: mid}, {cache: 1, params:{width: '400px', bodyStyle: 'padding: 10px 10px 8px'},
    onFail: function(msg) {
      AppsEdit.uShowMessage(msg);
      return true;
    }
  });
  return false;
},
uDoChangeMainAdmin: function(mid, hash) {
  var params = {
    act: 'change_main_admin',
    id: cur.opts.aid,
    mid: mid,
    hash: hash
  };
  ajax.post('al_apps_edit.php', params, {
    onDone: function(msg, isMainAdmin) {
      curBox().hide();
      if (msg) AppsEdit.uShowMessage(msg);
      cur.mainAdminChanging = false;
      cur.opts.main_admin = isMainAdmin;

      var d = cur.opts.data, j, k, l;
      if (isArray(d)) {
        for (j = 0, l = d.length; j < l; ++j) {
          if (d[j][0] == mid) {
            cur.opts.data[j][5] = 3;
          } else if (cur.opts.data[j][5] == 3) {
            cur.opts.data[j][5] = 2;
          }
        }
        delete cur.qShown;
        AppsEdit.uSearchUpdate();
      }
    },
    onFail: function(msg) {
      curBox().hide();
      AppsEdit.uShowMessage(msg);
      return true;
    },
    showProgress: curBox().showProgress,
    hideProgress: curBox().hideProgress
  });
},

_eof: 1};try{stManager.done('apps_edit.js');}catch(e){}
