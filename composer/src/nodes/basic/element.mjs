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
	style.id = "svelte-1elxhxn-style";
	style.textContent = ".node.svelte-1elxhxn{fill:rgb(231, 231, 174);stroke:#999;stroke-width:1px;cursor:move}.connector.svelte-1elxhxn{stroke:#999;stroke-width:1;fill:#d9d9d9;cursor:crosshair}text.svelte-1elxhxn{fill:black;cursor:move}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudC5zdmVsdGUiLCJzb3VyY2VzIjpbIkVsZW1lbnQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGV4cG9ydCBsZXQgbm9kZTtcblxuICBsZXQgc3R5bGVTdHJpbmcgPSBhID0+XG4gICAgT2JqZWN0LmVudHJpZXMoYSlcbiAgICAgIC5tYXAoYSA9PiBgJHthWzBdfToke2FbMV19YClcbiAgICAgIC5qb2luKFwiO1wiKTtcblxuICBsZXQgc3R5bGVfZGVmYXVsdCA9IHtcbiAgICBub2RlOiB7XG4gICAgICB3aWR0aDogMTQwLFxuICAgICAgaGVpZ2h0OiAzMFxuICAgIH0sXG4gICAgY29ubmVjdG9yOiB7XG4gICAgICB3aWR0aDogMTAsXG4gICAgICBoZWlnaHQ6IDEwXG4gICAgfVxuICB9O1xuXG4gIGV4cG9ydCBjb25zdCBzdHlsZV9jb25uZWN0b3IgPSB7XG4gICAgaGVpZ2h0OiAxMCxcbiAgICB3aWR0aDogMTBcbiAgfTtcblxuICBsZXQgY3R5cGVzID0ge307XG5cbiAgZXhwb3J0IGxldCByZWNhbGMgPSAoKSA9PiB7XG4gICAgY3R5cGVzID0ge307XG4gICAgbm9kZS5pb19wb3J0cy5tYXAoZnVuY3Rpb24oY1YpIHtcbiAgICAgIGN0eXBlc1tjVi50eXBlXSA9IGN0eXBlc1tjVi50eXBlXSB8fCAwO1xuICAgICAgY3R5cGVzW2NWLnR5cGVdICs9IDE7XG4gICAgfSk7XG4gICAgbGV0IGNvbm5fY291bnQgPSBPYmplY3QudmFsdWVzKGN0eXBlcykuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gLTEgOiAxKSlbMF07XG4gICAgbm9kZS5oZWlnaHQgPSBNYXRoLm1heChcbiAgICAgIHN0eWxlX2RlZmF1bHQubm9kZS5oZWlnaHQsXG4gICAgICBjb25uX2NvdW50ICogKHN0eWxlX2Nvbm5lY3Rvci5oZWlnaHQgKiAxLjUpXG4gICAgKTtcbiAgfTtcblxuICBsZXQgZ2V0Q1lQb3MgPSAoaSwgbikgPT4ge1xuICAgIGlmICghY3R5cGVzW25dKSB7XG4gICAgICByZWNhbGMoKTtcbiAgICB9XG4gICAgbGV0IHNoID0gc3R5bGVfY29ubmVjdG9yLmhlaWdodDtcbiAgICBsZXQgc3AgPSBzaCAqIDAuMjU7XG4gICAgbGV0IHRoZWlnaHQgPSBjdHlwZXNbbl0gKiBzaCArIChjdHlwZXNbbl0gLSAxKSAqIHNwO1xuICAgIHJldHVybiAobm9kZS5oZWlnaHQgLSB0aGVpZ2h0KSAvIDIgKyBpICogKHNoICsgc3ApIHx8IDA7XG4gIH07XG5cbiAgb25Nb3VudCgoKSA9PiB7XG4gICAgcmVjYWxjKCk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLm5vZGUge1xuICAgIGZpbGw6IHJnYigyMzEsIDIzMSwgMTc0KTtcbiAgICBzdHJva2U6ICM5OTk7XG4gICAgc3Ryb2tlLXdpZHRoOiAxcHg7XG4gICAgY3Vyc29yOiBtb3ZlO1xuICB9XG4gIC5jb25uZWN0b3Ige1xuICAgIHN0cm9rZTogIzk5OTtcbiAgICBzdHJva2Utd2lkdGg6IDE7XG4gICAgZmlsbDogI2Q5ZDlkOTtcbiAgICBjdXJzb3I6IGNyb3NzaGFpcjtcbiAgfVxuICB0ZXh0IHtcbiAgICBmaWxsOiBibGFjaztcbiAgICBjdXJzb3I6IG1vdmU7XG4gIH1cbjwvc3R5bGU+XG5cbjxyZWN0XG4gIGNsYXNzPVwibm9kZSBkcmFnSGFuZGxlXCJcbiAgc3R5bGU9e3N0eWxlU3RyaW5nKHsgd2lkdGg6IG5vZGUud2lkdGgsIGhlaWdodDogbm9kZS5oZWlnaHQgfSl9XG4gIHJ5PXtub2RlLnJ5fSAvPlxueyNpZiBub2RlLmlvX3BvcnRzfVxuICB7I2VhY2ggbm9kZS5pb19wb3J0cy5maWx0ZXIocCA9PiAhcC50eXBlKSBhcyBpb19wb3J0LCBpfVxuICAgIDxnXG4gICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoIHswIC0gc3R5bGVfY29ubmVjdG9yLndpZHRoIC8gMn0sIHtnZXRDWVBvcyhpLCAwKX0pXCI+XG4gICAgICA8cmVjdFxuICAgICAgICBjbGFzcz1cImNvbm5lY3RvclwiXG4gICAgICAgIHJ4PVwiM1wiXG4gICAgICAgIHJ5PVwiM1wiXG4gICAgICAgIHN0eWxlPXtzdHlsZVN0cmluZyhzdHlsZV9jb25uZWN0b3IpfSAvPlxuICAgIDwvZz5cbiAgey9lYWNofVxuICB7I2VhY2ggbm9kZS5pb19wb3J0cy5maWx0ZXIocCA9PiBwLnR5cGUpIGFzIGlvX3BvcnQsIGl9XG4gICAgPGdcbiAgICAgIHRyYW5zZm9ybT1cInRyYW5zbGF0ZSgge25vZGUud2lkdGggLSBzdHlsZV9jb25uZWN0b3Iud2lkdGggLyAyfSx7Z2V0Q1lQb3MoaSwgMSl9KVwiPlxuICAgICAgPHJlY3RcbiAgICAgICAgY2xhc3M9XCJjb25uZWN0b3JcIlxuICAgICAgICByeD1cIjNcIlxuICAgICAgICByeT1cIjNcIlxuICAgICAgICBzdHlsZT17c3R5bGVTdHJpbmcoc3R5bGVfY29ubmVjdG9yKX0gLz5cbiAgICA8L2c+XG4gIHsvZWFjaH1cbnsvaWZ9XG48dGV4dFxuICBjbGFzcz1cImRyYWdIYW5kbGVcIlxuICB4PVwiNTAlXCJcbiAgeT1cIjUwJVwiXG4gIHRleHQtYW5jaG9yPVwibWlkZGxlXCJcbiAgZG9taW5hbnQtYmFzZWxpbmU9XCJtaWRkbGVcIlxuICBzdHlsZT1cIlwiPlxuICB7bm9kZS5wb3NpdGlvbi54fVxuPC90ZXh0PlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXdERSxLQUFLLGVBQUMsQ0FBQyxBQUNMLElBQUksQ0FBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN4QixNQUFNLENBQUUsSUFBSSxDQUNaLFlBQVksQ0FBRSxHQUFHLENBQ2pCLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyxBQUNELFVBQVUsZUFBQyxDQUFDLEFBQ1YsTUFBTSxDQUFFLElBQUksQ0FDWixZQUFZLENBQUUsQ0FBQyxDQUNmLElBQUksQ0FBRSxPQUFPLENBQ2IsTUFBTSxDQUFFLFNBQVMsQUFDbkIsQ0FBQyxBQUNELElBQUksZUFBQyxDQUFDLEFBQ0osSUFBSSxDQUFFLEtBQUssQ0FDWCxNQUFNLENBQUUsSUFBSSxBQUNkLENBQUMifQ== */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	child_ctx[9] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	child_ctx[9] = i;
	return child_ctx;
}

