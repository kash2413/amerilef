//to-do
// new on site, session mgmt (landing, exit), time-on-page (increasing setTimeouts) - handle leave page event
// divolte? druid?
'function'==typeof contentExchangeLoad ? contentExchangeLoad() : (function(w,doc) {
  //do not load in iframes
  //if (self!=top) return;
  w._contentExchange = w._contentExchange || {};
  var cx = w._contentExchange,
      _callback_widgets = {},
      perf = (typeof performance !== 'undefined' && typeof performance.now === 'function') || false,
      uuid = function uuid() {
        var d = Date.now();
        if (perf) d += performance.now();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      },
      guid = function guid() {return 'cex' + Math.random().toString(36).substr(2)},
      is_frame = self!=top,
      hasStore = (function () {try { return !!w.localStorage;} catch (e) {return false; }})(),
	    canStore = is_frame && hasStore && (function(mod) {
	      try {localStorage.setItem(mod, mod);localStorage.removeItem(mod);return true;}
	      catch(e) {return false;}
	    })('modernizr'),
			statusTimer = false,
			statusTiming = [1,1,1,2,3,5,8,13,21,34], //1 2 3 5 8 13 21 34 55
			statusStep = 0,
      sendStatus = function() {
        var scrollTop = window.scrollY || document.body.scrollTop || document.documentElement.scrollTop,
            delay = statusTiming[++statusStep] || 0;
        send('status',{pv:cx.pv, scroll:scrollTop, ts: Date.now()})
        statusTimer = setTimeout(sendStatus,1000*delay)
      },
	    is_new = (function(){
	      if (document.cookie.match('cx_test')) return false;
	      document.cookie = 'cx_test=test,path=/';
	      return true
	    })(),
	    checkPageview = function checkPageview() {
	      if (is_frame) return
        var docref = doc.referrer || doc.referer,
            url = is_frame ? docref : location.href.replace(location.hash,''),
            ref = is_frame ? 'iframe' : docref,
            domain = url.split('/')[2],
            now = new Date(),
            doSend = false,
            tag = '' || false,
            old_pv = cx.pv || canStore && localStorage.getItem('cx_pv'),
            old_url = cx.url || canStore && localStorage.getItem('cx_url'),
            old_time = canStore && localStorage.getItem('cx_time') || false;
        cx.pv = old_pv || uuid();
        if (old_pv != cx.pv) {
          cx.url = url;
          cx.ref = ref;
          doSend = true;
        } else if (old_url!=url) { // check if different url
          cx.pv = uuid();
          cx.ref = ref;
          cx.url = url;
          doSend = true;
        }
        if (doSend) {
          cx.user_id = 'new';
          cx.new = is_new
          cx.tz = now.getTimezoneOffset();
          cx.cs = doc.characterSet || doc.charset;
          if (perf) cx.ns = performance.timing.navigationStart; //request start
          cx.ts = now.getTime();
          cx.screen = [ screen.height, screen.width, screen.colorDepth ].join("x");
          //dotmetrics data + ga
          if (w.localStorage.DotMetricsDeviceId) cx.ddev = w.localStorage.DotMetricsDeviceId;
          if (w.localStorage.DotMetricsUserId) cx.dusr = w.localStorage.DotMetricsUserId;
          if (canStore) {
            localStorage.setItem('cx_pv',cx.pv);
            localStorage.setItem('cx_url',cx.url);
            localStorage.setItem('cx_time',now);
          }
          if (tag) cx.tag = tag;
          send('pageview',cx);
          
          //TODO check&enable: start sending status events: ts,scrollTop,mouse position
          //statusTimer = setTimeout(sendStatus,statusTiming[++statusStep])
        }
      },
      send = function send(ev,data) {
        if (cx.dnt) return;
        var url = 'https://collector_sr.contentexchange.me/hu/collect?',
            qs = ['event='+ev],
            img = doc.createElement('img');
        Object.keys(data).forEach( function(k) {qs.push( k+'='+encodeURIComponent(data[k]) );} );
        url += qs.join('&');
        //console.log('sending',qs);
        img.setAttribute('src',url);
      }

  this.display_contentexchange = function(data) {
  	var elts = _callback_widgets[data.id][data.tid],
  	    now = new Date();
  	elts.widget.queued = false;
  	if (!data.error) {
    	elts.widget.setAttribute('done','1');
    	elts.widget.innerHTML = (cx.dnt ? data.data : data.data && data.data.replace(/\?cb[0-9]*/gi,'?pv='+cx.pv)) || '';
    	//add pageview to /in/ links
    	//send('widget_impression',{pv:cx.pv, widget: data.id, posts: (data.posts || []).join(','), ts: now.getTime()});
    }
  	doc.body.removeChild(elts.tunnel);
  }
  this.display_trafex = this.display_contentexchange;

  // {{alternatives
  //    |country=SI,HR; region=dolejnska; city=Ljub,Mar; pos:(!)lat,lng,radius; zip=^1; model=galaxy; device=!desktop; source=gr; widget=widget_id
  //    |
  //    }}

  var noMatch = function(options,val) {
    if (!options) return false //no match if nothing to match
    options = options.split(/,/g)
    for (var k=0;k<options.length;k++) {
      var opt = options[k],
          not = opt[0]=='!',
          expr = not ? opt.substring(1) : opt,
          m = val.match(new RegExp(expr,'i')),
          res = not ? !m : m
      if (res) return false
    }
    return true
  }

  var noGeoMatch = function(position,lat2,lon2) {
  // https://www.movable-type.co.uk/scripts/latlong.html - equilateral projection
    if (!position) return false //no match if no postion specified
     var pos = position.split(/,/g),
         p0 = pos[0],
         not = p0[0]=='!',
         lat1 = not ? p0.substring(1) : p0,
         lon1 = pos[1],
         rad = pos[2],
         φ1 = lat1 * Math.PI/180,
         φ2 = lat2 * Math.PI/180,
         Δλ = (lon2-lon1) * Math.PI/180,
         R = 6371e3,
         x = Δλ * Math.cos((φ1+φ2)/2),
         y = (φ2-φ1),
         d = Math.sqrt(x*x + y*y) * R;
    return d<rad ? not : !not
  }
  var show = function(widget) {
		var id = widget.getAttribute('data-trafex-widget') || widget.getAttribute('data-contentexchange-widget'),
        src = widget.getAttribute('data-contentexchange-source'),
        src_valid = 'hu'.split(',').indexOf(src)>-1,
		    cat = widget.getAttribute('data-trafex-cat') || widget.getAttribute('data-contentexchange-cat') || '',
		    cnt = widget.getAttribute('data-trafex-count') || widget.getAttribute('data-contentexchange-count') || '',
		    country = widget.getAttribute('data-contentexchange-country') || '',
		    region = widget.getAttribute('data-contentexchange-region') || '',
		    city = widget.getAttribute('data-contentexchange-city') || '',
		    zip = widget.getAttribute('data-contentexchange-zip') || '',
		    pos = widget.getAttribute('data-contentexchange-pos') || '',
		    asn = widget.getAttribute('data-contentexchange-asn') || '',
		    model = widget.getAttribute('data-contentexchange-model') || '',
		    device = widget.getAttribute('data-contentexchange-device') || '',
		    alternatives = JSON.parse(widget.getAttribute('data-contentexchange-alternatives') || '{}');

    if (noMatch(country,'NL')) return
    if (noMatch(region,'North Holland')) return
    if (noMatch(city,'Amsterdam')) return
    if (noMatch(zip,'1098')) return
    if (noMatch(asn,'DIGITALOCEAN-ASN')) return
    if (noMatch(model,'Other')) return
    if (noMatch(device,'desktop')) return
    if (noGeoMatch(pos,'52.352','4.9392')) return
    if (!src_valid) {
       //console.log('invalid source',src)
       src = 'hu'
    }

console.log('ALTERNATIVES',alternatives)
    for (var k=0;k<alternatives.length;k++) {
      var alt = alternatives[k]
      if (noMatch(alt.country,'NL')) continue
      if (noMatch(alt.region,'North Holland')) continue
      if (noMatch(alt.city,'Amsterdam')) continue
      if (noMatch(alt.zip,'1098')) continue
      if (noMatch(alt.asn,'DIGITALOCEAN-ASN')) continue
      if (noMatch(alt.model,'Other')) continue
      if (noMatch(alt.device,'desktop')) continue
      if (noGeoMatch(alt.pos,'52.352','4.9392')) continue
      src = alt.source
      id = alt.widget
      cat = alt.cat || ''
      cnt = alt.cnt || ''
console.log('chosen alternative',k,src,id,cat,cnt)
      break
    }

		if (cat) cat = '/'+cat;
		if (cnt) cnt = '/'+cnt;
  	tunnel = doc.createElement('script');
  	tunnel.id = guid();
  	tunnel.type = 'text/javascript';
    tunnel.src = 'https://tracker_' + src+'.contentexchange.me/widget/'+(id+'-'+tunnel.id)+cat+cnt;

    _callback_widgets[id] = _callback_widgets[id] || {};
    _callback_widgets[id][tunnel.id] = {
      widget : widget,
      tunnel: tunnel
    };

  	doc.body.appendChild(tunnel);

    var refresh = 0 | ( widget.getAttribute('data-trafex-refresh') || widget.getAttribute('data-contentexchange-refresh') );
    if (refresh) (function(widget,refresh) { setTimeout(function(){show(widget)},Math.min(refresh,30)*1000); })(widget,refresh);
  }
  this.contentExchangeLoad = function(forceLoad) {
    checkPageview();
		var widgets = forceLoad
		    ? doc.querySelectorAll('[data-trafex-widget],[data-contentexchange-widget]')
		    : doc.querySelectorAll('[data-trafex-widget]:not([done]),[data-contentexchange-widget]:not([done])');
		for (var i=0;i< widgets.length;i++) {
			var widget =  widgets[i];
			if (widget.queued) continue;
			widget.queued = true;
			var delay = 0 | ( widget.getAttribute('data-trafex-delay') || widget.getAttribute('data-contentexchange-delay') );
			(function(widget,delay) {setTimeout(function() {show(widget);},delay*1000);})(widget,delay);
		}
	}
	contentExchangeLoad();
})(window,document);
