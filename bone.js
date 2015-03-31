//     bone.js 0.1.0

(function(root, factory) {
    root.Bone = factory(root, {}, (root.jQuery || root.Zepto || root.$));

}(this, function(root, Bone, $) {

    var previousBone = root.Bone;

    Bone.VERSION = '0.1.0';

    Bone.$ = $;

    Bone.noConflict = function() {
        root.Bone = previousBone;
        return this;
    };


    // ---------------

    var array = [];
    var slice = array.slice;

    var bind = function(func, context) {
        return Function.prototype.bind.apply(func, slice.call(arguments, 1));
    };

    Bone.extend = function(obj){
        var len = arguments.length;
        if (len < 2 || obj == null) return obj;
        for (var i = 1; i < len; i++) {
            var source = arguments[i];
            for (var j in source) {
                obj[j] = source[j];
            }
        }
        return obj;
    }

    // Bone.Events
    // ---------------

    var _uniqueListenId = 0;

    var Events = Bone.Events = {
        on: function(name, callback, context) {
            if (!callback) return this;
            this._events || (this._events = {});
            var events = this._events[name] || (this._events[name] = []);
            events.push({callback: callback, context: context, ctx: context || this});
            return this;
        },

        off: function(name, callback, context) {
            if (!this._events) return this;
            if (!name && !callback && !context) {
                this._events = {};
                return this;
            }

            var events = this._events[name];
            if(!events) return this;
            for (var i = events.length-1; i >= 0; i--) {
                var ev = events[i];
                if (!callback || (callback === ev.callback && (!context || context === ev.context))) {
                    events.splice(i, 1);
                }
            }
            if (!events.length) delete this._events[name];

            return this;
        },

        trigger: function(name) {
            if (!this._events) return this;
            var args = slice.call(arguments, 1);
            var events = this._events[name];
            if (events) triggerEvents(events, args);
            return this;
        },

        listenTo: function(obj, name, callback) {
            var listeningTo = this._listeningTo || (this._listeningTo = {});
            var id = obj._listenId || (obj._listenId = ++_uniqueListenId);
            listeningTo[id] = obj;
            obj.on(name, callback, this);
            return this;
        },

        stopListening: function(obj, name, callback) {
            var listeningTo = this._listeningTo;
            if (!listeningTo) return this;
            var remove = !name && !callback;
            if (obj) (listeningTo = {})[obj._listenId] = obj;
            for (var id in listeningTo) {
                obj = listeningTo[id];
                obj.off(name, callback, this);

                var _objEventsCount = 0;
                for(var j in obj._events){
                    _objEventsCount++;
                }
                if (remove || !_objEventsCount) delete this._listeningTo[id];
            }
            return this;
        }

    };

    var triggerEvents = function(events, args) {
        for(var i in events){
            events[i].callback.apply(events[i].ctx, args);
        }
    };

    Bone.extend(Bone, Events);


    // Bone.View
    // ---------------

    var viewOptions = ['el', 'id', 'attributes', 'className', 'tagName'];

    var View = Bone.View = function(options) {
        options || (options = {});
        for(var i in viewOptions){
            if(options[viewOptions[i]]) this[viewOptions[i]] = options[viewOptions[i]];
        }
        this._ensureElement();
        this.initialize.apply(this, arguments);
    };

    Bone.extend(View.prototype, Events, {

        tagName: 'div',

        $: function(selector) {
            return this.$el.find(selector);
        },

        initialize: function(){},

        render: function() {
            return this;
        },

        remove: function() {
            this.$el.remove();
            this.stopListening();
            return this;
        },

        setElement: function(element) {
            this.$el = element instanceof Bone.$ ? element : Bone.$(element);
            this.el = this.$el[0];
            return this;
        },

        _ensureElement: function() {
            if (this.el) {
                this.setElement(this.el);
            } else {
                var attrs = this.attributes;
                if (this.id) attrs.id = this.id;
                if (this.className) attrs.class = this.className;
                var $el = Bone.$('<' + this.tagName + '>').attr(attrs);
                this.setElement($el);
            }
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

    Bone.extend(Router.prototype, Events, {

        initialize: function(){},

        route: function(route, callback) {
            route = this._routeToRegExp(route);
            if (typeof(callback) === 'string') {
                callback = this[callback];
            }
            var router = this;
            Bone.history.route(route, function(fragment) {
                var args = router._extractParameters(route, fragment);
                router.execute(callback, args);
                router.trigger('route', args);
                Bone.history.trigger('route', router, args);
            });
            return this;
        },

        execute: function(callback, args) {
            if (callback) callback.apply(this, args);
        },

        navigate: function(fragment, options) {
            Bone.history.navigate(fragment, options);
            return this;
        },

        _bindRoutes: function() {
            if (!this.routes) return;
            for(var route in this.routes){
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

    Bone.extend(History.prototype, Events, {
        atRoot: function() {
            return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
        },

        getHash: function(window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : '';
        },

        getFragment: function(fragment) {
            if (fragment == null) {
                fragment = this.getHash();
            }
            return fragment.replace(routeStripper, '');
        },

        start: function(options) {
            if (History.started) throw new Error("Bone.history has already been started");
            History.started = true;

            this.options          = Bone.extend({root: '/'}, this.options, options);
            this.root             = this.options.root;
            var fragment          = this.getFragment();

            this.root = ('/' + this.root + '/').replace(rootStripper, '/');

            Bone.$(window).on('hashchange', this.checkUrl);

            this.fragment = fragment;

            if (!this.options.silent) return this.loadUrl();
        },

        stop: function() {
            Bone.$(window).off('hashchange', this.checkUrl);
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

            if (this.fragment === fragment) return;
            this.fragment = fragment;

            this._updateHash(this.location, fragment, options.replace);

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

    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        if (protoProps && Object.prototype.hasOwnProperty.call(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        Bone.extend(child, parent, staticProps);

        var Surrogate = function(){
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        if (protoProps) Bone.extend(child.prototype, protoProps);

        child.__super__ = parent.prototype;

        return child;
    };

    Router.extend = View.extend = History.extend = extend;



    return Bone;

}));
