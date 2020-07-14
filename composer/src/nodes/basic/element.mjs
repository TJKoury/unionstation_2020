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

const file = "src/Element.svelte";

function add_css() {
	var style = element("style");
	style.id = "svelte-1avw4w8-style";
	style.textContent = ".node.svelte-1avw4w8{fill:rgb(231, 231, 174);width:140px;height:30px;stroke:#999;stroke-width:1px;cursor:move}text.svelte-1avw4w8{fill:black;cursor:move}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudC5zdmVsdGUiLCJzb3VyY2VzIjpbIkVsZW1lbnQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGV4cG9ydCBsZXQgbm9kZTtcbiAgY29uc3QgY3JhZGl1cyA9IDEwO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLm5vZGUge1xuICAgIGZpbGw6IHJnYigyMzEsIDIzMSwgMTc0KTtcbiAgICB3aWR0aDogMTQwcHg7XG4gICAgaGVpZ2h0OiAzMHB4O1xuICAgIHN0cm9rZTogIzk5OTtcbiAgICBzdHJva2Utd2lkdGg6IDFweDtcbiAgICBjdXJzb3I6IG1vdmU7XG4gIH1cbiAgdGV4dCB7XG4gICAgZmlsbDogYmxhY2s7XG4gICAgY3Vyc29yOiBtb3ZlO1xuICB9XG48L3N0eWxlPlxuXG48cmVjdCBjbGFzcz1cIm5vZGVcIiByeT17bm9kZS5hdHRyaWJ1dGVzLnJ5fSAvPlxueyNpZiBub2RlLmlvX3BvcnRzfVxuICA8c3ZnIHNoYXBlLXJlbmRlcmluZz1cImF1dG9cIj5cbiAgICB7I2VhY2ggbm9kZS5pb19wb3J0cy5maWx0ZXIoZiA9PiBmLnR5cGUgPT09ICdpbnB1dCcpIGFzIGlvX3BvcnQsIGl9XG4gICAgICA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCwxMClcIj5cbiAgICAgICAgPHJlY3RcbiAgICAgICAgICByeD1cIjNcIlxuICAgICAgICAgIHJ5PVwiM1wiXG4gICAgICAgICAgd2lkdGg9XCIxMFwiXG4gICAgICAgICAgaGVpZ2h0PVwiMTBcIlxuICAgICAgICAgIHN0eWxlPVwic3Ryb2tlOiAjOTk5OyBzdHJva2Utd2lkdGg6IDE7IGZpbGw6ICNkOWQ5ZDk7IGN1cnNvcjpjcm9zc2hhaXI7XCIgLz5cbiAgICAgIDwvZz5cbiAgICB7L2VhY2h9XG4gIDwvc3ZnPlxuICA8c3ZnIHg9e25vZGUud2lkdGh9IHk9XCIwXCI+XG4gICAgeyNlYWNoIG5vZGUuaW9fcG9ydHMuZmlsdGVyKGYgPT4gZi50eXBlICE9PSAnaW5wdXQnKSBhcyBpb19wb3J0LCBpfVxuICAgICAgPHJlY3RcbiAgICAgICAgY2xhc3M9XCJub2RlLWNvbm5lY3Rpb25cIlxuICAgICAgICByeD1cIjNcIlxuICAgICAgICByeT1cIjNcIlxuICAgICAgICBmaWxsPVwiYmxhY2tcIlxuICAgICAgICB5PXtpICogY3JhZGl1c31cbiAgICAgICAgd2lkdGg9e2NyYWRpdXN9XG4gICAgICAgIGhlaWdodD17Y3JhZGl1c30gLz5cbiAgICB7L2VhY2h9XG4gIDwvc3ZnPlxuey9pZn1cbjx0ZXh0IHg9XCI1MCVcIiB5PVwiNTAlXCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBkb21pbmFudC1iYXNlbGluZT1cIm1pZGRsZVwiIHN0eWxlPVwiXCI+XG4gIHRlbXBsYXRlXG48L3RleHQ+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUUsS0FBSyxlQUFDLENBQUMsQUFDTCxJQUFJLENBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDeEIsS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsSUFBSSxDQUNaLE1BQU0sQ0FBRSxJQUFJLENBQ1osWUFBWSxDQUFFLEdBQUcsQ0FDakIsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDLEFBQ0QsSUFBSSxlQUFDLENBQUMsQUFDSixJQUFJLENBQUUsS0FBSyxDQUNYLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyJ9 */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	child_ctx[3] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	child_ctx[3] = i;
	return child_ctx;
}

