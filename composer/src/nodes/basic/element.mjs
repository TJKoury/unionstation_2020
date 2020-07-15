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
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
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

const { Object: Object_1, console: console_1 } = globals;
const file = "src/Element.svelte";

function add_css() {
	var style = element("style");
	style.id = "svelte-1elxhxn-style";
	style.textContent = ".node.svelte-1elxhxn{fill:rgb(231, 231, 174);stroke:#999;stroke-width:1px;cursor:move}.connector.svelte-1elxhxn{stroke:#999;stroke-width:1;fill:#d9d9d9;cursor:crosshair}text.svelte-1elxhxn{fill:black;cursor:move}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudC5zdmVsdGUiLCJzb3VyY2VzIjpbIkVsZW1lbnQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGV4cG9ydCBsZXQgbm9kZTtcbiAgbGV0IHN0eWxlU3RyaW5nID0gYSA9PlxuICAgIE9iamVjdC5lbnRyaWVzKGEpXG4gICAgICAubWFwKGEgPT4gYCR7YVswXX06JHthWzFdfWApXG4gICAgICAuam9pbihcIjtcIik7XG5cbiAgbGV0IHN0eWxlX2RlZmF1bHQgPSB7XG4gICAgbm9kZToge1xuICAgICAgd2lkdGg6IDE0MCxcbiAgICAgIGhlaWdodDogMzBcbiAgICB9LFxuICAgIGNvbm5lY3Rvcjoge1xuICAgICAgd2lkdGg6IDEwLFxuICAgICAgaGVpZ2h0OiAxMFxuICAgIH1cbiAgfTtcbiAgZXhwb3J0IGNvbnN0IHN0eWxlX25vZGUgPSB7XG4gICAgd2lkdGg6IDE0MCxcbiAgICBoZWlnaHQ6IDMwXG4gIH07XG5cbiAgZXhwb3J0IGNvbnN0IHN0eWxlX2Nvbm5lY3RvciA9IHtcbiAgICBoZWlnaHQ6IDEwLFxuICAgIHdpZHRoOiAxMFxuICB9O1xuICBsZXQgY3R5cGVzID0ge307XG4gICQ6IHtcbiAgICBub2RlLmlvX3BvcnRzLm1hcChmdW5jdGlvbihjVikge1xuICAgICAgY3R5cGVzW2NWLnR5cGVdID0gY3R5cGVzW2NWLnR5cGVdIHx8IDA7XG4gICAgICBjdHlwZXNbY1YudHlwZV0gKz0gMTtcbiAgICB9KTtcblxuICAgIGxldCBjb25uX2NvdW50ID0gT2JqZWN0LnZhbHVlcyhjdHlwZXMpLnNvcnQoKGEsIGIpID0+IChhID4gYiA/IC0xIDogMSkpWzBdO1xuICAgIGNvbnNvbGUubG9nKGNvbm5fY291bnQgKiAoc3R5bGVfY29ubmVjdG9yLmhlaWdodCAqIDEuNSkpO1xuICAgIHN0eWxlX25vZGUuaGVpZ2h0ID0gTWF0aC5tYXgoXG4gICAgICBzdHlsZV9kZWZhdWx0Lm5vZGUuaGVpZ2h0LFxuICAgICAgY29ubl9jb3VudCAqIChzdHlsZV9jb25uZWN0b3IuaGVpZ2h0ICogMS41KVxuICAgICk7XG4gIH1cbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC5ub2RlIHtcbiAgICBmaWxsOiByZ2IoMjMxLCAyMzEsIDE3NCk7XG4gICAgc3Ryb2tlOiAjOTk5O1xuICAgIHN0cm9rZS13aWR0aDogMXB4O1xuICAgIGN1cnNvcjogbW92ZTtcbiAgfVxuICAuY29ubmVjdG9yIHtcbiAgICBzdHJva2U6ICM5OTk7XG4gICAgc3Ryb2tlLXdpZHRoOiAxO1xuICAgIGZpbGw6ICNkOWQ5ZDk7XG4gICAgY3Vyc29yOiBjcm9zc2hhaXI7XG4gIH1cbiAgdGV4dCB7XG4gICAgZmlsbDogYmxhY2s7XG4gICAgY3Vyc29yOiBtb3ZlO1xuICB9XG48L3N0eWxlPlxuXG48cmVjdCBjbGFzcz1cIm5vZGVcIiBzdHlsZT17c3R5bGVTdHJpbmcoc3R5bGVfbm9kZSl9IHJ5PXtub2RlLmF0dHJpYnV0ZXMucnl9IC8+XG57I2lmIG5vZGUuaW9fcG9ydHN9XG4gIDxzdmcgb3ZlcmZsb3c9XCJ2aXNpYmxlXCIgc2hhcGUtcmVuZGVyaW5nPVwiYXV0b1wiPlxuICAgIHsjZWFjaCBub2RlLmlvX3BvcnRzLmZpbHRlcihwID0+ICFwLnR5cGUpIGFzIGlvX3BvcnQsIGl9XG4gICAgICA8Z1xuICAgICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoIHswIC0gc3R5bGVfY29ubmVjdG9yLndpZHRoIC8gMn0sIHtpICogc3R5bGVfY29ubmVjdG9yLmhlaWdodH0pXCI+XG4gICAgICAgIDxyZWN0XG4gICAgICAgICAgY2xhc3M9XCJjb25uZWN0b3JcIlxuICAgICAgICAgIHJ4PVwiM1wiXG4gICAgICAgICAgcnk9XCIzXCJcbiAgICAgICAgICB5PXtjdHlwZXNbMF0gKiBzdHlsZV9jb25uZWN0b3IuaGVpZ2h0fVxuICAgICAgICAgIHN0eWxlPXtzdHlsZVN0cmluZyhzdHlsZV9jb25uZWN0b3IpfSAvPlxuICAgICAgPC9nPlxuICAgIHsvZWFjaH1cbiAgICB7I2VhY2ggbm9kZS5pb19wb3J0cy5maWx0ZXIocCA9PiBwLnR5cGUpIGFzIGlvX3BvcnQsIGl9XG4gICAgICA8Z1xuICAgICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoIHtzdHlsZV9ub2RlLndpZHRoIC0gc3R5bGVfY29ubmVjdG9yLndpZHRoIC8gMn0sIHtpICogc3R5bGVfY29ubmVjdG9yLmhlaWdodH0pXCI+XG4gICAgICAgIDxyZWN0XG4gICAgICAgICAgY2xhc3M9XCJjb25uZWN0b3JcIlxuICAgICAgICAgIHJ4PVwiM1wiXG4gICAgICAgICAgcnk9XCIzXCJcbiAgICAgICAgICB5PXtjdHlwZXNbMF0gKiBzdHlsZV9jb25uZWN0b3IuaGVpZ2h0fVxuICAgICAgICAgIHN0eWxlPXtzdHlsZVN0cmluZyhzdHlsZV9jb25uZWN0b3IpfSAvPlxuICAgICAgPC9nPlxuICAgIHsvZWFjaH1cbiAgPC9zdmc+XG57L2lmfVxuPHRleHQgeD1cIjUwJVwiIHk9XCI1MCVcIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIGRvbWluYW50LWJhc2VsaW5lPVwibWlkZGxlXCIgc3R5bGU9XCJcIj5cbiAgdGVtcGxhdGVcbjwvdGV4dD5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUEyQ0UsS0FBSyxlQUFDLENBQUMsQUFDTCxJQUFJLENBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDeEIsTUFBTSxDQUFFLElBQUksQ0FDWixZQUFZLENBQUUsR0FBRyxDQUNqQixNQUFNLENBQUUsSUFBSSxBQUNkLENBQUMsQUFDRCxVQUFVLGVBQUMsQ0FBQyxBQUNWLE1BQU0sQ0FBRSxJQUFJLENBQ1osWUFBWSxDQUFFLENBQUMsQ0FDZixJQUFJLENBQUUsT0FBTyxDQUNiLE1BQU0sQ0FBRSxTQUFTLEFBQ25CLENBQUMsQUFDRCxJQUFJLGVBQUMsQ0FBQyxBQUNKLElBQUksQ0FBRSxLQUFLLENBQ1gsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDIn0= */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	child_ctx[8] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	child_ctx[8] = i;
	return child_ctx;
}

