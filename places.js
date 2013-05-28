var Places = {

initPhotoMap: function(opts) {
  var map;
  cur.photoMapOpts = opts;
  if (!window.google || !google.maps.OverlayView) {
    if (!opts.googleAttaced) {
      headNode.appendChild(ce('script', {
        type: 'text/javascript',
        src: (window.locProtocol || 'http:') + '//maps.google.com/maps/api/js?sensor=false&callback=gMapsInit&language='+(cur.vkLngCode || 'en')
      }));
    }
    window.gMapsInit = function() {
      Places.initPhotoMap(opts);
      delete window.gMapsInit;
    }
    return false;
  }

  function CustomMarker(latlng, map, src, count, diff) {
    this.latlng = latlng;
    this.photoSrc = src;
    this.photoCount = count;
    this.photoDiff = diff;
    this.setMap(map);
  }

  CustomMarker.prototype = new google.maps.OverlayView();

  CustomMarker.prototype.draw = function() {
    var div = this.photoDiv;
    if (!div) {

      var div = ce('div', {className: 'profile_map_photo profile_map_first'}, {
        background: 'url('+this.photoSrc+') center center no-repeat'
      });
      this.photoInnerDiv = div;
      var len = Math.min(this.photoCount - 1, 3);

      while(len--) {
        var inner = ce('div', {className: 'profile_map_photo'});
        setStyle(div, {
          marginLeft: -2,
          marginTop: -4
        })
        inner.appendChild(div);
        div = inner;
      }
      this.photoDiv = div;
      if (this.photoCount > 1 && this.photoDiff) {
        var cnt = this.photoCount;
        if (cnt > 99) {
          cnt = '99+';
        }
        this.photoInnerDiv.appendChild(ce('span', {className: 'profile_map_photo_count', innerHTML: cnt}))
      }

      google.maps.event.addDomListener(div, 'click', (function(event) {
        google.maps.event.trigger(this, 'click');
        return cancelEvent(event);
      }).bind(this));

      var panes = this.getPanes();
      panes.overlayImage.appendChild(div);
    }

    var point = this.getProjection().fromLatLngToDivPixel(this.latlng);
    if (point) {
      div.style.left = point.x + 'px';
      div.style.top = point.y + 'px';
    }
  };

  CustomMarker.prototype.remove = function() {
    if (this.photoDiv) {
      this.photoDiv.parentNode.removeChild(this.photoDiv);
      this.photoDiv = null;
    }
  };

  CustomMarker.prototype.getPosition = function() {
   return this.latlng;
  };

  function unexpandPoint(point, sub) {
    if (!point.expanded) {
      return false;
    }
    if (!sub) {
      point.overlay.setMap(map);
    }
    point.expanded = false;
    var p = point.points;
    if (p) {
      for (i in p) {
        var subPoint = p[i];
        if (subPoint.overlay) {
          subPoint.overlay.setMap(null);
          unexpandPoint(subPoint, true)
        }
      }
    }
  }

  function expandPoint(point, possive) {
    if (point.diff && point.diff < 0.00002) {
      return false;
    }
    if (point.diff && point.diff <= (point.count + 1) * 0.000001) {
      return false;
    }
    var p = point.points;
    if (p) {
      if (point.expanded || possive) {
        return false;
      }
      var len = p.length;
      while (len--) {
        var subPoint = p[len];
        if (subPoint.overlay) {
          subPoint.overlay.setMap(map);
        } else {
          var pt = new google.maps.LatLng(subPoint.lat, subPoint.lng);
          subPoint.overlay = new CustomMarker(pt, map, subPoint.src, subPoint.count, subPoint.diff);
          google.maps.event.addListener(subPoint.overlay, 'click', (pointClick).pbind(subPoint));
        }
      }
      point.overlay.setMap(null);
      point.expanded = true;
    } else if (!point.loading) {
      point.loading = true;
      ajax.post('al_places.php', {
        act: 'a_get_points',
        diff: point.diff || opts.diffZone,
        lat: point.lat,
        lng: point.lng,
        uid: opts.uid
      }, {
        onDone: function(points) {
          point.points = points;
          expandPoint(point, possive);
        },
        onFail: function() {
          point.loading = false;
        }
      })
    }
  }

  function checkPointsReq(points, mapBounds) {
    if (!points) {
      return false;
    }
    for (i in points) {
      var point = points[i];
      if (point.count <= 1) {
        continue;
      }
      var diff = (point.diff * 15) || opts.diffZone;
      var inside = (point.lat + diff > mapBounds.neLat && point.lat - diff < mapBounds.swLat && point.lng + diff > mapBounds.neLng && point.lng - diff < mapBounds.swLng);

      if (!inside) {
        if (point.expanded) {
          unexpandPoint(point);
        }
        continue;
      }
      if (point.expanded) {
        checkPointsReq(point.points, mapBounds);
      } else if (inside) {
        expandPoint(point);
      } else if (point.expanded) {
        unexpandPoint(point);
      }
    }
  }

  function updateMapPoints() {
    checkPointsReq(opts.points, getMapBounds());
  }

  function zoomToPoint(point) {
    var mapBounds = map.getBounds();
    var ne = mapBounds.getNorthEast();
    var sw = mapBounds.getSouthWest();
    var zoom =  map.getZoom();
    if (point.diff) {
      var needZoom = ((ne.lat() - sw.lat()) * 0.9) > point.diff * 2;
    } else {
      var needZoom = zoom < 17;
    }
    if (needZoom) {
      map.setZoom(zoom + 1)
      //zoomToPoint(point);
      setTimeout(zoomToPoint.pbind(point), 0)
    } else {
      updateMapPoints();
    }
  }

  function pointClick(point) {
    if (!opts.box) {
      showBox('al_places.php', {
        act: 'photos_box',
        lat: point.lat,
        lng: point.lng,
        diff: opts.diffZone,
        uid: opts.uid
      }, {
        stat: ['maps.js', 'places.js', 'places.css', 'ui_controls.js', 'ui_controls.css']
      });
      return false;
    }
    if (point.count == 1/* || point.diff < 0.0001*/ || true) {
      var photo = point.photo.split('_');
      if (point.overlay) {
        var el = point.overlay.photoInnerDiv;
        var cnt = geByClass1('profile_map_photo_count', el);
        if (cnt) {
          hide(cnt);
        }
        re('profile_map_photo_loader');
        var loader = ce('div', {id: 'profile_map_photo_loader'});
        el.appendChild(loader);
      }
      var diff = (point.diff || 0.000001);
      var list = 'map'+opts.uid+'_'+(point.lat - diff)+'_'+(point.lng - diff)+'_'+(point.lat + diff)+'_'+(point.lng + diff);
      //var list = point.listId || 'photos'+photo[0];
      return opts.showPlacePhoto(point.photo, list, {});
    }/* else if (opts.box) {
      map.panTo(new google.maps.LatLng(point.lat, point.lng));
      zoomToPoint(point);
      expandPoint(point, true);
    }*/
    return false;
  }

  function getMapBounds() {
    var mapBounds = map.getBounds();
    var ne = mapBounds.getNorthEast();
    var sw = mapBounds.getSouthWest();
    var zoom = map.getZoom();
    if (zoom < 3) {
      var res = {
        swLat: -90,
        swLng: -90,
        neLat: 90,
        neLng: 90
      };
    } else {
      var res = {
        swLat: sw.lat(),
        swLng: sw.lng(),
        neLat: ne.lat(),
        neLng: ne.lng()
      };
    }
    return res;
  }

  function updatePhotosList() {
    var mapBounds = getMapBounds();
    ajax.post('al_places.php', {
      act: 'update_photos_list',
      uid: opts.uid,
      sw_lat: mapBounds.swLat,
      sw_lng: mapBounds.swLng,
      ne_lat: mapBounds.neLat,
      ne_lng: mapBounds.neLng
    }, {
      onDone: function(html) {
        ge('place_map_other').innerHTML = html;
      }
    })
    checkPointsReq(opts.points, mapBounds);
  }

  cur.editPhotosPlace = false;

  var mapOpts = {
    center: new google.maps.LatLng(opts.lat, opts.lng),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: true
  }
  if (opts.nowheel) {
    mapOpts.scrollwheel = false;
    mapOpts.disableDoubleClickZoom = true;
  }
  if (opts.map) {
    map = opts.map;
  } else {
    map = new google.maps.Map(ge(opts.cont), mapOpts);
  }
  if (opts.box) {
    cur.placeBoxMap = map;
    cur.placeBoxOpts = opts;
  } else {
    cur.placesPhotoMap = map;
    cur.placesPhotoOpts = opts;
  }

  if (opts.bounds) {
    var sw = new google.maps.LatLng(opts.bounds.swlat, opts.bounds.swlng);
    var ne = new google.maps.LatLng(opts.bounds.nelat, opts.bounds.nelng);
    map.fitBounds(new google.maps.LatLngBounds(sw, ne));
  } else {
    if (!opts.lat && !opts.lng) {
      opts.lat = 30;
    }
    map.setCenter(new google.maps.LatLng(opts.lat, opts.lng));
    map.setZoom(1);
  }

  var firstTimeout = true;
  if (!opts.nowheel) {
    google.maps.event.addListener(map, 'bounds_changed', function() {
      if (cur.editPhotosPlace) {
        fadeOut(ge('places_photo_hint_cont'), 200);
      }
      if (cur.mapMoveTimeout) {
        clearTimeout(cur.mapMoveTimeout);
      }
      cur.mapMoveTimeout = setTimeout(updateMapPoints, 200)
      if (firstTimeout) {
        firstTimeout = false;
        return false;
      }
      if (opts.box) {
        if (cur.mapMoveServerTimeout) {
          clearTimeout(cur.mapMoveServerTimeout);
        }
        cur.mapMoveServerTimeout = setTimeout(updatePhotosList, 500)
      }
    });
  }

  if (opts.points) {
    var len = opts.points.length;
    while(len--) {
      var point = opts.points[len];
      var p = new google.maps.LatLng(point.lat, point.lng);
      point.overlay = new CustomMarker(p, point.points ? null : map, point.src, point.count, point.diff);
      google.maps.event.addListener(point.overlay, 'click', (pointClick).pbind(point));
      if (point.points) {
        expandPoint(point);
      }
    }
  }


  google.maps.event.addDomListener(map, 'click', (function(point) {
    var lat = point.latLng.lat();
    var lng = point.latLng.lng();
    if (!opts.box) {
      Places.showProfileBox(opts.uid);
    }
  }).bind(this));
},

showProfileBox: function(uid) {
  showBox('al_places.php', {
    act: 'photos_box',
    uid: uid
  }, {
    stat: ['maps.js', 'places.js', 'places.css', 'ui_controls.js', 'ui_controls.css']
  });
  return false;
},

setMarker: function(map, point) {
  cur.placeMarker = new vkMaps.Marker(point);
  cur.placeMarker.mousedown.addHandler(function() {
  });
  cur.placeMarker.dragend.addHandler(function(type, marker) {
    marker.update();
    Places.setPlaceStr(marker.location);
  });
  map.addMarkerWithData(cur.placeMarker, {
    draggable: true,
    icon: '/images/map/move.png',
    iconSize: [33, 32],
    iconAnchor: [16, 32],
    infoBubble: ''
  });
},

showMorePhotos: function(uid) {
  if (!cur.addPhotosOffset || cur.PlacesPhotosMoreBack) {
    return false;
  }
  var cont = ge('places_photo_more');
  cur.PlacesPhotosMoreBack = cont.innerHTML;
  ajax.post('al_places.php', {act: 'a_edit_photos', uid: uid, offset: cur.addPhotosOffset}, {
    onDone: function(html, offset, showmore) {
      cur.addPhotosOffset = offset;
      if (!showmore) {
        hide('places_photo_more');
      }
      var elsCont = ge('places_map_add_list');
      elsCont.appendChild(cf(html));
      cur.PlacesPhotosMoreBack = false;
    },
    showProgress: function() {
      cont.innerHTML = '<img src="/images/upload.gif">';
    },
    hideProgress: function() {
      cont.innerHTML = cur.PlacesPhotosMoreBack;
    }
  }, {stat: ['upload.js']})
},

addPhotos: function(obj, uid) {
  ajax.post('al_places.php', {act: 'a_edit_photos', uid: uid}, {
    onDone: function(html, js, offset) {
      hide('places_edit_step_0');
      show('places_edit_step_1');
      hide('places_edit_step_2');
      hide('places_edit_step_3');
      hide('place_map_cont');
      cur.addPhotosOffset = offset;
      cur.editPhotosPlace = true;
      cur.placesFixedBottom = false;
      var editCont = ge('place_map_edit');
      editCont.innerHTML = html;
      show(editCont);
      hide('place_map_other');

      /*var tt = ge('places_photo_hint_cont');
      if (tt) {
        fadeIn(tt, 100);
      } else {
        var mapCont = ge('place_map_cont');
        var tt = ce('div', {
          innerHTML: '<div class="places_photo_hint">'+getLang('places_select_position')+'</div><div id="places_photo_pointer"></div>',
          className: 'places_photo_hint_cont',
          id: 'places_photo_hint_cont'
        });
        mapCont.parentNode.insertBefore(tt, mapCont);
        var w = getSize(tt)[0];
        tt.style.marginLeft = intval((666 - w) / 2) + 'px';
        ge('places_photo_pointer').style.marginLeft = intval((w/2) - 10)+ 'px';
      }
      show('places_photos_save_panel');
      Places.setMarker(cur.vkmap.getCenter());*/
      cur.onPlaceScroll();
      if (js) {
        eval('(function() {'+js+'})();')
      }
    },
    showProgress: function() {
      lockButton(obj);
    },
    hideProgress: function() {
      unlockButton(obj);
    }
  })
},

step2: function() {
  hide('places_edit_step_0');
  show('places_edit_step_1');
  hide('places_edit_step_2');
  hide('places_edit_step_3');
  hide('place_map_cont');
  show('place_map_edit');
  hide('place_map_point');
  hide('place_map_other');
  cur.vkmap.removeMarker(cur.placeMarker);
},

cancelAdd: function() {
  cur.editPhotosPlace = false;
  show('places_edit_step_0');
  hide('places_edit_step_1');
  hide('places_edit_step_2');
  hide('places_edit_step_3');
  show('place_map_cont');
  hide('place_map_edit');
  hide('place_map_point');
  show('place_map_other');
  cur.vkmap.removeMarker(cur.placeMarker);
},

selectPhoto: function(pids, photoSrc, lat, lng) {
  cur.mapPids = pids;
  hide('places_edit_step_0');
  hide('places_edit_step_1');
  show('places_edit_step_2');
  hide('places_edit_step_3');
  hide('place_map_edit');
  show('place_map_point');
  var mapChoose = new vkMaps.VKMap('place_map_point_cont', {
    provider: 'google',
    providerId: 2,
    lngcode: cur.vkLngCode,
  });
  cur.placesChooseMap = mapChoose;
  placeholderSetup(ge('place_map_point_search'), {back: true});
  var pCont = ge('place_map_point');
  var els = geByClass('places_map_preview', pCont);
  for (var i in els) {
    re(els[i]);
  }
  pCont.appendChild(ce('div', {
    innerHTML: '<div class="places_map_preview_cont"><img src="'+photoSrc+'" class="places_map_preview_img" align="center" /></div>',
    className: 'places_map_preview'
  }));

  mapChoose.addMapTypeControls();
  mapChoose.addControls({zoom: 'large', pan: false});
  if (!cur.lastSelectLat && !cur.lastSelectLng) {
    var lastPos = ls.get('last_map_pos');
    if (lastPos) {
      cur.lastSelectLat = lastPos[0];
      cur.lastSelectLng = lastPos[1];
      cur.lastSelectZoom = lastPos[2];
    }
  }

  var loc = cur.vkmap.getCenter();
  if (lat || lng) {
    var point = new vkMaps.LatLonPoint(lat, lng);
    mapChoose.setCenterAndZoom(point, 14);
    Places.setMarker(mapChoose, point);
    Places.setPlaceStr(point, true);
  } else {
    var point = new vkMaps.LatLonPoint(cur.lastSelectLat || loc.lat, cur.lastSelectLng || loc.lon);
    mapChoose.setCenterAndZoom(point, cur.lastSelectZoom || cur.vkmap.getZoom());
  }

  mapChoose.click.addHandler((function(eventType, map, place) {
    mapChoose.removeMarker(cur.placeMarker);
    Places.setMarker(mapChoose, place.location);
    Places.setPlaceStr(place.location);

      //fadeOut(ge('places_photo_hint_cont'), 200);
  }).bind(this));
},

setPlaceStr: function(loc, noRemember) {
  if (!noRemember) {
    cur.lastSelectLat = loc.lat;
    cur.lastSelectLng = loc.lon;
    cur.lastSelectZoom = Math.min(16, cur.placesChooseMap.getZoom());
    ls.set('last_map_pos', [cur.lastSelectLat, cur.lastSelectLng, cur.lastSelectZoom]);
  }
  var geocoder = new vkMaps.Geocoder('google', function(place) {
    hide('places_edit_step_0');
    hide('places_edit_step_1');
    hide('places_edit_step_2');
    show('places_edit_step_3');
    cur.lastSelectedPlace = place;
    var placeInfo = [];

    if (place.place) {
      placeInfo.push(place.place);
    } else if (place.street) {
      placeInfo.push(place.street);
    } else if (place.region) {
      placeInfo.push(place.region);
    }
    if (place.locality) {
      placeInfo.push(place.locality);
    } else if (place.country) {
      placeInfo.push(place.country);
    }
    for (var i in placeInfo) {
      if (placeInfo[i].length > 26) {
        placeInfo[i] = placeInfo[i].substr(0, 24)+'..';
      }
    }
    var str = placeInfo.join(', ');
    ge('place_map_edit_add').innerHTML = getLang('places_add_to_point').replace('%s', str);
  })
  geocoder.geocode({location: new google.maps.LatLng(loc.lat, loc.lon), language: cur.vkLngCode})
},

searchPhotoPlace: function() {
  var str = val(ge('place_map_point_search'));

  var geocoder = new vkMaps.Geocoder('google', function(place) {
    cur.placesChooseMap.setBounds(place.bounds)
    cur.placesChooseMap.removeMarker(cur.placeMarker);
    Places.setPlaceStr(place.point);
    Places.setMarker(cur.placesChooseMap, place.point);
  }, function() {
    notaBene('place_map_point_search');
  })
  geocoder.geocode({address: str, language: cur.vkLngCode})
},

onEditScroll: function(resize) {
  var y = boxLayerWrap.scrollTop;
  var panel = ge('places_photos_save_buttons');
  if (!panel) return;
  var py = getXY(ge('places_photos_save_panel'), true)[1];
  if (!cur.boxPhotosBottomSize) {
    cur.boxPhotosBottomSize = getSize(panel);
  }

  var ph = cur.boxPhotosBottomSize[1];

  var wndHeight = window.innerHeight || document.documentElement.clientHeight;

  if (resize && !cur.placesFixedBottom && wndHeight - ph < py + 20) {
    boxLayerWrap.scrollTop += py + 20 - (wndHeight - ph);
  } else if (wndHeight - ph < py) {
    if (!cur.placesFixedBottom || resize) {
      cur.placesFixedBottom = true;
      setStyle(panel, {
        position: 'fixed',
        top: (wndHeight - ph) + 'px'
      });
      addClass(panel, 'places_panel_fixed');
    }
  } else {
    if (cur.placesFixedBottom || resize) {
      cur.placesFixedBottom = false;
      setStyle(panel, {
        position: 'static',
        top: '0px'
      });
      removeClass(panel, 'places_panel_fixed');
    }
  }

  if (resize && cur.placesFixedBottom) {
    setStyle(panel, {left: (getXY(curBox().bodyNode)[0] + 1)+'px'})
  }
},

savePhotos: function(btn) {
  var loc = cur.placeMarker.location;
  var params = {act: 'save_photos_places', pids: cur.mapPids, lat: loc.lat, lng: loc.lon};
  if (cur.lastSelectedPlace) {
    var place = cur.lastSelectedPlace;
    extend(params, {
      geo_country: place.country,
      geo_locality: place.locality,
      geo_region: place.region,
      geo_street: place.street,
      geo_place: place.place,
      geo_lang: cur.vkLngCode,
      geo_code: place.countryCode
    });
  }
  ajax.post('al_places.php', params, {
    onDone: function() {
      //Places.cancelAdd();
      Places.updateBox();
    },
    showProgress: function() {
      lockButton(btn);
    },
    hideProgress: function() {
      unlockButton(btn);
    }
  })
},

updateBox: function() {
  var box = curBox();
  box.hide();
  showBox('al_places.php', {
    act: 'photos_box',
    add_more: '1',
    lat: cur.placeBoxOpts.lat,
    lng: cur.placeBoxOpts.lng,
    diff: cur.placeBoxOpts.diffZone,
    uid: cur.placeBoxOpts.uid
  });
},

checkHtml5Uploader: function() {
  return (window.XMLHttpRequest || window.XDomainRequest) && (window.FormData || window.FileReader && (window.XMLHttpRequest && XMLHttpRequest.sendAsBinary ||  window.ArrayBuffer && window.Uint8Array && (window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder)));
},

uploadPhotos: function(obj, ev) {
  if (ev && (ev.button == 2 || ev.ctrlKey)) {
    if (photos.checkHtml5Uploader()) {
      obj.href += '&html5=1';
    }
    return true;
  }
  if (cur.uplId !== undefined && window.Upload && Upload.checked && Upload.checked[cur.uplId] && Places.checkHtml5Uploader()) {
    ge('photos_upload_input').click();
    return false;
  }
  return true;
},

onPhotoUploadStart: function(info, res) {
  var label = ge('places_photo_upload_area_label');
  setStyle(label, {background: 'none', paddingLeft: '0px'});
  label.innerHTML = '<div id="places_ph_add_progress"><div id="places_add_p_line"><div id="places_add_p_inner"></div></div><div id="places_add_p_str"></div></div>';
  if (info.num === undefined) {
    info = res;
  }
  if (info.totalCount > 1) {
    ge('places_add_p_str').innerHTML = langNumeric(info.num ? info.num + 1 : 1, cur.lang['photos_add_uploading_num_X']).replace('{count}', info.totalCount);
  } else {
    ge('places_add_p_str').innerHTML = getLang('photos_add_uploading');
  }
},

onPhotoUploadProgress: function(ind, upl, need) {
  var inner = ge('places_add_p_inner');
  var w = (upl / need) * 175;
  var oldWidth = intval(inner.style.width);
  if (ind.totalCount > 1) {
    ge('places_add_p_str').innerHTML = langNumeric(ind.num + 1, cur.lang['photos_add_uploading_num_X']).replace('{count}', ind.totalCount);
  }
  if (w > oldWidth) {
    animate(inner, {width: w}, 200);
  }
},

onPhotoUploadComplete: function(info, res) {
  var params, i = info.ind !== undefined ? info.ind : info;
  try {
    params = eval('(' + res + ')');
  } catch(e) {
    params = q2ajx(res);
  }
  cur.savedPhotos = cur.savedPhotos || {mid: params.mid, gid: params.gid, aid: params.aid, server: params.server};
  cur.savedPhotos.photos = cur.savedPhotos.photos || [];
  cur.savedPhotos.photos.push({photo: params.photos, hash: params.hash});
  return;
},

onPhotoUploadCompleteAll: function(info) {
  var query = {act: 'done_add', context: 1, from: 'profile_map'}, k = 1;

  if (!cur.savedPhotos.photos) {
    return;
  }
  for (var j in (cur.savedPhotos.photos || [])) {
    query['photo'+k] = cur.savedPhotos.photos[j].photo;
    query['hash'+k] = cur.savedPhotos.photos[j].hash;
    k++;
  }
  delete cur.savedPhotos.photos;
  query = extend(query, cur.savedPhotos);
  ajax.post('/al_photos.php', query, {
    onDone: function(photos, hash, oid, photoPreview) {
      Places.selectPhoto(photos, photoPreview);
    },
    onFail: function(text) {
      setTimeout(showFastBox(getLang('global_error'), text).hide, __debugMode ? 30000 : 3000);
    }
  })
},

showPlaceTT: function(obj, text) {
  showTooltip(obj, {black: 1, text: text, center:1, shift:[0, 4, 0]});
},

showPhotoPlace: function(lat, lng) {
  var map = cur.placeBoxMap;
  map.setCenter(new google.maps.LatLng(lat, lng));
  map.setZoom(16);
  animate(boxLayerWrap, {scrollTop: 0}, 200);
}

}

try{stManager.done('places.js');}catch(e){}