// (79:0) {#if node.io_ports}
function create_if_block(ctx) {
	let t;
	let each1_anchor;
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
			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(target, anchor);
			}

			insert_dev(target, t, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*style_connector, getCYPos, styleString, node*/ 15) {
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
						each_blocks_1[i].m(t.parentNode, t);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*node, style_connector, getCYPos, styleString*/ 15) {
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
						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			destroy_each(each_blocks_1, detaching);
			if (detaching) detach_dev(t);
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(each1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(79:0) {#if node.io_ports}",
		ctx
	});

	return block;
}

// (80:2) {#each node.io_ports.filter(p => !p.type) as io_port, i}
function create_each_block_1(ctx) {
	let g;
	let rect;
	let rect_style_value;
	let g_transform_value;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "class", "connector svelte-1elxhxn");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[2](/*style_connector*/ ctx[1]));
			add_location(rect, file, 82, 6, 1633);
			attr_dev(g, "transform", g_transform_value = "translate( " + (0 - /*style_connector*/ ctx[1].width / 2) + ", " + /*getCYPos*/ ctx[3](/*i*/ ctx[9], 0) + ")");
			add_location(g, file, 80, 4, 1543);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(g);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(80:2) {#each node.io_ports.filter(p => !p.type) as io_port, i}",
		ctx
	});

	return block;
}

