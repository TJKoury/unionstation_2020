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
	style.id = "svelte-1elxhxn-style";
	style.textContent = ".node.svelte-1elxhxn{fill:rgb(231, 231, 174);stroke:#999;stroke-width:1px;cursor:move}.connector.svelte-1elxhxn{stroke:#999;stroke-width:1;fill:#d9d9d9;cursor:crosshair}text.svelte-1elxhxn{fill:black;cursor:move}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudC5zdmVsdGUiLCJzb3VyY2VzIjpbIkVsZW1lbnQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGV4cG9ydCBsZXQgbm9kZTtcbiAgbGV0IHN0eWxlU3RyaW5nID0gYSA9PlxuICAgIE9iamVjdC5lbnRyaWVzKGEpXG4gICAgICAubWFwKGEgPT4gYCR7YVswXX06JHthWzFdfWApXG4gICAgICAuam9pbihcIjtcIik7XG5cbiAgbGV0IHN0eWxlX2RlZmF1bHQgPSB7XG4gICAgbm9kZToge1xuICAgICAgd2lkdGg6IDE0MCxcbiAgICAgIGhlaWdodDogMzBcbiAgICB9LFxuICAgIGNvbm5lY3Rvcjoge1xuICAgICAgd2lkdGg6IDEwLFxuICAgICAgaGVpZ2h0OiAxMFxuICAgIH1cbiAgfTtcblxuICBleHBvcnQgY29uc3Qgc3R5bGVfY29ubmVjdG9yID0ge1xuICAgIGhlaWdodDogMTAsXG4gICAgd2lkdGg6IDEwXG4gIH07XG4gIGxldCBjdHlwZXMgPSB7fTtcbiAgJDoge1xuICAgIG5vZGUuaW9fcG9ydHMubWFwKGZ1bmN0aW9uKGNWKSB7XG4gICAgICBjdHlwZXNbY1YudHlwZV0gPSBjdHlwZXNbY1YudHlwZV0gfHwgMDtcbiAgICAgIGN0eXBlc1tjVi50eXBlXSArPSAxO1xuICAgIH0pO1xuXG4gICAgbGV0IGNvbm5fY291bnQgPSBPYmplY3QudmFsdWVzKGN0eXBlcykuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gLTEgOiAxKSlbMF07XG4gICAgXG4gICAgbm9kZS5hdHRyaWJ1dGVzLmhlaWdodCA9IE1hdGgubWF4KFxuICAgICAgc3R5bGVfZGVmYXVsdC5ub2RlLmhlaWdodCxcbiAgICAgIGNvbm5fY291bnQgKiAoc3R5bGVfY29ubmVjdG9yLmhlaWdodCAqIDEuNSlcbiAgICApO1xuICB9XG48L3NjcmlwdD5cblxuPHN0eWxlPlxuICAubm9kZSB7XG4gICAgZmlsbDogcmdiKDIzMSwgMjMxLCAxNzQpO1xuICAgIHN0cm9rZTogIzk5OTtcbiAgICBzdHJva2Utd2lkdGg6IDFweDtcbiAgICBjdXJzb3I6IG1vdmU7XG4gIH1cbiAgLmNvbm5lY3RvciB7XG4gICAgc3Ryb2tlOiAjOTk5O1xuICAgIHN0cm9rZS13aWR0aDogMTtcbiAgICBmaWxsOiAjZDlkOWQ5O1xuICAgIGN1cnNvcjogY3Jvc3NoYWlyO1xuICB9XG4gIHRleHQge1xuICAgIGZpbGw6IGJsYWNrO1xuICAgIGN1cnNvcjogbW92ZTtcbiAgfVxuPC9zdHlsZT5cblxuPHJlY3QgY2xhc3M9XCJub2RlXCIgc3R5bGU9e3N0eWxlU3RyaW5nKG5vZGUuYXR0cmlidXRlcyl9IHJ5PXtub2RlLmF0dHJpYnV0ZXMucnl9IC8+XG57I2lmIG5vZGUuaW9fcG9ydHN9XG4gIDxzdmcgb3ZlcmZsb3c9XCJ2aXNpYmxlXCIgc2hhcGUtcmVuZGVyaW5nPVwiYXV0b1wiPlxuICAgIHsjZWFjaCBub2RlLmlvX3BvcnRzLmZpbHRlcihwID0+ICFwLnR5cGUpIGFzIGlvX3BvcnQsIGl9XG4gICAgICA8Z1xuICAgICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoIHswIC0gc3R5bGVfY29ubmVjdG9yLndpZHRoIC8gMn0sIHtpICogc3R5bGVfY29ubmVjdG9yLmhlaWdodH0pXCI+XG4gICAgICAgIDxyZWN0XG4gICAgICAgICAgY2xhc3M9XCJjb25uZWN0b3JcIlxuICAgICAgICAgIHJ4PVwiM1wiXG4gICAgICAgICAgcnk9XCIzXCJcbiAgICAgICAgICB5PXtjdHlwZXNbMF0gKiBzdHlsZV9jb25uZWN0b3IuaGVpZ2h0fVxuICAgICAgICAgIHN0eWxlPXtzdHlsZVN0cmluZyhzdHlsZV9jb25uZWN0b3IpfSAvPlxuICAgICAgPC9nPlxuICAgIHsvZWFjaH1cbiAgICB7I2VhY2ggbm9kZS5pb19wb3J0cy5maWx0ZXIocCA9PiBwLnR5cGUpIGFzIGlvX3BvcnQsIGl9XG4gICAgICA8Z1xuICAgICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoIHtub2RlLmF0dHJpYnV0ZXMud2lkdGggLSBzdHlsZV9jb25uZWN0b3Iud2lkdGggLyAyfSwge2kgKiBzdHlsZV9jb25uZWN0b3IuaGVpZ2h0fSlcIj5cbiAgICAgICAgPHJlY3RcbiAgICAgICAgICBjbGFzcz1cImNvbm5lY3RvclwiXG4gICAgICAgICAgcng9XCIzXCJcbiAgICAgICAgICByeT1cIjNcIlxuICAgICAgICAgIHk9e2N0eXBlc1swXSAqIHN0eWxlX2Nvbm5lY3Rvci5oZWlnaHR9XG4gICAgICAgICAgc3R5bGU9e3N0eWxlU3RyaW5nKHN0eWxlX2Nvbm5lY3Rvcil9IC8+XG4gICAgICA8L2c+XG4gICAgey9lYWNofVxuICA8L3N2Zz5cbnsvaWZ9XG48dGV4dCB4PVwiNTAlXCIgeT1cIjUwJVwiIHRleHQtYW5jaG9yPVwibWlkZGxlXCIgZG9taW5hbnQtYmFzZWxpbmU9XCJtaWRkbGVcIiBzdHlsZT1cIlwiPlxuICB7bm9kZS5pZC5zcGxpdChcIi1cIilbMF19XG48L3RleHQ+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBdUNFLEtBQUssZUFBQyxDQUFDLEFBQ0wsSUFBSSxDQUFFLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3hCLE1BQU0sQ0FBRSxJQUFJLENBQ1osWUFBWSxDQUFFLEdBQUcsQ0FDakIsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDLEFBQ0QsVUFBVSxlQUFDLENBQUMsQUFDVixNQUFNLENBQUUsSUFBSSxDQUNaLFlBQVksQ0FBRSxDQUFDLENBQ2YsSUFBSSxDQUFFLE9BQU8sQ0FDYixNQUFNLENBQUUsU0FBUyxBQUNuQixDQUFDLEFBQ0QsSUFBSSxlQUFDLENBQUMsQUFDSixJQUFJLENBQUUsS0FBSyxDQUNYLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyJ9 */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	child_ctx[7] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	child_ctx[7] = i;
	return child_ctx;
}

