function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

/* src/Element.svelte generated by Svelte v3.24.0 */

const { Object: Object_1 } = globals;
const file = "src/Element.svelte";

function add_css() {
	var style = element("style");
	style.id = "svelte-r6ii83-style";
	style.textContent = ".node.svelte-r6ii83{fill:rgb(231, 231, 174, 0.75);stroke:#999;stroke-width:1px;cursor:move}.node.selected.svelte-r6ii83{stroke:orange;stroke-width:2px}.wireHandle.svelte-r6ii83{stroke:#999;stroke-width:1;fill:#d9d9d9;cursor:crosshair}text.svelte-r6ii83{fill:black;cursor:move}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudC5zdmVsdGUiLCJzb3VyY2VzIjpbIkVsZW1lbnQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgZmxvdztcbiAgZXhwb3J0IGxldCBub2RlO1xuICBleHBvcnQgbGV0IHNTdG9yZTtcblxuICBsZXQgc2VsZWN0ZWQgPSBmYWxzZTtcbiAgc1N0b3JlLnN1YnNjcmliZShzID0+IHtcbiAgICBzZWxlY3RlZCA9IHNbbm9kZS5pZF07XG4gIH0pO1xuXG4gIGxldCB0b3RhbHMgPSBbXTtcblxuICBsZXQgc3R5bGVzID0ge1xuICAgIHJlY3Q6IHtcbiAgICAgIHdpZHRoOiAxNDAsXG4gICAgICBoZWlnaHQ6IDMwXG4gICAgfSxcbiAgICB3aXJlSGFuZGxlOiB7XG4gICAgICB3aWR0aDogMTAsXG4gICAgICBoZWlnaHQ6IDEwLFxuICAgICAgc3BhY2luZzogMC4yNVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzaXplID0gKCkgPT4ge1xuICAgIGxldCBfdG90YWxzID0gW107XG4gICAgbm9kZS5wb3J0cy5tYXAocCA9PiB7XG4gICAgICBfdG90YWxzW3AudHlwZV0gPSBfdG90YWxzW3AudHlwZV0gfHwgMDtcbiAgICAgIF90b3RhbHNbcC50eXBlXSArPSAxO1xuICAgIH0pO1xuICAgIGxldCBtYXRjaCA9IHRydWU7XG4gICAgX3RvdGFscy5mb3JFYWNoKG4gPT4ge1xuICAgICAgaWYgKHRvdGFscy5pbmRleE9mKG4pID09PSAtMSkge1xuICAgICAgICBtYXRjaCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChtYXRjaCkgcmV0dXJuO1xuXG4gICAgdG90YWxzID0gX3RvdGFscy5zb3J0KChhLCBiKSA9PiAoYSA+IGIgPyAtMSA6IDEpKTtcblxuICAgIGxldCB7IHJlY3QsIHdpcmVIYW5kbGUgfSA9IHN0eWxlcztcbiAgICBsZXQgeyB3aWR0aCwgaGVpZ2h0IH0gPSBzdHlsZXMucmVjdDtcbiAgICBsZXQgc2ggPSB3aXJlSGFuZGxlLmhlaWdodDtcbiAgICBsZXQgc3AgPSBzaCAqICgxICsgd2lyZUhhbmRsZS5zcGFjaW5nKTtcbiAgICBzdHlsZXMucmVjdC5oZWlnaHQgPSBNYXRoLm1heChzdHlsZXMucmVjdC5oZWlnaHQsICh0b3RhbHNbMF0gKyAxKSAqIHNwKTtcblxuICAgIE9iamVjdC5hc3NpZ24obm9kZSwgc3R5bGVzLnJlY3QpO1xuICB9O1xuXG4gIGxldCBnZXRDWVBvcyA9IChpLCBuKSA9PiB7XG4gICAgbGV0IHsgcmVjdCwgd2lyZUhhbmRsZSB9ID0gc3R5bGVzO1xuICAgIGxldCBjcG9ydHMgPSBuLnBvcnRzLmZpbHRlcihucCA9PiBucC50eXBlID09PSBuLnBvcnRzW2ldLnR5cGUpO1xuICAgIGkgPSBjcG9ydHMuaW5kZXhPZihuLnBvcnRzW2ldKTtcbiAgICBsZXQgc2ggPSB3aXJlSGFuZGxlLmhlaWdodDtcbiAgICBsZXQgc3AgPSBzaCAqIHdpcmVIYW5kbGUuc3BhY2luZztcbiAgICBsZXQgdGhlaWdodCA9IGNwb3J0cy5sZW5ndGggKiBzaCArIChjcG9ydHMubGVuZ3RoIC0gMSkgKiBzcDtcbiAgICByZXR1cm4gKHJlY3QuaGVpZ2h0IC0gdGhlaWdodCkgLyAyICsgaSAqIChzaCArIHNwKSB8fCAwO1xuICB9O1xuXG4gIG9uTW91bnQoKCkgPT4ge1xuICAgIHJlc2l6ZSgpO1xuICAgIGZsb3cuc3Vic2NyaWJlKGYgPT4ge1xuICAgICAgcmVzaXplKCk7XG4gICAgfSk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLm5vZGUge1xuICAgIGZpbGw6IHJnYigyMzEsIDIzMSwgMTc0LCAwLjc1KTtcbiAgICBzdHJva2U6ICM5OTk7XG4gICAgc3Ryb2tlLXdpZHRoOiAxcHg7XG4gICAgY3Vyc29yOiBtb3ZlO1xuICB9XG4gIC5ub2RlLnNlbGVjdGVkIHtcbiAgICBzdHJva2U6IG9yYW5nZTtcbiAgICBzdHJva2Utd2lkdGg6IDJweDtcbiAgfVxuICAud2lyZUhhbmRsZSB7XG4gICAgc3Ryb2tlOiAjOTk5O1xuICAgIHN0cm9rZS13aWR0aDogMTtcbiAgICBmaWxsOiAjZDlkOWQ5O1xuICAgIGN1cnNvcjogY3Jvc3NoYWlyO1xuICB9XG4gIHRleHQge1xuICAgIGZpbGw6IGJsYWNrO1xuICAgIGN1cnNvcjogbW92ZTtcbiAgfVxuPC9zdHlsZT5cblxueyNpZiBub2RlLmlkICE9PSAnd2lyZUhhbmRsZU5vZGUnfVxuICA8cmVjdFxuICAgIGNsYXNzPVwibm9kZSBkcmFnSGFuZGxlXCJcbiAgICBjbGFzczpzZWxlY3RlZFxuICAgIHJ4PVwiMTBcIlxuICAgIHJ5PVwiMTBcIlxuICAgIHN0eWxlPVwid2lkdGg6e3N0eWxlcy5yZWN0LndpZHRofXB4OyBoZWlnaHQ6e3N0eWxlcy5yZWN0LmhlaWdodH1weFwiIC8+XG4gIHsjaWYgbm9kZS5wb3J0c31cbiAgICB7I2VhY2ggbm9kZS5wb3J0cyBhcyBwb3J0LCBpfVxuICAgICAgPGdcbiAgICAgICAgaWQ9XCJ7bm9kZS5pZH06e2l9XCJcbiAgICAgICAgdHJhbnNmb3JtPVwidHJhbnNsYXRlKCB7KHBvcnQudHlwZSAmJiBub2RlLndpZHRoID8gbm9kZS53aWR0aCA6IDApIC0gc3R5bGVzLndpcmVIYW5kbGUud2lkdGggLyAyfSxcbiAgICAgICAge2dldENZUG9zKGksIG5vZGUpfSlcIj5cbiAgICAgICAgPHJlY3RcbiAgICAgICAgICBjbGFzcz1cIndpcmVIYW5kbGVcIlxuICAgICAgICAgIHJ4PVwiM1wiXG4gICAgICAgICAgcnk9XCIzXCJcbiAgICAgICAgICBzdHlsZT1cIndpZHRoOntzdHlsZXMud2lyZUhhbmRsZS53aWR0aH1weDsgaGVpZ2h0OntzdHlsZXMud2lyZUhhbmRsZS5oZWlnaHR9cHhcIiAvPlxuICAgICAgPC9nPlxuICAgIHsvZWFjaH1cbiAgey9pZn1cbiAgPHRleHRcbiAgICBjbGFzcz1cImRyYWdIYW5kbGVcIlxuICAgIHg9XCI1MCVcIlxuICAgIHk9XCI1MCVcIlxuICAgIHRleHQtYW5jaG9yPVwibWlkZGxlXCJcbiAgICBkb21pbmFudC1iYXNlbGluZT1cIm1pZGRsZVwiPlxuICAgIHtzZWxlY3RlZH1cbiAgPC90ZXh0Plxuey9pZn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFxRUUsS0FBSyxjQUFDLENBQUMsQUFDTCxJQUFJLENBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDOUIsTUFBTSxDQUFFLElBQUksQ0FDWixZQUFZLENBQUUsR0FBRyxDQUNqQixNQUFNLENBQUUsSUFBSSxBQUNkLENBQUMsQUFDRCxLQUFLLFNBQVMsY0FBQyxDQUFDLEFBQ2QsTUFBTSxDQUFFLE1BQU0sQ0FDZCxZQUFZLENBQUUsR0FBRyxBQUNuQixDQUFDLEFBQ0QsV0FBVyxjQUFDLENBQUMsQUFDWCxNQUFNLENBQUUsSUFBSSxDQUNaLFlBQVksQ0FBRSxDQUFDLENBQ2YsSUFBSSxDQUFFLE9BQU8sQ0FDYixNQUFNLENBQUUsU0FBUyxBQUNuQixDQUFDLEFBQ0QsSUFBSSxjQUFDLENBQUMsQUFDSixJQUFJLENBQUUsS0FBSyxDQUNYLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyJ9 */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	child_ctx[10] = i;
	return child_ctx;
}