// (22:0) {#if node.io_ports}
function create_if_block(ctx) {
	let svg0;
	let t;
	let svg1;
	let svg1_x_value;
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
			svg0 = svg_element("svg");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t = space();
			svg1 = svg_element("svg");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(svg0, "shape-rendering", "auto");
			add_location(svg0, file, 22, 2, 334);
			attr_dev(svg1, "x", svg1_x_value = /*node*/ ctx[0].width);
			attr_dev(svg1, "y", "0");
			add_location(svg1, file, 34, 2, 683);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg0, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(svg0, null);
			}

			insert_dev(target, t, anchor);
			insert_dev(target, svg1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(svg1, null);
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*node*/ 1) {
				const old_length = each_value_1.length;
				each_value_1 = /*node*/ ctx[0].io_ports.filter(func);
				validate_each_argument(each_value_1);
				let i;

				for (i = old_length; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (!each_blocks_1[i]) {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(svg0, null);
					}
				}

				for (i = each_value_1.length; i < old_length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*cradius, node*/ 1) {
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
						each_blocks[i].m(svg1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*node*/ 1 && svg1_x_value !== (svg1_x_value = /*node*/ ctx[0].width)) {
				attr_dev(svg1, "x", svg1_x_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg0);
			destroy_each(each_blocks_1, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(svg1);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(22:0) {#if node.io_ports}",
		ctx
	});

	return block;
}

// (24:4) {#each node.io_ports.filter(f => f.type === 'input') as io_port, i}
function create_each_block_1(ctx) {
	let g;
	let rect;

	const block = {
		c: function create() {
			g = svg_element("g");
			rect = svg_element("rect");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "width", "10");
			attr_dev(rect, "height", "10");
			set_style(rect, "stroke", "#999");
			set_style(rect, "stroke-width", "1");
			set_style(rect, "fill", "#d9d9d9");
			set_style(rect, "cursor", "crosshair");
			add_location(rect, file, 25, 8, 481);
			attr_dev(g, "transform", "translate(0,10)");
			add_location(g, file, 24, 6, 441);
		},
		m: function mount(target, anchor) {
			insert_dev(target, g, anchor);
			append_dev(g, rect);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(g);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(24:4) {#each node.io_ports.filter(f => f.type === 'input') as io_port, i}",
		ctx
	});

	return block;
}

// (36:4) {#each node.io_ports.filter(f => f.type !== 'input') as io_port, i}
function create_each_block(ctx) {
	let rect;
	let rect_y_value;

	const block = {
		c: function create() {
			rect = svg_element("rect");
			attr_dev(rect, "class", "node-connection");
			attr_dev(rect, "rx", "3");
			attr_dev(rect, "ry", "3");
			attr_dev(rect, "fill", "black");
			attr_dev(rect, "y", rect_y_value = /*i*/ ctx[3] * cradius);
			attr_dev(rect, "width", cradius);
			attr_dev(rect, "height", cradius);
			add_location(rect, file, 36, 6, 788);
		},
		m: function mount(target, anchor) {
			insert_dev(target, rect, anchor);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(rect);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(36:4) {#each node.io_ports.filter(f => f.type !== 'input') as io_port, i}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let rect;
	let rect_ry_value;
	let t0;
	let t1;
	let text_1;
	let t2;
	let if_block = /*node*/ ctx[0].io_ports && create_if_block(ctx);

	const block = {
		c: function create() {
			rect = svg_element("rect");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			text_1 = svg_element("text");
			t2 = text("template");
			attr_dev(rect, "class", "node svelte-1avw4w8");
			attr_dev(rect, "ry", rect_ry_value = /*node*/ ctx[0].attributes.ry);
			add_location(rect, file, 20, 0, 266);
			attr_dev(text_1, "x", "50%");
			attr_dev(text_1, "y", "50%");
			attr_dev(text_1, "text-anchor", "middle");
			attr_dev(text_1, "dominant-baseline", "middle");
			attr_dev(text_1, "class", "svelte-1avw4w8");
			add_location(text_1, file, 47, 0, 980);
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

const cradius = 10;
const func = f => f.type === "input";
const func_1 = f => f.type !== "input";

function instance($$self, $$props, $$invalidate) {
	let { node } = $$props;
	const writable_props = ["node"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Element> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Element", $$slots, []);

	$$self.$set = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
	};

	$$self.$capture_state = () => ({ node, cradius });

	$$self.$inject_state = $$props => {
		if ("node" in $$props) $$invalidate(0, node = $$props.node);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [node];
}

class Element extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1avw4w8-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { node: 0 });

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
}

export default Element;
//# sourceMappingURL=element.mjs.map
