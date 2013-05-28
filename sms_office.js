var SmsOffice = {
  switchTab: function(el, event) {
    var tabs = geByClass('active_link', ge('sms_office_tabs'));
    for (var i in tabs) {
      removeClass(tabs[i], 'active_link');
    }
    addClass(el, 'active_link');
    return nav.go(el, event);
  },

  smsSearch: function() {
    var params = {act: 'a_search_sms', phone: trim(ge('search_phone').value), mid: trim(ge('search_mid').value), hash: cur.search_hash};
    if (!params.phone && !params.mid) return;
    lockButton('sms_search');
    hide('sms_error', 'sms_search_results');
    ajax.post('sms_office.php', params, {
      onDone: function(html) {
        unlockButton('sms_search');
        ge('sms_search_results').innerHTML = html;
        show('sms_search_results');
      },
      onFail: function(msg) {
        unlockButton('sms_search');
        ge('sms_error').innerHTML = msg;
        show('sms_error');
        return true;
      }
    });
  },

  toggleGateway: function(lnk, gid, disable) {
    if (disable) {
      confirmBox = showFastBox('Подтверждение действия', 'Вы действительно хотите отключить отправку СМС через выбранный шлюз?', getLang('box_yes'), function() {
        SmsOffice._toggleGateway(lnk, gid, 1);
        confirmBox.hide();
      }, getLang('box_no'));
    } else {
      SmsOffice._toggleGateway(lnk, gid, 0);
    }
    return false;
  },
  _toggleGateway: function(lnk, gid, disable) {
    var params = {act: 'a_toggle_gateway', gid: gid, disable: disable, hash: cur.hash};
    lnk.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('sms_office.php', params, {
      onDone: function(html) {
        nav.reload({force: true});
      }
    });
  },

  gatewaysByPhone: function() {
    var params = {act: 'a_phone_gateways', phone: trim(ge('sms_phone').value)};
    if (!params.phone) return;

    ge('phone_gateways').innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('sms_office.php', params, {
      onDone: function(html) {
        ge('phone_gateways').innerHTML = html;
      },
      onFail: function(msg) {
        ge('phone_gateways').innerHTML = '<span style="color:red;">'+msg+'</span>';
        return true;
      }
    });
  },

  showGraph: function (el, id, params) {
    var cont_id = "graph_"+id;
    var cont = ge('wrapper_'+cont_id);
    if (!cont){
      var cont = ce('div', {id: 'wrapper_'+cont_id, innerHTML: '<div id="' + cont_id + '"></div>'}, {padding: '10px 0 0 0', display: 'none', width: '690px', height: '405px'});
      el.parentNode.appendChild(cont);

      cur.html5graphs = true;
      if (!cur.graphUrls) cur.graphUrls = [];
      if (!cur.graphParams) cur.graphParams = [];
      if (!cur.pageGraphs) cur.pageGraphs = {};
      cur.graphUrls[cont_id] = '/stats?act=flash_graph&cat='+id+'&time='+(new Date()).getTime();
      cur.graphParams[cont_id] = {};
      for (var param in params) {
        if (param != 'show_all' && param != 'show_time' && param != 'multiple') continue;
        cur.graphParams[cont_id][param] =  params[param];
      }
      ge('wrapper_'+cont_id).style.height = 'auto';
      ge('wrapper_'+cont_id).style.margin = '10px 0';
      stManager.add('graph.js',function(){
        if (!window.checkGraphLoaded) {
          window.checkGraphLoaded = function(callbackId) {
            if (window.Graph) {
              cur.pageGraphs[callbackId] = new window.Graph(callbackId, cur.graphUrls[callbackId], cur.graphParams[callbackId], 690);
            } else {
              setTimeout(function(){checkGraphLoaded(callbackId);}, 100);
            }
          }
        }
        checkGraphLoaded(cont_id);
      });
    }
    var menu = ge('menu_'+id);
    if (!cur.menuInited) cur.menuInited = [];
    if (menu && geByTag1('a', menu) && !cur.menuInited[id]) {
      cur.initGraphHorizontalMenu(cont_id, geByTag('a', menu), geByTag1('a', menu));
      cur.menuInited[id] = true;
    }
    slideToggle(cont, 200);
    if (ge('menu_'+id)) {
      toggle('menu_'+id);
    }
    return false;
  },

  showCountryStat: function(cn_id, rg_id) {
    var stat = ['wkview.js' ,'wkview.css', 'wk.css', 'wk.js'];
    var params = {act: 'a_country_stats'};
    if (rg_id) {
      params['rg_id'] = rg_id;
    } else {
      params['cn_id'] = cn_id;
    }
    ajax.post('sms_office.php', params, {
      stat: stat,
      loader: 1,
      onDone: function(title, html, options, script) {
        WkView.show(title, html, options, script);
      },
      onFail: function(text) {
        return WkView.showError(text);
      }
    });
    return false;
  },
  onInlineEditClick: function(elem, callback, rown, coln, fid) {
    var options = {
      contentHTML: '<tr><td colspan="2"><textarea class="inlInput text" style="width: 164px; height: 130px;" onkeydown="if (event.keyCode == 13) cancelEvent(event);"></textarea></td></tr>',
      onConfirm: function() {
        var _bck = ge(elem.id).parentNode.innerHTML;
        callback({value: '<img src="/images/upload.gif" />'});
        var gid = cur.healthTable.content.extra['gateway_id'][rown][0];
        var params = {act: 'a_save_gateway', gid: gid, is_exceptions: coln == 5 ? 1 : 0, prefixes: inlEdit.input.value, hash: cur.hash};
        ajax.post('sms_office.php', params, {
          onDone: function(msg) {
            msg = _bck.replace(/>(.*?)</, '>'+msg+'<');
            callback({value: msg});
          },
          onFail: function(msg) {
            callback({value: _bck});
          }
        });
      }
    };
    var inlEdit = new InlineEdit(elem, options);
    if (elem.innerHTML != '–') {
      inlEdit.input.value = elem.innerHTML;
    }
    inlEdit.show();
  },
};

try{stManager.done('sms_office.js');}catch(e){}
