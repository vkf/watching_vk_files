if (!window.curNotifier) {
  curNotifier = {
    addQueues: {},
    recvClbks: {}
  };
}

Notifier = {
  debug: false,//vk && vk.id == 45944258,
  init: function (options) {
    curNotifier = extend({
      q_events: [],
      q_shown: [],
      q_closed: [],
      q_max: 3,
      q_idle_max: 5,
      done_events: {},
      addQueues: curNotifier.addQueues || {},
      recvClbks: curNotifier.recvClbks || {},
      error_timeout: 1,
      sound: new Sound('mp3/bb1'),
      sound_im: new Sound('mp3/bb2')
    }, options);

    if (!this.initFrameTransport() && !this.initFlashTransport(options)) {
      return false;
    }
    this.initIdleMan();

    if (!(curNotifier.cont = ge('notifiers_wrap'))) {
      bodyNode.insertBefore(curNotifier.cont = ce('div', {id: 'notifiers_wrap', className: 'fixed'}), ge('page_wrap'));
    }
  },
  destroy: function () {
    Notifier.hideAllEvents();
    curNotifier.idle_manager.stop();
    curNotifier = {};
    re('notifiers_wrap');
    re('queue_transport_wrap');
  },
  reinit: function () {
    ajax.post('notifier.php?act=a_get_params', {}, {
      onDone: function (options) {
        if (options) {
          curNotifier.error_timeout = 1;
          this.init(options);
        } else {
          curNotifier.error_timeout = curNotifier.error_timeout || 1;
          setTimeout(this.reinit.bind(this), curNotifier.error_timeout * 1000);
          if (curNotifier.error_timeout < 256) {
            curNotifier.error_timeout *= 2;
          }
        }
      }.bind(this),
      onFail: function () {
        curNotifier.error_timeout = curNotifier.error_timeout || 1;
        setTimeout(this.reinit.bind(this), curNotifier.error_timeout * 1000);
        if (curNotifier.error_timeout < 256) {
          curNotifier.error_timeout *= 2;
        }
        return true;
      }.bind(this)
    });
  },
  standby: function (nextTO) {
    this.destroy();
    curNotifier.error_timeout = nextTO || 1;
    setTimeout(this.reinit.bind(this), curNotifier.error_timeout * 1000);
  },
  freezeEvents: function () {
    curNotifier.frozen = true;
    each (curNotifier.q_shown, function () {
      clearTimeout(this.fadeTO);
      if (getStyle(this.baloonEl, 'opacity') < 1) {
        animate(this.baloonEl, {opacity: 1}, 100);
      }
    });
  },
  unfreezeEvents: function () {
    curNotifier.frozen = false;
    each (curNotifier.q_shown, function () {
      this.fadeTO = setTimeout(this.startFading, 5000);
    });
  },
  getTransportWrap: function () {
    return ge('queue_transport_wrap') || utilsNode.appendChild(ce('div', {id: 'queue_transport_wrap'}));
  },
  setFocus: function (val) {
    var instance = (val ? '1' : '0') + curNotifier.instance_id;
    if (curNotifier.transport == 'flash' && curNotifier.flash_transport) {
      curNotifier.flash_transport.setInstanceFocused(instance);
    } else if (curNotifier.transport == 'frame') {
      Notifier.lcSend('focus', {instance_id: instance});
      this.onInstanceFocus(instance);
    }
  },
  initIdleMan: function () {
    if (curNotifier.idle_manager && curNotifier.idle_manager.started) return;

    curNotifier.idle_manager = (function (onIdleCb, onUnIdleCb) {
      var setIdleTo, checkIdleCb, checkIdleCbTo, sendCbTO, cb_active, cb_inactive, params = {
        started: false,
        is_idle: false,
        onIdle: onIdleCb || null,
        onUnIdle: onUnIdleCb || null,
        stop: function () {
          params.started = false;
          removeEvent(document, 'mousemove keydown', cb_active);
          removeEvent(window, 'focus', cb_active);
          removeEvent(window, 'blur', cb_inactive);
          clearTimeout(setIdleTo);
          clearTimeout(checkIdleCbTo);
          clearTimeout(sendCbTO);
        },
        start: function () {
          params.started = true;
          if (browser.mobile) return;
          checkIdleCb = function () {
            if (!(window.curNotifier && curNotifier.idle_manager)) return;
            addEvent(document, 'mousemove keydown', cb_active);
            clearTimeout(setIdleTo);
            setIdleTo = setTimeout(cb_inactive, 30000); // tab becomes idle in 30 secs without moving mouse or typing
          };
          cb_active = function (e) {
            if (!(window.curNotifier && curNotifier.idle_manager)) return;
            clearTimeout(setIdleTo);
            if (params.is_idle) {
              params.is_idle = false;
              clearTimeout(sendCbTO);
              sendCbTO = setTimeout(function () {
                if (params.onUnIdle) {
                  params.onUnIdle();
                }
                //debugLog('unidle');
              }, 100);
            }
            removeEvent(document, 'mousemove keydown', cb_active);
            clearTimeout(checkIdleCbTo);
            checkIdleCbTo = setTimeout(checkIdleCb, 30000);
          };
          cb_inactive = function (e) {
            if (!(window.curNotifier && curNotifier.idle_manager)) return;
            if (!params.is_idle) {
              params.is_idle = true;
              clearTimeout(sendCbTO);
              sendCbTO = setTimeout(function () {
                if (params.onIdle) {
                  params.onIdle();
                }
                //debugLog('idle');
              }, 100);
            }
            removeEvent(document, 'mousemove keydown', cb_active);
            clearTimeout(checkIdleCbTo);
            checkIdleCbTo = setTimeout(checkIdleCb, 30000);
          };
          addEvent(window, 'focus', cb_active);
          addEvent(window, 'blur', cb_inactive);
          clearTimeout(checkIdleCbTo);
          checkIdleCbTo = setTimeout(checkIdleCb, 30000);
        }
      };
      return params;
    })(function () { // on IDLE
      Notifier.freezeEvents();
      Notifier.setFocus(0);
      cur.onIdle && each(cur.onIdle, function (k, cb) {cb();});
    }, function () { // on ACTIVE
      Notifier.unfreezeEvents();
      Notifier.setFocus(1);
      cur.onUnidle && each(cur.onUnidle, function (k, cb) {cb()});
      FastChat && FastChat.onUnidle();
    });
    curNotifier.idle_manager.start();
  },
  initFlashTransport: function (options) {
    return false;
    var flashVars = extend({
      onConnectionInit: 'Notifier.onConnectionInit',
      onConnectionFailed: 'Notifier.onConnectionFailed',
      onRelogin: 'Notifier.onRelogin',
      onMessageReceive: 'Notifier.onMessage',
      onInstanceFocus: 'Notifier.onInstanceFocus',
      onInstanceServer: 'Notifier.onInstanceServer'
    }, options);
    if (vk.id == 13033) {
      flashVars.onDebug = 'debugLog';
    }
    var queueCont = Notifier.getTransportWrap();
    if (!renderFlash(queueCont, {url: curNotifier.flash_url, id: 'queue_transport', name: 'queue_transport'}, {}, flashVars)) {
      return false;
    }
    curNotifier.flash_transport = ge('queue_transport') || false;
    curNotifier.transport = 'flash';
    return true;
  },
  initFrameTransport: function () {
    if (!ls.checkVersion() || browser.msie8 || !('onmessage' in window || 'postMessage' in window)) return false;

    curNotifier.connection_id = 'queue_connection_' + curNotifier.queue_id;
    curNotifier.lc_prev_value = '';
    curNotifier.is_server = false;
    curNotifier.lp_connected = false;
    curNotifier.error_timeout = 1;
    curNotifier.post_message = Notifier.debug || !(browser.opera || browser.msie);
    curNotifier.transport = 'frame';

    this.lcInit();

    return true;
  },
  onConnectionInit: function () {
    (!curNotifier.idle_manager || !curNotifier.idle_manager.is_idle) && Notifier.setFocus(1);
  },
  onConnectionFailed: function () { },
  onRelogin: function () {
    setTimeout(function () {
      Notifier.standby();
    }, 0);
  },
  onMessage: function (msg) {
    if (curNotifier.focus_instance && curNotifier.focus_instance != curNotifier.instance_id) { // Process only events, when no active tab or current window is focused
      return;
    }
    try {
      var events = eval('(' + msg + ')'), pushed = false;
      Notifier.pushEvents(events);
    } catch (e) {debugLog(e.message);}
  },
  onInstanceFocus: function (instance) {
    var focused = instance.charAt(0);
    instance = instance.substr(1);
    if (focused == '1') {
      curNotifier.focus_instance = instance;
    } else {
      if (curNotifier.focus_instance == instance) {
        curNotifier.focus_instance = '';
      }
      return;
    }
    if (instance != curNotifier.instance_id) {
      if (!curNotifier.idle_manager.is_idle) {
        curNotifier.idle_manager.is_idle = true;
        curNotifier.idle_manager.onIdle();
      }
      Notifier.hideAllEvents();
    }
  },
  onInstanceServer: function (isServer) {
    curNotifier.is_server = !!intval(isServer);
  },
  pushEvents: function (evs, cnt) {
    var pushed = 0;
    each (evs, function (k, v) {
      pushed |= Notifier.pushEvent(v, cnt);
    });
    if (pushed && !ls.get('sound_notify_off') && curNotifier.is_server) {
      if (pushed & 2) {
        curNotifier.sound_im.play();
      } else {
        curNotifier.sound.play();
      }
    }
  },
  pushEvent: function (msg, cnt) {
    if (msg == 'nop') {
      return;
    }
    msg = msg.split('<!>');
    if (msg[0] != curNotifier.version) {
      debugLog('Notifier old version');
      return false;
    }
    if (msg[1] == 'update_cnt') { // msg[2] - section
      handlePageCount(msg[3], msg[4], msg[5], msg[6]);
      return 0;
    }
    var ev = {
      type: msg[1],
      title: msg[2],
      author_photo: psr(msg[3] || ''),
      author_link: msg[4] || '',
      text: psr(msg[5]),
      add_photo: psr(msg[6]) || '',
      link: msg[7],
      onclick: msg[8],
      add: msg[9],
      id: msg[10],
      author_id: msg[11]
    }, push = !cnt ? 1 : 0;

    if (msg[12]) {
      ev.custom = eval('('+msg[12]+')');
    }

    if (curNotifier.done_events[ev.id]) return;
    curNotifier.done_events[ev.id] = 1;
    // debugLog(ev.type, ev.add, !!cnt);

    switch (ev.type) {
      case 'mail':
        handlePageCount('msg', ev.add);
        if (window.Call && Call.params.call_id && intval(ev['author_id']) == intval(Call.params['far_uid'])) {
          Call.showChat();
        }
        break;

      case 'post_reply':
      case 'reply_reply':
      case 'post_mention':
      case 'reply_mention':
      case 'wall_post':
      case 'comment_photo':
      case 'comment_photo_reply':
      case 'comment_photo_mention':
      case 'comment_video':
      case 'comment_video_reply':
      case 'comment_video_mention':
      case 'board_mention':
        handlePageCount('nws', ev.add, 'feed', 'section=notifications');
        break;

      case 'mail_failed':
        var peer = intval(ev.author_id);
        if (nav.objLoc[0] == 'im' && cur.tabs[peer]) {
          var msg = ge('mess'+ev.add);
          if (msg && hasClass(msg, 'im_new_msg')) {
            removeClass(msg, 'im_new_msg');
            addClass(msg, 'im_failed');
            var n = geByClass1('im_log_author_chat_name', msg);
            if (n) {
              n.innerHTML += ' &nbsp;<span>'+cur.lang['mail_send_failed']+'</span>';
            }
            push = 2; // only sound
          }
        }
        break;

      case 'friend_request':
        handlePageCount('fr', ev.add);
        break;

      case 'mail_cnt':
        handlePageCount('msg', ev.add);
        push = 0;
        break;

      case 'clear_notify':
        Notifier.hideAllEvents();
        push = 0;
        break;

      case 'support_reply':
        handlePageCount ('spr', ev.add, 'support', (ev.author_id ? 'act=show&id=' + ev.author_id : 'act=show'));
        toggle('l_spr', ev.add > 0);
        break;

      case 'support_cnt':
        handlePageCount ('spr', ev.add, 'support', (ev.author_id ? 'act=show&id=' + ev.author_id : 'act=show'));
        toggle('l_spr', ev.add > 0);
        push = 0;
        break;

      case 'balance_changed':
        updateMoney(ev.add);
        if (ev.custom && ev.custom[0] == 'app' && cur.app) {
          if (cur.app.params.api_id == ev.custom[1]) {
            cur.app.balanceUpdated(ev.custom[2]);
          }
        }
        break;

      case 'gift_sent':
        re('left_block10_0');
        var left_block = ev.add;
        if (left_block) {
          var leftBlocksElem = ge('left_blocks'),
              left_unpaid_gifts = se(left_block);
          if (leftBlocksElem) {
            if (leftBlocksElem.firstChild) {
              leftBlocksElem.insertBefore(left_unpaid_gifts, leftBlocksElem.firstChild);
            } else {
              leftBlocksElem.appendChild(left_unpaid_gifts);
            }
          }
        }
        break;

      case 'call_start':
        if (window.Call) {
          Call.incomingReceive(ev);
        } else {
          stManager.add(['call.js', 'call.css', 'notifier.css'], function() {
            Call.incomingReceive(ev);
          });
        }
        push = 0;
        break;

      case 'call':
        if (window.Call) {
          Call.processNotify(ev);
        } else {
          debugLog('wnd Call event without call obj');
        }
        push = 0;
        break;
    }
    // debugLog(ev);
    if (push && ev.type == 'mail') {
      var lastImTime = intval(ls.get('im_opened' + vk.id));
      if (vkNow() - lastImTime < 2000) {
        // So, currently IM is active
        push = 0;
      } else {
        push |= 2;
      }
      if (window.curFastChat && curFastChat.inited && ev.author_id) {
        if (curFastChat.tabs && curFastChat.tabs[ev.author_id] ||
            curFastChat.clistBox && curFastChat.clistBox.visible) {
          push = 2; // Only sound notification
        } else {
          ev.onclick = 'FastChat.addPeer(\'' + ev.author_id + '\', false, true);';
        }
      }
    }
    if (push & 1) {
      curNotifier.q_events.push(ev);
      if (curNotifier.q_events.length > 30) {
        curNotifier.q_events.splice(0, curNotifier.q_events.length - 30);
      }
      this.checkEvents();
    }
    return push;
  },
  checkEvents: function () {
    if (!curNotifier.q_events.length ||
        curNotifier.q_shown.length >= (curNotifier.idle_manager.is_idle ? curNotifier.q_idle_max : curNotifier.q_max) ||
        !curNotifier.idle_manager.is_idle && curNotifier.frozen
    ) {
      // debugLog(['check failed', !curNotifier.q_events.length, curNotifier.q_shown.length >= (curNotifier.idle_manager.is_idle ? curNotifier.q_idle_max : curNotifier.q_max), !curNotifier.idle_manager.is_idle && curNotifier.frozen, curNotifier.q_events.length, curNotifier.q_shown.length, (curNotifier.idle_manager.is_idle ? curNotifier.q_idle_max : curNotifier.q_max), curNotifier.idle_manager.is_idle, curNotifier.frozen]);
      // debugLog(curNotifier.q_shown);
      return;
    }
    var ev = curNotifier.q_events.shift();
    // if (nav.objLoc[0] == 'im' && ev.type == 'mail') return;
    // debugLog(this.canNotifyUi(), curNotifier.focus_instance, curNotifier.instance_id, curNotifier.is_server);
    if (curNotifier.idle_manager.is_idle && curNotifier.is_server && this.canNotifyUi()) {
      this.showEventUi(ev);
    } else {
      this.showEvent(ev);
    }
  },

  showEvent: function (ev) {
    curNotifier.q_shown.push(ev);
    var imgClass = '';
    if (ev.type == 'gift') {
      imgClass = ' notifier_image_gift';
    }
    ev.baloonWrapEl = ce('div', {
      className: 'notifier_baloon_wrap',
      innerHTML: '<div class="notifier_baloon clear_fix"><div class="notifier_baloon_head clear_fix"><div class="notifier_baloon_title fl_l">' + ev.title + '</div><div class="notifier_close_wrap fl_r"><a class="notifier_close" title="' + getLang('global_close') + '" href=""></a></div></div><div class="notifier_baloon_body"><table cellpadding="0" cellspacing="0" width="100%"><tr>' + (ev.author_photo && ('<td class="notifier_image_wrap"><div class="notifier_image_wrap">' + (ev.author_link && ('<a href="' + ev.author_link + '" onclick="return nav.go(this, event);">')) + '<img src="' + Notifier.fixPhoto(ev.author_photo) + '" class="notifier_image" />' + (ev.author_link && '</a>') + '</div></td>')) + '<td class="notifier_baloon_msg"><div class="notifier_baloon_msg wrapped" style="width: ' + (300 - 60 * ((ev.author_photo && ev.add_photo) ? 2 : ((ev.add_photo || ev.author_photo) ? 1 : 0))) + 'px;">' + ev.text + '</div></td>' + (ev.add_photo && ('<td class="notifier_add_image_wrap"><div class="notifier_image_wrap'+imgClass+'"><img src="' + ev.add_photo + '" class="notifier_image" /></div></td>')) + '</tr></table></div></div>'
    });
    ev.baloonEl = ev.baloonWrapEl.firstChild;
    ev.closeEl = geByClass1('notifier_close_wrap', ev.baloonEl);
    addEvent(ev.closeEl, 'mouseover mouseout', function (e) {
      e = (e.originalEvent || e) || window.event;
      if ((e.target || e.srcElement) != ev.closeEl) {
        return;
      }
      if (e.type == 'mouseover') {
        addClass(ev.closeEl, 'notifier_close_over');
      } else {
        removeClass(ev.closeEl, 'notifier_close_over');
      }
    });

    addEvent(ev.baloonEl, 'mouseover mouseout', function (e) {
      ev.over = (e.type == 'mouseover');
      if (ev.over) {
        Notifier.freezeEvents();
        addClass(ev.baloonEl, 'notifier_baloon_over');
      } else {
        Notifier.unfreezeEvents();
        removeClass(ev.baloonEl, 'notifier_baloon_over');
      }
    });
    addEvent(ev.baloonEl, 'mousedown', function (e) {
      e = (e.originalEvent || e) || window.event;
      var btn = e.which, nohide = false;
      if (browser.msie) {
        btn = e.button == 1 ? 1 : (e.button == 2 ? 3 : 2)
      }
      if (btn == 1 && (e.ctrlKey || browser.mac && e.metaKey)) {
        btn = 2;
        if (browser.mac) nohide = true;
      }
      if ((e.target || e.srcElement).tagName == 'A') {
        switch (btn) {
          case 1: // left button
            // setTimeout(function () {Notifier.hideEvent(ev);}, 100);
            break;

          case 3: // right
            break;
        }
        return;
      }
      // debugLog(e.button, e.which, btn, nohide);
      switch (btn) {
        case 1: //left button
          eval(ev.onclick);
          Notifier.hideEvent(ev);
          break;
        case 2: // middle
          var wnd = window.open(ev.link, '_blank');
          try {wnd.blur(); window.focus();} catch (e) {}
          if (!nohide) Notifier.hideEvent(ev); // else it will be  hidden by context menu
          break;
        case 3: // right
          if (browser.mozilla) {
            return;
          }
      }
      return cancelEvent(e);
    });
    addEvent(ev.baloonEl, 'contextmenu', function (e) {
      // debugLog('contextmenu');
      setTimeout(function () {
        Notifier.hideEvent(ev, false, false, true);
      }, 10);
      return cancelEvent(e);
    });
    addEvent(ev.closeEl, 'mousedown', function (e) {
      Notifier.hideEvent(ev, false, false, true);
      return cancelEvent(e);
    });
    ev.startFading = function () {
      ev.fading = animate(ev.baloonEl, {opacity: 0}, 1000, Notifier.hideEvent.bind(Notifier).pbind(ev, false));
      if (ev.over) {
        ev.fading.stop();
      }
    }
    curNotifier.cont.insertBefore(ev.baloonWrapEl, curNotifier.cont.firstChild);
    var h = ev.baloonWrapEl.offsetHeight;
    re(ev.baloonWrapEl);
    curNotifier.cont.appendChild(ev.baloonWrapEl);
    setStyle(curNotifier.cont, {bottom: -h});
    setStyle(ev.baloonWrapEl, {visibility: 'visible'});
    animate(curNotifier.cont, {bottom: 0}, 200);
    if (!curNotifier.idle_manager.is_idle) {
      ev.fadeTO = setTimeout(ev.startFading, 7000);
    }
  },

  canNotifyUi: function () {
    // if (vk.id == 13033) return false;
    return window.webkitNotifications && (webkitNotifications.checkPermission() <= 0 && !ls.get('im_ui_notify_off'));
  },

  showEventUi: function (ev) {
    if (!this.canNotifyUi()) return false;

    // curNotifier.q_shown.push(ev);
    var title = stripHTML(replaceEntities(ev.title));
    var text = stripHTML(replaceEntities(ev.text).replace(/<br>/g, "\n").replace(/(<span class='notifier_author_quote'.*<\/span>)/, '$1:')).replace(/&laquo;|&raquo;/gi, '"');
    var notification = ev.uiNotification = webkitNotifications.createNotification(ev.author_photo, title, text);
    notification.onclick = function (e) {
      window.focus();
      eval(ev.onclick);
      Notifier.hideEvent(ev);
    };
    notification.onclose = function () {
      Notifier.hideEvent(ev, true);
    };
    notification.show();
    ev.closeTO = setTimeout(Notifier.hideEvent.bind(Notifier).pbind(ev), 5000);
    return true;
  },

  hideEvent: function (ev, already, broadcasted, forced) {
    clearTimeout(ev.closeTO);
    clearTimeout(ev.fadeTO);
    ev.fading && ev.fading.stop();
    var pos = indexOf(curNotifier.q_shown, ev), closedLen;
    // debugLog('hide event', ev, already, broadcasted, forced, pos);
    if (pos != -1) {
      curNotifier.q_shown.splice(pos, 1);
    } else if (!ev.uiNotification && vk.id == 13033) {
      // window.console && isFunction(console.trace) && console.trace();
      // debugLog('trying to splice event not from q_shown', ev, curNotifier.q_shown);
    }
    Notifier.unfreezeEvents();
    if (!already) {
      if (ev.baloonWrapEl) {
        cleanElems(ev.closeEl, ev.baloonEl);
        re(ev.baloonWrapEl);
      } else if (ev.uiNotification) {
        ev.uiNotification.cancel();
      }
    }
    if (forced === true && isArray(curNotifier.q_closed)) {
      curNotifier.q_closed.unshift(vkNow());
      if ((closedLen = curNotifier.q_closed.length) > 3) {
        curNotifier.q_closed.splice(3, closedLen - 3);
        closedLen = 3;
      }
      // debugLog('q_closed', clone(curNotifier.q_closed));
      // closedLen == 3 && debugLog('interval', curNotifier.q_closed[0] - curNotifier.q_closed[2]);
      if (closedLen == 3 && curNotifier.q_closed[0] - curNotifier.q_closed[2] < 700) {
        Notifier.hideAllEvents();
      }
    }
    if (forced != -1) {
      this.checkEvents();
    }
    if (curNotifier.transport == 'frame' && !broadcasted) {
      this.lcSend('hide', {event_id: ev.id});
    }
    if ((forced === true || !curNotifier.idle_manager.is_idle) && !curNotifier.q_events.length && !curNotifier.q_shown.length) {
      ajax.post('notifier.php', {act: 'a_clear_notifier'});
    }
  },
  hideAllEvents: function () {
    curNotifier.q_events = [];
    each (clone(curNotifier.q_shown), function () {
      Notifier.hideEvent(this, false, true, -1);
    });
    curNotifier.q_shown = [];
    curNotifier.q_closed = [];
  },
  onEventHide: function (event_id) {
    if (!event_id) return;
    // debugLog('ev.id',  event_id);
    each(curNotifier.q_shown, function () {
      if (this.id == event_id) {
        // debugLog('found in q_shown', this);
        Notifier.hideEvent(this, false, true);
        return false;
      }
    });
    each(curNotifier.q_events, function (k) {
      if (this.id == event_id) {
        // debugLog('found in q_events', this);
        curNotifier.q_events.splice(k, 1);
        return false;
      }
    });
  },

  /* Fake localConnection methods (based on localStorage and onstorage events) */
  lcInit: function () {
    if (!curNotifier.post_message) {
      if (browser.msie && (intval(browser.version) < 9)) {
        // document.onstorage = this.lcOnStorage.bind(this);
        addEvent(document, 'storage', this.lcOnStorage.bind(this));
      } else {
        addEvent(window, 'storage', this.lcOnStorage.bind(this));
      }
      this.lcStart();
    } else { // localStorage through extra-iframe, because of vk document.domain problems
      addEvent(window, 'message', this.lcOnMessage.bind(this));
      var el = curNotifier.storage_el = ce('iframe', {
        id: 'queue_storage_frame',
        name: 'queue_storage_frame',
        src: /*location.protocol + '//' + locHost + */'/notifier.php?act=storage_frame&from=' + location.host + (Notifier.debug ? '&debug=' + vkNow() : '&4') + '#' + curNotifier.connection_id
      });
      Notifier.getTransportWrap().appendChild(el);
      curNotifier.storage_frame = el.contentWindow;
      curNotifier.storage_frame_origin = location.protocol + '//' + locHost;
    }
  },
  lcStart: function () {
    if (Notifier.lcCheckServer()) {
      this.lcServer();
    } else {
      this.lcSend('check');
      clearTimeout(curNotifier.becomeServerTO);
      curNotifier.becomeServerTO = setTimeout(this.lcServer.bind(this).pbind(true), 500);
    }

    curNotifier.checkServerInt = setInterval(function () {
      if (curNotifier.is_server) return;
      if (vkNow() - curNotifier.last_succ > 8000 && Notifier.lcCheckServer()) {
        debugLog('timeout');
        this.lcServer(true);
      }
    }.bind(this), 1000 + intval(rand(-100, 100)));
    curNotifier.isServerBroadcastInt = setInterval(function () {
      if (!curNotifier.is_server) return;
      if (Notifier.lcCheckServer()) {
        this.lcSend('check_ok');
      } else {
        debugLog('no server from server broadcast');
        this.lcNoServer();
      }
    }.bind(this), 5000 + intval(rand(-100, 100)));
    curNotifier.playlistTimeInt = setInterval(function () {
      if (!curNotifier.is_server) return;
      var plData = ls.get('pad_pldata');
      // if (!plData)  {
      //   var aid = ls.get('audio_id');
      //   if (aid) ls.remove('audio_id');
      //   return;
      // }
      if (plData && plData.instance == curNotifier.instance_id) {
        ls.set('pad_pltime', vkNow());
      } else {
        this.lcSend('check_playlist');
      }
      var plTime = ls.get('pad_pltime') || 0;
      if (vkNow() - plTime > 3000 && !(window._pads && _pads.shown == 'mus')) {
        ls.remove('pad_pltime');
        ls.remove('pad_pldata');
        ls.remove('pad_playlist');
        ls.remove('pad_lastsong');
        ls.remove('audio_id');
      }
    }.bind(this), 1000 + intval(rand(-100, 100)));

    if (curNotifier.fc !== undefined) {
      stManager.add(['emoji.js'], function() {
        FastChat.init(curNotifier.fc);
      });
    }
  },
  lcStop: function () {
    clearInterval(curNotifier.isServerBroadcastInt);
    clearInterval(curNotifier.checkServerInt);
    clearTimeout(curNotifier.becomeServerTO);
  },
  lcSend: function (act, data) {
    Notifier.debug && debugLog(curNotifier.instance_id + ': sending', act, data || '');
    // debugLog(act);
    var sendObj = extend({__client: curNotifier.instance_id, __act: act, __rnd: Math.random()}, data || {});
    if (!curNotifier.post_message) {
      ls.set(curNotifier.connection_id, sendObj);
    } else {
      try {
        curNotifier.storage_frame.postMessage(curNotifier.connection_id + ':' + JSON.stringify(sendObj), curNotifier.storage_frame_origin);
      } catch (e) {debugLog(e, e.message, e.stack);}
    }
  },
  lcRecv: function (data) {
    if (isEmpty(data) || data.__client == curNotifier.instance_id) return;
    var act = data.__act;
    delete data.__client;
    delete data.__act;
    delete data.__rnd;

    Notifier.debug && debugLog(curNotifier.instance_id + ': recv', act, data);
    // debugLog(act);
    switch (act) {
      case 'new_server':
        curNotifier.last_succ = vkNow() + 1000; // extra 1 sec for iframe init
        break;

      case 'feed':
        curNotifier.timestamp = data.ts;
        curNotifier.key = data.key;
        Notifier.pushEvents(data.events, !data.full);
        break;

      case 'addfeed':
        Notifier.addFeed(data[0], data[1]);
        break;

      case 'new_key':
        debugLog('new key', data);
        curNotifier.timestamp = data.ts;
        curNotifier.key = data.key;
        break;

      case 'new_addkey':
        // debugLog('add key', data);
        var queue = data.queue || data.key, addq = curNotifier.addQueues[queue], to_reset = !addq && curNotifier.is_server;
        if (addq) {
          addq[0] = vkNow();
        } else {
          curNotifier.addQueues[queue] = [vkNow(), data.ts, data.key];
        }
        if (to_reset) {
          Notifier.lpReset();
        }
        break;

      case 'clear_addkeys':
        curNotifier.addQueues = {};
        break;

      case 'check_ok':
        curNotifier.last_succ = vkNow();
        if (curNotifier.becomeServerTO) {
          clearTimeout(curNotifier.becomeServerTO);
          curNotifier.becomeServerTO = false;
        }
        if (!curNotifier.lp_connected) {
          curNotifier.lp_connected = true;
          Notifier.onConnectionInit();
        }
        break;

      case 'focus':
        // debugLog('focus from lc');
        Notifier.onInstanceFocus(data.instance_id);
        break;

      case 'hide':
        // debugLog('hide from lc');
        Notifier.onEventHide(data.event_id);
        break;

      case 'check_playlist':
        var pl = ls.get('pad_playlist');
        if (pl && pl.instance == curNotifier.instance_id) {
          ls.set('pad_pltime', vkNow());
        }
        break;

      default:
        if (curNotifier.recvClbks && curNotifier.recvClbks[act]) {
          for (var i in curNotifier.recvClbks[act]) curNotifier.recvClbks[act][i](data);
        }
        break;
    }
    if (!curNotifier.is_server) return;

    // acts, processed only while instance is server
    switch (act) {
      case 'new_server':
      case 'new_key':
      case 'check_ok':
        debugLog('no server from lcRecv', act);
        Notifier.lcNoServer();
        break;

      case 'check':
        this.lcSend('check_ok');
        break;
    }
  },
  lcOnStorage: function (e) { // receiving messages from native onstorage event
    e = e || window.event;
    Notifier.debug && debugLog('onstorage', e.key, e.newValue, e);
    var key = e.key, val = e.newValue;
    if (!val) {
      return;
    }
    if (!key) {
      key = curNotifier.connection_id;
      val = localStorage.getItem(key);
      if (val == curNotifier.lc_prev_value) return;
      curNotifier.lc_prev_value = val;
    } else {
      if (e.key != curNotifier.connection_id) return;
    }
    this.lcRecv(JSON.parse(val) || {});
  },
  lcOnMessage: function (e) { // receiving messages from storage iframe via postMessage
    e = e || window.event;
    Notifier.debug && debugLog('onmessage', e.data, e.origin, e);
    if (e.origin && e.origin != curNotifier.storage_frame_origin) {
      // vk.id == 13033 && debugLog('wrong origin', e.origin);
      return;
    }
    if (typeof e.data != 'string' || e.data.indexOf('q_st')) return;
    var msg = e.data.substr(4), pos, key;
    if (msg == 'ready') {
      curNotifier.storage_frame = e.source;
      this.lcStart();
    } else {
      if ((pos = msg.indexOf(':')) == -1 || (key = msg.substr(0, pos)) != curNotifier.connection_id || !msg.substr(pos + 1)) return;
      this.lcRecv(JSON.parse(msg.substr(pos + 1)));
    }
  },
  lcServer: function (changed) {
    debugLog('becoming server');
    this.lpInit();
    this.lcSend('new_server');
    Notifier.lcCheckServer(true);
    curNotifier.is_server = true;
    Notifier.onInstanceServer(1);
    if (!curNotifier.lp_connected) {
      curNotifier.lp_connected = true;
      Notifier.onConnectionInit();
    }
    if (window.curFastChat && curFastChat.inited) {
      FastChat.becameServer();
    }
    this.lpStop();
    if (!changed) {
      this.lpStart();
    } else {
      this.lpReset(this.lpStart.bind(this));
    }
  },
  lcNoServer: function () {
    this.lpStop();
    if (!curNotifier.is_server) {
      return;
    }
    debugLog('not server now');
    this.onInstanceServer(0);
    curNotifier.is_server = false;
  },
  lcCheckServer: function (nocheck) {
    var key = 'server_' + curNotifier.connection_id,
        prev, ts = vkNow();

    if (!nocheck && isArray(prev = ls.get(key)) && prev[0] != curNotifier.instance_id && ts - prev[1] < 8000) {
      return false;
    }
    ls.set(key, [curNotifier.instance_id, ts]);
    return true;
  },

  /* Long-poll methods */
  lpInit: function () {
    if (curNotifier.lpMakeRequest) return;
    delete curNotifier.lpMakeRequest;
    re('queue_transport_frame');
    Notifier.getTransportWrap().appendChild(
      ce('iframe', {
        id: 'queue_transport_frame',
        name: 'queue_transport_frame',
        src: curNotifier.frame_path
      })
    );
  },
  lpStart: function () {
    curNotifier.lp_started = true;
    Notifier.lpCheck();
  },
  lpStop: function () {
    curNotifier.lp_started = false;
    clearTimeout(curNotifier.lp_check_to);
    clearTimeout(curNotifier.lp_error_to);
    clearTimeout(curNotifier.lp_req_check_to);
  },
  lpCheck: function () {
    if (!curNotifier.lp_started || curNotifier.lpActive || curNotifier.lpInvalid) return;
    if (!curNotifier.lpMakeRequest) {
      clearTimeout(curNotifier.lp_check_to);
      curNotifier.lp_check_to = setTimeout(this.lpCheck.bind(this), 1000);
      return;
    }
    if (!Notifier.lcCheckServer()) {
      debugLog('no server from check');
      this.lcNoServer();
      return;
    }

    var now = vkNow(),
        add_queues = [],
        completed = false,
        params = {
      act: 'a_check',
      ts: curNotifier.timestamp,
      key: curNotifier.key,
      id: curNotifier.uid,
      wait: 25
    };

    each (curNotifier.addQueues, function (queue, data) {
      if (now - data[0] > 30000) {
        // old queue
        debugLog('drop key', queue, now - data[0]);
        delete curNotifier.addQueues[queue];
        return;
      }
      add_queues.push(queue);
      params.ts += '_' + data[1];
      params.key += data[2];
    });

    var onFail = function (msg) {
      if (completed) return;
      completed = true;
      curNotifier.lpActive = false;
      clearTimeout(curNotifier.lp_req_check_to);
      // topError('Notify error: ' + msg);

      curNotifier.error_timeout = curNotifier.error_timeout || 1;
      clearTimeout(curNotifier.lp_error_to);
      curNotifier.lp_error_to = setTimeout(this.lpCheck.bind(this), curNotifier.error_timeout * 1000 + irand(1000, 10000));
      if (curNotifier.error_timeout < 64) {
        curNotifier.error_timeout *= 2;
      }
    }.bind(this);

    // debugLog('query', params.ts, params.key);
    curNotifier.lpActive = true;
    clearTimeout(curNotifier.lp_req_check_to);
    curNotifier.lp_req_check_to = setTimeout(onFail, (params.wait + 5) * 1000);
    curNotifier.lpMakeRequest(curNotifier.frame_url, params, function (text) {
      if (completed) return;
      completed = true;
      curNotifier.lpActive = false;
      if (!curNotifier.lp_started) return;
      this.lcSend('check_ok');
      try {
        var response = eval('(' + text + ')'), main_response = response, add_response, add_queue, busy = 0;
        // debugLog('response', clone(response), clone(add_queues));
        if (isArray(response)) {
          main_response = response.shift();
          while (add_response = response.shift()) {
            add_queue = add_queues.shift();
            if (!add_queue) break;
            if (add_response.failed == 2 && add_response.err == 4) {
              debugLog('!!notifier key busy!! ' + curNotifier.instance_id);
              busy |= 1;
              continue;
            }
            this.lcSend('addfeed', [add_queue, add_response]);
            this.addFeed(add_queue, add_response);
            if (add_response.failed) {
              delete curNotifier.addQueues[add_queue];
            }
          }
        } else if (response.failed) {
          while (add_queue = add_queues.shift()) {
            this.lcSend('addfeed', [add_queue, response]);
            this.addFeed(add_queue, response);
            delete curNotifier.addQueues[add_queue];
          }
          this.lcSend('clear_addkeys');
        }
        switch (this.lpChecked(main_response)) {
          case 0: break; // ok

          case 1:
            // topError('Notifier key real error', {dt: -1, type: 5, answer: text + '\n\nbusy:' + busy + '\nserver:' + curNotifier.is_server + '\ninstance:' + curNotifier.instance_id, url: curNotifier.frame_url, query: params && ajx2q(params)});
            return;

          case 2:
            busy |= 2; break;

          default: return;
        }
        if (!busy) {
          this.lpCheck();
          curNotifier.error_timeout = Math.max(1, (curNotifier.error_timeout || 1) / 1.5);
        } else {
          // topError('Notifier key busy', {dt: -1, type: 5, answer: text + '\n\nbusy:' + busy + '\nserver:' + curNotifier.is_server + '\ninstance:' + curNotifier.instance_id, url: curNotifier.frame_url, query: params && ajx2q(params)});
          this.lcNoServer();
        }
      } catch (e) {
        if (text && text.indexOf('Ad Muncher') == -1) {
          topError('Notifier error: ' + e.message, {dt: -1, type: 5, stack: e.stack, answer: text + '\n\nbusy:' + busy + '\nserver:' + curNotifier.is_server + '\ninstance:' + curNotifier.instance_id, url: curNotifier.frame_url, query: params && ajx2q(params)});
          debugLog(e.message, e.stack, e);
        }

        curNotifier.error_timeout = curNotifier.error_timeout || 1;
        clearTimeout(curNotifier.lp_error_to);
        curNotifier.lp_error_to = setTimeout(this.lpCheck.bind(this), curNotifier.error_timeout * 1000);
        if (curNotifier.error_timeout < 64) {
          curNotifier.error_timeout *= 2;
        }
      }
    }.bind(this), onFail);
  },
  lpChecked: function(response) {
    // debugLog('response', response);
    var failed = response.failed;
    if (failed == 2) {
      if (response.err == 4) {
        return 2;
      }
      curNotifier.lpInvalid = true;
      clearTimeout(curNotifier.lp_error_to);
      curNotifier.lp_error_to = setTimeout(this.lpGetKey.bind(this), curNotifier.error_timeout * 1000);
      if (curNotifier.error_timeout < 64) {
        curNotifier.error_timeout *= 2;
      }
      return (response.err == 1) ? 1 : 3;
    } else if (failed) {
      throw getLang('global_unknown_error');
    }
    this.lcSend('feed', extend({full: curNotifier.idle_manager && curNotifier.idle_manager.is_idle && !this.canNotifyUi(), key: curNotifier.key}, response));

    curNotifier.timestamp = response.ts;
    Notifier.pushEvents(response.events);
    return 0;
  },
  lpOnReset: function () {
    curNotifier.lpOnReset && curNotifier.lpOnReset();
  },
  lpReset: function (cb) {
    if (cb) {
      curNotifier.lpOnReset = cb;
    }
    clearTimeout(curNotifier.resetTO);
    curNotifier.resetTO = setTimeout(function () {
      if (curNotifier.is_server && !curNotifier.lp_started) {
        Notifier.lpStart();
        return
      }
      if (curNotifier.lpMakeRequest && !curNotifier.lpInvalid) {
        var key = curNotifier.key, ts = curNotifier.timestamp;
        each (curNotifier.addQueues, function (queue, data) {
          key += data[2];
          ts += '_' + data[1];
        });
        curNotifier.lpMakeRequest(curNotifier.frame_url, {
          act: 'a_release',
          key: key,
          ts: ts,
          id: curNotifier.uid,
          wait: 25
        }, Notifier.lpOnReset, Notifier.lpOnReset);
      } else {
        ajax.post('notifier.php?act=a_reset', false, {
          onDone: Notifier.lpOnReset,
          onFail: function () {Notifier.lpOnReset(); return true;}
        });
      }
    }, 100);
  },
  lpGetKey: function () {
    var stNow = vkNow();
    ajax.post('notifier.php?act=a_get_key', {id: curNotifier.uid}, {
      onDone: function (key, ts) {
        curNotifier.timestamp = ts;
        curNotifier.key = key;
        curNotifier.lpInvalid = false;
        this.lcSend('new_key', {ts: ts, key: key});
        this.lpCheck();
      }.bind(this),
      onFail: function (code) {
        switch (code) {
          case 1: // non auth
          case 3: // disabled
            Notifier.standby();
            return;
            break

          case 4: // dynamic IP address
            Notifier.standby(300);
            return;
            break;

          case 2: // wrong auth
            Notifier.onRelogin();
            return;
            break
        }
        curNotifier.error_timeout = 64;
        clearTimeout(this.lp_error_to);
        this.lp_error_to = setTimeout(this.lpGetKey.bind(this), curNotifier.error_timeout * 1000);
        // if (curNotifier.error_timeout < 64) {
        //   curNotifier.error_timeout *= 2;
        // }
        return true;
      }.bind(this)
    });
  },

  addKey: function (data, cb, local) {
    if (curNotifier.flash_transport) {
      return false;
    }
    // debugLog(data);
    var queue = (data && data.queue) ? data.queue : data.key;
    var addq = curNotifier.addQueues[queue];
    var to_reset = !addq && curNotifier.is_server;
    if (addq) {
      addq[0] = vkNow();
      addq[3] = cb;
      addq[4] = local;
    } else {
      curNotifier.addQueues[queue] = [vkNow(), data.ts, data.key, cb, local];
    }
    if (!local) {
      Notifier.lcSend('new_addkey', data);
    }
    if (to_reset) {
      Notifier.lpReset();
    }
    return true;
  },
  addFeed: function (queue, data) {
    var addq = curNotifier.addQueues[queue];
    if (!isArray(addq) || !addq.length) return;

    addq[1] = data.ts;
    if (isFunction(addq[3])) {
      // debugLog('addfeed', queue, data);
      addq[3](queue, data);
    }
  },
  addRecvClbk: function(act, type, clbk, force) {
    if (!curNotifier.recvClbks) curNotifier.recvClbks = {};
    if (!curNotifier.recvClbks[act]) curNotifier.recvClbks[act] = {};
    if (!curNotifier.recvClbks[act][type] || force) {
      curNotifier.recvClbks[act][type] = clbk;
    }
  },

  fixPhoto: function (src, smaller) {
    src = clean(src);
    if (src.indexOf('question_c.gif') == -1) {
      return src;
    }
    return smaller ? '/images/question_inv_xc.png' : '/images/question_inv_c.png';
  }
}

