var Video = {
  regBR: new RegExp('<br>', 'g'),
  init: function(obj) {
    extend(cur, obj);
    extend(cur, {
      vSearch: ge('v_search'),
      videoSearch: ge('video_search'),
      vRows: ge('video_rows'),
      vList: ge('video_list'),
      vSearchRows: ge('video_search_rows'),
      more: ge('show_more'),
      notFound: ge('not_found'),
      pageEnd: ge('page_end'),
      summary: ge('video_summary'),
      hTab: ge('video_tab_hidden'),
      searchSummary: ge('video_search_summary'),
      secFilter: ge('video_section_filter'),
      albumsCont: ge('video_albums_wrap'),
      albumsContMore: ge('video_albums_more'),
      module: 'video',
      vOrder: 2
    });
    placeholderSetup(cur.vSearch, {back: true});
    onDomReady(function() {
      elfocus(cur.vSearch);
    });
    if (browser.mobile) {
      cur.cansort = false;
    }

    cur.perPage = 15;
    cur.searchCount = {};
    if (!cur.searchData) {
      cur.searchData = {};
    }

    cur.restoreRaw = {};

    var list = cur.videoList[cur.vSection];

    if (cur.vSection != 'all' && list) {
      len = list.length;
    }

    this.scrollNode = browser.msie6 ? pageNode : window;

    addEvent(this.scrollNode, 'scroll', this.scrollResize);

    setTimeout((function() {
      cur.destroy.push(function() {
        removeEvent(this.scrollNode, 'scroll', this.scrollResize);
      });
    }).bind(this), 0);

    setTimeout((function() {
      this.indexAll(cur.onIndexFinish);
    }).bind(this), 0);


    cur.timeouts = {};
    cur.destroy.push(function() {
      if (cur.timeouts) {
        for (var i in cur.timeouts) {
          clearTimeout(cur.timeouts);
        }
      }
      removeEvent(Video.scrollNode, 'scroll', Video.scrollResize);
    });

    if (cur.cansort) {
      cur.qsorterRowClass = 'video_row_cont';
      cur.qsorterRowUpClass = 'video_row_cont video_row_up';
      var videoRows = ge('video_rows');
      if (videoRows) {
        cur.sorter = qsorter.init(videoRows, {
          onReorder: Video.onReorder,
          xsize: 2,
          width: 308,
          height: 188,
          noMoveCursor: 1,
          canDrag: function(el) {
            if (hasClass(el.firstChild.firstChild, 'video_row_deleted')) {
              return 0;
            }
            if (cur.vSection == 'tagged') {
              return 0;
            }
            return hasClass(el.firstChild, 'video_can_edit') ? 1 : 0;
          },
          dragCont: cur.albumsCont,
          dragEls: geByClass('video_album_candrop', cur.albumsCont),
          onDrop: Video.albumDrop,
          onDragOver: Video.albumDragOver,
          onDragOut: Video.albumDragOut
        });
      }
    }
    if (cur.canEditAlbums && cur.albumsCont) {
      cur.qsorterRowClass = 'video_album video_album_candrop';
      cur.qsorterRowUpClass = 'video_album video_album_candrop video_row_up';
      cur.albumsSorter = qsorter.init(cur.albumsCont, {
        onReorder: Video.onAlbumReorder,
        xsize: 3,
        width: 205,
        height: 157,
        noMoveCursor: 1
      });
    }

    cur.nav.push((function(changed, old, n, opts) {
      if (typeof(changed.act) != 'undefined') {
        return;
      }
      if (window.mvcur) {
        var m = (changed[0] || '').match(/^video(-?\d+_\d+)/), owner;
        if (m) {
          if (!mvcur.mvShown || mvcur.videoRaw == m[1]) {
            showVideo(m[1], '', {});
            return false;
          }
        }
        if (!m && mvcur.mvShown && (owner = old[0].match(/^video(-?\d+)_\d+/))) {
          owner = intval(owner[1]);
          if (n[0] == 'video' && (owner == vk.id && !n.gid || owner < 0 && n.gid == -owner) || owner > 0 && n[0] == 'videos' + owner) {
            videoview.hide(opts.hist ? 2 : false);
            return false;
          }
        }
      }
      if (changed.q !== undefined) {
        cur.vSearch.value = changed.q;
        Video.searchVideos(changed.q);
      }
      if (old[0] == n[0] && (n.section || changed.section != undefined)) {
        if (!changed.id) {
          this.section(n.section);
          if (n.section != 'search') {
            delete n.q;
          }
          nav.setLoc(n);
          return false;
        }
      }
    }).bind(this));

    if (cur.silent) {
      this.loadSilent();
    } else {
      Video.onListInit();
    }

    if (cur.editmode) {
      VideoEdit.init();
    }
    cur.deleteAllToggle = Video.deleteAllToggle;
  },
  deleteAllToggle: function(obj) {
    var msg = geByClass1('video_row_deleted_msg', obj);
    if (msg) {
      var backTop = getStyle(msg, 'marginTop');
      setStyle(msg, {marginTop: 10});
      cur.cancelDeleteAllToggle = function(obj) {
        setStyle(msg, {marginTop: backTop});
      }
    }
  },
  privateTooltip: function(obj) {
    showTooltip(obj, {
      black: 1,
      text: '<div style="padding: 2px;">'+getLang('video_is_private_tt')+'</div>',
      center: 0,
      shift: [14, 6, 0],
    });

  },
  privateClick: function(obj, ev) {
    geByClass1('video_row_icon_edit', obj.parentNode.parentNode.parentNode).click();
    return cancelEvent(ev);

  },
  onReorder: function(video, before, after) {
    var video_id = video.id.replace('video_cont', '');
    var before_id = (before && before.id || '').replace('video_cont', '');
    var after_id = (after && after.id || '').replace('video_cont', '');
    ajax.post('al_video.php', {act: 'reorder_videos', video: video_id, before: before_id, after: after_id, hash: cur.hash});
    var list = cur.videoList[cur.vSection];
    var element = false;
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i][0]+'_'+list[i][1] == video_id) {
        element = list[i];
        list.splice(i, 1);
        break;
      }
    }
    if (!element) return;
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i][0]+'_'+list[i][1] == before_id) {
        list.splice(i, 0, element);
        return;
      }
      if (list[i][0]+'_'+list[i][1] == after_id) {
        list.splice(i+1, 0, element);
        return;
      }
    }
  },
  onAlbumReorder: function(album, before, after) {
    var album_id = album.id.replace('video_album_', '');
    var before_id = (before && before.id || '').replace('video_album_', '');
    var after_id = (after && after.id || '').replace('video_album_', '');
    ajax.post('al_video.php', {act: 'reorder_albums', oid: cur.oid, aid: album_id, before: before_id, after: after_id, hash: cur.reorder_hash});

    if (!cur.aIndex || !cur.aIndex.list) return;
    var list = cur.aIndex.list;
    var element = false;
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i][0] == album_id) {
        element = list[i];
        list.splice(i, 1);
        break;
      }
    }
    if (!element) return;
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i][0] == before_id) {
        element._order = list[i]._order - 0.01;
        list.splice(i, 0, element);
        return;
      }
      if (list[i][0] == after_id) {
        element._order = list[i]._order + 0.01;
        list.splice(i + 1, 0, element);
        return;
      }
    }
  },
  onListInit: function() {
    if (!cur.videoList[cur.vSection] && cur.vSection != 'comments') {
      this.generateList(cur.vSection);
    }
  },
  loadSilent: function() {
    cur.loadSilentRequests = (cur.loadSilentRequests || 0) + 1;
    if (cur.loadSilentRequests > 3) {
      return true;
    }
    ajax.post('al_video.php', {act: 'load_videos_silent', oid: cur.oid, offset: (cur.silentAll) ? 0 : cur.videoList['all'].length}, {
      onDone: function(list) {
        var list = eval('('+list+')');
        /*wideLoading = ge('video_wide_loading');
        if (wideLoading) {
          cur.vRows.removeChild(wideLoading);
        }*/
        cur.silent = false;
        for (var i in list) {
          if (!cur.videoList[i]) {
            cur.videoList[i] = list[i];
          } else {
            if (cur.silentAll) {
              cur.videoList[i] = list[i];
            } else {
              Array.prototype.push.apply(cur.videoList[i], list[i]);
            }
          }
        }

        if (cur.onSilentLoad) {
          cur.onSilentLoad();
        }
        Video.onListInit();

        Video.scrollResize();
        Video.indexAll();
      },
      onFail: function(text) {
        Video.loadSilent();
      }
    });
  },
  show: function(e, videoId, opts, obj) {
    if (obj && hasClass(obj, 'video_row_deleted')) {
      return false;
    }
    if (!vk.id && obj && hasClass(obj, 'video_row_not_public')) {
      showDoneBox(getLang('video_please_sign_in'));
      return false;
    }
    var options = extend({root: 1, autoplay: 1}, opts || {});
    var videoData = videoId.split('_')
    if (cur.vSection == 'search' && parseInt(videoData[0]) != vk.id) {
      options.hideInfo = true;
    }
    if (cur.oid < 0) {
      var listId = 'club' + (-cur.oid);
    } else if (cur.vSection == 'tagged') {
      var listId = 'tag'+cur.oid;
    } else if (cur.pvVideoTagsShown && cur.pvShown) {
      var listId = 'tag'+cur.pvVideoTagsShown;
    } else {
      var listId = '';
    }
    return showVideo(videoId, listId, options, e);
  },
  indexAll: function(callback, onlyAlbums) {
    var all = cur.videoList['all'];
    var indexed = 0;
    var hub = new callHub(callback, onlyAlbums ? 1 : 2);
    if (!onlyAlbums) {
      cur.vIndex = new vkIndexer(all, function(obj) {
        return obj[3];
      }, function() {
        if (callback) {
          hub.done();
        }
      });
    }
    var albums = [];
    for(var i in cur.sections) {
      if (cur.sections[i][0] > 0) {
        albums.push(cur.sections[i]);
      }
    }
    cur.aIndex = new vkIndexer(albums, function(obj) {
      return obj[1];
    }, function() {
      if (callback) {
        hub.done();
      }
    });
  },
  addToList: function(list, row, silent) {
    if (!cur.videoList) return;
    var restore = cur.restoreRaw['d_'+row[0]+'_'+row[1]];
    if (restore) {
      for (var i in restore) {
        cur.videoList[restore[i].section].splice(restore[i].pos, 0, restore[i].val)
      }
      delete cur.restoreRaw['d_'+row[0]+'_'+row[1]];
    } else {
      cur.videoList[list].unshift(row);
    }
    cur.vIndex.add(row);
    if (!silent && cur.vSection != 'search') {
      Video.clearOutput();
      Video.showMore();
    }
  },
  onTagConfirm: function(mvData) {
    if (cur.videoList['tagged']) {
      var len = cur.videoList['tagged'].length;
      while(len--) {
        var item = cur.videoList['tagged'][len];
        if (item[0]+'_'+item[1] == mvData && item[8] & 2) {
          item[8] -= 2;
        }
      }
    }
    var videoRow = ge('video_row'+mvData);
    if (videoRow) {
      hide(geByClass1('video_tag_label', videoRow));
    }
    delete ajaxCache['/al_video.php#act=show&list=&module=video&video='+mvData];
    delete ajaxCache['/al_video.php#act=show&autoplay=1&list=&module=video&video='+mvData];
  },
  removeFromLists: function(mvData, silent) {
    cur.restoreRaw['d_'+mvData] = [];
    for (var i in cur.videoList) {
      var len = cur.videoList[i].length;
      while(len--) {
        var item = cur.videoList[i][len];
        if (item[0]+'_'+item[1] == mvData) {
          var val = cur.videoList[i].splice(len, 1)[0];
          cur.restoreRaw['d_'+mvData].push({
            section: i,
            pos: len,
            val: val
          });
          cur.vIndex.remove(item);
        }
      }
    }
    if (!silent) {
      var videoRow = ge('video_row'+mvData);
      if (videoRow) {
        videoRow.parentNode.removeChild(videoRow);
      }
    }
  },
  onDeleteClick: function(vid, oid, hash, obj, ev) {
    if (!cur.restoreRaw) cur.restoreRaw = {};
    var vidCont = ge('video_row'+oid+'_'+vid);
    cur.restoreRaw[oid+'_'+vid] = vidCont.innerHTML;
    addClass(vidCont, 'video_row_loading');
    videoview.deleteVideo(vid, oid, hash, false, 'list', this);
    return cancelEvent(ev);
  },
  searchAlbums: function(str) {
    if (str) {
      var a = cur.aIndex.search(str);
      a = a.sort(function(i,j) {return i._order - j._order});
      var summary = langNumeric(a.length, cur.lang['video_albums_found_summary'])
    } else {
      var a = clone(cur.aIndex.list);
      for(var i in cur.sections) {
        if (cur.sections[i][0] == -1) {
          a.unshift([-1, cur.sections[i][1]]);
        }
      }
      var summary = langNumeric(a.length, cur.lang['video_albums_summary'])
    }
    if (a.length) {
      ge('video_albums_summary').innerHTML = summary;
      var html = more_html = '';
      var num = 0;
      for (var i in a) {
        var alb = a[i][0];
        for(var i in cur.sections) {
          if (cur.sections[i][0] == alb) {
            var v = cur.sections[i];
          }
        }
        var title = v[1];
        if (cur.selection && str) {
          title = title.replace(cur.selection.re, cur.selection.val);
        }
        if (num >= 3) {
          more_html += cur.albumsTpl(alb, v, title);
        } else {
          html += cur.albumsTpl(alb, v, title);
        }
        num += 1;
      }
      if (cur.albumsCont) {
        cur.albumsCont.innerHTML = html;
      }
      if (cur.albumsContMore) {
        cur.albumsContMore.innerHTML = more_html;
      }
      if (ge('video_albums_show_more')) {
        ge('video_albums_show_more').innerHTML = langNumeric(a.length, cur.lang['video_show_all_albums']);
        toggle(ge('video_albums_show_more'), num > 3);
      }
    } else {
      addClass(ge('video_content'), 'video_albums_hidden');
    }
  },
  updateAlbums: function(newList) {
    for(var i in cur.sections) {
      if (cur.sections[i][0] > 0) {
        delete cur.sections[i];
      }
    }
    for(var i in newList) {
      cur.sections.push(newList[i]);
    }
    var num = 0;
    for(var i in cur.sections) num += 1;
    if (num) {
      removeClass(ge('video_content'), 'video_no_albums');
      hide('video_tabs_link');
      removeClass(ge('video_content'), 'video_albums_hidden');
    } else {
      addClass(ge('video_content'), 'video_no_albums');
      show('video_tabs_link');
    }
    Video.indexAll(function() {
      Video.searchAlbums(cur.vSection == 'search' ? cur.vStr : false);
      if (cur.canEditAlbums && cur.albumsSorter && !(trim(cur.vStr) && cur.vStr != '""')) {
        qsorter.update(cur.albumsCont);
      }
      if (cur.cansort) {
        qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
      }
    }, true);
  },
  searchVideos: function(str, force) {
    var hd = cur.vHD ? cur.vHD : 0;
    cur.searchData[str + hd.toString() + cur.vOrder.toString()] = {
      count: 0,
      list: [],
      offset: 0
    };
    cur.loading = false;
    if (str) {
      if (cur.vSection != 'search') {
        cur.beforeSearch = cur.vSection;
        cur.vStr = '';
        /*if (browser.mobile) {
          cur.vSection = 'search';
        } else {*/
          nav.change({section: 'search'});
        /*}*/
      }
      show('video_search_options');
      addClass(ge('video_reset_search'), 'video_reset_search_shown');
      Video.showOptions();
      var v = cur.vIndex.search(str);
      cur.vStr = str;
      var sec = cur.vSection+'_'+str;
      if (cur.vHD) {
        sec += '_opt_hd'+cur.vHD;
      }
      cur.videoList[sec] = v;
      cur.selection = {
        re: new RegExp('('+str.replace('|', '').replace(cur.vIndex.delimiter, '|').replace(/^\||\|$/g, '').replace(/([\+\*\)\(])/g, '\\$1')+')', 'gi'),
        val: '<em>$1</em>'
      };
      Video.searchAlbums(str);
      var len = v.length;
      if (len < 10) {
        //show(cur.more);
        //addClass(cur.more, 'load_more');
        if (cur.searchTimout) {
          clearTimeout(cur.searchTimout);
        }
        cur.loading = true;
        cur.searchTimout = setTimeout((function() {
          this.loadFromSearch(str);
        }).bind(this), (force ? 0 : 500));
        addClass(cur.videoSearch, 'v_loading');
      }
      if (len) {
        this.clearOutput();
        this.showMore();
        if (cur.cansort) {
          qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
        }
        this.changeSummary();
      } else {
        cur.clearOnSearch = true;
      }
    } else {
      Video.searchAlbums(str);
      if (cur.vSection == 'search') {
        hide('video_search_options');
        if (cur.beforeSearch) {
          nav.change({section: cur.beforeSearch});
        }
        removeClass(ge('video_reset_search'), 'video_reset_search_shown');
        Video.hideOptions();
        removeClass(cur.videoSearch, 'v_loading');
        cur.vStr = '';
        cur.selection = false;
        cur.vSearch.focus();
        /*this.clearOutput();
        this.showMore();
        this.changeSummary();
        cur.vSearch.setValue('');
        cur.vSearch.focus();*/
      }
      if (cur.canEditAlbums && cur.albumsSorter) {
        qsorter.update(cur.albumsCont);
      }
    }
    this.changeUrl();
  },
  toggleFilter: function (obj, target) {
    if (hasClass(obj, 'filter_shut') || !isVisible(target)) {
     addClass(obj, 'filter_open');
     removeClass(obj, 'filter_shut');
     var extraH = slideDown(target, 200).to.height;
    } else {
     slideUp(target, 200, function(){
       addClass(obj, 'filter_shut');
       removeClass(obj, 'filter_open');
     });
    }
  },
  toggleLength: function(el, value, noSearch) {
    removeClass(geByClass1('video_length_sel', ge('video_search_controls')), 'video_length_sel');
    addClass(el, 'video_length_sel');
    cur.vLength = value;
    if (!noSearch) {
      this.searchVideos(cur.vStr);
      this.doChangeUrl();
    }
  },
  toggleHD: function(hd, noSearch) {
    if (noSearch && hd) {
      checkbox(ge('video_hd_option'));
    }
    cur.vHD = isChecked('video_hd_option') ? 1 : 0;
    (cur.vHD ? show : hide)('video_hd2_option');
    if (cur.vHD) {
      show('video_hd2_option');
      cur.vHD += isChecked('video_hd2_option') ? 1 : 0;
    } else {
      hide('video_hd2_option');
    }
    if (!noSearch) {
      this.searchVideos(cur.vStr);
      this.doChangeUrl();
    }
  },
  toggleOrder: function(type) {
    cur.vOrder = type;
    this.searchVideos(cur.vStr);
  },
  toggleExt: function(type) {
    cur.vExt = type;
    this.searchVideos(cur.vStr);
  },
  toggleAdult: function() {
    var updateAdult = function(val) {
      cur.adult = val;
      Video.searchVideos(cur.vStr);
    }
    var cancelAgreed = function() {
      if (cur.isAdult || getCookie('adult_agreed')) {
        return true;
      }
      addClass(ge('video_adult_option'), 'on');
    }
    var checkAgreed = function(val) {
      if (!val || cur.isAdult || getCookie('adult_agreed')) {
        return true;
      }
      var box = showFastBox({title: getLang('video_adult_box_title'), onHide: cancelAgreed}, getLang('video_adult_box_text'), getLang('global_continue'), function() {
      cur.isAdult = true;
      setCookie('adult_agreed', 1);
      updateAdult(1);
      box.hide();
    }, getLang('global_cancel'), function() {
      cancelAgreed();
      box.hide();
    });
      return false;
    }
    var new_val = !isChecked('video_adult_option') ? 1 : 0
    if (checkAgreed(new_val)) {
      updateAdult(new_val);
    }
  },
  setQuery: function(str) {
    cur.onIndexFinish = function() {
      cur.onIndexFinish = false;
      vk.loaded = true;
      Video.searchVideos(str, true);
      cur.vSearch.setValue(str);
    }
  },
  doChangeUrl: function() {
    if (trim(cur.vStr) && cur.vStr != '""') {
      nav.objLoc['q'] = cur.vStr;
    } else {
      delete nav.objLoc['q'];
    }
    if (cur.vLength) {
      nav.objLoc['len'] = cur.vLength;
    } else {
      delete nav.objLoc['len'];
    }
    if (cur.vHD) {
      nav.objLoc['hd'] = cur.vHD;
    } else {
      delete nav.objLoc['hd'];
    }
    nav.setLoc(nav.objLoc);
  },
  changeUrl: function() {
    if (cur.timeouts && cur.timeouts.changeUrl) {
      clearTimeout(cur.timeouts.changeUrl);
    }
    cur.timeouts.changeUrl = setTimeout(Video.doChangeUrl, 2000);
  },
  changeSummary: function() {
    var str, searchStr, oldSearhSummary = false, htitle;
    var sec = cur.vSection;
    if (sec == 'comments') {
      if (cur.commentsCount) {
        cur.summary.innerHTML = langNumeric(cur.commentsCount, cur.lang['video_X_comms'], true);
      } else {
        cur.summary.innerHTML = getLang('video_no_comments');
      }

      hide(cur.searchSummary);
      htitle = cur.htitle_comments + (cur.commentsCount ? ' | ' + getLang('video_X_comms', cur.commentsCount) : '');
      document.title = replaceEntities(stripHTML(htitle));
      hide('video_comments_link');

      return true;
    } else if (sec == 'recommendations') {
      cur.summary.innerHTML = cur.recommsSummary;
      document.title = replaceEntities(stripHTML(cur.recommsSummary));
      hide('video_comments_link');
      return true;
    }
    if (cur.vSection == 'search' && cur.vStr) {
      var hd = cur.vHD ? cur.vHD : 0;
      var searchData = cur.searchData[cur.vStr + hd.toString() + cur.vOrder.toString()];
      var len = (searchData) ? searchData.count : 0;
      if (len/* || !cur.loading*/) {
        searchStr = langNumeric(len, cur.lang['video_num_found_files'], true);
      }
      if (!len && cur.loading) {
        oldSearhSummary = true;
      }
      htitle = getLang('video_title_search').replace('{q}', cur.vStr) + (len ? ' | ' + getLang('video_title_search_X_found', len) : '');
    }

    var sec = cur.vSection;
    if (cur.vSection == 'search') {
      if (cur.vStr) {
        sec += '_'+cur.vStr;
      } else {
        sec = 'all';
      }
      if (cur.vHD) {
        sec += '_opt_hd'+cur.vHD;
      }
    }
    if (cur.videoList[sec]) {
      var len = cur.videoList[sec].length;
    }

    if (cur.vSection == 'tagged') {
      htitle = cur.htitle_videos + (len ? ' | ' + langNumeric(len, cur.lang['video_title_X_videos_tagged'], true) : '').replace('{user}', cur.htitle_tagged_user);
    }
    if (!htitle) {
      htitle = cur.htitle_videos + (len ? ' | ' + langNumeric(len, cur.lang['video_title_X_videos'], true) : '');
    }
    if (len) {
      str = len + ' ' + langNumeric(len, cur.lang['videofile_num'], true);
    }

    var searchSummary = false;
    if (str) {
      if (searchStr) {
        cur.searchSummary.innerHTML = '<div class="summary">' + searchStr + '</div>';
        show(cur.searchSummary);
      } else if (!oldSearhSummary) {
        hide(cur.searchSummary);
      }
    } else {
      if (searchStr) {
        str = searchStr;
        searchSummary = true;
      } else {
        str = cur.lang['video_novideo'];
        show(cur.notFound);
        if (cur.vSection.indexOf('album_') === 0) {
          cur.notFound.className = 'video_info_msg video_v_album';
        } else if (cur.vSection != 'search') {
          cur.notFound.className = 'video_info_msg';
        } else {
          cur.notFound.className = 'video_info_msg video_v_search';
          searchSummary = true;
        }
        if (cur.vSection.indexOf('album_') === 0) {
          addClass(cur.notFound, 'video_v_album');
        }
        hide(cur.more);
      }
      hide(cur.searchSummary);
    }
    if (!searchSummary) {
      if (cur.vSection.indexOf('album_') === 0) {
        if (vk.id == cur.oid || (cur.oid < 0 && cur.isGroupAdmin)) {
          str += '<span class="divider">|</span><span><a onclick="Video.deleteAlbum(\'' + cur.vSection + '\');">' + getLang('video_delete_album') + '</a></span>';
        }
      } else if (cur.vSection == 'tagged' && cur.tagsCount > 10) {
        str += '<span class="divider">|</span><span><a onclick="Video.removeAllTags();">' + getLang('video_remove_all_tags') + '</a></span>';
      }
        show('video_comments_link')
    } else {
      hide('video_comments_link');
    }
    cur.summary.innerHTML = str;
    document.title = replaceEntities(stripHTML(htitle));
  },
  loadFromSearch: function(str) {
    var hd = cur.vHD ? cur.vHD : 0;
    if (!cur.searchData[str+hd.toString()+cur.vOrder.toString()]) {
      cur.searchData[str+hd.toString()+cur.vOrder.toString()] = {
        count: 0,
        list: [],
        offset: 0
      };
    }
    var searchData = cur.searchData[str+hd.toString()+cur.vOrder.toString()];
    ajax.post('al_video.php', {
      act: 'search_video',
      q: str,
      offset: searchData.offset,
      hd: hd,
      length: cur.vLength || 0,
      show_adult: cur.adult ? 1 : 0,
      ext: cur.vExt,
      order: cur.vOrder
    }, {
      onDone: (function(count, data) {
        if (!cur.silent) {
          removeClass(cur.videoSearch, 'v_loading');
          removeClass(cur.more, 'load_more');
        } else {
          cur.onSilentLoad = function() {
            removeClass(cur.videoSearch, 'v_loading');
            removeClass(cur.more, 'load_more');
          }
        }
        data = eval('('+data+')');

        Array.prototype.push.apply(searchData.list, data);
        if (str != cur.vStr) {
          return false;
        }
        if (cur.clearOnSearch) {
          this.clearOutput();
          cur.clearOnSearch = false;
        }
        if (data.length === 0) {
          //cur.videoCount[sec][1] = cur.videoList[sec].length;
          searchData.ended = true;
          if (!searchData.count && !cur.shown) {
            show(cur.notFound);
            hide(cur.more);
            cur.notFound.className = 'video_info_msg video_v_search';
            ge('search_ph').innerHTML = cur.vStr.replace(/([<>&#]*)/g, '');
          }
        } else {
          searchData.count = parseInt(count);
          Video.showMore();
          cur.loading = false;
          if (cur.canEditAlbums && cur.albumsSorter && !(trim(str) && str != '""')) {
            qsorter.update(cur.albumsCont);
          }
          if (cur.cansort) {
            qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
          }
        }
        searchData.offset += data.length;
        this.changeSummary();
      }).bind(this),
      cache: 1
    });
  },
  clearOutput: function() {
    cur.vRows.innerHTML = '';
    cur.vSearchRows.innerHTML = '';
    hide(cur.notFound);
    hide(cur.searchSummary);
    cur.shown = 0;
    if (cur.editmode) {
      VideoEdit.onChanging();
    }
  },
  scrollResize: function() {
    if (browser.mobile) return;
    var docEl = document.documentElement;
    var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
    var st = scrollGetY();
    if (!cur.pageEnd) {
      return;
    }
    if (st + ch > cur.pageEnd.offsetTop) {
      setTimeout(function() {
        Video.showMore();
      }, 0);
    }
  },
  showMore: function() {
    var sec = cur.vSection;
    if (sec == 'search') {
      if (cur.vStr) {
        sec += '_'+cur.vStr;
      } else {
        sec = 'all';
      }
      if (cur.vHD) {
        sec += '_opt_hd'+cur.vHD;
      }
    }
    if (sec == 'comments' || sec == 'recommendations') {
      if (cur.shown < cur[sec + 'Count']) {
        this.loadSection(sec, cur.shown);
        addClass(cur.more, 'load_more');
        show(cur.more);
        return;
      }
    }

    var list = cur.videoList[sec];
    if (!list) {
      return;
    }
    var usersLen = list.length;

    var added = false;

    //var listLen = usersLen + searchCount;
    var limit = cur.shown + cur.perPage;
    if (usersLen < limit) {
      limit = usersLen;
    }
    if (cur.vSection == 'tagged' || cur.vSection == 'uploaded') {
      var linkAddr = '?'+cur.vSection+'='+cur.oid;
    } else {
      var linkAddr = '';
    }
    var linkAddr = '?section='+cur.vSection
    for (var i = cur.shown; i < limit; i++) {
      cur.vRows.appendChild(se(this.drawVideo(list[i], linkAddr)));
      cur.shown++;
      added = true;
    }
    if (cur.cansort) {
      qsorter.added(cur.vRows);
    }

    if (cur.vSection == 'search' && cur.vStr) { // search
      var hd = cur.vHD ? cur.vHD : 0;
      var searchData = cur.searchData[cur.vStr+hd.toString()+cur.vOrder.toString()];

      var searchCount = (searchData) ? searchData.count : 0;
      var searchLen = (searchData) ? searchData.list.length : 0;
      if (!cur.loading && cur.vStr && searchLen < searchCount && cur.shown + cur.perPage/* + 20*/ > searchLen) {
        cur.loading = true;
        this.loadFromSearch(cur.vStr);
        //show(cur.more);
        addClass(cur.more, 'load_more');
      }

      if (cur.shown >= usersLen) {
        var startPos = cur.shown - usersLen;
        //if (startPos < searchLen) {
          for (var i = startPos; i < searchLen; i++) {
            cur.vSearchRows.appendChild(se(this.drawVideo(searchData.list[i], linkAddr)));
            cur.shown++;
            added = true;
          }
        //}
      }
      if (usersLen + searchCount > cur.shown && !searchData.ended) {
        show(cur.more);
      } else {
        hide(cur.more);
      }
    } else {
      if (cur.silent && cur.shown == limit && cur.shown < cur.videoCount) {
        addClass(cur.more, 'load_more');
        show(cur.more);
      } else if (usersLen > cur.shown) {
        show(cur.more);
      } else {
        hide(cur.more);
      }
    }

    if (cur.updateSorter) {
      added = true;
      delete cur.updateSorter;
    }

    if (added && cur.editmode) {
      setTimeout(function() {
        VideoEdit.onAdding();
      }, 0);
    }
  },
  drawVideo: function(video, linkAddr) {
    v = video.slice();
    if (cur.selection) {
      v[3] = v[3].replace(cur.selection.re, cur.selection.val);
    }
    return cur.videoTpl(v, (v[11].substr(0, 1) != '_') ? ' video_can_edit' : '');
  },
  updateList: function(e, obj) {
    if (e.keyCode == 27) {
      return Video.searchVideos(false);
    }
    clearTimeout(cur.searchTimeout);
    setTimeout((function() {
      var str = trim(obj.value);
      if (str != cur.vStr) {
        this.searchVideos(str);
      }
    }).bind(this), 10);
  },
  recache: function(videoRaw) {
    if (!videoRaw && window.mvcur && mvcur.mvData.videoRaw) {
      videoRaw = mvcur.mvData.videoRaw;
    }
    delete ajaxCache['/al_video.php#act=show&list=&module=video&video=' + videoRaw];
    delete ajaxCache['/al_video.php#act=show&autoplay=1&list=&module=video&video=' + videoRaw];
  },
  loadSection: function(section, offset) {
    if (cur[section+'Loading']) {
      return;
    }
    cur[section+'Loading'] = true;
    if (offset == 0) {
      addClass(ge('video_section_' + section), 'loading');
      cur.vSection = section;
    }
    var params = {
      act: 'load_section_'+section,
      oid: cur.oid,
      offset: offset
    };
    if (section == 'recommendations' && nav.objLoc.like) {
      params['like'] = nav.objLoc.like;
    }
    ajax.post('al_video.php', params, {
      onDone: function(count, shown, data, curExt) {
        if (curExt) {
          extend(cur, curExt);
        }
        if (offset == 0) {
          Video.clearOutput();
          cur[section + 'Count'] = count;
          removeClass(ge('video_section_' + section), 'loading');
        }
        removeClass(cur.more, 'load_more');
        hide(cur.more);
        cur.shown = shown;
        var cont = ce('div', {
          innerHTML: data
        });
        cur.vRows.appendChild(cont);
        Video.changeSummary();
        Video.onSwitchTabs(section);
        if (cur.cansort) {
          qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
        }
        if (offset == 0 && shown == 0 && section != 'comments') {
          show(cur.notFound);
        }
        delete cur[section+'Loading'];
      },

      onFail: function() {
        delete cur[section+'Loading'];
      },
      showProgress: function() {
        show('video_tabs_progress');
        hide('video_tabs_link');
      },
      hideProgress: function() {
        hide('video_tabs_progress');
        var num = 0;
        for(var i in cur.sections) num += 1;
        if (!num) {
          show('video_tabs_link');
        }
      }
    });
  },
  loadFrom: function(url, params, section) {
    addClass(ge('video_section_'+section), 'loading');
    cur.vSection = section;
    // pass
    ajax.post(url, params, {onDone: (function(count, data, obj) {
      removeClass(ge('video_section_'+section), 'loading');
      if (obj) {
        extend(cur, obj);
      }
      cur.vSection = section;
      data = eval('('+data+')');
      cur.videoList[section] = data;
      if (cur.vSection == section) {
        this.clearOutput();
        this.showMore();
        if (cur.canEditAlbums && cur.albumsSorter && !(trim(cur.vStr) && cur.vStr != '""')) {
          qsorter.update(cur.albumsCont);
        }
        if (cur.cansort) {
          qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
        }
        this.changeSummary();
        this.onSwitchTabs(section);
      }
    }).bind(this)})

  },
  filter: function(cond, list) {
    var all = cur.videoList['all'];
    var len = all.length;
    var result = [];
    for (var i = 0; i < len; i++) {
      var obj = all[i];
      if (cond(obj)) {
        result.push(obj);
      }
    }
    cur.videoList[list] = result;

    len = result.length;
    return result;
  },
  clearSearch: function() {
    cur.selection = false;
    cur.vSearch.setValue('');
  },
  generateList: function(section) {
    if (!section) return;
    if (section == 'uploaded') {
      this.filter(function(obj) {
        return obj[8];
      }, section);
      this.onSwitchTabs(section);
    } else if (section == 'tagged') {
      this.loadFrom('al_video.php', {act: 'get_tagged_video', mid: cur.oid}, section);
      return false;
    } else if (section == 'recommendations') {
      this.loadSection(section, 0);
      return false;
    } else if (section == 'comments') {
      stManager.add(['videoview.js'], (function() {
        this.loadSection(section, 0);
      }).bind(this));
      return false;
    } else if (section.substr(0, 6) == 'album_') {
      var album = parseInt(section.substr(6));
      this.filter(function(obj) {
        return obj[6] == album;
      }, section);
      this.onSwitchTabs(section);
    }
    return true;
  },
  section: function(section) {
    if (!section) {
      section = 'all';
    }

    if (cur.silent && section != 'tagged' && section != 'comments') {
      cur.onSilentLoad = function() {
        Video.section(section);
      }
      Video.clearOutput();
      cur.vRows.innerHTML = '<div id="video_wide_loading" class="wide_loading"></div>';
      hide(cur.more);
      cur.vSection = section;
      return true;
    }
    if (section != 'search') {
      this.clearSearch();
      hide('video_addition_options', 'video_sort_dd', 'video_external_dd_wrap');
    } else {
      if (cur.vStr) {
        cur.vSearch.setValue(cur.vStr);
      }
      if (!cur.editmode) {
        show('video_addition_options', 'video_sort_dd', 'video_external_dd_wrap');
      } else {
        hide('video_addition_options', 'video_sort_dd', 'video_external_dd_wrap');
      }
    }

    /*if (section != 'all') {
      addClass(ge('video_content'), 'video_albums_hidden');
    } else {
      removeClass(ge('video_content'), 'video_albums_hidden');
    }*/

    if (!cur.videoList[section]) {
      if (!this.generateList(section)) {
        return;
      }
    }
    /*if (!cur.videoCount[section] && cur.videoList[section]) {
      var len = cur.videoList[section].length;
      cur.videoCount[section] = [len, len, 0];
    }*/
    cur.vSection = section;
    this.clearOutput();
    this.showMore();
    if (cur.cansort) {
      qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
    }
    this.changeSummary();
    if (section != 'search' || !cur.vStr) {
      removeClass(ge('video_reset_search'), 'video_reset_search_shown');
      Video.hideOptions();
    } else {
      addClass(ge('video_reset_search'), 'video_reset_search_shown');
      Video.showOptions();
    }
    this.onSwitchTabs(section);
    if (cur.canEditAlbums && cur.albumsSorter && !(trim(cur.vStr) && cur.vStr != '""')) {
      qsorter.update(cur.albumsCont);
    }
  },
  onSwitchTabs: function(section) {
    var newTab = ge('video_tab_'+(section == 'search' ? 'all' : section));
    var oldTab = geByClass1('active_link', ge('video_tabs'));
    if (newTab != oldTab) {
      removeClass(oldTab, 'active_link');
      addClass(newTab, 'active_link');
    }

    if (section.substr(0, 6) == 'album_' || section == 'tagged' || section == 'comments') {
      cur.hTab.className = 'active_link';
      if (section == 'comments') {
        var tabName = getLang('video_comments_review');
      } else {
        var tabName = '';
        for (var i in cur.sections) {
          if (cur.sections[i][0] == ((section == 'tagged') ? -1 :  parseInt(section.substr(6)))) {
            tabName = cur.sections[i][1];
          }

        }
      }
      geByClass1('tab_word', cur.hTab).firstChild.innerHTML = tabName;

      addClass(ge('video_content'), 'video_albums_hidden');
    } else {
      cur.hTab.className = 'video_tab_hidden';
      if (section != 'search') {
        removeClass(ge('video_content'), 'video_albums_hidden');
      }
    }
    toggleClass(ge('video_rows'), 'wall_module', section == 'comments');
    if (cur.sorter) {
      cur.sorter.updateDragCont();
    }
  },
  showAlbums: function(obj) {
    while (ge('video_albums_more') && ge('video_albums_more').firstChild) {
      var el = ge('video_albums_more').firstChild;
      ge('video_albums_wrap').appendChild(el);
    }
    hide(obj);
    if (cur.canEditAlbums && cur.albumsSorter && !(trim(cur.vStr) && cur.vStr != '""')) {
      qsorter.added(cur.albumsCont);
    }
    if (cur.cansort) {
      qsorter.update(cur.vRows, {dragEls: geByClass('video_album_candrop', cur.albumsCont)});
    }
  },
  deleteAlbum: function(section, ev) {
    showBox('al_video.php', {act: 'delete_album', aid: section.substr(6), oid: cur.oid});
    return cancelEvent(ev);
  },
  editAlbum: function(aid, ev) {
    showBox('al_video.php', {act: 'edit_album', oid: cur.oid, aid: aid, oid: cur.oid});
    return cancelEvent(ev);
  },
  createAlbum: function() {
    showBox('al_video.php', {act: 'edit_album', oid: cur.oid});
  },
  uploadVideoBox: function() {
    if (cur.uploadBanned) {
      setTimeout(showFastBox(getLang('video_no_upload_title'), getLang('video_claims_no_upload')).hide, 5000);
      return false;
    }
    var box = showTabbedBox('al_video.php', {act: 'upload_box', oid: cur.oid}, {stat: ['video_edit.css', 'privacy.css', 'privacy.js'], params: {bodyStyle: 'position: relative;'}});
    return false;
  },
  removeAllTags: function() {
    showBox('al_video.php', {act: 'remove_all_tags_box'});
  },

  xRow: function(event, opacity, row, hint) {
    if (hint) showTooltip(row, {text: hint, showdt: 500});
    animate(hasClass(row, 'video_close') ? row : geByClass1('video_close', row), {opacity: opacity}, 200);
    return cancelEvent(event);
  },

  removeRecomm: function(obj) {
    var el = obj.parentNode;
    while(el && !hasClass(el, 'video_row_cont')) {
      el = el.parentNode;
    }
    if (!el) return;
    slideUp(el, 50);
    ajax.post('al_video.php', {act: 'hide_recommendation', video: el.id.substr(9), hash: cur.hash});
  },
  albumOver: function(obj) {
    if (cur.canEditAlbums && obj.id.split('_')[2] > 0) {
      Video.activate(geByClass1('video_album_controls', obj));
    }
  },
  albumOut: function(obj) {
    if (cur.canEditAlbums) {
      Video.deactivate(geByClass1('video_album_controls', obj), 0);
    }
  },

  addFromList: function(videoRaw, hash, ev) {
    var videoCont = ge('video_cont'+videoRaw);
    if (hasClass(videoCont, 'video_row_added')) {
      return cancelEvent(ev);
    }
    videoview.addVideo(videoRaw, hash, false, false, false, 'list');
      var videoEl = geByClass1('video_row_icon_add', videoCont);
      if (videoEl && videoEl.tt) {
        videoEl.tt.hide();
      }
    return cancelEvent(ev);
  },

  rowOver: function(obj) {
    var animEl = geByClass1((hasClass(obj.parentNode, 'video_can_edit')) ? 'video_row_controls' :  'video_row_add', obj);
    Video.activate(animEl);
    if (hasClass(obj, 'video_row_overed')) {
      return;
    }
    addClass(obj, 'video_row_overed')
    var line = geByClass1('video_row_info_line', obj);
    var name = geByClass1('video_raw_info_name', obj);
    var size = getSize(name);
    var height = Math.max(16, Math.min(size[1], 54));
    cssAnim(line, {height: height, marginTop: 150 - (height - 16)}, {duration: 200, transition: Fx.Transitions.easeOutCubic});
  },
  rowOut: function(obj) {
    var animEl = geByClass1((hasClass(obj.parentNode, 'video_can_edit')) ? 'video_row_controls' :  'video_row_add', obj);
    Video.deactivate(animEl, 0);
    var line = geByClass1('video_row_info_line', obj);
    removeClass(obj, 'video_row_overed')
    cssAnim(line, {height: 16, marginTop: 150}, {duration: 200, transition: Fx.Transitions.easeOutCubic});
  },
  activate: function(obj, ttLng, check) {
    animate(obj, {opacity: 1}, 100);
    if (ttLng) {
      if (check == 1 && hasClass(obj.parentNode.parentNode.parentNode.parentNode, 'video_row_added')) {
        return false;
      }
      showTooltip(obj, {
        black: 1,
        center: 1,
        shift: [0,2,0],
        text: getLang('video_'+ttLng)
      });
    }
  },
  deactivate: function(obj, value) {
    animate(obj, {opacity: value === undefined ? 0.8 : value}, 100);
  },
  albumDragOver: function(el) {
    fadeOut(geByClass1('video_album_info', el), 200);
    fadeOut(geByClass1('videos_album_tags', el), 200);
    var moveEl = geByClass1('videos_album_move', el)
    if (!moveEl) {
      moveEl = ce('div', {className: 'videos_album_move'})
      el.insertBefore(moveEl, el.firstChild);
    }
    moveEl.innerHTML = getLang('video_drop_to_move');
    setStyle(moveEl, {marginTop: getSize(el)[1] / 2 - getSize(moveEl)[1] / 2})
    fadeIn(moveEl, 200);
  },
  albumDragOut: function(el) {
    fadeIn(geByClass1('video_album_info', el), 200);
    fadeIn(geByClass1('videos_album_tags', el), 200);
    fadeOut(geByClass1('videos_album_move', el), 200);
  },
  updateVideoAlbum: function(vid, albumId) {
    var oldAlbum = 0;
    var list = cur.videoList['all'];
    for (var i in list) {
      if (list[i][1] == vid) {
        oldAlbum = list[i][6];
        if (oldAlbum == albumId) {
          return false;
        }
        list[i][6] = albumId;
      }
    }
    delete cur.videoList['album_'+oldAlbum];
    delete cur.videoList['album_'+albumId];
    if (cur.vSection == 'album_'+oldAlbum) {
      Video.section('album_'+oldAlbum);
    }
  },
  albumDrop: function(el, obj) {
    var moveEl = geByClass1('videos_album_move', el)
    if (moveEl) {
      moveEl.innerHTML = '<div class="progress_inline progress_inv" style="height: '+(getSize(moveEl)[1] - 16)+'px"></div>';
    }
    var videoId = obj.id.replace('video_cont', '').split('_');
    var oid = videoId[0];
    var vid = videoId[1];
    var albumId = el.id.replace('video_album_', '');
    ajax.post('al_video.php', {act: 'move_to_album', album_id: albumId, hash: cur.moveHash, oid: oid, vid: vid, from: 'list'}, {
      onDone: function(text, newList) {
        showDoneBox(text);
        Video.updateAlbums(newList);
        /*moveEl.innerHTML = text;
        setStyle(moveEl, {height: 'auto'});
        setStyle(moveEl, {marginTop: getSize(el)[1] / 2 - getSize(moveEl)[1] / 2})
        setTimeout(Video.albumDragOut.pbind(el), 3000);*/
        Video.updateVideoAlbum(vid, albumId);
      }
    });
    return true;
  },
  showOptions: function() {
    if (cur.shownOptions) return;
    cur.shownOptions = true;
    addClass(cur.videoSearch, 'video_search_extended');
  },
  hideOptions: function() {
    if (!cur.shownOptions) return;
    cur.shownOptions = false;
    removeClass(cur.videoSearch, 'video_search_extended');
  }
}

try{stManager.done('video.js');}catch(e){}