// (92:0) {#if node.id !== 'wireHandleNode'}
function create_if_block(ctx) {
	let rect;
	let t0;
	let t1;
	let text_1;
	let t2;
	let if_block = /*node*/ ctx[0].ports && create_if_block_1(ctx);

	const block = {
		c: function create() {
			rect = svg_element("rect");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			text_1 = svg_element("text");
			t2 = text(/*selected*/ ctx[1]);
			attr_dev(rect, "class", "node dragHandle svelte-r6ii83");
			attr_dev(rect, "rx", "10");
			attr_dev(rect, "ry", "10");
			set_style(rect, "width", /*styles*/ ctx[2].rect.width + "px");
			set_style(rect, "height", /*styles*/ ctx[2].rect.height + "px");
			toggle_class(rect, "selected", /*selected*/ ctx[1]);
			add_location(rect, file, 92, 2, 1854);
			attr_dev(text_1, "class", "dragHandle svelte-r6ii83");
			attr_dev(text_1, "x", "50%");
			attr_dev(text_1, "y", "50%");
			attr_dev(text_1, "text-anchor", "middle");
			attr_dev(text_1, "dominant-baseline", "middle");
			add_location(text_1, file, 112, 2, 2433);
		},
		m: function mount(target, anchor) {
			insert_dev(target, rect, anchor);
			insert_dev(target, t0, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, t1, anchor);
			insert_dev(target, text_1, anchor);
			append_dev(text_1, t2);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*styles*/ 4) {
				set_style(rect, "width", /*styles*/ ctx[2].rect.width + "px");
			}

			if (dirty & /*styles*/ 4) {
				set_style(rect, "height", /*styles*/ ctx[2].rect.height + "px");
			}

			if (dirty & /*selected*/ 2) {
				toggle_class(rect, "selected", /*selected*/ ctx[1]);
			}

			if (/*node*/ ctx[0].ports) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(t1.parentNode, t1);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*selected*/ 2) set_data_dev(t2, /*selected*/ ctx[1]);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(rect);
			if (detaching) detach_dev(t0);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(text_1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(92:0) {#if node.id !== 'wireHandleNode'}",
		ctx
	});

	return block;
}