// (90:2) {#each node.io_ports.filter(p => p.type) as io_port, i}
function create_each_block(ctx) {
	let g;
	let rect;
	let rect_style_value;
	let g_transform_value;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "class", "connector svelte-1elxhxn");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[2](/*style_connector*/ ctx[1]));
			add_location(rect, file, 92, 6, 1922);
			attr_dev(g, "transform", g_transform_value = "translate( " + (/*node*/ ctx[0].width - /*style_connector*/ ctx[1].width / 2) + "," + /*getCYPos*/ ctx[3](/*i*/ ctx[9], 1) + ")");
			add_location(g, file, 90, 4, 1824);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*node*/ 1 && g_transform_value !== (g_transform_value = "translate( " + (/*node*/ ctx[0].width - /*style_connector*/ ctx[1].width / 2) + "," + /*getCYPos*/ ctx[3](/*i*/ ctx[9], 1) + ")")) {
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
		source: "(90:2) {#each node.io_ports.filter(p => p.type) as io_port, i}",
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
	let t2_value = /*node*/ ctx[0].position.x + "";
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
			attr_dev(rect, "class", "node dragHandle svelte-1elxhxn");

			attr_dev(rect, "style", rect_style_value = /*styleString*/ ctx[2]({
				width: /*node*/ ctx[0].width,
				height: /*node*/ ctx[0].height
			}));

			attr_dev(rect, "ry", rect_ry_value = /*node*/ ctx[0].ry);
			add_location(rect, file, 74, 0, 1344);
			attr_dev(text_1, "class", "dragHandle svelte-1elxhxn");
			attr_dev(text_1, "x", "50%");
			attr_dev(text_1, "y", "50%");
			attr_dev(text_1, "text-anchor", "middle");
			attr_dev(text_1, "dominant-baseline", "middle");
			add_location(text_1, file, 100, 0, 2057);
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
			if (dirty & /*node*/ 1 && rect_style_value !== (rect_style_value = /*styleString*/ ctx[2]({
				width: /*node*/ ctx[0].width,
				height: /*node*/ ctx[0].height
			}))) {
				attr_dev(rect, "style", rect_style_value);
			}

			if (dirty & /*node*/ 1 && rect_ry_value !== (rect_ry_value = /*node*/ ctx[0].ry)) {
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

			if (dirty & /*node*/ 1 && t2_value !== (t2_value = /*node*/ ctx[0].position.x + "")) set_data_dev(t2, t2_value);
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

	let { recalc = () => {
		ctypes = {};

		node.io_ports.map(function (cV) {
			ctypes[cV.type] = ctypes[cV.type] || 0;
			ctypes[cV.type] += 1;
		});

		let conn_count = Object.values(ctypes).sort((a, b) => a > b ? -1 : 1)[0];
		$$invalidate(0, node.height = Math.max(style_default.node.height, conn_count * (style_connector.height * 1.5)), node);
	} } = $$props;

	let getCYPos = (i, n) => {
		if (!ctypes[n]) {
			recalc();
		}

		let sh = style_connector.height;
		let sp = sh * 0.25;
		let theight = ctypes[n] * sh + (ctypes[n] - 1) * sp;
		return (node.height - theight) / 2 + i * (sh + sp) || 0;
	};

	onMount(() => {
		recalc();
	});

	const writable_props = ["node", "recalc"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Element> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Element", $$slots, []);

	$$self.$set = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
		if ("recalc" in $$props) $$invalidate(4, recalc = $$props.recalc);
	};

	$$self.$capture_state = () => ({
		onMount,
		node,
		styleString,
		style_default,
		style_connector,
		ctypes,
		recalc,
		getCYPos
	});

	$$self.$inject_state = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
		if ("styleString" in $$props) $$invalidate(2, styleString = $$props.styleString);
		if ("style_default" in $$props) style_default = $$props.style_default;
		if ("ctypes" in $$props) ctypes = $$props.ctypes;
		if ("recalc" in $$props) $$invalidate(4, recalc = $$props.recalc);
		if ("getCYPos" in $$props) $$invalidate(3, getCYPos = $$props.getCYPos);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [node, style_connector, styleString, getCYPos, recalc];
}

class Element extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1elxhxn-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { node: 0, style_connector: 1, recalc: 4 });

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

	get recalc() {
		throw new Error("<Element>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set recalc(value) {
		throw new Error("<Element>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Element;
//# sourceMappingURL=element.mjs.map