// (59:0) {#if node.io_ports}
function create_if_block(ctx) {
	let svg;
	let each0_anchor;
	let each_value_1 = /*node*/ ctx[0].io_ports.filter(func);
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*node*/ ctx[0].io_ports.filter(func_1);
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
			add_location(svg, file, 59, 2, 1089);
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
			if (dirty & /*style_connector, ctypes, styleString, node*/ 15) {
				each_value_1 = /*node*/ ctx[0].io_ports.filter(func);
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

			if (dirty & /*node, style_connector, ctypes, styleString*/ 15) {
				each_value = /*node*/ ctx[0].io_ports.filter(func_1);
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
		source: "(59:0) {#if node.io_ports}",
		ctx
	});

	return block;
}

// (61:4) {#each node.io_ports.filter(p => !p.type) as io_port, i}
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
			attr_dev(rect, "y", rect_y_value = /*ctypes*/ ctx[2][0] * /*style_connector*/ ctx[1].height);
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[3](/*style_connector*/ ctx[1]));
			add_location(rect, file, 63, 8, 1310);
			attr_dev(g, "transform", g_transform_value = "translate( " + (0 - /*style_connector*/ ctx[1].width / 2) + ", " + /*i*/ ctx[7] * /*style_connector*/ ctx[1].height + ")");
			add_location(g, file, 61, 6, 1204);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*ctypes*/ 4 && rect_y_value !== (rect_y_value = /*ctypes*/ ctx[2][0] * /*style_connector*/ ctx[1].height)) {
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
		source: "(61:4) {#each node.io_ports.filter(p => !p.type) as io_port, i}",
		ctx
	});

	return block;
}

