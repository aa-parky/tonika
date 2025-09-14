// .stylelintrc.js
const path = require("path");
const fileBlockCache = new Map();

module.exports = {
    plugins: ["stylelint-selector-bem-pattern"],
    rules: {
        "plugin/selector-bem-pattern": {
            preset: "bem",
            componentSelectors: {
                initial: (filePath) => {
                    const base = path.basename(filePath, ".css"); // e.g. clavonika-svg.css
                    const block = base.split("-")[0];             // e.g. clavonika
                    fileBlockCache.set(filePath, block);
                    return new RegExp(
                        `^\\.${block}(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?$`
                    );
                },
            },
        },
        "selector-class-pattern": [
            "^[a-z][a-z0-9\\-]*$",
            {
                resolveNestedSelectors: true,
                message: (selectorValue, ruleMeta) => {
                    const filePath = ruleMeta?.source?.input?.file || "unknown-file.css";
                    const block = fileBlockCache.get(filePath) || "unknown-block";

                    // Build a suggested fix:
                    // If wrong block prefix, replace it with the correct one
                    let suggestion = selectorValue.replace(
                        /^\.[a-z0-9-]+/,
                        `.${block}`
                    );

                    // If it’s missing an element/modifier, suggest adding __element
                    if (!suggestion.includes("__")) {
                        suggestion = `${suggestion.replace(
                            new RegExp(`^\\.${block}`),
                            `.${block}__element`
                        )}`;
                    }

                    return `❌ Class "${selectorValue}" is invalid.
👉 Expected block prefix: ".${block}"
💡 Suggested fix: "${suggestion}"
(Source: ${path.basename(filePath)})`;
                },
            },
        ],
    },
};