// (63:0) {#if node.io_ports}
function create_if_block(ctx) {
	let svg;
	let each0_anchor;
	let each_value_1 = /*node*/ ctx[1].io_ports.filter(func);
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*node*/ ctx[1].io_ports.filter(func_1);
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			svg = svg_element("svg");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			each0_anchor = empty();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(svg, "overflow", "visible");
			attr_dev(svg, "shape-rendering", "auto");
			add_location(svg, file, 63, 2, 1202);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(svg, null);
			}

			append_dev(svg, each0_anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(svg, null);
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*style_connector, ctypes, styleString, node*/ 30) {
				each_value_1 = /*node*/ ctx[1].io_ports.filter(func);
				validate_each_argument(each_value_1);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(svg, each0_anchor);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*style_node, style_connector, ctypes, styleString, node*/ 31) {
				each_value = /*node*/ ctx[1].io_ports.filter(func_1);
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(svg, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(63:0) {#if node.io_ports}",
		ctx
	});

	return block;
}

// (65:4) {#each node.io_ports.filter(p => !p.type) as io_port, i}
function create_each_block_1(ctx) {
	let g;
	let rect;
	let rect_y_value;
	let rect_style_value;
	let g_transform_value;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "class", "connector svelte-1elxhxn");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "y", rect_y_value = /*ctypes*/ ctx[3][0] * /*style_connector*/ ctx[2].height);
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[4](/*style_connector*/ ctx[2]));
			add_location(rect, file, 67, 8, 1423);
			attr_dev(g, "transform", g_transform_value = "translate( " + (0 - /*style_connector*/ ctx[2].width / 2) + ", " + /*i*/ ctx[8] * /*style_connector*/ ctx[2].height + ")");
			add_location(g, file, 65, 6, 1317);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*ctypes*/ 8 && rect_y_value !== (rect_y_value = /*ctypes*/ ctx[3][0] * /*style_connector*/ ctx[2].height)) {
				attr_dev(rect, "y", rect_y_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(g);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(65:4) {#each node.io_ports.filter(p => !p.type) as io_port, i}",
		ctx
	});

	return block;
}