// (72:4) {#each node.io_ports.filter(p => p.type) as io_port, i}
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
			attr_dev(rect, "y", rect_y_value = /*ctypes*/ ctx[2][0] * /*style_connector*/ ctx[1].height);
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[3](/*style_connector*/ ctx[1]));
			add_location(rect, file, 74, 8, 1692);
			attr_dev(g, "transform", g_transform_value = "translate( " + (/*node*/ ctx[0].attributes.width - /*style_connector*/ ctx[1].width / 2) + ", " + /*i*/ ctx[7] * /*style_connector*/ ctx[1].height + ")");
			add_location(g, file, 72, 6, 1566);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*ctypes*/ 4 && rect_y_value !== (rect_y_value = /*ctypes*/ ctx[2][0] * /*style_connector*/ ctx[1].height)) {
				attr_dev(rect, "y", rect_y_value);
			}

			if (dirty & /*node*/ 1 && g_transform_value !== (g_transform_value = "translate( " + (/*node*/ ctx[0].attributes.width - /*style_connector*/ ctx[1].width / 2) + ", " + /*i*/ ctx[7] * /*style_connector*/ ctx[1].height + ")")) {
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
		source: "(72:4) {#each node.io_ports.filter(p => p.type) as io_port, i}",
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
	let t2_value = /*node*/ ctx[0].id.split("-")[0] + "";
	let t2;
	let if_block = /*node*/ ctx[0].io_ports && create_if_block(ctx);

	const block = {
		c: function create() {
			rect = svg_element("rect");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			text_1 = svg_element("text");
			t2 = text(t2_value);
			attr_dev(rect, "class", "node svelte-1elxhxn");
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[3](/*node*/ ctx[0].attributes));
			attr_dev(rect, "ry", rect_ry_value = /*node*/ ctx[0].attributes.ry);
			add_location(rect, file, 57, 0, 984);
			attr_dev(text_1, "x", "50%");
			attr_dev(text_1, "y", "50%");
			attr_dev(text_1, "text-anchor", "middle");
			attr_dev(text_1, "dominant-baseline", "middle");
			attr_dev(text_1, "class", "svelte-1elxhxn");
			add_location(text_1, file, 84, 0, 1897);
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
			if (dirty & /*node*/ 1 && rect_style_value !== (rect_style_value = /*styleString*/ ctx[3](/*node*/ ctx[0].attributes))) {
				attr_dev(rect, "style", rect_style_value);
			}

			if (dirty & /*node*/ 1 && rect_ry_value !== (rect_ry_value = /*node*/ ctx[0].attributes.ry)) {
				attr_dev(rect, "ry", rect_ry_value);
			}

			if (/*node*/ ctx[0].io_ports) {
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

			if (dirty & /*node*/ 1 && t2_value !== (t2_value = /*node*/ ctx[0].id.split("-")[0] + "")) set_data_dev(t2, t2_value);
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

	const style_connector = { height: 10, width: 10 };
	let ctypes = {};
	const writable_props = ["node"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Element> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Element", $$slots, []);

	$$self.$set = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
	};

	$$self.$capture_state = () => ({
		node,
		styleString,
		style_default,
		style_connector,
		ctypes
	});

	$$self.$inject_state = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
		if ("styleString" in $$props) $$invalidate(3, styleString = $$props.styleString);
		if ("style_default" in $$props) $$invalidate(4, style_default = $$props.style_default);
		if ("ctypes" in $$props) $$invalidate(2, ctypes = $$props.ctypes);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*node, ctypes*/ 5) {
			 {
				node.io_ports.map(function (cV) {
					$$invalidate(2, ctypes[cV.type] = ctypes[cV.type] || 0, ctypes);
					$$invalidate(2, ctypes[cV.type] += 1, ctypes);
				});

				let conn_count = Object.values(ctypes).sort((a, b) => a > b ? -1 : 1)[0];
				$$invalidate(0, node.attributes.height = Math.max(style_default.node.height, conn_count * (style_connector.height * 1.5)), node);
			}
		}
	};

	return [node, style_connector, ctypes, styleString];
}

class Element extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1elxhxn-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { node: 0, style_connector: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Element",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*node*/ ctx[0] === undefined && !("node" in props)) {
			console.warn("<Element> was created without expected prop 'node'");
		}
	}

	get node() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set node(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get style_connector() {
		return this.$$.ctx[1];
	}

	set style_connector(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Element;
//# sourceMappingURL=element.mjs.map