// (99:2) {#if node.ports}
function create_if_block_1(ctx) {
	let each_1_anchor;
	let each_value = /*node*/ ctx[0].ports;
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each_1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*node, styles, getCYPos*/ 13) {
				each_value = /*node*/ ctx[0].ports;
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(each_1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(99:2) {#if node.ports}",
		ctx
	});

	return block;
}

// (100:4) {#each node.ports as port, i}
function create_each_block(ctx) {
	let g;
	let rect;
	let g_id_value;
	let g_transform_value;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "class", "wireHandle svelte-r6ii83");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			set_style(rect, "width", /*styles*/ ctx[2].wireHandle.width + "px");
			set_style(rect, "height", /*styles*/ ctx[2].wireHandle.height + "px");
			add_location(rect, file, 104, 8, 2239);
			attr_dev(g, "id", g_id_value = "" + (/*node*/ ctx[0].id + ":" + /*i*/ ctx[10]));

			attr_dev(g, "transform", g_transform_value = "translate( " + ((/*port*/ ctx[8].type && /*node*/ ctx[0].width
			? /*node*/ ctx[0].width
			: 0) - /*styles*/ ctx[2].wireHandle.width / 2) + ",\n        " + /*getCYPos*/ ctx[3](/*i*/ ctx[10], /*node*/ ctx[0]) + ")");

			add_location(g, file, 100, 6, 2064);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*styles*/ 4) {
				set_style(rect, "width", /*styles*/ ctx[2].wireHandle.width + "px");
			}

			if (dirty & /*styles*/ 4) {
				set_style(rect, "height", /*styles*/ ctx[2].wireHandle.height + "px");
			}

			if (dirty & /*node*/ 1 && g_id_value !== (g_id_value = "" + (/*node*/ ctx[0].id + ":" + /*i*/ ctx[10]))) {
				attr_dev(g, "id", g_id_value);
			}

			if (dirty & /*node, styles*/ 5 && g_transform_value !== (g_transform_value = "translate( " + ((/*port*/ ctx[8].type && /*node*/ ctx[0].width
			? /*node*/ ctx[0].width
			: 0) - /*styles*/ ctx[2].wireHandle.width / 2) + ",\n        " + /*getCYPos*/ ctx[3](/*i*/ ctx[10], /*node*/ ctx[0]) + ")")) {
				attr_dev(g, "transform", g_transform_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(g);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(100:4) {#each node.ports as port, i}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let if_block_anchor;
	let if_block = /*node*/ ctx[0].id !== "wireHandleNode" && create_if_block(ctx);

	const block = {
		c: function create() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (/*node*/ ctx[0].id !== "wireHandleNode") {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { flow } = $$props;
	let { node } = $$props;
	let { sStore } = $$props;
	let selected = false;

	sStore.subscribe(s => {
		$$invalidate(1, selected = s[node.id]);
	});

	let totals = [];

	let styles = {
		rect: { width: 140, height: 30 },
		wireHandle: { width: 10, height: 10, spacing: 0.25 }
	};

	let resize = () => {
		let _totals = [];

		node.ports.map(p => {
			_totals[p.type] = _totals[p.type] || 0;
			_totals[p.type] += 1;
		});

		let match = true;

		_totals.forEach(n => {
			if (totals.indexOf(n) === -1) {
				match = false;
			}
		});

		if (match) return;
		totals = _totals.sort((a, b) => a > b ? -1 : 1);
		let { rect, wireHandle } = styles;
		let { width, height } = styles.rect;
		let sh = wireHandle.height;
		let sp = sh * (1 + wireHandle.spacing);
		$$invalidate(2, styles.rect.height = Math.max(styles.rect.height, (totals[0] + 1) * sp), styles);
		Object.assign(node, styles.rect);
	};

	let getCYPos = (i, n) => {
		let { rect, wireHandle } = styles;
		let cports = n.ports.filter(np => np.type === n.ports[i].type);
		i = cports.indexOf(n.ports[i]);
		let sh = wireHandle.height;
		let sp = sh * wireHandle.spacing;
		let theight = cports.length * sh + (cports.length - 1) * sp;
		return (rect.height - theight) / 2 + i * (sh + sp) || 0;
	};

	onMount(() => {
		resize();

		flow.subscribe(f => {
			resize();
		});
	});

	const writable_props = ["flow", "node", "sStore"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Element> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Element", $$slots, []);

	$$self.$set = $$props => {
		if ("flow" in $$props) $$invalidate(4, flow = $$props.flow);
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
		if ("sStore" in $$props) $$invalidate(5, sStore = $$props.sStore);
	};

	$$self.$capture_state = () => ({
		onMount,
		flow,
		node,
		sStore,
		selected,
		totals,
		styles,
		resize,
		getCYPos
	});

	$$self.$inject_state = $$props => {
		if ("flow" in $$props) $$invalidate(4, flow = $$props.flow);
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
		if ("sStore" in $$props) $$invalidate(5, sStore = $$props.sStore);
		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
		if ("totals" in $$props) totals = $$props.totals;
		if ("styles" in $$props) $$invalidate(2, styles = $$props.styles);
		if ("resize" in $$props) resize = $$props.resize;
		if ("getCYPos" in $$props) $$invalidate(3, getCYPos = $$props.getCYPos);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [node, selected, styles, getCYPos, flow, sStore];
}

class Element extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-r6ii83-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { flow: 4, node: 0, sStore: 5 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Element",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*flow*/ ctx[4] === undefined && !("flow" in props)) {
			console.warn("<Element> was created without expected prop 'flow'");
		}

		if (/*node*/ ctx[0] === undefined && !("node" in props)) {
			console.warn("<Element> was created without expected prop 'node'");
		}

		if (/*sStore*/ ctx[5] === undefined && !("sStore" in props)) {
			console.warn("<Element> was created without expected prop 'sStore'");
		}
	}

	get flow() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set flow(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get node() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set node(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get sStore() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set sStore(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Element;
//# sourceMappingURL=element.mjs.map
