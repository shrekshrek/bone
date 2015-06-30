/*!
 * VERSION: 0.2.0
 * DATE: 2015-03-31
 * GIT:https://github.com/shrekshrek/bone
 *
 * @author: Shrek.wang, shrekshrek@gmail.com
 **/


(function(factory) {

    var root = (typeof self == 'object' && self.self == self && self) ||
        (typeof global == 'object' && global.global == global && global);

    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'exports'], function($, exports) {
            root.Bone = factory(root, exports, $);
        });
    } else if (typeof exports !== 'undefined') {
        var $ = require('jquery');
        factory(root, exports, $);
    } else {
        root.Bone = factory(root, {}, (root.jQuery || root.Zepto || root.ender || root.$));
    }

}(function(root, Bone, $) {

    var previousBone = root.Bone;

    var slice = [].slice;

    Bone.VERSION = '0.2.0';

    Bone.$ = $;

    Bone.noConflict = function() {
        root.Bone = previousBone;
        return this;
    };

    // other function
    // ---------------

    var isFunction = function(obj) {
        return typeof obj == 'function' || false;
    };

    var result = function(object, property, fallback) {
        var value = object == null ? void 0 : object[property];
        if (value === void 0) {
            value = fallback;
        }
        return isFunction(value) ? value.call(object) : value;
    };

    var bind = function(func, context) {
        return Function.prototype.bind.apply(func, slice.call(arguments, 1));
    };

    Bone.bind = bind;

    var extend = function(obj){
        var length = arguments.length;
        if (length < 2 || obj == null) return obj;
        for (var index = 1; index < length; index++) {
            var source = arguments[index],
                ks = keys(source),
                l = ks.length;
            for (var i = 0; i < l; i++) {
                var key = ks[i];
                obj[key] = source[key];
            }
        }
        return obj;
    };

    Bone.extend = extend;

    var keys = function(obj){
        var keys = [];
        for(var key in obj){
            keys.push(key);
        }
        return keys;
    };

    var size = function(obj) {
        if (obj == null) return 0;
        return (obj.length !== undefined) ? obj.length : keys(obj).length;
    };

    var isEmpty = function(obj) {
        if (obj == null) return true;
        if (obj.length !== undefined) return obj.length === 0;
        return keys(obj).length === 0;
    };

    var idCounter = 0;
    var uniqueId = function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    };


    // Bone.Events
    // ---------------

    //     var object = {};
    //     Bone.extend(object, Bone.Events);
    //     object.on('expand', function(){ alert('expanded'); });
    //     object.trigger('expand');

    var Events = Bone.Events = {};

    var eventSplitter = /\s+/;

    var eventsApi = function(iteratee, memo, name, callback, opts) {
        var i = 0, names;
        if (name && typeof name === 'object') {
            if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
            for (names = keys(name); i < names.length ; i++) {
                memo = iteratee(memo, names[i], name[names[i]], opts);
            }
        } else if (name && eventSplitter.test(name)) {
            for (names = name.split(eventSplitter); i < names.length; i++) {
                memo = iteratee(memo, names[i], callback, opts);
            }
        } else {
            memo = iteratee(memo, name, callback, opts);
        }
        return memo;
    };

    Events.on = function(name, callback, context) {
        return internalOn(this, name, callback, context);
    };

    var internalOn = function(obj, name, callback, context, listening) {
        obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
            context: context,
            ctx: obj,
            listening: listening
        });

        if (listening) {
            var listeners = obj._listeners || (obj._listeners = {});
            listeners[listening.id] = listening;
        }

        return obj;
    };

    Events.listenTo =  function(obj, name, callback) {
        if (!obj) return this;
        var id = obj._listenId || (obj._listenId = uniqueId('l'));
        var listeningTo = this._listeningTo || (this._listeningTo = {});
        var listening = listeningTo[id];

        if (!listening) {
            var thisId = this._listenId || (this._listenId = uniqueId('l'));
            listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
        }

        internalOn(obj, name, callback, this, listening);
        return this;
    };

    var onApi = function(events, name, callback, options) {
        if (callback) {
            var handlers = events[name] || (events[name] = []);
            var context = options.context, ctx = options.ctx, listening = options.listening;
            if (listening) listening.count++;

            handlers.push({ callback: callback, context: context, ctx: context || ctx, listening: listening });
        }
        return events;
    };

    Events.off =  function(name, callback, context) {
        if (!this._events) return this;
        this._events = eventsApi(offApi, this._events, name, callback, {
            context: context,
            listeners: this._listeners
        });
        return this;
    };

    Events.stopListening =  function(obj, name, callback) {
        var listeningTo = this._listeningTo;
        if (!listeningTo) return this;

        var ids = obj ? [obj._listenId] : keys(listeningTo);

        for (var i = 0; i < ids.length; i++) {
            var listening = listeningTo[ids[i]];

            if (!listening) break;

            listening.obj.off(name, callback, this);
        }
        if (isEmpty(listeningTo)) this._listeningTo = void 0;

        return this;
    };

    var offApi = function(events, name, callback, options) {
        if (!events) return;

        var i = 0, listening;
        var context = options.context, listeners = options.listeners;

        if (!name && !callback && !context) {
            var ids = keys(listeners);
            for (; i < ids.length; i++) {
                listening = listeners[ids[i]];
                delete listeners[listening.id];
                delete listening.listeningTo[listening.objId];
            }
            return;
        }

        var names = name ? [name] : keys(events);
        for (; i < names.length; i++) {
            name = names[i];
            var handlers = events[name];

            if (!handlers) break;

            var remaining = [];
            for (var j = 0; j < handlers.length; j++) {
                var handler = handlers[j];
                if (
                    callback && callback !== handler.callback &&
                    callback !== handler.callback._callback ||
                    context && context !== handler.context
                ) {
                    remaining.push(handler);
                } else {
                    listening = handler.listening;
                    if (listening && --listening.count === 0) {
                        delete listeners[listening.id];
                        delete listening.listeningTo[listening.objId];
                    }
                }
            }

            if (remaining.length) {
                events[name] = remaining;
            } else {
                delete events[name];
            }
        }
        if (size(events)) return events;
    };

    Events.once =  function(name, callback, context) {
        var events = eventsApi(onceMap, {}, name, callback, bind(this.off, this));
        return this.on(events, void 0, context);
    };

    Events.listenToOnce =  function(obj, name, callback) {
        var events = eventsApi(onceMap, {}, name, callback, bind(this.stopListening, this, obj));
        return this.listenTo(obj, events);
    };

    var onceMap = function(map, name, callback, offer) {
        if (callback) {
            var once = map[name] = function() {
                offer(name, once);
                callback.apply(this, arguments);
            };
            once._callback = callback;
        }
        return map;
    };

    Events.trigger =  function(name) {
        if (!this._events) return this;

        var length = Math.max(0, arguments.length - 1);
        var args = Array(length);
        for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

        eventsApi(triggerApi, this._events, name, void 0, args);
        return this;
    };

    var triggerApi = function(objEvents, name, cb, args) {
        if (objEvents) {
            var events = objEvents[name];
            var allEvents = objEvents.all;
            if (events && allEvents) allEvents = allEvents.slice();
            if (events) triggerEvents(events, args);
            if (allEvents) triggerEvents(allEvents, [name].concat(args));
        }
        return objEvents;
    };

    var triggerEvents = function(events, args) {
        var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
        switch (args.length) {
            case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
            case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
            case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
            case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
            default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
        }
    };

    extend(Bone, Events);


    // Bone.Class
    // ---------------

    var Class = Bone.Class = function(options) {
        this.initialize.apply(this, arguments);
    };

    extend(Class.prototype, Events, {
        initialize: function(){}
    });


    // Bone.View
    // ---------------

    var View = Bone.View = function(options) {
        this.cid = uniqueId('view');
        options || (options = {});
        for(var i in viewOptions){
            if(options[viewOptions[i]]) this[viewOptions[i]] = options[viewOptions[i]];
        }
        this._ensureElement();
        this.initialize.apply(this, arguments);
    };

    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

    var viewOptions = ['el', 'id', 'attributes', 'className', 'tagName', 'events'];

    extend(View.prototype, Events, {
        tagName: 'div',

        $: function(selector) {
            return this.$el.find(selector);
        },

        initialize: function(){},

        render: function() {
            return this;
        },

        remove: function() {
            this._removeElement();
            this.stopListening();
            return this;
        },

        _removeElement: function() {
            this.$el.remove();
        },

        setElement: function(element) {
            this.undelegateEvents();
            this._setElement(element);
            this.delegateEvents();
            return this;
        },

        _setElement: function(el) {
            this.$el = el instanceof Bone.$ ? el : Bone.$(el);
            this.el = this.$el[0];
        },

        delegateEvents: function(events) {
            events || (events = result(this, 'events'));
            if (!events) return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!isFunction(method)) method = this[method];
                if (!method) continue;
                var match = key.match(delegateEventSplitter);
                this.delegate(match[1], match[2], bind(method, this));
            }
            return this;
        },

        delegate: function(eventName, selector, listener) {
            this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },

        undelegateEvents: function() {
            if (this.$el) this.$el.off('.delegateEvents' + this.cid);
            return this;
        },

        undelegate: function(eventName, selector, listener) {
            this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },

        _createElement: function(tagName) {
            return document.createElement(tagName);
        },

        _ensureElement: function() {
            if (!this.el) {
                var attrs = extend({}, result(this, 'attributes'));
                if (this.id) attrs.id = result(this, 'id');
                if (this.className) attrs['class'] = result(this, 'className');
                this.setElement(this._createElement(result(this, 'tagName')));
                this._setAttributes(attrs);
            } else {
                this.setElement(result(this, 'el'));
            }
        },

        _setAttributes: function(attributes) {
            this.$el.attr(attributes);
        }

    });

    // Bone.Router
    // ---------------

    var Router = Bone.Router = function(options) {
        options || (options = {});
        if (options.routes) this.routes = options.routes;
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    };

    var optionalParam = /\((.*?)\)/g;
    var namedParam    = /(\(\?)?:\w+/g;
    var splatParam    = /\*\w+/g;
    var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

    extend(Router.prototype, Events, {

        initialize: function(){},

        route: function(route, name, callback) {
            route = this._routeToRegExp(route);
            if (isFunction(name)) {
                callback = name;
                name = '';
            }
            if (!callback) callback = this[name];
            var router = this;
            Bone.history.route(route, function(fragment) {
                var args = router._extractParameters(route, fragment);
                if (router.execute(callback, args, name) !== false) {
                    router.trigger.apply(router, ['route:' + name].concat(args));
                    router.trigger('route', name, args);
                    Bone.history.trigger('route', router, name, args);
                }
            });
            return this;
        },

        execute: function(callback, args, name) {
            if (callback) callback.apply(this, args);
        },

        navigate: function(fragment, options) {
            Bone.history.navigate(fragment, options);
            return this;
        },

        _bindRoutes: function() {
            if (!this.routes) return;
            var route, routes = keys(this.routes);
            while ((route = routes.pop()) != null) {
                this.route(route, this.routes[route]);
            }
        },

        _routeToRegExp: function(route) {
            route = route.replace(escapeRegExp, '\\$&')
                .replace(optionalParam, '(?:$1)?')
                .replace(namedParam, function(match, optional) {
                    return optional ? match : '([^/?]+)';
                })
                .replace(splatParam, '([^?]*?)');
            return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
        },

        _extractParameters: function(route, fragment) {
            var params = route.exec(fragment).slice(1);
            var _p = [];
            for(var i in params){
                var param = params[i];
                if (i === params.length - 1) _p[i] = param || null;
                else _p[i] = param ? decodeURIComponent(param) : null;
            }
            return _p;
        }

    });


    // Bone.History
    // ----------------

    var History = Bone.History = function() {
        this.handlers = [];
        this.checkUrl = bind(this.checkUrl, this);

        if (typeof window !== 'undefined') {
            this.location = window.location;
            this.history = window.history;
        }
    };

    var routeStripper = /^[#\/]|\s+$/g;

    var rootStripper = /^\/+|\/+$/g;

    var pathStripper = /#.*$/;

    History.started = false;

    extend(History.prototype, Events, {
        atRoot: function() {
            var path = this.location.pathname.replace(/[^\/]$/, '$&/');
            return path === this.root && !this.getSearch();
        },

        matchRoot: function() {
            var path = this.decodeFragment(this.location.pathname);
            var root = path.slice(0, this.root.length - 1) + '/';
            return root === this.root;
        },

        decodeFragment: function(fragment) {
            return decodeURI(fragment.replace(/%25/g, '%2525'));
        },

        getSearch: function() {
            var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
            return match ? match[0] : '';
        },

        getHash: function(window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : '';
        },

        getPath: function() {
            var path = this.decodeFragment(
                this.location.pathname + this.getSearch()
            ).slice(this.root.length - 1);
            return path.charAt(0) === '/' ? path.slice(1) : path;
        },

        getFragment: function(fragment) {
            if (fragment == null) {
                if (this._usePushState || !this._wantsHashChange) {
                    fragment = this.getPath();
                } else {
                    fragment = this.getHash();
                }
            }
            return fragment.replace(routeStripper, '');
        },

        start: function(options) {
            if (History.started) throw new Error("Bone.history has already been started");
            History.started = true;

            this.options          = extend({root: '/'}, this.options, options);
            this.root             = this.options.root;
            this._wantsHashChange = this.options.hashChange !== false;
            this._hasHashChange   = 'onhashchange' in window;
            this._useHashChange   = this._wantsHashChange && this._hasHashChange;
            this._wantsPushState  = !!this.options.pushState;
            this._hasPushState    = !!(this.history && this.history.pushState);
            this._usePushState    = this._wantsPushState && this._hasPushState;
            this.fragment         = this.getFragment();

            this.root = ('/' + this.root + '/').replace(rootStripper, '/');

            if (this._wantsHashChange && this._wantsPushState) {
                if (!this._hasPushState && !this.atRoot()) {
                    var root = this.root.slice(0, -1) || '/';
                    this.location.replace(root + '#' + this.getPath());
                    return true;
                } else if (this._hasPushState && this.atRoot()) {
                    this.navigate(this.getHash(), {replace: true});
                }
            }

            var addEventListener = window.addEventListener || function (eventName, listener) {
                    return attachEvent('on' + eventName, listener);
                };

            if (this._usePushState) {
                addEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange) {
                addEventListener('hashchange', this.checkUrl, false);
            }

            if (!this.options.silent) return this.loadUrl();
        },

        stop: function() {
            var removeEventListener = window.removeEventListener || function (eventName, listener) {
                    return detachEvent('on' + eventName, listener);
                };

            if (this._usePushState) {
                removeEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange) {
                removeEventListener('hashchange', this.checkUrl, false);
            }

            if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
            History.started = false;
        },

        route: function(route, callback) {
            this.handlers.unshift({route: route, callback: callback});
        },

        checkUrl: function(e) {
            var current = this.getFragment();
            if (current === this.fragment) return false;
            this.loadUrl();
        },

        loadUrl: function(fragment) {
            if (!this.matchRoot()) return false;
            fragment = this.fragment = this.getFragment(fragment);
            for(var i in this.handlers){
                var handler = this.handlers[i];
                if (handler.route.test(fragment)) {
                    handler.callback(fragment);
                    return true;
                }
            }
        },

        navigate: function(fragment, options) {
            if (!History.started) return false;
            if (!options || options === true) options = {trigger: !!options};

            fragment = fragment.replace(pathStripper, '');

            var root = this.root;
            if (fragment === '' || fragment.charAt(0) === '?') {
                root = root.slice(0, -1) || '/';
            }
            var url = root + fragment;

            fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

            if (this.fragment === fragment) return;
            this.fragment = fragment;

            if (this._usePushState) {
                this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

            } else if (this._wantsHashChange) {
                this._updateHash(this.location, fragment, options.replace);
            } else {
                return this.location.assign(url);
            }
            if (options.trigger) return this.loadUrl(fragment);
        },

        _updateHash: function(location, fragment, replace) {
            if (replace) {
                var href = location.href.replace(/(javascript:|#).*$/, '');
                location.replace(href + '#' + fragment);
            } else {
                location.hash = '#' + fragment;
            }
        }

    });

    Bone.history = new History;


    // extend
    // ----------------

    var extend2 = function(protoProps, staticProps) {
        var parent = this;
        var child;

        if (protoProps && Object.prototype.hasOwnProperty.call(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        extend(child, parent, staticProps);

        var Surrogate = function(){
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        if (protoProps) extend(child.prototype, protoProps);

        child.__super__ = parent.prototype;

        return child;
    };

    Router.extend = History.extend = Class.extend = View.extend = extend2;



    return Bone;

}));