function Sound(filename) {
  var audioObjSupport = false, audioTagSupport = false, self = this, ext;
  if (!filename) throw 'Undefined filename';

  try {
    var audioObj = ce('audio');
    audioObjSupport = !!(audioObj.canPlayType);

    if (('no' != audioObj.canPlayType('audio/mpeg')) && ('' != audioObj.canPlayType('audio/mpeg')))
      ext = '.mp3?1';
    else if (('no' != audioObj.canPlayType('audio/ogg; codecs="vorbis"')) && ('' != audioObj.canPlayType('audio/ogg; codecs="vorbis"')))
      ext = '.ogg?1';
    else
      audioObjSupport = false;
  } catch (e) {}
  // audioObjSupport = false;

  if (audioObjSupport) {
    audioObj.src = '/' + filename + ext;
    var ended = false;
    audioObj.addEventListener('ended', function(){ended = true;}, true);
    audioObj.load();
    this.playSound = function() {
      if (ended) {
        audioObj.load();
      }
      audioObj.play();
      ended = false;
    };
    this.pauseSound = function() {
      audioObj.pause();
    };
  } else {
    cur.__sound_guid = cur.__sound_guid || 0;
    var wrap = ge('flash_sounds_wrap') || utilsNode.appendChild(ce('span', {id: 'flash_sounds_wrap'})),
        guid = 'flash_sound_' + (cur.__sound_guid++);

    var opts = {
      url: '/swf/audio_lite.swf?4',
      id: guid
    }
    var params = {
      swliveconnect: 'true',
      allowscriptaccess: 'always',
      wmode: 'opaque'
    }
    if (renderFlash(wrap, opts, params, {})) {
      var swfObj = browser.msie ? window[guid] : document[guid],
          inited = false,
          checkLoadInt = setInterval(function () {
        if (swfObj && swfObj.paused) {
          try {
            swfObj.setVolume(1);
            swfObj.loadAudio('/' + filename + ext);
            swfObj.pauseAudio();
          } catch (e) {debugLog(e);}
        }
        inited = true;
        clearInterval(checkLoadInt);
      }, 300);
      self.playSound = function() {
        if (!inited) return;
        swfObj.playAudio(0);
      };
      self.pauseSound = function() {
        if (!inited) return;
        swfObj.pauseAudio();
      };
    }
  }
}
Sound.prototype = {
  play: function() {
    try {this.playSound();} catch(e){}
  },
  pause: function() {
    try {this.pauseSound();} catch(e){}
  }
};


