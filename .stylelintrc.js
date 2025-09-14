// .stylelintrc.js
// noinspection JSUnusedGlobalSymbols

/*
Overview
- This is a Stylelint configuration file (CommonJS module).
- It enforces BEM-style CSS naming using the "stylelint-selector-bem-pattern" plugin.
- It also enforces a general lowercase kebab-case pattern and provides clear, context-aware error messages.
- The configuration infers the BEM "block" name from the CSS file name so messages can suggest the correct ".block" prefix.

How the block name is inferred
- For a file named "clavonika-svg.css":
  - base = "clavonika-svg"
  - block = "clavonika" (the part before the first hyphen)
- Valid selectors then include:
  .clavonika
  .clavonika__item
  .clavonika--disabled
  .clavonika__item--large
*/

const path = require("path");

/*
Why we keep a cache (fileBlockCache)
- We compute the block name inside the BEM plugin's selector hook (componentSelectors.initial),
  where we do have reliable access to the file path.
- Later, when building error messages for selector-class-pattern, Stylelint might not always provide
  the file path consistently, so we retrieve the last-known block for that file from this cache.
*/
const fileBlockCache = new Map();

module.exports = {
    // Enable the BEM selector plugin
    plugins: ["stylelint-selector-bem-pattern"],

    rules: {
        /*
         Enforce BEM semantics for selectors.
         - preset: "bem" activates the plugin’s BEM expectations.
         - componentSelectors.initial allows us to define what a valid "component" (block) selector looks like
           for each file, letting us tailor the block name dynamically from the file name.
        */
        "plugin/selector-bem-pattern": {
            preset: "bem",
            componentSelectors: {
                /*
                 initial(filePath)
                 - Receives the absolute path of the CSS file currently being linted.
                 - Returns a RegExp describing valid "block/element/modifier" selectors for that file.
                */
                initial: (filePath) => {
                    // Take just the filename without extension, e.g. 'clavonika-svg'
                    const base = path.basename(filePath, ".css"); // e.g. clavonika-svg

                    // Use the part before the first hyphen as the BEM "block", e.g. 'clavonika'
                    const block = base.split("-")[0];             // e.g. clavonika

                    // Remember this block for this file so we can show accurate messages elsewhere
                    fileBlockCache.set(filePath, block);

                    // Build a regex that allows only:
                    //   .block__element
                    //   .block__element--modifier
                    // (Disallows .block and .block--modifier)
                    // Where element/modifier are lowercase letters, digits, or hyphens.
                    return new RegExp(
                        `^\\.${block}__[a-z0-9-]+(?:--[a-z0-9-]+)?$`
                    );
                },
            },
        },

        /*
         Enforce a general class naming pattern (kebab-case, lowercase).
         - This acts as a broad safety net. The BEM plugin enforces the structured relationships.
         - We also provide a custom message that includes the inferred ".block" for clearer guidance.
        */
        "selector-class-pattern": [
            // Only allow: block__element or block__element--modifier
            // Disallow: block and block--modifier
            "^(?:[a-z][a-z0-9-]*)__(?:[a-z0-9-]+)(?:--[a-z0-9-]+)?$",
            {
                // Consider nested selectors when validating
                resolveNestedSelectors: true,

                // Build a helpful error message with the inferred block name if available.
                message: (selectorValue, ruleMeta) => {
                    // Try to get the file path from Stylelint metadata (may not always be present)
                    const filePath = ruleMeta && ruleMeta.ruleName
                        ? ruleMeta.source.input.file
                        : null;

                    // Use the cached block for this file if we have it, else fall back to a placeholder
                    const block =
                        (filePath && fileBlockCache.get(filePath)) || "BLOCK";

                    // Example:
                    // Class "button_primary" must follow BEM ... and start with ".clavonika".
                    return `Class "${selectorValue}" must follow BEM (block__element--modifier) and start with ".${block}".`;
                },
            },
        ],
    },
};