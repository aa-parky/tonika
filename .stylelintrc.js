// .stylelintrc.js
const path = require("path");

// Strict BEM (no block-level modifiers):
//  - allow:   .block | .block__element | .block__element--modifier
//  - disallow .block--modifier
const STRICT_BEM = /^(?:(?!.*--)[a-z][a-z0-9-]*|[a-z][a-z0-9-]*__[a-z0-9-]+(?:--[a-z0-9-]+)?)$/;

module.exports = {
    rules: {
        "selector-class-pattern": [
            STRICT_BEM,
            {
                resolveNestedSelectors: true,
                message: (selectorValue, ruleMeta) => {
                    // Parse selector into B, E, M (block, element, modifier)
                    // Accepts leading dot, e.g. ".chordonika__header--card"
                    const raw = String(selectorValue).trim();
                    const m = raw.match(/^\.?([a-z0-9-]+)(?:__([a-z0-9-]+))?(?:--([a-z0-9-]+))?$/);
                    let msg = `Class "${raw}" must follow BEM (block__element--modifier).`;

                    if (m) {
                        const [, B, E, M] = m;

                        // If it’s block--modifier (no element), suggest valid shapes
                        if (B && !E && M) {
                            // Prefer using the modifier word as the element guess (often the intent)
                            const guessElement = M;
                            const altElement   = "element";

                            const suggestion1 = `.${B}__${guessElement}`;            // simple element
                            const suggestion2 = `.${B}__${altElement}--${M}`;        // element + modifier

                            msg += ` No element before "--${M}". Try "${suggestion1}" or "${suggestion2}".`;
                        }

                        // If someone used '_' as a modifier separator (e.g. __key_active), suggest --.
                        // Only add this hint when it looks like an element+modifier in one token.
                        if (/_/.test(raw) && !/--/.test(raw)) {
                            const fixed = raw
                                .replace(/^(\.[a-z0-9-]+__[^_\s]+)_/, "$1--") // .block__elem_mod -> .block__elem--mod
                                .replace(/__+/g, "__");                        // normalise any doubled underscores
                            msg += ` Use "--" for modifiers. Try "${fixed}".`;
                        }
                    }

                    // Add a file for context (helpful in WebStorm Problems output)
                    const file =
                        ruleMeta?.source?.input?.file
                            ? path.basename(ruleMeta.source.input.file)
                            : "unknown.css";

                    return `${msg} [${file}]`;
                },
            },
        ],
    },
};