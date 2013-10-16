var Audio = {
  address: '/audio',
  scrollnode: browser.msie6 ? pageNode : window,
  fixedScroll: !(browser.msie && browser.version < 8 || browser.mobile),
  init: function(obj, audioTpl) {
    extend(cur, {
      searchCont: ge('audio_search'),
      aSearch: ge('s_search'),
      clearSearch: ge('audio_query_reset'),
      aContent: ge('initial_list'),
      sContent: ge('search_list'),
      sPreload: ge('search_preload'),
      showMore: ge('more_link'),
      sShowMore: ge('s_more_link'),
      sWrap: ge('audio_search_wrap'),
      sSummary: ge('audio_search_summary'),
      albumFilters: ge('album_filters'),
      albumFiltered: ge('album_filtered'),
      searchFilters: ge('audio_search_filters'),
      popularFilters: ge('audio_popular_filters'),
      popularOwners: ge('audio_popular_owners'),
      audioFriends: ge('audio_friends'),
      audioAlbums: ge('audio_albums'),
      audioAlbumsWrap: ge('audio_albums_wrap'),
      audioWrap: ge('audio_wrap'),
      searchInfoCont: ge('audio_search_info'),
      searchStr: "",
      autoComplete: 1,
      audioTpl: audioTpl,
      audioEl: {
        head: ge('page_header'),
        bar: ge('ac'),
        cont: ge('audio'),
        filters: ge('side_filters')
      }
    });

    if (ge('ac') && window.audioPlayer) {
      audioPlayer.initEvents();
      audioPlayer.registerPlayer('ac', {
        container: ge('ac'),
        performer: ge('ac_performer'),
        title: ge('ac_title'),
        titleWrap: ge('ac_name'),
        duration: ge('ac_duration'),
        load: ge('ac_load_line'),
        progress: ge('ac_pr_line'),
        progressArea: ge('ac_pr'),
        volume: ge('ac_vol_line'),
        volumeArea: ge('ac_vol'),
        play: ge('ac_play'),
        prev: ge('ac_prev'),
        next: ge('ac_next'),
        add: ge('ac_add'),
        repeat: ge('ac_repeat'),
        shuffle: ge('ac_shuffle'),
        rec: ge('ac_rec'),
        status: ge('ac_status'),
        fixed: !(browser.msie && browser.version < 8 || browser.mobile)
      });
    }
    if (browser.mobile) {
      hide('ac_vol');
      setStyle('ac_duration', {margin: 0});
    }

    if (!cur.allAudiosIndex) cur.allAudiosIndex = 'all';

    extend(cur, obj);
    cur.module = 'audio';
    //cur.disableAutoMore = true;
    if (cur.aSearch) {
      cur.aSearch.value = cur.q;
      toggleClass(cur.clearSearch, 'shown', !!cur.q);
      placeholderSetup(cur.aSearch, {back: true});
      setTimeout(function() {
        cur.aSearch.focus();
      }, 0);
    }

    Audio.scrollnode = browser.msie6 ? pageNode : window;
    Audio.fixedScroll = !(browser.msie && browser.version < 8 || browser.mobile);
    window.scrollTop = bodyNode.scrollTop = pageNode.scrollTop = htmlNode.scrollTop = 0;
    Audio.startEvents();
    cur.destroy.push(function() {
      Audio.stopEvents();
    });

    cur.nav.push(function(changed, old, n) {
      if (changed.act == 'popular') {
        Audio.loadPopular(true, intval(n.genre));
        return false;
      }
    });


    var _a = window.audioPlayer;
    if (_a && _a.showCurrentTrack) {
      _a.shuffle = false;
      _a.showCurrentTrack();
    }

    cur.audios = {};
    hide(cur.sContent);

    cur.silent = true;
    var query = {act: 'load_audios_silent', id: (cur.allAudiosIndex == 'all' ? cur.id : cur.audioFriend), gid: cur.gid, claim: nav.objLoc.claim, please_dont_ddos: 2};
    if (cur.allAudiosIndex != 'all') {
      Audio.cacheFriendsList();
    }
    if (cur.club) {
      cur.curSection = 'club' + cur.club;
      query.club = cur.club;
      cur.searchStr = cur.q;
    }
    ajax.post(Audio.address, query, {onDone: (function(data, opts) {
      opts = eval('('+opts+')');
      if (opts.exp) {
        _a.statusExport = opts.exp;
        checkbox('currinfo_audio', (_a.hasStatusExport()));
        if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
        delete opts.exp;
      }
      extend(cur, opts);
      if (cur.hashes && cur.hashes.add_hash && !_a.addHash) {
        _a.addHash = cur.hashes.add_hash;
      }
      if (query.id > 0) {
        cur.allFriendsTitles = cur.allFriendsTitles || {};
        cur.allFriendsTitles[query.id] = opts.summaryLang.all_friend_title;
        cur.allFriendsHTitles = cur.allFriendsHTitles || {};
        cur.allFriendsHTitles[query.id] = opts.summaryLang.all_friend_htitle;
      }
      var obj = eval('('+data+')');
      if (!obj) {
        return;
      }
      cur.audiosList = cur.audiosList || {};
      if ((query.club || query.id < 0) && obj.club) {
        var club = query.club || -query.id;
        cur.allClubsHTitles = cur.allClubsHTitles || {};
        cur.allClubsHTitles[club] = opts.summaryLang.all_club_htitle || cur.htitle;
        cur.allFriendsHTitles = cur.allFriendsHTitles || {};
        cur.allFriendsHTitles[-club] = opts.summaryLang.all_club_htitle || cur.htitle;
        cur.curList = 'club' + club;
        cur.audiosList[cur.curList] = obj.club;
      } else {
        cur.curList = (cur.album_id) ? 'album'+cur.album_id : cur.allAudiosIndex;
      }
      cur.searchOffset = 0;
      cur.audiosList[cur.allAudiosIndex] = obj.all ? obj.all : [];
      if (cur.allAudiosIndex == 'all') Audio.generateAlbums();
      cur.sectionCount = (cur.audiosList[cur.curList] || []).length;
      if (cur.canEdit && nav.objLoc.act != 'popular' && nav.objLoc.act != 'recommendations' && nav.objLoc.act != 'feed' && !browser.mobile && cur.allAudiosIndex == 'all' && !cur.shuffled && !cur.club) {
        if (cur.sectionCount) {
          var opts = {onReorder: Audio.onAudioReorder, onMouseDown: Audio.onDragStart, onMouseUp: Audio.onDragEnd, noMoveCursor: 1};
          if (cur.audioAlbumsWrap) {
            extend(opts, {target: cur.audioAlbumsWrap, onDragOver: Audio.onDragOver, onDragOut: Audio.onDragOut});
          }
          sorter.init(cur.aContent, opts);
        }
      }
      if (cur.albums) {
        Audio.initAlbumsSort();
      }
      this.indexAll(function() {
        cur.silent = false;
        if (cur.onSilentLoad) {
          cur.onSilentLoad();
        }
        if (!cur.q || cur.club) {
          if (cur.curSection == 'recommendations' || cur.curSection == 'popular' || cur.curSection == 'feed') {
            if (cur[cur.curSection+'Audios']) {
              var k = 0;
              for (var i in cur[cur.curSection+'Audios']) {
                cur[cur.curSection+'Audios'][i]._order = k++;
              }
              audioPlayer.genPlaylist(cur[cur.curSection+'Audios'], false);
            }
          } else {
            audioPlayer.genPlaylist(cur.audiosList[cur.curList], false, cur.curList == 'all' && cur.oid == vk.id);
          }
        } else if (!query.club) {
          Audio.selectPerformer(null, cur.q);
        }
        if (cur.audio_id) {
          var audio = cur.audios[cur.audio_id];
          if (audio) {
            var audio_id = audio[0] + '_' + audio[1];
            if (audio[11] && parseInt(audio[11])) {
              var claim = parseInt(audio[11]) || 0;
              if (claim == -2) claim = 0;
              Audio.showAudioClaimWarning(audio_id, claim, audio[5] + ' &ndash; ' + audio[6]);
            } else {
              try{
                playAudioNew(audio_id);
              }catch(e){};
            }
          }
        }
      });
    }).bind(this), local: 1});
  },

  startEvents: function() {
    addEvent(Audio.scrollnode, 'scroll', Audio.scrollCheck);
    addEvent(window, 'resize', Audio.scrollCheck);
    addEvent(cur.aSearch, 'blur', Audio.searchBlur);
    addEvent(cur.aSearch, 'focus', Audio.searchFocus);
    cur.gpHidden = true;
    toggleGlobalPlayer(false);
    if (Audio.fixedScroll) {
      var els = geByClass('top_info_wrap', ge('page_wrap'));
      each(els, function() { hide(this); });
      hide(_stlSide);
      setTimeout(function() {
        each(els, function() { hide(this); });
        hide(_stlSide);
      }, 110);
      var headH = cur.audioEl.head.clientHeight,
          headT = getXY(cur.audioEl.head)[1],
          audioNavH = cur.audioEl.bar.offsetHeight,
          headW = cur.audioEl.head.clientWidth,
          contentY = headH + audioNavH;
      setStyle(cur.audioEl.head, {width: headW, top: headT});
      setStyle('side_bar', {top: headH + headT});
      setStyle(cur.audioEl.bar, {top: headH + headT});
      setStyle(cur.audioEl.cont, {paddingTop: contentY});
      setStyle(cur.audioEl.filters, {top: contentY});

      addClass(bodyNode, 'audio_fixed_nav');
      _fixedNav = true;
    }
    Audio.updateAlbumsTitles();
    Audio.handleFilterPos();
  },

  stopEvents: function() {
    removeEvent(Audio.scrollnode, 'scroll', Audio.scrollCheck);
    removeEvent(window, 'resize', Audio.scrollCheck);
    removeEvent(cur.aSearch, 'blur', Audio.searchBlur);
    removeEvent(cur.aSearch, 'focus', Audio.searchFocus);
    if (Audio.fixedScroll) {
      var els = geByClass('top_info_wrap', ge('page_wrap'));
      each(els, function() { show(this); });
      setStyle(cur.audioEl.head, {width: '', top: ''});
      setStyle('side_bar', {top: ''});

      removeClass(bodyNode, 'audio_fixed_nav');
      _fixedNav = false;

      show(_stlSide);
    }
    audioPlayer.deregisterPlayer('ac');
    setTimeout(function() {
      toggleGlobalPlayer(true);
      updGlobalPlayer();
    }, 100);
  },

  searchFocus: function() {
    var alist = ge('audios_list');
    if (!hasClass(alist, 'light')) addClass(alist, 'light');
  },

  searchBlur: function() {
    var alist = ge('audios_list');
    if (hasClass(alist, 'light')) removeClass(alist, 'light');
  },

  clearSearch: function(el, event) {
    setStyle(el, {opacity: .6});
    cur.aSearch.focus();
    if (cur.allAudiosIndex == 'all') {
      Audio.loadAlbum(0);
    } else {
      this.filterTimeout = setTimeout((function() {
        val(cur.aSearch, '');
        removeClass(cur.clearSearch, 'shown');
        this.updateList(null, cur.aSearch);
        this.hideSearchResults();
        scrollToTop();
      }).bind(this), 10);
    }
    if (isVisible(cur.searchInfoCont)) {
      hide(cur.searchInfoCont);
    }
  },

  updateSorterRows: function(fromEl) {
    if (fromEl && fromEl.parentNode.sorter){
      sorter.update(fromEl);
    }
  },

  showLyrics: function(id, lid, top) {
    var lyrics_div = ge('lyrics'+id);
    if (!isVisible(lyrics_div)) {
      show(lyrics_div);
      lyrics_div.innerHTML = "<div style='text-align: center; height: 50px; padding: 30px 10px 10px 10px'><img valign='middle' src='/images/progress7.gif'></div>";
      Audio.updateSorterRows(ge('audio'+id));
      ajax.post(Audio.address, {act: 'get_lyrics', lid: lid, aid: id, top: top ? 1 : 0}, {cache: 1, onDone: (function(responseText) {
          lyrics_div.innerHTML = responseText;
          Audio.updateSorterRows(ge('audio'+id));
        }).bind(this)});
    } else {
      lyrics_div.innerHTML = "";
      hide(lyrics_div);
      Audio.updateSorterRows(ge('audio'+id));
      Audio.handleFilterPos();
    }
  },

  allAudios: function() {
    return cur.audiosList ? cur.audiosList[cur.allAudiosIndex] || [] : [];
  },

  showRows: function(start, end, force) {
    if (cur.curSection == 'recommendations') {
      Audio.loadRecommendations();
      return;
    } else if (cur.curSection == 'popular') {
      Audio.loadPopular();
      return;
    } else if (cur.curSection == 'feed') {
      Audio.loadFeed();
      return;
    }
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.showRows(start, end, force);
      };
      return;
    }
    var list = cur.audiosList[cur.curList] || [];
    if (list[0] && list[0]._order !== undefined) {
      list = list.sort(function(a,b) {return a._order - b._order});
    }
    list = Audio.filterClaimed(list);
    cur.sectionCount = list.length;
    if (!cur.searchStr) {
      list = Audio.filterDeleted(list);
      if (cur.filterUnsorted) {
        list = Audio.filterByAlbum(list, 0);
      }
      cur.sectionCount = list.length;
    }
    if (start == undefined) {
      start = cur.shownAudios;
    }
    if (end == undefined) {
      end = cur.shownAudios + cur.audiosPerPage;
    }
    if (window.tooltips && cur.tooltips) {
      for (var i = 0; i < cur.tooltips.length; ++i) {
        if (cur.tooltips[i].el) {
          if (hasClass(cur.tooltips[i].el, 'audio_friend')) continue;
          if (cur.tooltips[i].el.ttimer) {
            clearTimeout(cur.tooltips[i].el.ttimer);
          }
        }
        cur.tooltips[i].hide({fasthide: true});
      }
    }
    var _a = window.audioPlayer;
    if (!list || !list.length) {
      if (cur.shownAudios == 0 && (cur.album_id || (!Audio.allAudios().length && !cur.searchStr))) {
        var msg;
        if (Audio.allAudios().length) {
          msg = (cur.album_id) ? getLang('audio_album_no_recs') : getLang('audio_no_audios_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
        } else {
          if (cur.oid > 0 && !cur.audioFriend) {
            if (cur.id == vk.id && cur.allAudiosIndex == 'all') {
              msg = getLang('audio_no_rec_load_msg').split('{link}').join('<a href="#" onclick="Audio.addAudio(); return false">').split('{/link}').join('</a>');
            } else {
              msg = getLang('audio_user_no_recs');
            }
          } else {
            msg = cur.audioFriend > 0 ? getLang('audio_user_no_recs') : getLang('audio_group_no_recs');
          }
        }
        cur.aContent.innerHTML = '<div id="not_found" class="info_msg">'+msg+'</div>';
      }
      hide(cur.showMore);
    } else {
      if (!cur.shownAudios) cur.aContent.innerHTML = '';
      var audios = list.slice(start, end);
      if (!audios.length) {
        if (cur.shownAudios >= cur.sectionCount) {
          hide(cur.showMore);
          if (cur.searchStr) {
            this.loadRows();
          }
        }
        return;
      }
      var html = [];
      for (i in audios) {
        var audio = audios[i].slice();
        if (cur.selection) {
          audio[5] = audio[5].replace(cur.selection.re, cur.selection.val).replace(/&#(\d*)<span>(\d+)<\/span>(\d*);/g, "&#$1$2$3;");
          audio[6] = audio[6].replace(cur.selection.re, cur.selection.val).replace(/&#(\d*)<span>(\d+)<\/span>(\d*);/g, "&#$1$2$3;");
        }
        html.push(this.drawAudio(audio));
        cur.shownAudios += 1;
      }
      var au = ce('div', {innerHTML: html.join('')});
      while (au.firstChild) {
        var el = au.firstChild;
        cur.aContent.appendChild(el);
      }
      if (cur.canEdit && nav.objLoc.act != 'popular' && nav.objLoc.act != 'recommendations' && nav.objLoc.act != 'feed' && !browser.mobile && !cur.searchStr && cur.sectionCount && cur.allAudiosIndex == 'all' && !cur.shuffled && !cur.club) {
        if (start > 0) {
          setTimeout(sorter.added.pbind(cur.aContent), 0);
        } else {
          setTimeout(function(){
            var opts = {onReorder: Audio.onAudioReorder, onMouseDown: Audio.onDragStart, onMouseUp: Audio.onDragEnd, noMoveCursor: 1};
            if (cur.audioAlbumsWrap) {
              extend(opts, {target: cur.audioAlbumsWrap, onDragOver: Audio.onDragOver, onDragOut: Audio.onDragOut});
            }
            sorter.init(cur.aContent, opts);
          }, 0);
        }
      }
      if (cur.searchCount && isVisible(cur.sContent)) {
        show(cur.sWrap);
        cur.sContent.style.paddingTop = '12px';
        cur.sSummary.innerHTML = langNumeric(cur.searchCount, cur.summaryLang['list_found'], true);
      }
      if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
    }
    setTimeout(Audio.handleFilterPos, 0);
    var aid = currentAudioId(), clubList = (cur.curSection && cur.curSection.substr(0, 4) == 'club');
    if (_a && _a.gpDisabled && aid) {
      var track_id = aid.split('_')[1];
      if (!cur.audios[track_id]) _a.stop();
    }
    if (cur.justShuffled) {
      toggle(cur.showMore, cur.shownAudios < cur.sectionCount);
      return;
    }
    if (clubList) {
      Audio.hideSearchResults();
    }
    if (force) return;
    if (cur.shownAudios >= cur.sectionCount) {
      hide(cur.showMore);
      if (cur.searchStr && !clubList) {
        this.loadRows();
      } else {
        Audio.setQLoc(cur.searchStr);
      }
    } else {
      show(cur.showMore);
      Audio.setQLoc(cur.searchStr);
    }
  },

  loadRows: function() {
    if (cur.sPreload.innerHTML) {
      while (cur.sPreload.firstChild) {
        var el = cur.sPreload.firstChild
        cur.sContent.appendChild(el);
      }
    }
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout((function() {
      Audio.searchRequest(cur.searchStr, cur.searchOffset);
    }).bind(this), 300);
  },

  searchRequest: function(val, offset) {
    if (!val) return;
    if (val[val.length - 1] == ' ') {
      val[val.length - 1] = '_';
    }
    addClass(cur.searchCont, 'loading');
    setStyle(cur.clearSearch, {opacity: .6});
    var query = {act: 'search', q: val, offset: offset, id: cur.id, gid: cur.gid, performer: cur.searchTypeMenu ? cur.searchTypeMenu.val() : 0};
    var l = ge('audio_lyrics_filter');
    var s = ge('selectedItems');
    if (l && parseInt(l.value)) query.lyrics = 1;
    if (s) query.sort = s.value;
    if (cur.autoComplete) query.autocomplete = cur.autoComplete;
    if (nav.objLoc.claim) query.claim = nav.objLoc.claim;
    ajax.post(Audio.address, query, {onDone: function(res, preload, options) {
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
        }
        Audio.applyOptions(options, offset);
        show(cur.sContent);
        if (!cur.sectionCount) {
          hide(cur.sWrap);
          cur.sContent.style.paddingTop = '0px';
          Audio.changeSummary(true);
          cur.aContent.innerHTML = '';
          if (!cur.searchCount && !res && !preload) {
            msg = getLang('audio_no_audios_found').split('{query}').join('<b>'+cur.searchStr.replace(/([<>&#]*)/g, '')+'</b>');
            cur.aContent.innerHTML = '<div id="not_found" class="info_msg">'+msg+'</div>';
            hide(cur.showMore);
            hide(cur.sContent);
          }
        } else {
          cur.sContent.style.paddingTop = '12px';
          if (cur.searchCount) {
            cur.sSummary.innerHTML = langNumeric(cur.searchCount, cur.summaryLang['list_found'], true);
            show(cur.sWrap);
          } else {
            Audio.hideSearchResults();
            hide(cur.sWrap);
          }
        }
        Audio.scrollCheck();
        if (!offset) Audio.setQLoc(cur.searchStr);
        var _a = window.audioPlayer;
        if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
      },
      onFail: function() {
        removeClass(cur.searchCont, 'loading');
      },
      showProgress: function () {
        cur.isAudioLoading = true;
      },
      hideProgress: function () {
        cur.isAudioLoading = false;
      }
    });
  },

  changeSearchFilters: function() {
    cur.searchOffset = 0;
    Audio.searchRequest(cur.searchStr, 0);
  },

  hideSearchResults: function() {
    setTimeout(function(){
      cur.sContent.innerHTML = '';
      if (cur.curSection != 'recommendations' && cur.curSection != 'popular' && cur.curSection != 'feed') cur.sPreload.innerHTML = '';
      hide(cur.sContent);
      hide(cur.sWrap);
      hide(cur.sShowMore);
      Audio.scrollCheck();
    }, 0);
  },

  drawAudio: function(audio) {
    return cur.audioTpl(audio, cur.curSection);
  },

  applyOptions: function(options, offset) {
    extend(cur, options);
    if (!cur.has_more) {
      hide(cur.sShowMore);
    } else {
      show(cur.sShowMore);
    }
    if (!offset) {
      if (options.searchInfo) {
        cur.searchInfoCont.innerHTML = options.searchInfo;
        if (!isVisible(cur.searchInfoCont)) {
          show(cur.searchInfoCont);
        }
        each(geByClass('audio_friend_name_now', cur.searchInfoCont), function() {
          if (this.scrollWidth > this.clientWidth) {
            this.setAttribute('title', this.innerText || this.textContent);
          } else {
            this.removeAttribute('title');
          }
        })
      } else if (isVisible(cur.searchInfoCont)) {
        hide(cur.searchInfoCont);
      }
    }
  },

  handleFilterPos: function() {
    if (!Audio.fixedScroll || !cur.audioEl) return false;
    var headH = cur.audioEl.head.clientHeight, audioNavH = cur.audioEl.bar.offsetHeight,
        contentY = headH + audioNavH,
        st = Math.max(0, scrollGetY()), wh = window.lastWindowHeight || 0, pos = 0,
        filt = ge('side_panel'), filtPos = getXY(filt)[1], filtY = getSize(filt)[1],
        sf = ge('side_filters'), sfPos = (getStyle(sf, 'position') == 'fixed') ? parseInt(getStyle(sf, 'top')) : getXY(sf)[1], sfY = getSize(sf)[1],
        bottomPad = Math.max(0, st + wh - filtY - contentY),
        tooBig = (filtPos + filtY - sfPos - sfY < 20),
        lastPos = cur.filterLastPos || 100, lastSt = cur.lastSt || 0;

    if  (!tooBig) {
      addClass(sf, 'fixed');
      pos = (wh > sfY + contentY) ? Math.min(contentY, wh - sfY - bottomPad) : Math.max(Math.min(contentY, lastPos + lastSt - st), wh - sfY - bottomPad);
    } else {
      removeClass(sf, 'fixed');
      pos = 0;
    }
    cur.filterLastPos = pos;
    cur.lastSt = st;
    setStyle(sf, {top: pos + 'px'});

    if (!browser.mozilla && !browser.msie && cur.lastWW !== lastWindowWidth) {
      cur.lastWW = lastWindowWidth;
      var goodLeft1 = ge('page_layout').offsetLeft,
          goodLeft2 = goodLeft1 + cur.audioEl.cont.offsetLeft,
          goodLeft3 = goodLeft2 + getSize(cur.audioEl.cont)[0] - getSize(cur.audioEl.filters)[0] - 10;
      cur.audioEl.head.style.left = ge('side_bar').style.left = goodLeft1 + 'px';
      cur.audioEl.bar.style.left = goodLeft2 + 'px';
      cur.audioEl.filters.style.left = goodLeft3 + 'px';
      setTimeout(Audio.resetStyles, 0);
    }
  },

  resetStyles: function() {
    cur.audioEl.head.style.left = ge('side_bar').style.left =
    cur.audioEl.bar.style.left = cur.audioEl.filters.style.left = '';
  },

  scrollCheck: function () {
    Audio.handleFilterPos();
    if (browser.mobile || cur.isAudioLoading  || cur.disableAutoMore) return;

    if (!isVisible(cur.showMore) && !isVisible(cur.sShowMore)) return;
    if (!cur.curList) {
      setTimeout(Audio.scrollCheck, 50);
      return;
    }

    var docEl = document.documentElement;
    var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
    var st = scrollGetY();

    if (isVisible(cur.showMore) && st + ch + 400 > cur.showMore.offsetTop) {
      Audio.showRows();
    }
    if (isVisible(cur.sShowMore) && st + ch + 400 > cur.sShowMore.offsetTop) {
      Audio.loadRows();
    }
  },

  updateList: function(e, obj, force, showAlbums, fromIndex) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.updateList(e, obj, force, showAlbums);
      };
      return;
    }
    if (e && (e.keyCode == 10 || e.keyCode == 13) || cur.forceNoAutoComplete) {
      delete cur.forceNoAutoComplete
      delete cur.autoComplete;
    } else {
      cur.autoComplete = 1;
    }
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout((function() {
      var str = trim(obj.value), el;
      if (str == cur.searchStr && cur.autoComplete && !cur.ignoreEqual) {
        return;
      }
      delete cur.ignoreEqual;
      delete nav.objLoc.album_id;
      delete nav.objLoc.audio_id;
      if (nav.objLoc.act == 'recommendations' || nav.objLoc.act == 'popular' || nav.objLoc.act == 'feed' || nav.objLoc.act == 'albums') delete nav.objLoc.act;
      if (showAlbums) {
        nav.objLoc.act = 'albums';
      }
      if (cur.allAudiosIndex == 'all') {
        cur.album_id = 0;
      }
      each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
        removeClass(e, 'selected');
      });
      var c = Audio.allAudios().length;
      if (str) {
        el = cur.albumFiltered;
        hide(cur.audioFriends, cur.audioAlbums);
        addClass(cur.clearSearch, 'shown');
        show(cur.searchFilters);
        hide(cur.searchInfoCont);
        if (!c && cur.allAudiosIndex == 'all') removeClass(cur.audioWrap, 'audio_no_recs');
      } else {
        if (showAlbums || cur.oid != vk.id) {
          if (cur.allAudiosIndex == 'all') {
            el = ge('audios_albums') || ge('album0');
          }
          hide(cur.audioFriends);
          show(cur.audioAlbums);
          Audio.updateAlbums();
        } else if (fromIndex == 2) {
          hide(cur.audioAlbums);
          hide(cur.audioFriends);
          cur.searchInfoCont.innerHTML = cur.performerInfo[cur.allAudiosIndex];
          show(cur.searchInfoCont);
        } else {
          hide(cur.audioAlbums);
          show(cur.audioFriends);
          hide(cur.searchInfoCont);
          if (cur.allAudiosIndex == 'all') {
            el = ge('album0');
            var curEl = geByClass1('current', ge('audio_friends_list'));
            if (curEl) removeClass(curEl, 'current');
          }
        }
        removeClass(cur.clearSearch, 'shown');
        removeClass(cur.albumFiltered, 'selected');
        hide(cur.searchFilters);
        if (!c && cur.allAudiosIndex == 'all' && cur.oid <= 0) addClass(cur.audioWrap, 'audio_no_recs');
      }
      if (el) addClass(el, 'selected');
      hide(cur.popularFilters, cur.popularOwners);
      cur.searchStr = str;
      this.searchAudios(str, cur.allAudiosIndex, force);

      scrollToTop();
    }).bind(this), fromIndex ? 0 :10);
  },

  selectPerformer: function(event, name) {
    cur.aSearch.setValue(name);
    cur.forceNoAutoComplete = true;
    if (event) {
      cur.searchTypeMenu.value = 1;
      cur.searchTypeChanged({target: {index: 1}}, true);
    }
    Audio.updateList(null, cur.aSearch);
    if (event) cancelEvent(event);
  },

  searchAudios: function(str, type, force) {
    cur.shownAudios = 0;
    cur.curSection = type;
    var clubList = (type && type.substr(0, 4) == 'club');
    if (!clubList && cur.searchSortFilter) {
      cur.searchSortFilter.disable(false);
      cur.searchLyricsFilter.disable(false);
      removeClass(cur.albumFiltered, 'club_shown');
      delete cur.club;
    }
    if (str) {
      var htmlentities = function(s){
        var el = document.createElement('div');
        el.innerText = el.textContent = s;
        s = el.innerHTML;
        delete el;
        return s.split('"').join('&quot;');
      }
      var htmlencode = function(str){
        return str.toLowerCase().replace(/\u2013|\u2014/g, '-');
        var aStr = str.toLowerCase().replace(/\u2013|\u2014/g, '-').split(''), i = aStr.length, aRet = [];
        while (i--) {
          var iC = aStr[i].charCodeAt();
          if ((iC > 127 && iC < 994)) {
            aRet.push('&#'+iC+';');
          } else if (iC == 36) {
            aRet.push('&#0'+iC+';');
          } else {
            aRet.push(htmlentities(aStr[i]));
          }
        }
        return aRet.reverse().join('');
      }
      var res = cur.audiosIndex.search(htmlencode(str));
      var newList = cur.curSection;
      newList += '_search_'+str;

      cur.curList = newList;
      cur.audiosList[cur.curList] = res.sort(function(a,b) {return a._order - b._order});
      audioPlayer.genPlaylist(res, false);

      if (str) {
        str += ' '+(parseLatin(str) || '');
        str = trim(escapeRE(str.replace(/\)/g, '')).split('&').join('&amp;'));
        cur.selection = {
          re: new RegExp('('+str.replace(cur.audiosIndex.delimiter, '|').replace(/(^\||\|$|\?)/g, '')+')', 'gi'),
          val: '<span>$1</span>'
        };
      }
    } else {
      if (!clubList) Audio.hideSearchResults();
      cur.curList = cur.curSection;
      audioPlayer.genPlaylist(cur.audiosList[cur.curList], false, cur.curList == 'all' && cur.oid == vk.id);
      cur.selection = false;
    }

    cur.sectionCount = (cur.audiosList[cur.curList]) ? cur.audiosList[cur.curList].length : 0;
    this.filterTimeout = setTimeout((function() {
      if (!force) {
        hide(cur.sShowMore);
        cur.searchOffset = 0;
      }
      this.showRows(null, null, force);
      if (cur.sectionCount || !cur.searchStr) {
        this.changeSummary();
      }
      if (cur.justShuffled) {
        delete cur.justShuffled;
        var aid = currentAudioId();
        if (cur.nextPlaylist && (!aid || window.audioPlaylist && !window.audioPlaylist[aid])) {
          window.audioPlaylist = clone(cur.nextPlaylist);
        }
        if (Pads.updateAudioPlaylist) {
          Pads.updateAudioPlaylist();
        }
      }
    }).bind(this), 10);
  },

  indexAll: function(callback) {
    var all = Audio.allAudios(),
    replacer = function(str, p) {
      var c = intval(p);
      return (c >= 33 && c < 48) ? String.fromCharCode(c) : str;
    };

    cur.audiosIndex = new vkIndexer(all, function(obj) {
      cur.audios[parseInt(obj[1])] = obj;
      return (obj[5]+' '+obj[6]).replace(/\&\#(\d+);?/gi, replacer);
    }, function() {
        if (callback) {
          callback();
        }
    });
  },

  changeAllIndex: function(index, albumSelected, showAlbums, owner) {
    if (!cur.audiosList[index]) return;
    cur.allAudiosIndex = cur.curList = index;
    this.indexAll(function() {
      var _a = window.audioPlayer;
      Audio.mixAllAudios(_a && _a.shuffle, true);
      audioPlayer.genPlaylist(cur.audiosList[cur.curList], false, index == 'all' && cur.oid == vk.id);
      each(geByTag('div', cur.albumFilters), function(i, e) {
        removeClass(e, 'loading');
      });
      cur.ignoreEqual = true;

      setStyle(cur.clearSearch, {opacity: .6});
      val(cur.aSearch, '');
      removeClass(cur.clearSearch, 'shown');
      cur.searchStr = '';
      Audio.hideSearchResults();
      if (albumSelected) {
        Audio.loadAlbum(albumSelected);
      } else {
        Audio.updateList(null, cur.aSearch, undefined, showAlbums, owner ? 2 : 1);
      }
    });
  },

  generateAlbums: function() {
    for (var i in cur.audiosList) {
      if (i.substr(0, 5) == 'album') cur.audiosList[i] = [];
    }
    var all = Audio.allAudios();
    for (var i in all) {
      var el = all[i];
      if (el[8] && parseInt(el[8])) {
        if (!cur.audiosList['album'+el[8]]) cur.audiosList['album'+el[8]] = [];
        cur.audiosList['album'+el[8]].push(el);
      }
    }
  },

  changeHTitle: function(count, from_search) {
    // Updating document title
    var htitle = cur.htitle;
    if (cur.curSection && !cur.curSection.indexOf('album')) {
      htitle = ge(cur.curSection).innerHTML;
    } else if (cur.curSection && cur.curSection == 'recommendations') {
      htitle = cur.recommendTitle ? cur.recommendTitle : getLang('audio_recommended_audios');
    } else if (cur.curSection && cur.curSection == 'popular') {
      htitle = cur.popularTitle ? cur.popularTitle : getLang('audio_popular_audios');
    } else if (cur.curSection && cur.curSection.indexOf('owner') === 0) {
      htitle = cur.allFriendsHTitles[cur.audioFriend];
    } else if (from_search) {
      htitle = getLang('audio_title_search').replace('{q}', val('s_search'));
    } else if (cur.curSection && !cur.curSection.indexOf('club')) {
      htitle = cur.allClubsHTitles[cur.club] || htitle;
    } else if (cur.audioFriend && cur.allAudiosIndex && !cur.allAudiosIndex.indexOf('friend')) {
      htitle = cur.allFriendsHTitles[cur.audioFriend];
    }
    if (count && cur.lang.audio_N_recs) {
      htitle += ' | ' + getLang('audio_N_recs', count);
    }
    document.title = replaceEntities(stripHTML(htitle));
  },

  changeSummary: function(from_search) {
    var count = (from_search) ? cur.searchCount : cur.sectionCount;
    Audio.changeHTitle(count, from_search);
  },

  setQLoc: function(query) {
    clearTimeout(this.qTimeout);
    this.qTimeout = setTimeout(function() {
      if (cur.allAudiosIndex != 'all') {
        if (cur.allAudiosIndex && cur.allAudiosIndex.substr(0, 5) == 'owner') {
          extend(nav.objLoc, {owner: cur.audioFriend});
        } else {
          extend(nav.objLoc, {friend: cur.audioFriend});
        }
      } else {
        delete nav.objLoc.owner;
        delete nav.objLoc.friend;
      }
      if (cur.curSection && cur.curSection.substr(0, 4) == 'club') {
        extend(nav.objLoc, {club: cur.club});
      } else {
        delete nav.objLoc.club;
        delete nav.objLoc.genre;
      }
      if (query) {
        extend(nav.objLoc, {q: query});
        var performer = cur.searchTypeMenu ? parseInt(cur.searchTypeMenu.val()) : 0;
        if (performer) {
          extend(nav.objLoc, {performer: performer});
        } else {
          delete nav.objLoc.performer;
        }
      } else {
        delete nav.objLoc.q;
      }
      nav.setLoc(nav.objLoc);
    }, 500);
  },

  filterClaimed: function(arr) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (t && (!(t[11] && parseInt(t[11])) || t[12] && parseInt(t[12])) || nav.objLoc.claim) {
        res.push(t);
      }
    }
    return res;
  },

  filterDeleted: function(arr) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (cur.audios && cur.audios[t[1]] && !cur.audios[t[1]].deleted) {
        res.push(t);
      }
    }
    return res;
  },

  filterByAlbum: function(arr, album) {
    var len = arr.length;
    var res = [];
    for (var i = 0; i < len; i++) {
      var t = arr[i];
      if (album == t[8]) {
        res.push(t);
      }
    }
    return res;
  },

  animateAdded: function(el, speed) {
    var c = se('<div class="audio_add_wrap anim fl_r"><div class="audio_add_anim_wrap"><div class="audio_add_anim clear_fix"><div class="audio_add fl_l"></div><div class="audio_add done fl_l"></div></div></div></div>');
    el.parentNode.replaceChild(c, el);
    el = c;
    setTimeout(function() {
      var anim = geByClass1('audio_add_anim', el), add = anim.firstChild, added = add.nextSibling;
      cssAnim(anim, {left: '-15px'}, {duration: speed}, function() {
        setStyle(anim.parentNode, {width: '15px'});
        setStyle(anim.parentNode.parentNode, {paddingLeft: '2px'});
        setStyle(anim, {left: '-13px'});
      });
      cssAnim(add, {opacity: 0}, {duration: speed});
      cssAnim(added, {opacity: 1}, {duration: speed});
    }, 0);
    return el;
  },

  addShareAudio: function(el, aid, oid, hash, gid, top) {
    if (el.tt) el.tt.hide();
    el = Audio.animateAdded(el, 200);
    var query = {act:'add', aid:aid, oid:oid, hash:hash, top:top};
    if (gid) query.gid = cur.gid;
    if (cur.curSection == 'recommendations') query.recommendation = 1;
    if ((cur.module == 'audio' || cur.module == 'feed') && nav.objLoc['q'] || cur.module == 'search' && nav.objLoc['c[q]']) query.search = 1;
    ajax.post(Audio.address, query, {
      onDone: function (data, res) {
        var obj = eval('('+data+')');
        if (((!cur.gid && cur.id == vk.id) || (cur.gid && gid)) && obj) {
          setTimeout(function(){
            obj = obj['all'][0];
            var all_list = cur.audiosList['all'];
            if (all_list && all_list.length) {
              obj._order = all_list[0]._order - 1;
              cur.audiosList['all'].splice(0,0,obj);
            } else {
              obj._order = 0;
              cur.audiosList['all'] = [obj];
            }
            cur.audios[obj[1]] = obj;
            if (cur.allAudiosIndex == 'all') {
              cur.audiosIndex.add(obj);
            }
          }, 0);
        }
        var showShare = function() {
          addClass(ge('audio'+oid+'_'+aid), 'tt_shown');
          showTooltip(el, {
            content: res.content,
            slide: 15,
            shift: [59, 5, 0],
            black: 1,
            hidedt: 200,
            className: 'audio_add_tt wall_tt rich',
            onHide: function() {
              removeClass(ge('audio'+oid+'_'+aid), 'tt_shown');
            }
          });
          var tip = el.tt;
          if (tip && !tip.inited) {
            var a = geByClass('add_cont', tip.container)[0];
            tip.onClean = function() {
              tip.inited = false;
              removeEvent(tip.container, 'mouseover', tip.show);
              removeEvent(tip.container, 'mouseout', tip.hide);
            }
            addEvent(tip.container, 'mouseover', tip.show);
            addEvent(tip.container, 'mouseout', tip.hide);
            addEvent(a, 'click', function(){
              toggleClass(this, 'on');
              var share_q = {act: 'share_audio', audio:res.audio, status: tip.status? tip.status : 0, check: hasClass(a, 'on')?1:0, hash: res.hash};
              if (gid) share_q.gid = cur.gid;
              ajax.post(Audio.address, share_q, {
                onDone: function(data) {
                  if (data) tip.status = data;
                }
              });
            });
            tip.inited = true;
          }
        }
        addEvent(el, 'mouseover', showShare);
        if (!cur.addedIds) cur.addedIds = {};
        cur.addedIds[oid+'_'+aid] = 1;
        if (window.audioPlayer && currentAudioId()) {
          var cur_aids = currentAudioId().split('_');
          if (cur_aids[0] == oid && cur_aids[1] == aid) {
            audioPlayer.showCurrentAdded();
          }
        }
      }
    });
  },

  alistOver: function(obj){
    if (!hasClass(obj, 'audio_list_cell_on')) {
      obj.className = 'audio_list_cell_over';
    }
  },

  alistOff: function(obj) {
    if (!hasClass(obj, 'audio_list_cell_on')){
      obj.className = 'audio_list_cell';
    }
  },

  listOut: function(obj) {
    removeClass(obj, 'over');
  },

  listOver: function(obj) {
    addClass(obj, 'over');
  },

  loadAlbum: function(album_id, filter, showAlbums) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.loadAlbum(album_id, filter, showAlbums);
      };
      return;
    }
    if (!album_id && !showAlbums && (cur.oid == vk.id) && isVisible('audio_more_friends')) {
      cur.shownFriends = [];
      Audio.showMoreFriends(addClass.pbind(ge('album0'), 'loading'), removeClass.pbind(ge('album0'), 'loading'));
    }
    //if (cur.searchStr && isVisible(cur.searchInfoCont)) {
    hide(cur.searchInfoCont);
    //}
    if (cur.allAudiosIndex != 'all') {
      Audio.loadFriendsAudios(vk.id, 'all', album_id, showAlbums);
      return;
    }
    if (!Audio.allAudios().length && cur.allAudiosIndex == 'all' && cur.oid <= 0) {
      addClass(cur.audioWrap, 'audio_no_recs');
    }
    if (filter) {
      cur.filterUnsorted = 1;
    } else {
      delete cur.filterUnsorted;
    }
    var curSel = cur.filterUnsorted ? ge('album_unsorted') : (showAlbums ? ge('audios_albums') : ge('album' + album_id));
    cur.lastAct = 'album' + album_id;
    album_id = album_id || 0;
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    if (curSel) addClass(curSel, 'selected');
    removeClass(cur.albumFiltered, 'selected');
    hide(cur.popularFilters, cur.popularOwners, cur.searchFilters);
    if (album_id == 0 && !showAlbums && (cur.oid == vk.id)) {
      hide(cur.audioAlbums);
      show(cur.audioFriends);
      var curEl = geByClass1('current', ge('audio_friends_list'));
      if (curEl) removeClass(curEl, 'current');
    } else {
      hide(cur.audioFriends);
      show(cur.audioAlbums);
    }
    if (showAlbums && !filter && !album_id) {
      Audio.updateAlbums();
    }
    delete nav.objLoc.q;
    delete nav.objLoc.owner;
    delete nav.objLoc.friend;
    delete cur.recsOffset;
    delete cur.popularOffset;
    delete nav.objLoc.club;
    delete nav.objLoc.genre;
    delete nav.objLoc.audio_id;
    delete cur._back;
    if (nav.objLoc.act == 'recommendations' || nav.objLoc.act == 'popular' || nav.objLoc.act == 'feed' || nav.objLoc.act == 'albums') delete nav.objLoc.act;
    if (album_id) {
      extend(nav.objLoc, {album_id: album_id});
    } else if (showAlbums) {
      extend(nav.objLoc, {act: 'albums'});
    } else {
      delete nav.objLoc.album_id;
    }
    nav.setLoc(nav.objLoc);
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout((function() {
      val(cur.aSearch, '');
      removeClass(cur.clearSearch, 'shown');
      cur.searchStr = '';
      cur.album_id = album_id;
      var type = (album_id) ? 'album'+album_id : cur.allAudiosIndex;
      this.searchAudios('', type);
      this.hideSearchResults();
      scrollToTop();
    }).bind(this), 10);
    if (cur.oid == vk.id) {
      ajax.post(Audio.address, {act: 'list_stats', albums: (album_id || showAlbums) ? 1 : 0});
    }
  },

  addAudio: function(params, event) {
    if (cur.uploadBanned) {
      setTimeout(showFastBox(getLang('audio_no_upload_title'), getLang('audio_claims_no_upload')).hide, 5000);
      if (event) cancelEvent(event);
      return false;
    }
    showBox(Audio.address, extend(params || {}, {act: 'new_audio', gid: cur.gid}), {
      params: {width: '440px', bodyStyle: 'padding: 0px; position: relative;'}
    });
    if (event) cancelEvent(event);
    return false;
  },

  mixAllAudios: function(mix, noShuffle) {
    var all_list = Audio.allAudios(), _a = window.audioPlayer, current = 0;
    if (!all_list) return;
    if (mix) {
      if (all_list[0] && all_list[0]._old_order !== undefined) return;
      for (var i = all_list.length; i; ) {
        var j = parseInt(Math.random() * i)
        var x = all_list[--i];
        all_list[i] = all_list[j];
        all_list[i]._old_order = all_list[i]._order;
        all_list[i]._order = i;
        if (currentAudioId() == all_list[i][0]+'_'+all_list[i][1]) {
          current = i;
        }
        all_list[j] = x;
      };
      if (current) {
        var x = all_list[current];
        all_list[current] = all_list[0];
        all_list[current]._order = current;
        all_list[0] = x;
        all_list[0]._order = 0;
      }
    } else {
      for (var i in all_list) {
        if (all_list[i]._old_order !== undefined) {
          all_list[i]._order = all_list[i]._old_order;
          delete all_list[i]._old_order;
        }
      };
    }
    if (!noShuffle) cur.justShuffled = true;
  },
  mixAudios: function() {
    if (cur.curSection == 'recommendations') {
      Audio.loadRecommendations({update: 'remix'});
      return;
    }
    if (cur.curSection == 'popular') {
      Audio.loadPopular('remix');
      return;
    }
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.mixAudios();
      };
      return;
    }
    var _a = window.audioPlayer;
    Audio.mixAllAudios(_a && _a.shuffle);
    cur.ignoreEqual = true;
    if (cur.album_id) {
      this.loadAlbum(cur.album_id);
    } else {
      this.updateList(null, cur.aSearch, undefined, nav.objLoc.act == 'albums');
    }
    cur.shuffled = _a && _a.shuffle;
  },

  loadRecommendations: function(opts) {
    if (cur.loadingRecs) return;
    opts = opts || {};
    var update = opts.update, audioId = opts.audioId;
    if (update) {
      delete cur.recsOffset;
      delete cur.recommendIds;
      delete cur.recommendAudios;
      delete cur.preloadJSON;
    }
    if (audioId) {
      cur.recsAudioId = audioId;
    } else if (update === true) {
      delete cur.recsAudioId;
    }
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    if (cur.searchStr && isVisible(cur.searchInfoCont)) {
      hide(cur.searchInfoCont);
    }
    var rec_filter = ge('recommendations');
    addClass(rec_filter, 'selected');
    removeClass(cur.albumFiltered, 'selected');
    hide(cur.searchFilters, cur.popularFilters);
    if (cur.oid == vk.id) {
      hide(cur.audioFriends, cur.audioAlbums);
      hide(cur.searchInfoCont);
    }
    removeClass(cur.albumFiltered, 'club_shown');
    Audio.handleFilterPos();
    cur.lastSection = cur.curSection;
    cur.curSection = 'recommendations';
    if (cur.recsOffset === undefined) {
      cur.recsOffset = 0;
    } else {
      addClass(cur.showMore, 'loading');
    }
    if (cur.recommendIds === undefined) cur.recommendIds = [];
    if (cur.recommendAudios === undefined) cur.recommendAudios = [];
    if (cur.recsCount === undefined) cur.recsCount = 0;
    if (cur.sPreload.innerHTML) {
      while (cur.sPreload.firstChild) {
        var el = cur.sPreload.firstChild;
        cur.aContent.appendChild(el);
        cur.recsCount++;
      }
    }
    if (cur.preloadJSON) {
      json = cur.preloadJSON['all'];
      var cur_order = cur.recsCount;
      for (var i in json) {
        var audio = json[i];
        audio._order = cur_order++;
        if (indexOf(cur.recommendIds, audio[0]+"_"+audio[1]) == -1) {
          cur.recommendIds.push(audio[0]+"_"+audio[1]);
          cur.recommendAudios.push(audio);
        }
      }
      var aid = currentAudioId(), needs_update = (aid && cur.recommendIds && indexOf(cur.recommendIds, aid) != -1);
      audioPlayer.genPlaylist(cur.recommendAudios, needs_update);
    }
    if (cur.noRecommendations) {
      hide(cur.showMore);
      delete cur.noRecommendations;
      return;
    }
    if (opts.tt) {
      opts.tt.hide();
    }
    cur.loadingRecs = true;
    cur.lastAct = 'recommendations';
    var offset = cur.recsOffset, query = {act: 'get_recommendations', id: cur.id, offset: offset},
        needsUpdate = window.audioPlayer && audioPlayer.shuffle;
    if (update == 'remix' || needsUpdate != cur.recsRemix) {
      cur.recsRemix = needsUpdate;
      query.remix = needsUpdate ? 1 : 0;
      var aid = currentAudioId();
      if (aid && window.audioPlaylist && audioPlaylist[aid] && audioPlaylist.address && audioPlaylist.address.indexOf('act=recommendations') > 0) {
        var a = audioPlaylist[aid];
        if (a[10]) query.current = a[10]+' '+aid;
      }
    }
    if (cur.recsAudioId) {
      query.audio_id = cur.recsAudioId;
    }
    ajax.post(Audio.address, query, {
      onDone: function(rows, preload, json, preload_json, options, ownersRows) {
        delete cur.loadingRecs;
        if (cur.lastAct != 'recommendations') return;
        if (!offset) {
          if (ownersRows) {
            val('audio_popular_owners_rows', ownersRows);
            show(cur.popularOwners);
          } else {
            hide(cur.popularOwners);
          }
        }
        if (options.recsCount === 0 && offset) {
          cur.noRecommendations = true;
          delete options.recsOffset;
        }
        if (json) {
          json = eval('('+json+')');
          json = json['all'];
          var cur_order = cur.recsCount;
          for (var i in json) {
            var audio = json[i];
            audio._order = cur_order++;
            if (indexOf(cur.recommendIds, audio[0]+"_"+audio[1]) == -1) {
              cur.recommendIds.push(audio[0]+"_"+audio[1]);
              cur.recommendAudios.push(audio);
            }
          }
          var aid = currentAudioId(), needs_update = (aid && cur.recommendIds && indexOf(cur.recommendIds, aid) != -1);
          audioPlayer.genPlaylist(cur.recommendAudios, needs_update);
          if (query.audio_id) {
            cur.nextPlaylist.rec = 1;
          }
        }
        removeClass(cur.showMore, 'loading');
        if (offset) {
          delete options.recsCount;
        }
        if (options) extend(cur, options);
        if (!offset) {
          cur.aContent.innerHTML = rows;
        }

        cur.preloadJSON = preload_json ? eval('('+preload_json+')') : false;
        cur.sPreload.innerHTML = '';
        var au = ce('div', {innerHTML: preload});
        while (au.firstChild) {
          if (!ge(au.firstChild.id)) {
            var el = au.firstChild;
            cur.sPreload.appendChild(el);
          } else {
            au.removeChild(au.firstChild);
          }
        }

        if (cur.recsCount && !query.audio_id) {
          show(cur.showMore);
        } else {
          hide(cur.showMore);
        }
        if (query.remix) {
          cur.justShuffled = true;
        }
        Audio.changeHTitle();
        val(cur.aSearch, '');
        removeClass(cur.clearSearch, 'shown');
        cur.searchStr = '';
        cur.album_id = 0;
        Audio.hideSearchResults();
        hide(cur.sShowMore);
        if (!offset) scrollToTop();
        delete nav.objLoc.q;
        delete nav.objLoc.owner;
        delete nav.objLoc.friend;
        delete nav.objLoc.album_id;
        delete nav.objLoc.club;
        delete nav.objLoc.genre;
        delete cur._back;
        extend(nav.objLoc, {act: 'recommendations'});
        if (query.audio_id) {
          extend(nav.objLoc, {audio_id: query.audio_id});
        } else {
          delete nav.objLoc.audio_id;
        }
        nav.setLoc(nav.objLoc);
        var _a = window.audioPlayer;
        if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
        if (window.Pads && Pads.updateAudioPlaylist) {
          Pads.updateAudioPlaylist();
        }
      },
      onFail: function(msg) {
        delete cur.loadingRecs;
        cur.curSection = cur.lastSection;
        removeClass(ge('recommendations'), 'selected');
        setTimeout(showFastBox(getLang('global_error'), msg).hide, 3000);
        return true;
      },
      showProgress: function () {
        addClass(rec_filter, 'loading');
      },
      hideProgress: function () {
        removeClass(rec_filter, 'loading');
      }
    });
    cur.recsOffset += offset ? 50 : 100;
  },

  loadPopular: function(update, genre) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.loadPopular(update, genre);
      };
      return;
    }
    if (cur.loadingPopular) return;
    if (cur.popularAudios === undefined) {
      cur.popularAudios = [];
    }
    if (update) {
      delete cur.popularOffset;
      delete cur.popularIds;
      delete cur.popularAudios[genre];
      delete cur.preloadJSON;
      if (genre !== undefined) {
        cur.genre = genre;
      }
    }
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    if (cur.searchStr && isVisible(cur.searchInfoCont)) {
      hide(cur.searchInfoCont);
    }
    var genre_filter = false;
    if (cur.genre) {
      var prevGenre = geByClass1('selected', ge('audio_genres'));
      if (prevGenre) {
        removeClass(prevGenre, 'selected');
      }

      genre_filter = ge('audio_genre_'+cur.genre);
      if (genre_filter) {
        addClass(genre_filter, 'selected');
      } else {
        cur.genre = 0;
      }
    }
    var pop_filter = ge('top_audios');
    addClass(pop_filter, 'selected');
    removeClass(cur.albumFiltered, 'selected');
    toggle(cur.audioFriends, false);
    hide(cur.searchInfoCont);
    if (cur.popularFilters) {
      show(cur.popularFilters);
      hide(cur.audioAlbums);
    } else {
      show(cur.audioAlbums);
      Audio.updateAlbums();
    }
    removeClass(cur.albumFiltered, 'club_shown');
    hide(cur.searchFilters, cur.popularOwners);
    Audio.handleFilterPos();
    cur.curSection = 'popular';
    if (cur.popularOffset === undefined) {
      cur.popularOffset = 0;
    } else {
      addClass(cur.showMore, 'loading');
    }
    if (cur.popularIds === undefined) cur.popularIds = [];
    if (cur.popularAudios[genre] === undefined) cur.popularAudios[genre] = [];
    if (cur.popularCount === undefined) cur.popularCount = 0;
    if (cur.sPreload.innerHTML) {
      while (cur.sPreload.firstChild) {
        var el = cur.sPreload.firstChild;
        cur.aContent.appendChild(el);
        cur.popularCount++;
      }
    }
    if (cur.preloadJSON) {
      json = cur.preloadJSON['all'];
      var cur_order = cur.popularCount;
      for (var i in json) {
        var audio = json[i];
        audio._order = cur_order++;
        if (indexOf(cur.popularIds, audio[0]+"_"+audio[1]) == -1) {
          cur.popularIds.push(audio[0]+"_"+audio[1]);
          cur.popularAudios[genre].push(audio);
        }
      }
      var aid = currentAudioId(), needs_update = (aid && cur.popularIds && indexOf(cur.popularIds, aid) != -1);
      audioPlayer.genPlaylist(cur.popularAudios[genre], needs_update);
    }
    if (cur.noPopular) {
      hide(cur.showMore);
      delete cur.noPopular;
      return;
    }
    cur.loadingPopular = true;
    cur.lastAct = 'popular';
    var offset = cur.popularOffset, query = {act: 'get_popular', offset: offset},
        needsUpdate = window.audioPlayer && audioPlayer.shuffle;
    if (nav.objLoc.update)  {
      query.update = 1;
    }
    if (needsUpdate && !offset) query.offset = -1;
    if (update == 'remix' || needsUpdate != cur.popRemix) {
      cur.popRemix = needsUpdate;
      query.remix = needsUpdate ? 1 : 0;
      var aid = currentAudioId();
      if (aid && window.audioPlaylist && audioPlaylist[aid] && audioPlaylist.address && audioPlaylist.address.indexOf('act=popular') > 0) {
        query.current = aid;
      }
    }
    if (cur.topType !== undefined) {
      query.type = cur.topType;
      delete cur.topType;
    }
    if (cur.genre) {
      query.genre = cur.genre;
    }
    ajax.post(Audio.address, query, {
      onDone: function(rows, preload, json, preload_json, options, genres) {
        delete cur.loadingPopular;
        if (cur.lastAct != 'popular') return;
        if (options.popularCount === 0 && offset) {
          cur.noPopular = true;
          delete options.popularOffset;
        }
        if (json) {
          json = eval('('+json+')');
          json = json['all'];
          var cur_order = cur.popularCount;
          for (var i in json) {
            var audio = json[i];
            audio._order = cur_order++;
            if (indexOf(cur.popularIds, audio[0]+"_"+audio[1]) == -1) {
              cur.popularIds.push(audio[0]+"_"+audio[1]);
              cur.popularAudios[genre].push(audio);
            }
          }
          var aid = currentAudioId(), needs_update = (aid && cur.popularIds && indexOf(cur.popularIds, aid) != -1);
          audioPlayer.genPlaylist(cur.popularAudios[genre], needs_update);
        }
        removeClass(cur.showMore, 'loading');
        if (offset) {
          delete options.popularCount;
        }
        if (options) extend(cur, options);
        if (!offset) {
          cur.aContent.innerHTML = rows;
        }

        if (preload_json) {
          cur.preloadJSON = eval('('+preload_json+')');
        } else {
          cur.preloadJSON = {};
        }
        cur.sPreload.innerHTML = '';
        var au = ce('div', {innerHTML: preload});
        while (au.firstChild) {
          if (!ge(au.firstChild.id)) {
            var el = au.firstChild;
            cur.sPreload.appendChild(el);
          } else {
            au.removeChild(au.firstChild);
          }
        }

        if (cur.popularCount) {
          show(cur.showMore);
        } else {
          hide(cur.showMore);
        }
        if (update == 'remix') {
          cur.justShuffled = true;
        }
        if (genres) {
          ge('audio_genres').innerHTML = genres;
        }
        Audio.changeHTitle();
        val(cur.aSearch, '');
        removeClass(cur.clearSearch, 'shown');
        cur.searchStr = '';
        cur.album_id = 0;
        Audio.hideSearchResults();
        hide(cur.sShowMore);
        if (!offset) scrollToTop();
        delete nav.objLoc.q;
        delete nav.objLoc.owner;
        delete nav.objLoc.friend;
        delete nav.objLoc.album_id;
        delete nav.objLoc.club;
        delete nav.objLoc.genre;
        delete nav.objLoc.audio_id;
        nav.objLoc.act = 'popular';
        if (cur.genre) {
          nav.objLoc.genre = cur.genre;
        } else {
          delete nav.objLoc.genre;
        }
        nav.setLoc(nav.objLoc);
        var _a = window.audioPlayer;
        if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
        if (window.tooltips) {
          tooltips.destroyAll();
        }
        if (window.Pads && Pads.updateAudioPlaylist) {
          Pads.updateAudioPlaylist();
        }
        if (options.infoJS) {
          eval('(function(){' + options.infoJS + ';})()');
        }
      },
      showProgress: function () {
        addClass(genre_filter || pop_filter, 'loading');
      },
      hideProgress: function () {
        removeClass(genre_filter || pop_filter, 'loading');
      }
    });
    cur.popularOffset += offset ? 50 : 100;
  },

  loadFeed: function(update) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.loadFeed(update);
      };
      return;
    }
    if (cur.isFeedLoading) return;
    cur.isFeedLoading = true;
    if (cur.audiosList['all'] && cur.allAudiosIndex != 'all') {
      cur.allAudiosIndex = 'all';
      this.indexAll();
      var curEl = geByClass1('current', ge('audio_friends_list'));
      if (curEl) removeClass(curEl, 'current');
    }
    if (update) {
      delete cur.feedFrom;
      delete cur.feedOffset;
      delete cur.feedIds;
      delete cur.feedAudios;
      if (update === 'reload') {
        var params = {act: 'feed', part: 1, update: 1}, q = Audio.address + '#' + ajx2q(params);
        delete window.ajaxCache[q];
      }
    }
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    if (cur.searchStr && isVisible(cur.searchInfoCont)) {
      hide(cur.searchInfoCont);
    }
    var feed_filter = ge('feed_filter');
    addClass(feed_filter, 'selected');
    removeClass(cur.albumFiltered, 'selected');
    hide(cur.searchFilters, cur.popularFilters, cur.popularOwners);
    if (cur.oid == vk.id) {
      show(cur.audioFriends);
      hide(cur.searchInfoCont);
      hide(cur.audioAlbums);
    }
    removeClass(cur.albumFiltered, 'club_shown');
    Audio.handleFilterPos();
    cur.lastSection = cur.curSection;
    cur.curSection = 'feed';
    if (!update) {
      addClass(cur.showMore, 'loading');
    }
    cur.lastAct = 'feed';
    ajax.post(Audio.address, {act: 'feed', offset: cur.feedOffset, from: cur.feedFrom, part: 1, update: update ? 1 : ''}, {
      onDone: function (rows, script) {
        if (cur.lastAct != 'feed') return;
        if (rows) {
          if (update) {
            cur.aContent.innerHTML = rows;
          } else {
            var au = ce('div'), par = geByClass1('wall_module', cur.aContent), row;
            au.innerHTML = rows;
            if (par && update) {
              par.innerHTML = '';
            }
            while (row = au.firstChild) {
              if (!row.id || ge(row.id)) {
                au.removeChild(row);
                continue;
              }
              if (par) {
                par.appendChild(row);
              }
            }
          }
        } else {
          hide(cur.showMore);
        }
        if (script) {
          eval(script);
        }
        var aid = currentAudioId(), needs_update = (aid && cur.feedIds && indexOf(cur.feedIds, aid) != -1);
        audioPlayer.genPlaylist(cur.feedAudios, needs_update);
        removeClass(cur.showMore, 'loading');
        Audio.changeHTitle();
        val(cur.aSearch, '');
        removeClass(cur.clearSearch, 'shown');
        cur.searchStr = '';
        cur.album_id = 0;
        Audio.hideSearchResults();
        hide(cur.sShowMore);
        if (update) scrollToTop();
        delete nav.objLoc.q;
        delete nav.objLoc.owner;
        delete nav.objLoc.friend;
        delete nav.objLoc.album_id;
        delete nav.objLoc.club;
        delete nav.objLoc.genre;
        delete nav.objLoc.audio_id;
        delete cur._back;
        extend(nav.objLoc, {act: 'feed'});
        nav.setLoc(nav.objLoc);
        var _a = window.audioPlayer;
        if (_a && _a.showCurrentTrack) _a.showCurrentTrack();
      },
      showProgress: function () {
        cur.isFeedLoading = true;
        addClass(feed_filter, 'loading');
      },
      hideProgress: function () {
        cur.isFeedLoading = false;
        removeClass(feed_filter, 'loading');
      },
      cache: 1
    });
  },

  reorderPlaylist: function(aid, before_id, after_id) {
    each([window.audioPlaylist, cur.nextPlaylist], function(i, e) {
      var list = e;
      if (before_id && !after_id && list && list[before_id]) {
        after_id = list[before_id]._prev;
      }
      if (list && list[aid] && after_id && list[after_id] && after_id != aid) {
        var next_id = list[aid]._next, prev_id = list[aid]._prev;
        if (next_id != aid) {
          list[next_id]._prev = prev_id;
          list[prev_id]._next = next_id;
          list[aid]._prev = after_id;
          list[aid]._next = list[after_id]._next;
          list[after_id]._next = list[list[after_id]._next]._prev = aid;
        }
      }
    });
    var plist = ls.get('pad_playlist');
    if (plist && plist[aid] && after_id && plist[after_id] && after_id != aid && window.audioPlayer) {
      audioPlayer.setPadPlaylist();
    }
  },

  removeFromPlaylist: function(aid) {
    each([window.audioPlaylist, cur.nextPlaylist], function(i, e) {
      var list = e;
      if (list && list[aid]) {
        var next_id = list[aid]._next, prev_id = list[aid]._prev;
        if (next_id != aid) {
          // delete list[aid];
          list[next_id]._prev = prev_id;
          list[prev_id]._next = next_id;
        }
      }
    });
    var plist = ls.get('pad_playlist');
    if (plist && plist[aid] && window.audioPlayer) {
      audioPlayer.setPadPlaylist();
    }
  },

  backToPlaylist: function(aid) {
    each([window.audioPlaylist, cur.nextPlaylist], function(i, e) {
      var list = e;
      if (list && list[aid]) {
        var next_id = list[aid]._next, prev_id = list[aid]._prev;
        if (next_id != aid) {
          list[next_id]._prev = list[prev_id]._next = aid;
        }
      }
    });
    var plist = ls.get('pad_playlist');
    if (plist && plist[aid] && window.audioPlayer) {
      audioPlayer.setPadPlaylist();
    }
  },

  hideRecommendation: function(aid, q, hash, event) {
    if (window.audioPlayer && currentAudioId() == aid) {
      audioPlayer.nextTrack(true);
    }
    var recRow = ge('audio'+aid);
    if (recRow) {
      if (window.tooltips) {
        tooltips.hide(ge('remove'+aid))
      }
      slideUp(recRow, 200, function() {
        recRow.parentNode.removeChild(recRow);
        Audio.removeFromPlaylist(aid);
        cur.recsCount--;
        Audio.changeHTitle();
      });
    }
    ajax.post(Audio.address, {act: 'hide_recommendation', q: q, hash: hash});
    if (event) cancelEvent(event);
    return false;
  },

  _animDelX: function(el, opacity, set_active) {
    if (!el) return;
    if (set_active !== undefined) {
      el.active = set_active;
    } else if (el.active) {
      return;
    }
    animate(el, {opacity: opacity}, 200);
  },

  rowActive: function(el, tt, sh) {
    Audio._animDelX(el, 1, 1);
    if (tt) showTooltip(el, {text: tt, showdt: 0, black: 1, shift: (sh ? sh : [12, 4, 0])});
  },
  rowInactive: function(el, light) {
    var opacity = light ? 0.6 : 0.4;
    Audio._animDelX(el, opacity, 0);
  },

  switchToFriends: function() {
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    addClass(ge('friends_audios'), 'selected');
    removeClass(cur.albumFiltered, 'selected');
    var showFriends = function() {
      show(cur.audioFriends);
      hide(cur.searchInfoCont);
      hide(cur.audioAlbums, cur.searchFilters, cur.popularFilters, cur.popularOwners);
    }
    if (!cur.audioFriendPlaying && cur.shownFriends.length <= 10) {
      Audio.cacheFriendsList();
      showFriends();
      Audio.selectFriend(cur.audioFriend);
    } else {
      addClass(ge('friends_audios'), 'loading');
      var query = {act: 'more_friends'};
      if (cur.audioFriendPlaying) query.owner = cur.audioFriendPlaying;
      else if (cur.audioFriend) query.owner = cur.audioFriend;
      ajax.post(Audio.address, query, {
        cache: 1,
        onDone: function(cont, friends) {
          if (cont) {
            ge('audio_friends_list').innerHTML = cont;
          }
          addClass(ge('audio_friend'+cur.audioFriend), 'current');
          removeClass(ge('friends_audios'), 'loading');
          showFriends();
          cur.shownFriends = friends;
          var fid = cur.audioFriendPlaying ? cur.audioFriendPlaying : cur.audioFriend;
          Audio.selectFriend(fid);
        },
        onFail: function() {removeClass(ge('friends_audios'), 'loading');}
      });
    }
  },
  selectFriend: function(id, ev) {
    if (cur.skipSelectFriend) {
      cur.skipSelectFriend = false;
      return;
    }
    each(geByTag('div', cur.audioFriends), function(i, e) {
      removeClass(e, 'current');
    });
    addClass(ge('audio_friend' + id), 'current');
    addClass(ge('album0'), 'loading');
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    Audio.loadFriendsAudios(id, 'friend'+id);
    if (id && cur.oid == vk.id) {
      ajax.post(Audio.address, {act: 'list_stats', owner: id});
    }
    return ev ? cancelEvent(ev) : false;
  },
  skipSelectFriend: function() {
    cur.skipSelectFriend = true;
  },
  selectCommunity: function(id, ev) {
    if (cur.skipSelectCommunity) {
      cur.skipSelectCommunity = false;
      return;
    }
    each(geByClass('audio_friend', cur.searchInfoCont), function(i, e) {
      removeClass(e, 'current');
    });
    addClass(ge('audio_community' + id), 'current');
    mentionOver(ge('audio_community' + id), {shift: [47, 7, 7]});
    each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
      removeClass(e, 'selected');
    });
    addClass(cur.albumFiltered, 'club_shown');
    cur.searchSortFilter.disable(true);
    cur.searchLyricsFilter.disable(true);
    removeClass(cur.albumFiltered, 'selected');
    cur.club = id;
    Audio.loadCommunityAudios(id, 'club'+id);
    if (id && cur.oid == vk.id) {
      ajax.post(Audio.address, {act: 'list_stats', club: id});
    }
    return ev ? cancelEvent(ev) : false;
  },
  skipSelectCommunity: function() {
    cur.skipSelectCommunity = true;
  },
  backToSearch: function() {
    if (cur.curSection && cur.curSection.substr(0, 4) == 'club') {
      cur.ignoreEqual = true;
      each(geByClass('audio_friend', cur.searchInfoCont), function() {
        removeClass(this, 'current');
      });
      this.updateList(null, cur.aSearch);
    }
  },
  playCurrent: function(el, hash, ev) {
    var _a = window.audioPlayer, aid = currentAudioId(), audioId = el.getAttribute('data-audio');
    if (_a) _a.gpDisabled = false;
    if ((window.audioPlaylist || {})[audioId]) {
      if (!_a || aid != audioId || _a.player.paused()) playAudioNew(audioId);
      return cancelEvent(ev);
    }

    var prg = el.nextSibling || el.parentNode.appendChild(ce('span', {className: 'progress_inline current_audio_prg'}));
    stManager.add(['audioplayer.css', 'audioplayer.js']);
    ajax.post(Audio.address, {act: 'play_audio_status', id: audioId, hash: hash}, {
      onDone: function(info, data, uid) {
        if (data && uid && window.audioPlayer) {
          audioPlayer.statusData = audioPlayer.statusData || {};
          audioPlayer.statusData[uid] = data;
        }
        if (!info) return;

        if (!window.audioPlaylist) {
          window.audioPlaylist = {};
        }
        audioPlaylist[audioId] = info;
        audioPlaylist.start = audioId;
        if (!audioPlaylist.searchStr) {
          window.lastPlaylist = clone(audioPlaylist);
        }
        if (window.audioPlayer) {
          audioPlayer.setPadPlaylist();
        }
        delete audioPlaylist.searchStr;
        playAudioNew(audioId);
      },
      showProgress: function() {
        show(prg);
        hide(el);
      },
      hideProgress: function() {
        hide(prg);
        show(el);
      }
    });
    return cancelEvent(ev);
  },
  loadFriendsAudios: function(id, index, album, showAlbums, owner) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.loadFriendsAudios(id, index, album, showAlbums);
      };
      return;
    }
    if (!cur.audiosList[index]) {
      if (index == 'all') {
        each(geByClass('audio_filter', cur.albumFilters), function(i, e) {
          removeClass(e, 'selected');
        });
        if (showAlbums) {
          addClass(ge('audios_albums'), 'selected loading');
        } else {
          addClass(ge('album0'), 'selected loading');
        }
        removeClass(cur.albumFiltered, 'selected');
      }
      cur.lastAct = index;
      var query = {act: 'load_audios_silent', id: id, claim: nav.objLoc.claim, please_dont_ddos: 3};
      if (owner) {
        query.is_owner = 1;
      }
      if (index != 'all' && !ge('audio_friend' + id) && !owner) {
        cur.shownFriends = [];
        var txt = domFC(ge('audio_more_friends')), prg = domLC(ge('audio_more_friends'));
        Audio.showMoreFriends(function() {
          hide(txt);
          show(prg);
        }, function() {
          hide(prg);
          show(txt);
        }, id);
      }
      ajax.post(Audio.address, query, {
        cache: 1,
        onDone: function(data, opts) {
          if (cur.lastAct != index) return;
          opts = eval('('+opts+')');
          if (id < 0) {
            cur.allFriendsHTitles = cur.allFriendsHTitles || {};
            cur.allFriendsHTitles[id] = opts.summaryLang.all_club_htitle;
          } else {
            cur.allFriendsTitles = cur.allFriendsTitles || {};
            cur.allFriendsTitles[id] = opts.summaryLang.all_friend_title;
            cur.allFriendsHTitles = cur.allFriendsHTitles || {};
            cur.allFriendsHTitles[id] = opts.summaryLang.all_friend_htitle;
          }
          var obj = eval('('+data+')');
          if (!obj) return;
          cur.audiosList[index] = obj['all'];
          if (id == vk.id && index == 'all') {
            cur.allAudiosIndex = 'all';
            Audio.generateAlbums();
          }
          if (!cur.performerInfo) {
            cur.performerInfo = {};
          }
          cur.performerInfo[index] = opts.performerInfo;
          if (opts.backLink) {
            cur.backLink = opts.backLink;
            showBackLink('/audio?act=popular'+(cur.genre ? '&genre='+cur.genre : ''), cur.backLink);
          }
          if (index != 'all') cur.audioFriend = id;
          Audio.changeAllIndex(index, album, showAlbums, owner);
          Audio.cacheFriendsList();
        }
      });
    } else {
      if (index != 'all') cur.audioFriend = id;
      if (owner) {
        showBackLink('/audio?act=popular'+(cur.genre ? '&genre='+cur.genre : ''), cur.backLink);
      }
      Audio.changeAllIndex(index, album, showAlbums, owner);
    }
  },
  loadCommunityAudios: function(gid, index) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.loadCommunityAudios(gid, index);
      };
      return;
    }
    if (!cur.audiosList[index]) {
      cur.lastAct = index;
      ajax.post(Audio.address, {act: 'load_audios_silent', gid: gid, claim: nav.objLoc.claim, please_dont_ddos: 1}, {
        cache: 1,
        showProgress: addClass.pbind(ge('album0'), 'loading'),
        hideProgress: removeClass.pbind(ge('album0'), 'loading'),
        onDone: function(data, opts) {
          if (cur.lastAct != index) return;
          opts = eval('('+opts+')');
          cur.allClubsHTitles = cur.allClubsHTitles || {};
          cur.allClubsHTitles[gid] = opts.summaryLang.all_club_htitle;
          var obj = eval('('+data+')');
          if (!obj) return;
          cur.audiosList[index] = obj['all'];
          Audio.searchAudios('', index);
          scrollToTop();
        }
      });
    } else {
      Audio.searchAudios('', index);
      scrollToTop();
    }
  },
  showMoreFriends: function(showProgress, hideProgress, friend) {
    if (cur.moreFriendsSent) {
      return;
    }
    cur.moreFriendsSent = true;
    var query = {act: 'more_friends', ids: cur.shownFriends};
    if (friend) {
      query.owner = friend;
    }
    ajax.post(Audio.address, query, {
      onDone: function(cont, friends, reset) {
        cur.moreFriendsSent = false;
        if (cont) {
          var list = ge('audio_friends_list');
          re('audio_friends_old');
          var old = ce('div', {innerHTML: '<div id="audio_friends_old" style="position: absolute;">'+list.innerHTML+'</div>'}).firstChild;
          list.parentNode.insertBefore(old, list);
          list.innerHTML = '';
          setStyle(list, {display: 'none'});
          list.innerHTML = cont;
          var oldRows = geByClass('audio_friend', old), oldCnt = oldRows.length,
              newCnt = geByClass('audio_friend', list).length;
          if (oldCnt > newCnt) {
            oldRows = oldRows.slice(newCnt);
            each(oldRows, function() {
              re(this);
            });
          }
          setTimeout(Audio.handleFilterPos, 0);
          fadeIn(list, 400, re.pbind(old));
          if (friends) {
            cur.shownFriends = reset ? friends : cur.shownFriends.concat(friends);
          }
        } else {
          hide(el.parentNode.parentNode);
          Audio.handleFilterPos();
        }
      },
      onFail: function() {
        cur.moreFriendsSent = false;
      },
      showProgress: showProgress,
      hideProgress: hideProgress
    });
  },
  cacheFriendsList: function() {
    var query = {act: 'more_friends'};
    if (cur.audioFriendPlaying) query.owner = cur.audioFriendPlaying;
    else if (cur.audioFriend) query.owner = cur.audioFriend;
    ajax.post(Audio.address, query, {cache: 1});
  },

  // Audio Edit functions

  showAudioClaimWarning: function(aid, claim_id, title, reason) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.showAudioClaimWarning(aid, claim_id, title, reason);
      };
      return;
    }
    var claimText, claimTitle;
    if (reason == 'crap') {
      claimText = getLang(claim_id >= 0 ? 'audio_crap_warning_text' : 'audio_crap_warning') || getLang(claim_id > 0 ? 'audio_claim_warning_objection' : (claim_id == 0 ? 'audio_claim_warning_text' : 'audio_claim_warning'));
      claimTitle = getLang('audio_crap_warning_title') || getLang('audio_claim_warning_title');
    } else {
      claimText = (claim_id > 0) ? getLang('audio_claim_warning_objection') : (claim_id == 0 ? getLang('audio_claim_warning_text') : getLang('audio_claim_warning'));
      claimTitle = getLang('audio_claim_warning_title');
    }
    claimText = claimText.split('{audio}').join('<b>' + title + '</b>');
    claimText = claimText.split('{objection_link}').join('<a href="/help?act=cc_objection&claim=' + claim_id + '&content=audio' + aid + '">' + getLang('audio_claim_objection') + '</a>');
    claimText = claimText.split('{delete_link}').join('<a href="#" onclick="Audio.deleteAudio(\'' + aid + '\'); return false;">' + getLang('audio_claim_delete') + '</a>');
    cur.claimWarning = showFastBox(claimTitle, claimText);
  },

  deleteAudio: function(id) {
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.deleteAudio(id);
      };
      return;
    }
    if (cur.deleting) {
      return false;
    }
    cur.deleting = true;
    var el = ge('audio' + id), aid = id.split('_')[1];
    if (!cur.deletedAudios) cur.deletedAudios = [];
    cur.deletedAudios[aid] = el.innerHTML;
    var acts = geByClass1('actions', el);
    each(acts.children, function(){if (this.tt && this.tt.hide) this.tt.hide()});
    var a = (cur.audios || {})[aid] || [], lyrics = isVisible(ge('lyrics'+id)),
        _tw = el && geByClass1('title_wrap', el),
        performer = a[5] || _tw && (geByTag1('a', _tw) || {}).innerHTML || '',
        title = a[6] || _tw && (geByClass1('title', _tw) || {}).innerHTML || '';
    el.innerHTML = rs(cur.deletedTpl, {
      audio_id: id,
      performer: performer.split('<span>').join('').split('</span>').join(''),
      title: title,
      delete_all: ''
    });
    var _a = window.audioPlayer;
    if (currentAudioId() == id) {
      _a.showCurrentTrack();
    }
    if (lyrics) {
      Audio.updateSorterRows(ge('audio'+id));
    }
    var addBtn = ge('audio_add'+id);
    if (addBtn) {
      addBtn.onmouseover = function() {};
    }
    ajax.post(Audio.address, {act: 'delete_audio', oid: cur.oid, aid: aid, hash: cur.hashes.delete_hash, restore: 1}, {
      onDone: function(action, delete_all) {
        cur.deleting = false;
        if (cur.claimWarning) {
          cur.claimWarning.hide();
        }
        var acts = geByClass1('actions', el);
        each(acts.children, function(){if (this.tt) this.tt.hide()});
        el.innerHTML = rs(cur.deletedTpl, {
          audio_id: id,
          performer: performer.split('<span>').join('').split('</span>').join(''),
          title: title,
          delete_all: action ? action : ''
        });
        el.style.cursor = 'auto';
        el.setAttribute('nosorthandle', '1');
        if (currentAudioId() == id) {
          _a.showCurrentTrack();
        }
        if (delete_all) {
          cur.lang = cur.lang || {};
          cur.lang.audio_delete_all = delete_all;
        }
        if (cur.audios[aid]) {
          cur.audiosIndex.remove(cur.audios[aid]);
          cur.audios[aid].deleted = true;
        }
        Audio.removeFromPlaylist(id);
        cur.sectionCount--;
        if (cur.shownAudios) cur.shownAudios--;
        Audio.changeSummary();
      },
      onFail: function() {
        cur.deleting = false;
      }
    });
    return false;
  },

  restoreAudio: function(id) {
    if (cur.restoring) {
      return;
    }
    cur.restoring = true;
    var el = ge('audio' + id), aid = id.split('_')[1];
    ajax.post(Audio.address, {act: 'restore_audio', oid: cur.oid, aid: aid, hash: cur.hashes.restore_hash}, {
      onDone: function() {
        cur.restoring = false;
        var acts = geByClass1('actions', el);
        each(acts.children, function(){if (this.tt) this.tt.hide()});
        el.innerHTML = cur.deletedAudios[aid];
        var lyrics = isVisible(ge('lyrics'+id));
        if (lyrics) {
          Audio.updateSorterRows(ge('audio'+id));
        }
        el.removeAttribute('nosorthandle');
        if (cur.audios[aid]) {
          cur.audiosIndex.add(cur.audios[aid]);
          cur.audios[aid].deleted = false;
        }
        Audio.backToPlaylist(id);
        cur.sectionCount++;
        if (cur.shownAudios) cur.shownAudios++;
        Audio.changeSummary();
        toggleClass(ge('play'+id), 'playing', id == currentAudioId());
      },
      onFail: function() {
        cur.restoring = false;
      }
    });
  },

  deleteAll: function(object_id, from_id, to_id, hash) {
    var box = showFastBox(getLang('audio_delete_all_title'), getLang('audio_delete_all') || '', getLang('global_delete'), function(btn){
      ajax.post(Audio.address, {act: 'delete_all', object_id: object_id, to_id: to_id, from_id: from_id, hash: hash}, {
        showProgress: lockButton.pbind(btn),
        onDone: function() {
          nav.reload();
        },
        onFail: box.hide
      });
    }, getLang('global_cancel'));
  },

  editAudio: function(aid, event){
    showBox(Audio.address, {act: 'edit_audio_box', aid: aid}, {
      params: {width: '430px', bodyStyle: 'padding: 15px;'}
    });
    if (event) cancelEvent(event);
    return false;
  },

  editTopAudio: function(full_aid, event) {
    showBox('al_search.php', {act: 'audio_top_edit_box', id: full_aid, full_id: full_aid}, {
      params: {width: '430px', bodyStyle: 'padding: 15px;'}
    });
    if (event) cancelEvent(event);
    return false;
  },

  removeFromTop: function(audio_hash, hash, full_aid, event) {
    ajax.post('al_search.php', {act: 'save_top_audio', deleted: 1, audio_hash: audio_hash, hash: hash, id: full_aid}, {
      onDone: function() {
        var audioRow = ge('audio'+full_aid);
        slideUp(audioRow, 100);
      }
    })
  },

  updateAlbums: function() {
    if (!cur.canEdit || browser.mobile) return;
    each (cur.audioAlbumsWrap.sorter.elems, function() {
      setStyle(this, {top: 'auto', left: 'auto', width: 'auto'});
    });
    cur.audioAlbumsWrap.sorter.destroy();
    this.initAlbumsSort();
    this.updateAlbumsTitles();
  },

  updateAlbumsTitles: function() {
    if (!cur.audioAlbumsWrap) return;

    each (geByClass('label', cur.audioAlbumsWrap), function() {
      if (this.scrollWidth > this.clientWidth) {
        this.setAttribute('title', this.innerText || this.textContent);
      } else {
        this.removeAttribute('title');
      }
    });
  },

  initAlbumsSort: function() {
    if (!cur.canEdit || browser.mobile || !cur.audioAlbumsWrap) return;
    sorter.init(cur.audioAlbumsWrap, {onMouseDown: Audio.hideAlbumsTT, onReorder: Audio.onAlbumReorder, noMoveCursor: 1});
  },

  hideAlbumsTT: function() {
    each(geByClass('icon_wrap', cur.audioAlbumsWrap), function() {
      if (this.tt) this.tt.hide();
    })
  },

  onAlbumReorder: function(album, before, after) {
    var aid = album.id.replace('album', '');
    var before_id = (before && before.id || '').replace('album', '');
    var after_id = (after && after.id || '').replace('album', '');
    ajax.post(Audio.address, {act: 'reorder_albums', oid: cur.oid, aid: aid, before: before_id, after: after_id, hash: cur.hashes.reorder_hash});
  },

  editAlbum: function(aid){
    if (cur.silent) {
      cur.onSilentLoad = function() {
        Audio.editAlbum(aid);
      };
      return;
    }
    if (!cur.audiosList) {
      return;
    }
    var box = showTabbedBox(Audio.address, {act: 'edit_album_box', album_id: aid, oid: cur.oid}, {stat: ['privacy.js', 'privacy.css', 'ui_controls.js', 'ui_controls.css', 'indexer.js']});
    cur.onOListSave = Audio.saveAlbum.pbind(box, aid);
    return false;
  },

  createAlbum: function() {
    return this.editAlbum(0);
  },

  saveAlbum: function(box, aid, audio_ids) {
    var btn = geByClass1('button_blue', box.bodyNode.nextSibling).firstChild,
        albumName = val('album_name');
    if (!albumName) {
      notaBene('album_name');
      return false;
    }
    var query = {act: 'save_album', album_id: aid, name: albumName, gid: cur.gid, Audios: audio_ids.join(','), hash: cur.hashes.save_album_hash};
    ajax.post(Audio.address, query, {
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn),
      onFail: box.hide,
      onDone: function(album_id, audio_ids, filters) {
        try{
          cur.audioAlbumsWrap.innerHTML = filters;
          var old = cur.audiosList['album'+album_id];
          if (old) {
            for (var i in old) {
              cur.audios[old[i][1]][8] = 0;
            }
          }
          for (var i in audio_ids) {
            cur.audios[audio_ids[i]][8] = album_id;
          }
          cur.albums[album_id] = {id: album_id, title: clean(albumName)};
          Audio.generateAlbums();
          Audio.loadAlbum(album_id);
          Audio.initAlbumsSort();
          Audio.updateAlbumsTitles();
          box.hide();
        }catch(e){}
      }
    });
    return false;
  },

  deleteAlbum: function(aid, hash){
    var box = showFastBox(getLang('audio_delete_album_title'), getLang('audio_delete_album_are_you_sure'), getLang('audio_delete_album_button'), function(btn){
      ajax.post(Audio.address, {act: 'delete_album', album_id: aid, hash: hash, gid: cur.gid}, {
        showProgress: lockButton.pbind(btn),
        hideProgress: unlockButton.pbind(btn),
        onDone: function(audio_ids, filters){
          try{
            re('album'+aid);
            boxQueue.hideAll();
            for (var i in audio_ids) {
              cur.audios[audio_ids[i]][8] = 0;
            }
            delete cur.albums[aid];
            Audio.generateAlbums();
            if (cur.album_id == aid) {
              Audio.loadAlbum(0, undefined, true);
            }
            Audio.updateAlbums();
          }catch(e){}
        },
        onFail: function(){
          box.hide(200);
        }
      });
    }, getLang('global_cancel'));
  },

  moveAudio: function(full_id, album_id) {
    var id = full_id.split('_')[1];
    ajax.post(Audio.address, {act:'move_to_album', album_id:album_id, audio_id:id, gid:cur.gid, hash:cur.hashes.move_hash}, {
      onDone: function(text) {
        if((cur.album_id && cur.album_id != album_id) || cur.filterUnsorted){
          var el = ge('audio'+full_id);
          fadeOut(el, 300, function(){
            el.parentNode.removeChild(el);
            each (cur.aContent.sorter.elems, function() {
              setStyle(this, {top: 'auto', left: 'auto'});
            });
            cur.aContent.sorter.destroy();
            var opts = {onReorder: Audio.onAudioReorder, onMouseDown: Audio.onDragStart, onMouseUp: Audio.onDragEnd, noMoveCursor: 1};
            if (cur.albumFilters) {
              extend(opts, {target: cur.albumFilters, onDragOver: Audio.onDragOver, onDragOut: Audio.onDragOut});
            }
            sorter.init(cur.aContent, opts);
            cur.sectionCount--;
            Audio.changeSummary();
            if (cur.sectionCount == 0) {
              cur.aContent.innerHTML = '<div id="not_found" class="info_msg">'+getLang('audio_album_no_recs')+'</div>';
            }
            hide(cur.showMore);
          });
        }
        cur.audios[id][8] = album_id;
        Audio.generateAlbums();
      }
    });
  },

  onAudioReorder: function(audio, before, after) {
    var aid = audio.id.replace('audio', '').split('_')[1];
    var before_id = (before && before.id || '').replace('audio', '').split('_')[1];
    var after_id = (after && after.id || '').replace('audio', '').split('_')[1];
    ajax.post(Audio.address, {act: 'reorder_audios', oid: cur.oid, aid: aid, before: before_id, after: after_id, hash: cur.hashes.reorder_hash}, {
      onDone: function(data) {
        var val;
        if (before_id && !after_id) {
          val = cur.audios[before_id]._order - 0.01;
        } else {
          val = cur.audios[after_id]._order + 0.01;
        }
        cur.audios[aid]._order = val;
        Audio.reorderPlaylist(cur.oid + '_' + aid, before_id ? cur.oid + '_' + before_id : '', after_id ? cur.oid + '_' + after_id : '');
      }
    });
  },

  onDragStart: function(el) {
    // addClass(ge('page_body'), 'no_overflow');
    cur.dragStartTimer = setTimeout(function() {
      addClass(cur.audioAlbumsWrap, 'drag');
      hide('album_add');
      var ids = el.id.substr(5), id = parseInt(ids.split('_')[1]);
      var album_id = (cur.audios) ? cur.audios[id][8] : cur.album_id;
      each(geByClass('audio_filter', cur.audioAlbumsWrap), function(i,v) {
        if ('album'+album_id == v.id || (album_id == 0 && v.id == 'album_unsorted')) {
          return;
        }
        addClass(v, 'drag_on');
      });
      animate(el, {opacity: .8}, 200);
    }, 300);
  },

  onDragEnd: function(el, target) {
    if (cur.dragStartTimer) clearTimeout(cur.dragStartTimer);
    // removeClass(ge('page_body'), 'no_overflow');
    each(geByClass('audio_filter', cur.audioAlbumsWrap), function(i,v) {
      removeClass(v, 'drag_on');
    });
    show('album_add');
    if (target) {
      var new_album, full_id = el.id.substr(5), aid = parseInt(full_id.split('_')[1]);
      var album_id = (cur.audios) ? cur.audios[aid][8] : cur.album_id;
      if (target.id != 'album_unsorted') {
        new_album = parseInt(target.id.substr(5));
      } else {
        new_album = 0;
      }
      if (new_album != album_id) {
        Audio.moveAudio(full_id, new_album);
      }
    }
    removeClass(cur.audioAlbumsWrap, 'drag');
    animate(el, {opacity: 1}, 200);
  },

  onDragOver: function(el, target) {
    cur.targetId = target.id || '';
    var ids = el.id.substr(5), id = parseInt(ids.split('_')[1]);
    var album_id = (cur.audios) ? cur.audios[id][8] : cur.album_id;
    if ('album'+album_id == target.id || (album_id == 0 && target.id == 'album_unsorted')) {
      return;
    }
    if (cur.dragOutTimer) {
      clearTimeout(cur.dragOutTimer);
    }
    addClass(target, 'drag_over');
    setStyle(el, {opacity: .4});
  },

  onDragOut: function(el, target) {
    removeClass(target, 'drag_over');
    if (target.id && cur.targetId != target.id) return;
    cur.dragOutTimer = setTimeout(function(){setStyle(el, {opacity: .8});}, 200);
  },

  ignoreOwner: function (post_raw, owner_id, hash, btn) {
    triggerEvent(ge('delete_post' + post_raw), 'mouseout');
    cur.feedEntriesHTML = cur.feedEntriesHTML || {};
    if (post_raw) {
      cur.feedEntriesHTML[post_raw + '_ignored'] = val('post' + post_raw);
    }
    ajax.post(Audio.address, {act: 'a_ignore_owner', post_raw: post_raw, owner_id: owner_id, hash: hash}, {
      onDone:function(html) {
        val('post' + post_raw, html);
        each(geByClass('post', cur.aContent), function(i,v) {
          var ids = this.id.match(/post((-?\d+)_(-?\d+)(_\d+)?)/);
          if (ids[1] != post_raw && (!ids[4] && ids[2] == owner_id || ids[4] && ids[3] == owner_id)) {
            hide(this);
          }
        });
      }
    });
  },

  unignoreOwner: function (post_raw, owner_id, hash) {
    ajax.post(Audio.address, {act: 'a_unignore_owner', post_raw: post_raw || '', owner_id: owner_id, hash: hash}, {
      onDone:function(html) {
        if (post_raw) {
          val('post' + post_raw, cur.feedEntriesHTML[post_raw + '_ignored']);
        } else {
          val('ignore_row' + owner_id, html);
        }
        each(geByClass('post', cur.aContent), function(i,v) {
          var ids = this.id.match(/post((-?\d+)_(-?\d+)(_\d+)?)/);
          if (!ids[4] && ids[2] == owner_id || ids[4] && ids[3] == owner_id) {
            show(this);
          }
        });
      }
    });
  },

  editHidden: function () {
    showTabbedBox('al_settings.php', {act: 'a_edit_owners_list', list: 'audio', height: lastWindowHeight}, {stat: ['privacy.js', 'privacy.css', 'ui_controls.js', 'ui_controls.css', 'indexer.js']});
    cur.onOListSave = Audio.onHiddenSave;
    return false;
  },

  onHiddenSave: function(white, black, list, options) {
    var box = curBox(), params = {act: 'a_ignore_olist', hash: options.hash};
    if (white.length < black.length) {
      params.White = white.join(',');
    } else {
      params.Black = black.join(',');
    }
    ajax.post(Audio.address, params, {
      onDone: function(control, rules) {
        box.hide();
        Audio.loadFeed('reload');
      },
      showProgress: box.showProgress,
      hiderogress: box.hideProgress
    });
    return false;
  },

  loadGenre: function(genre_id, ev) {
    if (checkEvent(ev)) {
      return true;
    }
    Audio.loadPopular(true, genre_id);
    return cancelEvent(ev);
  },

  loadPerformer: function(oid, ev) {
    if (checkEvent(ev)) {
      return true;
    }
    var index = 'owner'+oid;
    Audio.loadFriendsAudios(oid, index, undefined, undefined, true);
    return cancelEvent(ev);
  },

  moreCatalog: function(obj) {
    if (hasClass(obj, 'audio_performer_shown')) {
      var height = getSize(ge('audio_more_performers'))[1];
      removeClass(obj, 'audio_performer_shown');
      hide('audio_more_performers');
      if (height > 300) {
        scrollToTop(0);
      }
    } else {
      if (ge('audio_more_performers')) {
        show('audio_more_performers')
        addClass(obj, 'audio_performer_shown');
        return false;
      }
      var exclude = [];
      var nodes = ge('audio_performers').childNodes;
      for (var i in nodes) {
        if (hasClass(nodes[i], 'audio_owner')) {
          exclude.push(intval(nodes[i].getAttribute('ref')));
        }
      }
      ajax.post('al_audio.php', {act: 'get_more_performers', offset: 4, exclude: exclude.join(','), genre: parseInt(cur.genre)}, {
        onDone: function(rows) {
          ge('audio_performers').appendChild(ce('div', {
            id: 'audio_more_performers',
            innerHTML: rows
          }));
          addClass(obj, 'audio_performer_shown');
        },
        showProgress: addClass.pbind(obj, 'audio_performer_loading'),
        hideProgress: removeClass.pbind(obj, 'audio_performer_loading')
      });
    }
  },

  _eof: 1
}
try{stManager.done('audio.js');}catch(e){}
