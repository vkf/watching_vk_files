var html5video = {
  volLineW: 50,
  volStep: 0.05,
  prStep: 7,
  minPrW: 78,
  volume: 0.65,
  lastVolume: 0.65,
  fixed_player_size: false,
  actionsW: 31,
  cur_res: -1,
  inside: 0,
  moveState: 0,
  notLoaded: 1,

  initHTML5Video: function(vars, fixedWidth, fixedHeight) {
    removeEvent(document, 'mouseup', html5video.docMouseUp);
    removeEvent(document, 'mousemove', html5video.docMouseMove);
    removeEvent(document, browser.opera ? 'keypress' : 'keydown', html5video.docKeyPressed);
    removeEvent(window, 'resize', html5video.onResize);
    addEvent(document, 'mouseup', html5video.docMouseUp);
    addEvent(document, 'mousemove', html5video.docMouseMove);
    addEvent(document, browser.opera ? 'keypress' : 'keydown', html5video.docKeyPressed);
    addEvent(window, 'resize', html5video.onResize);

    html5video.angle = (vars.angle || 0) * 90;
    html5video.volume = html5video.lastVolume = 0.65;
    html5video.cur_res = -1;
    html5video.fixed_player_size = false;
    html5video.actionsW = 31;
    html5video.inside = 0;
    html5video.moveState = 0;
    html5video.notLoaded = 1;
    html5video.videoClicked = false;
    html5video.streamPlaying = false;
    html5video.incViewSent = false;
    var  cacheData = {};
    window.mvcur = window.mvcur || {};
    mvcur.mvData = mvcur.mvData || {};
    if (vars.no_flv) {
      each([240, 360, 480, 720], function() {
        if (vars['cache'+this]) {
          cacheData[this] = vars['cache'+this];
          delete vars['cache'+this];
        }
      });
    }
    vars.cacheData = cacheData;
    html5video.vars = vars;
    if (fixedWidth) {
      html5video.fixed_player_size = true;
      html5video.fixedWidth = fixedWidth;
      html5video.fixedHeight = fixedHeight;
    }

    ge(video_box_id).innerHTML = html5video.htmlCode();
    ge(video_box_id).style.padding = '0px';

    var actsEl = ge('video_actions'), is_ext = intval(vars.is_ext);
    if (!is_ext && !vars.nolikes && window.videoview && videoview.like) {
      ge('popup_actions').appendChild(se('<div id="vid_like" class="vid_like fl_r" onmouseover="html5video.likeOver()" onmouseout="html5video.likeOut()" onclick="html5video.likeClick()"><div id="vid_like_bg" class="vid_like_bg"></div><div id="vid_like_fg" class="vid_like_fg"></div></div>'));
      setStyle(ge('vid_like_bg'), {opacity: (vars.liked ? 0.7 : 0.45)});
      setStyle(ge('vid_like_fg'), {opacity: (vars.liked ? 1 : 0.65)});
      if (!vars.ads_link && window.videoview && videoview.getVideoCode) {
        ge('popup_actions').appendChild(se('<div id="vid_share" class="vid_share" onmouseover="html5video.shareOver()" onmouseout="html5video.shareOut()" onclick="html5video.shareClick()"><div id="vid_share_bg" class="vid_share_bg"></div><div id="vid_share_fg" class="vid_share_fg"></div></div>'));
      }
    }
    if (!is_ext && vars.ads_link) {
      ge('popup_actions').appendChild(se('<div id="vid_link" class="vid_link fl_r" onmouseover="html5video.linkOver()" onmouseout="html5video.linkOut()" onclick="html5video.linkClick()"><div id="vid_link_bg" class="vid_link_bg"></div><div id="vid_link_content"><div id="vid_link_fg" class="vid_link_fg"></div><div id="vid_link_text">' + (vars.lang_ads_link || 'Advertiser\'s Site') + '</div></div></div>'));
      var w = getSize(ge('vid_link_text'))[0];
      setStyle(ge('vid_link_bg'), {width: w + 48});
      setStyle(ge('vid_link'), {width: w + 48});
    }
    if (!is_ext && !vars.added && window.videoview && videoview.addSmall) {
      actsEl.insertBefore(se('<div id="add_btn" class="add fl_l" onmouseover="html5video.addOver(this, event)" onmouseout="html5video.addOut(this, event)" onclick="html5video.addVideo()"></div>'), ge('quality_btn'));
      html5video.actionsW += 33;
    }
    if (vars.can_rotate && this.transformAvailable()) {
      actsEl.insertBefore(se('<div id="rotate_btn" class="rotate fl_l" onmouseover="html5video.rotateOver(this, event)" onmouseout="html5video.rotateOut(this, event)" onclick="html5video.rotateVideo()"></div>'), ge('quality_btn'));
      html5video.actionsW += 34;
    }
    if (fullScreenApi.supportsFullScreen) {
      actsEl.insertBefore(se('<div id="fullscreen_btn" class="fullscreen fl_l" onmouseover="html5video.fullscreenOver(this, event)" onmouseout="html5video.fullscreenOut(this, event)" onclick="html5video.toggleFullscreen()"></div>'), ge('quality_btn'));
      if (fullScreenApi.fullScreenEventName == 'mozfullscreenchange') {
        addEvent(document, fullScreenApi.fullScreenEventName, html5video.updateFullscreen);
        cur.destroy.push(function() {
          removeEvent(document, fullScreenApi.fullScreenEventName, html5video.updateFullscreen);
        });
      } else {
        addEvent(ge('html5_player'), fullScreenApi.fullScreenEventName, html5video.updateFullscreen);
      }
      addEvent(ge('video_cont'), 'dblclick', html5video.toggleFullscreen);
      html5video.actionsW += 33;
    }
    if (!vars.nologo) {
      actsEl.appendChild(se('<div id="logo_btn" class="logo ' + (vars.is_vk ? 'vk ' : '') +  'fl_l" onmouseover="html5video.logoOver(this, event)" onmouseout="html5video.logoOut(this, event)" onclick="html5video.logoClick()"></div>'), ge('quality_btn'));
      html5video.actionsW += 35;
    }
    html5video.maxActionsW = html5video.actionsW;

    setStyle(actsEl, {minWidth: html5video.actionsW});

    ge('the_video').removeAttribute('controls', '');
    show('menu_bk', 'menu_controls')
    html5video.updVol();
    ge('video_title').innerHTML = decodeURIComponent(html5video.vars.md_title || '').replace(/\+/g, ' ');
    ge('video_author').innerHTML = decodeURIComponent(html5video.vars.md_author || '').replace(/\+/g, ' ');

    html5video.initVideoLinks();
    html5video.addVideoListeners();
    var pl = ge('html5_player');
    addEvent(pl, 'mouseover', html5video.showMenu);
    addEvent(pl, 'mouseout', html5video.hideMenu);
    if (html5video.fixed_player_size) {
      setStyle(pl.parentNode, {width: html5video.fixedWidth, height: html5video.fixedHeight});
    } else {
      setStyle(pl.parentNode, {width:'100%',height:'100%'});
    }
    html5video.centerPopup();
    html5video.updateActions();

    if (vars.thumb) {
      ge('the_video').parentNode.insertBefore(ce('img', {src: vars.thumb, id: 'video_thumb'}, {height: getSize(ge('html5_player'))[1], width: 'auto', margin: 'auto'}), ge('the_video'));
      hide('the_video');
    }
    html5video.updateRotation();
    var transition = {
      webkitTransition: 'all 200ms ease-in-out',
      msTransition: 'all 200ms ease-in-out',
      transition: 'all 200ms ease-in-out'
    };
    setStyle(ge('the_video'), transition);
    setStyle(ge('rotate_btn'), transition);

    if (vars.thumb) {
      setTimeout(setStyle.pbind(ge('video_thumb'), {
        webkitTransition: 'all 200ms ease-in-out',
        msTransition: 'all 200ms ease-in-out',
        transition: 'all 200ms ease-in-out'
      }), 200);
    }

    setInterval(function(){
      if (html5video.moveState != 1) { html5video.updTime(); }
    }, 100);
    if (vars.autoplay) {
      html5video.playVideo();
    }
  },

  initVideoLinks: function() {
    var linksCount = 0;
    if (this.vars.no_flv) {
      show('button240');
      this.max_res = 240;
      linksCount++;
    } else {
      re('button240');
    }
    if (this.vars.hd >= 1) {
      show('button360');
      this.max_res = 360;
      linksCount++;
    } else {
      re('button360');
    }
    if (this.vars.hd >= 2) {
      show('button480');
      this.max_res = 480;
      linksCount++;
    } else {
      re('button480');
    }
    if (this.vars.hd >= 3) {
      show('button720');
      this.max_res = 720;
      linksCount++;
    } else {
      re('button720');
    }
    setStyle(ge('quality_panel_wrap'), {top: -4 - linksCount * 20});
    setStyle(ge('quality_bk'), {height: linksCount * 20 - 10});

    this.changeQuality(360);
  },

  addVideoListeners: function() {
    var video = ge('the_video');
    video.volume = html5video.volume;

    addEvent(ge('video_cont'), 'mousewheel', html5video.docScroll);
    addEvent(video, 'loadstart', html5video.onLoadStart);
    addEvent(video, 'canplay', html5video.onCanPlay);
    addEvent(video, 'play', html5video.onPlay);
    addEvent(video, 'pause', html5video.onPause);
    addEvent(video, 'onerror', html5video.onErr);
    addEvent(video, 'durationchange', html5video.onDurationChange);
    addEvent(video, 'ended', html5video.onEnded);
  },

  pathToHD: function(res) {
    var vars = html5video.vars, host;
    if (vars.cacheData[res]) {
      return vars.cacheData[res];
    }
    if (typeof(vars.host) == 'string' && vars.host.substr(0, 4) == 'http') {
      host = vars.host;
    } else if (vars.proxy) {
      host = (vars.https ? 'https://' : 'http://') + vars.proxy + '.vk.me/c' + vars.host + '/';
    } else {
      host = 'http://cs' + vars.host + '.' + locDomain + '/';
    }

    if (vars.ip_subm) {
      return host + 'u' + vars.uid + '/videos/' + vars.vtag + '.' + res + '.mp4';
    }
    return host + 'u' + vars.uid + '/video/' + vars.vtag + '.' + res + '.mp4';
  },

  changeQuality: function(res, force) {
    if (res == html5video.cur_res) return;
    html5video.cur_res = res;
    html5video.onPause();
    ge('quality_val').innerHTML = res;
    ge('quality_label').innerHTML = res;
    each (geByTag('button', ge('quality_panel')), function() {
      removeClass(this, 'selected');
    });
    var b = ge('button' + res);
    if (b) {
      addClass(b, 'selected');
    }
    toggleClass(ge('popup1'), 'show_hd', html5video.cur_res < html5video.max_res);
    var video = ge('the_video');
    html5video.changeQualityTime = video.currentTime;
    video.pause();
    if (html5video.incViewTimer) {
      html5video.incViewTimer.pause();
    }
    if (video.currentTime) {
      hide('popup1');
      html5video.showLoading();
    }
    animate(ge('menu_layer'), {bottom: 46}, 200);
    animate(ge('popup_actions'), {opacity: 1}, 200);
    removeClass(video, 'no_cursor');
    video.src = html5video.pathToHD(res);
    if (this.videoClicked) {
      video.load();
    }
    var vars = html5video.vars, resInt = 0;
    if (window.videoCallback && vars.oid && vars.vid && vars.hash) {
      switch (res) {
        case 720: resInt = 3; break;
        case 480: resInt = 2; break;
        case 360: resInt = 1; break;
        case 240:
        default: resInt = 0; break;
      }
      videoCallback(['onVideoResolutionChanged', vars.oid, vars.vid, vars.hash, resInt]);
    }
    html5video.playStarted = false;
  },

  onResize: function() {
    html5video.centerPopup();
    html5video.calcPrLineW();
    html5video.updateActions();
    if (ge('video_thumb')) {
      setStyle(ge('video_thumb'), {height: getSize(ge('html5_player'))[1]});
    }
  },

  playVideo: function() {
    re('video_thumb');
    var video = ge('the_video'), vars = this.vars;
    show(video);
    if (!this.videoClicked) {
      video.load();
      this.videoClicked = true;
    }
    if (ge('vid_like')) setStyle('vid_like', {opacity: 1});
    if (ge('vid_link')) setStyle('vid_link', {opacity: 1});
    if (ge('vid_share')) setStyle('vid_share', {opacity: 1});
    if (!this.incViewTimer && video.duration) {
      this.incViewTimer = new VideoTimer(function() {
        if (window.videoCallback && !this.incViewSent && vars.oid && vars.vid && vars.hash) {
          this.incViewSent = true;
          videoCallback(['incViewCounter', vars.oid, vars.vid, vars.hash]);
        }
      }, video.duration * 500);
      this.incViewTimer.pause();
    }
    if (video.paused) {
      video.play();
      if (this.incViewTimer) {
        this.incViewTimer.resume();
      }
      if (window.videoCallback && !this.streamPlaying && vars.oid && vars.vid && vars.hash) {
        this.streamPlaying = true;
        videoCallback(['onVideoStreamPlaying', vars.oid, vars.vid, vars.hash]);
      }
    } else {
      video.pause();
      if (this.incViewTimer) {
        this.incViewTimer.pause();
      }
    }
  },

  showMenu: function(e) {
    html5video.inside = 1;
    animate(ge('menu_layer'), {bottom: 46}, 200);
    animate(ge('popup_actions'), {opacity: 1}, 200);
    removeClass(ge('the_video'), 'no_cursor');
  },

  hideMenu: function(e) {
    html5video.inside = 0;
    if (!ge('the_video').paused) {
      setTimeout(function(){
        if (html5video.inside == 0) {
          animate(ge('menu_layer'), {bottom: 0}, 200);
          animate(ge('popup_actions'), {opacity: 0}, 200);
          addClass(ge('the_video'), 'no_cursor');
        }
      }, 0);
    }
  },

  updateMenu: function() {
    if (html5video.fsHideTO) {
      clearTimeout(html5video.fsHideTO);
    }
    if (fullScreenApi.isFullScreen()) {
      var b = parseInt(getStyle(ge('menu_layer'), 'bottom'));
      if (b === 0) {
        html5video.showMenu();
      }
      html5video.fsHideTO = setTimeout(html5video.hideMenu, 1000);
    }
  },

  defX: function(e) {
    return intval(e.clientX + (window.scrollX || 0));
  },

  centerPopup: function() {
    var sz = getSize(ge('bg'));
    show('popup_bk','video_title','big_play','video_author');
    setStyle(ge('loading_gif2'), {
      left:(sz[0] - 64) / 2,
      top:(sz[1] - 16) / 2
    });
    setStyle(ge('popup1'), {
      position:'absolute',
      left:(sz[0] - 300) / 2,
      top:(sz[1] - 136) / 2
    });
  },

  addZero: function(s) {
    s = intval(s);
    return (s < 10) ? '0' + s : s;
  },

  formatTime: function(sec) {
    var s, m, h;
    s = parseInt(sec);
    m = parseInt(s / 60); s %= 60;
    h = parseInt(m / 60); m %= 60;
    return (h > 0 ? h + ':' + html5video.addZero(m) : m) + ':' + html5video.addZero(s);
  },

  updTime: function() {
    var video = ge('the_video');
    if (video) {
      var c = video.currentTime || 0, d = video.duration || 0,
          percent = Math.min(100, Math.max(0, (d > 0 ? 100 * c / d : 0)));
      setStyle(ge('progress_line'), {width: percent + '%'});
      ge('curtime').innerHTML = html5video.formatTime(c);
      ge('duration').innerHTML = html5video.formatTime(d);
    }
  },

  updVol: function() {
    var vol = html5video.volume;
    var vb = ge('volume_button');
    if (vol > .5) { vb.setAttribute('value', 'max'); } else
    if (vol > .2) { vb.setAttribute('value', 'ave'); } else
    if (vol > 0)  { vb.setAttribute('value', 'min'); } else {
      vb.setAttribute('value', 'off');
    }
    setStyle(ge('volume_line'), {width: Math.min(100, Math.max(0, vol * 100)) + '%'});
    ge('the_video').volume = vol;
  },

  changeVol: function(delta) {
    var volume = this.volume + delta * this.volStep;
    this.volume = Math.min(1, Math.max(0, volume));
    this.updVol();
    this.showTip(Math.round(this.volume * 100) + '%', getXY(ge('volume_line'))[0] + getSize('volume_line')[0] - getXY(ge('html5_player'))[0], 4);
  },

  changePr: function(delta) {
    var video = ge('the_video'), time = (video.currentTime || 0) + delta * this.prStep;
    video.currentTime = Math.min(video.duration || 0, Math.max(0, time));
    this.updTime();
  },

  showLoading: function() {
    toggle('video_cont', !this.notLoaded);
    toggle('loading_gif2', !!this.notLoaded);
  },

  calcPrLineW: function() {
    html5video.prLineW = getSize(ge('pr_back_line'))[0];
    html5video.updTime();
  },

  updateActions: function() {
    var btns = ['quality_btn', 'fullscreen_btn', 'rotate_btn', 'add_btn'], btnsW = {
      'quality_btn': 31,
      'fullscreen_btn': 33,
      'rotate_btn': 34,
      'add_btn': 33
    };
    var actsEl = ge('video_actions');
    for (var i in btns) {
      show(btns[i]);
    }
    html5video.actionsW = html5video.maxActionsW;
    setStyle(actsEl, {minWidth: html5video.actionsW});
    html5video.calcPrLineW();
    if (html5video.prLineW < html5video.minPrW) {
      for (var i in btns) {
        hide(btns[i]);
        html5video.actionsW -= btnsW[btns[i]];
        setStyle(actsEl, {minWidth: html5video.actionsW});
        html5video.calcPrLineW();
        if (html5video.prLineW >= html5video.minPrW) {
          break;
        }
      }
    }
  },

  htmlCode: function() {
    return '\
  <div id="html5_player">\
    <div id="bg" class="bg" onclick="html5video.playVideo()">\
      <div id="loading_gif2" class="loading_gif2"></div>\
      <div id="video_cont">\
        <video id="the_video" width="100%" height="100%" onloadedmetadata="html5video.onMetadata()" preload="none"' + (this.vars.jpg ? ' poster="' + this.vars.jpg + '"' : '') +'>\
          HTML5 not supported.<br>\
        </video>\
      </div>\
    </div>\
    <div id="menu_layer">\
      <div id="menu_bk"></div>\
        <div id="menu_controls">\
          <div id="video_tip_wrap">\
            <div id="video_tip_bk"></div>\
            <div id="video_tip"></div>\
            <div id="video_tip_arrow"></div>\
          </div>\
          <table border="0" cellpadding="0" cellspacing="0" ondragstart="cancelEvent(event); return false" onstartselect="cancelEvent(event); return false">\
            <tr>\
              <td style="padding:16px 10px 0px 21px">\
                <div id="play_button" class="play_button" onmouseover="animate(this, {opacity: 0.7}, 200)" onmouseout="animate(this, {opacity: 1}, 200)" onclick="html5video.playVideo()"></div>\
              </td>\
              <td width="100%" style="padding-top: 3px;">\
                <table width="100%" border="0" cellpadding="1" cellspacing="0">\
                  <tr>\
                    <td></td>\
                    <td width="100%"></td>\
                    <td>\
                      <div id="curtime" class="time1_text">0:00</div>\
                    </td>\
                    <td>\
                      <div id="duration" class="time2_text">0:00</div>\
                    </td>\
                  </tr>\
                  <tr>\
                    <td colspan="4" class="pr_td">\
                      <div id="vid_pr" onmouseover="html5video.sliderOver(this, event)" onmouseout="html5video.sliderOut(this, event)" onmousedown="html5video.prClick(event)">\
                        <div id="pr_white_line" class="white_line"></div>\
                        <div id="pr_back_line" class="back_line"><!-- --></div>\
                        <div id="pr_load_line" class="load_line"><!-- --></div>\
                        <div id="progress_line" class="progress_line">\
                          <div id="progress_slider" class="slider"><!-- --></div>\
                        </div>\
                      </div>\
                    </td>\
                  </tr>\
                </table>\
              </td>\
              <td style="padding:17px 0 0px 20px">\
                <div id="volume_button" class="volume_button" value="ave" onmouseover="html5video.volumeBtnOver(this, event)" onmouseout="html5video.volumeBtnOut(this, event)" onclick="html5video.onVolumeBut()"></div>\
              </td>\
              <td style="padding:22px 13px 0 0">\
                <div id="vid_vol" onmouseover="html5video.sliderOver(this, event)" onmouseout="html5video.sliderOut(this, event)" onmousedown="html5video.volClick(event)">\
                  <div id="vol_white_line" class="white_line"><!-- --></div>\
                  <div id="vol_back_line" class="load_line"><!-- --></div>\
                  <div id="volume_line" class="progress_line">\
                    <div id="volume_slider" class="slider"><!-- --></div>\
                  </div>\
                </div>\
              </td>\
              <td style="padding:14px 10px 5px 5px">\
                <div id="video_actions" class="clear_fix">\
                  <div id="quality_btn" class="quality_button fl_l" onclick="html5video.toggleResMenu()">\
                    <div id="quality_val" class="quality_val" onmouseover="html5video.qualityOver(this, event)" onmouseout="html5video.qualityOut(this, event)">360</div>\
                    <div id="quality_panel_wrap" class="quality_panel_wrap fl_l" onmouseover="html5video.unhideResMenu()" onmouseout="html5video.hideResMenu()">\
                      <div id="quality_bk" class="quality_bk"></div>\
                      <div id="quality_panel" class="quality_panel">\
                        <button id="button720" value="720p" onclick="html5video.changeQuality(720);"><span>720</span></button>\
                        <button id="button480" value="480p" onclick="html5video.changeQuality(480);"><span>480</span></button>\
                        <button id="button360" value="360p" onclick="html5video.changeQuality(360);" class="selected"><span>360</span></button>\
                        <button id="button240" value="240p" onclick="html5video.changeQuality(240);"><span>240</span></button>\
                        <div id="quality_label">360</button>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </td>\
            </tr>\
          </table>\
        </div>\
      </div>\
      <div id="popup1" onclick="html5video.playVideo()">\
        <div id="popup_bk" class="popup_bk"></div>\
        <div id="video_title" class="video_title">Title</div>\
        <div id="big_play" class="big_play" onmouseover="addClass(this, \'over\');" onmouseout="removeClass(this, \'over\');"></div>\
        <div id="video_author" class="video_author">Author</div>\
        <div id="video_show_hd" class="video_show_hd" onclick="return html5video.playHD()">' + (this.vars.video_play_hd || 'Play HD') + '</div>\
      </div>\
      <div id="popup_actions" class="clear_fix"></div>\
     </div>';
  },

  transformAvailable: function() {
    if (cur.transformAvailable !== undefined) {
      return cur.transformAvailable;
    }
    var prefixes = 'Webkit Moz o ms'.split(' '),
        prefix,
        div = ce('div'), i=0,
        prop = 'transform',
        support = div.style[prop] != undefined;

    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    while (!support && (prefix = prefixes[i++])) {
      support = div.style[prefix + prop] != undefined;
    }
    if (window._ua && /yabrowser/i.test(_ua)) {
      support = false; // fix for YaBrowser
    }
    cur.transformAvailable = support;
    return support;
  },

  showTip: function(text, x, offsetY) {
    ge('video_tip').innerHTML = text;
    show('video_tip_wrap');
    var w = getSize('video_tip')[0], s = getSize('html5_player')[0],
        l = x - w / 2, a = w / 2 - 3;
    if (l + w > s - 10) {
      a -= s - w - l - 10;
      l = s - w - 10;
    }
    offsetY = intval(offsetY);
    setStyle(ge('video_tip_bk'), {width: w, height: 13 - offsetY});
    setStyle(ge('video_tip_wrap'), {left: l, top: -13 + offsetY});
    setStyle(ge('video_tip_arrow'), {left: a});
    if (html5video.tipTO) {
      clearTimeout(html5video.tipTO);
    }
    html5video.tipTO = setTimeout(html5video.hideTip, 1000);
  },

  hideTip: function() {
    hide('video_tip_wrap');
  },

  toggleResMenu: function() {
    var s = isVisible(ge('quality_panel_wrap'));
    toggle('quality_panel_wrap', !s);
    toggle('quality_val', s);
  },

  hideResMenu: function() {
    clearTimeout(html5video.hideMenuTO);
    html5video.hideMenuTO = setTimeout(function() {
      hide('quality_panel_wrap');
      show('quality_val');
    }, 1000);
  },

  unhideResMenu: function() {
    if (html5video.hideMenuTO) {
      clearTimeout(html5video.hideMenuTO);
    };
  },

  updateFullscreen: function() {
    html5video.updateActions();
    toggleClass(ge('fullscreen_btn'), 'isfs', fullScreenApi.isFullScreen());
  },

  toggleFullscreen: function() {
    if (fullScreenApi.supportsFullScreen) {
      if (fullScreenApi.isFullScreen()) {
        fullScreenApi.cancelFullScreen();
      } else {
        fullScreenApi.requestFullScreen(ge('html5_player'));
      }
    }
    return false;
  },

  playHD: function() {
    this.changeQuality(this.max_res);
    this.playHDClicked = true;
    return false;
  },

  likeClick: function() {
    var vars = this.vars, is_ext = intval(vars.is_ext);
    if (is_ext || vars.nolikes || !window.videoview || !videoview.like || !videoview.likeOut) {
      return;
    }
    videoview.like();
    videoview.likeOut();
    this.vars.liked = !this.vars.liked;
    if (this.vars.liked) {
      setStyle(ge('vid_like_bg'), {opacity: 0.7});
      setStyle(ge('vid_like_fg'), {opacity: 1});
      var el = ge('vid_like_fg');
      el.innerHTML = '<img class="vid_like_ah" width="20" height="18" src="/images/video/like_icon_2x.png" />';
      var img = el.firstChild;
      animate(img, {marginLeft: -10, marginTop: -7, width: 40, height: 36, opacity: 0}, {duration: 600, transition: Fx.Transitions.easeOutCubic, onComplete: re.pbind(img)});
    } else {
      animate(ge('vid_like_bg'), {opacity: 0.6}, 200);
      animate(ge('vid_like_fg'), {opacity: 0.8}, 200);
    }
  },

  linkClick: function() {
    var vars = this.vars, video = ge('the_video');
    if (!vars.ads_link) return;
    if (!video.paused)  {
      this.playVideo();
    }
    window.open(vars.ads_link, '_blank');
    window.focus();
  },

  shareClick: function() {
    var vars = this.vars;
    if (!vars.oid || !vars.vid || !window.videoview || !videoview.getVideoCode) {
      return;
    }
    if (fullScreenApi.isFullScreen()) {
      html5video.toggleFullscreen();
    }
    videoview.getVideoCode(vars.oid, vars.vid);
  },

  logoClick: function() {
    var vars = this.vars, video = ge('the_video');
    if (!vars.oid || !vars.vid) {
      return;
    }
    if (!video.paused)  {
      this.playVideo();
    }
    window.open('/video' + vars.oid + '_' + vars.vid, '_blank');
    window.focus();
  },

  rotateVideo: function() {
    if (!this.transformAvailable()) return;
    this.angle += 90;
    this.updateRotation();
  },

  addVideo: function() {
    var vars = this.vars, is_ext = intval(vars.is_ext);
    if (is_ext || vars.added || !vars.oid || !vars.vid || !vars.add_hash || !window.videoview || !videoview.addSmall) {
      return;
    }
    videoview.addSmall(vars.oid + '_' + vars.vid, vars.add_hash);
    addClass(ge('add_btn'), 'added');
    this.vars.added = 1;
    this.addOver(ge('add_btn'), window.event);
  },

  updateRotation: function() {
    if (!this.transformAvailable()) return;
    var video = ge('the_video'), img = ge('video_thumb'), btn = ge('rotate_btn'),
        xy = getSize('html5_player'), s = this.angle % 180 ? xy[1] / xy[0] : 1;
    video.style.webkitTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
    video.style.msTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
    video.style.MozTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
    video.style.transform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';

    if (img) {
      img.style.webkitTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
      img.style.msTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
      img.style.MozTransform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
      img.style.transform = 'rotate('+this.angle+'deg) scale('+s+', '+s+')';
    }

    btn.style.webkitTransform = 'rotate('+this.angle+'deg)';
    btn.style.msTransform = 'rotate('+this.angle+'deg)';
    btn.style.MozTransform = 'rotate('+this.angle+'deg)';
    btn.style.transform = 'rotate('+this.angle+'deg)';
  },

  // event listeners

  onMetadata: function() {
    var video = ge('the_video'), player = ge('html5_player'), bg = ge('bg');
    var vars = html5video.vars, ratio = video.videoWidth / video.videoHeight;
    var w = '100%', h = '100%';
    bg.style.height = h;
    video.style.height = h;
    bg.style.width = w;
    video.style.width = w;
    if (html5video.fixed_player_size) {
      w = html5video.fixedWidth;
      h = html5video.fixedHeight;
    }
    ge(video_box_id).style.height = h;
    ge(video_box_id).style.width = w;
    var box = document.getElementsByClassName('popup_box_container')[0];
    if (box) {
      box.style.width = (html5video.cur_res > 240) ? '629px' : '502px';
    }
    html5video.updateActions();
    html5video.centerPopup();
    animate(ge('menu_layer'), {bottom: 46}, 200);
    animate(ge('popup_actions'), {opacity: 1}, 200);
    removeClass(video, 'no_cursor');
  },

  onDurationChange: function() {
    html5video.updTime();
  },

  onErr: function(e) {
    alert('Video loading error: ' + e.target.error.code);
  },

  onPlay: function() {
    html5video.showLoading();
    ge('play_button').className = 'pause_button';
    hide('popup1');
  },

  onPause: function() {
    if (ge('play_button')) ge('play_button').className = 'play_button';
    show('popup1');
  },

  onProgress: function() {
    var video = ge('the_video'), ratio = 0;
    if (video.duration && video.buffered.length > 1) {
      ratio = video.buffered.end(0) / video.duration;
    }
    if (ratio === 0 && video.currentTime > 0) {
      ratio = 1; // hack for chrome
    }
    if (ratio < 1) {
      setTimeout(html5video.onProgress, 50);
    }
    ratio = Math.min(100, Math.max(0, ratio * 100));
    setStyle(ge('pr_load_line'), {width: ratio + '%'});
  },

  onLoadStart: function() {
    html5video.notLoaded = 1;
    html5video.onProgress();
  },

  onCanPlay: function() {
    html5video.notLoaded = 0;
    html5video.showLoading();
    var video = ge('the_video'), vars = html5video.vars;
    if (html5video.changeQualityTime) {
      video.currentTime = html5video.changeQualityTime;
      show(video);
      delete html5video.changeQualityTime;
      video.play();
      if (html5video.incViewTimer) {
        html5video.incViewTimer.resume();
      }
    } else if (html5video.playHDClicked) {
      show(video);
      delete html5video.playHDClicked;
      video.play();
      if (html5video.incViewTimer) {
        html5video.incViewTimer.resume();
      }
    }
    if (window.videoCallback && !html5video.playStarted && vars.oid && vars.vid && vars.hash) {
      html5video.playStarted = true;
      videoCallback(['onVideoPlayStarted', vars.oid, vars.vid, vars.hash]);
    }
  },

  onEnded: function() {
    ge('the_video').pause();
    if (html5video.incViewTimer) {
      html5video.incViewTimer.pause();
    }
    ge('the_video').currentTime = 0;
    html5video.updTime();
    setStyle(ge('menu_layer'), {bottom: 46});
    setStyle(ge('popup_actions'), {opacity: 0});
    removeClass(ge('the_video'), 'no_cursor');
    if (fullScreenApi.isFullScreen()) {
      html5video.toggleFullscreen();
    }
  },

  prClick: function(event) {
    if (checkEvent(event)) return;
    html5video.onPrMove(event);
    html5video.moveState = 1;
  },

  volClick: function(event) {
    html5video.onVolMove(event);
    html5video.moveState = 2;
  },

  onPrMove: function(e) {
    var xy = getXY(ge('progress_line')), video = ge('the_video'),
        percent = html5video.prLineW ? (html5video.defX(e) - xy[0] + (fullScreenApi.isFullScreen() ? getXY(ge('html5_player'))[0] : 0)) / html5video.prLineW : 0;
    percent = Math.min(1, Math.max(0, percent));
    video.currentTime = video.duration * percent;
    html5video.updTime();
  },

  onVolMove: function(e) {
    var xy = getXY(ge('volume_line')), video = ge('the_video'),
        percent = html5video.volLineW ? (html5video.defX(e) - xy[0] + (fullScreenApi.isFullScreen() ? getXY(ge('html5_player'))[0] : 0)) / html5video.volLineW : 0;
    percent = Math.min(1, Math.max(0, percent));
    html5video.volume = percent;
    html5video.updVol();
    html5video.showTip(Math.round(percent * 100) + '%', getXY(ge('volume_slider'))[0] - getXY(ge('html5_player'))[0] + 3, 4);
  },

  onVolumeBut: function() {
    if (html5video.volume > 0) {
      html5video.lastVolume = html5video.volume;
      html5video.volume = 0;
    } else {
      html5video.volume = html5video.lastVolume;
    }
    html5video.updVol()
    html5video.volumeBtnOver(ge('volume_button'), window.event);
  },

  sliderOver: function(el, event) {
    addClass(el, 'over');
  },

  sliderOut: function(el, event) {
    removeClass(el, 'over');
    this.hideTip();
  },

  likeOver: function() {
    if (this.vars.liked) return;
    animate(ge('vid_like_bg'), {opacity: 0.6}, 200);
    animate(ge('vid_like_fg'), {opacity: 0.8}, 200);
  },

  likeOut: function() {
    if (this.vars.liked) return;
    animate(ge('vid_like_bg'), {opacity: 0.45}, 200);
    animate(ge('vid_like_fg'), {opacity: 0.65}, 200);
  },

  shareOver: function() {
    animate(ge('vid_share_bg'), {opacity: 0.7}, 200);
    animate(ge('vid_share_fg'), {opacity: 1}, 200);
  },

  shareOut: function() {
    animate(ge('vid_share_bg'), {opacity: 0.45}, 200);
    animate(ge('vid_share_fg'), {opacity: 0.65}, 200);
  },

  linkOver: function() {
    animate(ge('vid_link_bg'), {opacity: 0.7}, 200);
    animate(ge('vid_link_content'), {opacity: 1}, 200);
  },

  linkOut: function() {
    animate(ge('vid_link_bg'), {opacity: 0.45}, 200);
    animate(ge('vid_link_content'), {opacity: 0.65}, 200);
  },

  volumeBtnOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var vol = ge('the_video').volume, vars = this.vars,
        label = vol > 0 ? vars.lang_volume_off || 'Mute' : vars.lang_volume_on || 'Unmute';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 7);
  },

  volumeBtnOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  addOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var vars = this.vars,
        label = vars.added ? vars.lang_added || 'Video added' : vars.lang_add || 'Add video';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 6);
  },

  addOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  rotateOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var label = this.vars.lang_rotate || 'Rotate';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 7);
  },

  rotateOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  fullscreenOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var vars = this.vars,
        label = fullScreenApi.isFullScreen() ? vars.lang_window || 'Minimize' : vars.lang_fullscreen || 'Full Screen';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 7);
  },

  fullscreenOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  qualityOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var label = this.vars.lang_hdsd || 'Change Video Quality';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 8);
  },

  qualityOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  logoOver: function(el, event) {
    animate(el, {opacity: 0.7}, 200);
    var label = vars.goto_orig_video || 'Go to original video';
    this.showTip(label, getXY(el)[0] - getXY(ge('html5_player'))[0] + 6);
  },

  logoOut: function(el, event) {
    animate(el, {opacity: 1}, 200);
    this.hideTip();
  },

  docKeyPressed: function(event) {
    var video = ge('the_video');
    if (!video) return;
    switch (event.keyCode) {
      case KEY.DOWN:  html5video.changeVol(-1); break;
      case KEY.UP:    html5video.changeVol(1);  break;
      case KEY.LEFT:  html5video.changePr(-1);  break;
      case KEY.RIGHT: html5video.changePr(1);   break;
      case KEY.SPACE:
        if (html5video.inside) {
          html5video.playVideo();
        }
        break;
    }
    if (html5video.inside) {
      cancelEvent(event);
    }
    html5video.updateMenu();
  },

  docScroll: function(event) {
    var delta = ((event.wheelDelta) ? event.wheelDelta / 120 : event.detail / -3);
    html5video.changeVol(delta > 0 ? 1 : -1);
    html5video.updateMenu();
  },

  docMouseUp: function() {
    html5video.moveState = 0;
  },

  docMouseMove: function(event) {
    if (html5video.moveState == 1) { html5video.onPrMove(event); } else
    if (html5video.moveState == 2) { html5video.onVolMove(event); }
    if (hasClass(ge('vid_pr'), 'over') && ge('the_video').duration) {
      var xy = getXY(ge('progress_line')), video = ge('the_video'),
          x = html5video.defX(event) - xy[0] + (fullScreenApi.isFullScreen() ? getXY(ge('html5_player'))[0] : 0),
          percent = html5video.prLineW ? x / html5video.prLineW : 0;
      percent = Math.min(1, Math.max(0, percent));
      html5video.showTip(html5video.formatTime(video.duration * percent), x + xy[0] - getXY('html5_player')[0], 4);
    }
    html5video.updateMenu();
  }
};