// (76:4) {#each node.io_ports.filter(p => p.type) as io_port, i}
function create_each_block(ctx) {
	let g;
	let rect;
	let rect_y_value;
	let rect_style_value;
	let g_transform_value;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "class", "connector svelte-1elxhxn");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "y", rect_y_value = /*ctypes*/ ctx[3][0] * /*style_connector*/ ctx[2].height);
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[4](/*style_connector*/ ctx[2]));
			add_location(rect, file, 78, 8, 1800);
			attr_dev(g, "transform", g_transform_value = "translate( " + (/*style_node*/ ctx[0].width - /*style_connector*/ ctx[2].width / 2) + ", " + /*i*/ ctx[8] * /*style_connector*/ ctx[2].height + ")");
			add_location(g, file, 76, 6, 1679);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*ctypes*/ 8 && rect_y_value !== (rect_y_value = /*ctypes*/ ctx[3][0] * /*style_connector*/ ctx[2].height)) {
				attr_dev(rect, "y", rect_y_value);
			}

			if (dirty & /*style_node*/ 1 && g_transform_value !== (g_transform_value = "translate( " + (/*style_node*/ ctx[0].width - /*style_connector*/ ctx[2].width / 2) + ", " + /*i*/ ctx[8] * /*style_connector*/ ctx[2].height + ")")) {
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
		source: "(76:4) {#each node.io_ports.filter(p => p.type) as io_port, i}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let rect;
	let rect_style_value;
	let rect_ry_value;
	let t0;
	let t1;
	let text_1;
	let t2;
	let if_block = /*node*/ ctx[1].io_ports && create_if_block(ctx);

	const block = {
		c: function create() {
			rect = svg_element("rect");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			text_1 = svg_element("text");
			t2 = text("template");
			attr_dev(rect, "class", "node svelte-1elxhxn");
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[4](/*style_node*/ ctx[0]));
			attr_dev(rect, "ry", rect_ry_value = /*node*/ ctx[1].attributes.ry);
			add_location(rect, file, 61, 0, 1102);
			attr_dev(text_1, "x", "50%");
			attr_dev(text_1, "y", "50%");
			attr_dev(text_1, "text-anchor", "middle");
			attr_dev(text_1, "dominant-baseline", "middle");
			attr_dev(text_1, "class", "svelte-1elxhxn");
			add_location(text_1, file, 88, 0, 2005);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, rect, anchor);
			insert_dev(target, t0, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, t1, anchor);
			insert_dev(target, text_1, anchor);
			append_dev(text_1, t2);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*style_node*/ 1 && rect_style_value !== (rect_style_value = /*styleString*/ ctx[4](/*style_node*/ ctx[0]))) {
				attr_dev(rect, "style", rect_style_value);
			}

			if (dirty & /*node*/ 2 && rect_ry_value !== (rect_ry_value = /*node*/ ctx[1].attributes.ry)) {
				attr_dev(rect, "ry", rect_ry_value);
			}

			if (/*node*/ ctx[1].io_ports) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(t1.parentNode, t1);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
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
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const func = p => !p.type;
const func_1 = p => p.type;