function getWndInner() {
  var w = lastWindowWidth, h = lastWindowHeight, sb = sbWidth();
  if (lastWndScroll[0] !== false ? lastWndScroll[0] :
      (browser.msie6 ? pageNode.scrollHeight > pageNode.clientHeight : !browser.msie6 && htmlNode.scrollHeight > htmlNode.clientHeight)) {
    w -= sb + (sb ? 1 : 0);
  }
  return [h, w];
}

window.lastWndScroll = [false, false];
function updateWndVScroll() {
  var w = window, wndInner = getWndInner(), vScroll = false;
  if (w.boxLayerWrap && isVisible(boxLayerWrap)) {
    vScroll = (boxLayerWrap.scrollHeight > boxLayerWrap.clientHeight) ? 1 : 0;
  } else if (w.layerWrap && isVisible(layerWrap)) {
    vScroll = (layerWrap.scrollHeight > layerWrap.clientHeight) ? 1 : 0;
  } else if (w.mvLayerWrap && isVisible(mvLayerWrap)) {
    vScroll = (mvLayerWrap.scrollHeight > mvLayerWrap.clientHeight) ? 1 : 0;
  } else {
    vScroll = false;
  }
  if (vScroll === lastWndScroll[0]) {
    return;
  }
  lastWndScroll[0] = vScroll;

  each (curRBox.boxes, function (id) {
    if (this.toRight) {
      setStyle(this.wrap, {marginRight: vScroll ? sbWidth() + 1 : 0});
    }
  });
}

function defBox(options, callback) {
  var boxC = '<div><div class="fc_clist_inner"><div class="fc_tab_head"><a class="fc_tab_close_wrap fl_r"><div class="fc_tab_close"></div></a><div class="fc_tab_title noselect">%title%</div></div>%content%</div></div></div>';

  if (options.content) {
    var cont = '<div class="fc_content_wrap"><div class="fc_content">'+options.content+'</div></div>';
  } else {
    var cont = options.innerHTML;
  }
  var wrap = se(rs(boxC, {
    title: options.title,
    content: cont
  }));
  var cont = geByClass1('fc_content', wrap, 'div');
  var opts = {
    movable: geByClass1('fc_tab_head', wrap),
    hider: geByClass1('fc_tab_close_wrap', wrap, 'a'),
    startLeft: options.x,
    startTop: options.y,
    startHeight: options.height,
    startWidth: options.width,
    resizeableH: cont,
    resize: false,
    minH: options.minH,
    onBeforeHide: options.onBeforeHide || function() {},
    onHide: options.onHide || function () {},
    onDragEnd: function (y, x) {},
    onResize: function (h, w) {}
  },
  box = new RBox(wrap, extend(opts, options));

  if (options.content) {
    var scroll = new Scrollbar(cont, {
      prefix: 'fc_',
      more: debugLog,
      nomargin: true,
      global: true,
      nokeys: true,
      right: vk.rtl ? 'auto' : 10,
      left: !vk.rtl ? 'auto' : 10,
      onHold: options.onHold
    });
  }

  callback({
    id: box.id,
    cont: cont,
    update: function() {
      scroll && scroll.update();
    }
  });
  return box;
}

if (!window.curRBox) {
  curRBox = {
    guid: 0,
    active: false,
    focused: [],
    boxes: {}
  };
}
function RBox(content, options) {
  var t = this, defaultOptions = {
    minH: 50,
    minW: 50
  };
  t.options = options = extend(defaultOptions, options);
  t.content = content;
  var id = t.id = 'rb_box_' + (options.id || curRBox.guid++);

  t.wrap = ce('div', {id: id, className: 'rb_box_wrap fixed'});
  var pos = {};
  t.toBottom = t.toRight = false;
  if (options.startTop !== undefined) pos.top = options.startTop;
  else if (options.startBottom !== undefined) pos.bottom = options.startBottom;
  if (options.startLeft !== undefined) pos.left = options.startLeft;
  else if (options.startRight !== undefined) pos.right = options.startRight;
  setStyle(t.wrap, pos);

  if (options.movable) {
    addEvent(options.movable, 'mousedown', t._head_mdown.bind(t));
  }
  t.resizeableH = options.resizeableH || content;
  if (options.startHeight) {
    setStyle(t.resizeableH, 'height', options.startHeight);
  }
  t.resizeableW = options.resizeableW || content;
  if (options.startWidth) {
    setStyle(t.resizeableW, 'width', options.startWidth);
  }
  addEvent(content, 'mousedown', t._cont_mdown.bind(t));
  if (options.closer) {
    addEvent(options.closer, 'mousedown', t._close_mdown.bind(t));
    addEvent(options.closer, 'click', t._close_click.bind(t));
  }
  if (options.hider) {
    addEvent(options.hider, 'mousedown', t._close_mdown.bind(t));
    addEvent(options.hider, 'click', t._hide_click.bind(t));
  }
  if (options.minimizer && options.minimizer !== true) {
    addEvent(options.minimizer, 'mousedown', t._close_mdown.bind(t));
    addEvent(options.minimizer, 'click', t._min_toggle.bind(t));
  }
    // debugLog(options.closer);

  t.wrap.appendChild(content);

  if (options.resize !== false) {
    t.resizeWrap = ce('div', {className: 'rb_resize_wrap', innerHTML: '<div class="rb_resize"></div>'});
    t.wrap.appendChild(t.resizeWrap);
    addEvent(t.resizeWrap, 'mousedown', t._resize_mdown.bind(t));
  }
  if (options.minimized) {
    addClass(t.wrap, 'rb_minimized');
    t.minimized = true;
  }
  bodyNode.insertBefore(t.wrap, ge('page_wrap'));

  var st = getStyle(t.wrap, 'top'),
      sb = getStyle(t.wrap, 'bottom'),
      sl = getStyle(t.wrap, 'left'),
      sr = getStyle(t.wrap, 'right');
  this.toBottom = (st === 'auto' || st === '' || browser.msie && st === 0) && sb != 'auto' && sb !== '' && !(browser.msie && sb === 0);
  this.toRight = (sl === 'auto' || sl === '' || browser.msie && sl === 0) && sr != 'auto' && sr !== '' && !(browser.msie && sr === 0);

  if (this.toRight) {
    setStyle(t.wrap, {marginRight: lastWndScroll[0] ? sbWidth() + 1 : 0});
  }
  if (options.nofocus || options.noshow) {
    addClass(t.wrap, 'rb_inactive');
  }

  // console.log(['s', st,st === '0',st === 0, sb, sl,sl==='0',sl===0, sr, this.toBottom, this.toRight]);
  curRBox.boxes[id] = t;
  t.pos = false;
  if (!options.noshow) {
    t.show(false, options.nofocus);
  } else {
    setStyle(t.wrap, {visibility: 'hidden', display: 'block'});
    t._update_pos();
    setStyle(t.wrap, {visibility: '', display: ''});
  }
};
extend(RBox.prototype, {
  show: function (ts, nofocus) {
    var t = this;
    if (ts === undefined) ts = 0;
    if (ts) {
      setStyle(t.wrap, {opacity: 0, display: 'block'});
      t.visible = true;
      !nofocus && t.focus();
      animate(t.wrap, {opacity: 1}, ts, function () {
        setStyle(t.wrap, browser.msie ? {filter: 'none'} : {opacity: ''});
        t._update_pos();
      });
    } else {
      show(t.wrap);
      t.visible = true;
      !nofocus && t.focus();
      t._update_pos();
    }
  },
  hide: function (ts, nofire) {
    var t = this;
    if (!nofire && t.options.onBeforeHide && t.options.onBeforeHide()) {
      return true;
    }
    if (ts === undefined) ts = 0;
    if (ts) {
      setStyle(t.wrap, {opacity: 1, display: 'block'});
      animate(t.wrap, {opacity: 0}, ts, function () {
        hide(t.wrap);
        setStyle(t.wrap, browser.msie ? {filter: 'none'} : {opacity: ''});
      });
    } else {
      hide(t.wrap);
    }
    t.visible = false;
    if (!nofire && t.options.onHide) t.options.onHide();
  },
  _head_mdown: function (e) {
    if (checkEvent(e)) return;
    (e.originalEvent || e).cancelBubble = true;

    var t = this, handler = e.target,
        wndInner = getWndInner(),
        focused = curRBox.active == t.id,
        startY = e.pageY,
        startX = e.pageX,
        wrapH = t.wrap.offsetHeight,
        wrapW = t.wrap.offsetWidth,
        startTop, startLeft, lastTop = 0, lastLeft = 0,
        maxTop = wndInner[0] - wrapH,
        maxLeft = wndInner[1] - wrapW,
        selectEvent = browser.msie ? 'selectstart' : 'mousedown';

    if (!focused) {
      t.focus(e);
    }

    if (t.toBottom) {
      t.toBottom = false;
      startTop = wndInner[0] - intval(getStyle(t.wrap, 'bottom')) - wrapH;
      setStyle(t.wrap, {top: startTop, bottom: 'auto'});
    } else startTop = intval(getStyle(t.wrap, 'top'));
    if (t.toRight) {
      t.toRight = false;
      // console.log(['to r',startLeft, getStyle(t.wrap, 'right'), intval(getStyle(t.wrap, 'right')), wrapW]);
      startLeft = wndInner[1] - intval(getStyle(t.wrap, 'right')) - wrapW;
      setStyle(t.wrap, {left: startLeft, right: 'auto'});
    } else startLeft = intval(getStyle(t.wrap, 'left'));

    lastTop = startTop;
    lastLeft = startLeft;

    cur._fcdrag = 1;
    var _temp = function (e) {
      lastTop = Math.max(0, Math.min(maxTop, startTop + e.pageY - startY));
      if (maxTop - lastTop < 10) lastTop = maxTop;
      else if (lastTop < 10) lastTop = 0;
      t.wrap.style.top = lastTop + 'px';

      lastLeft = Math.max(0, Math.min(maxLeft, startLeft + e.pageX - startX));
      if (maxLeft - lastLeft < 10) lastLeft = maxLeft;
      else if (lastLeft < 10) lastLeft = 0;
      t.wrap.style.left = lastLeft + 'px';
      return cancelEvent(e);
    }, _temp2 = function (e) {
      cur._fcdrag = 0;
      removeEvent(document, 'mousemove', _temp);
      removeEvent(document, 'mouseup', _temp2);
      removeEvent(document, selectEvent, cancelEvent);
      setStyle(bodyNode, 'cursor', '');
      setStyle(handler, 'cursor', '');
      if (t.toBottom = (lastTop >= maxTop - 5)) {
        setStyle(t.wrap, {top: 'auto', bottom: 0});
      }
      if (t.toRight = (lastLeft >= maxLeft - 5)) {
        setStyle(t.wrap, {left: 'auto', right: 0, marginRight: lastWndScroll[0] ? sbWidth() + 1 : 0});
      }
      // debugLog('mup', t.toBottom, lastTop, maxTop);
      t._update_pos();
      var dlittle = Math.abs(e.pageY - startY) < 3 && Math.abs(e.pageX - startX) < 3;
      if (cur._fcpromo > 0) {
        cur._fcpromo = dlittle ? 0 : -1;
      } else if (t.options.minimizer && dlittle) {
        if (!t.minimized && focused) {
          t.minimize(true);
        } else if (t.minimized) {
          t.unminimize(true);
        }
      } else {
        t.options.onDragEnd && t.options.onDragEnd(t.toBottom ? -1 : lastTop / wndInner[0], t.toRight ? -1 : lastLeft / wndInner[1]);
      }
    };

    addEvent(document, 'mousemove', _temp);
    addEvent(document, 'mouseup', _temp2);
    addEvent(document, selectEvent, cancelEvent);
    setStyle(bodyNode, 'cursor', 'move');
    setStyle(handler, 'cursor', 'move');
    return false;
  },
  _resize_mdown: function (e) {
    if (checkEvent(e)) return;
    this.focus(e);

    var t = this, handler = e.target,
        wndInner = getWndInner(),
        startY = e.pageY,
        startX = e.pageX,
        wrapH = t.wrap.offsetHeight,
        wrapW = t.wrap.offsetWidth,
        startTop, startLeft, lastH = 0, lastW = 0,
        startH = t.resizeableH.clientHeight - intval(getStyle(t.resizeableH, 'paddingBottom')) - intval(getStyle(t.resizeableH, 'paddingTop')),
        startW = t.resizeableW.clientWidth - intval(getStyle(t.resizeableW, 'paddingRight')) - intval(getStyle(t.resizeableW, 'paddingLeft')),
        selectEvent = browser.msie ? 'selectstart' : 'mousedown',
        onresize = !browser.msie && t.options.onResize || false;
        // debugLog(startH, startW);

    if (t.toBottom) {
      t.toBottom = false;
      startTop = wndInner[0] - intval(getStyle(t.wrap, 'bottom')) - wrapH;
      setStyle(t.wrap, {top: startTop, bottom: 'auto'});
      // debugLog('rst', wndInner[0], intval(getStyle(t.wrap, 'bottom')), wrapH, startTop);
    } else startTop = intval(getStyle(t.wrap, 'top'));
    if (t.toRight) {
      t.toRight = false;
      startLeft = wndInner[1] - intval(getStyle(t.wrap, 'right')) - wrapW;
      setStyle(t.wrap, {left: startLeft, right: 'auto'});
      // debugLog('to right -> left', startLeft, 'wnd', wndInner[1]);
    } else startLeft = intval(getStyle(t.wrap, 'left'));

    t.options.onResizeStart && t.options.onResizeStart(startH, startW);

    var maxH = startH + wndInner[0] - startTop - wrapH,
        maxW = startW + wndInner[1] - startLeft - wrapW;
    // debugLog(maxH, startH, wndInner[0], startTop, wrapH);
    // debugLog('wndW', wndInner[1], 'maxW', maxW, '');

    var _temp = function (e) {
      lastH = Math.max(t.options.minH, Math.min(maxH, startH + e.pageY - startY));
      // debugLog(maxH, lastH, maxH - lastH);
      if (maxH - lastH < 10) lastH = maxH;
      t.resizeableH.style.height = lastH + 'px';
      // debugLog(lastH + 'px');

      lastW = Math.max(t.options.minW, Math.min(maxW, startW + e.pageX - startX));
      if (maxW - lastW < 10) lastW = maxW;
      t.resizeableW.style.width = lastW + 'px';
      onresize && onresize(lastH, lastW)

      return cancelEvent(e);
    }, _temp2 = function (e) {
      removeEvent(document, 'mousemove', _temp);
      removeEvent(document, 'mouseup', _temp2);
      removeEvent(document, selectEvent, cancelEvent);
      setStyle(bodyNode, 'cursor', '');
      setStyle(handler, 'cursor', '');
      if (t.toBottom = (lastH == maxH)) {
        setStyle(t.wrap, {top: 'auto', bottom: 0});
      }
      if (t.toRight = (lastW == maxW)) {
        setStyle(t.wrap, {left: 'auto', right: 0, marginRight: lastWndScroll[0] ? sbWidth() + 1 : 0});
      }
      t._update_pos();
      t.options.onResizeEnd && t.options.onResizeEnd(lastH, lastW, wndInner[0], wndInner[1], t.toBottom, t.toRight);
    };

    addEvent(document, 'mousemove', _temp);
    addEvent(document, 'mouseup', _temp2);
    addEvent(document, selectEvent, cancelEvent);
    setStyle(bodyNode, 'cursor', 'move');
    setStyle(handler, 'cursor', 'move');
    return false;
  },
  _update_pos: function() {
    var t = this, wrap = t.wrap
    t.pos = [t.wrap.offsetTop, t.wrap.offsetLeft, t.wrap.offsetHeight, t.wrap.offsetWidth];
  },
  _wnd_resize: function (wndH, wndW, check) {
    // debugLog('---- resize -----');
    var t = this;
    if (t.toBottom) {
      t.pos[0] = t.wrap.offsetTop;
    }
    if (t.toRight) {
      t.pos[1] = t.wrap.offsetLeft;
    }
    var s = {}, sh = false, sw = false,
        needH = t.pos[0] + t.pos[2] - wndH,
        diffT = t.pos[0],
        // diffH = t.options.resize !== false ? t.resizeableH.clientHeight - t.options.minH : 0,
        diffH = t.resizeableH.clientHeight - t.options.minH,
        needW = t.pos[1] + t.pos[3] - wndW,
        diffL = t.pos[1],
        diffW = t.options.resize !== false ? t.resizeableW.clientWidth - t.options.minW : 0;

    if (check) {
      if (diffW < 0) {
        setStyle(t.resizeableW, t.options.minW);
      }
      if (diffH < 0) {
        setStyle(t.resizeableH, t.options.minH);
      }
    }

    if ((needH <= 0 || diffT <= 0  && diffH <= 0) &&
        (needW <= 0 || diffL <= 0  && diffW <= 0)) return;

    // debugLog('needH', needH, 'diffT', diffT, 'diffH', diffH);
    // debugLog('needW', needW, 'diffL', diffL, 'diffW', diffW);

    if (needH > 0 && diffT > 0) {
      diffT = Math.min(needH, diffT);
      needH -= diffT;
      s.top = t.pos[0] - diffT;
      s.bottom = '';
      // debugLog('moving top', t.pos[0], 'by', diffT, 'now need', needH);
    }
    if (needH > 0 && diffH > 0) {
      diffH = Math.min(needH, diffH);
      sh = t.resizeableH.clientHeight - diffH;
      // debugLog('change height', t.resizeableH.clientHeight, 'by', diffH);
    }
    if (needW > 0 && diffL > 0) {
      diffL = Math.min(needW, diffL);
      needW -= diffL;
      s.left = t.pos[1] - diffL;
      s.right = '';
      // debugLog('moving left', t.pos[1], 'by', diffL, 'now need', needW);
    }
    if (needW > 0 && diffW > 0) {
      diffW = Math.min(needW, diffW);
      sw = t.resizeableW.clientWidth - diffW;
      // debugLog('change width', t.resizeableW.clientWidth, 'by', diffW);
    }
    if (sw !== false) {
      setStyle(t.resizeableW, 'width', sw);
    }
    if (sh !== false) {
      setStyle(t.resizeableH, 'height', sh);
    }
    setStyle(t.wrap, s);
    t._update_pos();
    t.options.onResize && t.options.onResize(t.resizeableH.clientHeight, t.resizeableW.clientWidth);
  },
  _cont_mdown: function (e) {
    var stop = (curRBox.active != this.id);
    if (stop) {
      this.focus(e);
      if (!hasClass(e.target, 'fc_editable')) {
        return cancelEvent(e);
      }
    }
  },

  _focus: function () {
    var t = this, pos = indexOf(curRBox.focused, t.id), prev = curRBox.active, prevBox = prev && curRBox.boxes[prev];
    if (prev == t.id) {
      return;
    }
    if (prevBox && isFunction(prevBox.options.onBlur)) {
      prevBox.options.onBlur();
    }
    if (pos != -1) {
      curRBox.focused.splice(pos, 1);
    }
    curRBox.focused.unshift(t.id);

    var zIndex = 700 + curRBox.focused.length, first = true;
    each(curRBox.focused, function (k, id) {
      var wrap = curRBox.boxes[id].wrap;
      if (first) {
        addClass(wrap, 'rb_active');
        removeClass(wrap, 'rb_inactive');
        curRBox.active = id;
        first = false;
      } else {
        removeClass(wrap, 'rb_active');
        addClass(wrap, 'rb_inactive');
      }
      setStyle(wrap, 'zIndex', zIndex);
      zIndex--;
    });
  },
  _hide_click: function () {
    this.hide();
  },
  minimize: function (fire) {
    var t = this, wrap = t.wrap;
    addClass(wrap, 'rb_minimized');
    t.minimized = true;
    t._update_pos();
    if (fire && t.options.onMinimize) {
      t.options.onMinimize(0);
    }
  },
  unminimize: function (fire) {
    var t = this, wrap = t.wrap, wndInner = getWndInner();
    removeClass(wrap, 'rb_minimized');
    t.minimized = false;
    t._update_pos();
    t._wnd_resize(wndInner[0], wndInner[1], true);
    curRBox.active = false;
    t.focus();
    if (fire && t.options.onMinimize) {
      t.options.onMinimize(1);
    }
  },
  _min_toggle: function (e) {
    var t = this;
    setTimeout(function () {
      if (!t.minimized) {
        t.minimize(true);
      } else {
        t.unminimize(true);
      }
    }, 50);
  },
  destroy: function () {
    var t = this,
        pos = indexOf(curRBox.focused, t.id);
    if (pos != -1) {
      curRBox.focused.splice(pos, 1);
    }
    cleanElems(t.wrap, t.resizeWrap, t.content, t.options.movable, t.options.closer, t.options.hider);
    re(t.wrap);
    delete curRBox.boxes[t.id];
    delete t;
  },
  _close_mdown: function (e) {
    (e.originalEvent || e).cancelBubble = true;
  },
  _close_click: function (e) {
    this.close();
  },
  _close: function () {
    var t = this;
    this.destroy();
    if (curRBox.focused[0]) {
      curRBox.boxes[curRBox.focused[0]].focus();
    }
  },
  focus: function (e) {
    var t = this, cb = (curRBox.active != t.id) || true;
    t._focus();
    if (cb && isFunction(t.options.onFocus)) {
      t.options.onFocus(e);
    }
    return cb;
  },
  close: function () {
    var t = this, pos = t.pos;
    t._close();
    if (isFunction(t.options.onClose)) {
      t.options.onClose(pos);
    }
  }
});