function VideoTimer(callback, delay) {
  var timerId, start, remaining = delay;

  this.pause = function() {
    window.clearTimeout(timerId);
    remaining -= new Date() - start;
  };

  this.resume = function() {
    start = new Date();
    timerId = window.setTimeout(callback, remaining);
  };

  this.resume();
}

(function() {
  var fullScreenApi = {
        supportsFullScreen: false,
        isFullScreen: function() { return false; },
        requestFullScreen: function() {},
        cancelFullScreen: function() {},
        fullScreenEventName: '',
        prefix: ''
      },
      browserPrefixes = 'webkit moz o ms khtml'.split(' ');

  if (typeof document.cancelFullScreen != 'undefined') {
    fullScreenApi.supportsFullScreen = true;
  } else {
    for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
      fullScreenApi.prefix = browserPrefixes[i];
      if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
        fullScreenApi.supportsFullScreen = true;
        break;
      }
    }
  }

  if (fullScreenApi.supportsFullScreen) {
    fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';

    fullScreenApi.isFullScreen = function() {
      switch (this.prefix) {
        case '':
          return document.fullScreen;
        case 'webkit':
          return document.webkitIsFullScreen;
        default:
          return document[this.prefix + 'FullScreen'];
      }
    }
    fullScreenApi.requestFullScreen = function(el) {
      return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
    }
    fullScreenApi.cancelFullScreen = function() {
      return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
    }
  }
  window.fullScreenApi = fullScreenApi;
})();

try{stManager.done('html5video.js');}catch(e){}