function instance($$self, $$props, $$invalidate) {
	let { node } = $$props;
	let styleString = a => Object.entries(a).map(a => `${a[0]}:${a[1]}`).join(";");

	let style_default = {
		node: { width: 140, height: 30 },
		connector: { width: 10, height: 10 }
	};

	const style_node = { width: 140, height: 30 };
	const style_connector = { height: 10, width: 10 };
	let ctypes = {};
	const writable_props = ["node"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Element> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Element", $$slots, []);

	$$self.$set = $$props => {
		if ("node" in $$props) $$invalidate(1, node = $$props.node);
	};

	$$self.$capture_state = () => ({
		node,
		styleString,
		style_default,
		style_node,
		style_connector,
		ctypes
	});

	$$self.$inject_state = $$props => {
		if ("node" in $$props) $$invalidate(1, node = $$props.node);
		if ("styleString" in $$props) $$invalidate(4, styleString = $$props.styleString);
		if ("style_default" in $$props) $$invalidate(5, style_default = $$props.style_default);
		if ("ctypes" in $$props) $$invalidate(3, ctypes = $$props.ctypes);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*node, ctypes*/ 10) {
			 {
				node.io_ports.map(function (cV) {
					$$invalidate(3, ctypes[cV.type] = ctypes[cV.type] || 0, ctypes);
					$$invalidate(3, ctypes[cV.type] += 1, ctypes);
				});

				let conn_count = Object.values(ctypes).sort((a, b) => a > b ? -1 : 1)[0];
				console.log(conn_count * (style_connector.height * 1.5));
				$$invalidate(0, style_node.height = Math.max(style_default.node.height, conn_count * (style_connector.height * 1.5)), style_node);
			}
		}
	};

	return [style_node, node, style_connector, ctypes, styleString];
}

class Element extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1elxhxn-style")) add_css();

		init(this, options, instance, create_fragment, safe_not_equal, {
			node: 1,
			style_node: 0,
			style_connector: 2
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Element",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*node*/ ctx[1] === undefined && !("node" in props)) {
			console_1.warn("<Element> was created without expected prop 'node'");
		}
	}

	get node() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set node(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get style_node() {
		return this.$$.ctx[0];
	}

	set style_node(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get style_connector() {
		return this.$$.ctx[2];
	}

	set style_connector(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Element;
//# sourceMappingURL=element.mjs.map