if (!window.curFastChat) {
  curFastChat = {};
}
FastChat = {
  init: function (options) {
    //debugLog('fastchat start');
    extend(curFastChat, {
      tabs: {},
      needPeers: {},
      gotPeers: {},
      needMedia: {},
      gotMedia: {},
      myTypingEvents: {},
      typingEvents: {},
      inited: true,
      options: options,
      posSeq: 0,
      error_timeout: 1
    });
    delete curFastChat.standby;
    delete curFastChat.standbyTO;
    Notifier.addRecvClbk('fastchat', 0, FastChat.lcRecv, true);
    FastChat.lcSend('needSettings', {version: options.version, lang_id: langConfig.id});
    clearTimeout(curFastChat.getSettingsTO);
    curFastChat.getSettingsTO = setTimeout(FastChat.getSettings, 300);
  },
  getSettings: function () {
    var friends = ls.get('fcFriends' + vk.id);
    ajax.post('al_im.php', {
      act: 'a_get_fast_chat',
      friends: friends && friends.version
    }, {
      onDone: function (data) {
        if (data.friends == -1) {
          data.friends_version = friends.version;
          data.friends = friends.list;
        } else {
          ls.set('fcFriends' + vk.id, {version: data.friends_version, list: data.friends});
        }
        FastChat.gotSettings(data);
        FastChat.sendSettings();
      },
      onFail: function () {
        return true;
      }
    });
  },
  gotSettings: function (data) {
    clearTimeout(curFastChat.getSettingsTO);
    window.lang = extend(window.lang || {}, data.lang);
    extend(curFastChat, data, {lang_id: langConfig.id});
    if (curNotifier.is_server) {
      if (!data.im_queue) {
        clearTimeout(curFastChat.lp_error_to);
        curFastChat.lp_error_to = setTimeout(FastChat.updateQueueKeys.bind(FastChat), (curNotifier.error_timeout || 1) * 1000);
      } else if (!curFastChat.lpInited) {
        FastChat.initLp();
      }
    }
    curFastChat.friendsCnt = 0;
    for (var i in (curFastChat.friends || {})) {
      curFastChat.friendsCnt++;
    }
    setTimeout(FastChat.clistCache.pbind(false), 10);
    FastChat.initUI();
  },
  sendSettings: function () {
    clearTimeout(curFastChat.sendSettingsTO);
    var settings = {}, k = ['friends', 'friends_version', 'onlines', 'tpl', 'lang', 'me', 'version', 'im_queue', 'cl_queue'], i;
    for (i in k) {
      if (k[i] != 'cl_queue' && curFastChat[k[i]] === undefined) {
        return;
      }
      settings[k[i]] = curFastChat[k[i]];
    }
    clearTimeout(curFastChat.sendSettingsTO);
    curFastChat.sendSettingsTO = setTimeout(function () {
      FastChat.lcSend('settings', {settings: settings})
    }, curNotifier.is_server ? 0 : irand(50, 100));
  },
  becameServer: function () {
    if (curFastChat.lpInited || !curFastChat.version) {
      return;
    }
    delete curNotifier.addQueues['fastchat' + vk.id];
    delete curNotifier.addQueues['contacts' + vk.id];
    if (!curFastChat.im_queue) {
      clearTimeout(curFastChat.lp_error_to);
      curFastChat.lp_error_to = setTimeout(FastChat.updateQueueKeys.bind(FastChat), (curNotifier.error_timeout || 1) * 1000);
    } else if (!curFastChat.lpInited) {
      FastChat.initLp();
    }
  },
  destroy: function () {
    if (!curFastChat.inited) {
      return false;
    }
    var topLink;
    FastChat.stopLp();
    each(curFastChat.tabs || {}, function (peer, tab) {
      tab.box.destroy();
    });
    curFastChat.clistBox && curFastChat.clistBox.destroy();
    each (curFastChat.el || {}, function () {
      cleanElems(this);
    });
    clearInterval(curFastChat.updateFriendsInt);
    clearInterval(curFastChat.updateTypingsInt);
    clearTimeout(curFastChat.correspondentsTO);
    clearTimeout(curFastChat.lp_error_to);
    curFastChat = {inited: false};
    return true;
  },
  standby: function (version) {
    FastChat.destroy();
    curFastChat.standby = true;
    var to = 1, cb = function () {
      if (!curNotifier.is_server) {
        clearTimeout(curFastChat.standbyTO);
        curFastChat.standbyTO = setTimeout(cb, to * 1000);
        return;
      }
      ajax.post('notifier.php?act=a_get_reload', {version: version}, {
        onDone: function (navVersion, config) {
          FastChat.lcSend('gotConfig', {navVersion: navVersion, config: config});
          FastChat.gotConfig(navVersion, config);
        },
        onFail: function () {
          to *= 2;
          clearTimeout(curFastChat.standbyTO);
          curFastChat.standbyTO = setTimeout(cb, to * 1000);
          return true;
        }
      });
    };
    cb();
  },
  gotConfig: function (navVersion, config) {
    clearTimeout(curFastChat.standbyTO);
    if (!curFastChat.standby) {
      return;
    }
    setTimeout(function () {
      if (navVersion > stVersions['nav']) {
        debugLog('appending al loader');
        headNode.appendChild(ce('script', {
          type: 'text/javascript',
          src: '/js/loader_nav' + navVersion + '_' + vk.lang + '.js'
        }));
      }
      setTimeout(function() {
        if (navVersion <= stVersions['nav']) {
          stManager.add(['notifier.js', 'notifier.css', 'emoji.js'], function () {
            FastChat.init(config);
          })
          return;
        }
        setTimeout(arguments.callee, 100);
      }, 0);
    }, curNotifier.is_server ? 0 : irand(1000, 2000));
  },
  updateVersion: function (version) {
    FastChat.lcSend('standby', {version: version});
    FastChat.standby(version);
  },

  // Local connection: communication between tabs in one browser instanse
  lcSend: function (act, data) {
    // debugLog('fc::lcSend', act, clone(data));
    Notifier.lcSend('fastchat', extend({act: act, __id: curFastChat.me && curFastChat.me.id || vk.id}, data));
  },
  lcRecv: function (data) {
    if (isEmpty(data)) return;
    var act = data.act;
    if (data.__id != (curFastChat.me && curFastChat.me.id || vk.id)) {
      debugLog('drop foreign event', data);
      return;
    }
    delete data.act;
    delete data.__id;
    FastChat.lcFeed(act, data);
  },
  lcFeed: function (act, data) {
    // debugLog('fc::lcFeed', act, data);
    switch (act) {
      case 'needSettings':
        if (curFastChat.version < data.version) {
          // May be update version here
        } else if (data.lang_id == curFastChat.lang_id) {
          FastChat.sendSettings();
        }
        break;

      case 'settings':
        if (!curFastChat.version && curFastChat.options && data.settings.version == curFastChat.options.version) {
          FastChat.gotSettings(data.settings);
        }
        clearTimeout(curFastChat.sendSettingsTO);
        break;

      case 'standby':
        if (!curFastChat.version) break;
        FastChat.standby(data.version);
        break;

      case 'gotConfig':
        FastChat.gotConfig(data.navVersion, data.config);
        break;

      case 'clFeed':
        if (!curFastChat.version) break;
        FastChat.clFeed(data.events);
        break;

      case 'clistOnlines':
        if (!curFastChat.version) break;
        FastChat.clistGotOnlines(data);
        break;

      case 'imFeeds':
        if (!curFastChat.version) break;
        FastChat.imFeeds(data);
        break;

      case 'needPeer':
        if (!curFastChat.version) break;
        var peer = data.id, tab = curFastChat.tabs[peer], i, peerData = false, mem;
        if (tab !== undefined) {
          peerData = {
            name: tab.name,
            photo: tab.photo,
            fname: tab.fname,
            hash: tab.hash,
            sex: tab.sex,
            data: tab.data,
            online: tab.online
          };
          for (i in tab.msgs) {
            peerData.history = [tab.log.innerHTML, tab.msgs];
            break;
          }
        } else if (mem = curFastChat.friends[peer + '_']) {
          peerData = {name: mem[0], photo: mem[1], fname: mem[2], hash: mem[3], data: mem[4], online: curFastChat.onlines[peer]};
        }
        // debugLog(data.id, peer, tab, mem, peerData);
        if (peerData === false) {
          break;
        }
        curFastChat.gotPeers[peer] = setTimeout(function () {
          var response = {};
          response[peer] = peerData;
          FastChat.lcSend('gotPeers', response);
        }, curNotifier.is_server ? 0 : irand(50, 100));

        break;

      case 'fetchingPeers':
        if (!curFastChat.version) break;
        each (data, function (peer, flags) {
          var needPeer = curFastChat.needPeers[peer];
          if (needPeer && (flags & needPeer[0]) == needPeer[0]) {
            clearTimeout(needPeer[2]);
          }
        });
        break;

      case 'gotPeers':
        if (!curFastChat.version) break;
        FastChat.gotPeers(data);
        break;

      case 'stateChange':
        if (!curFastChat.version) break;
        FastChat.onStateChanged(data);
        break;

      case 'queueSet':
        // debugLog('q set', data);
        extend(curFastChat, data);
        break;

      case 'queueClean':
        if (!curNotifier.is_server) {
          // debugLog('q clean');
          delete curFastChat.im_queue;
          delete curFastChat.cl_queue;
        }
        break;

      case 'needMedia':
        var msgId = data.msgId, msgMedia = curFastChat.gotMedia[msgId];
        if (msgMedia === undefined || msgMedia === 0) {
          break;
        }
        curFastChat.gotMedia[msgId][2] = setTimeout(function () {
          FastChat.lcSend('gotMedia', {msgId: msgId, peer: msgMedia[0], text: msgMedia[1]});
        }, curNotifier.is_server ? 0 : irand(50, 100));
        break;

      case 'fetchingMedia':
        // if (!curFastChat.version) break;
        var msgId = data.msgId, msgNeed = curFastChat.needMedia[msgId];
        if (msgNeed === undefined || curFastChat.gotMedia[msgId] === 0) {
          break;
        }
        clearTimeout(msgNeed[1]);
        msgNeed[1] = setTimeout(FastChat.loadMsgMedia.pbind(msgNeed[0], msgId), 1000);
        break;

      case 'gotMedia':
        var msgId = data.msgId, msgMedia = curFastChat.gotMedia[msgId];
        if (isArray(msgMedia)) {
          clearTimeout(msgMedia[2]);
        }
        FastChat.gotMsgMedia(data.peer, msgId, data.text);
        break;
    }
  },

  // Long poll
  initLp: function () {
    curFastChat.lpInited = true;
    FastChat.checkLp();
    curFastChat.checkLpInt = setInterval(FastChat.checkLp, 20000);
  },
  stopLp: function () {
    curFastChat.lpInited = false;
    clearInterval(curFastChat.checkLpInt);
    delete curFastChat.im_queue;
    delete curFastChat.cl_queue;
  },
  checkLp: function () {
    if (!curNotifier.is_server || !curFastChat.im_queue/* || !curFastChat.cl_queue*/) {
      return;
    }
    Notifier.addKey({
      queue: curFastChat.im_queue.id,
      key: curFastChat.im_queue.key,
      ts: curFastChat.im_queue.ts
    }, FastChat.imChecked, true);

    if (curFastChat.cl_queue) {
      Notifier.addKey({
        queue: curFastChat.cl_queue.id,
        key: curFastChat.cl_queue.key,
        ts: curFastChat.cl_queue.ts
      }, FastChat.clChecked, true);
    }
    FastChat.lcSend('queueSet', {
      im_queue: curFastChat.im_queue,
      cl_queue: curFastChat.cl_queue
    });
  },
  updateQueueKeys: function () {
    if (curFastChat.updatingQueues) {
      return;
    }
    curFastChat.updatingQueues = 1;
    FastChat.lcSend('queueClean');
    FastChat.stopLp();
    ajax.post('al_im.php', {act: 'a_get_fc_queue'}, {
      onDone: function (data) {
        if (data.version > curFastChat.version) {
          FastChat.updateVersion(data.version);
          return;
        }
        delete curFastChat.updatingQueues;
        extend(curFastChat, data);
        FastChat.lcSend('queueSet', data);
        if (curNotifier.is_server) {
          FastChat.initLp();
          FastChat.clistUpdate();
        }
      },
      onFail: function () {
        delete curFastChat.updatingQueues;
        FastChat.destroy();
        return true;
      }
    });
  },

  // Checked function (recv long-poll response)
  clChecked: function (queue, response) {
    if (!curFastChat.inited || !curFastChat.ready || !curFastChat.cl_queue) return;
    if (response.failed) {
      clearTimeout(curFastChat.lp_error_to);
      curFastChat.lp_error_to = setTimeout(FastChat.updateQueueKeys.bind(FastChat), (curNotifier.error_timeout || 1) * 1000);
      return;
    }
    if (response.ts) {
      if (response.key) {
        curFastChat.cl_queue.key = response.key;
      }
      curFastChat.cl_queue.ts = response.ts;
      FastChat.lcSend('queueSet', {cl_queue: curFastChat.cl_queue});
    }
    if (!isArray(response.events) || !response.events.length) {
      return;
    }
    FastChat.clFeed(response.events);
    FastChat.lcSend('clFeed', {events: response.events});
  },
  clFeed: function (events) {
    if (!curFastChat.inited || !curFastChat.ready || !curFastChat.tabs) return;
    var clistUpdated = false, failed = false;
    each (events, function () {
      var ev = this.split('<!>'), evVer = ev[0], evType = ev[1], peer = ev[2], onltype = ev[3] ? ev[3] : 1, tab = curFastChat.tabs[peer], wasOnline = curFastChat.onlines[peer];
      if (evVer != curFastChat.version) {
        FastChat.updateVersion(evVer);
        failed = true;
        return false;
      }
      if (!curFastChat.friends[peer + '_'] && !tab) {
        return;
      }

      switch (evType) {
        case 'online':
          if (wasOnline == onltype) break;
          curFastChat.onlines[peer] = onltype;
          FastChat.tabNotify(peer, 'online', onltype);
          clistUpdated = true;
          break;

        case 'offline':
          if (!wasOnline) break;
          delete curFastChat.onlines[peer];
          if (re('fc_contact' + peer) && curFastChat.clistBox.visible) {
            FastChat.clistShowMore();
          }
          FastChat.tabNotify(peer, 'offline');
          break;
      }
    });
    if (failed) {
      return;
    }
    if (clistUpdated &&
        curFastChat.clistBox.visible &&
        curNotifier.idle_manager && !curNotifier.idle_manager.is_idle &&
        (curFastChat.el.clist.scrollTop < 100 || curRBox.active != curFastChat.clistBox.id)) {
      FastChat.clistRender(); // Title is also updated here
    } else {
      FastChat.clistUpdateTitle();
    }
  },
  imChecked: function (queue, response) {
    if (!curFastChat.inited || !curFastChat.ready || !curFastChat.im_queue) return;
    if (response.failed) {
      clearTimeout(curFastChat.lp_error_to);
      curFastChat.lp_error_to = setTimeout(FastChat.updateQueueKeys.bind(FastChat), (curNotifier.error_timeout || 1) * 1000);
      return;
    }
    if (response.ts && curFastChat.im_queue) {
      if (response.key) {
        curFastChat.im_queue.key = response.key;
      }
      curFastChat.im_queue.ts = response.ts;
      FastChat.lcSend('queueSet', {im_queue: curFastChat.im_queue});
    }
    if (!isArray(response.events) || !response.events.length) {
      return;
    }
    var feeds = {}, failed = false;
    each (response.events, function () {
      var ev = this.split('<!>'),
          evVer = ev[0],
          evType = ev[1],
          peer = ev[2],
          flags = 0,
          tab = curFastChat.tabs[peer];

      if (evVer != curFastChat.version) {
        FastChat.updateVersion(evVer);
        failed = true;
        return false;
      }

      switch (evType) {
        case 'read':
          break;

        case 'typing':
          flags = 1;
          break;

        case 'new':
          flags = (ev[4] & 2) ? 0 : 2;
          break;

        default: return;
      }

      if (!feeds[peer]) {
        feeds[peer] = [0];
      }
      feeds[peer][0] |= flags;
      feeds[peer].push(ev);
    });
    if (failed || isEmpty(feeds)) {
      return;
    }
    FastChat.lcSend('imFeeds', feeds);
    FastChat.imFeeds(feeds);
  },
  imFeeds: function (feeds) {
    if (!curFastChat.inited || !curFastChat.ready) return;
    // debugLog('imFeeds', feeds);
    each (feeds, function (peer, events) {
      var flags = events.shift();
      if (curFastChat.tabs[peer]) {
        FastChat.imFeed(peer, events);
      } else if (curFastChat.clistBox.visible && (flags & 2)) {
        FastChat.addPeer(peer, events);
      }
    });
  },
  imFeed: function (peer, events) {
    var tab = curFastChat.tabs[peer],
        ts = vkNow();
    if (!tab) return false;
    each (events, function (k, ev) {
      switch (ev[1]) {
        case 'new':
          each (tab.sentmsgs, function (k, msgId) {
            var row = ge('fc_msg' + msgId), parent = row && row.parentNode;
            if (re(row) && parent && !parent.childNodes.length) {
              re(parent.parentNode);
            }
          });
          if (!ge('fc_msg' + ev[3])) {
            stManager.add(['im.js'], function() {
              ev[5] = Emoji.emojiToHTML(ev[5], true);
              FastChat.addMsg(FastChat.prepareMsgData(ev.slice(2)));
            });
            tab.msgs[ev[3]] = [ev[4] & 2 ? 1 : 0, ev[4] & 1];
            if ((ev[4] & 3) === 1) tab.unread++;
            FastChat.scroll(peer);
          }
          FastChat.blinkTab(peer);
          break;

        case 'read':
          each(ev[3].split(','), function (k, msgId) {
            var row = ge('fc_msg' + msgId), parent = row && row.parentNode;
            // debugLog('feed read', row, clone(tab.msgs[msgId]), parent, hasClass(parent.parentNode, 'fc_msgs_unread'));
            if (!row) return;
            if (tab.msgs[msgId] && tab.msgs[msgId][1]) {
              tab.msgs[msgId][1] = 0;
              if (!tab.msgs[msgId][0]) {
                tab.unread--;
              }
            }
            removeClass(row, 'fc_msg_unread');
            if (hasClass(parent.parentNode, 'fc_msgs_unread')) {
              each (parent.childNodes, function () {
                if (!hasClass(this, 'fc_msg_unread')) {
                  removeClass(parent.parentNode, 'fc_msgs_unread');
                  return false;
                }
              });
            }
          });
          break;

        case 'typing':
          if (peer > 2e9) {
            if (!curFastChat.typingEvents[peer]) {
              curFastChat.typingEvents[peer] = {};
            }
            curFastChat.typingEvents[peer][ev[3]] = ts;
          } else {
            curFastChat.typingEvents[peer] = ts;
          }
          FastChat.updateTyping(peer);
          break;
      }
    });
    if (tab.unread > 0) {
      tab.unread = 0;
      each (tab.msgs, function () {
        if (!this[0] && this[1]) tab.unread++;
      });
    }
    if (tab.auto && !tab.unread) {
      tab.box._close();
      delete curFastChat.tabs[peer];
    }
    FastChat.updateUnreadTab(peer);
  },
  tabNotify: function(peer, evType, evData) {
    var tab = curFastChat.tabs[peer];
    if (peer > 0 && peer < 2e9 && isFunction(cur.onPeerStatusChanged)) {
      cur.onPeerStatusChanged(peer, evType, evData);
    }
    if (peer <= 0 || !tab || !tab.box || tab.box.minimized) return;
    var addClassTo = geByClass1('fc_tab', tab.wrap, 'div'), mob = (evData != 1), cls = mob ? 'fc_tab_mobile' : 'fc_tab_online';
    if (evType == 'online') {
      addClassTo.className = addClassTo.className.replace(mob ? 'fc_tab_online' : 'fc_tab_mobile', cls);
      if (hasClass(addClassTo, cls)) return;
    }

    clearTimeout(tab.hideNotifyTO);
    switch (evType) {
      case 'online':
        text = langSex(tab.sex, lang.mail_im_user_became_online);
        FastChat.blinkTab(peer);
        addClass(addClassTo, cls);
        break;

      case 'offline':
        text = langSex(tab.sex, lang.mail_im_user_became_offline);
        FastChat.blinkTab(peer);
        removeClass(addClassTo, 'fc_tab_online');
        removeClass(addClassTo, 'fc_tab_mobile');
        break;

      case 'unavail':
        text = langSex(tab.sex, lang.mail_im_user_unavail);
        break;
    }
    text = text.replace('{user}', tab.fname);
    val(tab.notify, '<div class="fc_tab_notify fc_tab_notify_' + evType + '">' + text + '</div>');
    // debugLog('<div class="fc_tab_notify fc_tab_notify_' + evType + '">' + text + '</div>');
    var notify = tab.notify.firstChild;
    setStyle(notify, {width: tab.logWrap.clientWidth - 8/*, zIndex: 400*/});
    // debugLog(notify, tab.log.clientWidth - 8);
    clearTimeout(tab.hideNotifyTO);
    tab.hideNotifyTO = setTimeout(function () {
      fadeOut(notify, 200, function () {
        val(tab.notify, '');
      });
    }, 5000);
    // debugLog('tab notify', peer, evType);
  },

  initUI: function () {
    var el = curFastChat.el = {},
        wndInner = getWndInner();
    re('rb_box_fc_clist');
    el.clistWrap = se(curFastChat.tpl.clist);
    el.clist = geByClass1('fc_contacts', el.clistWrap, 'div');
    el.clistTitle = geByClass1('fc_tab_title', el.clistWrap, 'div');
    el.clistOnline = geByClass1('fc_clist_online', el.clistWrap, 'div');

    var state = curFastChat.options.state || false,
        clistMin = !curFastChat.friendsCnt || (!(state && state.clist.min !== undefined) ? wndInner[1] < 1200 || curFastChat.friendsCnt < 5 : state.clist.min),
        opts = {
      id: 'fc_clist',
      movable: geByClass1('fc_tab_head', el.clistWrap),
      hider: geByClass1('fc_tab_close_wrap', el.clistWrap, 'a'),
      startHeight: Math.max(300, Math.min(2000, wndInner[0] * 0.5)),
      startWidth: 220,
      resizeableH: el.clist,
      resize: false,
      minH: 200,
      onHide: function () {
        FastChat.stateChange({op: 'clist_toggled', val: 0});
        show(el.topLink)
      },
      onDragEnd: function (y, x) {
        FastChat.stateChange({op: 'clist_moved', y: y, x: x});
      },
      onResize: function (h, w) {
        curFastChat.clistBoxScroll && curFastChat.clistBoxScroll.update(false, true);
      }
    };
    if (state) {
      if (state.clist.x !== false) {
        if (state.clist.x == -1) {
          opts.startRight = 0;
        } else {
          opts.startLeft = wndInner[1] * state.clist.x;
        }
      }
      if (state.clist.y !== false) {
        if (state.clist.y == -1) {
          opts.startBottom = 0;
        } else {
          opts.startTop = wndInner[0] * state.clist.y;
        }
      }
    }
    if (clistMin) {
      opts.noshow = true;
    }
    if (opts.startTop === undefined && opts.startBottom === undefined) {
      opts.startTop = wndInner[0] < 800 ? 0 : wndInner[0] * 0.10;
    }
    if (opts.startLeft === undefined && opts.startRight === undefined) {
      opts.startRight = 0;
    }
    curFastChat.clistBox = new RBox(el.clistWrap, opts);
    if (!opts.noshow && (opts.startLeft !== undefined || opts.startTop !== undefined)) {
      curFastChat.clistBox._wnd_resize(wndInner[0], wndInner[1], true);
    }
    // debugLog('cList done');

    // Top link
    // re('top_fc_link');
    // var topTable = ge('top_links'), topBackLink = geByClass1('top_back_link_td', topTable), topTd;
    // if (topBackLink) {
    //   topBackLink.parentNode.insertBefore(topTd = ce('td', {innerHTML: '<nobr><a class="top_nav_link" id="top_fc_link" href="/im?sel=0" onmousedown="event.cancelBubble = true;"></a></nobr>'}), topBackLink.nextSibling);
    //   el.topLink = ge('top_fc_link');
    //   addEvent(el.topLink, 'click', function (e) {
    //     if (checkEvent(e)) return;
    //     FastChat.clistShow();
    //     return false;
    //   });
    //   if (!clistMin) {
    //     hide(el.topLink);
    //   }
    // }

    // Friends list
    curFastChat.clistBoxScroll = new Scrollbar(el.clist, {
      prefix: 'fc_',
      more: FastChat.clistShowMore,
      nomargin: true,
      global: true,
      nokeys: true,
      right: vk.rtl ? 'auto' : 10,
      left: !vk.rtl ? 'auto' : 10
    });
    curFastChat.updateFriendsInt = setInterval(FastChat.clistUpdate, 3 * 60000);
    curFastChat.updateTypingsInt = setInterval(FastChat.updateTypings, 5000);

    // Add tabs
    if (state && state.tabs) {
      each (state.tabs, function (peer) {
        peer = intval(peer);
        var opts = {nofocus: 1};
        if (this.min) {
          opts.minimized = true;
        }
        if (this.h) {
          opts.startHeight = this.h * wndInner[0];
        }
        if (this.w) {
          opts.startWidth = this.w * wndInner[1];
        }
        if (this.x !== undefined && this.x <= 1) {
          if (this.x < 0) {
            opts.startRight = 0;
          } else {
            opts.startLeft = wndInner[1] * this.x;
          }
        }
        if (this.y !== undefined && this.y <= 1) {
          if (this.y < 0) {
            opts.startBottom = 0;
          } else {
            opts.startTop = wndInner[0] * this.y;
          }
        }
        FastChat.addPeer(peer, false, false, opts);
      });
    }

    var filter = ge('fc_clist_filter');
    placeholderSetup(filter, {global: true, back: 1});
    curFastChat.q = '';
    addEvent(filter, 'keyup ' + (browser.opera ? 'keypress' : 'keydown'), function (e) {
      var control = FastChat.clistFilterKey(e);
      if (control !== undefined) {
        return control;
      }
      curFastChat.q = trim(val(this));
      FastChat.clistRender();
    });

    if (el.clistOnline) {
      var lShift, probe;
      bodyNode.appendChild(probe = ce('nobr', {className: 'fl_l', innerHTML: getLang('mail_im_clist_onlines')}, {visibility: 'hidden', position: 'absolute'}));
      lShift = (probe.offsetWidth || 179) - 7;
      re(probe);
      addEvent(el.clistOnline, 'mouseover', function (e) {
        showTooltip(this, {text: getLang('mail_im_clist_onlines'), forcetoup: 1, shift: [lShift, 7, 3], className: 'tt_fc_onlines', init: function () {
          if (browser.msie) el.clistOnline.tt.isFixed = false;
        }});
      });
      addEvent(el.clistOnline, 'click', function (e) {
        (e.originalEvent || e).cancelBubble = true;
        FastChat.clistToggleOnlines();
        FastChat.clistRender();
      });
      if (state && state.clist && state.clist.onlines) {
        FastChat.clistToggleOnlines(true);
      }
    }

    if (!clistMin) {
      FastChat.clistRender();
    } else {
      FastChat.clistUpdateTitle();
    }
    curFastChat.ready = true;
    //debugLog('UI inited');
  },


  stateChange: function (data) {
    ajax.post('al_im.php', extend({act: 'a_state_fc', hash: curFastChat.options.state_hash || ''}, data), {
      onFail: function () {return true;}
    });
    FastChat.lcSend('stateChange', data);
  },
  onStateChanged: function (data) {
    var tab = data.peer ? curFastChat.tabs[data.peer] : false,
        box = data.peer ? (tab && tab.box) : curFastChat.clistBox,
        wndInner = getWndInner();
    switch (data.op) {
      case 'added':
        if (tab) {
          delete tab.auto
          break;
        }
        FastChat.addPeer(data.peer);
        break;

      case 'closed':
        if (!tab || !box) break;
        box.close();
        break;

      case 'minimized':
        if (!tab || !box) break;
        if (data.val) {
          box.unminimize();
        } else {
          box.minimize();
        }
        break;

      case 'moved':
        setStyle(box.wrap, {
          bottom: data.y == -1 ? 0 : 'auto',
          top: data.y != -1 ? intval(wndInner[0]  * data.y) : 'auto',
          right: data.x == -1 ? 0 : 'auto',
          left: data.x != -1 ? intval(wndInner[1] * data.x) : 'auto'
        });
        box.toBottom = data.y == -1;
        box.toRight = data.x == -1;
        break;

      case 'resized':
        setStyle(box.wrap, {
          bottom: data.y == -1 ? 0 : 'auto',
          top: data.y != -1 ? intval(wndInner[0]  * data.y) : 'auto',
          right: data.x == -1 ? 0 : 'auto',
          left: data.x != -1 ? intval(wndInner[1] * data.x) : 'auto'
        });
        box.toBottom = data.y == -1;
        box.toRight = data.x == -1;

        var w = intval(wndInner[1]  * data.w);
        setStyle(box.resizeableH, 'height', intval(wndInner[0]  * data.h));
        setStyle(box.resizeableW, 'width', w);
        FastChat.fixResized(tab, w);
        break;

      case 'clist_toggled':
        if (data.val) {
          box.show(0, true);
        } else {
          box.hide(0, true);
        }
        toggle(curFastChat.el.topLink, !data.val);
        break;

      case 'clist_moved':
        setStyle(box.wrap, {
          bottom: data.y == -1 ? 0 : 'auto',
          top: data.y != -1 ? intval(wndInner[0]  * data.y) : 'auto',
          right: data.x == -1 ? 0 : 'auto',
          left: data.x != -1 ? intval(wndInner[1] * data.x) : 'auto'
        });
        box.toBottom = data.y == -1;
        box.toRight = data.x == -1;
        break;

      case 'onlines_toggled':
        FastChat.clistToggleOnlines(data.val);
        FastChat.clistRender();
    }
  },

  onUnidle: function () {
    if (!curNotifier.version || !curFastChat.clistBox) {
      return;
    }
    if (curFastChat.clistBox.visible &&
        (curFastChat.el.clist.scrollTop < 100 || curRBox.active != curFastChat.clistBox.id)) {
      FastChat.clistRender(); // Title is also updated here
    } else {
      FastChat.clistUpdateTitle();
    }
    each (curFastChat.tabs, function (peer) {
      FastChat.restoreDraft(peer);
    });
  },
  clistUpdate: function () {
    var ts = vkNow();
    if (!curNotifier.is_server || (curFastChat.clistUpdatedTs && ts - curFastChat.clistUpdatedTs < 60000)) {
      return;
    }
    curFastChat.clistUpdatedTs = ts;
    var tabs = [], mid;
    for (mid in curFastChat.tabs) {
      tabs.push(mid);
    }
    ajax.post('al_im.php', {act: 'a_onlines', peer: tabs.join(',')}, {
      onDone: function (onlines) {
        FastChat.clistGotOnlines(onlines);
        FastChat.lcSend('clistOnlines', onlines);
      }
    });
  },
  clistGotOnlines: function (onlines) {
    var prev = curFastChat.onlines, offlines = [];
    curFastChat.onlines = onlines;
    if (curNotifier.idle_manager && curNotifier.idle_manager.is_idle) {
      return;
    }
    each (curFastChat.tabs, function (peer) {
      if (curFastChat.onlines[peer] != prev[peer]) {
        FastChat.tabNotify(peer, onlines[peer] ? 'online' : 'offline', onlines[peer]);
        if (!onlines[peer]) offlines[peer] = 1;
      }
    });
    offlines = arrayKeyDiff(prev, onlines, offlines);
    each(offlines, function (peer) {
      FastChat.tabNotify(peer, 'offline');
    });
    FastChat.clistRender();
  },

  clistShow: function () {
    FastChat.clistRender();
    if (!curFastChat.clistBox.visible) {
      curFastChat.clistBox.show();
      curFastChat.clistBoxScroll && curFastChat.clistBoxScroll.update(false, true);
      curFastChat.el.topLink && hide(curFastChat.el.topLink);
    } else {
      curFastChat.clistBox.focus();
    }
    elfocus('fc_clist_filter');
    FastChat.stateChange({op: 'clist_toggled', val: 1});
  },
  clistHide: function () {
    curFastChat.clistBox.hide();
  },

  clistRender: function (more) {
    var html = [], offsetReached = !more,
        limit = 1 + (more ? 40 : 20),
        q = curFastChat.q,
        queries,
        filterList = false,
        lastMid = false,
        re = false,
        offline = false;

    if (q) {
      re = [];
      each(FastChat.clistCache(q), function () {
        re.push(escapeRE(this));
      });
      re = new RegExp("([ \-]|^|\s|&nbsp;|\b)(" + re.join('|') + ")", "gi"); // no lookbhind in JS
      filterList = curFastChat.clistCache[q] || {};
    } else if (curFastChat.clOnlines) {
      filterList = curFastChat.onlines;
    }
    curFastChat.clHasMore = false;
    each (curFastChat.friends, function (k) {
      var mid = intval(k), matches = !filterList || filterList[mid],
          unread = curFastChat.tabs[mid] ? curFastChat.tabs[mid].unread : 0;

      if (!offsetReached) {
        if (mid == curFastChat.clOffset) {
          offsetReached = true;
        }
        return;
      }
      if (!matches) {
        return;
      }
      if (!(--limit)) {
        curFastChat.clHasMore = true;
        return false
      }
      html.push(FastChat.clistWrapPeer(mid, this, re));
      lastMid = mid;
    });
    if (lastMid === false && !more && !q) { // Nobody is online
      html.push('<div class="fc_clist_empty">' + getLang(q ? 'mail_im_clist_notfound' : 'mail_im_clist_empty') + '</div>');
    } else if (q && !curFastChat.clHasMore) {
      html.push(FastChat.getCorrespondents(q, re, lastMid === false));
    }
    curFastChat.clOffset = lastMid;
    if (more) {
      var div = ce('div', {innerHTML: html.join('')}), frag = document.createDocumentFragment();
      while (div.firstChild) {
        frag.appendChild(div.firstChild);
      }
      curFastChat.el.clist.appendChild(frag);
      if (!curFastChat.clHasMore) {
        FastChat.clistUpdateTitle(true);
      }
    } else {
      val(curFastChat.el.clist, html.join(''));
      FastChat.clistUpdateTitle(true);
      if (browser.chrome || browser.safari) { // Webkit bug fix
        setTimeout(function () {
          setStyle(curFastChat.el.clist.firstChild, {width: curFastChat.el.clist.firstChild.clientWidth});
          setTimeout(function () {
            setStyle(curFastChat.el.clist.firstChild, {width: ''});
          }, 0);
        }, 0);
      }
    }
    if (curFastChat.clSel) {
      var el = ge('fc_contact' + curFastChat.clSel);
      if (el) {
        FastChat.clistPeerOver(el, 1);
      } else {
        curFastChat.clSel = false;
      }
    }
    if (curFastChat.clistBoxScroll) {
      curFastChat.clistBoxScroll.update();
    }
    // debugLog('render cl', curFastChat.clHasMore, curFastChat.clOffset);
  },
  clistWrapPeer: function (id, data, re) {
    var unread = curFastChat.tabs[id] ? curFastChat.tabs[id].unread : 0,
        online = curFastChat.onlines[id],
        href, photoEvents, cls = online ? (online != 1 ? ' fc_contact_mobile' : ' fc_contact_online') : '';
    var name = (data[0] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    if (re) {
      name = name.replace(re, '$1<em class="fc_clist_hl">$2</em>');
    }
    if (id > 0 && id < 2e9) {
      href = '/id' + id;
      photoEvents = 'onmousemove="FastChat.clistPeerOver(this.parentNode, 2);"  onmouseout="FastChat.clistPeerOver(this.parentNode, 1);" onclick="event.cancelBubble = true; return nav.go(this.parentNode, event);"';
    } else {
      href = '/im?sel=' + id;
      photoEvents = '';
    }
    return '<a href="' + href + '" class="fc_contact clear_fix' + cls + '" id="fc_contact' + id + '" onclick="return FastChat.selectPeer(' + id + ', event);" onmousedown="event.cancelBubble = true;" onmouseover="FastChat.clistPeerOver(this, 1, event);"  onmouseout="FastChat.clistPeerOver(this, 0, event);"><span class="fc_contact_photo fl_l" ' + photoEvents + '><img src="' + Notifier.fixPhoto(data[1]) + '" class="fc_contact_photo"/></span><span class="fc_contact_name fl_l">' + name + '<span id="fc_contact_unread' + id + '" class="fc_contact_unread">' + (unread ?' <b>+' + unread + '</b>' : '') + '</span></span><span class="fc_contact_status fl_l"></span></a>';
  },
  clistPeerOver: function (el, state, e) {
    if (!el || !checkOver(e, el)) return;
    var id = el.id.substr(10);
    if (curFastChat.clSel && state && curFastChat.clSel != id) {
      FastChat.clistPeerOver(ge('fc_contact' + curFastChat.clSel), 0);
    }
    toggleClass(el, 'fc_contact_over', state);
    toggleClass(el, 'fc_contact_profile', state == 2 && id < 2e9 && id > 0);
    if (state) {
      curFastChat.clSel = id;
      if (el.parentNode && (state == 1 && !e || !browser.msie && !browser.opera)) {
        var wrap = el.parentNode,
            h = wrap.clientHeight,
            sh = wrap.scrollHeight,
            st = wrap.scrollTop,
            ot = el.offsetTop - 61,
            oh = el.offsetHeight,
            newSt = false;

        if (ot < st) {
          newSt = ot;
        } else if (ot + oh > st + h) {
          newSt = ot + oh - h;
        }
        if (newSt !== false) {
          if (curFastChat.clistBoxScroll) {
            curFastChat.clistBoxScroll.scrollTop(newSt);
          } else {
            wrap.scrollTop = newSt;
          }
        }
      }
    } else if (curFastChat.clSel == id) {
      curFastChat.clSel = false;
    }
  },

  getCorrespondents: function (q, re, empty) {
    clearTimeout(curFastChat.correspondentsTO);
    if (curFastChat.correspondents && curFastChat.correspondents[q] !== undefined) {
      return FastChat.wrapCorrespondents(curFastChat.correspondents[q]) || (empty && '<div class="fc_clist_empty">' + getLang('mail_im_clist_notfound') + '</div>') || '';
    }
    curFastChat.correspondentsTO = setTimeout(FastChat.loadCorrespondents.pbind(q, re), 100);
    return '<div id="fc_correspondents"></div>';
  },
  loadCorrespondents: function (q, re) {
    if (q != curFastChat.q) {return;}
    ajax.post('hints.php', {act: 'a_json_friends', str: q, from: 'fc'}, {
      onDone: function (peers) {
        if (!curFastChat.correspondents) curFastChat.correspondents = {};
        var correspondents = {}, k;
        each (peers, function () {
          k = this[3] + '_';
          if (curFastChat.friends[k]) return;
          correspondents[k] = [this[1], this[2], this[3]];
        });
        curFastChat.correspondents[q] = correspondents;
        if (q != curFastChat.q) {return;}

        var el = ge('fc_correspondents');
        if (!el) {return;}
        var wrap = el.parentNode,
            div = ce('div', {innerHTML: FastChat.wrapCorrespondents(correspondents, re)}),
            frag = document.createDocumentFragment();
        if (div.firstChild) {
          while (div.firstChild) {
            frag.appendChild(div.firstChild);
          }
        } else if (wrap.firstChild == el) {
          frag.appendChild(ce('div', {className: 'fc_clist_empty', innerHTML: getLang('mail_im_clist_notfound')}));
        }
        wrap.replaceChild(frag, el);
        FastChat.clistUpdateTitle(true);
        if (curFastChat.clistBoxScroll) {
          curFastChat.clistBoxScroll.update();
        }
      }
    })
  },
  wrapCorrespondents: function (correspondents, re) {
    var html = [], mid;
    each(correspondents, function (id) {
      html.push(FastChat.clistWrapPeer(intval(id), this, re));
    });
    return html.join('');
  },

  parseLatKeys: function (text) {
    var outtext = text, i;
        lat = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`",
        rus = "éöóêåíãøùçõúôûâàïðîëäæýÿ÷ñìèòüáþ.¸";
    for (i = 0; i < lat.length; i++) {
      outtext = outtext.split(lat.charAt(i)).join(rus.charAt(i));
    }
    return (outtext == text) ? false : outtext;
  },
  parseCyr: function (text) {
    var outtext = text, i,
        lat1 = ['yo','zh','kh','ts','ch','sch','shch','sh','eh','yu','ya','YO','ZH','KH','TS','CH','SCH','SHCH','SH','EH','YU','YA',"'"],
        rus1 = ['¸', 'æ', 'õ', 'ö', '÷', 'ù',  'ù',   'ø', 'ý', 'þ', 'ÿ', '¨', 'Æ', 'Õ', 'Ö', '×', 'Ù',  'Ù',   'Ø', 'Ý', 'Þ', 'ß', 'ü'],
        lat2 = 'abvgdezijklmnoprstufhcyABVGDEZIJKLMNOPRSTUFHCY¸¨',
        rus2 = 'àáâãäåçèéêëìíîïðñòóôõöûÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÛåÅ';
    for (i = 0; i < rus1.length; i++) {
      outtext = outtext.split(rus1[i]).join(lat1[i]);
    }
    for (i = 0; i < rus2.length; i++) {
      outtext = outtext.split(rus2.charAt(i)).join(lat2.charAt(i));
    }
    return (outtext == text) ? false : outtext;
  },

  clistCache: function(q) {
    if (q) {
      var queries = [q], query, t, i, j, cached, name, re, fr, cache;
      if (t = parseLatin(q)) {
        queries.push(t);
      }
      if (t = FastChat.parseLatKeys(q)) {
        queries.push(t);
      }
      if (t = FastChat.parseCyr(q)) {
        queries.push(t);
      }
      if (curFastChat.clistCache[q] !== undefined) {
        return queries;
      }
      cache = curFastChat.clistCache[q] = {};
      for (i in queries) {
        query = queries[i];
        if (cached = curFastChat.clistCache[' ' + query.charAt(0).toLowerCase()]) {
          re = new RegExp('(^|\\s|\\()' + escapeRE(query), 'gi');
          for (j in cached) {
            fr = curFastChat.friends[j + '_'];
            if (!isArray(fr)) {
              continue;
            }
            if (fr[0].match(re) !== null) {
              cache[j] = 1;
            }
          }
        }
      }
      j = 0;
      for (i in cache) {
        j++;
      }
      cache._num = j;
      return queries;
    }

    var name, cursor, letter;
    curFastChat.clistCache = {};
    for (i in curFastChat.friends) {
      name = curFastChat.friends[i][0];
      i = intval(i);
      cursor = 0;
      while (1) {
        letter = ' ' + name.charAt(cursor).toLowerCase();
        if (!curFastChat.clistCache[letter]) {
          curFastChat.clistCache[letter] = {};
        }
        curFastChat.clistCache[letter][i] = 1;
        cursor = name.indexOf(' ', cursor + 1);
        if (cursor == -1) break;
        ++cursor;
      }
    }
  },

  clistShowMore: function () {
    if (!curFastChat.clHasMore) {
      return;
    }
    var clist = curFastChat.el.clist,
        st = clist.scrollTop,
        h = clist.clientHeight,
        sh = clist.scrollHeight;

    if (st + h * 3 > sh) {
      FastChat.clistRender(true);
    }
  },

  clistUpdateTitle: function (rendered) {
    var cnt = 0, cnt1 = 0, i;
    for (i in curFastChat.friends) {
      if (curFastChat.onlines[intval(i)]) {
        cnt1++;
        cnt++
      } else if (!curFastChat.clOnlines) {
        cnt++;
      }
    }
    newVal = (cnt1 ? getLang('mail_im_X_onlines_title', cnt1) : getLang('mail_im_onlines_title')).toString();

    if (isFunction(cur.onChatFriendsUpdated)) {
      cur.onChatFriendsUpdated(cnt1);
    }

    val(curFastChat.el.clistTitle, newVal);
    val(curFastChat.el.topLink, newVal.toLowerCase());

    if (curFastChat.clistBoxScroll) {
      if (!curFastChat.clHasMore && rendered) {
        // cnt = geByClass('fc_contact', curFastChat.el.clist, 'a').length;
        cnt = curFastChat.el.clist.childNodes.length;
      } else if (curFastChat.q) {
        cnt = intval((curFastChat.clistCache[curFastChat.q] || {})._num);
      }
      curFastChat.clistBoxScroll.options.contHeight = cnt * 38 + (cnt > 0 ? 8 : 0);
    }
  },
  clistToggleOnlines: function (online) {
    if (online === undefined) {
      online = !curFastChat.clOnlines;
      FastChat.stateChange({op: 'onlines_toggled', val: online ? 1 : 0});
    }
    toggleClass(curFastChat.el.clistOnline, 'fc_clist_online_active', online);
    curFastChat.clOnlines = online;
  },
  clistFilterKey: function (e) {
    var el;
    switch (e.keyCode) {
      case KEY.DOWN:
      case KEY.UP:
        if (e.type != 'keyup') {
          if (el = curFastChat.clSel && ge('fc_contact' + curFastChat.clSel)) {
            var nextKey = e.keyCode == KEY.DOWN ? 'nextSibling' : 'previousSibling', nextEl = el;
            do {
              nextEl = nextEl[nextKey];
            } while (nextEl && (nextEl.nodeType != 1 || !hasClass(nextEl, 'fc_contact')));
          } else if (!curFastChat.clSel && e.keyCode == KEY.DOWN) {
            nextEl = geByClass1('fc_contact', curFastChat.el.clist, 'a');
          }
          if (nextEl && nextEl != el) {
            FastChat.clistPeerOver(nextEl, 1);
          }
        }
        break;

      case KEY.LEFT:
      case KEY.RIGHT:
        return true;

      case KEY.ENTER:
        if (e.type != 'keyup' && (el = curFastChat.clSel && ge('fc_contact' + curFastChat.clSel))) {
          if (e.ctrlKey || e.metaKey && browser.mac) {
            nav.go(el.href.match(/\b(vkontakte\.ru|vk\.com)(\/[^\/]+?)$/)[2]);
          } else {
            FastChat.selectPeer(curFastChat.clSel);
          }
          // fall through
        } else {
          break;
        }

      case KEY.ESC:
        if (e.type != 'keyup') {
          var filter = ge('fc_clist_filter'), prevVal = val(filter) || curFastChat.clSel;
          filter.blur();
          val(filter, curFastChat.q = '');
          curFastChat.clSel = false;
          if (prevVal) {
            FastChat.clistRender();
          }
        }
        break;

      default: return;
    }
    return cancelEvent(e);
  },

  selectPeer: function(peer, event, opts) {
    if (checkEvent(event)) {
      return true;
    }
    if (curFastChat.tabs && curFastChat.tabs[peer]) {
      var box = curFastChat.tabs[peer].box;
      if (box.minimized) {
        box.unminimize(true);
      }
      FastChat.activateTab(peer);
    } else {
      FastChat.addPeer(peer, false, true, opts);
    }
    if (event) {
      val('fc_clist_filter', curFastChat.q = '');
      FastChat.clistRender();
    }
    return false;
  },
  addPeer: function (peer, events, force, opts) {
    var mem = curFastChat.friends && curFastChat.friends[peer+'_'], need = 0;
    if (force) {
      FastChat.stateChange({op: 'added', peer: peer});
    } else if (curNotifier.idle_manager && !curNotifier.idle_manager.is_idle && events) {
      force = true;
    }
    if (mem) {
      FastChat.addTab(peer, {name: mem[0], photo: mem[1], fname: mem[2], hash: mem[3], online: curFastChat.onlines[peer], sex: mem[4]}, opts);
      if (events) {
        curFastChat.tabs[peer].auto = 1;
        FastChat.imFeed(peer, events);
      } else {
        if (!opts || !opts.nofocus) {
          FastChat.activateTab(peer);
        }
        if (!curFastChat.onlines[peer]) {
          FastChat.tabNotify(peer, 'unavail');
        }
        need |= 2;
      }
    } else {
      need = 3;
    }
    if (need) {
      if (force) {
        curFastChat.needPeers[peer] = [need, events, false, opts];
        FastChat.getPeers();
      } else {
        curFastChat.needPeers[peer] = [need, events, setTimeout(FastChat.getPeers, irand(150, 200)), opts];
        FastChat.lcSend('needPeer', {id: peer, mask: need});
      }
    }
  },
  getPeers: function () {
    var q = [], peers = {};
    each (curFastChat.needPeers, function (peer) {
      q.push(peer);
      q.push(this[0]);
      clearTimeout(this[2]);
      peers[peer] = this[0];
    });
    if (!q.length) {
      return;
    }
    debugLog('requesting peers', q);
    FastChat.lcSend('fetchingPeers', peers);
    ajax.post('al_im.php', {act: 'a_get_fc_peers', peers: q.join(',')}, {
      onDone: function (data) {
        FastChat.gotPeers(data);
        FastChat.lcSend('gotPeers', data);
      }
    });
  },
  gotPeers: function (data) {
    each (curFastChat.needPeers, function (peer) {
      if (data[peer]) {
        var events = this[1], opts = this[3];
        if (!(this[0] & 2) || data[peer].history !== undefined) {
          clearTimeout(this[2]);
          delete curFastChat.needPeers[peer];
        }
        if (!curFastChat.tabs[peer]) {
          FastChat.addTab(peer, data[peer], opts);
          if (events) {
            curFastChat.tabs[peer].auto = 1;
            FastChat.imFeed(peer, events);
          } else {
            if (this[0] & 2) {
              FastChat.gotHistory(peer, data[peer].history);
            }
            if (!opts || !opts.nofocus) {
              FastChat.activateTab(peer);
            }
          }
        } else {
          FastChat.gotHistory(peer, data[peer].history);
        }
      }
    });
  },
  gotHistory: function (peer, hist) {
    if (!isArray(hist) || !hist.length || !hist[0]) {
      return;
    }
    var tab = curFastChat.tabs[peer], log = hist[0], msgs = hist[1];
    extend(tab.msgs, msgs);
    each(msgs, function (k, v) {
      if (!v[0] && v[1]) {
        tab.unread++;
      }
    });
    val(tab.log, log);
    // FastChat.readLastMsgs(peer);
    tab.logWrap.scrollTop = tab.logWrap.scrollHeight;
    setTimeout(function () {
      tab.logWrap.scrollTop = tab.logWrap.scrollHeight;
      tab.scroll && tab.scroll.update(false, true);
    }, 10);
  },
  decHashCb: function(hash) {
    (function(_){curFastChat.decodedHashes[_]=(function(__){var ___=ge?'':'___';for(____=0;____<__.length;++____)___+=__.charAt(__.length-____-1);return geByClass?___:'___';})(_.substr(_.length-5)+_.substr(4,_.length-12));})(hash);
  },
  decodehash: function(hash) {
    if (!curFastChat.decodedHashes)
      curFastChat.decodedHashes = {};
    if (!curFastChat.decodedHashes[hash]) {
      FastChat.decHashCb(hash);
    }
    return curFastChat.decodedHashes[hash];
  },
  onMyTyping: function (peer) {
    peer = intval(peer);
    var tab = curFastChat.tabs[peer];
    if (peer <= 0 || !tab) return;
    var ts = vkNow();
    if (curFastChat.myTypingEvents[peer] && ts - curFastChat.myTypingEvents[peer] < 5000) {
      return;
    }
    curFastChat.myTypingEvents[peer] = ts;
    ajax.post('al_im.php', {act: 'a_typing', peer: peer, hash: tab.sendhash, from: 'fc'});
  },
  updateTypings: function () {
    each(curFastChat.tabs, function (peer, v) {
      FastChat.updateTyping(peer);
    });
  },
  updateTyping: function (peer, force) {
    var tab = curFastChat.tabs[peer],
        typings = [],
        lastEv = curFastChat.typingEvents[peer],
        sex,
        ts = vkNow(),
        el = ge('fc_tab_typing' + peer);

    if (peer < 2e9) {
      if (lastEv && ts - lastEv < 6000) {
        typings.push(tab.fname || tab.name || '');
        sex = tab.sex;
      }
    } else {
      var mems = tab.data.members;
      each (lastEv || {}, function (k, v) {
        if (v && ts - v < 6000 && mems[k] && mems[k].first_name) {
          typings.push(mems[k].first_name || '');
          sex = mems[k].sex;
        }
      });
    }
    if (!typings.length) {
      return force ? setStyle(el, 'opacity', 0) : fadeTo(el, 1000, 0);
    }
    if (typings.length == 1) {
      val(el, langSex(sex, lang.mail_im_typing).replace('{user}', typings[0]));
    } else {
      var lastUser = typings.pop();
      val(el, getLang('mail_im_multi_typing').replace('{users}', typings.join(', ')).replace('{last_user}', lastUser));
    }
    return force ? setStyle(el, 'opacity', 1) : fadeTo(el, 200, 1);
  },
  readLastMsgs: function (peer) {
    var t = this, tab = curFastChat.tabs[peer];
    if (!peer) return;

    if (!tab.markingRead && tab.unread) {
      var unread = [];
      for (var i in tab.msgs) {
        if (!tab.msgs[i][0] && tab.msgs[i][1]) {
          unread.push(i);
        }
      }
      FastChat.markRead(peer, unread);
    }
  },
  markRead: function(peer, unread) {
    if (!unread.length) return;
    var t = this, tab = curFastChat.tabs[peer];
    tab.markingRead = true;

    ajax.post('al_im.php', {act: 'a_mark_read', peer: peer, ids: unread, hash: tab.sendhash}, {
      onDone: function (res, newmsg) {
        tab.markingRead = false;

        for (var i in unread) {
          var msgId = unread[i], row = ge('fc_msg' + msgId), parent = row && row.parentNode;
          // debugLog('ajax read', row, clone(tab.msgs[msgId]), parent, hasClass(parent.parentNode, 'fc_msgs_unread'));
          if (!row) continue;
          if (tab.msgs[msgId] && tab.msgs[msgId][1]) {
            tab.msgs[msgId][1] = 0;
            if (!tab.msgs[msgId][0]) {
              tab.unread--;
            }
          }
          removeClass(row, 'fc_msg_unread');
          if (hasClass(parent.parentNode, 'fc_msgs_unread')) {
            each (parent.childNodes, function () {
              if (!hasClass(this, 'fc_msg_unread')) {
                removeClass(parent.parentNode, 'fc_msgs_unread');
                return false;
              }
            });
          }
        }
        if (tab.unread > 0) {
          tab.unread = 0;
          each (tab.msgs, function () {
            if (!this[0] && this[1]) tab.unread++;
          });
        }
        FastChat.updateUnreadTab(peer);
      },
      onFail: function () {
        tab.markingRead = false;
      }
    });
  },
  mkMsg: function (msg) {
    var message = clean(msg).replace(/\n/g, '<br>'),
        susp = false;

    message = message.replace(/([a-zA-Z\-_\.0-9]+@[a-zA-Z\-_0-9]+\.[a-zA-Z\-_\.0-9]+[a-zA-Z\-_0-9]+)/g, function(url) {
      return '<a href="/write?email='+url+'" target="_blank">'+url+'</a>'
    });

    message = message.replace(/(^|[^A-Za-z0-9À-ßà-ÿ¸¨\-\_])(https?:\/\/)?((?:[A-Za-z\$0-9À-ßà-ÿ¸¨](?:[A-Za-z\$0-9\-\_À-ßà-ÿ¸¨]*[A-Za-z\$0-9À-ßà-ÿ¸¨])?\.){1,5}[A-Za-z\$ðô\-\d]{2,22}(?::\d{2,5})?)((?:\/(?:(?:\&amp;|\&#33;|,[_%]|[A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.~=;:]+|\[[A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.,~=;:]*\]|\([A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.,~=;:]*\))*(?:,[_%]|[A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.~=;:]*[A-Za-z0-9À-ßà-ÿ¸¨\_#%?+\/\$~=]|\[[A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.,~=;:]*\]|\([A-Za-z0-9À-ßà-ÿ¸¨\-\_#%?+\/\$.,~=;:]*\)))?)?)/ig, function () { // copied to notifier.js:3401
      var matches = Array.prototype.slice.apply(arguments),
          prefix = matches[1] || '',
          protocol = matches[2] || 'http://',
          domain = matches[3] || '',
          url = domain + (matches[4] || ''),
          full = (matches[2] || '') + matches[3] + matches[4];

      if (domain.indexOf('.') == -1 || domain.indexOf('..') != -1) return matches[0];
      var topDomain = domain.split('.').pop();
      if (topDomain.length > 6 || indexOf('info,name,aero,arpa,coop,museum,mobi,travel,xxx,asia,biz,com,net,org,gov,mil,edu,int,tel,ac,ad,ae,af,ag,ai,al,am,an,ao,aq,ar,as,at,au,aw,ax,az,ba,bb,bd,be,bf,bg,bh,bi,bj,bm,bn,bo,br,bs,bt,bv,bw,by,bz,ca,cc,cd,cf,cg,ch,ci,ck,cl,cm,cn,co,cr,cu,cv,cx,cy,cz,de,dj,dk,dm,do,dz,ec,ee,eg,eh,er,es,et,eu,fi,fj,fk,fm,fo,fr,ga,gd,ge,gf,gg,gh,gi,gl,gm,gn,gp,gq,gr,gs,gt,gu,gw,gy,hk,hm,hn,hr,ht,hu,id,ie,il,im,in,io,iq,ir,is,it,je,jm,jo,jp,ke,kg,kh,ki,km,kn,kp,kr,kw,ky,kz,la,lb,lc,li,lk,lr,ls,lt,lu,lv,ly,ma,mc,md,me,mg,mh,mk,ml,mm,mn,mo,mp,mq,mr,ms,mt,mu,mv,mw,mx,my,mz,na,nc,ne,nf,ng,ni,nl,no,np,nr,nu,nz,om,pa,pe,pf,pg,ph,pk,pl,pm,pn,pr,ps,pt,pw,py,qa,re,ro,ru,rs,rw,sa,sb,sc,sd,se,sg,sh,si,sj,sk,sl,sm,sn,so,sr,ss,st,su,sv,sx,sy,sz,tc,td,tf,tg,th,tj,tk,tl,tm,tn,to,tp,tr,tt,tv,tw,tz,ua,ug,uk,um,us,uy,uz,va,vc,ve,vg,vi,vn,vu,wf,ws,ye,yt,yu,za,zm,zw,ðô,cat,pro,local'.split(','), topDomain) == -1) return matches[0];

      if (matches[0].indexOf('@') != -1) {
        return matches[0];
      }
      try {
        full = decodeURIComponent(full);
      } catch (e){}

      if (full.length > 55) {
        full = full.substr(0, 53) + '..';
      }
      full = clean(full).replace(/&amp;/g, '&');

      if (!susp && domain.match(/^([a-zA-Z0-9\.\_\-]+\.)?(vkontakte\.ru|vk\.com|vkadre\.ru|vshtate\.ru|userapi\.com|vk\.me)$/)) {
        url = replaceEntities(url).replace(/([^a-zA-Z0-9#%;_\-.\/?&=\[\]])/g, encodeURIComponent);
        var tryUrl = url, hashPos = url.indexOf('#/'), mtch, oncl = '';
        if (hashPos >= 0) {
          tryUrl = url.substr(hashPos + 1);
        } else {
          hashPos = url.indexOf('#!');
          if (hashPos >= 0) {
            tryUrl = '/' + url.substr(hashPos + 2).replace(/^\//, '');
          }
        }
        mtch = tryUrl.match(/^(?:https?:\/\/)?(?:vk\.com|vkontakte\.ru)?\/([a-zA-Z0-9\._]+)\??$/);
        if (mtch) {
          if (mtch[1].length < 32) {
            oncl = ' mention_id="' + mtch[1] + '" onclick="return mentionClick(this, event)" onmouseover="mentionOver(this)"';
          }
        }
        return prefix + '<a href="'+ (protocol + url).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '" target="_blank"' + oncl + '>' + full + '</a>';
      }
      return prefix + '<a href="away.php?utf=1&to=' + encodeURIComponent(protocol + replaceEntities(url)) + '" target="_blank" onclick="return goAway(\''+ clean(protocol + url) + '\', {}, event);">' + full + '</a>';
    });

    message = Emoji.emojiToHTML(message, 1);

    return message;
  },
  getEditCont: function(emojiId) {
    //return '<textarea class="fc_tab_txt text"></textarea>';
    stManager.add(['emoji.js']);
    return '<div class="emoji_cont">'+Emoji.tplSmile(emojiId, getLang('mail_emoji_hint'), ' fc_emoji')+'<div class="fc_editable" tabindex="0" contenteditable="true"></div></div>';
  },
  getVal: function(obj) {
    //return obj.value;
    return Emoji ? Emoji.editableVal(obj) : '';
  },
  addTab: function (peer, data, options) {
    if (curFastChat.tabs[peer] !== undefined) {
      return;
    }
    var editCont = FastChat.getEditCont(Emoji.last);
    options = options || {};
    curFastChat.tabs[peer] = {};
    var wrap = se(rs(FastChat.tplTab, {id: peer, name: data.name, myphoto: Notifier.fixPhoto(curFastChat.me.photo, true), classname: data.online ? (data.online != 1 ? ' fc_tab_mobile' : ' fc_tab_online') : '', cont: editCont})),
       tab = curFastChat.tabs[peer] = {
      name: data.name,
      fname: data.fname,
      photo: data.photo,
      link: 'id' + peer,
      hash: data.hash,
      sendhash: FastChat.decodehash(data.hash),
      sex: data.sex || 0,
      data: data.data || {},
      online: data.online,
      msgs: {},
      msgscount: 0,
      unread: 0,
      sent: 0,
      sentmsgs: [],
      box: false,
      wrap: wrap,
      //txt: geByClass1('fc_tab_txt', wrap, 'textarea'),
      editable: 1,
      txt: geByClass1('fc_editable', wrap),
      logWrap: geByClass1('fc_tab_log', wrap),
      log: geByClass1('fc_tab_log_msgs', wrap),
      notify: geByClass1('fc_tab_notify_wrap', wrap),
      title: geByClass1('fc_tab_title', wrap),
      btn: geByClass1('fc_tab_button', wrap)
    },
    wndInner = getWndInner(),
    opts = {
      id: 'fc_peer' + peer,
      movable: geByClass1('fc_tab_head', wrap),
      closer: geByClass1('fc_tab_close_wrap', wrap, 'a'),
      minimizer: true, //geByClass1('fc_tab_min_wrap', wrap),
      resizeableH: tab.logWrap,
      startHeight: 250,
      startWidth: 260,
      minH: 150,
      minW: 220,
      nofocus: true,
      onFocus: function (e) {
        if (tab.auto) {
          FastChat.stateChange({op: 'added', peer: peer});
          delete tab.auto;
        }

        FastChat.restoreDraft(peer);
        if (tab.editable) {
          Emoji.editableFocus(tab.txt, false, true);
        } else {
          elfocus(tab.txt);
        }
        if (tab.wrap.clientWidth) setStyle(tab.title, {maxWidth: tab.wrap.clientWidth - 71});
        if (!tab.editable) {
          setStyle(tab.txt.autosize.helper, {width: getStyle(tab.txt, 'width', false)});
        }
        tab.scroll && tab.scroll.update(false, true);
        setTimeout(elfocus.pbind(tab.txt), 10);
      },
      onClose: function (pos) {
        if (options && options.beforeClose) {
          options.beforeClose();
        }
        var tabs = curFastChat.tabs, posSeq = tabs[peer].posSeq;
        delete tabs[peer];
        if (!curNotifier.isIdle) {
          FastChat.stateChange({op: 'closed', peer: peer});
        }
        if (!posSeq) return;

        var i, seqsTabs = {}, seqs = [], seq, box, prevPos, anim;
        each (tabs, function () {
          if (this.posSeq > posSeq) {
            seqsTabs[this.posSeq] = this;
            seqs.push(this.posSeq);
          }
        });
        seqs.unshift(posSeq);
        seqs.sort();
        anim = (!browser.msie && seqs.length < 10);
        for (i = 1; i < seqs.length; i++) {
          seq = seqs[i];
          box = seqsTabs[seq].box;
          prevPos = i > 1 ? seqsTabs[seqs[i - 1]].box.pos : pos;
          if (anim) {
            animate(box.wrap, {left: prevPos[1]}, 100, function (box) {
              box._update_pos();
            }.pbind(box));
          } else {
            setStyle(box.wrap, {left: prevPos[1]});
          }
        }
        if (!anim) {
          for (i = 1; i < seqs.length; i++) {
            box = seqsTabs[seqs[i]].box;
            box._update_pos();
          }
        }
      },
      onMinimize: function (val) {
        FastChat.stateChange({op: 'minimized', peer: peer, val: val});
        FastChat.fixResized(tab, tab.wrap.clientWidth, true);
        if (!val) {
          tab.txt.blur();
          FastChat.restoreDraft(peer);
        }
      },
      onResizeEnd: function (h, w) {
        var wndInner = getWndInner(), pos = tab.box.pos;
        tab.scroll && tab.scroll.show();
        FastChat.fixResized(tab, w, true);
        FastChat.stateChange({op: 'resized', peer: peer, h: h / wndInner[0], w: w / wndInner[1], y: tab.box.toBottom ? -1 : pos[0] / wndInner[0], x: tab.box.toRight ? -1 : pos[1] / wndInner[1]});
      },
      onResize: function (h, w) {
        FastChat.fixResized(tab, w);
      },
      onResizeStart: function () {
        delete tab.posSeq;
        tab.scroll && tab.scroll.hide();
        val(tab.notify, '');
        clearTimeout(tab.hideNotifyTO);
      },
      onDragEnd: function (y, x) {
        delete tab.posSeq;
        FastChat.stateChange({op: 'moved', peer: peer, y: y, x: x});
      }
    };

    if (options) {
      extend(opts, options);
    }

    if (opts.startLeft === undefined && opts.startRight === undefined) {
      var xs = [], minTop = wndInner[0] - 350, pos = curFastChat.clistBox.pos;
      var snapRight = false;
      if (window.Call && (Call.box || Call.invitation)) {
        var size = Call.calcBoxPos();
        xs.push([size.x, size.x + size.w]);
        snapRight = true;
      }
      if (pos[0] + pos[2] > minTop && (curFastChat.clistBox.visible || !snapRight)) {
        xs.push([pos[1], pos[1] + pos[3]]);
      }
      each (curFastChat.tabs, function (k) {
        if (!(pos = this.box && this.box.pos) || k == peer) {
          return;
        }
        if (pos[0] + pos[2] > minTop) {
          xs.push([pos[1], pos[1] + pos[3]]);
        }
      });
      // var startX = 15, endX = wndInner[1] - 260 - sbWidth(),
      // var w = ge('page_layout').offsetWidth, startX = (lastWindowWidth + w) / 2 - 240, endX = 0,
      var startX = lastWindowWidth - 262 - sbWidth(), endX = 0,
          minLayersX = false, minLayersCnt = false, curX, curCnt, j, sign = endX > startX ? 1 : -1;

      for (curX = startX; sign * curX < sign * endX; curX += sign * 135) {
        curCnt = 0;
        for (j = 0; j < xs.length; j++) {
          if (curX > xs[j][0] - 260 && curX < xs[j][1]) {
            // debugLog('in', curX, xs[j][0], xs[j][1]);
            curCnt++;
          }
          if (curX > xs[j][0] - 10 && curX < xs[j][0] + 10) {
            curCnt += 1.1;
          }
        }
        // debugLog('point', curX, curCnt, minX, minCnt);
        if (minLayersX === false || curCnt < minLayersCnt) {
          minLayersX = curX;
          minLayersCnt = curCnt;
        }
      }

      if (snapRight && minLayersCnt) {
        minLayersX = startX;
      }

      extend(opts, {
        startBottom: 0,
        startLeft: minLayersX
      });
    }
    var emp = true, i;
    for (i in (options || {})) {
      if (i != 'nofocus') {
        emp = false;
        break;
      }
    }
    if (emp) {
      tab.posSeq = ++curFastChat.posSeq;
    }
    if (!opts.minimized && options !== undefined && nav.objLoc[0] == 'im' &&
        nav.objLoc.sel == peer ||
        peer > 2e9 && (nav.objLoc.sel == ('c' + (peer - 2e9))) ||
        peer < -2e9 && (nav.objLoc.sel == ('e' + (- peer - 2e9)))
      ) {
      opts.minimized = true;
      cur.hiddenChats[peer] = 1;
    }
    tab.scroll = new Scrollbar(tab.logWrap, {
      prefix: 'fc_',
      nomargin: true,
      nokeys: true,
      global: true,
      right: vk.rtl ? 'auto' : 10,
      left: !vk.rtl ? 'auto' : 10
    });

    tab.box = new RBox(wrap, opts);

    if (!opts.minimized && options &&
        (options.startLeft !== undefined ||
        options.startTop !== undefined ||
        options.startWidth !== undefined ||
        options.startHeight !== undefined)) {
      tab.box._wnd_resize(wndInner[0], wndInner[1], true);
    }
    var enterWorks = true;

    var lastTxtH = 30;
    if (tab.editable) {
      cur.t = tab;
      tab.emojiId = Emoji.init(tab.txt, {
        controlsCont: geByClass1('fc_tab_txt_wrap', wrap),
        ttDiff: -87,
        ttShift: 84,
        noRce: true,
        onSend: FastChat.send.pbind(peer),
        checkEditable: FastChat.checkEditable,
        onShow: function() {
          cssAnim(tab.scroll.scrollbar, {opacity: 0}, {duration: 400});
          enterWorks = false;
        },
        onHide: function() {
          cssAnim(tab.scroll.scrollbar, {opacity: 1}, {duration: 400});
          setTimeout(function() {
            enterWorks = true;
          }, 0);
        }
      });
    } else {
      autosizeSetup(tab.txt, {minHeight: 30, maxHeight: 42});
      tab.txt.autosize.options.onResize = function (h) {
        if (tab.box.minimized) {
          return;
        }
        var txtH = h == 42 ? 42 : 30;
        if (txtH != h) {
          setStyle(tab.txt, 'height', txtH);
        }
        if (txtH != lastTxtH) {
          setStyle(tab.logWrap, 'height', tab.logWrap.clientHeight - txtH + lastTxtH); // bottom padding
          lastTxtH = txtH;
          tab.scroll && tab.scroll.update(false, true);
        }
      };
    }
    addEvent(tab.txt, 'keydown focus mousedown keyup', function (e) {
      if (e.type == 'mousedown') {
        if (curRBox.active == tab.box.id) {
          (e.originalEvent || e).cancelBubble = true;
        }
        return;
      }
      if (e.type == 'keydown' && !(e.shiftKey || e.metaKey || e.ctrlKey) && (e.keyCode == KEY.RETURN || e.keyCode == 10)) {
        if (enterWorks) {
          FastChat.send(peer);
        }
        return cancelEvent(e);
      }
      if (e.type == 'keydown' && e.ctrlKey && e.keyCode == KEY.RETURN) {
        var val = this.value;
        if (typeof this.selectionStart == "number" && typeof this.selectionEnd == "number") {
          var start = this.selectionStart;
          this.value = val.slice(0, start) + "\n" + val.slice(this.selectionEnd);
          this.selectionStart = this.selectionEnd = start + 1;
        } else if (document.selection && document.selection.createRange) {
          this.focus(e);
          var range = document.selection.createRange();
          range.text = "\r\n";
          range.collapse(false);
          if (browser.opera) {
            range.moveEnd('character', 0);
            range.moveStart('character', 0);
          }
          range.select();
        }
        if (tab.editable) {
          FastChat.checkEditable(tab.emojiId, tab.txt);
        } else {
          tab.txt.autosize.update();
          setTimeout(function () {
            tab.txt.autosize.update();
          }, 0);
        }
        return false;
      }
      if (e.type == 'focus') {
        curFastChat.peer = peer;
      } else if (e.type == 'keyup') {
        var lastVal = tab.lastVal || '',
            curVal = FastChat.getVal(this);
        if (curVal.length != lastVal.length ||
            curVal != lastVal) {
          if (curVal) {
            FastChat.onMyTyping(peer);
          }
          tab.lastVal = curVal;
        }
        clearTimeout(tab.saveDraftTO);
        tab.saveDraftTO = setTimeout(FastChat.saveDraft.pbind(peer), curVal.length ? 300 : 0);
        FastChat.checkEditable(tab.emojiId, tab.txt);
      }
      FastChat.readLastMsgs(peer);
    });
    FastChat.restoreDraft(peer);
  },

  checkEditable: function(optId, obj) {
    Emoji.checkEditable(optId, obj, {height: 40});
  },

  fixResized: function (tab, w, stopped) {
    if (!tab) return;
    tab.logWrap.scrollTop = tab.logWrap.scrollHeight;
    if (w > 0) {
      setStyle(tab.title, {maxWidth: w - 71});
    }
    if (stopped) {
      if (!tab.editable) {
        setStyle(tab.txt.autosize.helper, {width: getStyle(tab.txt, 'width', false)});
      }
      tab.scroll && tab.scroll.update(false, true);
    }
  },
  activateTab: function (peer) {
    curFastChat.tabs[peer].box.focus();
  },

  updateUnreadTab: function (peer) {
    var tab = curFastChat.tabs[peer];
    if (!tab) return;
    val(tab.title, tab.name + (tab.unread ? ' <span class="fc_tab_count">(' + tab.unread + ')</span>' : ''));
    val('fc_contact_unread' + peer, tab.unread ? ' <b>+' + tab.unread + '</b>' : '');
  },
  blinkTab: function (peer) {
    var tab = curFastChat.tabs[peer];
    if (tab.blinking || curFastChat.peer == peer) return;
    tab.blinking = true;
    clearTimeout(tab.blinkingTO);
    var wrap = tab.box.wrap, className = wrap.className, zIndex = Math.min(700, intval(getStyle(wrap, 'zIndex')));
    setStyle(wrap, {zIndex: 800});
    removeClass(wrap, 'rb_inactive');
    tab.blinkingTO = setTimeout(function () {
      delete tab.blinking;
      delete tab.blinkingTO;

      if (getStyle(wrap, 'zIndex') != 800) {
        return;
      }
      setStyle(wrap, {zIndex: zIndex});
      wrap.className = className;
    }, 2000);
  },

  send: function (peer) {
    var t = this, tab = curFastChat.tabs[peer];
    if (tab.editable) {
      var msg = Emoji.editableVal(tab.txt);
    } else {
      var msg = trim(val(tab.txt));
    }
    if (!msg || tab.sending) {
      if (tab.editable) {
        Emoji.editableFocus(tab.txt, false, true);
      } else {
        elfocus(tab.txt);
      }
      return;
    }
    var msgId = --tab.sent,
        params = {
      act: 'a_send',
      to: peer,
      hash: tab.sendhash,
      msg: msg,
      from: 'fc'
    };
    tab.sending = true;
    Emoji.ttHide(tab.emojiId);
    ajax.post('al_im.php', params, {
      onDone: function(response) {
        clearTimeout(tab.saveDraftTO);
        FastChat.saveDraft(peer);

        if (response.version && intval(response.version) > curFastChat.version) {
           FastChat.updateVersion(response.version);
           return;
        }

        var row = ge('fc_msg' + msgId), realMsgId = response.msg_id, pos = indexOf(msgId, tab.newmsgs);
        if (!row) return;

        ++tab.msgscount;
        if (pos != -1) {
          tab.newmsgs.splice(pos, 1);
        }
        row.id = 'fc_msg' + realMsgId;

        tab.msgs[realMsgId] = [1, 1];
        // FastChat.updateOnline(peer, response.online);
      },
      onFail: function(error) {
        FastChat.error(peer, error || getLang('global_unknown_error'));

        elfocus(tab.txt);
        val(tab.txt, msg);
        if (tab.editable) {
          FastChat.checkEditable(tab.emojiId, tab.txt);
        } else {
          tab.txt.autosize.update();
        }

        var row = ge('fc_msg' + msgId);
        if (!row) return;
        row.appendChild(ce('span', {className: 'fc_msg_error', innerHTML: getLang('global_error')}));
        FastChat.scroll(peer);
        return true;
      },
      showProgress: function () {
        tab.sending = true;
        tab.sendProgressTO = setTimeout(function () {
          var row = ge('fc_msg' + msgId);
          if (!row) return;
          row.insertBefore(ce('span', {className: 'fc_msg_progress progress', id: 'fc_msg_progress' + msgId}), row.firstChild);
        }, 2000);
      },
      hideProgress: function () {
        tab.sending = false;
        clearTimeout(tab.sendProgressTO);
        re('fc_msg_progress' + msgId);
      }
    });
    re('fc_error' + peer);
    tab.sentmsgs.push(msgId);
    FastChat.addMsg(FastChat.prepareMsgData([peer, msgId, 1 | 2, FastChat.mkMsg(msg)]));

    val(tab.txt, '');
    delete curFastChat.myTypingEvents[peer];
    if (tab.editable) {
      FastChat.checkEditable(tab.emojiId, tab.txt);
    } else {
      tab.txt.autosize.update(false, true);
    }
    elfocus(tab.txt);
    FastChat.scroll(peer);
  },
  saveDraft: function (peer) {
    var tab = curFastChat.tabs[peer],
        txt = tab.txt;
    if (!txt || !tab) return;

    var data = {
      txt: trim(val(txt)) || '',
      medias: []
    };
    if (!data.txt.length) {
      data = false;
    }
    ls.set('im_draft' + vk.id + '_' + peer, data);
  },
  restoreDraft: function (peer) {
    var tab = curFastChat.tabs[peer],
        txt = tab.txt,
        draft = ls.get('im_draft' + vk.id + '_' + peer);

    if (!txt || !tab || !draft ||
        val(txt).length > draft.txt.length) {
      return false;
    }
    val(txt, draft.txt || '');
    FastChat.checkEditable(tab.emojiId, txt);
    return true;
  },
  error: function (peer, msg) {
    peer = peer || curFastChat.peer;
    var tab = curFastChat.tabs[peer];
    re('fc_error' + peer);
    tab.log.appendChild(ce('div', {id: 'fc_error' + peer, className: 'fc_msgs_error', innerHTML: msg || getLang('global_error')}));
    FastChat.scroll(peer);
  },
  scroll: function(peer) {
    peer = peer || curFastChat.peer;
    var tab = curFastChat.tabs[peer];
    if (!tab) return;
    tab.logWrap.scrollTop = tab.logWrap.scrollHeight;
    tab.scroll && tab.scroll.update(false, true);
  },
  mkdate: function(raw) {
    var result = new Date(raw * 1000),
        now_time = new Date(),
        pad = function(num) {return ((num + '').length < 2) ? ('0' + num) : num;};

    if (result.getDay() == now_time.getDay()) {
      return pad(result.getHours()) + ':' + pad(result.getMinutes()) + ':' + pad(result.getSeconds());
    }
    return pad(result.getDate()) + '.' + pad(result.getMonth()+1) + '.' + (result.getFullYear() + '').substr(2);
  },
  prepareMsgData: function (arr) {
    var peer = arr[0], flags = intval(arr[2]), from_id = flags & 2 ? curFastChat.me.id : (peer > 2e9 ? arr[5] : peer), date = intval(vkNow() / 1000), data = {
      id: arr[1],
      peer: peer,
      from_id: from_id,
      text: arr[3],
      out: flags & 2 ? true : false,
      unread: flags & 1 ? true : false,
      date: date,
      date_str: FastChat.mkdate(date)
    }, author, attFlags = arr[4], attText = '';

    if (attFlags) { // Media
      if (attFlags & 1) {
        attText += '<div class="fc_msg_attachments_loading"></div>';
        setTimeout(FastChat.needMsgMedia.pbind(peer, arr[1]), 5);
      }
      if (attFlags & 6) {
        attText += rs(curFastChat.tpl.msg_fwd, {msg_id: arr[1], label: getLang(attFlags & 2 ? 'mail_im_fwd_msg' : 'mail_im_fwd_msgs')});
      }
      data.text += '<div class="fc_msg_attachments" id="fc_msg_attachments' + data.id + '">' + attText + '</div>';
    }
    if (flags & 2) {
      author = curFastChat.me;
    } else if (peer > 2e9) {
      author = curFastChat.tabs[peer].data.members[from_id];
    } else {
      author = curFastChat.tabs[peer];
    }
    extend(data, {
      from_id: from_id,
      link: author.link,
      photo: author.photo,
      name: author.name,
      fname: peer > 2e9 ? author.fname || author.first_name : ''
    });
    if (arr[5]) {
      var att = arr[5].split(',');
    }
    return data;
  },
  needMsgMedia: function (peer, msgId) {
    if (msgId <= 0) return;

    FastChat.lcSend('needMedia', {msgId: msgId});
    curFastChat.needMedia[msgId] = [peer, setTimeout(FastChat.loadMsgMedia.pbind(peer, msgId), curNotifier.is_server ? 0 : irand(150, 250))];
  },
  loadMsgMedia: function (peer, msgId) {
    if (msgId <= 0 || curFastChat.gotMedia[msgId] !== undefined && curFastChat.gotMedia[msgId] !== 0) return;
    FastChat.lcSend('fetchingMedia', {msgId: msgId});
    curFastChat.gotMedia[msgId] = 0;

    ajax.post('al_im.php', {act: 'a_get_media', id: msgId, from: 'fc'}, {
      onDone: function (text) {
        FastChat.lcSend('gotMedia', {msgId: msgId, peer: peer, text: text});
        FastChat.gotMsgMedia(peer, msgId, text);
      }
    })
  },
  gotMsgMedia: function (peer, msgId, text) {
    val('fc_msg_attachments' + msgId, text);
    FastChat.scroll(peer);
    curFastChat.gotMedia[msgId] = [peer, text];

    if (curFastChat.needMedia[msgId] === undefined) return;
    clearTimeout(curFastChat.needMedia[msgId][1]);
    delete curFastChat.needMedia[msgId];
  },
  addMsg: function (data) {
    var t = this, peer = data.peer, tab = curFastChat.tabs[peer], log = tab.log, last = log.lastChild;
    if (last && last.className == 'fc_msgs_error') {
      last = last.previousSibling;
    }
    if (!last || !hasClass(last, 'fc_msgs_wrap') || last.getAttribute('data-from') != data.from_id || data.date - intval(last.getAttribute('data-date')) >= 300) {
      re('fc_log_empty' + peer);
      log.appendChild(last = se(rs(curFastChat.tpl.msgs, {
        from_id: data.from_id,
        link: data.link,
        photo: Notifier.fixPhoto(data.photo),
        name: data.from_id == curFastChat.me.id ? getLang('mail_im_thats_u') : data.name,
        classname: (data.out ? 'fc_msgs_out ' : '') + (data.unread ? 'fc_msgs_unread' : ''),
        date: data.date,
        date_str: data.date_str,
        msgs: data.link && data.fname ? rs(curFastChat.tpl.author_name, {link: data.link, fname: data.fname}) : ''
      })));
    } else if (!data.unread) {
      removeClass(last, 'fc_msgs_unread');
    }
    var msgs = geByClass1('fc_msgs', last, 'div');
    msgs.appendChild(se(rs(curFastChat.tpl.msg, {
      msg_id: data.id,
      classname: data.unread ? 'fc_msg_unread' : '',
      text: data.text
    })));
    if (vk.id != data.from_id) {
      delete curFastChat.typingEvents[peer];
      FastChat.updateTyping(peer, 1);
    }
    tab.scroll && tab.scroll.update();
  },
  showMsgFwd: function (msgId) {
    return !showBox('al_im.php', {act: 'a_show_forward_box', id: vk.id + '_' + msgId, from: 'mail'}, {stat: ['im.css']});
  },
  closeTab: function (peer) {
    var box = curFastChat.tabs[peer].box;
    box.close();
  },

  // mobile online
  tip: function(el, p) {
    if (hasClass(el.parentNode.parentNode, 'fc_tab_mobile') && (!cur._fcpromo || cur._fcpromo < 0) && !cur._fcdrag) {
      mobileOnlineTip(el, p);
    }
  },
  promo: function(el, ev) {
    if (hasClass(el.parentNode.parentNode, 'fc_tab_mobile') && cur._fcpromo >= 0) {
      mobilePromo();
      return cancelEvent(ev || window.event);
    }
  },
  promost: function(el) {
    cur._fcpromo = 1;
    if (el.tt && el.tt.hide) {
      el.tt.hide();
    }
  },

  tplTab: '<div class="fc_tab_wrap"><div class="fc_tab %classname%"><div class="fc_tab_head clear_fix"><a class="fc_tab_close_wrap fl_r"><div class="fc_tab_close"></div></a><a class="fc_tab_max_wrap fl_r" href="/im?sel=%id%" onmousedown="event.cancelBubble = true;" onclick="return nav.go(this, event);"><div class="fc_tab_max"></div></a><div class="fc_tab_title noselect fl_l">%name%</div><div class="fl_l fc_tab_online_icon" onmouseover="FastChat.tip(this, {mid: %id%})" onmousedown="FastChat.promost(this)" onclick="return FastChat.promo(this, event)"></div></div><div class="fc_tab_log_wrap"><div class="fc_tab_notify_wrap"></div><div class="fc_tab_log"><div class="fc_tab_log_msgs"></div><div class="fc_tab_typing" id="fc_tab_typing%id%"></div></div></div><div class="fc_tab_txt_wrap"><div class="fc_tab_txt"><div class="fc_tab_txt_self"><img class="fc_tab_txt_self" src="%myphoto%"/></div>%cont%</div></div></div></div>'

}

// Tiny Scrollbars start
function Scrollbar(obj, options) {
  this.obj = obj = ge(obj);
  this.options = options || {};
  this.clPref = options.prefix || '';

  setTimeout((function() {
    setStyle(obj, {
      overflow: 'hidden'
    });

    var size = getSize(obj), s = {
      marginLeft: (size[0] - 7)+'px',
      height: size[1] + 'px'
    };
    if (options.nomargin) {
      delete s.marginLeft;
      s.right = options.right || 0;
      s.left = options.left || 0;
    }
    this.scrollHeight = size[1];

    this.scrollbar = ce('div', {
      className: this.clPref + 'scrollbar_cont'
    });
    setStyle(this.scrollbar, s);

    this.inner = ce('div', {
      className: this.clPref + 'scrollbar_inner'
    });
    this.scrollbar.appendChild(this.inner);

    if (options.shadows) {
      obj.parentNode.insertBefore(this.topShadowDiv = ce('div', {
        className: this.clPref + 'scrollbar_top'
      }, {width: size[0]}), obj);
      obj.parentNode.insertBefore(this.bottomShadowDiv = ce('div', {
        className: this.clPref + 'scrollbar_bottom'
      }, {width: size[0]}), obj.nextSibling);
    }

    obj.parentNode.insertBefore(this.scrollbar, obj);

    this.destroyList = [];

    this.mouseMove = this._mouseMove.bind(this);
    this.mouseUp = this._mouseUp.bind(this);
    var self = this;
    function down(event) {
      if (self.moveY || checkEvent(event)) return;
      addEvent(window.document, 'mousemove', self.mouseMove);
      addEvent(window.document, 'mouseup', self.mouseUp);
      self.moveY = event.pageY - (self.inner.offsetTop || 0);

      window.document.body.style.cursor = 'pointer';
      addClass(self.inner, self.clPref + 'scrollbar_hovered');
      if (options.startDrag) {
        options.startDrag();
      }
      if (options.onHold) {
        options.onHold(true);
      }
      self.isDown = true;
      return cancelEvent(event);
    }
    this.mouseDown = down;
    function keydown(event) {
      switch ((event || window.event).keyCode) {
        case 40:  self.obj.scrollTop += 40; break;
        case 38:  self.obj.scrollTop -= 40; break;
        case 34:  self.obj.scrollTop += self.scrollHeight; break;
        case 33:  self.obj.scrollTop -= self.scrollHeight; break;
        default: return true;
      }
      self.update(true);
      return cancelEvent(event);
    }
    var wheel = this.wheel.bind(this);
    addEvent(obj, 'mousewheel', wheel);
    addEvent(obj, 'DOMMouseScroll', wheel);
    addEvent(this.scrollbar, 'mousewheel', wheel);
    addEvent(this.scrollbar, 'DOMMouseScroll', wheel);

    addEvent(this.scrollbar, 'mouseover', this.contOver.bind(this));
    addEvent(this.scrollbar, 'mouseout', this.contOut.bind(this));
    addEvent(this.scrollbar, 'mousedown', this.contDown.bind(this));

    if (browser.safari_mobile) {
      var touchstart = function(event) {
        cur.touchY  = event.touches[0].pageY;
      };
      var touchmove = function(event) {
        var touchY = event.touches[0].pageY;
        cur.touchDiff = cur.touchY - touchY;
        obj.scrollTop += cur.touchDiff;
        cur.touchY = touchY;
        if (obj.scrollTop > 0 && self.shown !== false) {
          self.update(true);
          return cancelEvent(event);
        }
      };
      var touchend = function() {
        cur.animateInt = setInterval(function() {
          cur.touchDiff = cur.touchDiff * 0.9;
          if (cur.touchDiff < 1 && cur.touchDiff > -1) {
            clearInterval(cur.animateInt);
          } else {
            obj.scrollTop += cur.touchDiff;
            self.update(true);
          }
        }, 0);
      };
      addEvent(obj, 'touchstart', touchstart);
      addEvent(obj, 'touchmove', touchmove);
      addEvent(obj, 'touchend', touchend);

      this.destroyList.push(function() {
        removeEvent(obj, 'touchstart', touchstart);
        removeEvent(obj, 'touchmove', touchmove);
        removeEvent(obj, 'touchend', touchend);
      });
    }

    addEvent(this.inner, 'mousedown', down);
    if (!options.nokeys) {
      addEvent(window, 'keydown', keydown);
    } else {
      this.onkeydown = keydown;
    }


    this.destroyList.push(function() {
      removeEvent(obj, 'mousewheel', wheel);
      removeEvent(obj, 'DOMMouseScroll', wheel);
      removeEvent(self.inner, 'mousedown', down);
      removeEvent(window, 'keydown', keydown);
    });

    if (this.contHeight() <= this.scrollHeight) {
      hide(this.bottomShadowDiv);
    } else {
      this.bottomShadow = true;
    }
    this.inited = true;
    this.update(true);

    if (!options.global) {
      cur.destroy.push(this.destroy.bind(this));
    }
  }).bind(this), 0);
}

Scrollbar.prototype.contOver = function() {
  this.isOut = false;
  if (this.shown) {
    addClass(this.scrollbar, 'scrollbar_c_overed');
  }
}
Scrollbar.prototype.contOut = function() {
  this.isOut = true;
  if (this.isDown) return;
  removeClass(this.scrollbar, 'scrollbar_c_overed');
}
Scrollbar.prototype.contDown = function(ev) {
  var y = ev.offsetY - this.innerHeight / 2 + 5;// - this.innerHeight;
  var scrH = this.scrollHeight - this.innerHeight;

  var newScroll = Math.floor((this.contHeight() - this.scrollHeight) * Math.min(1, y / scrH));
  this.obj.scrollTop = newScroll;
  this.update(true);
  this.mouseDown(ev);
}

Scrollbar.prototype._mouseMove = function(event) {
  this.obj.scrollTop = Math.floor((this.contHeight() - this.scrollHeight) * Math.min(1, (event.pageY - this.moveY) / (this.scrollHeight - this.innerHeight - 6)));
  this.update(true);
  return false;
}

Scrollbar.prototype._mouseUp = function(event) {
  this.moveY = false;
  this.isDown = false;
  if (this.isOut) {
    this.contOut();
  }
  removeEvent(window.document, 'mousemove', this.mouseMove);
  removeEvent(window.document, 'mouseup', this.mouseUp);
  window.document.body.style.cursor = 'default';
  removeClass(this.inner, this.clPref + 'scrollbar_hovered');
  if (this.options.stopDrag) {
    this.options.stopDrag();
  }
  if (this.options.onHold) {
    this.options.onHold(false);
  }
  return false;
}

Scrollbar.prototype.wheel = function(event) {
  if (this.disabled) {
    return;
  }
  if (!event) event = window.event;
  var delta = 0;
  if (event.wheelDeltaY || event.wheelDelta) {
    delta = (event.wheelDeltaY || event.wheelDelta) / 2;
  } else if (event.detail) {
    delta = -event.detail * 10
  }
  var stWas = this.obj.scrollTop;
  this.obj.scrollTop -= delta;

  if (this.options.onScroll) {
    this.options.onScroll(delta);
  }

  if (stWas != this.obj.scrollTop && this.shown !== false) {
    this.update(true);
    addClass(this.inner, this.clPref + 'scrollbar_hovered');
    clearTimeout(this.moveTimeout);
    this.moveTimeout = setTimeout((function() {
      removeClass(this.inner, this.clPref + 'scrollbar_hovered');
    }).bind(this), 300);
  }
  if (this.shown) {
    return false;
  }
}

Scrollbar.prototype.hide = function(anim) {
  hide(this.topShadowDiv, this.bottomShadowDiv, this.scrollbar)
  this.hidden = true;
}
Scrollbar.prototype.show = function(anim) {
  show(this.topShadowDiv, this.bottomShadowDiv, this.scrollbar)
  this.hidden = false;
}
Scrollbar.prototype.disable = function() {
  this.hide();
  this.scrollTop(0);
  this.disabled = true;
}
Scrollbar.prototype.enable = function() {
  this.show();
  this.update();
  this.disabled = false;
}

Scrollbar.prototype.scrollTop = function(top) {
  this.obj.scrollTop = parseInt(top);
  this.update(false, true);
}

Scrollbar.prototype.destroy = function(top) {
  each(this.destroyList, function (k, f) {f();});
}

Scrollbar.prototype.contHeight = function() {
  if (this.options.contHeight) {
    return this.options.contHeight;
  }
  if (this.contHashCash) {
    return this.contHashCash;
  }
  var nodes = this.obj.childNodes;
  var height = 0;
  var i = nodes.length;
  while (i--) {
    height += nodes[i].offsetHeight || 0;
  }
  this.contHashCash = height;
  return height;
}

Scrollbar.prototype.val = function(value) {
  if (value) {
    this.obj.scrollTop = value;
    this.update(true, true);
  }
  return this.obj.scrollTop;
}

Scrollbar.prototype.update = function(noChange, updateScroll) {
  if (!this.inited || this.hidden) {
    return;
  }
  if (!noChange) {
    this.contHashCash = false;
    if (this.moveY) {
      return true;
    }
  }
  if (updateScroll) {
    var size = getSize(this.obj);
    this.scrollHeight = size[1];
    setStyle(this.scrollbar, 'height', size[1]);
  }
  var height = this.contHeight();
  if (height <= this.scrollHeight) {
    hide(this.inner, this.bottomShadowDiv, this.topShadowDiv);
    setStyle(this.scrollbar, {pointerEvents: 'none'});
    this.topShadow = this.bottomShadow = false;
    this.shown = false;
    return;
  } else if (!this.shown) {
    show(this.inner);
    setStyle(this.scrollbar, {pointerEvents: 'auto'});
    this.shown = true;
  }

  var topScroll = this.val();

  if (this.options.scrollChange) {
    this.options.scrollChange(topScroll);
  }

  var progress = this.lastProgress = Math.min(1, topScroll / (height - this.scrollHeight));

  if (progress > 0 != (this.topShadow ? true : false)) {
    (this.topShadow ? hide : show)(this.topShadowDiv);
    this.topShadow = !this.topShadow;
  }
  if (progress < 1 != (this.bottomShadow ? true : false)) {
    (this.bottomShadow ? hide : show)(this.bottomShadowDiv);
    this.bottomShadow = !this.bottomShadow;
  }

  this.innerHeight = Math.max(40, Math.floor(this.scrollHeight * this.scrollHeight / height));
  this.inner.style.height = this.innerHeight + 'px';
  this.inner.style.marginTop = Math.floor((this.scrollHeight - this.innerHeight - 4) * progress + 2) + 'px';

  if (this.options.more && isFunction(this.options.more) && (this.options.contHeight || (height - this.obj.scrollTop < this.scrollHeight * 2))) {
    this.options.more();
  }
}
// Tiny Scrollbars end

function IframeLoader() {
  var iframe, doc, body, index, sources, aborted_sources;

  function iframeDoc(i) {
    try {
      if (i.contentDocument) return i.contentDocument;
      if (i.contentWindow && i.contentWindow.document) return i.contentWindow.document;
      return i.document;
    } catch (e) {};
    return false;
  }
  function getImgHtml(i) {
    if (doc && doc.body) return '<img id="___img' + i + '" />';
    else return '<img class="___img' + i + '" />';
  }
  function getImg(i) {
    if (doc && doc.body) return doc.getElementById('___img' + i);
    else return geByClass1('___img' + i, body);
  }
  function init() {
    iframe = utilsNode.appendChild(ce('iframe'));
    doc = iframeDoc(iframe);
    if (doc && doc.body) {
      body = doc.body;
    } else {
      body = utilsNode.appendChild(ce('div', {}, {display: 'none'}));
    }
    index = 0;
    sources = [];
  }
  function add(src, onLoad, that) {
    var i = index++;
    sources[i] = {src: src, onLoad: onLoad, that: that};
    body.appendChild(ce('div', {innerHTML: getImgHtml(i)}));
    var img = getImg(i);
    img.src = src;
    img.onload = function() {
      var obj = sources[i];
      obj.onLoad && obj.onLoad.call(obj.that || window, obj.src);
      delete sources[i];
      body.removeChild(getImg(i).parentNode);
    }
  }
  function abort() {
    re(iframe);
    aborted_sources = [];
    for (var k in sources) {
      aborted_sources.push(sources[k]);
    }
    init();
  }
  function repeat(need_redraw) {
    if (!aborted_sources) return [];
    var objs = [];
    for (var k in aborted_sources) {
      var obj = aborted_sources[k];
      add(obj.src, obj.onLoad, obj.that);
      objs.push(obj.that);
    }
    aborted_sources = null;
    if (need_redraw) {
      var redraw_data = [];
      each(objs, function() {
        redraw_data.push([this, this.src]);
        this.src = '';
        hide(this);
      });
      setTimeout(function(){
        each(redraw_data, function() {
          var img = this[0], src = this[1];
          img.src = src;
          show(img);
        });
      }, 10);
    }
    return objs;
  }

  init();

  return {
    add: add,
    abort: abort,
    repeat: repeat
  }
}

try{stManager.done('notifier.js');}catch(e){}
